#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises');
const {validateDataset}=require('../build/core/core.js');
async function main(){
 const [action,file]=process.argv.slice(2),base=process.env.CONTENT_SERVER_URL||'',token=process.env.ADMIN_TOKEN||'';
 if(!['get','publish'].includes(action)||!file)throw new Error('Usage: node server/admin.cjs get|publish dataset.json');
 const url=new URL('/v1/admin/content',base);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('HTTPS is required outside loopback development.');
 if(token.length<32)throw new Error('Set ADMIN_TOKEN in the environment; never in a mobile bundle.');
 const headers={Authorization:`Bearer ${token}`};
 const current=await fetch(url,{headers,signal:AbortSignal.timeout(10000)});
 if(!current.ok)throw new Error(`Read failed: HTTP ${current.status}`);
 if(action==='get'){await fs.writeFile(file,JSON.stringify(await current.json(),null,2)+'\n',{mode:0o600});console.log('Saved current administrative content.');return;}
 const value=JSON.parse(await fs.readFile(file,'utf8')),errors=validateDataset(value,'live');if(errors.length)throw new Error(errors.join('\n'));
 const response=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json','If-Match':current.headers.get('etag')||''},body:JSON.stringify(value),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error(`Publish failed: HTTP ${response.status}; ${await response.text()}`);
 console.log(await response.text());
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
