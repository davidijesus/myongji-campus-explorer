'use strict';
// Run only after the release owner confirms the public GitHub Pages deployment.
// Headless desktop Chrome; no external links, geolocation, installation or source mutation.
// A newly created profile tests a fresh installation and its offline restart, not an upgrade from an older release.
const {chromium,request}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.resolve(process.env.MCE_TEST_OUTPUT||path.join(root,'build/design-063/live'));
const publishedURL=new URL(process.env.MCE_PUBLISHED_URL||'https://davidijesus.github.io/myongji-campus-explorer/');
const commit=process.env.MCE_DEPLOY_COMMIT||'',sourceCommit=process.env.MCE_DEPLOY_SOURCE_COMMIT||'',runURL=process.env.MCE_DEPLOY_RUN_URL||'';
const expectedRoot=path.resolve(process.env.MCE_EXPECTED_PWA_DIR||path.join(root,'pwa'));
const expectedVersion=JSON.parse(fs.readFileSync(path.join(expectedRoot,'version.json'),'utf8'));
const approvedAppHash=process.env.MCE_EXPECTED_APP_HASH||'',approvedShellHash=process.env.MCE_EXPECTED_SHELL_HASH||'',approvedIndexHash=process.env.MCE_EXPECTED_INDEX_SHA256||'';
const assets=['index.html','manifest.webmanifest','service-worker.js','icon-180.png','icon-192.png','icon-512.png','_headers','version.json','.nojekyll'];
const cachedAssets=['index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const expectedHashes=Object.fromEntries(assets.map(name=>[name,sha(fs.readFileSync(path.join(expectedRoot,name)))]));
const expectedCache=`myongji-shell-${encodeURIComponent(publishedURL.pathname)}-${expectedVersion.version}-${expectedVersion.shellHash}`;
const expectedWorkerURL=new URL('service-worker.js',publishedURL).href;
const checks=[],errors=[],network=[],blockedRequests=[],responses=[],screenshots=[],offlineRequests=[],contexts=[];
const workerSnapshots=[],offlineHTMLResponses=[];
const offlineContexts=new WeakSet();
let api,context,page,browserVersion,profile,failure,initialURLResponse,initialTLS;
fs.mkdirSync(out,{recursive:true});
const check=(name,value,detail)=>{checks.push({name,passed:!!value,...(value?{}:{detail})});assert.ok(value,name);console.log('PASS '+name);};
const bounded=(promise,label,ms=15000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`${label}: timeout ${ms}ms`)),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
const settle=()=>bounded(page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),'animation settlement',7000);
const allowed=url=>{try{const parsed=new URL(url);return parsed.protocol==='https:'&&parsed.origin===publishedURL.origin&&(parsed.pathname.startsWith(publishedURL.pathname)||parsed.pathname==='/favicon.ico');}catch{return false;}};
const headerSummary=headers=>Object.fromEntries(['content-type','cache-control','strict-transport-security','x-content-type-options','content-security-policy','service-worker-allowed','etag','last-modified','server','x-cache'].map(name=>[name,headers[name]||null]));
async function openProfile(directory,offline=false){
 const current=await chromium.launchPersistentContext(directory,{headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 contexts.push(current);browserVersion=current.browser()?.version()||browserVersion;current.setDefaultTimeout(15000);current.setDefaultNavigationTimeout(30000);
 await current.route('**/*',route=>{const url=route.request().url();if(allowed(url))return route.continue();blockedRequests.push(url);return route.abort('blockedbyclient');});
 current.on('request',req=>{const item={url:req.url(),method:req.method(),resourceType:req.resourceType(),offlineMode:offlineContexts.has(current)};(item.offlineMode?offlineRequests:network).push(item);if(!allowed(req.url()))blockedRequests.push(req.url());});
 await current.addInitScript(()=>{
  window.__liveQA={gpsCalls:0,installEvents:0};
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition(){window.__liveQA.gpsCalls++;throw Error('Live QA does not use GPS');},getCurrentPosition(){window.__liveQA.gpsCalls++;throw Error('Live QA does not use GPS');},clearWatch(){}}});
  window.addEventListener('beforeinstallprompt',()=>window.__liveQA.installEvents++);
 });
 if(offline){await current.setOffline(true);offlineContexts.add(current);}
 context=current;page=await current.newPage();page.on('pageerror',error=>errors.push(error.message));
 // Keep only this test tab; a restored tab must not retain an older controlling worker.
 await Promise.all(current.pages().filter(existing=>existing!==page).map(existing=>existing.close()));
 return current;
}
async function workerReady(){
 await page.waitForSelector('.map-label',{state:'attached'});
 let registration;
 try{
  await page.waitForFunction(async({scope,workerURL,cacheName})=>{
   const r=await navigator.serviceWorker.getRegistration(scope),controller=navigator.serviceWorker.controller,names=await caches.keys();
   return isSecureContext&&r?.scope===scope&&r.active?.state==='activated'&&r.active.scriptURL===workerURL&&controller===r.active&&controller.state==='activated'&&!r.installing&&!r.waiting&&names.length===1&&names[0]===cacheName;
  },{scope:publishedURL.href,workerURL:expectedWorkerURL,cacheName:expectedCache},{timeout:30000,polling:200});
 }finally{
  registration=await bounded(page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration(),controller=navigator.serviceWorker.controller;return {scope:r?.scope,active:r?.active?.state,activeScriptURL:r?.active?.scriptURL,installing:r?.installing?.state,waiting:r?.waiting?.state,controllerState:controller?.state,controllerScriptURL:controller?.scriptURL,controllerIsActive:!!controller&&controller===r?.active,cacheNames:await caches.keys(),updateViaCache:r?.updateViaCache,secure:isSecureContext};}),'registration');
  workerSnapshots.push({url:page.url(),offlineMode:offlineContexts.has(context),...registration});
 }
 check('Fresh installation has the active scoped worker and expected release cache',registration.scope===publishedURL.href&&registration.active==='activated'&&registration.activeScriptURL===expectedWorkerURL&&registration.controllerIsActive&&registration.controllerState==='activated'&&!registration.installing&&!registration.waiting&&registration.cacheNames.length===1&&registration.cacheNames[0]===expectedCache&&registration.secure,registration);
 return registration;
}
async function verifyOfflineHTML(response,label){
 const record={label,url:response.url(),status:response.status(),fromServiceWorker:response.fromServiceWorker(),sha256:sha(await bounded(response.body(),'offline HTML response'))};
 offlineHTMLResponses.push(record);
 check(`${label}: HTML bytes match the exact reviewed release`,record.status===200&&record.sha256===expectedHashes['index.html'],record);
}
async function help(){await page.locator('[data-action="about"]').click();await page.locator('#pwa-install-help summary').click();await page.waitForFunction(()=>document.querySelector('#pwa-install-help')?.dataset.state==='ready');}
async function closeHelp(){await page.locator('[data-action="close-dialog"]').click();await settle();}
async function tab(id){await page.locator(`.nav-tab[data-tab="${id}"]`).click();await settle();}
async function screenshot(name){await page.screenshot({path:path.join(out,name)});screenshots.push(name);}
async function auditLayout(label){
 const detail=await page.evaluate(()=>{
  const overflow=[];for(const selector of ['html','.app-header','.selector-row','.bottom-nav','#panel-head','#panel-body','.answer-message','.chat-form','#dialog-content'])for(const el of document.querySelectorAll(selector))if(el.getClientRects().length&&el.clientWidth>0&&el.scrollWidth>el.clientWidth+1)overflow.push({selector,width:el.clientWidth,scroll:el.scrollWidth});
  const head=document.querySelector('.app-header').getBoundingClientRect();const outside=[...document.querySelectorAll('.brand,.selector-row,.header-about')].filter(el=>{const r=el.getBoundingClientRect();return r.left<head.left-1||r.right>head.right+1||r.top<head.top-1||r.bottom>head.bottom+1;});
  return {overflow,headerOutside:outside.length,width:innerWidth,height:innerHeight};
 });
 check(`${label}: no horizontal clipping or misplaced header control`,detail.overflow.length===0&&detail.headerOutside===0,detail);
}
(async()=>{
 // Authorization metadata is required before opening any connection.
 check('Release owner explicitly confirmed deployment',process.env.MCE_DEPLOY_CONFIRMED==='1');
 check('Published commit is identified',/^[0-9a-f]{40}$/i.test(commit));
 check('Source commit is identified separately from published artifact',/^[0-9a-f]{40}$/i.test(sourceCommit));
 check('Deployment CI run is identified',/^https:\/\/github\.com\/davidijesus\/myongji-campus-explorer\/actions\/runs\/\d+(?:\/.*)?$/.test(runURL));
 check('Public target is the approved HTTPS project URL',publishedURL.href==='https://davidijesus.github.io/myongji-campus-explorer/');
 check('Local reviewed release is the explicitly confirmed 0.6.3 candidate',expectedVersion.version==='0.6.3'&&/^[0-9a-f]{12}$/.test(approvedAppHash)&&/^[0-9a-f]{16}$/.test(approvedShellHash)&&expectedVersion.appHash===approvedAppHash&&expectedVersion.shellHash===approvedShellHash);
 check('Expected publication HTML matches the frozen reviewed release',/^[0-9a-f]{64}$/.test(approvedIndexHash)&&expectedHashes['index.html']===approvedIndexHash);
 api=await request.newContext({ignoreHTTPSErrors:false,timeout:30000});
 for(const name of assets){
  const url=new URL(name,publishedURL).href,response=await api.get(url,{maxRedirects:0});
  const body=await response.body(),headers=response.headers(),record={name,url,status:response.status(),sha256:sha(body),bytes:body.length,headers:headerSummary(headers)};
  responses.push(record);
  if(name==='.nojekyll'&&response.status()===404){record.note='Pages does not expose its build marker at this URL; marker bytes cannot be independently checked over HTTPS.';continue;}
  check(`${name}: HTTPS asset responds successfully without redirect`,response.status()===200&&response.url()===url,{status:response.status(),url:response.url()});
  check(`${name}: public bytes match reviewed release`,record.sha256===expectedHashes[name],{expected:expectedHashes[name],actual:record.sha256});
  if(name==='version.json'){
   const actual=JSON.parse(body.toString());record.version=actual;
   check('Live version matches reviewed app and shell',actual.version===expectedVersion.version&&actual.appHash===expectedVersion.appHash&&actual.shellHash===expectedVersion.shellHash&&actual.native===false,actual);
   check('Published build timestamp matches the branch artifact',actual.builtAt===expectedVersion.builtAt&&Number.isFinite(Date.parse(actual.builtAt)),actual.builtAt);
  }
  if(name==='index.html')check('HTML response has HTML content type',/^text\/html(?:;|$)/i.test(headers['content-type']||''));
  if(name==='service-worker.js')check('Worker has executable JavaScript content type',/^(?:application|text)\/(?:javascript|ecmascript|x-javascript)(?:;|$)/i.test(headers['content-type']||''));
  if(name==='manifest.webmanifest')check('Manifest has JSON-compatible content type',/^(?:application\/(?:manifest\+json|json)|text\/plain)(?:;|$)/i.test(headers['content-type']||''));
  if(name.endsWith('.png'))check(`${name}: icon response is PNG`,/^image\/png(?:;|$)/i.test(headers['content-type']||''));
 }
 await api.dispose();api=null;
 const profileRoot=path.join(root,'build/test-tmp');fs.mkdirSync(profileRoot,{recursive:true});profile=fs.mkdtempSync(path.join(profileRoot,'pages-live-063-'));
 await openProfile(profile);
 const response=await page.goto(publishedURL.href);initialURLResponse={status:response.status(),url:response.url(),sha256:sha(await response.body()),headers:headerSummary(await response.allHeaders())};initialTLS=await response.securityDetails();
 check('Project directory serves the exact reviewed HTML over HTTPS',initialURLResponse.status===200&&initialURLResponse.url===publishedURL.href&&initialURLResponse.sha256===expectedHashes['index.html'],initialURLResponse);
 check('Browser negotiated TLS for the public page',!!initialTLS?.protocol,initialTLS);
 await workerReady();
 check('Header omits the removed Campus Explorer subtitle',await page.locator('.app-header').evaluate(header=>!header.querySelector('.brand-caption')&&!/Campus\s+Explorer/i.test(header.textContent||'')));
 const metadata=await page.evaluate(async()=>({manifestURL:document.querySelector('link[rel="manifest"]').href,manifest:await(await fetch(document.querySelector('link[rel="manifest"]').href)).json(),metaCSP:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,installEvents:window.__liveQA.installEvents}));
 check('Manifest id, scope and start URL stay inside project',metadata.manifestURL===new URL('manifest.webmanifest',publishedURL).href&&['id','scope','start_url'].every(key=>new URL(metadata.manifest[key],metadata.manifestURL).href===publishedURL.href));
 check('Published page retains its embedded worker policy',metadata.metaCSP?.includes("worker-src 'self'")&&metadata.metaCSP?.includes("manifest-src 'self'"));
 const cache=await bounded(page.evaluate(async expected=>{const names=await caches.keys(),files=[];if(!names.includes(expected))return {names,files,missingExpectedCache:true};const store=await caches.open(expected),urls=await store.keys();for(const request of urls){const response=await store.match(request);files.push({url:request.url,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')});}return {names,files};},expectedCache),'verify cached shell',20000);
 check('Worker cache contains exactly the five reviewed local assets',cache.names.length===1&&cache.names[0]===expectedCache&&cache.files.length===cachedAssets.length&&cachedAssets.every(name=>cache.files.some(file=>file.url===new URL(name,publishedURL).href&&file.sha256===expectedHashes[name])),cache);
 for(const campus of ['yongin','seoul'])for(const language of ['en','ko','zh']){
  await page.locator('#campus-select').selectOption(campus);await page.locator('#language-select').selectOption(language);await tab('explore');
  check(`${campus}/${language}: directory renders expected places`,await page.locator('.place-card').count()===(campus==='yongin'?50:11));
  const id=campus==='yongin'?'mju-y3':'mju-s9',code=campus==='yongin'?'Y3':'S9';
  await tab('chat');await page.locator('#chat-input').fill(`Where is ${code}?`);await page.locator('#chat-form button[type="submit"]').click();await settle();
  const answer=page.locator('.answer-message').last(),action=answer.locator(`[data-chat-map][data-place="${id}"]`).first();
  check(`${campus}/${language}: offline-capable response includes campus map action`,await action.count()===1);
  await action.click();await settle();
  check(`${campus}/${language}: response opens correct map selection`,await page.evaluate(({campus,id})=>MCE.getState().campusId===campus&&MCE.getState().tab==='explore'&&MCE.getState().selected===id,{campus,id}));
  await page.locator('[data-action="return-chat"]').click();await settle();
  check(`${campus}/${language}: return restores chat answer`,await page.evaluate(()=>MCE.getState().tab==='chat')&&await action.evaluate(el=>document.activeElement===el));
  await tab('events');check(`${campus}/${language}: event panel remains reachable`,await page.locator('#panel-head h2').count()===1&&await page.locator('#panel-body').innerText()!=='');
 }
 await page.locator('#campus-select').selectOption('yongin');await page.locator('#language-select').selectOption('en');await tab('explore');
 await page.locator('#search').fill('Y30');await page.locator('.place-card[data-place="mju-y30"]').click();await page.locator('[data-action="favorite"]').click();
 check('Favorite is saved through normal UI',await page.evaluate(()=>MCE.getState().favorites.includes('mju-y30')));
 await page.locator('[data-action="close-place"]').click();await page.locator('#search').fill('');
 for(const [language,title] of [['en','Install & offline'],['ko','설치 및 오프라인'],['zh','安装与离线使用']]){
  await page.locator('#language-select').selectOption(language);await help();
  check(`${language}: installation help reports verified offline readiness`,await page.locator('#pwa-install-help summary').innerText()===title&&await page.locator('[data-pwa-status]').getAttribute('role')==='status');
  check(`${language}: install button follows browser support`,await page.locator('[data-pwa-install]').isVisible()===await page.evaluate(()=>window.__liveQA.installEvents>0));
  await closeHelp();check(`${language}: About dismissal restores opener focus`,await page.locator('[data-action="about"]').evaluate(el=>document.activeElement===el));
 }
 await page.locator('#language-select').selectOption('en');
 for(const [width,height] of [[320,740],[390,844],[844,390]])for(const scale of [1,2]){
  await page.setViewportSize({width,height});await page.evaluate(scale=>MCE.receive({type:'font-scale',scale}),scale);
  await tab('explore');await auditLayout(`${width}x${height}/${scale}x/explore`);await screenshot(`live-${width}x${height}-font${scale}.png`);
  await help();await auditLayout(`${width}x${height}/${scale}x/install`);await screenshot(`live-${width}x${height}-font${scale}-install.png`);await page.keyboard.press('Escape');await settle();
  check(`${width}x${height}/${scale}x: Escape closes installation help`,await page.locator('#dialog').evaluate(el=>!el.open));
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>MCE.receive({type:'font-scale',scale:1}));await page.locator('#campus-select').selectOption('seoul');await page.locator('#language-select').selectOption('zh');
 check('No browser geolocation provider was used',await page.evaluate(()=>window.__liveQA.gpsCalls===0));
 await context.setOffline(true);offlineContexts.add(context);const offlineNavigation=await page.goto(new URL('index.html?launch=offline-check',publishedURL).href);await workerReady();
 check('Offline direct navigation is served by the service worker',offlineNavigation.fromServiceWorker());
 await verifyOfflineHTML(offlineNavigation,'Offline direct navigation');
 check('Offline direct navigation retains campus, language and favorite',await page.evaluate(()=>{const state=MCE.getState();return state.campusId==='seoul'&&state.language==='zh'&&state.favorites.includes('mju-y30');}));
 await tab('chat');await page.locator('#chat-input').fill('Where is S9?');await page.locator('#chat-form button[type="submit"]').click();await settle();
 check('Offline chat produces its map action',await page.locator('.answer-message').last().locator('[data-chat-map][data-place="mju-s9"]').count()===1);
 await help();await screenshot('live-offline-help.png');await closeHelp();
 await context.close();context=null;
 await openProfile(profile,true);const offlineReopen=await page.goto(publishedURL.href);await workerReady();
 check('Offline process restart is served by the service worker',offlineReopen.fromServiceWorker());
 await verifyOfflineHTML(offlineReopen,'Offline process restart');
 check('New offline browser process reopens cached project with preferences',await page.evaluate(()=>MCE.getState().campusId==='seoul'&&MCE.getState().language==='zh'&&MCE.getState().favorites.includes('mju-y30'))&&await page.locator('.place-card').count()===11);
 check('Transient chat does not persist into reopened process',await page.evaluate(()=>MCE.getState().chatMessages===0));
 await screenshot('live-offline-process-reopen.png');await context.close();context=null;
 const emptyProfile=fs.mkdtempSync(path.join(profileRoot,'pages-live-063-uncached-'));await openProfile(emptyProfile,true);let uncachedFailure;
 try{await page.goto(publishedURL.href);}catch(error){uncachedFailure=error.message;}
 check('Brand-new offline profile cannot claim an uncached first launch',!!uncachedFailure&&await page.locator('.map-label').count()===0,uncachedFailure);
 await context.close();context=null;
 check('No unexpected application JavaScript errors',errors.length===0,errors);
 check('No request to external sources or unrelated origin was made',blockedRequests.length===0,blockedRequests);
 for(const name of assets)check(`${name}: local expected artifact remained unchanged`,sha(fs.readFileSync(path.join(expectedRoot,name)))===expectedHashes[name]);
})().catch(error=>{failure=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
 await api?.dispose().catch(()=>{});for(const item of contexts)await item.close().catch(()=>{});
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({executedAt:new Date().toISOString(),publishedURL:publishedURL.href,releaseOwnerProvidedArtifactCommit:commit,releaseOwnerProvidedSourceCommit:sourceCommit,releaseOwnerProvidedCIRun:runURL,expectedRoot,expectedVersion,expectedHashes,browserVersion,scope:'Actual public HTTPS GitHub Pages deployment; fresh installation in a newly created isolated desktop headless Chrome profile, followed by offline restart of that same release. Upgrade from a previous release is not tested; there is no prepared older-version profile. Mobile-sized viewports and browser offline mode, not Android/iPhone installation. No install prompt fixture, real GPS, external links or public writes. CI attribution is supplied by release owner; public bytes are independently hash-verified. A hidden .nojekyll marker may return 404 and is reported explicitly rather than counted as byte-verified.',initialURLResponse,initialTLS,workerSnapshots,offlineHTMLResponses,checks,passed:checks.filter(item=>item.passed).length,responses,screenshots,network,offlineRequests,blockedRequests,errors,failure},null,2)+'\n');
 console.log(JSON.stringify({checks:checks.length,passed:checks.filter(item=>item.passed).length,errors:errors.length,failure,out}));
});
