'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateCommunitySnapshot,acceptCommunitySnapshot}=require('../build/core/community-sync.js');
const {currentCommunityUpdates,isCommunityPermalink,COMMUNITY_SOURCES}=require('../build/core/community.js');
const now=Date.parse('2026-10-04T12:00:00Z');
const menu=(extra={})=>({id:'official-2026-10-04-lunch',sourceId:'mju-menu-library',kind:'menu',summary:{en:'Synthetic menu for validation',ko:'검증용 식단',zh:'验证用菜单'},sourceUrl:'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28',publishedAt:null,observedAt:'2026-10-04T09:00:00Z',reviewedAt:'2026-10-04T10:00:00Z',validFrom:'2026-10-04',validThrough:'2026-10-04',...extra});
const snapshot=(extra={})=>({schemaVersion:1,campusId:'yongin',version:1,updatedAt:'2026-10-04T11:00:00Z',updates:[menu()],...extra});

test('official source registry gives each cafeteria one dated allowlist and multilingual provenance',()=>{
 for(const [id,diet,page] of [['mju-menu-library',4,485],['mju-menu-student',5,486],['mju-menu-dorm',6,487]]){
  const source=COMMUNITY_SOURCES.find(s=>s.id===id);
  assert.equal(source.url,`https://www.mju.ac.kr/mjukr/${page}/subview.do`);
  assert.equal(source.guidePage,null);assert.equal(source.sourceType,'official-menu');
  for(const language of ['en','ko','zh'])assert.ok(source.title[language]&&source.note[language]);
  assert.ok(isCommunityPermalink(`https://www.mju.ac.kr/diet/mjukr/${diet}/view.do?monday=2026.09.28`,id));
  for(const url of [`https://www.mju.ac.kr/diet/mjukr/${diet}/view.do?monday=2026.09.29`,`https://www.mju.ac.kr/diet/mjukr/${diet}/view.do?monday=2026.02.30`,`https://www.mju.ac.kr/mjukr/${page}/subview.do`,`https://www.mju.ac.kr/diet/mjukr/${diet}/view.do?monday=2026.09.28&week=next`,`https://user@www.mju.ac.kr/diet/mjukr/${diet}/view.do?monday=2026.09.28`])assert.equal(isCommunityPermalink(url,id),false,url);
 }
});
test('unknown publication time remains null and is replaced only by explicit observation provenance',()=>{
 const value=validateCommunitySnapshot(snapshot(),now);
 assert.equal(value.updates[0].publishedAt,null);
 assert.equal(value.updates[0].observedAt,'2026-10-04T09:00:00Z');
 for(const extra of [{observedAt:undefined},{observedAt:'2026-10-04T10:30:00Z'},{observedAt:'2026-10-04T09:00:00+14:01'},{publishedAt:'2026-10-04T09:30:00Z'},{kind:'announcement'},{sourceId:'mju-menu-student'},{validFrom:'2026-10-05',validThrough:'2026-10-05'}])assert.equal(validateCommunitySnapshot(snapshot({updates:[menu(extra)]}),now),null);
 const instagram=menu({sourceId:'mju_lounge',sourceUrl:'https://www.instagram.com/p/Test/',publishedAt:null});
 assert.equal(validateCommunitySnapshot(snapshot({updates:[instagram]}),now),null);
});
test('snapshot validation rejects private extra fields, unsafe text, date mistakes and malformed limits',()=>{
 for(const extra of [{schemaVersion:2},{campusId:'seoul'},{version:0},{version:1.5},{version:Number.MAX_SAFE_INTEGER+1},{updatedAt:'2026-10-04T12:00:01Z'},{updatedAt:'2026-10-04T09:59:59Z'},{updatedAt:'2026-02-30T12:00:00Z'},{rawCapture:'private'},{updates:Array.from({length:101},(_,i)=>menu({id:'menu-'+i}))}])assert.equal(validateCommunitySnapshot(snapshot(extra),now),null);
 for(const extra of [{rawCapture:'private'},{reviewedAt:'2026-10-04T11:30:00Z'},{validFrom:'2026-02-30'},{summary:{en:'<script>alert(1)</script>',ko:'a',zh:'b'}},{summary:{en:'plain',ko:'a',zh:'b',private:'note'}},{summary:{en:'a'.repeat(401),ko:'a',zh:'b'}},{summary:{en:'contact@example.org',ko:'a',zh:'b'}}])assert.equal(validateCommunitySnapshot(snapshot({updates:[menu(extra)]}),now),null);
 assert.equal(validateCommunitySnapshot(snapshot({updates:[menu(),menu()]}),now),null);
});
test('monotonic snapshots retain identity, allow explicit removal and keep expired records out of current view',()=>{
 const first=validateCommunitySnapshot(snapshot(),now);
 const two=acceptCommunitySnapshot(snapshot({version:2}),first,now);
 assert.equal(two.version,2);
 assert.equal(acceptCommunitySnapshot(first,two,now),null);
 assert.equal(acceptCommunitySnapshot(snapshot({version:3,updatedAt:'2026-10-04T10:30:00Z'}),two,now),null);
 assert.equal(acceptCommunitySnapshot(snapshot({version:2,updates:[]}),two,now),null);
 assert.deepEqual(acceptCommunitySnapshot(JSON.parse(JSON.stringify(two)),two,now),two);
 const cleared=acceptCommunitySnapshot(snapshot({version:3,updates:[]}),two,now);
 assert.equal(cleared.updates.length,0);
 assert.equal(currentCommunityUpdates(first.updates,'menu',new Date('2026-10-04T14:59:59Z')).length,1);
 assert.equal(currentCommunityUpdates(first.updates,'menu',new Date('2026-10-04T15:00:00Z')).length,0);
 const historical=snapshot({updates:[menu({validFrom:'2026-09-28',validThrough:'2026-10-02'})]});
 assert.ok(validateCommunitySnapshot(historical,now));
 assert.equal(currentCommunityUpdates(historical.updates,'menu',new Date(now)).length,0);
});
