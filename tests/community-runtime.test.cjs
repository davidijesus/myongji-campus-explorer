const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/community.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const api={};new Function('exports',compiled)(api);
const {COMMUNITY_SOURCES,communitySources,getCommunitySource,currentCommunityUpdates,isCommunityPermalink}=api;
const now=new Date('2026-10-04T15:30:00Z'); // October 5, 00:30 in Seoul.
const item=(extra={})=>({id:'synthetic-menu',sourceId:'mju_lounge',kind:'menu',summary:{en:'Synthetic reviewed summary',ko:'검토한 테스트 요약',zh:'已审核的测试摘要'},sourceUrl:'https://www.instagram.com/p/Synthetic_1/',publishedAt:'2026-10-04T09:00:00+09:00',reviewedAt:'2026-10-04T10:00:00+09:00',validFrom:'2026-10-05',validThrough:'2026-10-05',...extra});

test('guide catalogue has the four sourced profiles in Yongin only, without invented map links',()=>{
 assert.deepEqual(COMMUNITY_SOURCES.filter(source=>source.sourceType!=='official-menu').map(source=>source.id),['o_ulami','mjhs_lounge','mju_lounge','mj_bokji_foodist']);
 assert.equal(communitySources('yongin','menu').length,6);
 assert.equal(communitySources('yongin','announcement').length,1);
 assert.deepEqual(communitySources('seoul'),[]);
 assert.equal(getCommunitySource('mjhs_lounge').profileStatus,'guide-only');
 assert.equal(getCommunitySource('o_ulami').handle,'@O_ulami');
 for(const source of COMMUNITY_SOURCES.filter(source=>source.sourceType!=='official-menu')){
  assert.equal(source.url,`https://www.instagram.com/${source.id}/`);
  assert.equal(source.guidePage,source.id==='o_ulami'?1:4);
  for(const field of [source.title,source.note,...(source.guideLocation?[source.guideLocation]:[])])for(const language of ['en','ko','zh'])assert.ok(field[language]?.trim());
  for(const forbidden of ['placeCode','placeId','lat','lon','coordinates'])assert.equal(Object.hasOwn(source,forbidden),false);
 }
});

test('review visibility follows inclusive Korean calendar dates across UTC midnight',()=>{
 const update=item();
 assert.deepEqual(currentCommunityUpdates([update],'menu',new Date('2026-10-04T14:59:59.999Z')),[]);
 assert.deepEqual(currentCommunityUpdates([update],'menu',new Date('2026-10-04T15:00:00Z')),[update]);
 assert.deepEqual(currentCommunityUpdates([update],'menu',new Date('2026-10-05T14:59:59.999Z')),[update]);
 assert.deepEqual(currentCommunityUpdates([update],'menu',new Date('2026-10-05T15:00:00Z')),[]);
 assert.deepEqual(currentCommunityUpdates([item({validFrom:'2026-10-04',validThrough:'2026-10-04'})],undefined,now),[]);
 assert.deepEqual(currentCommunityUpdates([item({validFrom:'2026-10-06',validThrough:'2026-10-06'})],undefined,now),[]);
 assert.deepEqual(currentCommunityUpdates([update],undefined,new Date('invalid')),[]);
});

test('malformed, unreviewed, future and incomplete summaries fail closed',()=>{
 const invalid=[null,item({id:''}),item({sourceId:'unknown'}),item({kind:'event'}),item({summary:{en:'Only English'}}),item({summary:{en:'a',ko:'b',zh:' '}}),item({sourceUrl:'https://www.instagram.com/other/'}),item({reviewedAt:'2026-10-06T00:00:00Z'}),item({publishedAt:'2026-10-04T12:00:00+09:00'}),item({publishedAt:'2026-02-30T00:00:00Z'}),item({reviewedAt:'2026-10-04T10:00:00'}),item({validFrom:'2026-02-30'}),item({validFrom:'2026-10-06',validThrough:'2026-10-05'})];
 for(const update of invalid)assert.deepEqual(currentCommunityUpdates([update],'menu',now),[],JSON.stringify(update));
 assert.equal(currentCommunityUpdates([item({publishedAt:'2026-10-04T00:00:00Z',reviewedAt:'2026-10-04T00:00:00Z'})],'menu',now).length,1);
});

test('profile category and source identity constrain reviewed content',()=>{
 assert.deepEqual(currentCommunityUpdates([item({sourceId:'o_ulami'})],'menu',now),[]);
 assert.equal(currentCommunityUpdates([item({sourceId:'o_ulami',kind:'announcement'})],'announcement',now).length,1);
 assert.equal(currentCommunityUpdates([item({kind:'announcement'})],'announcement',now).length,1);
 assert.deepEqual(currentCommunityUpdates([item()],'announcement',now),[]);
 assert.deepEqual(currentCommunityUpdates([item({sourceUrl:'https://www.instagram.com/mjhs_lounge/p/Synthetic/'})],'menu',now),[]);
 assert.deepEqual(currentCommunityUpdates([item({sourceUrl:'https://www.instagram.com/stories/mjhs_lounge/1234/'})],'menu',now),[]);
});

test('canonical source URLs include original Stories but exclude redirects and arbitrary resources',()=>{
 for(const url of ['https://www.instagram.com/p/abc_DEF-123/','https://www.instagram.com/reel/abc123/','https://www.instagram.com/mju_lounge/p/abc/','https://www.instagram.com/stories/mju_lounge/123456/'])assert.equal(isCommunityPermalink(url,'mju_lounge'),true,url);
 for(const url of ['https://instagram.com/p/abc/','https://www.instagram.com/p/abc','https://www.instagram.com/p/abc/?igsh=x','https://www.instagram.com/p/abc/#part','http://www.instagram.com/p/abc/','https://www.instagram.com:443/p/abc/','https://user@www.instagram.com/p/abc/','https://www.instagram.com.evil.test/p/abc/','https://www.instagram.com/other/p/abc/','https://www.instagram.com/p/'+ 'a'.repeat(65)+'/','https://www.instagram.com/stories/mju_lounge/'+ '1'.repeat(33)+'/','https://www.instagram.com/stories/mju_lounge/abc/','https://www.instagram.com/stories/mju_lounge/1234/../','https://www.instagram.com/stories/mju_lounge/%31/','javascript:alert(1)'])assert.equal(isCommunityPermalink(url,'mju_lounge'),false,url);
 const story=item({sourceUrl:'https://www.instagram.com/stories/mju_lounge/123456/'});
 assert.deepEqual(currentCommunityUpdates([story],'menu',now),[story]);
});

test('duplicate IDs do not create duplicate cards and newest publication is listed first',()=>{
 const earlier=item({id:'earlier'}),later=item({id:'later',publishedAt:'2026-10-04T00:30:00Z'});
 assert.deepEqual(currentCommunityUpdates([earlier,later,later],'menu',now).map(update=>update.id),['later','earlier']);
 assert.deepEqual(currentCommunityUpdates([item({sourceId:'unknown'}),earlier],'menu',now),[earlier]);
});
