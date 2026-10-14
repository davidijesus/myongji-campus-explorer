'use strict';
// Isolated browser spacing audit. No external links or personal browser profile are used.
// Run SPACING_PHASE=before|after with SPACING_MATRIX=1 for the 36-case audit.
// Optional SPACING_CAPTURE=1 captures related cards; SPACING_EVENTS=1 tests private
// in-memory event fixtures. SPACING_HTML overrides the input HTML, and
// SPACING_REVIEW_DIR overrides the screenshot directory. The optional before
// baseline lives at build/spacing-062/baseline/preview.html; after uses preview.html.
// SPACING_OUTPUT_DIR and SPACING_BEFORE_DIR isolate reports and link comparisons
// when reusing this audit for a later visual revision.
// SPACING_VIEWPORTS may be a JSON array of [width,height] viewport pairs.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const phase = process.env.SPACING_PHASE || 'after';
const baseline = path.join(root, 'build', 'spacing-062', 'baseline');
const input = process.env.SPACING_HTML || path.join(phase === 'before' ? baseline : root, 'preview.html');
const out = process.env.SPACING_OUTPUT_DIR ? path.resolve(process.env.SPACING_OUTPUT_DIR) : path.join(root, 'build', 'spacing-062', phase);
const review = process.env.SPACING_REVIEW_DIR ? path.resolve(process.env.SPACING_REVIEW_DIR) : path.join(root,'build','spacing-062','review');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(review, { recursive: true });
const html = fs.readFileSync(input);
const checks = [], errors = [], unexpectedRequests = [];
const geometry = [], signatures = {};
const viewports = process.env.SPACING_VIEWPORTS ? JSON.parse(process.env.SPACING_VIEWPORTS) : [[320,844],[390,844],[1440,1000]];
if(!Array.isArray(viewports)||viewports.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isInteger(n)||n<240||n>3840)))throw new Error('SPACING_VIEWPORTS must contain integer viewport pairs between240 and3840.');
const origin = 'http://127.0.0.1:4196/';
let browser;
function check(name, pass, detail) { checks.push({ name, pass: !!pass, ...(detail ? { detail } : {}) }); }
async function reproduce(page) {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto(origin);
  await page.locator('[data-action="map-evidence"]').click();
  await page.screenshot({path: path.join(review, `${phase}-yongin-map-sources-desktop.png`)});
  const clip = await page.locator('#dialog-content').evaluate(el => {
    const buttons = [...el.querySelectorAll('button[data-url]')].slice(0,2);
    const paragraphs = [...el.querySelectorAll(':scope > p')];
    const note = paragraphs[paragraphs.length - 1].getBoundingClientRect();
    const bounds = buttons.map(b => b.getBoundingClientRect());
    const r = el.getBoundingClientRect();
    return {x:Math.floor(r.x), y:Math.floor(note.y)-8, width:Math.ceil(r.width), height:Math.ceil(Math.max(...bounds.map(b=>b.bottom))-note.y)+20};
  });
  await page.screenshot({path: path.join(review, `${phase}-reported-spacing.png`), clip});
  const detail = await page.locator('#dialog-content button[data-url]').evaluateAll(nodes => {
    const first=nodes[0].getBoundingClientRect(), second=nodes[1].getBoundingClientRect();
    return {first:{x:first.x,y:first.y,width:first.width,height:first.height},second:{x:second.x,y:second.y,width:second.width,height:second.height},horizontalGap:second.left-first.right,verticalGap:second.top-first.bottom};
  });
  fs.writeFileSync(path.join(out,'reported-spacing.json'),JSON.stringify(detail,null,2));
  console.log(JSON.stringify({phase,input,sha256:crypto.createHash('sha256').update(html).digest('hex'),screenshot:path.join(review,`${phase}-reported-spacing.png`),detail}));
}
const activate = (page, selector) => page.locator(selector).first().evaluate(n=>n.click());
async function relatedCaptures(page) {
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:width===1440?1000:844});
    await page.goto(origin);
    await activate(page,'.nav-tab[data-tab="food"]');
    await page.locator('.food-card').first().screenshot({path:path.join(review,`${phase}-food-card-${width}.png`)});
    await page.locator('.community-actions').first().screenshot({path:path.join(review,`${phase}-community-actions-${width}.png`)});
    await activate(page,'.nav-tab[data-tab="chat"]');
    await page.locator('#chat-input').fill('Where can I get coffee?');
    await page.locator('#chat-form button').click();
    await page.locator('.answer-message').last().screenshot({path:path.join(review,`${phase}-chat-answer-${width}.png`)});
    await activate(page,'[data-action="about"]');
    await activate(page,'#dialog-content [data-action="sources"]');
    await activate(page,'#dialog-content [data-source="o_ulami"]');
    await page.locator('#dialog').screenshot({path:path.join(review,`${phase}-community-source-${width}.png`)});
  }
}
async function inspect(page, key, view, groups = [], region = '#panel-body') {
  const result = await page.evaluate(({groups,region})=>{
    const visible=n=>n.getClientRects().length>0;
    const groupResults=[];
    for(const {name,selector,minimum=0} of groups){
      const containers=[...document.querySelectorAll(selector)];
      for(let index=0;index<containers.length;index++){
        const container=containers[index];
        if(!visible(container))continue;
        let buttons=[...container.querySelectorAll('button')].filter(visible);
        if(name==='map-actions')buttons=buttons.filter(b=>b.dataset.url);
        if(name==='about-actions')buttons=buttons.filter(b=>b.classList.contains('chip'));
        if(name==='place-source-actions')buttons=buttons.filter(b=>(b.classList.contains('primary-button')&&b.dataset.url)||b.dataset.action==='map-evidence');
        if(name==='bus-sources')buttons=buttons.filter(b=>b.classList.contains('source-link'));
        const bounds=buttons.map(b=>({label:b.innerText.replace(/\s+/g,' ').trim(),r:b.getBoundingClientRect()}));
        const failures=[],gaps=[];
        for(let a=0;a<bounds.length;a++)for(let b=a+1;b<bounds.length;b++){
          const x=bounds[a].r,y=bounds[b].r;
          const overlapX=Math.min(x.right,y.right)-Math.max(x.left,y.left);
          const overlapY=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top);
          if(overlapX>.5&&overlapY>.5)failures.push({kind:'overlap',a:bounds[a].label,b:bounds[b].label,overlapX,overlapY});
          else if(overlapY>.5){const gap=Math.max(x.left,y.left)-Math.min(x.right,y.right);gaps.push(gap);if(gap<minimum-.5)failures.push({kind:'horizontal-gap',gap,a:bounds[a].label,b:bounds[b].label});}
          else if(overlapX>.5){const gap=Math.max(x.top,y.top)-Math.min(x.bottom,y.bottom);gaps.push(gap);if(gap<minimum-.5)failures.push({kind:'vertical-gap',gap,a:bounds[a].label,b:bounds[b].label});}
        }
        groupResults.push({name,index,minimum,count:buttons.length,minGap:gaps.length?Math.min(...gaps):null,failures});
      }
    }
    const boundary=document.querySelector(region),r=boundary?.getBoundingClientRect(),overflow=[];
    if(boundary)for(const b of boundary.querySelectorAll('button,select,input,textarea')){
      if(!visible(b))continue;const br=b.getBoundingClientRect();
      if(br.left<r.left-1||br.right>r.right+1||b.scrollWidth>b.clientWidth+1)overflow.push({label:(b.innerText||b.getAttribute('aria-label')||b.id).replace(/\s+/g,' ').slice(0,100),left:br.left,right:br.right,scrollWidth:b.scrollWidth,clientWidth:b.clientWidth,boundaryLeft:r.left,boundaryRight:r.right});
    }
    return {groupResults,overflow,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,regionOverflow:boundary?boundary.scrollWidth>boundary.clientWidth+1:false,links:boundary?[...boundary.querySelectorAll('button[data-url],button[data-source],button[data-action="naver-map"]')].map(b=>({url:b.dataset.url||null,source:b.dataset.source||null,action:b.dataset.action||null})):[]};
  },{groups,region});
  geometry.push({key,view,...result});
  check(`${key}/${view}: no horizontal viewport overflow`,!result.pageOverflow);
  check(`${key}/${view}: content width and button labels fit`,!result.regionOverflow&&result.overflow.length===0,result.overflow.length?result.overflow:undefined);
  for(const group of result.groupResults)check(`${key}/${view}/${group.name}[${group.index}]: distinct controls and ${group.minimum}px spacing`,group.failures.length===0,group.failures.length?group.failures:undefined);
  signatures[`${key}/${view}`]=result.links;
}
async function close(page){await page.evaluate(()=>MCE.handleBack());}
async function screenshotDialog(page,name){
  await page.locator('#dialog').evaluate(n=>n.scrollTop=0);
  await page.locator('#dialog').screenshot({path:path.join(review,`${phase}-${name}.png`)});
}
async function functional(page,key){
  await activate(page,'#dialog [data-action="close-dialog"]');
  await activate(page,'[data-action="about"]');
  check(`${key}: dialog has accessible title`,await page.locator('#dialog').getAttribute('aria-labelledby')==='dialog-title');
  await activate(page,'#dialog [data-action="sources"]');
  await activate(page,'#dialog [data-source]');
  check(`${key}: nested source exposes original URL`,await page.locator('#dialog [data-url]').count()>0);
  await close(page);
  await page.waitForTimeout(20);
  check(`${key}: Back closes nested dialog and restores external focus`,await page.evaluate(()=>!document.querySelector('#dialog').open&&document.activeElement?.dataset.action==='about'));
  await activate(page,'[data-action="map-evidence"]');
  await page.keyboard.press('Tab');
  check(`${key}: keyboard focus remains in modal`,await page.evaluate(()=>document.querySelector('#dialog').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  check(`${key}: Escape closes modal`,await page.locator('#dialog').evaluate(n=>!n.open));
}
async function headerLayout(page,key){
  const result=await page.evaluate(()=>{
    const header=document.querySelector('.app-header').getBoundingClientRect();
    const parts=[...document.querySelectorAll('.app-header .brand,.app-header .selector-control,.app-header .header-about')].filter(n=>n.getClientRects().length).map(n=>({name:n.className,r:n.getBoundingClientRect()}));
    const problems=[];
    for(const {name,r} of parts)if(r.left<header.left-1||r.right>header.right+1||r.top<header.top-1||r.bottom>header.bottom+1)problems.push({kind:'outside-header',name});
    for(let a=0;a<parts.length;a++)for(let b=a+1;b<parts.length;b++){
      const x=parts[a].r,y=parts[b].r;
      if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1)problems.push({kind:'overlap',a:parts[a].name,b:parts[b].name});
    }
    return {problems,count:parts.length};
  });
  check(`${key}: brand, campus/language selectors and About fit without overlap`,result.count===4&&result.problems.length===0,result.problems.length?result.problems:undefined);
}
async function matrix(page) {
  const list=[];
  for(const campus of ['yongin','seoul'])for(const language of ['en','ko','zh'])for(const [width,height] of viewports)for(const scale of [1,2])list.push({campus,language,width,height,scale});
  for(const scenario of list){
    const {campus,language,width,height,scale}=scenario,key=`${campus}-${language}-${width}-${scale*100}`;
    try{
      await page.setViewportSize({width,height});
      await page.goto(origin);
      await page.evaluate(({campus,language,scale})=>{MCE.receive({type:'preferences',campusId:campus,language,favorites:[]});MCE.receive({type:'font-scale',scale});MCE.receive({type:'reduced-motion',enabled:true});},scenario);
      await headerLayout(page,key);
      await inspect(page,key,'explore',[{name:'filters',selector:'.filter-row'},{name:'map-controls',selector:'.control-group'},{name:'campus-map-links',selector:'.campus-map-links'},{name:'location-actions',selector:'.location-actions'},{name:'navigation',selector:'.nav-tabs'}]);
      await activate(page,'[data-action="map-evidence"]');
      await inspect(page,key,'map-evidence',[{name:'map-actions',selector:'#dialog-content',minimum:8},{name:'visual-list',selector:'.visual-catalogue'}],'#dialog-content');
      if(language==='en'&&scale===1)await screenshotDialog(page,`${campus}-map-sources-${width}`);
      if(language==='zh'&&width===320&&scale===2)await screenshotDialog(page,`${campus}-map-sources-320-200-zh`);
      if(campus==='yongin'&&language==='en'&&width===390&&scale===1){
        await activate(page,'#dialog-content [data-visual-ref="mju-y13"]');
        await inspect(page,key,'visual-reference',[{name:'reference-actions',selector:'.reference-actions'}],'#dialog-content');
      }
      if(language==='en'&&width===390&&scale===1)await functional(page,key);else await close(page);
      await activate(page,'[data-action="about"]');
      await inspect(page,key,'about',[{name:'about-actions',selector:'#dialog-content',minimum:8}],'#dialog-content');
      if(language==='en'&&width===390&&scale===1)await screenshotDialog(page,`${campus}-about-390`);
      await activate(page,'#dialog [data-action="sources"]');
      await inspect(page,key,'source-list',[{name:'source-list',selector:'.source-list'}],'#dialog-content');
      if(campus==='yongin'){
        await activate(page,'#dialog [data-source="o_ulami"]');
        await inspect(page,key,'community-source',[{name:'community-source-actions',selector:'[data-community-dialog]',minimum:8}],'#dialog-content');
        if(language==='ko'&&width===320&&scale===2)await screenshotDialog(page,'community-source-320-200-ko');
      }
      await close(page);
      await page.evaluate(campus=>MCE.receive({type:'select',placeId:campus==='yongin'?'mju-y3':'mju-s9'}),campus);
      await inspect(page,key,'place-sheet',[{name:'sheet-actions',selector:'.sheet-actions'}],'#place-sheet');
      await activate(page,'[data-action="place-detail"]');
      await inspect(page,key,'place-detail',[{name:'place-source-actions',selector:'#dialog-content',minimum:8}],'#dialog-content');
      if(language==='en'&&width===390&&scale===1)await screenshotDialog(page,`${campus}-place-detail-390`);
      await close(page);
      await activate(page,'.nav-tab[data-tab="food"]');
      await inspect(page,key,'food',[{name:'food-actions',selector:'.card-actions'},{name:'community-actions',selector:'.community-actions'},{name:'filters',selector:'.filter-row'}]);
      await activate(page,'.nav-tab[data-tab="buses"]');
      await inspect(page,key,'buses',[{name:'bus-sources',selector:campus==='yongin'?'.reading-note>div':'.transport-empty',minimum:8}]);
      if(language==='en'&&width===390&&scale===1)await page.locator(campus==='yongin'?'.reading-note':'.transport-empty').screenshot({path:path.join(review,`${phase}-${campus}-bus-sources-390.png`)});
      await activate(page,'.nav-tab[data-tab="chat"]');
      await activate(page,'[data-action="clear-chat"]');
      await page.locator('#chat-input').fill(campus==='yongin'?'Where is classroom Y9228?':'Where is the library?');
      await activate(page,'#chat-form button');
      await inspect(page,key,'chat',[{name:'citations',selector:'.citations'},{name:'answer-places',selector:'.answer-places'},{name:'suggestions',selector:'.suggestions'},{name:'chat-footer',selector:'.chat-footer'}]);
      check(`${key}: answer retains citation and map action`,await page.locator('.answer-message [data-source]').count()>0&&await page.locator('.answer-message [data-place]').count()>0);
      await activate(page,'.answer-message [data-source]');
      check(`${key}: answer citation opens a source dialog`,await page.locator('#dialog').evaluate(n=>n.open));
      await close(page);
      await activate(page,'.answer-message [data-place]');
      check(`${key}: answer map opens selected campus building`,await page.evaluate(()=>MCE.getState().selected!==null&&MCE.getState().tab==='explore'));
      await page.evaluate(()=>MCE.handleBack());
      check(`${key}: Back returns to answer`,await page.evaluate(()=>MCE.getState().tab==='chat'));
      await activate(page,'.nav-tab[data-tab="events"]');
      await inspect(page,key,'events',[{name:'community-actions',selector:'.community-actions'}]);
    }catch(error){check(`${key}: scenario completes`,false,error.stack||error.message);await page.screenshot({path:path.join(out,`failure-${key}.png`)}).catch(()=>{});}
    fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({phase,lastScenario:key,checks,geometry,signatures},null,2));
    console.log(JSON.stringify({phase,scenario:key,checks:checks.length,failed:checks.filter(c=>!c.pass).length}));
  }
  const beforeSignatures=process.env.SPACING_BEFORE_DIR ? path.join(path.resolve(process.env.SPACING_BEFORE_DIR),'link-signatures.json') : path.join(root,'build','spacing-062','before','link-signatures.json');
  if(phase!=='before'&&fs.existsSync(beforeSignatures)){
    const expected=JSON.parse(fs.readFileSync(beforeSignatures,'utf8'));
    for(const [key,value] of Object.entries(expected))check(`${key}: action destinations unchanged`,JSON.stringify(signatures[key])===JSON.stringify(value));
  }
  check('No uncaught browser errors',errors.length===0,errors);
  check('No external resource requests',unexpectedRequests.length===0,unexpectedRequests);
  const summary={phase,input,sha256:crypto.createHash('sha256').update(html).digest('hex'),scenarioCount:list.length,checks:checks.length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,errors,unexpectedRequests,failures:checks.filter(c=>!c.pass)};
  for(const [name,value] of Object.entries({'summary.json':summary,'checks.json':checks,'geometry.json':geometry,'link-signatures.json':signatures}))fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
  console.log(JSON.stringify(summary));
  if(phase!=='before'&&summary.failed)process.exitCode=1;
}
async function syntheticEvents(page) {
  const startCheck=checks.length, startGeometry=geometry.length;
  const label={en:'Synthetic spacing fixture',ko:'간격 테스트용 예시',zh:'间距测试示例'};
  let scenarioCount=0;
  for(const campus of ['yongin','seoul']){
    const fixture=JSON.parse(fs.readFileSync(path.join(root,'data',campus==='yongin'?'live-seed.json':'seoul-live-seed.json'),'utf8'));
    fixture.version=100000;
    fixture.updatedAt=new Date().toISOString();
    const sourceUrl='https://www.mju.ac.kr/mjukr/index.do';
    const placeId=fixture.places[0].id;
    fixture.events=[{id:'spacing-fixture-only',title:label,description:label,organizer:label,placeId,
      startsAt:new Date(Date.now()+3600000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),
      timeZone:'Asia/Seoul',language:label,state:'published',registrationUrl:null,
      evidence:{status:'verified',sourceUrl,checkedAt:new Date().toISOString(),note:label}}];
    for(const language of ['en','ko','zh'])for(const width of [320,390,1440])for(const scale of [1,2]){
      const key=`fixture-${campus}-${language}-${width}-${scale*100}`;
      await page.setViewportSize({width,height:width===1440?1000:844});
      await page.goto(origin);
      await page.evaluate(({campus,language,scale,fixture})=>{MCE.receive({type:'preferences',campusId:campus,language});MCE.receive({type:'font-scale',scale});MCE.receive({type:'content',data:fixture});},{campus,language,scale,fixture});
      await activate(page,'.nav-tab[data-tab="events"]');
      check(`${key}: in-memory fixture accepted`,await page.locator('#panel-body>.food-card').count()===1&&await page.evaluate(()=>MCE.getState().contentState==='updated'));
      check(`${key}: venue and source remain two actions`,await page.locator('#panel-body>.food-card .card-actions button').count()===2);
      await inspect(page,key,'synthetic-event',[{name:'event-actions',selector:'#panel-body>.food-card .card-actions'}],'#panel-body>.food-card');
      check(`${key}: source destination retained`,await page.locator('#panel-body>.food-card [data-url]').getAttribute('data-url')===sourceUrl);
      await activate(page,'#panel-body>.food-card [data-place]');
      check(`${key}: venue action selects its campus place`,await page.evaluate(placeId=>MCE.getState().selected===placeId&&MCE.getState().tab==='explore',placeId));
      scenarioCount++;
    }
  }
  const results=checks.slice(startCheck);
  const summary={phase,synthetic:true,scope:'In-memory browser fixtures only; no real event created, no dataset file modified, no source opened.',scenarioCount,checks:results.length,passed:results.filter(c=>c.pass).length,failed:results.filter(c=>!c.pass).length,failures:results.filter(c=>!c.pass),errors,unexpectedRequests};
  fs.writeFileSync(path.join(out,'event-fixture-summary.json'),JSON.stringify(summary,null,2));
  fs.writeFileSync(path.join(out,'event-fixture-checks.json'),JSON.stringify(results,null,2));
  fs.writeFileSync(path.join(out,'event-fixture-geometry.json'),JSON.stringify(geometry.slice(startGeometry),null,2));
  console.log(JSON.stringify(summary));
  if(summary.failed||errors.length||unexpectedRequests.length)process.exitCode=1;
}
(async()=>{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    if(route.request().url()===origin)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});
    unexpectedRequests.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await reproduce(page);
  if(process.env.SPACING_CAPTURE)await relatedCaptures(page);
  if(process.env.SPACING_MATRIX)await matrix(page);
  if(process.env.SPACING_EVENTS)await syntheticEvents(page);
  await context.close();
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
