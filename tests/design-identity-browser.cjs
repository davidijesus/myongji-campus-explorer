'use strict';
// Release QA: retained university artwork, new app icon, and readable controls.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build/design-062/identity');
const review=process.env.DESIGN_REVIEW_DIR?path.resolve(process.env.DESIGN_REVIEW_DIR):path.join(out,'review');
const input=process.env.DESIGN_HTML||path.join(root,'preview.html');
const html=fs.readFileSync(input),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const expectedSignature='30532194ba6ab9d0d69f7bc4d107c340419a3833bc852b46f2c27774894d76bc';
const approvedIcons={180:'b0fe3c8db3a5f2d5ba5dccd862ccd63b30b2a8468e0836f98accbfe7e2fe6bff',192:'da11e9309a4721ba1b3ca130c0599b62bd8471a28484ba8fd957562233715f8e',512:'e57e5dce5419227bd39f46f7bca64352558e239bfb17f6f45d14e2e71dc9cf3a'};
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
  const source=fs.readFileSync(path.join(root,`web/pwa-assets/icon-${size}.png`)),pwa=fs.readFileSync(path.join(root,`pwa/icon-${size}.png`)),old=fs.readFileSync(path.join(root,`build/design-062/baseline/pwa/icon-${size}.png`));
  check(`${size}px icon matches approved new campus artwork`,hash(source)===approvedIcons[size]);
  check(`${size}px PWA icon is byte-identical to reviewed source`,pwa.equals(source));
  check(`${size}px icon has matching intrinsic PNG size`,pwa.readUInt32BE(16)===size&&pwa.readUInt32BE(20)===size);
  check(`${size}px old green app icon was replaced`,!pwa.equals(old));
  icons.push({size,sha256:hash(pwa),bytes:pwa.length});
 }
 const signature=fs.readFileSync(path.join(root,'web/assets/identity/myongji-signature.png'));
 check('University signature artwork is unchanged',hash(signature)===expectedSignature);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'pwa/manifest.webmanifest'),'utf8'));
 check('Manifest retains standalone installation and repository-relative scope',manifest.display==='standalone'&&manifest.id==='./'&&manifest.scope==='./'&&manifest.start_url==='./');
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{if(route.request().url()===origin)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});requests.push(route.request().url());return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height] of [[320,700],[390,844],[1440,1000],[1914,814]])for(const scale of [1,2]){
  await page.setViewportSize({width,height});await page.goto(origin);await page.evaluate(scale=>MCE.receive({type:'font-scale',scale}),scale);
  const data=await page.locator('.brand-signature').evaluate(async img=>{await img.decode();const r=img.getBoundingClientRect();return {src:img.src,width:img.naturalWidth,height:img.naturalHeight,ratio:r.width/r.height};});
  check(`${width}px/${scale}x: header uses exact university signature`,hash(Buffer.from(data.src.split(',')[1],'base64'))===expectedSignature);
  check(`${width}px/${scale}x: signature dimensions and aspect ratio are preserved`,data.width===237&&data.height===60&&Math.abs(data.ratio-237/60)<.015);
  check(`${width}px/${scale}x: application caption remains separate`,await page.locator('.brand-caption').innerText()==='Campus Explorer');
 }
 await page.setViewportSize({width:390,height:844});await page.goto(origin);
 await contrastAudit(page,'explore');
 await activate(page,'[data-action="about"]');
 const about=await page.locator('.about-signature img').evaluate(async img=>{await img.decode();return img.src;});
 check('About embeds the same complete university signature',hash(Buffer.from(about.split(',')[1],'base64'))===expectedSignature);
 check('Independent project disclosure remains visible',/independent student project/i.test(await page.locator('#dialog-content').innerText()));
 check('No unresolved image placeholder remains',!html.toString('utf8').includes('__MYONGJI_SIGNATURE_DATA_URI__'));
 await contrastAudit(page,'about');await page.evaluate(()=>MCE.handleBack());
 await activate(page,'[data-action="map-evidence"]');await contrastAudit(page,'map-sources');await page.evaluate(()=>MCE.handleBack());
 await page.evaluate(()=>MCE.receive({type:'select',placeId:'mju-y3'}));await contrastAudit(page,'place-sheet');
 for(const tab of ['food','buses','chat']){await activate(page,`.nav-tab[data-tab="${tab}"]`);await contrastAudit(page,tab);}
 await page.locator('#chat-input').fill('Where can I get coffee?');await activate(page,'#chat-form button');await contrastAudit(page,'chat-answer');
 const launcher=await context.newPage();
 const icon=fs.readFileSync(path.join(root,'pwa/icon-512.png')).toString('base64');
 await launcher.setViewportSize({width:720,height:250});
 await launcher.setContent(`<html><head><style>body{font:14px 'Segoe UI',sans-serif;background:#f3f6fa;color:#173451;margin:0;padding:24px}h1{font-size:18px;margin:0 0 20px}main{display:flex;gap:44px;align-items:end}section{text-align:center}img{display:block;margin:0 auto 10px}.circle{border-radius:50%}</style></head><body><h1>Campus Explorer · launcher icon at actual display sizes</h1><main>${[48,64].map(size=>[false,true].map(circle=>`<section><img class="${circle?'circle':''}" width="${size}" height="${size}" src="data:image/png;base64,${icon}"><span>${size}px · ${circle?'circle':'square'}</span></section>`).join('')).join('')}</main></body></html>`);
 await launcher.evaluate(async()=>Promise.all([...document.images].map(img=>img.decode())));
 await launcher.screenshot({path:path.join(review,'after-launcher-icons-48-64.png')});
 check('Small launcher preview contains four loaded square/circle icons',await launcher.locator('img').evaluateAll(nodes=>nodes.length===4&&nodes.every(img=>img.complete&&img.naturalWidth===512)));
 await context.close();
 check('No browser errors',errors.length===0,errors);check('No external requests',requests.length===0,requests);
 const summary={input,htmlSha256:hash(html),icons,signatureSha256:expectedSignature,checks:checks.length,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,failures:checks.filter(c=>!c.pass),errors,requests};
 for(const [name,value] of Object.entries({'summary.json':summary,'checks.json':checks,'contrast.json':contrast}))fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
 console.log(JSON.stringify(summary));if(summary.failed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
