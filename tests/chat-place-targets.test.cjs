'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {answerQuestion}=require('../build/core/knowledge.js');
const {CAMPUSES}=require('../build/core/campuses.js');
const {localize}=require('../build/core/i18n.js');

test('every uncoded reference can link its exact ID from a localized name answer',()=>{
 for(const campus of ['yongin','seoul'])for(const place of CAMPUSES[campus].referencePlaces().filter(p=>!p.code))for(const language of ['en','ko','zh']){
  const result=answerQuestion(localize(place.name,language),language,campus);
  assert.ok(result.placeIds?.includes(place.id),`${campus}/${language}/${place.id}`);
  assert.ok(result.citations.length,`${place.id} keeps its source`);
 }
});

test('explicit building codes and classroom answers never target another campus',()=>{
 for(const language of ['en','ko','zh'])for(const [campus,query,expected] of [['yongin','Y9228','Y9'],['seoul','S10303','S10']]){
  const result=answerQuestion(query,language,campus);
  assert.deepEqual(result.placeCodes,[expected]);
  const codes=new Set(CAMPUSES[campus].referencePlaces().map(p=>p.code));
  assert.ok(result.placeCodes.every(code=>codes.has(code)));
 }
 for(const [campus,query] of [['yongin','S9'],['seoul','Y3']]){
  const answer=answerQuestion(query,'en',campus);
  assert.deepEqual(answer.placeCodes,[]);
  assert.ok(!answer.placeIds?.length);
 }
});

test('natural office location questions take priority over the generic bus intent',()=>{
 const office=CAMPUSES.yongin.referencePlaces().find(place=>place.id==='mju-bus-office');
 for(const language of ['en','ko','zh']){
  const name=localize(office.name,language),question={en:`Where is ${name}?`,ko:`${name}은 어디인가요?`,zh:`${name}在哪里？`}[language];
  const answer=answerQuestion(question,language,'yongin');
  assert.deepEqual(answer.placeIds,['mju-bus-office']);
  assert.ok(answer.citations.length);
 }
 for(const question of ['What are the bus times?','버스 시간표를 알려주세요','校车时刻表']){
  const answer=answerQuestion(question);
  assert.ok(answer.citations.includes('mju-transport-2026-2'));
  assert.ok(!answer.placeIds?.length);
 }
 const coffee=answerQuestion('Where can I get coffee in Student Union?');
 assert.ok(coffee.answer.includes('Myongji Cafe'));
 assert.ok(!coffee.placeIds?.length);
 const diet=answerQuestion('Where can I find vegan food in Student Union?');
 assert.equal(diet.status,'unknown');
 assert.deepEqual(diet.placeCodes,[]);
});
