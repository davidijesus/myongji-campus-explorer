'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {REFERENCE_CAMPUS}=require('../build/core/campus.js');
const {VISUAL_REFERENCES}=require('../build/core/visual-references.js');
test('every modeled structure has a visual reference record, including evidence gaps',()=>{
 const ids=REFERENCE_CAMPUS.features.filter(f=>f.kind==='building'||f.kind==='gate').map(f=>f.id);
 assert.equal(ids.length,40);
 assert.deepEqual(Object.keys(VISUAL_REFERENCES).sort(),ids.sort());
 for(const [id,ref] of Object.entries(VISUAL_REFERENCES)){
  assert.equal(ref.featureId,id);assert.ok(ref.unknowns.length>0,id);
  assert.ok(['closeup-photo','video-frame','overview-only','not-visually-confirmed'].includes(ref.coverage),id);
  assert.ok(ref.sources.length>0,id);
 }
});
test('close-up claims require corresponding reviewed evidence, not just a directory entry',()=>{
 for(const [id,ref] of Object.entries(VISUAL_REFERENCES)){
  if(ref.coverage==='closeup-photo')assert.ok(ref.sources.some(s=>s.reviewed&&['official-photo','architect-photo'].includes(s.kind)),id);
  if(ref.coverage==='video-frame')assert.ok(ref.sources.some(s=>s.reviewed&&s.kind==='official-video'&&s.frameTime),id);
  for(const s of ref.sources){const url=new URL(s.url);assert.equal(url.protocol,'https:',id);assert.equal(url.username,'');assert.equal(url.password,'');}
 }
});
test('unreviewed building-photo gaps stay visible in catalogue',()=>{
 const gaps=Object.values(VISUAL_REFERENCES).filter(r=>['overview-only','not-visually-confirmed'].includes(r.coverage));
 assert.ok(gaps.length>0);
 assert.ok(gaps.every(r=>r.unknowns.length>0));
});
