'use strict';
// Offline application shell only. External sources and API responses are never cached here.
const prefix='myongji-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const cacheName=prefix+'0.5.0-ac300af2c792';
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
