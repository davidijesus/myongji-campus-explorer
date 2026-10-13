'use strict';
// Browser validation of the packaged offline app, not Android device execution.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=process.env.MCE_TEST_OUTPUT||path.join(root,'test-results/mobile-installation');
fs.mkdirSync(out,{recursive:true});
const activity=fs.readFileSync(path.join(root,'android-standalone/src/dev/student/myongjiexplorer/standalone/MainActivity.java'),'utf8');
const csp=activity.match(/headers\.put\("Content-Security-Policy", "([^"]+)"\)/)[1];
const origin='https://appassets.androidplatform.net/assets/index.html';
const html=fs.readFileSync(process.env.MCE_PAGE||path.join(root,'preview.html'));
const checks=[],errors=[],requests=[];
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
const launch={headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})};
let context;
async function open(profile){
 context=await chromium.launchPersistentContext(profile,{...launch,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route('**/*',async route=>{
  if(route.request().url()===origin)return route.fulfill({status:200,contentType:'text/html;charset=utf-8',headers:{'Content-Security-Policy':csp},body:html});
  requests.push(route.request().url());await route.abort();
 });
 await context.setOffline(true);
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);return page;
}
const back=page=>page.evaluate(()=>MCE.handleBack());
const state=page=>page.evaluate(()=>MCE.getState());
(async()=>{
 const profile=fs.mkdtempSync(path.join(out,'profile-'));
 let page=await open(profile);
 check('Offline first launch has both-campus bundled directory',await page.locator('.place-card').count()===50);
 check('Only the Explore root permits exit',await back(page)===false);
 await page.locator('.place-card[data-place="mju-y3"]').click();await page.locator('[data-action="favorite"]').click();
 await page.locator('[data-action="place-detail"]').click();
 check('Back closes the dialog before the selected place',await back(page)===true&&(await state(page)).selected==='mju-y3'&&!(await page.locator('#dialog').evaluate(d=>d.open)));
 await page.locator('.nav-tab[data-tab="food"]').click();
 check('Back from another tab returns to the map before clearing hidden selection',await back(page)===true&&(await state(page)).tab==='explore'&&(await state(page)).selected==='mju-y3');
 check('The next Back closes building details',await back(page)===true&&(await state(page)).selected===null);
 await page.locator('#search').fill('no-such-building');
 check('Empty search is useful and Back clears it',await page.locator('.place-card').count()===0&&await back(page)===true&&await page.locator('.place-card').count()===50);
 await page.locator('[data-category="library"]').click();await page.locator('[data-action="saved-filter"]').click();
 check('Back clears category and saved-only filters',await back(page)===true&&await page.locator('.place-card').count()===50&&await page.locator('[data-action="saved-filter"]').getAttribute('aria-pressed')==='false');
 for(const tab of ['food','buses','chat','events']){
  await page.locator(`.nav-tab[data-tab="${tab}"]`).click();check(`Back from ${tab} returns to Explore`,await back(page)===true&&(await state(page)).tab==='explore');
 }
 for(const campus of ['yongin','seoul']){
  await page.locator('#campus-select').selectOption(campus);
  for(const language of ['en','ko','zh']){
   await page.locator('#language-select').selectOption(language);
   await page.locator('.nav-tab[data-tab="chat"]').click();
   await page.locator('#chat-input').fill(campus==='yongin'?'Y9228':'S10303');await page.locator('#chat-form button').click();
   check(`${campus}/${language}: offline answer has a source and map action`,await page.locator('.answer-message').last().locator('[data-source]').count()>0&&await page.locator('.answer-message').last().locator('[data-place]').count()>0);
   await page.locator('.nav-tab[data-tab="events"]').click();
   check(`${campus}/${language}: honest offline event empty state`,await page.locator('.event-empty').isVisible());
   await back(page);
   for(const {width,height,scale} of [{width:320,height:844,scale:1},{width:390,height:844,scale:1},{width:320,height:568,scale:2},{width:390,height:480,scale:1}]){
    await page.setViewportSize({width,height});await page.evaluate(scale=>MCE.receive({type:'font-scale',scale}),scale);
    const id=campus==='yongin'?'mju-y3':'mju-s9';
    await page.locator(`.place-card[data-place="${id}"]`).click();await page.waitForTimeout(80);
    check(`${campus}/${language}/${width}x${height}/${scale}x: selected actions stay above navigation`,await page.locator('.sheet-actions').evaluate(el=>{const r=el.getBoundingClientRect(),n=document.querySelector('.bottom-nav').getBoundingClientRect();return r.bottom<=n.top+1&&r.top>=document.querySelector('.app-header').getBoundingClientRect().bottom-1;}));
    check(`${campus}/${language}/${width}x${height}/${scale}x: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await back(page);
   }
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.place-card[data-place="mju-s9"]').click();await page.locator('[data-action="favorite"]').click();
 await page.screenshot({path:path.join(out,'seoul-selected-zh.png')});
 await page.locator('.nav-tab[data-tab="food"]').click();await page.screenshot({path:path.join(out,'food-mobile-zh.png')});
 await back(page);
 await page.evaluate(()=>{MCE.receive({type:'lifecycle',active:false});MCE.receive({type:'reduced-motion',enabled:true});});
 await page.locator('#language-select').selectOption('ko');await page.locator('#campus-select').selectOption('yongin');
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForTimeout(150);
 check('Campus/language remount and visibility event keep a paused native scene paused',(await page.evaluate(()=>MCE.diagnostics())).frames===0);
 await page.evaluate(()=>MCE.receive({type:'lifecycle',active:true}));await page.waitForTimeout(100);
 check('Native resume redraws the map',(await page.evaluate(()=>MCE.diagnostics())).frames>0);
 const frames=await page.evaluate(()=>MCE.diagnostics().frames);
 await page.locator('.place-card[data-place="mju-y3"]').click();await page.waitForTimeout(350);
 check('Native reduced motion survives remount without selection animation',(await page.evaluate(()=>MCE.diagnostics())).frames-frames<=3);
 await page.evaluate(()=>{window.originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(){throw new Error('Simulated renderer initialization failure');};});
 await page.locator('#campus-select').selectOption('seoul');
 check('Renderer failure retains the searchable directory',(await state(page)).sceneFailed&&await page.locator('#map-failure').isVisible()&&await page.locator('.place-card').count()===11);
 await page.locator('#search').fill('S9');check('Search still works after renderer failure',await page.locator('.place-card').count()===1);
 await page.evaluate(()=>{HTMLCanvasElement.prototype.getContext=window.originalContext;});
 await page.locator('[data-action="retry-map"]').click();
 check('Reload map recovers without losing preferences',!(await state(page)).sceneFailed&&(await state(page)).favorites.includes('mju-s9')&&(await state(page)).language==='ko');
 await page.locator('#language-select').selectOption('zh');
 await context.close();
 page=await open(profile);
 const reopened=await state(page);
 check('Offline browser process restart retains language, campus and favorites',reopened.language==='zh'&&reopened.campusId==='seoul'&&reopened.favorites.includes('mju-y3')&&reopened.favorites.includes('mju-s9'));
 check('Session-only chat does not leak into a new process',reopened.chatMessages===0);
 check('No embedded network dependencies',requests.length===0);
 check('No unhandled script failures',errors.length===0);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({executedAt:new Date().toISOString(),environment:'Desktop Chromium, offline local asset origin/CSP; NOT Android WebView',pageSha256:require('node:crypto').createHash('sha256').update(html).digest('hex'),checks,errors,requests},null,2));
 console.log(`${checks.length} offline/navigation/mobile checks passed`);
 await context.close();
})().catch(async error=>{console.error(error);await context?.close();process.exitCode=1;});
