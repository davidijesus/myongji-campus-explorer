'use strict';
// Desktop smoke test of the shell's local origin/CSP. This does not run Android.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const project=path.resolve(__dirname,'../..');
const activity=fs.readFileSync(path.join(project,'android-standalone/src/dev/student/myongjiexplorer/standalone/MainActivity.java'),'utf8');
const csp=activity.match(/headers\.put\("Content-Security-Policy", "([^"]+)"\)/)[1];
const origin='https://appassets.androidplatform.net/assets/index.html';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}}),errors=[],blocked=[],checks=[];
    await context.route('**/*',async route=>{
      if(route.request().url()===origin) return route.fulfill({status:200,contentType:'text/html;charset=utf-8',headers:{'Content-Security-Policy':csp},body:fs.readFileSync(path.join(project,'preview.html'))});
      blocked.push(route.request().url());await route.abort();
    });
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
    await page.goto(origin);await page.waitForSelector('.map-label');
    check('Frozen app starts under fixed HTTPS origin and shell CSP',await page.locator('.place-card').count()===50);
    check('Reference geometry renders under shell CSP',(await page.evaluate(()=>MCE.diagnostics())).vertices===165447);
    await page.locator('#search').fill('Y3');await page.locator('.place-card[data-place="mju-y3"]').click();await page.locator('[data-action="favorite"]').click();
    await page.reload();await page.waitForSelector('.map-label');
    check('Browser localStorage fallback persists preferences at fixed origin',await page.evaluate(()=>MCE.getState().favorites.includes('mju-y3')));
    await page.locator('[data-tab="chat"]').click();await page.locator('#chat-input').fill('Where is classroom Y9228?');await page.locator('#chat-form button[type="submit"]').click();
    check('Local assistant works without embedded network requests',/Hambak|함박/.test(await page.locator('#chat-messages').innerText()));
    check('No unexpected embedded resource requests',blocked.length===0);
    check('No uncaught script errors',errors.length===0);
    fs.writeFileSync(path.join(project,'docs/current-android-standalone-asset-smoke.json'),JSON.stringify({executedAt:new Date().toISOString(),environment:'desktop Chromium, intercepted origin; not Android WebView',checks,blocked,errors},null,2));
    console.log(checks.length+' desktop asset/CSP smoke checks passed; Android execution remains untested');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
