'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {installHelp,styles:installStyles}=require('./pwa-install.cjs');
const digest=content=>crypto.createHash('sha256').update(content).digest('hex');
const assetNames=['index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
function createWorker({version,assetDigests}){
 const shellHash=digest(JSON.stringify({strategy:3,assetDigests})).slice(0,16);
 return {shellHash,worker:`'use strict';
// Versioned offline shell only. API responses and external sources are never cached here.
// Updates follow the browser lifecycle: close all app windows to activate a waiting release.
const prefix='myongji-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const cacheName=prefix+${JSON.stringify(version+'-')}+${JSON.stringify(shellHash)};
const local=name=>new URL(name,self.registration.scope).href;
const digests=new Map(Object.entries(${JSON.stringify(assetDigests)}).map(([name,hash])=>[local(name),hash]));
const pending=new Map();
async function download(url){
 const response=await fetch(url,{cache:'no-cache'});
 if(!response.ok||response.redirected)throw new Error('Offline shell download failed');
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
 if(actual!==digests.get(url))throw new Error('Offline shell release does not match');
 return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 // Verify the whole release before writing. A partial deployment cannot replace the active shell.
 const files=await Promise.all([...digests.keys()].map(async url=>[url,await download(url)]));
 const cache=await caches.open(cacheName);
 try{await Promise.all(files.map(([url,response])=>cache.put(url,response)));}
 catch(error){await caches.delete(cacheName);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(prefix)&&name!==cacheName)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='mce-shell-status'||!event.ports[0])return;
 event.waitUntil((async()=>{
  let ready=false;
  try{if(await caches.has(cacheName)){const cache=await caches.open(cacheName);ready=(await Promise.all([...digests.keys()].map(url=>cache.match(url)))).every(Boolean);}}catch{}
  event.ports[0].postMessage({type:'mce-shell-status',ready});
 })());
});
async function shell(url){
 const cache=await caches.open(cacheName),cached=await cache.match(url);
 if(cached)return cached;
 // Browser eviction recovery is restricted to the same verified release. Share concurrent misses.
 if(!pending.has(url))pending.set(url,(async()=>{const response=await download(url);await cache.put(url,response.clone());return response;})().finally(()=>pending.delete(url)));
 return (await pending.get(url)).clone();
}
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  if(url.pathname!==scope.pathname&&url.pathname!==new URL('index.html',scope).pathname)return;
  event.respondWith(shell(local('index.html')).catch(()=>Response.error()));
 }else if(digests.has(url.href))event.respondWith(shell(url.href).catch(()=>Response.error()));
});
`};
}
function build({root=path.resolve(__dirname,'..'),out=path.join(root,'pwa')}={}){
 const app=fs.readFileSync(path.join(root,'preview.html'),'utf8');
 if(!app.includes("img-src data: https:; connect-src https:;")||!app.includes('</head>')||!app.includes('</body>'))throw new Error('PWA build needs the expected application document and content security policy');
 fs.mkdirSync(out,{recursive:true});
 const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,appHash=digest(app).slice(0,12);
 const extras='<link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icon-192.png"><link rel="apple-touch-icon" href="./icon-180.png"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><style>'+installStyles+'</style>';
 const registration=`<script>(${installHelp.toString()})();</script>`;
 const html=app.replace("img-src data: https:; connect-src https:;","img-src 'self' data: https:; connect-src 'self' https:; manifest-src 'self'; worker-src 'self';").replace('</head>',extras+'</head>').replace('</body>',registration+'</body>');
 fs.writeFileSync(path.join(out,'index.html'),html);
 for(const size of [180,192,512])fs.copyFileSync(path.join(root,`web/pwa-assets/icon-${size}.png`),path.join(out,`icon-${size}.png`));
 const manifest={id:'./',name:'Myongji Campus Explorer',short_name:'MJU Explorer',description:'Independent student guide to Myongji Yongin and Seoul campuses. English, Korean and Simplified Chinese, reference maps and sourced offline answers.',lang:'en',start_url:'./',scope:'./',display:'standalone',orientation:'any',background_color:'#ffffff',theme_color:'#002e66',categories:['education','navigation'],prefer_related_applications:false,icons:[192,512].map(size=>({src:`./icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}))};
 fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
 const assetDigests=Object.fromEntries(assetNames.map(name=>[name,digest(fs.readFileSync(path.join(out,name)))]));
 const {worker,shellHash}=createWorker({version,assetDigests});
 fs.writeFileSync(path.join(out,'service-worker.js'),worker);
 fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({version,appHash,shellHash,builtAt:new Date().toISOString(),native:false},null,2)+'\n');
 fs.writeFileSync(path.join(out,'_headers'),'/service-worker.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
 fs.writeFileSync(path.join(out,'.nojekyll'),'');
 return {version,appHash,shellHash};
}
if(require.main===module){const result=build();console.log(`Built installable PWA ${result.version} (${result.appHash}, shell ${result.shellHash}) in pwa/. Publish that directory over HTTPS.`);}
module.exports={build,createWorker,digest,assetNames};
