#!/usr/bin/env node
'use strict';
const fs=require('node:fs/promises');
const {validateDataset}=require('../build/core/core.js');
const {parseInput}=require('../scripts/import-community.cjs');
const {MAX_COMMUNITY_BYTES,reviewedCommunitySnapshot,readCommunitySnapshot}=require('./community.cjs');
async function readCommunityResponse(response){
 let length=0;const chunks=[];
 for await(const chunk of response.body){length+=chunk.length;if(length>MAX_COMMUNITY_BYTES)throw new Error('Community response exceeds byte limit');chunks.push(chunk);}
 return reviewedCommunitySnapshot(parseInput(Buffer.concat(chunks)));
}
async function main(argv=process.argv.slice(2),environment=process.env){
 const [action,file]=argv,base=environment.CONTENT_SERVER_URL||'',token=environment.ADMIN_TOKEN||'';
 if(!['get','publish','community-get','community-publish'].includes(action)||!file||argv.length!==2)throw new Error('Usage: node server/admin.cjs get|publish|community-get|community-publish reviewed.json');
 const community=action.startsWith('community-'),get=action==='get'||action==='community-get';
 const url=new URL(community?'/v1/admin/community/yongin':'/v1/admin/content',base);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('HTTPS is required outside loopback development.');
 if(token.length<32)throw new Error('Set ADMIN_TOKEN in the environment; never in a mobile bundle.');
 let value;
 if(!get){
  if(community)value=await readCommunitySnapshot(file);
  else{value=JSON.parse(await fs.readFile(file,'utf8'));const errors=validateDataset(value,'live');if(errors.length)throw new Error(errors.join('\n'));}
 }
 const headers={Authorization:`Bearer ${token}`};
 const current=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!current.ok)throw new Error(`Read failed: HTTP ${current.status}`);
 if(get){
  const document=community?await readCommunityResponse(current):await current.json();
  const encoded=community?JSON.stringify(document):JSON.stringify(document,null,2)+'\n';
  await fs.writeFile(file,encoded,{mode:0o600,...(community?{flag:'wx'}:{})});
  console.log(community?'Saved reviewed community snapshot to a new file.':'Saved current administrative content.');return;
 }
 const etag=current.headers.get('etag');await current.body?.cancel();
 if(!etag)throw new Error('Administrative response has no ETag; publication canceled.');
 const response=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json','If-Match':etag},body:JSON.stringify(value),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok){if(community)throw new Error(`Community publish failed: HTTP ${response.status}; re-read the snapshot and validate the reviewed file.`);throw new Error(`Publish failed: HTTP ${response.status}; ${await response.text()}`);}
 console.log(await response.text());
}
module.exports={main};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
