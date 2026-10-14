'use strict';
// Versioned offline shell only. API responses and external sources are never cached here.
// Updates follow the browser lifecycle: close all app windows to activate a waiting release.
const prefix='myongji-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const cacheName=prefix+"0.6.3-"+"ba002ccb77495ad7";
const local=name=>new URL(name,self.registration.scope).href;
const digests=new Map(Object.entries({"index.html":"37a76202da4d3a0b147b39f5f194ec8f7aebed549dbb4bf67d3c0931a5def530","manifest.webmanifest":"ee507caa0ccd83d7129a9f80ec5d28cafeb7b755952f9de57dd1dde580c67f3a","icon-180.png":"172ab08eb2674c9b0940f07ec2e8e2da3b8f9b53efe87f627ee0e5861a3cc7a1","icon-192.png":"40006badd05f9f6621adfebeeef75fcd00929535212af8ae5505f4c937d73197","icon-512.png":"4b869965ce9f2b1f8c41f6edd8ba2706a7cac9bc248b37303d63e813a3260af2"}).map(([name,hash])=>[local(name),hash]));
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
