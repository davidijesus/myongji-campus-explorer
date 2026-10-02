const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'pwa');
fs.mkdirSync(out,{recursive:true});
const app=fs.readFileSync(path.join(root,'preview.html'),'utf8');
const version=require('../package.json').version,hash=crypto.createHash('sha256').update(app).digest('hex').slice(0,12);
const extras='<link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icon-192.png"><link rel="apple-touch-icon" href="./icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default">';
const registration=`<script>if('serviceWorker' in navigator && window.isSecureContext){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{const t=document.getElementById('toast');if(t){t.textContent='Offline installation could not finish. Reopen this page while online.';t.hidden=false;}}));}</script>`;
const html=app.replace("img-src data: https:; connect-src https:;","img-src 'self' data: https:; connect-src 'self' https:; manifest-src 'self'; worker-src 'self';").replace('</head>',extras+'</head>').replace('</body>',registration+'</body>');
fs.writeFileSync(path.join(out,'index.html'),html);
for(const size of [180,192,512])fs.copyFileSync(path.join(root,`web/pwa-assets/icon-${size}.png`),path.join(out,`icon-${size}.png`));
const manifest={id:'./',name:'Myongji Campus Explorer',short_name:'MJU Explorer',description:'Independent student guide to Myongji Yongin and Seoul campuses. English, Korean and Simplified Chinese, reference maps and sourced offline answers.',lang:'en',start_url:'./',scope:'./',display:'standalone',orientation:'any',background_color:'#ffffff',theme_color:'#164c42',categories:['education','navigation'],prefer_related_applications:false,icons:[192,512].map(size=>({src:`./icon-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}))};
fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
const worker=`'use strict';
// Offline application shell only. External sources and API responses are never cached here.
const prefix='myongji-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const cacheName=prefix+'${version}-${hash}';
const local=name=>new URL(name,self.registration.scope).href;
const assets=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'].map(local);
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(assets))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(prefix)&&name!==cacheName)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  // A metadata, API or unrelated page navigation must never replace the offline HTML shell.
  if(url.pathname!==scope.pathname&&url.pathname!==new URL('index.html',scope).pathname)return;
  event.respondWith((async()=>{try{const response=await fetch(event.request);if(response.ok&&response.headers.get('content-type')?.includes('text/html')){const cache=await caches.open(cacheName);await cache.put(local('./index.html'),response.clone());return response;}}catch{}return (await caches.match(local('./index.html')))||Response.error();})());
 }
 else if(assets.includes(url.href))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
`;
fs.writeFileSync(path.join(out,'service-worker.js'),worker);
fs.writeFileSync(path.join(out,'version.json'),JSON.stringify({version,appHash:hash,builtAt:new Date().toISOString(),native:false},null,2)+'\n');
fs.writeFileSync(path.join(out,'_headers'),'/service-worker.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log(`Built installable PWA ${version} (${hash}) in pwa/. Publish that directory over HTTPS.`);
