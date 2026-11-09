const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const {SEOUL_REFERENCE_FEATURES,SEOUL_REFERENCE_CAMPUS,seoulMarkerToReferencePoint}=require('../build/core/seoul.js');
const {SEOUL_PATH_TRACES,SEOUL_REFERENCE_ROADS,SEOUL_PATH_SOURCE_URL,SEOUL_PATH_NOTE,seoulPavementDistance}=require('../build/core/seoul-paths.js');
const {CAMPUSES}=require('../build/core/campuses.js');
const {findRoute}=require('../build/core/core.js');
const evidence=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/seoul-path-evidence.json'),'utf8'));
function loadScene(){const filename=path.resolve(__dirname,'../build/core/seoul-path-audit.js'),loaded=new Module(filename,module);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));loaded._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/scene.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,filename);return loaded.exports;}

test('Seoul schematic pavement has a reviewed official source for every retained corridor',()=>{
 assert.equal(evidence.source.url,SEOUL_PATH_SOURCE_URL);assert.equal(new URL(SEOUL_PATH_SOURCE_URL).hostname,'www.mju.ac.kr');
 assert.deepEqual(evidence.source.dimensions,[1200,818]);assert.match(evidence.source.sha256,/^[a-f0-9]{64}$/);assert.equal(evidence.surveyed,false);assert.equal(evidence.navigationGeometry,false);
 assert.equal(SEOUL_PATH_TRACES.length,7);assert.deepEqual(evidence.paths.map(({id,points})=>({id,points})),SEOUL_PATH_TRACES);
 assert.deepEqual(SEOUL_REFERENCE_CAMPUS.paths,SEOUL_REFERENCE_ROADS);
 for(const p of evidence.paths){assert.ok(p.visibleEvidence.length>40);for(const [x,y,r,b] of p.sourceImageRegions)assert.ok(x>=0&&y>=0&&r<=1200&&b<=818&&r>x&&b>y);}
 for(const lang of ['en','ko','zh'])assert.ok(SEOUL_PATH_NOTE[lang].length>30);
});

test('Seoul pavement does not move directory anchors or become navigation edges',()=>{
 const features=SEOUL_REFERENCE_FEATURES;assert.equal(features.length,11);
 for(const f of features)assert.deepEqual(f.center,seoulMarkerToReferencePoint(f.marker.lat,f.marker.lon),f.id);
 const data=CAMPUSES.seoul.dataset;for(const key of ['nodes','edges','entrances','buildings','rooms'])assert.deepEqual(data[key],[],key);
 assert.deepEqual(findRoute(data,'mju-s1','mju-s9'),{ok:false,reason:'missing-node'});
});

test('Seoul pavement remains finite and clear of buildings, gate and raised sports terrace',()=>{
 let samples=0;
 for(const p of SEOUL_REFERENCE_ROADS){assert.ok(p.length>=2);for(let i=1;i<p.length;i++){
  const a=p[i-1],b=p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);assert.ok(length>0&&length<40);
  for(let step=0;step<=100;step++){
   const x=a[0]+(b[0]-a[0])*step/100,z=a[1]+(b[1]-a[1])*step/100;
   assert.ok(Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<90&&Math.abs(z)<65);assert.ok(seoulPavementDistance(x,z)<1e-8);
   for(const f of SEOUL_REFERENCE_FEATURES){const dx=Math.max(0,Math.abs(x-f.center[0])-f.size[0]/2),dz=Math.max(0,Math.abs(z-f.center[1])-f.size[1]/2);assert.ok(Math.hypot(dx,dz)>1.5,`${f.id} must clear the full pavement shoulder`);}
   samples++;
  }
 }}
 assert.equal(samples,1919);assert.ok(seoulPavementDistance(-80,60)>20);
});

test('Seoul renderer draws each corridor above its unchanged ground and keeps trees clear',()=>{
 const {CampusScene}=loadScene(),segments=[],disks=[],trees=[];
 const g={box(){},segment(...args){segments.push(args);},disk(...args){disks.push(args);},crown(x,y,z,radius){trees.push({x,z,radius});}};
 const scene={referenceCampus:SEOUL_REFERENCE_CAMPUS};CampusScene.prototype.seoulTerrain.call(scene,g);
 assert.equal(scene.terrainHeight(0,0),-.72);assert.equal(segments.length,57);
 for(const [a,b,width,tint] of segments){assert.ok(a[1]>-.72&&a[1]<0);assert.equal(a[1],b[1]);assert.ok([3,2.4,1.9].includes(width));assert.ok(a.concat(b,tint).every(Number.isFinite));}
 assert.ok(disks.filter(p=>[-.637,-.597,-.557].some(y=>Math.abs(p[1]-y)<1e-9)).length>=57,'rounded joins cover the pavement turns');
 assert.ok(trees.length>0);for(const {x,z,radius} of trees)assert.ok(seoulPavementDistance(x,z)>radius+1.5+.20,'entire canopy clears the full pavement shoulder and gap');
});
