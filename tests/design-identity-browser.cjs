'use strict';
// Release QA: retained university signature, no header caption, circular app icon.
// DESIGN_APPROVED_ICON_HASHES is JSON mapping 180/192/512 to reviewed SHA-256.
// Optional DESIGN_HTML, DESIGN_PWA_DIR, DESIGN_OUTPUT_DIR, DESIGN_REVIEW_DIR.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.env.DESIGN_OUTPUT_DIR?path.resolve(process.env.DESIGN_OUTPUT_DIR):path.join(root,'build/design-063/identity');
const review=process.env.DESIGN_REVIEW_DIR?path.resolve(process.env.DESIGN_REVIEW_DIR):path.join(out,'review');
const input=process.env.DESIGN_HTML||path.join(root,'preview.html');
const html=fs.readFileSync(input),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const baselineHtml=fs.readFileSync(path.join(root,'build/design-063/baseline/preview.html'),'utf8');
const expectedTitle=baselineHtml.match(/<title>([^<]+)<\/title>/)[1];
const expectedSignature='30532194ba6ab9d0d69f7bc4d107c340419a3833bc852b46f2c27774894d76bc';
const approvedIcons=JSON.parse(process.env.DESIGN_APPROVED_ICON_HASHES||'{}');
if(![180,192,512].every(size=>/^[a-f0-9]{64}$/.test(approvedIcons[size]||'')))throw new Error('Provide the three visually approved icon hashes in DESIGN_APPROVED_ICON_HASHES.');
const pwaRoot=process.env.DESIGN_PWA_DIR?path.resolve(process.env.DESIGN_PWA_DIR):path.join(root,'pwa');
const origin='http://127.0.0.1:4199/',checks=[],errors=[],requests=[],contrast=[];
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(review,{recursive:true});
let browser;
const check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail?{detail}:{})});
const activate=(page,selector)=>page.locator(selector).first().evaluate(n=>n.click());
async function contrastAudit(page,key){
 const rows=await page.evaluate(()=>{
  const parse=s=>{const m=s.match(/[\d.]+/g)?.map(Number)||[0,0,0];return [m[0],m[1],m[2],m.length>3?m[3]:1];};
  const over=(fg,bg)=>fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]));
  const bg=n=>{const chain=[];for(let e=n;e;e=e.parentElement)chain.push(parse(getComputedStyle(e).backgroundColor));let result=chain.reverse().reduce((b,c)=>over(c,b),[255,255,255]);if(n?.matches('.map-label'))result=over(parse(getComputedStyle(n,'::before').backgroundColor),result);return result;};
  const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const rows=[];
  const outlined='input,textarea,select,.search-wrap,.header-about,.dialog-top .icon-button,.dialog-actions>.chip,.sheet-actions>.text-button,.reference-actions>.source-link,.card-actions .chip,.community-actions .text-button,.suggestions button,.answer-places button';
  for(const n of document.querySelectorAll(outlined)){
   if(!n.getClientRects().length||n.disabled)continue;
   const style=getComputedStyle(n),background=bg(n),outside=bg(n.parentElement),stroke=parse(style.borderTopColor);
   if(parseFloat(style.borderTopWidth)>0&&stroke[3]>0&&style.borderTopStyle!=='none'){
    const measured=Math.max(ratio(over(stroke,background),background),ratio(background,outside));
    rows.push({kind:'control-boundary',label:n.id||n.className,ratio:measured,minimum:3,color:style.borderTopColor,background:style.backgroundColor});
   }
  }
  for(const n of document.querySelectorAll('button,input,select,textarea,.selector-control>span,#panel-head p,#dialog-content p,.chat-footer>span')){
   if(!n.getClientRects().length||n.disabled)continue;
   const label=(n.innerText||n.getAttribute('aria-label')||n.id||'').replace(/\s+/g,' ').trim();
   if(!label)continue;
   const style=getComputedStyle(n),background=bg(n),color=over(parse(style.color),background),size=parseFloat(style.fontSize),weight=parseInt(style.fontWeight)||400;
   const minimum=size>=24||(size>=18.66&&weight>=700)?3:4.5;
   rows.push({kind:'text',label:label.slice(0,100),ratio:ratio(color,background),minimum,color:style.color,background:style.backgroundColor});
  }
  return rows;
 });
 contrast.push({key,rows});
 for(const [index,row] of rows.entries())check(`${key}/${row.kind}[${index}]: readable ${row.label}`,row.ratio+0.001>=row.minimum,row.ratio+0.001<row.minimum?row:undefined);
}
(async()=>{
 const icons=[];
 for(const size of [180,192,512]){
  const source=fs.readFileSync(path.join(root,`web/pwa-assets/icon-${size}.png`)),pwa=fs.readFileSync(path.join(pwaRoot,`icon-${size}.png`)),old=fs.readFileSync(path.join(root,`build/design-063/baseline/pwa/icon-${size}.png`));
  check(`${size}px icon matches approved new campus artwork`,hash(source)===approvedIcons[size]);
  check(`${size}px PWA icon is byte-identical to reviewed source`,pwa.equals(source));
  check(`${size}px icon has matching intrinsic PNG size`,pwa.readUInt32BE(16)===size&&pwa.readUInt32BE(20)===size);
  check(`${size}px square blue baseline icon was replaced`,!pwa.equals(old));
  icons.push({size,sha256:hash(pwa),bytes:pwa.length});
 }
 const signature=fs.readFileSync(path.join(root,'web/assets/identity/myongji-signature.png'));
 check('University signature artwork is unchanged',hash(signature)===expectedSignature);
 const manifest=JSON.parse(fs.readFileSync(path.join(pwaRoot,'manifest.webmanifest'),'utf8'));
 check('App keeps its full installation name',manifest.name==='Myongji Campus Explorer');
 check('Manifest retains standalone installation and repository-relative scope',manifest.display==='standalone'&&manifest.id==='./'&&manifest.scope==='./'&&manifest.start_url==='./');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{if(route.request().url()===origin)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});requests.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,700],[390,844],[844,390],[1440,1000],[1914,814]])for(const scale of [1,2]){
  await page.setViewportSize({width,height});await page.goto(origin);await page.evaluate(scale=>MCE.receive({type:'font-scale',scale}),scale);
  const data=await page.locator('.brand-signature').evaluate(async img=>{await img.decode();const r=img.getBoundingClientRect();return {src:img.src,width:img.naturalWidth,height:img.naturalHeight,ratio:r.width/r.height};});
  check(`${width}px/${scale}x: header uses exact university signature`,hash(Buffer.from(data.src.split(',')[1],'base64'))===expectedSignature);
  check(`${width}px/${scale}x: signature dimensions and aspect ratio are preserved`,data.width===237&&data.height===60&&Math.abs(data.ratio-237/60)<.015);
  check(`${width}px/${scale}x: only the header application caption is removed`,await page.locator('.app-header .brand-caption').count()===0&&!/Campus Explorer/.test(await page.locator('.app-header').innerText()));
  check(`${width}px/${scale}x: document retains its baseline application title`,await page.title()===expectedTitle);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(origin);
 await contrastAudit(page,'explore');
 await activate(page,'[data-action="about"]');
 const about=await page.locator('.about-signature img').evaluate(async img=>{await img.decode();return img.src;});
 check('About embeds the same complete university signature',hash(Buffer.from(about.split(',')[1],'base64'))===expectedSignature);
 check('About retains the application name',/Myongji Campus Explorer/.test(await page.locator('#dialog-content').innerText()));
 check('Independent project disclosure remains visible',/independent student project/i.test(await page.locator('#dialog-content').innerText()));
 check('No unresolved image placeholder remains',!html.toString('utf8').includes('__MYONGJI_SIGNATURE_DATA_URI__'));
 await contrastAudit(page,'about');await page.evaluate(()=>MCE.handleBack());
 await activate(page,'[data-action="map-evidence"]');await contrastAudit(page,'map-sources');await page.evaluate(()=>MCE.handleBack());
 await page.evaluate(()=>MCE.receive({type:'select',placeId:'mju-y3'}));await contrastAudit(page,'place-sheet');
 for(const tab of ['food','buses','chat']){await activate(page,`.nav-tab[data-tab="${tab}"]`);await contrastAudit(page,tab);}
 await page.locator('#chat-input').fill('Where can I get coffee?');await activate(page,'#chat-form button');await contrastAudit(page,'chat-answer');
 check('PWA favicon retains the reviewed circular 192px icon',/rel=["']icon["'][^>]*href=["']\.\/icon-192\.png["']/.test(fs.readFileSync(path.join(pwaRoot,'index.html'),'utf8')));
 const launcher=await context.newPage();
 const icon=fs.readFileSync(path.join(pwaRoot,'icon-512.png')).toString('base64');
 for(const size of [180,192,512]){
  const encoded=fs.readFileSync(path.join(pwaRoot,`icon-${size}.png`)).toString('base64');
  const alpha=await launcher.evaluate(async({encoded,size})=>{
   const img=new Image();img.src='data:image/png;base64,'+encoded;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
   const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,size,size).data;
   let transparent=0,opaque=0,outside=0,insideHoles=0,minX=size,minY=size,maxX=-1,maxY=-1;
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const a=pixels[(y*size+x)*4+3],r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
    if(a===0)transparent++;if(a===255)opaque++;
    if(r>1.03&&a>16)outside++;if(r<.75&&a<240)insideHoles++;
    if(a>16){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   }
   const at=(x,y)=>pixels[(y*size+x)*4+3];
   return {size,corners:[at(0,0),at(size-1,0),at(0,size-1),at(size-1,size-1)],center:at(Math.floor(size/2),Math.floor(size/2)),transparentFraction:transparent/(size*size),opaqueFraction:opaque/(size*size),outside,insideHoles,bounds:{minX,maxX,minY,maxY}};
  },{encoded,size});
  check(`${size}px PNG has genuinely transparent corners`,alpha.corners.every(a=>a===0),alpha);
  check(`${size}px circle has an opaque center and continuous interior`,alpha.center===255&&alpha.insideHoles===0,alpha);
  check(`${size}px visible pixels stay inside circular bounds`,alpha.outside===0&&alpha.transparentFraction>=.15&&alpha.transparentFraction<=.4,alpha);
  const bounds=alpha.bounds,w=bounds.maxX-bounds.minX+1,h=bounds.maxY-bounds.minY+1;
  check(`${size}px circle stays centered and proportionate`,Math.abs(w-h)<=size*.04&&w>=size*.8&&Math.abs(bounds.minX-(size-1-bounds.maxX))<=2&&Math.abs(bounds.minY-(size-1-bounds.maxY))<=2,alpha);
  icons.find(item=>item.size===size).alpha=alpha;
 }
 await launcher.setViewportSize({width:900,height:250});
 await launcher.setContent(`<html><head><style>body{font:14px 'Segoe UI',sans-serif;background:#f3f6fa;color:#173451;margin:0;padding:24px}h1{font-size:18px;margin:0 0 20px}main{display:flex;gap:44px;align-items:end}section{text-align:center}img{display:block;margin:0 auto 10px}.circle{border-radius:50%}</style></head><body><h1>Campus Explorer · launcher icon at actual display sizes</h1><main>${[16,32,48,64].map(size=>[false,true].map(circle=>`<section><img class="${circle?'circle':''}" width="${size}" height="${size}" src="data:image/png;base64,${icon}"><span>${size}px · ${circle?'circle':'square'}</span></section>`).join('')).join('')}</main></body></html>`);
 await launcher.evaluate(async()=>Promise.all([...document.images].map(img=>img.decode())));
 await launcher.screenshot({path:path.join(review,'after-favicon-launcher-icons-16-64.png')});
 check('Favicon and launcher preview contains eight loaded square/circle icons',await launcher.locator('img').evaluateAll(nodes=>nodes.length===8&&nodes.every(img=>img.complete&&img.naturalWidth===512)));
 await context.close();
 check('No browser errors',errors.length===0,errors);check('No external requests',requests.length===0,requests);
 const summary={input,htmlSha256:hash(html),icons,signatureSha256:expectedSignature,checks:checks.length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,failures:checks.filter(c=>!c.pass),errors,requests};
 for(const [name,value] of Object.entries({'summary.json':summary,'checks.json':checks,'contrast.json':contrast}))fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
 console.log(JSON.stringify(summary));if(summary.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
