'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REFERENCE_CAMPUS, REFERENCE_PROJECTION, markerToReferencePoint } = require('../build/core/campus.js');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const features = REFERENCE_CAMPUS.features;
const radians = Math.PI / 180;
const ellipsoid = { a: 6378137, inverseFlattening: 298.257223563 };
const origin = { lat: 37.2222, lon: 127.1867 };
const flattening = 1 / ellipsoid.inverseFlattening;
const eccentricitySquared = flattening * (2 - flattening);
const distance = (p,q) => Math.hypot(p[0]-q[0],p[1]-q[1]);
const label = f => f.code || f.id;
const near = (actual,expected,tolerance,message) => assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} vs ${expected}`);

// Independent WGS84 Earth-centered coordinates, zero ellipsoidal height.
function ecef(marker) {
  const phi=marker.lat*radians,lambda=marker.lon*radians;
  const radius=ellipsoid.a/Math.sqrt(1-eccentricitySquared*Math.sin(phi)**2);
  return [radius*Math.cos(phi)*Math.cos(lambda),radius*Math.cos(phi)*Math.sin(lambda),radius*(1-eccentricitySquared)*Math.sin(phi)];
}
const east=[-Math.sin(origin.lon*radians),Math.cos(origin.lon*radians),0];
const north=[-Math.sin(origin.lat*radians)*Math.cos(origin.lon*radians),-Math.sin(origin.lat*radians)*Math.sin(origin.lon*radians),Math.cos(origin.lat*radians)];
const dot=(p,q)=>p.reduce((sum,n,i)=>sum+n*q[i],0);
function markerDeltaMeters(a,b) {
  const av=ecef(a),bv=ecef(b),delta=av.map((n,i)=>bv[i]-n);
  return [dot(delta,east),-dot(delta,north)];
}
function haversine(a,b) {
  const h=Math.sin((a.lat-b.lat)*radians/2)**2+Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin((a.lon-b.lon)*radians/2)**2;
  return 2*6371008.8*Math.asin(Math.min(1,Math.sqrt(h)));
}
function smallAreaWgs84(a,b) {
  const latitude=(a.lat+b.lat)/2*radians,q=1-eccentricitySquared*Math.sin(latitude)**2;
  const meridional=ellipsoid.a*(1-eccentricitySquared)/q**1.5;
  const primeVertical=ellipsoid.a/Math.sqrt(q);
  return Math.hypot((a.lat-b.lat)*radians*meridional,(a.lon-b.lon)*radians*primeVertical*Math.cos(latitude));
}
let sceneModule;
function loadSceneForGeometryAudit() {
  if(sceneModule)return sceneModule;
  // The production scene contains DOM types but its pure geometry functions need no
  // canvas. Transpile in memory, resolving imports to the core build used by tests.
  const ts=require('typescript'),filename=path.resolve(__dirname,'../build/core/scene-audit.js');
  const loaded=new Module(filename,module);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));
  const source=fs.readFileSync(path.resolve(__dirname,'../src/scene.ts'),'utf8');
  loaded._compile(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,filename);
  return sceneModule=loaded.exports;
}
function loadPlan() {return require('../build/core/plan-layout.js');}
let physicalModels;
function generatedPhysicalModels() {
  if(physicalModels)return physicalModels;
  const {CampusScene}=loadSceneForGeometryAudit();
  physicalModels=features.filter(f=>!f.sharedGeometryWith).map(f=>{
    const g={data:[]};CampusScene.prototype.referenceModel.call(CampusScene.prototype,g,f);
    const triangles=[];
    for(let i=0;i<g.data.length;i+=27) {
      const points=[[g.data[i],g.data[i+2]],[g.data[i+9],g.data[i+11]],[g.data[i+18],g.data[i+20]]];
      // Exclude the building's ground pads/shadows. Raised surfaces, roof faces and
      // stair/structure projections are retained; amenity ground surfaces are retained.
      if(['building','gate'].includes(f.kind)&&Math.max(g.data[i+1],g.data[i+10],g.data[i+19])<=.3)continue;
      if(Math.abs(cross2(points[0],points[1],points[2]))<=1e-9)continue;
      triangles.push({points,bounds:bounds(points)});
    }
    return {feature:f,triangles,bounds:bounds(triangles.flatMap(t=>t.points))};
  });
  return physicalModels;
}
function cross2(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function bounds(points){return[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
function boundsOverlap(a,b){return a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];}
function triangleIntersectionArea(subject,clip){
  const orientation=Math.sign(cross2(...clip));let polygon=subject;
  for(let edge=0;edge<3&&polygon.length;edge++){
    const a=clip[edge],b=clip[(edge+1)%3],next=[];
    for(let i=0;i<polygon.length;i++){
      const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=orientation*cross2(a,b,p),dq=orientation*cross2(a,b,q),insideP=dp>=0,insideQ=dq>=0;
      if(insideP)next.push(p);
      if(insideP!==insideQ){const ratio=dp/(dp-dq);next.push([p[0]+(q[0]-p[0])*ratio,p[1]+(q[1]-p[1])*ratio]);}
    }
    polygon=next;
  }
  return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
}

test('scene scale exposes one WGS84 metric projection with a fixed campus origin', () => {
  assert.equal(REFERENCE_PROJECTION.model,'WGS84 local tangent plane');
  assert.deepEqual(REFERENCE_PROJECTION.origin,origin);
  assert.equal(REFERENCE_PROJECTION.semiMajorAxis,ellipsoid.a);
  assert.equal(REFERENCE_PROJECTION.inverseFlattening,ellipsoid.inverseFlattening);
  assert.ok(Number.isFinite(REFERENCE_PROJECTION.unitsPerMeter)&&REFERENCE_PROJECTION.unitsPerMeter>0);
  assert.equal(typeof markerToReferencePoint,'function');
  const projected=markerToReferencePoint(origin.lat,origin.lon);
  near(projected[0],0,1e-8,'origin east');near(projected[1],0,1e-8,'origin south');
  assert.ok(markerToReferencePoint(origin.lat,origin.lon+.001)[0]>0,'east must increase scene x');
  assert.ok(markerToReferencePoint(origin.lat+.001,origin.lon)[1]<0,'north must decrease scene z');
});

test('all 48 directory markers retain their published coordinates and independent projection', () => {
  // Official-directory snapshot used by the app before the scale correction. Keeping
  // these values explicit prevents changing source markers to hide a rendering offset.
  const published=[
    [73,37.22255,127.18720],[93,37.22340,127.18720],[56,37.22315,127.18955],[49,37.222100,127.188545],
    [81,37.222035,127.187599],[68,37.222092,127.190831],[83,37.221876,127.190200],[66,37.221632,127.186779],
    [94,37.221201,127.188545],[59,37.221598,127.191700],[89,37.222347,127.191514],[46,37.220450,127.185300],
    [80,37.218929,127.183771],[43,37.218353,127.183827],[62,37.218657,127.184440],[52,37.220976,127.187413],
    [95,37.220808,127.187961],[42,37.222860,127.186000],[74,37.21930,127.18255],[41,37.220250,127.185070],
    [90,37.223100,127.186773],[40,37.223850,127.186885],[82,37.221376,127.189260],[87,37.217787,127.185024],
    [50,37.22355,127.18173],[47,37.224100,127.18175],[76,37.223353,127.182856],[77,37.223228,127.183595],
    [78,37.223758,127.182802],[79,37.223763,127.183316],[69,37.223883,127.185072],[51,37.218351,127.183826],
    [44,37.22345,127.19095],[60,37.22220,127.19170],[61,37.219679,127.186977],[84,37.21930,127.18640],
    [64,37.218464,127.185829],[65,37.219356,127.184521],[57,37.22240,127.18975],[92,37.22395,127.18900],
    [86,37.224176,127.187628],[48,37.2253010,127.1787850],[53,37.224095,127.180342],[58,37.223999,127.187560],
    [63,37.224678,127.187637],[71,37.218781,127.183385],[72,37.224886,127.187800],[85,37.219669,127.186323],
  ];
  const marked=features.filter(f=>f.marker);
  assert.equal(marked.length,48);
  for(const [article,lat,lon] of published) {
    const f=marked.find(f=>f.marker.article===article);assert.ok(f,`article ${article}`);
    assert.deepEqual(f.marker,{article,lat,lon},label(f));
    const expected=markerDeltaMeters(origin,f.marker).map(n=>n*REFERENCE_PROJECTION.unitsPerMeter);
    const projected=markerToReferencePoint(lat,lon);
    for(let axis=0;axis<2;axis++) near(projected[axis],expected[axis],1e-7,`${label(f)} directory axis ${axis}`);
  }
});

test('all 1128 marker-anchor pairs preserve directory spacing under one scene scale', () => {
  const marked=features.filter(f=>f.marker);let pairs=0;
  for(let i=0;i<marked.length;i++)for(let j=i+1;j<marked.length;j++) {
    const a=marked[i],b=marked[j],expected=Math.hypot(...markerDeltaMeters(a.marker,b.marker));
    const rendered=distance(markerToReferencePoint(a.marker.lat,a.marker.lon),markerToReferencePoint(b.marker.lat,b.marker.lon))/REFERENCE_PROJECTION.unitsPerMeter;
    near(rendered,expected,1e-6,`${label(a)} / ${label(b)} projected meters`);
    // A spherical Earth model is an independent coarse check, not the app's datum.
    assert.ok(Math.abs(rendered/haversine(a.marker,b.marker)-1)<.003,`${label(a)} / ${label(b)} Haversine comparison`);
    assert.ok(Math.abs(rendered/smallAreaWgs84(a.marker,b.marker)-1)<.00002,`${label(a)} / ${label(b)} local WGS84 comparison`);
    pairs++;
  }
  assert.equal(pairs,1128);
});

test('duplicate directory markers remain recorded independently of plan-derived model positions', () => {
  const main=features.find(f=>f.code==='Y14'),duplicate=features.find(f=>f.code==='Y83');
  assert.ok(Math.hypot(...markerDeltaMeters(main.marker,duplicate.marker))<.25);
  assert.equal(duplicate.sharedGeometryWith,undefined,'The official plan resolves two separate structures; do not collapse them because directory pins overlap');
  const {PLAN_LAYOUT}=loadPlan();
  assert.ok(PLAN_LAYOUT[main.id]&&PLAN_LAYOUT[duplicate.id],'Both structures require independent sourced plan entries');
  assert.ok(distance(PLAN_LAYOUT[main.id].center,PLAN_LAYOUT[duplicate.id].center)>0);
});

test('plan scale comes from the extracted 300-metre bar, not the rescaled sheet ratio', () => {
  const {PLAN_CALIBRATION:c,planPointToReferencePoint}=loadPlan();
  assert.equal(c.sourceUrl,'https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do');
  assert.deepEqual(c.pageSize,[1191,842]);assert.equal(c.north,'page-up');
  assert.equal(c.scaleBar.meters,300);
  // Independent extraction of black scale-bar vectors in the rotated landscape PDF.
  near(c.scaleBar.start[0],985.5609130859375,1e-6,'0-metre bar endpoint');
  near(c.scaleBar.end[0],1131.240966796875,1e-6,'300-metre bar endpoint');
  near(c.metersPerPoint,2.05930731323911,1e-12,'Graphical-bar metres per PDF point');
  assert.equal(c.unitsPerMeter,REFERENCE_PROJECTION.unitsPerMeter);
  near(distance(planPointToReferencePoint(...c.scaleBar.start),planPointToReferencePoint(...c.scaleBar.end))/c.unitsPerMeter,300,1e-8,'Rendered graphical scale bar');
  const center=planPointToReferencePoint(...c.originInPoints);
  near(distance(center,c.originInScene),0,1e-8,'Drawing-origin translation');
  assert.ok(planPointToReferencePoint(c.originInPoints[0],c.originInPoints[1]-1)[1]<center[1],'Plan north remains up');
});

test('every mapped model uses the same official-plan center, angle and size transform', () => {
  const {PLAN_CALIBRATION:c,PLAN_LAYOUT}=loadPlan(),unit=c.metersPerPoint*c.unitsPerMeter;
  const mapped=features.filter(f=>PLAN_LAYOUT[f.id]);assert.equal(mapped.length,46);
  assert.deepEqual(features.filter(f=>!PLAN_LAYOUT[f.id]).map(f=>f.id).sort(),['mju-elpenheim','mju-g','mju-gate','mju-k']);
  assert.deepEqual(mapped.reduce((counts,f)=>{const method=PLAN_LAYOUT[f.id].method;counts[method]=(counts[method]||0)+1;return counts;},{}),{'vector-envelope':32,'complex-subdivision':6,'manual-trace':8});
  for(const f of mapped) {
    const p=PLAN_LAYOUT[f.id];assert.equal(f.layoutSource,'official-plan',label(f));
    assert.ok(['vector-envelope','manual-trace','complex-subdivision'].includes(p.method),`${label(f)} placement method`);
    assert.ok([...p.center,...p.size,p.angle].every(Number.isFinite),`${label(f)} finite source coordinates`);
    const expected=[c.originInScene[0]+(p.center[0]-c.originInPoints[0])*unit,c.originInScene[1]+(p.center[1]-c.originInPoints[1])*unit];
    near(distance(f.center,expected),0,1e-7,`${label(f)} plan center`);
    near(f.size[0],p.size[0]*unit,1e-7,`${label(f)} plan envelope width`);
    near(f.size[1],p.size[1]*unit,1e-7,`${label(f)} plan envelope depth`);
    near(f.angle,p.angle,1e-10,`${label(f)} plan orientation`);
  }
  for(const f of features.filter(f=>!PLAN_LAYOUT[f.id]&&f.marker)) {
    near(distance(f.center,markerToReferencePoint(f.marker.lat,f.marker.lon)),0,1e-7,`${label(f)} unresolved plan placement retains its disclosed directory anchor`);
  }
});

test('every plan-derived model pair retains the drawing distance at one physical scale', () => {
  const {PLAN_CALIBRATION:c,PLAN_LAYOUT}=loadPlan(),mapped=features.filter(f=>PLAN_LAYOUT[f.id]);
  let pairs=0;
  for(let i=0;i<mapped.length;i++)for(let j=i+1;j<mapped.length;j++) {
    const a=mapped[i],b=mapped[j],expected=distance(PLAN_LAYOUT[a.id].center,PLAN_LAYOUT[b.id].center)*c.metersPerPoint;
    near(distance(a.center,b.center)/c.unitsPerMeter,expected,1e-6,`${label(a)} / ${label(b)} official-plan metres`);
    pairs++;
  }
  assert.equal(pairs,1035);
});

test('all 50 selectable entries remain finite and courts do not gain invented directory markers', () => {
  assert.equal(features.length,50);assert.equal(new Set(features.map(f=>f.id)).size,50);
  for(const f of features) {
    assert.ok([...f.center,...f.size,f.angle].every(Number.isFinite),label(f));
    assert.ok(f.size[0]>0&&f.size[1]>0&&f.size[2]>=0,label(f));
  }
  assert.deepEqual(features.filter(f=>!f.marker).map(f=>f.code).sort(),['I','J']);
});

test('distinct physical model triangles do not intersect in area; shared plan boundaries may touch', () => {
  const models=generatedPhysicalModels(),conflicts=[];let pairs=0;
  for(let i=0;i<models.length;i++)for(let j=i+1;j<models.length;j++){
    pairs++;const a=models[i],b=models[j];if(!boundsOverlap(a.bounds,b.bounds))continue;
    let witnessArea=0;
    outer:for(const ta of a.triangles)for(const tb of b.triangles){
      if(!boundsOverlap(ta.bounds,tb.bounds))continue;
      const area=triangleIntersectionArea(ta.points,tb.points);
      if(area>1e-5){witnessArea=area;break outer;}
    }
    if(witnessArea)conflicts.push({pair:`${label(a.feature)} / ${label(b.feature)}`,intersectionArea:witnessArea});
  }
  assert.equal(pairs,1225);
  assert.ok(models.every(m=>m.triangles.length>0),'Every distinct feature has nondegenerate projected physical geometry');
  assert.deepEqual(conflicts,[],'Test actual physical triangle projections, not enclosing rectangles: a sourced U-shaped footprint may surround a separate building. Shared edges are allowed.');
});

test('every generated model including roofs, pads and sports surrounds fits its rotated envelope', () => {
  const {CampusScene}=loadSceneForGeometryAudit();let modeled=0,vertices=0;
  for(const f of features.filter(f=>!f.sharedGeometryWith)) {
    const geometry={data:[]};
    CampusScene.prototype.referenceModel.call(CampusScene.prototype,geometry,f);
    assert.ok(geometry.data.length>0&&geometry.data.length%27===0,`${label(f)} complete triangles`);
    const cosine=Math.cos(f.angle),sine=Math.sin(f.angle);
    for(let i=0;i<geometry.data.length;i+=9) {
      const vertex=geometry.data.slice(i,i+9);assert.ok(vertex.every(Number.isFinite),`${label(f)} finite vertex`);
      const dx=vertex[0]-f.center[0],dz=vertex[2]-f.center[1],x=dx*cosine-dz*sine,z=dx*sine+dz*cosine;
      assert.ok(Math.abs(x)<=f.size[0]/2+1e-7,`${label(f)} generated x ${x} outside width ${f.size[0]}`);
      assert.ok(Math.abs(z)<=f.size[1]/2+1e-7,`${label(f)} generated z ${z} outside depth ${f.size[1]}`);
      near(Math.hypot(vertex[3],vertex[4],vertex[5]),1,1e-7,`${label(f)} unit normal`);
      vertices++;
    }
    modeled++;
  }
  assert.equal(modeled,50);assert.ok(vertices>1000,'Audit actual detailed generated geometry');
});

test('fitting asymmetric detail preserves its source anchor and uses one horizontal scale', () => {
  const {fitReferenceMeshVertices}=loadSceneForGeometryAudit();
  const feature={...features[0],center:[32,-18],size:[4,6,3],angle:.47};
  const raw=[0,0,0,0,1,0,.2,.3,.4, 5,2,0,0,1,0,.2,.3,.4, -1,0,3,0,1,0,.2,.3,.4];
  const fitted=fitReferenceMeshVertices(raw,feature),local=[];
  for(let i=0;i<fitted.length;i+=9){const x=fitted[i]-feature.center[0],z=fitted[i+2]-feature.center[1];local.push([x*Math.cos(feature.angle)-z*Math.sin(feature.angle),x*Math.sin(feature.angle)+z*Math.cos(feature.angle)]);}
  near(distance(local[0],[0,0]),0,1e-8,'unshifted source anchor');
  const factor=local[1][0]/5;
  assert.ok(factor>0&&factor<1,'oversized detail is compacted');
  near(local[2][0]/-1,factor,1e-8,'same scale for negative east coordinate');
  near(local[2][1]/3,factor,1e-8,'same scale for north/south coordinate');
  near(local[1][0],feature.size[0]/2,1e-8,'furthest x fits envelope edge');
});
