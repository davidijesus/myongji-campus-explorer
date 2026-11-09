'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {build,createWorker,assetNames}=require('../scripts/build-pwa.cjs');
const {webcrypto,createHash}=require('node:crypto');

function fixture(t,html='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="img-src data: https:; connect-src https:;"></head><body><div id="app"></div></body></html>'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mce-pwa-generator-'));
 t.after(()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('mce-pwa-generator-'));fs.rmSync(root,{recursive:true,force:true});});
 fs.writeFileSync(path.join(root,'preview.html'),html);fs.writeFileSync(path.join(root,'package.json'),'{"version":"0.5.9"}');
 fs.mkdirSync(path.join(root,'web/pwa-assets'),{recursive:true});
 for(const size of [180,192,512])fs.copyFileSync(path.join(__dirname,`../web/pwa-assets/icon-${size}.png`),path.join(root,`web/pwa-assets/icon-${size}.png`));
 return root;
}
test('PWA distribution keeps root and repository-subpath installation scoped and contains no native dependency',t=>{
 const root=fixture(t);build({root});const out=path.join(root,'pwa');
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.webmanifest')));
 for(const base of ['https://example.org/','https://example.org/myongji-campus-explorer/']){
  assert.equal(new URL(manifest.start_url,base).href,base);assert.equal(new URL(manifest.scope,base).href,base);assert.equal(new URL(manifest.id,base).href,base);
  for(const icon of manifest.icons)assert.ok(new URL(icon.src,base).href.startsWith(base));
 }
 assert.equal(fs.readFileSync(path.join(out,'.nojekyll'),'utf8'),'');
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
 assert.match(html,/manifest-src 'self'; worker-src 'self';/);assert.match(html,/apple-touch-icon/);assert.match(html,/설치 및 오프라인/);assert.match(html,/安装与离线使用/);
 assert.match(html,/mce-shell-status/);assert.doesNotMatch(html,/MCENaver|MCECommunity|ReactNativeWebView/);
 new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
});
test('Changed or missing CSP fails the PWA build before writing an unusable distribution',t=>{
 const root=fixture(t,'<html><head></head><body></body></html>');
 assert.throws(()=>build({root}),/content security policy/);assert.equal(fs.existsSync(path.join(root,'pwa')),false);
});
test('Offline readiness is true only when all five files remain in the active release cache',async()=>{
 const callbacks=new Map(),stored=new Set(assetNames),responses=[];let cacheExists=true,opened=0;
 const {worker}=createWorker({version:'test',assetDigests:Object.fromEntries(assetNames.map(name=>[name,'test']))});
 const sandbox={URL,Map,Promise,encodeURIComponent,self:{registration:{scope:'https://example.org/myongji-campus-explorer/'},addEventListener:(type,callback)=>callbacks.set(type,callback)},caches:{has:async()=>cacheExists,open:async()=>{opened++;return {match:async url=>stored.has(new URL(url).pathname.split('/').pop())?{}:undefined};}}};
 vm.runInNewContext(worker,sandbox);
 async function status(){let pending;callbacks.get('message')({data:{type:'mce-shell-status'},ports:[{postMessage:value=>responses.push(value)}],waitUntil:value=>{pending=value;}});await pending;return responses.at(-1).ready;}
 assert.equal(await status(),true);stored.delete('icon-512.png');assert.equal(await status(),false);stored.add('icon-512.png');assert.equal(await status(),true);
 cacheExists=false;const prior=opened;assert.equal(await status(),false);assert.equal(opened,prior,'Readiness cannot create an empty replacement cache');
 callbacks.get('message')({data:{type:'other'},ports:[]});callbacks.get('message')({data:{type:'mce-shell-status'},ports:[]});assert.equal(responses.length,4);
});

test('A large decoded release remains exact and readable when saved for offline use',async()=>{
 const payload=Buffer.alloc(28*1024*1024,65),hash=createHash('sha256').update(payload).digest('hex');
 const callbacks=new Map(),saved=new Map();let activated=0;
 const {worker}=createWorker({version:'large-test',assetDigests:{'index.html':hash}});
 const sandbox={URL,Map,Promise,Uint8Array,Headers,Response,crypto:webcrypto,encodeURIComponent,
  self:{registration:{scope:'https://example.org/campus/'},addEventListener:(type,cb)=>callbacks.set(type,cb),skipWaiting:async()=>{activated++;assert.equal(saved.size,1);}},
  fetch:async()=>new Response(payload,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Encoding':'gzip','Content-Length':'123','X-Content-Type-Options':'nosniff'}}),
  caches:{open:async()=>({put:async(url,response)=>saved.set(url,response)}),delete:async()=>{throw Error('Unexpected failed cache write');}}};
 vm.runInNewContext(worker,sandbox);let installed;
 callbacks.get('install')({waitUntil:value=>{installed=value;}});await installed;
 const response=saved.get('https://example.org/campus/index.html');
 assert.ok(response);assert.equal(response.headers.get('content-type'),'text/html; charset=utf-8');
 assert.equal(response.headers.get('content-encoding'),null);assert.equal(response.headers.get('content-length'),null);
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual(bytes,payload);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);assert.equal(activated,1);
});

test('A changed download is rejected before an offline cache can be written',async()=>{
 const callbacks=new Map();let opened=0;
 const {worker}=createWorker({version:'integrity-test',assetDigests:{'index.html':'0'.repeat(64)}});
 vm.runInNewContext(worker,{URL,Map,Promise,Uint8Array,Headers,Response,crypto:webcrypto,encodeURIComponent,
  self:{registration:{scope:'https://example.org/campus/'},addEventListener:(type,cb)=>callbacks.set(type,cb)},
  fetch:async()=>new Response('unreviewed content'),caches:{open:async()=>{opened++;throw Error('Must not open cache');}}});
 let installed;callbacks.get('install')({waitUntil:value=>{installed=value;}});
 await assert.rejects(installed,/Offline shell release does not match/);assert.equal(opened,0);
});


const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
function upgradeWorker({holdWrites=false,corruptAsset=null,failedWrite=null}={}){
 const scope='https://example.org/myongji-campus-explorer/',prefix='myongji-shell-'+encodeURIComponent(new URL(scope).pathname)+'-',version='0.6.5';
 const payloads=new Map(assetNames.map(name=>[new URL(name,scope).href,Buffer.from('reviewed fixture bytes: '+name)]));
 const assetDigests=Object.fromEntries([...payloads].map(([url,bytes])=>[url.slice(scope.length),createHash('sha256').update(bytes).digest('hex')]));
 const {worker,shellHash}=createWorker({version,assetDigests});
 const legacyHash=createHash('sha256').update(JSON.stringify({strategy:4,assetDigests})).digest('hex').slice(0,16);
 const currentName=prefix+version+'-'+shellHash,legacyName=prefix+version+'-'+legacyHash;
 const otherScope='myongji-shell-'+encodeURIComponent('/another-app/')+'-0.6.5-other';
 const community='community-fixture-unrelated',olderOwn=prefix+'0.6.4-older';
 const stores=new Map([[legacyName,new Map(payloads)],[olderOwn,new Map([['older.html',Buffer.from('older complete shell')]])],[otherScope,new Map([['other.html',Buffer.from('other app fixture')]])],[community,new Map([['menu.json',Buffer.from('saved menu fixture')]])]]);
 const protectedSnapshot=()=>Object.fromEntries([legacyName,olderOwn,otherScope,community].map(name=>[name,[...stores.get(name)||[]].map(([key,value])=>[key,value.toString('hex')])]));
 const before=protectedSnapshot(),events=[],callbacks=new Map(),requests=[],navigations=[];
 const gates=new Map([...payloads.keys()].map(url=>[url,deferred()])),finished=new Map([...payloads.keys()].map(url=>[url,deferred()])),allStarted=deferred();
 let started=0,skipCount=0,claimCount=0;
 const memory={draft:'unsent isolated question',chat:['isolated answer'],selected:'mju-y3'},memoryBefore=JSON.stringify(memory);
 const sandbox={URL,Map,Promise,Uint8Array,Headers,Response,crypto:webcrypto,encodeURIComponent,
  self:{registration:{scope},addEventListener:(type,callback)=>callbacks.set(type,callback),skipWaiting:async()=>{skipCount++;events.push('skipWaiting');},clients:{
   claim:async()=>{claimCount++;events.push('claim');},
   matchAll:async()=>[{url:scope+'?campus=seoul',navigate:async url=>{navigations.push(url);memory.draft='';return null;}}],
   openWindow:async()=>{throw Error('Unexpected new browser window');}
  }},
  fetch:async(url,options)=>{requests.push({url,cache:options?.cache});assert.ok(payloads.has(url),'only reviewed same-scope assets are requested');return new Response(url.endsWith('/'+corruptAsset)?'wrong bytes':payloads.get(url));},
  caches:{keys:async()=>[...stores.keys()],has:async name=>stores.has(name),delete:async name=>{events.push('delete:'+name);return stores.delete(name);},open:async name=>{
   events.push('open:'+name);if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);
   return {match:async url=>entries.has(url)?new Response(entries.get(url)):undefined,put:async(url,response)=>{
    events.push('put-start:'+url);if(++started===payloads.size)allStarted.resolve();
    if(holdWrites)await gates.get(url).promise;
    if(url.endsWith('/'+failedWrite)){finished.get(url).resolve(false);throw Error('Simulated quota failure');}
    entries.set(url,Buffer.from(await response.arrayBuffer()));events.push('put-done:'+url);finished.get(url).resolve(true);
   }};
  }}
 };
 // A service-worker upgrade has no reason to access persistent user preferences
 // or databases. Make accidental additions fail instead of silently erasing them.
 Object.defineProperty(sandbox,'localStorage',{get(){throw Error('Unexpected preference storage access');}});
 Object.defineProperty(sandbox,'indexedDB',{get(){throw Error('Unexpected user database access');}});
 vm.runInNewContext(worker,sandbox);
 const dispatch=type=>{let pending;callbacks.get(type)({waitUntil:value=>{pending=value;}});return pending;};
 return {scope,prefix,currentName,legacyName,otherScope,community,olderOwn,payloads,stores,before,protectedSnapshot,events,requests,navigations,memory,memoryBefore,gates,finished,allStarted,dispatch,get skipCount(){return skipCount;},get claimCount(){return claimCount;}};
}

test('Automatic activation waits for every verified cache write and uses a cache distinct from legacy policy',async()=>{
 const h=upgradeWorker({holdWrites:true});
 assert.notEqual(h.currentName,h.legacyName,'worker-policy updates must not roll back into the currently active cache');
 const installing=h.dispatch('install');await h.allStarted.promise;
 assert.equal(h.requests.length,5);assert.ok(h.requests.every(request=>request.cache==='no-cache'));
 assert.equal(h.skipCount,0,'starting writes is not enough to activate');
 const urls=[...h.payloads.keys()],last=urls.at(-1);
 for(const url of urls.slice(0,-1))h.gates.get(url).resolve();
 await Promise.all(urls.slice(0,-1).map(url=>h.finished.get(url).promise));
 assert.equal(h.skipCount,0,'one incomplete file must hold activation');
 h.gates.get(last).resolve();await installing;
 assert.equal(h.skipCount,1);assert.equal(h.claimCount,0,'browser activation is a separate lifecycle step');
 const skipIndex=h.events.indexOf('skipWaiting');
 for(const url of urls){assert.ok(h.events.indexOf('put-done:'+url)<skipIndex);assert.deepEqual(h.stores.get(h.currentName).get(url),h.payloads.get(url));}
 assert.deepEqual(h.protectedSnapshot(),h.before,'installation must preserve active and unrelated caches');
});

test('One incorrect file prevents cache writes and automatic activation while preserving all previous data',async()=>{
 const h=upgradeWorker({corruptAsset:'icon-512.png'});
 await assert.rejects(h.dispatch('install'),/Offline shell release does not match/);
 assert.equal(h.skipCount,0);assert.equal(h.claimCount,0);assert.equal(h.stores.has(h.currentName),false);
 assert.ok(!h.events.some(event=>event.startsWith('open:')||event.startsWith('delete:')),'verification failure cannot change cache storage');
 assert.deepEqual(h.protectedSnapshot(),h.before);assert.equal(JSON.stringify(h.memory),h.memoryBefore);assert.deepEqual(h.navigations,[]);
});

test('A cache write failure removes only the incomplete new release and cannot activate it',async()=>{
 const h=upgradeWorker({failedWrite:'icon-512.png'});
 await assert.rejects(h.dispatch('install'),/Simulated quota failure/);
 await Promise.all([...h.finished.values()].map(item=>item.promise));
 assert.equal(h.skipCount,0);assert.equal(h.claimCount,0);assert.equal(h.stores.has(h.currentName),false);
 assert.deepEqual(h.events.filter(event=>event.startsWith('delete:')),['delete:'+h.currentName]);
 assert.deepEqual(h.protectedSnapshot(),h.before,'rollback must retain the active shell and other applications/data');
 assert.equal(JSON.stringify(h.memory),h.memoryBefore);assert.deepEqual(h.navigations,[]);
});

test('Activation cleans only this app old shells and claims clients without forcing navigation or touching user data',async()=>{
 const h=upgradeWorker();await h.dispatch('install');await h.dispatch('activate');
 assert.equal(h.skipCount,1);assert.equal(h.claimCount,1);
 assert.deepEqual(h.events.filter(event=>event.startsWith('delete:')),['delete:'+h.legacyName,'delete:'+h.olderOwn]);
 assert.ok(h.stores.has(h.currentName));assert.equal(h.stores.has(h.legacyName),false);assert.equal(h.stores.has(h.olderOwn),false);
 for(const name of [h.otherScope,h.community])assert.deepEqual(h.protectedSnapshot()[name],h.before[name]);
 assert.ok(h.events.indexOf('delete:'+h.olderOwn)<h.events.indexOf('claim'));
 assert.deepEqual(h.navigations,[],'a valid campus query can still contain an unsent chat draft');
 assert.equal(JSON.stringify(h.memory),h.memoryBefore,'claiming control must leave the existing document untouched');
 for(const [url,bytes]of h.payloads)assert.deepEqual(h.stores.get(h.currentName).get(url),bytes);
});
