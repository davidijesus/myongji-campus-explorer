'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {answerQuestion,KNOWLEDGE_SOURCES}=require('../build/core/knowledge.js');

test('guide social answers distinguish the listed handles from live menus in all languages',()=>{
  for(const [language,query] of [['en','Instagram menus'],['ko','인스타 식단'],['zh','今日菜单']]){
    const result=answerQuestion(query,language,'yongin');
    assert.equal(result.status,'limited');
    assert.ok(result.citations.includes('notion-guide-pdf'));
    for(const handle of ['@O_ulami','@mjhs_lounge','@mju_lounge','@mj_bokji_foodist'])assert.ok(result.answer.includes(handle));
    assert.deepEqual(result.placeCodes,[]);
    assert.ok(!answerQuestion(query,language,'seoul').answer.includes('mjhs_lounge'));
  }
  assert.match(answerQuestion('today menu').answer,/Stories/);
  assert.equal(answerQuestion('Instagram cafeteria allergy').status,'unknown');
});

test('civil office identifies Y13 without inventing a class or dormitory route',()=>{
  for(const [language,query] of [['en','Civil Engineering'],['ko','토목'],['zh','土木']]){
    const result=answerQuestion(query,language);
    assert.deepEqual(result.placeCodes,['Y13']);
    assert.equal(result.status,'limited');
    assert.ok(result.citations.includes('mju-civil-office'));
  }
  assert.equal(answerQuestion('my civil engineering classroom').status,'unknown');
  const guide=KNOWLEDGE_SOURCES.find(s=>s.id==='notion-guide-pdf');
  assert.equal(guide.status,'imported');
  assert.equal(guide.publishedAt,null);
  assert.equal(guide.url,null);
});
