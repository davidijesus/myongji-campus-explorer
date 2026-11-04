const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.MCE_TEST_OUTPUT || path.join(root, 'build/browser-current'));
const checks = [], errors = [];
let browser, server, diagnostics, fallbackDiagnostics, previewSha256;
const check = (name, value) => { checks.push({ name, passed: Boolean(value) }); assert.ok(value, name); };
(async () => {
  fs.mkdirSync(output, { recursive: true });
  let previewUrl = process.env.PREVIEW_URL;
  if (!previewUrl) {
    previewSha256 = require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'preview.html'))).digest('hex');
    server = http.createServer((req, res) => {
      if (req.url !== '/' && req.url !== '/preview.html') { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      fs.createReadStream(path.join(root, 'preview.html')).pipe(res);
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    previewUrl = `http://127.0.0.1:${server.address().port}`;
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(previewUrl);
  await page.waitForSelector('.map-label');
  check('Initial view uses live directory and has no fictional content', (await page.evaluate(() => MCE.getState())).mode === 'live' && !(await page.locator('body').innerText()).includes('Demo Library'));
  check('Directory includes 50 references including source caveats', await page.locator('.place-card').count() === 50);
  check('Canvas is rendered', (await page.evaluate(() => MCE.diagnostics())).vertices > 10000);
  check('Map controls have at least 44px touch targets', await page.locator('.map-tools button').evaluateAll(nodes => nodes.every(n => { const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44;})));
  await page.locator('[data-action="focus-search"]').click();
  check('Phone map shortcut focuses building search', await page.locator('#search').evaluate(n => n === document.activeElement));
  await page.locator('[data-action="labels"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.map-label')].every(n=>!n.getClientRects().length));
  check('Label switch clears the unselected map', await page.locator('.map-label:visible').count() === 0);
  await page.locator('[data-action="labels"]').click();
  await page.waitForTimeout(100);
  check('Visible labels avoid map overlays', await page.evaluate(() => {
    const visible=n=>n.getClientRects().length>0;
    const labels=[...document.querySelectorAll('.map-label')].filter(visible).map(n=>n.getBoundingClientRect());
    const overlays=[...document.querySelectorAll('[data-map-overlay]')].filter(visible).map(n=>n.getBoundingClientRect());
    return labels.length>0&&labels.every(a=>overlays.every(b=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom));
  }));
  check('Map labels and controls keep readable text contrast', await page.evaluate(() => {
    const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
    const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const label=document.querySelector('.map-label'),control=document.querySelector('[data-action="zoom-in"]');
    return contrast(getComputedStyle(label).color,getComputedStyle(label,'::before').backgroundColor)>=4.5&&contrast(getComputedStyle(control).color,getComputedStyle(control).backgroundColor)>=4.5;
  }));
  await page.locator('[data-action="map-evidence"]').click();
  const reviewedVisualIds = await page.evaluate(() => Object.values(window.mceRequire('visual-references').VISUAL_REFERENCES)
    .filter(ref => ref.imageUrl || ref.sources.some(source => source.reviewed && source.kind !== 'directory'))
    .map(ref => ref.featureId).sort());
  const displayedVisualIds = await page.locator('#dialog-content [data-visual-ref]').evaluateAll(nodes => nodes.map(node => node.dataset.visualRef).sort());
  check('Visual catalogue contains exactly the references with reviewed imagery', reviewedVisualIds.length > 0 && JSON.stringify(displayedVisualIds) === JSON.stringify(reviewedVisualIds));
  const disputedVisual = await page.evaluate(() => window.mceRequire('visual-references').VISUAL_REFERENCES['mju-y32']);
  check('Y32 historical photograph remains unconfirmed and unavailable as an approved image',
    disputedVisual.reviewed === false && disputedVisual.coverage === 'not-visually-confirmed' && disputedVisual.imageUrl === null &&
    disputedVisual.sources.every(source => source.reviewed === false));
  check('Map sources offer no Y32 photograph entry or ambiguous image action',
    await page.locator('#dialog-content [data-visual-ref="mju-y32"]').count() === 0 &&
    await page.locator('[data-url*="20260819153556719_OQOFT8CU.jpg"]').count() === 0);
  const mapEvidenceText = await page.locator('#dialog-content').innerText();
  check('Map evidence links the official directory and historical plan',
    await page.locator('#dialog-content [data-url="https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B"]').count() === 1 &&
    await page.locator('#dialog-content [data-url="https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do"]').count() === 1 && /2021/.test(mapEvidenceText));
  check('Map evidence discloses approximate positions and unverified entrances/routes',
    /Map positions are approximate/.test(mapEvidenceText) && /Entrances and step-free routes are not verified/.test(mapEvidenceText));
  await page.screenshot({ path: path.join(output, 'current-map-sources.png') });
  await page.locator('#dialog-content [data-visual-ref="mju-y31"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'current-map-sources-residences.png') });
  await page.locator('[data-visual-ref="mju-y13"]').click();
  check('Building video reference retains exact reviewed URL and timestamp', /7:22/.test(await page.locator('#dialog-content').innerText()) && await page.locator('#dialog-content [data-url="https://www.youtube.com/watch?v=u-JLFts2Pxc&t=442s"]').count() === 1);
  await page.locator('[data-action="close-dialog"]').click();
  await page.screenshot({ path: path.join(output, 'current-mobile-map.png') });
  await page.locator('#search').fill('Y3');
  await page.locator('.place-card[data-place="mju-y3"]').click();
  check('Search selects actual Myeongjin building', (await page.evaluate(() => MCE.getState())).selected === 'mju-y3');
  check('Building detail dock does not cover canvas', await page.evaluate(() => document.querySelector('#place-sheet').getBoundingClientRect().top >= document.querySelector('#campus-canvas').getBoundingClientRect().bottom - 1));
  await page.locator('[data-action="labels"]').click();
  await page.waitForTimeout(100);
  check('Selected building stays labelled with other labels hidden', await page.locator('.map-label:visible').count() === 1 && await page.locator('.map-label.selected').isVisible());
  await page.locator('[data-action="labels"]').click();
  await page.locator('[data-action="place-detail"]').click();
  const libraryPlace = await page.evaluate(() => window.mceRequire('data').liveSeed.places.find(place => place.id === 'mju-y3'));
  const selectedDetails = await page.locator('#dialog-content').innerText();
  check('Building details show useful library information and the selected building name',
    await page.locator('#dialog-content h2').innerText() === libraryPlace.name.en &&
    /library|reading rooms/i.test(await page.locator('#dialog-content [data-place-description]').innerText()));
  check('Building details retain the official source and schematic navigation limits',
    await page.locator('#dialog-content [data-url="https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B"]').count() === 1 &&
    /Map positions are approximate/.test(selectedDetails) && /Entrances and step-free routes are not verified/.test(selectedDetails) &&
    /Naver Maps opens externally and needs internet/.test(selectedDetails) && /does not verify an entrance/.test(selectedDetails));
  await page.locator('[data-action="close-dialog"]').click();
  await page.locator('[data-action="view"]').click();
  check('2D toggle preserves selected building', (await page.evaluate(() => MCE.getState())).twoD && (await page.evaluate(() => MCE.getState())).selected === 'mju-y3');
  await page.locator('[data-action="view"]').click();
  const beforeZoom = await page.locator('#campus-canvas').screenshot();
  await page.locator('[data-action="zoom-in"]').click();
  await page.waitForTimeout(300);
  check('Zoom changes rendered scene', !beforeZoom.equals(await page.locator('#campus-canvas').screenshot()));
  const beforeRotation = await page.locator('#campus-canvas').screenshot();
  await page.locator('[data-action="rotate"]').click();
  await page.waitForTimeout(200);
  check('Rotation changes rendered scene', !beforeRotation.equals(await page.locator('#campus-canvas').screenshot()));
  await page.locator('[data-action="favorite"]').click();
  await page.reload();
  check('Favorite persists across reload', (await page.evaluate(() => MCE.getState())).favorites.includes('mju-y3'));
  await page.locator('#search').fill('Y32');
  await page.locator('.place-card[data-place="mju-y32"]').click();
  await page.locator('[data-action="place-detail"]').click();
  const disputedResidence = await page.evaluate(() => ({
    place: window.mceRequire('data').liveSeed.places.find(place => place.id === 'mju-y32'),
    photos: window.mceRequire('building-photos').getBuildingPhotos('mju-y32').length
  }));
  check('Unresolved Y32 remains unverified and has no assigned photograph',
    disputedResidence.place.evidence.status === 'unverified' && disputedResidence.photos === 0 &&
    await page.locator('#place-sheet [data-building-gallery], #place-sheet [data-building-photo]').count() === 0);
  check('Y32 details retain the exact official directory source',
    await page.locator('#dialog-content [data-url="https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B"]').count() === 1);
  const residenceConflictChecks = [{ language: 'en', visible: (await page.locator('#dialog-content').innerText()).includes(disputedResidence.place.evidence.note.en) }];
  await page.screenshot({ path: path.join(output, 'current-y32-en.png') });
  await page.locator('[data-action="close-dialog"]').click();
  for (const language of ['ko', 'zh']) {
    await page.locator('#language-select').selectOption(language);
    await page.locator('[data-action="place-detail"]').click();
    residenceConflictChecks.push({ language, visible: (await page.locator('#dialog-content').innerText()).includes(disputedResidence.place.evidence.note[language]) });
    await page.screenshot({ path: path.join(output, `current-y32-${language}.png`) });
    check(`Y32 remains selected without an assigned photograph in ${language}`,
      (await page.evaluate(() => MCE.getState())).selected === 'mju-y32' &&
      await page.locator('#place-sheet [data-building-gallery], #place-sheet [data-building-photo]').count() === 0);
    await page.locator('[data-action="close-dialog"]').click();
  }
  await page.locator('#language-select').selectOption('en');
  await page.locator('.nav-tab[data-tab="food"]').click();
  check('14 official food entries render', await page.locator('.food-card').count() === 14);
  await page.locator('[data-food-kind="cafe"]').click();
  check('Coffee filter returns 4 entries', await page.locator('.food-card').count() === 4);
  check('Food cards retain source/map actions without inventing prices or opening hours', await page.locator('.food-card').evaluateAll(cards => cards.every(card =>
    card.querySelector('[data-source]') && card.querySelector('[data-place]') &&
    !/(?:\u20a9|\bKRW\b|\bwon\b|\bopen now\b|\bclosed now\b|\b\d{1,2}:\d{2}\b)/i.test(card.innerText))));
  await page.screenshot({ path: path.join(output, 'current-mobile-food.png') });
  await page.locator('.food-card [data-place="mju-y12"]').click();
  check('Food shows selected venue building on map', (await page.evaluate(() => MCE.getState())).selected === 'mju-y12' && (await page.evaluate(() => MCE.getState())).tab === 'explore');
  await page.locator('.nav-tab[data-tab="buses"]').click();
  check('Five timetable choices available', await page.locator('#bus-route option').count() === 5);
  check('Station timetable retains all 54 current semester rows', await page.locator('.time-cell').count() === 54);
  check('Bus uncertainty and dated eligibility visible', (await page.locator('#panel-body').innerText()).includes('unconfirmed') && (await page.locator('.schedule-eligibility').innerText()).includes('2026'));
  await page.locator('#bus-route').selectOption('giheung-inbound');
  check('Giheung timetable selection changes departure origin', (await page.locator('.route-stops').innerText()).includes('Giheung'));
  await page.screenshot({ path: path.join(output, 'current-mobile-buses.png') });
  await page.locator('.nav-tab[data-tab="chat"]').click();
  await page.locator('[data-ask="Where can I get coffee?"]').click();
  check('Coffee answer contains source citations and map links', await page.locator('.answer-message .source-link').count() >= 1 && await page.locator('.answer-places [data-place]').count() >= 1);
  await page.locator('#chat-input').fill('Where is classroom Y9228?');
  await page.locator('#chat-form button').click();
  check('Official classroom prefix resolves Hambak without class assignment', /Hambak/.test(await page.locator('.answer-message').last().innerText()) && /does not verify/.test(await page.locator('.answer-message').last().innerText()));
  await page.locator('#chat-input').fill('What room is my economics class in?');
  await page.locator('#chat-form button').click();
  const unknownClass = page.locator('.answer-message').last();
  check('Unknown class asks for a timetable code without assigning a location',
    /full classroom code/.test(await unknownClass.innerText()) && /does not identify your classroom/.test(await unknownClass.innerText()) &&
    await unknownClass.locator('[data-place]').count() === 0);
  await page.locator('#chat-input').fill('Is the cafe open now and what is the price?');
  await page.locator('#chat-form button').click();
  check('Unknown hours/prices are refused', /not verified/.test(await page.locator('.answer-message').last().innerText()));
  await page.locator('#chat-input').fill('<img src=x onerror=alert(1)>');
  await page.locator('#chat-form button').click();
  check('Chat user input is escaped', await page.locator('.user-message img').count() === 0);
  await page.locator('[data-action="clear-chat"]').click();
  await page.locator('[data-ask="Where can I get coffee?"]').click();
  await page.screenshot({ path: path.join(output, 'current-mobile-chat.png') });
  await page.locator('.answer-message [data-source]').first().click();
  check('Citation opens provenance and original URL action', await page.locator('#dialog-content [data-url]').count() === 1);
  await page.locator('[data-action="close-dialog"]').click();
  await page.locator('.answer-places [data-place="mju-y12"]').click();
  check('Chat map action selects building', (await page.evaluate(() => MCE.getState())).selected === 'mju-y12');
  await page.locator('#language-select').selectOption('ko');
  check('Korean interface switches while retaining selection', await page.locator('html').getAttribute('lang') === 'ko' && (await page.evaluate(() => MCE.getState())).selected === 'mju-y12');
  await page.locator('#search').fill('명진당');
  check('Korean search finds library building', await page.locator('.place-card[data-place="mju-y3"]').count() === 1);
  await page.locator('#language-select').selectOption('en');
  await page.locator('.nav-tab[data-tab="events"]').click();
  check('Empty events has no fabricated entries and links university notices',
    await page.locator('.event-empty').isVisible() && await page.locator('#panel-body .food-card').count() === 0 &&
    (await page.locator('.event-empty').innerText()).includes('No upcoming events saved.') &&
    await page.locator('.event-empty [data-url="https://www.mju.ac.kr/mjukr/index.do"]').count() === 1);
  await page.locator('[data-action="about"]').click();
  check('Independent affiliation and privacy are available', /independent student/.test(await page.locator('#dialog-content').innerText()) && /locally/.test(await page.locator('#dialog-content').innerText()));
  await page.locator('[data-action="close-dialog"]').click();
  await context.setOffline(true);
  await page.locator('.nav-tab[data-tab="chat"]').click();
  await page.locator('[data-ask="How do I use the library?"]').click();
  check('Offline library answer names the registered building and links its location',
    (await page.locator('.answer-message').last().innerText()).includes(libraryPlace.name.en) &&
    await page.locator('.answer-message').last().locator('[data-place="mju-y3"]').count() === 1);
  await context.setOffline(false);
  for (const [width,height] of [[320,700],[390,844],[768,1024],[1440,1000]]) {
    await page.setViewportSize({width,height});
    for (const name of ['explore','food','buses','chat','events']) {
      await page.locator(`.nav-tab[data-tab="${name}"]`).click();
      check(`${name} has no horizontal page overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
  }
  await page.locator('.nav-tab[data-tab="explore"]').click();
  await page.locator('[data-action="close-place"]').click();
  await page.locator('[data-action="reset"]').click();
  await page.locator('#search').fill('');
  await page.screenshot({ path: path.join(output, 'current-desktop.png') });
  check('No uncaught UI errors', errors.length === 0);
  diagnostics = await page.evaluate(() => MCE.diagnostics());
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844}});
  await fallbackContext.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='experimental-webgl'||type==='webgl2')return null;return get.call(this,type,...args);};});
  const fallback=await fallbackContext.newPage();fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.goto(previewUrl);await fallback.waitForSelector('.map-label');
  fallbackDiagnostics=await fallback.evaluate(()=>MCE.diagnostics());
  check('Software fallback draws complete reference geometry', fallbackDiagnostics.renderer.includes('Canvas 2D') && fallbackDiagnostics.vertices>10000);
  await fallback.locator('#search').fill('Y7');await fallback.locator('.place-card[data-place="mju-y7"]').click();
  check('Fallback building selection works',(await fallback.evaluate(()=>MCE.getState())).selected==='mju-y7');
  await fallback.screenshot({path:path.join(output,'current-mobile-fallback.png')});
  await fallback.evaluate(()=>MCE.receive({type:'font-scale',scale:2}));
  check('200% font scale avoids horizontal page overflow', await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await fallback.setViewportSize({width:320,height:700});
  await fallback.evaluate(()=>MCE.receive({type:'select',placeId:'mju-y17'}));
  await fallback.waitForTimeout(300);
  check('Enlarged phone header and navigation stay within the viewport',await fallback.evaluate(()=>[...document.querySelectorAll('.app-header button,.nav-tab')].every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;})));
  await fallback.screenshot({path:path.join(output,'current-large-text.png')});
  check('Long selected building remains labelled at 200% text',await fallback.locator('.map-label.selected').isVisible());
  check('Both renderer runs have no uncaught errors',errors.length===0);
  await page.evaluate(()=>{const d=structuredClone(window.mceRequire('data').liveSeed);d.version=3;const p=d.places.find(p=>p.id==='mju-y32');p.name.en='Reviewed residence name';p.evidence={...p.evidence,status:'verified'};MCE.receive({type:'content',data:d});});
  await page.locator('#search').fill('');
  check('Reviewed content override does not duplicate a formerly unverified reference',await page.locator('.place-card[data-place="mju-y32"]').count()===1&&(await page.locator('.place-card[data-place="mju-y32"]').innerText()).includes('Reviewed residence name'));
  await page.evaluate(()=>MCE.receive({type:'publisher-info',privacyUrl:'https://publisher.example.org/privacy',supportUrl:'https://publisher.example.org/support'}));
  await page.locator('[data-action="about"]').click();
  check('Configured publisher privacy/support links appear',await page.locator('#dialog-content [data-url]').count()===2);
  await page.locator('[data-action="close-dialog"]').click();
  const local=await context.newPage();local.on('pageerror',e=>errors.push(e.message));
  await local.goto(require('node:url').pathToFileURL(path.join(root,'preview.html')).href);
  check('Standalone HTML opens directly without a server',await local.locator('.place-card').count()===50&&(await local.evaluate(()=>MCE.getState())).mode==='live');
  check('No errors after final content and standalone checks',errors.length===0);
  for (const result of residenceConflictChecks) check(`Y32 building information discloses the unresolved residence-name conflict in ${result.language}`, result.visible);
  fs.writeFileSync(path.join(output,'current-browser-results.json'),JSON.stringify({executedAt:new Date().toISOString(),previewPath:previewSha256?path.join(root,'preview.html'):undefined,previewSha256,checks,diagnostics,fallbackDiagnostics,errors},null,2));
  console.log(`${checks.length} browser checks passed. Renderer: ${diagnostics.renderer}. Fallback: ${fallbackDiagnostics.renderer}`);
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
})().catch(async e=>{
  fs.writeFileSync(path.join(output,'current-browser-results.json'),JSON.stringify({executedAt:new Date().toISOString(),previewPath:previewSha256?path.join(root,'preview.html'):undefined,previewSha256,checks,diagnostics,fallbackDiagnostics,errors,failure:e.message},null,2));
  console.error(e);
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  process.exit(1);
});

