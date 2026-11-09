'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SEOUL_REFERENCE_FEATURES}=require('../build/core/seoul.js');
const {REFERENCE_CAMPUS}=require('../build/core/campus.js');
const {createSeoulStairDetail}=require('../build/core/seoul-details.js');
const {createSeoulVegetation}=require('../build/core/seoul-vegetation.js');
const {seoulPavementDistance}=require('../build/core/seoul-paths.js');
const detail=createSeoulStairDetail(SEOUL_REFERENCE_FEATURES,.62);
const distance=(x,z,f)=>Math.hypot(Math.max(0,Math.abs(x-f.center[0])-f.size[0]/2),Math.max(0,Math.abs(z-f.center[1])-f.size[1]/2));
test('reviewed side stair ends on a raised intermediate landing, never on a flat walking path',()=>{
 assert.ok(detail.lower>detail.ground+.9&&detail.upper>detail.lower+.9);
 assert.equal(detail.boxes[0].role,'upper-landing');assert.equal(detail.boxes.at(-1).role,'lower-landing');
 let previous=detail.upper;
 for(const box of detail.boxes){const top=box.y+box.height;assert.ok(top<=previous+1e-9);assert.ok(top>=detail.lower-1e-9);previous=top;}
 // Sample all tread/landing edges: there must be a visible gap from the full
 // ground-level pavement shoulder, not merely an empty navigation graph.
 for(const b of detail.boxes)for(let ix=0;ix<=10;ix++)for(let iz=0;iz<=10;iz++){
  const x=b.x-b.width/2+b.width*ix/10,z=b.z-b.depth/2+b.depth*iz/10;
  assert.ok(seoulPavementDistance(x,z)>1.5+1,'lower apron remains visibly separate');
  for(const f of SEOUL_REFERENCE_FEATURES.filter(f=>f.id!==detail.anchorId))assert.ok(distance(x,z,f)>.2);
 }
});
test('stair detail remains outside the playing surface and clear of all reviewed planting',()=>{
 const field=SEOUL_REFERENCE_FEATURES.find(f=>f.id===detail.anchorId),plants=createSeoulVegetation(SEOUL_REFERENCE_FEATURES,.62).flatMap(z=>z.plants);
 for(const b of detail.boxes){
  assert.ok(Object.values(b).filter(v=>typeof v==='number').every(Number.isFinite));
  assert.ok(b.x-b.width/2>field.center[0]+field.size[0]*.44+.11);
  for(const p of plants){const d=Math.hypot(Math.max(0,Math.abs(p.center[0]-b.x)-b.width/2),Math.max(0,Math.abs(p.center[1]-b.z)-b.depth/2));assert.ok(d>p.radius+.2);}
 }
 assert.equal(createSeoulStairDetail(REFERENCE_CAMPUS.features,.62),null);
});
