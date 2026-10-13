'use strict';

// This function is embedded only in the hosted PWA. The APK keeps its native lifecycle.
function installHelp(){
 const copy={
  en:{title:'Install & offline',about:'About, installation, sources and privacy',checking:'Preparing offline access…',ready:'Saved campus information is ready offline.',waiting:'An update is ready. Close all app windows and tabs, then reopen.',error:'Offline preparation did not finish. Reopen this page online to try again.',unsupported:'Offline installation needs a supported browser and a secure HTTPS address.',updateError:'The update could not finish. Your saved version is still available offline.',iphone:'iPhone / iPad',ios:'Open this address in Safari. Open Share, choose Add to Home Screen, turn on Open as Web App if offered, then Add.',android:'Android',chrome:'In Chrome, open the menu and choose Install app or Add to Home screen. Menu wording can vary.',first:'Open the new home-screen icon while online and check this status again before going offline.',limits:'Maps and saved answers work offline. External sources and Naver Maps need internet. Clearing site data can remove saved places and offline access.',updates:'To get a new version, open online, then close all app windows and tabs and reopen.',install:'Install on this device',installed:'Opened as a home-screen app.',separate:'The APK and web app store favorites separately.'},
  ko:{title:'설치 및 오프라인',about:'앱 정보, 설치, 출처 및 개인정보',checking:'오프라인 사용을 준비하는 중…',ready:'저장된 캠퍼스 정보를 오프라인에서 사용할 수 있습니다.',waiting:'업데이트가 준비되었습니다. 앱 창과 탭을 모두 닫은 뒤 다시 여세요.',error:'오프라인 준비를 완료하지 못했습니다. 인터넷에 연결한 뒤 이 페이지를 다시 여세요.',unsupported:'오프라인 설치에는 지원되는 브라우저와 안전한 HTTPS 주소가 필요합니다.',updateError:'업데이트를 완료하지 못했습니다. 저장된 버전은 계속 오프라인에서 사용할 수 있습니다.',iphone:'iPhone / iPad',ios:'Safari에서 이 주소를 여세요. 공유 → 홈 화면에 추가를 선택하고, 표시되면 웹 앱으로 열기를 켠 뒤 추가를 누르세요.',android:'Android',chrome:'Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요. 메뉴 이름은 버전에 따라 다를 수 있습니다.',first:'인터넷에 연결된 상태에서 새 홈 화면 아이콘을 열고, 오프라인으로 전환하기 전에 이 상태를 다시 확인하세요.',limits:'지도와 저장된 답변은 오프라인에서 사용할 수 있습니다. 외부 출처와 네이버 지도에는 인터넷이 필요합니다. 사이트 데이터를 지우면 저장 장소와 오프라인 데이터가 삭제될 수 있습니다.',updates:'새 버전을 받으려면 온라인으로 열고 앱 창과 탭을 모두 닫은 뒤 다시 여세요.',install:'이 기기에 설치',installed:'홈 화면 앱으로 열렸습니다.',separate:'APK와 웹 앱의 즐겨찾기는 별도로 저장됩니다.'},
  zh:{title:'安装与离线使用',about:'关于、安装、来源与隐私',checking:'正在准备离线使用…',ready:'已保存的校园信息可离线使用。',waiting:'更新已准备好。请关闭所有应用窗口和标签页，然后重新打开。',error:'离线准备未完成。请联网重新打开此页面再试。',unsupported:'离线安装需要受支持的浏览器和安全的HTTPS地址。',updateError:'更新未完成。已保存的版本仍可离线使用。',iphone:'iPhone / iPad',ios:'在Safari中打开此地址。打开共享菜单，选择添加到主屏幕；如有“作为网页App打开”选项，请将其开启，然后添加。',android:'Android',chrome:'在Chrome菜单中选择安装应用或添加到主屏幕。菜单名称可能因版本而异。',first:'请联网打开新的主屏幕图标，并在断网前再次检查此状态。',limits:'地图和已保存的回答可离线使用。外部来源和Naver地图需要联网。清除网站数据可能会删除收藏和离线数据。',updates:'如需新版本，请联网打开，然后关闭所有应用窗口和标签页并重新打开。',install:'安装到此设备',installed:'已作为主屏幕应用打开。',separate:'APK与网页应用分别保存收藏。'}
 };
 const words=()=>copy[document.documentElement.lang.startsWith('ko')?'ko':document.documentElement.lang.startsWith('zh')?'zh':'en'];
 let status='checking',registration=null,installPrompt=null,offlineReady=false,updateFailed=false,query=0;
 const installed=()=>navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
 function render(){
  const text=words();
  for(const button of document.querySelectorAll('[data-action="about"]'))button.setAttribute('aria-label',text.about);
  const section=document.getElementById('pwa-install-help');if(!section)return;
  section.dataset.state=status;
  for(const element of section.querySelectorAll('[data-pwa-copy]'))element.textContent=text[element.dataset.pwaCopy];
  const state=section.querySelector('[data-pwa-status]');state.textContent=text[status];
  section.querySelector('[data-pwa-installed]').hidden=!installed();
  section.querySelector('[data-pwa-install]').hidden=!installPrompt||installed();
 }
 async function requestInstall(){
  const prompt=installPrompt;if(!prompt)return;
  installPrompt=null;render();
  try{await prompt.prompt();await prompt.userChoice;}catch{/* Browser menu instructions remain available. */}
 }
 function mount(){
  const content=document.getElementById('dialog-content');if(!content)return;
  if(!document.getElementById('pwa-install-help')){
   const section=document.createElement('section');section.id='pwa-install-help';section.className='pwa-help';
   section.innerHTML='<details><summary data-pwa-copy="title"></summary><p role="status" aria-live="polite" data-pwa-status></p><p data-pwa-installed data-pwa-copy="installed" hidden></p><button type="button" class="primary-button" data-pwa-install data-pwa-copy="install" hidden></button><h3 data-pwa-copy="iphone"></h3><p data-pwa-copy="ios"></p><h3 data-pwa-copy="android"></h3><p data-pwa-copy="chrome"></p><p data-pwa-copy="first"></p><p data-pwa-copy="updates"></p><p data-pwa-copy="limits"></p><p data-pwa-copy="separate"></p></details>';
   const heading=content.querySelector('h2');if(heading)heading.after(section);else content.prepend(section);
   section.querySelector('[data-pwa-install]').addEventListener('click',requestInstall);
  }
  render();void refreshStatus();
 }
 function cacheStatus(worker){
  return new Promise(resolve=>{
   const channel=new MessageChannel();
   const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
   const timer=setTimeout(()=>finish(false),3000);
   channel.port1.onmessage=event=>finish(event.data?.type==='mce-shell-status'&&event.data.ready===true);
   try{worker.postMessage({type:'mce-shell-status'},[channel.port2]);}catch{finish(false);}
  });
 }
 async function refreshStatus(){
  if(!registration)return;
  const ticket=++query,worker=registration.active;
  const complete=worker?await cacheStatus(worker):false;
  if(ticket!==query)return;
  offlineReady=complete;
  status=registration.waiting?'waiting':updateFailed&&complete?'updateError':complete?'ready':registration.installing?'checking':'error';
  render();
 }
 function watch(worker){
  if(!worker)return;
  const changed=()=>{
   if(worker.state==='redundant'){updateFailed=true;status=offlineReady?'updateError':'error';render();void refreshStatus();}
   else if(worker.state==='installed'||worker.state==='activated')void refreshStatus();
  };
  worker.addEventListener('statechange',changed);changed();
 }
 document.addEventListener('click',event=>{if(event.target.closest?.('[data-action="about"]'))mount();});
 new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const app=document.getElementById('app');if(app)new MutationObserver(render).observe(app,{childList:true});
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;render();});
 window.addEventListener('appinstalled',()=>{installPrompt=null;render();});
 window.addEventListener('pageshow',()=>{void refreshStatus();});
 render();
 if(!('serviceWorker' in navigator)||!window.isSecureContext){status='unsupported';render();return;}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{void refreshStatus();});
 const start=async()=>{
  try{
   registration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});
   registration.addEventListener('updatefound',()=>{updateFailed=false;watch(registration.installing);});
   watch(registration.installing);void refreshStatus();
   navigator.serviceWorker.ready.then(()=>refreshStatus()).catch(()=>{});
  }catch{status='error';render();}
 };
 if(document.readyState==='complete')void start();else window.addEventListener('load',start,{once:true});
}

const styles='.pwa-help{margin:16px 0;padding:12px;border:1px solid var(--line);border-radius:12px;min-width:0;overflow-wrap:anywhere}.pwa-help summary{cursor:pointer;min-height:44px;display:list-item;align-content:center;font-weight:650;font-size:calc(13px * var(--font-scale));line-height:1.5}.pwa-help summary:focus-visible{outline:3px solid var(--mju-navy,#002e66);outline-offset:3px}.pwa-help [data-pwa-status]{font-weight:650}.pwa-help button{max-width:100%;white-space:normal;text-align:left;line-height:1.5}';
module.exports={installHelp,styles};
