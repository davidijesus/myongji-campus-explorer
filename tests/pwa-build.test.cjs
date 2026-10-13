'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {build,createWorker,assetNames}=require('../scripts/build-pwa.cjs');

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
