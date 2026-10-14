'use strict';
// Capture real UI states from an explicitly selected, immutable HTML baseline.
// DESIGN_PHASE=before reads build/design-062/baseline/preview.html; after reads
// preview.html. Optional DESIGN_HTML and DESIGN_REVIEW_DIR override these paths.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const phase=process.env.DESIGN_PHASE||'after';
const input=process.env.DESIGN_HTML||path.join(root,phase==='before'?'build/design-062/baseline/preview.html':'preview.html');
const out=path.join(root,'build/design-062',phase);
const review=process.env.DESIGN_REVIEW_DIR?path.resolve(process.env.DESIGN_REVIEW_DIR):path.join(root,'build/design-062/review');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(review,{recursive:true});
const html=fs.readFileSync(input),htmlSha256=crypto.createHash('sha256').update(html).digest('hex');
const origin='http://127.0.0.1:4198/';
const files=[],errors=[],requests=[];
if(process.env.DESIGN_RESUME){
 const progress=path.join(out,'captures-progress.json');
 if(fs.existsSync(progress)){
  const saved=JSON.parse(fs.readFileSync(progress,'utf8'));
  if(saved.htmlSha256!==htmlSha256)throw new Error('Refusing to combine screenshots from different HTML inputs.');
  files.push(...saved.files);
 }
}
let browser;
const activate=(page,selector)=>page.locator(selector).first().evaluate(n=>n.click());
async function capture(page,key,view,selector){
 const name=`${phase}-${key}-${view}.png`,file=path.join(review,name);
 if(selector)await page.locator(selector).first().screenshot({path:file});else await page.screenshot({path:file});
 const bytes=fs.readFileSync(file);files.push({key,view,name,path:file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 fs.writeFileSync(path.join(out,'captures-progress.json'),JSON.stringify({phase,input,htmlSha256,files,errors,requests},null,2));
}
async function close(page){await page.evaluate(()=>MCE.handleBack());}
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:1914,height:814},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{if(route.request().url()===origin)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});requests.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 for(const campus of ['yongin','seoul'])for(const [width,height] of [[1914,814],[390,844],[320,700],[1440,1000]]){
  const key=`${campus}-en-${width}x${height}`;
  if(files.filter(file=>file.key===key).length>=11)continue;
  await page.setViewportSize({width,height});await page.goto(origin);
  await page.evaluate(campus=>{MCE.receive({type:'preferences',campusId:campus,language:'en',favorites:[]});MCE.receive({type:'reduced-motion',enabled:true});},campus);
  await page.waitForFunction(()=>window.MCE?.diagnostics()?.vertices>0);
  await page.waitForTimeout(100);
  await capture(page,key,'map');await capture(page,key,'header','.app-header');
  if(process.env.DESIGN_SCALE2_HEADER&&width===320){
   await page.evaluate(()=>MCE.receive({type:'font-scale',scale:2}));
   await capture(page,key,'header-200','.app-header');await capture(page,key,'map-200');
   await page.evaluate(()=>MCE.receive({type:'font-scale',scale:1}));
  }
  await activate(page,'[data-action="about"]');await capture(page,key,'about','#dialog');await close(page);
  await activate(page,'[data-action="map-evidence"]');await capture(page,key,'map-sources','#dialog');await close(page);
  await page.evaluate(campus=>MCE.receive({type:'select',placeId:campus==='yongin'?'mju-y3':'mju-s9'}),campus);
  await capture(page,key,'selected-place');
  await activate(page,'[data-action="place-detail"]');await capture(page,key,'place-detail','#dialog');await close(page);
  await activate(page,'.nav-tab[data-tab="chat"]');await capture(page,key,'chat-empty');
  await page.locator('#chat-input').fill('Where can I get coffee?');await activate(page,'#chat-form button');await capture(page,key,'chat-answer');
  await activate(page,'.nav-tab[data-tab="food"]');await capture(page,key,'food');
  if(await page.locator('.food-card').count())await capture(page,key,'food-card','.food-card');
  await activate(page,'.nav-tab[data-tab="buses"]');await capture(page,key,'buses');
  console.log(JSON.stringify({phase,key,captures:files.length,errors:errors.length}));
 }
 await context.close();
 const summary={phase,input,htmlSha256,scenarioCount:8,captures:files.length,errors,requests,files};
 fs.writeFileSync(path.join(out,'captures.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify({phase,htmlSha256,scenarioCount:8,captures:files.length,errors,requests}));
 if(errors.length||requests.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
