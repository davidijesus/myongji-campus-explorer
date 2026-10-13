'use strict';
// Run against preview.html or MCE_PAGE extracted from the exact APK under review.
// Only an injected synthetic geolocation provider is used. This test never grants
// browser/OS geolocation permission, invokes a real provider, or reads device GPS.
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const out=process.env.MCE_TEST_OUTPUT||path.join(root,'test-results/location-3d-browser');
fs.mkdirSync(out,{recursive:true});
const sourcePage=path.resolve(process.env.MCE_PAGE||path.join(root,'preview.html'));
const html=fs.readFileSync(sourcePage);
const activity=fs.readFileSync(path.join(root,'android-standalone/src/dev/student/myongjiexplorer/standalone/MainActivity.java'),'utf8');
const csp=activity.match(/headers\.put\("Content-Security-Policy", "([^"]+)"\)/)?.[1];
assert.ok(csp,'packaged Android CSP is available');
const origin='https://appassets.androidplatform.net/assets/index.html';
const checks=[],errors=[],requests=[],screenshots=[];
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
const fixtures={
 seoul:{lat:37.5801,lon:126.9233},
 yongin:{lat:37.2222,lon:127.1867},
};
// Published university-directory markers, injected as synthetic readings. The
// Yongin plan registration is approximate: no equality to a building is implied.
const landmarks={
 seoul:{id:'mju-s9',code:'S9',lat:37.580750,lon:126.924498},
 yongin:{id:'mju-y3',code:'Y3',lat:37.222100,lon:127.188545},
};
let browser,context,page,failure=null;
async function settle(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
const state=()=>page.evaluate(()=>MCE.getState());
const diag=()=>page.evaluate(()=>MCE.diagnostics());
const active=()=>page.evaluate(()=>__geo.active());
async function screenshot(name){await page.evaluate(()=>document.querySelector('#workspace').scrollTop=0);await settle();await page.screenshot({path:path.join(out,name)});screenshots.push(name);}
async function start(){
 await page.locator('[data-action="my-location"]').click();await settle();
 const ids=await active();assert.equal(ids.length,1,'exactly one synthetic foreground watch');return ids[0];
}
async function fix(id,campus,extra={}){
 await page.evaluate(({id,coordinates,extra})=>{const fix={...coordinates,accuracyM:18,timestamp:Date.now(),...extra};window.__lastSyntheticFix=fix;__geo.fix(id,fix);},{id,coordinates:fixtures[campus],extra});
 await settle();
}
async function noDot(name){
 await settle();
 check(name,await page.locator('[data-location-dot]:visible').count()===0&&!(await state()).locationVisible&&!(await diag()).locationVisible);
}
async function assertPixels(name){
 const pixels=await page.locator('#campus-canvas').evaluate(canvas=>{
  let data,gl=canvas.getContext('webgl');
  if(gl){data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);}
  else data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let filled=0;const colors=new Set();for(let i=0;i<data.length;i+=4)if(data[i+3]){filled++;colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);}
  return{filled,total:data.length/4,colors:colors.size,width:canvas.clientWidth,height:canvas.clientHeight};
 });
 check(name,pixels.width>0&&pixels.height>0&&pixels.filled/pixels.total>.08&&pixels.colors>10);
}
async function openPage(unavailable=false,software=false){
 context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',route=>{
  if(route.request().url()===origin)return route.fulfill({status:200,contentType:'text/html;charset=utf-8',headers:{'Content-Security-Policy':csp},body:html});
  requests.push(route.request().url());return route.abort();
 });
 await context.setOffline(true);
 await context.addInitScript(({unavailable,software})=>{
  if(software){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'||kind==='webgl2'?null:original.call(this,kind,...args);};}
  let next=1;const watches=new Map(),cleared=[],options=[];
  window.__geo={
   active:()=>[...watches].filter(([,w])=>w.active).map(([id])=>id),
   cleared:()=>[...cleared],options:()=>options.map(v=>({...v})),
   fix:(id,fix)=>{const w=watches.get(id);if(!w)throw Error('Unknown synthetic watch');w.success({coords:{latitude:fix.lat,longitude:fix.lon,accuracy:fix.accuracyM,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:fix.timestamp});},
   error:(id,code)=>{const w=watches.get(id);if(!w)throw Error('Unknown synthetic watch');w.error({code,message:'Synthetic test error'});},
  };
  const provider={
   watchPosition(success,error,settings){const id=next++;watches.set(id,{success,error,active:true});options.push({...settings});return id;},
   clearWatch(id){cleared.push(id);if(watches.has(id))watches.get(id).active=false;},
   getCurrentPosition(){throw Error('Real geolocation is never used in this test');},
  };
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:unavailable?undefined:provider});
 },{unavailable,software});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await settle();
 // Test-only instrumentation captures the real scene through its public mutator.
 // No production diagnostic exposes geographic coordinates or a last-known fix.
 await page.evaluate(()=>{
  const proto=mceRequire('scene').CampusScene.prototype,original=proto.setLocation;
  if(typeof original!=='function')throw Error('This bundle does not implement 3D location');
  proto.setLocation=function(...args){window.__testScene=this;return original.apply(this,args);};
 });
}
async function geometrySnapshot(){
 return page.evaluate(()=>{
  const scene=window.__testScene,assessment=mceRequire('model-location').assessModelLocation(MCE.getState().campusId,window.__lastSyntheticFix);
  if(!scene||assessment.status!=='ok')return{ready:false,status:assessment.status};
  const point=assessment.point,ground=scene.locationGroundPoint(point.x,point.z),expected=scene.project(ground);
  const anchor=document.querySelector('[data-location-anchor]'),ring=document.querySelector('[data-location-accuracy]'),badge=document.querySelector('[data-location-dot]'),overlay=document.querySelector('[data-scene-location]');
  if(!anchor||!ring||!badge||!overlay)return{ready:false,status:'missing overlay'};
  const actual={x:Number(anchor.getAttribute('cx')),y:Number(anchor.getAttribute('cy'))};
  const bounds=ring.getBBox(),d=ring.getAttribute('d'),length=ring.getTotalLength();
  // Probe cardinal points from the calibrated metre radius against the rendered
  // SVG path. Using scene.project tests the actual camera, not a second map view.
  const radius=assessment.radiusWorld;
  const probes=[[point.x+radius,point.z],[point.x,point.z+radius],[point.x-radius,point.z],[point.x,point.z-radius]].map(([x,z])=>scene.project(scene.locationGroundPoint(x,z)));
  const sampled=Array.from({length:1025},(_,i)=>{const p=ring.getPointAtLength(length*i/1024);return{x:p.x,y:p.y};});
  const cardinalError=Math.max(...probes.map(p=>Math.min(...sampled.map(q=>Math.hypot(p.x-q.x,p.y-q.y)))));
  const canvas=document.querySelector('#campus-canvas'),canvasRect=canvas.getBoundingClientRect();
  const anchorObscured=[...document.querySelectorAll('[data-map-overlay]')].filter(el=>el.getClientRects().length).some(el=>{const r=el.getBoundingClientRect();const x=actual.x+canvasRect.left,y=actual.y+canvasRect.top-18;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
  const expectedOrigin=MCE.getState().campusId==='seoul'?{x:0,z:0}:{x:1.6811398657,z:3.9052045803};
  return{ready:true,actual,expected,anchorError:Math.hypot(actual.x-expected.x,actual.y-expected.y),cardinalError,
   bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},d,
   validPath:typeof d==='string'&&d.length>40&&!/NaN|Infinity/.test(d),
   radiusWorld:radius,accuracyM:assessment.accuracyM,modelUncertaintyM:assessment.modelUncertaintyM,uncertaintyM:assessment.uncertaintyM,
   canvasWidth:canvas.clientWidth,canvasHeight:canvas.clientHeight,
   overlayWidth:overlay.getBoundingClientRect().width,overlayHeight:overlay.getBoundingClientRect().height,anchorObscured,
   calibrationOriginError:Math.hypot(point.x-expectedOrigin.x,point.z-expectedOrigin.z),
  };
 });
}
async function assertProjected(name,verifyOrigin=true){
 await settle();const s=await geometrySnapshot();check(`${name}: calibrated fix has a projected marker`,s.ready);
 check(`${name}: marker anchor follows the scene camera`,s.anchorError<.75);
 if(verifyOrigin)check(`${name}: synthetic origin matches the independently recorded model calibration`,s.calibrationOriginError<.02);
 check(`${name}: uncertainty ring uses calibrated ground projection`,s.validPath&&s.cardinalError<2&&s.bounds.width>0&&s.bounds.height>0);
 check(`${name}: uncertainty radius preserves the metre scale`,Math.abs(s.radiusWorld-s.uncertaintyM*.46)<1e-6);
 check(`${name}: overlay occupies the existing canvas viewport`,Math.abs(s.overlayWidth-s.canvasWidth)<2&&Math.abs(s.overlayHeight-s.canvasHeight)<2);
 const d=await diag();check(`${name}: device and model uncertainty remain distinct`,d.accuracyM===18&&d.modelUncertaintyM>0&&d.uncertaintyM>=d.accuracyM&&d.locationStatus==='ok'&&d.locationVisible);
 return s;
}
async function privacy(name){
 const saved=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage},state:MCE.getState()}));
 check(name,!/("lat"|"lon"|latitude|longitude|accuracyM|timestamp)/.test(JSON.stringify(saved))&&saved.state.locationStored===false);
 const d=await diag();check(`${name}: diagnostics do not expose raw coordinates`,!/("lat"|"lon"|latitude|longitude|"fix"|"point"|"world")/.test(JSON.stringify(d)));
}
async function moveAnchorToViewport(xRatio,y){
 // Test-only camera pan puts the synthetic marker at an exact pixel boundary.
 // Finite differences use the real camera's public projection. Ordinary pointer
 // panning is separately tested above; this targeted setup avoids flaky drags.
 await page.evaluate(async({xRatio,y})=>{
  const scene=window.__testScene,a=mceRequire('model-location').assessModelLocation(MCE.getState().campusId,window.__lastSyntheticFix);
  const p=scene.locationGroundPoint(a.point.x,a.point.z),desiredX=document.querySelector('#campus-canvas').clientWidth*xRatio;
  const frame=()=>new Promise(resolve=>{scene.request();requestAnimationFrame(()=>requestAnimationFrame(resolve));});
  for(let i=0;i<6;i++){
   const q=scene.project(p),deltaX=desiredX-q.x,deltaY=y-q.y;if(Math.hypot(deltaX,deltaY)<.2)break;
   const base=[...scene.target];scene.target=[base[0]+1,base[1],base[2]];await frame();const qx=scene.project(p);
   scene.target=[base[0],base[1],base[2]+1];await frame();const qz=scene.project(p);
   const a=qx.x-q.x,b=qz.x-q.x,c=qx.y-q.y,d=qz.y-q.y,det=a*d-b*c;
   if(Math.abs(det)<1e-8)throw Error('Camera cannot be panned to the edge');
   scene.target=[base[0]+(deltaX*d-b*deltaY)/det,base[1],base[2]+(a*deltaY-deltaX*c)/det];await frame();
  }
 },{xRatio,y});await settle();
}
(async()=>{
 const launch={headless:true};
 const installed=process.env.CHROMIUM_EXECUTABLE||['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync);
 if(installed)launch.executablePath=installed;
 browser=await chromium.launch(launch);await openPage();
 check('First launch never starts location automatically',(await active()).length===0);
 await noDot('Unknown location never fabricates a blue point');
 check('The product has one illustrated campus canvas and no separate geographic-map canvas',await page.locator('#campus-canvas').count()===1&&await page.locator('#geographic-map,button[data-map-mode]').count()===0&&(await state()).mapMode==='illustrated');
 for(const campus of ['seoul','yongin']){
  await page.locator('#campus-select').selectOption(campus);
  for(const language of ['en','ko','zh']){
   await page.locator('#language-select').selectOption(language);await settle();
   const expected=campus==='seoul'?11:50,d=await diag();
   check(`${campus}/${language}: actual campus models remain rendered`,d.referenceFeatureCount===expected&&d.vertices>10000);
   check(`${campus}/${language}: localized location control`,await page.locator('#location-start').innerText()===({en:'My location',ko:'내 위치',zh:'我的位置'})[language]);
   await page.locator('#campus-canvas').evaluate(el=>el.dataset.testIdentity='same-map');
   const id=await start();await noDot(`${campus}/${language}: requesting has no guessed dot`);await fix(id,campus);
   check(`${campus}/${language}: My location stays in the existing 3D canvas`,(await state()).mapMode==='illustrated'&&!(await state()).twoD&&await page.locator('#campus-canvas').getAttribute('data-test-identity')==='same-map');
   check(`${campus}/${language}: successful foreground fix is visible`,(await state()).locationPhase==='active'&&(await state()).locationVisible&&await page.locator('[data-location-dot]:visible').count()===1);
   await assertProjected(`${campus}/${language}`);
   check(`${campus}/${language}: foreground provider options`,await page.evaluate(()=>__geo.options().every(o=>o.enableHighAccuracy===true&&o.maximumAge===0&&o.timeout===15000)));
   await privacy(`${campus}/${language}: raw coordinates are absent from saved state`);
   if(language==='en'){
    await screenshot(`${campus}-3d-location-en.png`);
    const landmark=landmarks[campus];await fix(id,campus,{lat:landmark.lat,lon:landmark.lon});await page.locator('[data-action="location-center"]').click();
    await assertProjected(`${campus}/${landmark.code}: known public landmark`,false);
    const alignment=await page.evaluate(({campus,landmark})=>{
     const source=campus==='seoul'?mceRequire('seoul').SEOUL_REFERENCE_CAMPUS:mceRequire('campus').REFERENCE_CAMPUS;
     const feature=source.features.find(f=>f.id===landmark.id),a=mceRequire('model-location').assessModelLocation(campus,window.__lastSyntheticFix);
     return{publicMarkerMatches:feature?.marker?.lat===landmark.lat&&feature?.marker?.lon===landmark.lon,
      distanceM:Math.hypot(a.point.x-feature.center[0],a.point.z-feature.center[1])/.46,allowanceM:a.modelUncertaintyM};
    },{campus,landmark});
    check(`${campus}/${landmark.code}: test coordinates match the known official directory marker`,alignment.publicMarkerMatches);
    check(`${campus}/${landmark.code}: projected point is within the disclosed model allowance of its model`,Number.isFinite(alignment.distanceM)&&alignment.distanceM<=alignment.allowanceM);
    await assertPixels(`${campus}/${landmark.code}: campus geometry remains visible behind the location`);
    await screenshot(`${campus}-3d-known-${landmark.code.toLowerCase()}-en.png`);
   }
   await page.locator('[data-action="location-stop"]').click();check(`${campus}/${language}: Stop clears watch`,(await active()).length===0);await noDot(`${campus}/${language}: Stop removes location`);
  }
 }
 await page.locator('#campus-select').selectOption('seoul');await page.locator('#language-select').selectOption('en');
 let id=await start();await fix(id,'seoul');
 let before=await assertProjected('Initial camera');
 await page.locator('[data-action="zoom-in"]').click();const zoomed=await assertProjected('Zoomed camera');
 check('Zoom scales the uncertainty ring in the same camera',zoomed.bounds.width>before.bounds.width&&zoomed.bounds.height>before.bounds.height);
 await page.locator('[data-action="rotate"]').click();const rotated=await assertProjected('Rotated camera');
 check('Rotation reprojects the ground ring',rotated.d!==zoomed.d);
 await page.locator('#campus-canvas').scrollIntoViewIfNeeded();const box=await page.locator('#campus-canvas').boundingBox();
 await page.mouse.move(box.x+box.width*.40,box.y+box.height*.48);await page.mouse.down();await page.mouse.move(box.x+box.width*.40+45,box.y+box.height*.48+25,{steps:5});await page.mouse.up();
 const panned=await assertProjected('Panned camera');check('Pointer drag moves the marker with the model',Math.hypot(panned.actual.x-rotated.actual.x,panned.actual.y-rotated.actual.y)>5);
 await page.locator('[data-action="location-center"]').click();const centered=await assertProjected('Recentered camera');
 check('Recenter returns the marker to the unobscured map area',!centered.anchorObscured&&centered.actual.x>12&&centered.actual.x<centered.canvasWidth-12&&centered.actual.y>30&&centered.actual.y<centered.canvasHeight-12);
 await page.locator('[data-action="view"]').click();check('2D toggle keeps the same foreground watch',(await active()).length===1&&(await state()).twoD);await assertProjected('Top-down camera');
 await page.locator('[data-action="view"]').click();await assertProjected('Returned 3D camera');
 await page.locator('[data-action="reset"]').click();await assertProjected('Reset campus camera');
 await moveAnchorToViewport(.65,2);
 const edge=await page.evaluate(()=>{
  const a=document.querySelector('[data-location-anchor]'),b=document.querySelector('[data-location-dot]'),t=document.querySelector('[data-location-tether]');
  const canvas=document.querySelector('#campus-canvas');
  return{anchorY:Number(a?.getAttribute('cy')),x:Number(b?.getAttribute('cx')),y:Number(b?.getAttribute('cy')),r:Number(b?.getAttribute('r')),
   width:canvas.clientWidth,height:canvas.clientHeight,
   tetherAnchorError:Math.hypot(Number(t?.getAttribute('x1'))-Number(a?.getAttribute('cx')),Number(t?.getAttribute('y1'))-Number(a?.getAttribute('cy'))),
   tetherBadgeError:Math.hypot(Number(t?.getAttribute('x2'))-Number(b?.getAttribute('cx')),Number(t?.getAttribute('y2'))-Number(b?.getAttribute('cy')))};
 });
 check('Top-edge setup puts the actual ground anchor at y=2',Math.abs(edge.anchorY-2)<.3);
 check('Top-edge badge stays fully inside the viewport',edge.x-edge.r>=0&&edge.x+edge.r<=edge.width&&edge.y-edge.r>=0&&edge.y+edge.r<=edge.height);
 check('Clamped badge tether preserves the actual ground location',edge.tetherAnchorError<.01&&edge.tetherBadgeError<.01);
 check('An unobscured edge badge is diagnosed as visible',(await diag()).locationVisible);
 await screenshot('seoul-3d-top-edge.png');
 await moveAnchorToViewport(.65,-20);
 check('Panning the true location off-screen hides the badge instead of fabricating an edge position',!(await diag()).locationVisible&&await page.locator('[data-location-dot]:visible').count()===0);
 await page.locator('[data-action="location-center"]').click();await assertProjected('Recenter after off-screen pan');
 await page.evaluate(()=>window.__testScene.setLocation(null));await settle();check('Scene null fix clears its marker',!(await diag()).locationVisible&&await page.locator('[data-location-dot]:visible').count()===0);
 await fix(id,'seoul');await assertProjected('Fresh fix after scene clear');await page.locator('[data-action="location-stop"]').click();
 for(const [code,phase] of [[1,'denied'],[2,'unavailable'],[3,'timeout']]){
  id=await start();await page.evaluate(({id,code})=>__geo.error(id,code),{id,code});
  check(`${phase} state is explicit`,await page.locator('#location-panel').getAttribute('data-state')===phase&&(await active()).length===0);await noDot(`${phase} does not retain a dot`);
  await fix(id,'seoul');await noDot(`${phase}: delayed success cannot resurrect stopped watch`);
 }
 for(const [name,extra,phase] of [['stale',{timestamp:Date.now()-120000},'stale'],['invalid coordinate',{lat:NaN},'unavailable'],['invalid uncertainty',{accuracyM:0},'unavailable']]){
  id=await start();await fix(id,'seoul',extra);check(`${name} is rejected`,await page.locator('#location-panel').getAttribute('data-state')===phase&&(await active()).length===0);await noDot(`${name} has no false point`);
 }
 id=await start();await fix(id,'yongin');check('Other-campus fix reports outside model coverage',await page.locator('#location-panel').getAttribute('data-state')==='outside'&&(await diag()).locationStatus==='outside');await noDot('Outside coverage never clamps a false point to the model');await page.locator('[data-action="location-stop"]').click();
 const stops=[
  ['tab',()=>page.locator('.nav-tab[data-tab="food"]').click(),()=>page.locator('.nav-tab[data-tab="explore"]').click()],
  ['campus',()=>page.locator('#campus-select').selectOption('yongin'),()=>page.locator('#campus-select').selectOption('seoul')],
  ['language',()=>page.locator('#language-select').selectOption('ko'),()=>page.locator('#language-select').selectOption('en')],
  ['native pause',()=>page.evaluate(()=>MCE.receive({type:'lifecycle',active:false})),()=>page.evaluate(()=>MCE.receive({type:'lifecycle',active:true}))],
  ['document hidden',()=>page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}),()=>page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));})],
  ['pagehide',()=>page.evaluate(()=>window.dispatchEvent(new Event('pagehide'))),async()=>{}],
 ];
 for(const [name,leave,returnTo] of stops){
  id=await start();await fix(id,'seoul');await leave();
  check(`${name}: clearWatch stops foreground updates`,(await active()).length===0&&await page.evaluate(id=>__geo.cleared().includes(id),id));await fix(id,'seoul');await noDot(`${name}: delayed callback is ignored`);
  await returnTo();check(`${name}: return does not silently restart location`,(await active()).length===0);
 }
 // Android permission-dialog messages below are synthetic lifecycle inputs. They
 // do not grant any real OS/browser permission or communicate with Android.
 id=await start();
 await page.evaluate(()=>{MCE.receive({type:'location-permission',pending:true});MCE.receive({type:'lifecycle',active:false});});
 check('Permission-dialog pause clears the original watch',(await active()).length===0);
 await page.evaluate(()=>{MCE.receive({type:'location-permission',pending:false,granted:true});document.dispatchEvent(new Event('visibilitychange'));});
 check('Synthetic grant cannot restart while native Activity remains paused',(await active()).length===0);
 await fix(id,'seoul');await noDot('Delayed pre-permission fix is ignored');
 await page.evaluate(()=>MCE.receive({type:'lifecycle',active:true}));const resumed=await active();
 check('Foreground resume continues only the granted explicit intent',resumed.length===1&&resumed[0]!==id);
 await fix(resumed[0],'seoul');await assertProjected('Resumed synthetic permission request');await page.locator('[data-action="location-stop"]').click();
 id=await start();
 await page.evaluate(()=>{
  MCE.receive({type:'location-permission',pending:true});Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  MCE.receive({type:'lifecycle',active:false});MCE.receive({type:'lifecycle',active:true});MCE.receive({type:'location-permission',pending:false,granted:true});
 });
 check('Permission grant waits while the document remains hidden',(await active()).length===0);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 check('Later visibility completes the same granted foreground intent',(await active()).length===1);
 await page.locator('[data-action="location-stop"]').click();
 id=await start();
 await page.evaluate(()=>{
  MCE.receive({type:'location-permission',pending:true});Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
  MCE.receive({type:'lifecycle',active:false});MCE.receive({type:'lifecycle',active:true});MCE.receive({type:'location-permission',pending:false,granted:true});
 });
 check('A granted hidden-page continuation still has zero watches',(await active()).length===0);
 await page.evaluate(()=>{MCE.receive({type:'location-permission',pending:false,granted:false,cancelled:true});delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));MCE.receive({type:'lifecycle',active:true});});
 check('Native onStop cancellation wins over a grant awaiting visibility',(await active()).length===0);
 await fix(id,'seoul');await noDot('Native-cancelled hidden-page grant ignores delayed position');
 check('Delayed position cannot recreate a native-cancelled watch',(await active()).length===0);
 id=await start();
 await page.evaluate(()=>{MCE.receive({type:'location-permission',pending:true});MCE.receive({type:'lifecycle',active:false});MCE.receive({type:'lifecycle',active:true});});
 await page.locator('[data-action="location-stop"]').click();await page.evaluate(()=>MCE.receive({type:'location-permission',pending:false,granted:true}));
 check('Manual Stop during a permission prompt cancels continuation',(await active()).length===0);
 await fix(id,'seoul');await noDot('Manually cancelled permission callback stays ignored');
 id=await start();
 await page.evaluate(()=>{MCE.receive({type:'location-permission',pending:true});MCE.receive({type:'lifecycle',active:false});window.dispatchEvent(new Event('pagehide'));MCE.receive({type:'location-permission',pending:false,granted:true});MCE.receive({type:'lifecycle',active:true});});
 check('Leaving during a permission prompt cancels later continuation',(await active()).length===0);
 await fix(id,'seoul');await noDot('Cancelled permission callback cannot reveal a dot');
 await page.locator('.nav-tab[data-tab="food"]').click();await page.locator('#campus-select').selectOption('yongin');await page.locator('.nav-tab[data-tab="chat"]').click();await page.locator('#campus-select').selectOption('seoul');
 check('Choosing Seoul from another tab opens Explore',(await state()).tab==='explore');await settle();await assertPixels('Seoul 3D contains actual geometry after campus switch');await screenshot('seoul-3d-return-en.png');
 await page.locator('.place-card[data-place="mju-s9"]').click();await page.evaluate(()=>document.querySelector('#workspace').scrollTop=0);await settle();await assertPixels('Seoul 3D remains drawn after selecting a building');
 await page.reload();await settle();
 // The page reload deliberately replaces the test instrumentation as well as the
 // document. A new wrapper is only needed when injecting a new synthetic fix.
 await page.evaluate(()=>{const p=mceRequire('scene').CampusScene.prototype,original=p.setLocation;p.setLocation=function(...args){window.__testScene=this;return original.apply(this,args);};});
 check('Reload restores Seoul without restarting GPS',(await state()).campusId==='seoul'&&(await active()).length===0);await noDot('Reload never restores the previous position');await assertPixels('Seoul 3D renders after reload');
 await page.locator('#language-select').selectOption('zh');await settle();id=await start();await fix(id,'seoul');await assertProjected('Reopened Seoul in Chinese');await screenshot('seoul-3d-reopened-zh.png');
 await page.setViewportSize({width:320,height:568});await page.evaluate(()=>MCE.receive({type:'font-scale',scale:2}));await settle();
 check('Small screen and large text keep the campus canvas without horizontal overflow',await page.locator('#campus-canvas').isVisible()&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#location-start').scrollIntoViewIfNeeded();check('Location controls remain reachable with large text',await page.locator('#location-start').isVisible());
 await settle();await page.screenshot({path:path.join(out,'seoul-3d-small-large-text-controls-zh.png')});screenshots.push('seoul-3d-small-large-text-controls-zh.png');await screenshot('seoul-3d-small-large-text-zh.png');
 await privacy('Last synthetic fix is not stored after resize');await page.locator('[data-action="location-stop"]').click();await noDot('Stop still clears marker after small-screen reflow');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>MCE.receive({type:'font-scale',scale:1}));
 id=await start();await fix(id,'seoul');
 await page.evaluate(()=>document.querySelector('#campus-canvas').dispatchEvent(new CustomEvent('scenefailed',{bubbles:true})));
 await settle();check('Renderer failure stops the foreground watch',(await active()).length===0&&(await state()).sceneFailed);await noDot('Renderer failure clears the 3D marker');
 await fix(id,'seoul');await noDot('Renderer failure rejects late provider success');
 check('Renderer failure retains the offline searchable directory',await page.locator('.place-card').count()===11&&await page.locator('#map-failure').isVisible());
 await page.locator('[data-action="retry-map"]').click();await settle();check('Retry restores the scene without restarting GPS',!(await state()).sceneFailed&&(await active()).length===0);await assertPixels('Renderer retry restores real campus geometry');
 await context.close();await openPage(true);await page.locator('[data-action="my-location"]').click();
 check('Absent geolocation provider shows unavailable',await page.locator('#location-panel').getAttribute('data-state')==='unavailable');await noDot('Absent provider never fabricates a position');await assertPixels('Map remains usable without a location provider');
 await context.close();await openPage(false,true);
 for(const campus of ['seoul','yongin']){
  await page.locator('#campus-select').selectOption(campus);await settle();check(`${campus}: actual Canvas2D renderer fallback is active`,(await diag()).renderer.includes('fallback'));
  id=await start();await fix(id,campus);await assertProjected(`${campus} Canvas2D fallback`);await assertPixels(`${campus} software renderer actually draws campus geometry`);
  await screenshot(`${campus}-software-3d-location-en.png`);await page.locator('[data-action="rotate"]').click();await assertProjected(`${campus} software renderer after rotation`);
  await page.locator('[data-action="location-stop"]').click();check(`${campus} software fallback stops the watcher`,(await active()).length===0);await noDot(`${campus} software fallback clears the location overlay`);
 }
 check('No embedded network dependency or coordinate request',requests.length===0);check('No unhandled script failures',errors.length===0);
 console.log(`${checks.length} synthetic 3D-location, lifecycle and campus-rendering checks passed`);
})().catch(error=>{failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}).finally(async()=>{
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({executedAt:new Date().toISOString(),environment:'Desktop Chromium, offline Android asset origin/CSP, synthetic geolocation only; NOT Android GPS/device execution',sourcePage,pageSha256:crypto.createHash('sha256').update(html).digest('hex'),checks,errors,requests,screenshots,failure},null,2));
 await context?.close();await browser?.close();
});
