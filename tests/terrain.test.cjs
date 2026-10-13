'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const {REFERENCE_CAMPUS:campus}=require('../build/core/campus.js');
const filename=path.resolve(__dirname,'../build/core/terrain-audit.js');
const loaded=new Module(filename,module);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));
loaded._compile(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/scene.ts'),'utf8')+'\nexport { Geometry };',{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,filename);
const {CampusScene,Geometry,createYonginScenicTerrain,settleReferenceMesh,drapeScenicPolygon}=loaded.exports;
const terrain=createYonginScenicTerrain(campus.features,campus.paths);
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} vs ${b}`);

test('scenic landform retains a low academic valley and raised residence ground without changing source data',()=>{
  const snapshot=JSON.stringify(campus);
  for(let x=-360;x<=294;x+=9)for(let z=-216;z<=282;z+=9){
    const height=terrain.surfaceHeight(x,z);assert.ok(Number.isFinite(height)&&height>=-2&&height<45,'bounded finite scenic surface');
  }
  const level=code=>{const f=campus.features.find(f=>f.code===code);return terrain.groundHeight(...f.center);};
  for(const code of ['Y30','Y31','Y32','Y33','Y34','Y35'])assert.ok(level(code)>level('Y3')+5,`${code} residence terrace above valley`);
  near(level('Y3'),level('Y2'),'central academic court remains low');
  assert.equal(terrain.lake(220,140),true);near(terrain.surfaceHeight(220,140),-.70,'existing lake water level');
  assert.equal(JSON.stringify(campus),snapshot,'terrain must not mutate markers, footprints or paths');
});

test('all 50 authored models settle onto flat ground with their height, normals and horizontal geometry intact',()=>{
  const uneven=[];
  for(const f of campus.features){
    const geometry=new Geometry();CampusScene.prototype.referenceModel.call(CampusScene.prototype,geometry,f);
    const before=geometry.data.slice(),settled=settleReferenceMesh(before,terrain.groundHeight);
    let bottom=Infinity,top=-Infinity,minGround=Infinity,maxGround=-Infinity;
    for(let i=0;i<before.length;i+=9){
      const h=terrain.groundHeight(before[i],before[i+2]);minGround=Math.min(minGround,h);maxGround=Math.max(maxGround,h);
      for(const j of [0,2,3,4,5,6,7,8])assert.equal(settled.vertices[i+j],before[i+j],`${f.id} horizontal geometry and normals`);
      near(settled.vertices[i+1]-before[i+1],settled.offset,`${f.id} rigid vertical translation`);
      bottom=Math.min(bottom,settled.vertices[i+1]);top=Math.max(top,settled.vertices[i+1]);
    }
    if(maxGround-minGround>=.025)uneven.push({id:f.id,range:maxGround-minGround});
    near(bottom,maxGround+.035,`${f.id} foundation touches scenic ground`);near(top,settled.top,`${f.id} label anchor follows rendered top`);
    assert.deepEqual(geometry.data,before,'settlement leaves authored geometry reusable');
  }
  assert.deepEqual(uneven,[],'do not float rigid buildings over uneven footprint ground');
});

test('existing road strips follow ground triangles continuously across ridges and cell diagonals',()=>{
  let triangles=0;
  for(const road of campus.paths)for(let i=1;i<road.length;i++){
    const a=road[i-1],b=road[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length*2.7,nz=dx/length*2.7;
    const mesh=drapeScenicPolygon([[a[0]-nx,a[1]-nz],[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz]],terrain,.07);
    assert.ok(mesh.length>0);
    for(const triangle of mesh){
      triangles++;
      // Barycentric interior samples detect the ridge/valley problem that a
      // corners-only height assertion cannot detect.
      for(const weights of [[1,0,0],[0,1,0],[0,0,1],[1/3,1/3,1/3],[.1,.7,.2]]){
        const p=[0,0,0];triangle.forEach((vertex,j)=>vertex.forEach((v,axis)=>p[axis]+=v*weights[j]));
        near(p[1],terrain.groundHeight(p[0],p[2])+.07,'pavement contact at every interior sample');
      }
    }
  }
  assert.ok(triangles>100&&triangles<6000,'bounded road tessellation budget');
});

test('full scenic geometry is finite, upward ground remains pickable, and mesh budget stays bounded',()=>{
  const geometry=new Geometry(),scene={referenceCampus:campus};
  CampusScene.prototype.referenceTerrain.call(scene,geometry);
  assert.ok(geometry.data.length%27===0&&geometry.data.length>0);
  assert.ok(geometry.data.every(Number.isFinite));
  assert.ok(geometry.data.length/9<260000,'keep the established mobile mesh budget');
  for(const f of campus.features)near(scene.terrainHeight(...f.center),terrain.surfaceHeight(...f.center),`${f.id} GPS/selection shares rendered surface`);
});

test('canvas picking targets the raised residence volume and preserves the existing Seoul projection',()=>{
  const f=campus.features.find(f=>f.code==='Y31'),geometry=new Geometry();
  CampusScene.prototype.referenceModel.call(CampusScene.prototype,geometry,f);
  const settled=settleReferenceMesh(geometry.data,terrain.groundHeight),ground=terrain.groundHeight(...f.center);
  let projected,selected;
  const scene={reference:true,seoul:false,referenceGroundHeight:terrain.groundHeight,points:new Map([[f.id,[f.center[0],settled.top+5,f.center[1]]]]),canvas:{getBoundingClientRect:()=>({left:0,top:0})},project:p=>{projected=p;return{x:0,y:0};},onSelect:id=>{selected=id;}};
  CampusScene.prototype.pick.call(scene,0,0);assert.equal(selected,f.id);
  near(projected[1],ground+(settled.top-ground)/2,'pick stays within raised residence');
  assert.ok(projected[1]>ground&&projected[1]<settled.top);
  scene.seoul=true;CampusScene.prototype.pick.call(scene,0,0);
  near(projected[1],(settled.top+5)/2,'Seoul retains prior picking math');
});
