'use strict';
/** Single-writer curated content service. No public editing, user accounts or location collection. */
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateDataset}=require('../build/core/core.js');
const {liveSeed}=require('../build/core/data.js');
const MAX_BYTES=2_000_000;
const digest=v=>crypto.createHash('sha256').update(v).digest();
const equalToken=(actual,expected)=>crypto.timingSafeEqual(digest(actual),digest(expected));
function publicView(dataset){
  // Drafts may contain unpublished organizer details; never return them publicly.
  return {...dataset,events:dataset.events.filter(e=>e.state!=='draft')};
}
async function createContentServer(options={}){
  const file=options.file||process.env.CONTENT_FILE||path.resolve(__dirname,'../data/published-campus.json');
  const adminToken=options.adminToken??process.env.ADMIN_TOKEN??'';
  if(adminToken&&adminToken.length<32)throw new Error('ADMIN_TOKEN must contain at least 32 characters.');
  let current;
  try{const raw=await fs.readFile(file,'utf8');if(Buffer.byteLength(raw)>MAX_BYTES)throw new Error('Oversized stored dataset');current=JSON.parse(raw);}
  catch(error){if(error.code==='ENOENT')current=structuredClone(liveSeed);else throw error;}
  const errors=validateDataset(current,'live');if(errors.length)throw new Error('Stored campus dataset invalid: '+errors.join('; '));
  let writeQueue=Promise.resolve();const limits=new Map();
  const tag=()=>`"campus-v${current.version}"`;
  const json=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store',...headers});res.end(body===undefined?'':JSON.stringify(body));};
  const authenticate=req=>!!adminToken&&typeof req.headers.authorization==='string'&&equalToken(req.headers.authorization,`Bearer ${adminToken}`);
  async function readBody(req){
    if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(new Error('Use application/json'),{status:415});
    let length=0;const chunks=[];
    for await(const chunk of req){length+=chunk.length;if(length>MAX_BYTES)throw Object.assign(new Error('Request too large'),{status:413});chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}
  }
  const server=http.createServer(async(req,res)=>{
    try{
      const now=Date.now(),key=req.socket.remoteAddress||'unknown';let limit=limits.get(key);
      if(!limit||now-limit.start>60_000){limit={start:now,count:0};if(limits.size>1000)limits.clear();limits.set(key,limit);}
      if(++limit.count>240)return json(res,429,{error:'Too many requests'},{'Retry-After':'60'});
      const url=new URL(req.url||'/','http://localhost');
      if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,readOnly:!adminToken});
      if(url.pathname==='/v1/content'&&req.method==='OPTIONS'){
        res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'If-None-Match'});return res.end();
      }
      if(url.pathname==='/v1/content'&&['GET','HEAD'].includes(req.method)){
        const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=60','ETag':tag()};
        if(req.headers['if-none-match']===tag())return json(res,304,undefined,headers);
        return json(res,200,req.method==='HEAD'?undefined:publicView(current),headers);
      }
      if(url.pathname!=='/v1/admin/content')return json(res,404,{error:'Not found'});
      // Administration intentionally has no browser CORS workflow. Use the trusted CLI.
      if(req.headers.origin)return json(res,403,{error:'Browser-origin administration is disabled'});
      if(!authenticate(req))return json(res,401,{error:'Authorized administrator required'},{'WWW-Authenticate':'Bearer'});
      if(req.method==='GET')return json(res,200,current,{'ETag':tag()});
      if(req.method!=='PUT')return json(res,405,{error:'Method not allowed'},{'Allow':'GET, PUT'});
      const candidate=await readBody(req);
      const validation=validateDataset(candidate,'live');
      if(validation.length)return json(res,422,{error:'Dataset validation failed',details:validation});
      // A schema flag is not factual verification. Administrators must verify each source before publishing.
      // Serialize compare-and-swap and atomic rename to avoid concurrent lost updates.
      const update=async()=>{
        if(req.headers['if-match']!==tag())return json(res,412,{error:'Version changed. Read current content before retrying.'});
        if(candidate.version!==current.version+1)return json(res,409,{error:'New version must be exactly current version + 1'});
        if(Date.parse(candidate.updatedAt)<Date.parse(current.updatedAt))return json(res,422,{error:'updatedAt cannot move backwards'});
        const encoded=JSON.stringify(candidate,null,2)+'\n';
        await fs.mkdir(path.dirname(file),{recursive:true});
        const temp=file+'.'+crypto.randomUUID()+'.tmp';
        try{await fs.writeFile(temp,encoded,{mode:0o600,flag:'wx'});await fs.rename(temp,file);}catch(error){await fs.unlink(temp).catch(()=>{});throw error;}
        current=candidate;
        options.onAudit?.({action:'publish',version:current.version,at:new Date().toISOString(),sha256:digest(encoded).toString('hex')});
        return json(res,200,{ok:true,version:current.version},{'ETag':tag()});
      };
      writeQueue=writeQueue.then(update,update);await writeQueue;
    }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'Content operation failed'});else res.end();}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  return server;
}
module.exports={createContentServer,publicView};
if(require.main===module){
 createContentServer({onAudit:event=>console.log(JSON.stringify(event))}).then(server=>{
  const port=Number(process.env.PORT||8080);server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Campus content service listening on port ${port}. Put behind HTTPS before mobile use.`));
 }).catch(error=>{console.error(error.message);process.exitCode=1;});
}
