'use strict';
// Isolated old-client migration fixture. Never touches the user's browser profile.
// Required: MCE_UPGRADE_OLD = immutable old PWA directory with menus/yongin.json.
// Optional: MCE_UPGRADE_INTERMEDIATE = old-style release expected to wait behind it.
// Defaults: MCE_UPGRADE_TARGET = pwa/, MCE_UPGRADE_OUTPUT = build/client-upgrade/,
// MCE_UPGRADE_MODE = verify. CHROMIUM_EXECUTABLE may select installed Chrome.
// Activation allows 330 seconds for Chromium retirement grace; measured delay is
// reported and must not be described as instant. No data or cache is cleared.
const { chromium } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
assert.ok(process.env.MCE_UPGRADE_OLD, 'Set MCE_UPGRADE_OLD to an immutable previous PWA directory, including menus/yongin.json');
const oldDir = path.resolve(process.env.MCE_UPGRADE_OLD);
const targetDir = path.resolve(process.env.MCE_UPGRADE_TARGET || path.join(root, 'pwa'));
const intermediateDir = process.env.MCE_UPGRADE_INTERMEDIATE ? path.resolve(process.env.MCE_UPGRADE_INTERMEDIATE) : null;
const mode = process.env.MCE_UPGRADE_MODE || 'verify';
const testFailure = process.env.MCE_UPGRADE_FAILURE !== '0';
assert.ok(['reproduce', 'verify'].includes(mode));
const output = path.resolve(process.env.MCE_UPGRADE_OUTPUT || path.join(root, 'build/client-upgrade'));
for (const directory of [oldDir, targetDir, ...(intermediateDir ? [intermediateDir] : [])]) assert.ok(fs.statSync(directory).isDirectory(), 'PWA fixture must be a directory: ' + directory);
assert.notEqual(fs.realpathSync(oldDir), fs.realpathSync(targetDir), 'Old and target PWA fixtures must be distinct directories');
fs.mkdirSync(output, { recursive: true });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const oldVersion = JSON.parse(fs.readFileSync(path.join(oldDir, 'version.json'), 'utf8'));
const targetVersion = JSON.parse(fs.readFileSync(path.join(targetDir, 'version.json'), 'utf8'));
const intermediateVersion = intermediateDir ? JSON.parse(fs.readFileSync(path.join(intermediateDir, 'version.json'), 'utf8')) : null;
const oldHtmlSha = sha(fs.readFileSync(path.join(oldDir, 'index.html')));
const targetHtmlSha = sha(fs.readFileSync(path.join(targetDir, 'index.html')));
const inlineSha = dir => sha(JSON.stringify([...fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/\r\n?/g, '\n').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1])));
const scriptHashes = { [oldHtmlSha]: inlineSha(oldDir), [targetHtmlSha]: inlineSha(targetDir) };
const documentMatches = (doc, hash) => doc.cacheSha256 === hash && doc.inlineScriptSha256 === scriptHashes[hash];
const prefs = { campusId: 'yongin', language: 'ko', favorites: ['mju-y3', 'mju-s9'] };
const menu = fs.readFileSync(path.join(oldDir, 'menus/yongin.json'), 'utf8');
const report = { mode, kind: 'Headless Chrome, disposable persistent profile, loopback server switching immutable published artifacts', networkIsolation: 'External fetch rejected only in test pages; no Playwright routing or extra CDP sessions', oldVersion, intermediateVersion, targetVersion, oldHtmlSha, targetHtmlSha, scriptHashes, checks: [], states: [], documents: [], errors: [], blockedExternalRequests: [], unexpectedOutboundRequests: [], workerEvents: [], network: [], startedAt: new Date().toISOString() };
let serving = oldDir, corrupt = false, base, context, server;
const check = (name, passed, detail) => { report.checks.push({ name, passed: !!passed, ...(detail === undefined ? {} : { detail }) }); assert.ok(passed, name + (detail === undefined ? '' : ' ' + JSON.stringify(detail))); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function poll(fn, name, timeout = 60000) { const deadline = Date.now() + timeout; let last; while (Date.now() < deadline) { try { last = await fn(); if (last) return last; } catch (e) { last = e.message; } await pause(100); } throw Error(name + ': ' + JSON.stringify(last)); }
async function appReady(page) { await page.waitForFunction(() => window.MCE && MCE.diagnostics().vertices > 0); }
async function record(page, phase) {
  const state = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration(), names = await caches.keys();
    return { url: location.href, campus: window.MCE?.getState().campusId, selected: document.querySelector('#campus-select')?.value, language: window.MCE?.getState().language, favorites: window.MCE?.getState().favorites, communityVersion: window.MCE?.getState().communityVersion, preferenceRaw: localStorage.getItem('mce-preferences-v1'), menuRaw: localStorage.getItem('mce-community-yongin-v1'), unrelated: localStorage.getItem('mce-upgrade-test-unrelated'), active: r?.active?.state, installing: r?.installing?.state, waiting: r?.waiting?.state, controller: navigator.serviceWorker.controller?.state, cacheNames: names };
  });
  const sanitized = { ...state, menuSha256: state.menuRaw === null ? null : sha(state.menuRaw) }; delete sanitized.menuRaw;
  report.states.push({ phase, ...sanitized }); return state;
}
async function navigate(page, href, phase, reload = false) {
  const response = reload ? await page.reload({ waitUntil: 'load' }) : await page.goto(href, { waitUntil: 'load' }); await appReady(page);
  const hashes = await page.evaluate(async () => {
    const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    const response = await caches.match(new URL('index.html', location.href).href);
    return { inlineScriptSha256: await digest(new TextEncoder().encode(JSON.stringify([...document.scripts].map(s => s.textContent)))), cacheSha256: response ? await digest(await response.arrayBuffer()) : null };
  });
  const doc = { phase, url: page.url(), status: response.status(), fromServiceWorker: response.fromServiceWorker(), hashMethod: 'Full cached index SHA-256 plus exact inline scripts fingerprint from the loaded DOM; no CDP response body capture', ...hashes };
  report.documents.push(doc); return doc;
}
async function waitShell(page, version, requireNoWaiting = true) {
  let last, progressAt = 0; const started = Date.now(), activation = version.shellHash === targetVersion.shellHash;
  const timeout = activation ? Number(process.env.MCE_UPGRADE_ACTIVATION_TIMEOUT || 330000) : Number(process.env.MCE_UPGRADE_INITIAL_TIMEOUT || 60000);
  try { return await poll(async () => {
    last = await page.evaluate(async ({ shell, noWaiting }) => {
    const r = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys(), cachesDetail = [];
    for (const name of names) { const cache = await caches.open(name); cachesDetail.push({ name, keys: (await cache.keys()).map(r => r.url) }); }
    const target = cachesDetail.filter(c => c.name.endsWith(shell));
    return { ready: !!r?.active && r.active.state === 'activated' && !r.installing && (!noWaiting || !r.waiting) && navigator.serviceWorker.controller === r.active && target.length === 1 && target[0].keys.length === 5, active: r?.active?.state, installing: r?.installing?.state, waiting: r?.waiting?.state, controller: navigator.serviceWorker.controller?.state, controllerIsActive: navigator.serviceWorker.controller === r?.active, caches: cachesDetail };
    }, { shell: version.shellHash, noWaiting: requireNoWaiting });
    if (activation && last.waiting && !report.firstWaitingObservedAt) report.firstWaitingObservedAt = new Date().toISOString();
    if (activation && last.ready) { report.activatedObservedAt = new Date().toISOString(); report.waitForActiveMs = Date.now() - started; }
    if (Date.now() - progressAt >= 30000) { progressAt = Date.now(); const progress = { phase: 'wait for shell', shellHash: version.shellHash, elapsedMs: Date.now() - started, ...last }; fs.writeFileSync(path.join(output, 'progress.json'), JSON.stringify(progress, null, 2)); console.log(JSON.stringify({ phase: progress.phase, shellHash: version.shellHash, elapsedMs: progress.elapsedMs, active: last.active, waiting: last.waiting, ready: last.ready })); }
    return last.ready;
  }, 'wait for complete shell ' + version.shellHash, timeout); } catch (e) {
    report.workerTimeout = last; await record(page, 'worker timeout');
    report.workerDebug = await Promise.all(context.serviceWorkers().map(async w => { try { return await Promise.race([w.evaluate(async () => ({ url: location.href, cacheName, pending: [...pending.keys()], skipWaiting: String(self.skipWaiting), clients: (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).map(c => ({ id: c.id, url: c.url, visibilityState: c.visibilityState })) })), pause(3000).then(() => ({ error: 'Worker diagnostic exceeded 3 seconds' }))]); } catch (err) { return { error: err.message }; } }));
    throw e;
  }
}
function preserved(state) { return state.language === prefs.language && prefs.favorites.every(id => state.favorites?.includes(id)) && state.menuRaw === menu && state.unrelated === 'isolated-test-value'; }
async function guard(c) {
  // Leave service-worker networking untouched. Simulate an unavailable external
  // menu feed in test pages only, so the reviewed saved menu must survive.
  await c.addInitScript(origin => {
    const original = window.fetch.bind(window);
    window.fetch = (...args) => {
      const request = args[0], url = new URL(typeof request === 'string' || request instanceof URL ? request : request.url, location.href);
      if (url.origin !== origin) return Promise.reject(new TypeError('External fetch unavailable in isolated migration fixture'));
      return original(...args);
    };
  }, base.origin);
  c.on('request', request => { const url = request.url(); if (!url.startsWith(base.origin + '/') && !url.startsWith('data:')) report.unexpectedOutboundRequests.push(url); });
  c.on('page', page => { page.setDefaultTimeout(20000); page.on('pageerror', e => report.errors.push(e.stack || e.message)); });
}
const options = { headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'allow', reducedMotion: 'reduce', timezoneId: 'Asia/Seoul' };
(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const entry = { at: new Date().toISOString(), path: url.pathname, serving: path.basename(path.dirname(serving)), corrupt }; report.network.push(entry); res.on('finish', () => { entry.status = res.statusCode; });
    if (url.pathname === '/control.html') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end('<!doctype html><title>Isolated migration control</title>'); return; }
    if (!url.pathname.startsWith('/myongji-campus-explorer/')) { res.writeHead(404); res.end(); return; }
    const name = url.pathname.slice('/myongji-campus-explorer/'.length) || 'index.html';
    if (!['index.html', 'manifest.webmanifest', 'service-worker.js', 'version.json', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'menus/yongin.json'].includes(name)) { res.writeHead(404); res.end(); return; }
    if (corrupt && name === 'icon-512.png') { res.writeHead(503, { 'Cache-Control': 'no-store' }); res.end('Deliberate isolated partial deployment fixture'); return; }
    const file = path.join(serving, name);
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-store', 'Service-Worker-Allowed': '/myongji-campus-explorer/' });
    if (name === 'service-worker.js') { const bytes = fs.readFileSync(file); entry.sha256 = sha(bytes); entry.includesAwaitSkipWaiting = bytes.toString().includes('await self.skipWaiting()'); res.end(bytes); return; }
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = new URL('http://127.0.0.1:' + server.address().port + '/myongji-campus-explorer/'); report.base = base.href;
  const profile = fs.mkdtempSync(path.join(output, 'profile-')); report.profile = profile;
  context = await chromium.launchPersistentContext(profile, options); await guard(context);
  const control = await context.newPage(); await control.goto(new URL('/control.html', base).href);
  let initialDiagnostics;
  if (process.env.MCE_UPGRADE_DIAG_INITIAL === '1') {
    initialDiagnostics = await context.newCDPSession(control); await initialDiagnostics.send('ServiceWorker.enable');
    initialDiagnostics.on('ServiceWorker.workerErrorReported', data => { report.workerEvents.push({ at: new Date().toISOString(), name: 'initial-worker-error', data }); console.log(JSON.stringify({ phase: 'initial-worker-error', data })); });
    report.initialInstallDiagnostics = 'ServiceWorker CDP errors observed only during initial setup, detached before migration';
  }
  let page = await context.newPage(); await navigate(page, base.href, 'old first install'); await waitShell(page, oldVersion);
  await initialDiagnostics?.detach();
  await page.evaluate(({ prefs, menu }) => { localStorage.setItem('mce-preferences-v1', JSON.stringify(prefs)); localStorage.setItem('mce-community-yongin-v1', menu); localStorage.setItem('mce-upgrade-test-unrelated', 'isolated-test-value'); }, { prefs, menu });
  const oldDoc = await navigate(page, base.href, 'old controlled reload', true); let state = await record(page, 'old ready');
  check('Real old shell controls the page and loads the reviewed cached HTML and app scripts', oldDoc.fromServiceWorker && documentMatches(oldDoc, oldHtmlSha));
  check('Old profile starts with saved Yongin, Korean, favorites and cached menu', state.campus === 'yongin' && preserved(state), { campus: state.campus, language: state.language, favorites: state.favorites, menuMatches: state.menuRaw === menu });
  const keeper = await context.newPage(); await navigate(keeper, base.href, 'second old tab');
  await keeper.locator('.nav-tab[data-tab="chat"]').click();
  await keeper.locator('#chat-input').fill('Where is Y3?');
  await keeper.locator('#chat-form button[type="submit"]').click();
  await keeper.locator('#chat-input').fill('Isolated unsent draft must survive the worker update');
  const keeperMessages = await keeper.locator('#chat-messages').innerText();
  if (intermediateDir) {
    serving = intermediateDir;
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r?.waiting?.state === 'installed' && !r.installing; }), 'intermediate worker waiting');
    state = await record(page, 'intermediate release waiting behind old active worker');
    check('Intermediate published release waits while both legacy tabs remain open', state.waiting === 'installed' && state.cacheNames.length === 2 && [oldVersion, intermediateVersion].every(v => state.cacheNames.some(n => n.endsWith(v.shellHash))), state.cacheNames);
  }
  serving = targetDir;
  if (mode === 'verify' && testFailure) {
    corrupt = true;
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); window.__migrationInstallStates = []; r.addEventListener('updatefound', () => { const worker = r.installing; window.__migrationInstallStates.push(worker.state); worker.addEventListener('statechange', () => window.__migrationInstallStates.push(worker.state)); }); await r.update(); });
    await poll(() => page.evaluate(() => window.__migrationInstallStates.includes('redundant')), 'corrupt candidate rejected');
    state = await record(page, 'partial candidate rejected');
    const preservedVersions = [oldVersion, ...(intermediateVersion ? [intermediateVersion] : [])];
    check('Partial deployment cannot replace the active old worker, waiting release or complete caches', (intermediateVersion ? state.waiting === 'installed' : !state.waiting) && state.cacheNames.length === preservedVersions.length && preservedVersions.every(v => state.cacheNames.some(n => n.endsWith(v.shellHash))), state.cacheNames);
    const stillOld = await navigate(page, base.href + '?campus=seoul', 'old fallback after failed candidate');
    state = await record(page, 'failed upgrade preserves old data');
    check('Failed upgrade leaves old offline HTML and all saved data usable', documentMatches(stillOld, oldHtmlSha) && stillOld.fromServiceWorker && preserved(state));
    check('Failed upgrade preserves the other tab chat and unsent draft', await keeper.locator('#chat-input').inputValue() === 'Isolated unsent draft must survive the worker update' && await keeper.locator('#chat-messages').innerText() === keeperMessages);
    corrupt = false;
  }
  const direct = await navigate(page, base.href + '?campus=seoul', 'direct link after server upgrade');
  // Deterministic browser update check; no activation message, storage purge or cache clearing.
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  if (mode === 'reproduce') {
    await poll(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r?.waiting?.state === 'installed' && !r.installing; }), 'new worker waiting');
    state = await record(page, 'new worker waiting');
    check('Direct Seoul URL still displays Yongin while old worker controls', state.url.endsWith('?campus=seoul') && state.campus === 'yongin' && state.selected === 'yongin' && documentMatches(direct, oldHtmlSha), { campus: state.campus, sha256: direct.sha256 ?? direct.cacheSha256 });
    check('Updated worker is waiting alongside old and new full shell caches', state.waiting === 'installed' && state.cacheNames.some(n => n.endsWith(oldVersion.shellHash)) && state.cacheNames.some(n => n.endsWith(targetVersion.shellHash)), state.cacheNames);
    const reloaded = await navigate(page, undefined, 'reload while update waits', true); state = await record(page, 'reload still old');
    check('Ordinary reload keeps the old HTML and incorrect campus', documentMatches(reloaded, oldHtmlSha) && reloaded.fromServiceWorker && state.campus === 'yongin');
    check('Failure is not caused by loss of saved data', preserved(state));
    await page.screenshot({ path: path.join(output, 'old-client-seoul-link-shows-yongin.png') });
    await page.close(); await keeper.close();
    await poll(() => control.evaluate(async scope => { const r = await navigator.serviceWorker.getRegistration(scope); return r?.active?.state === 'activated' && !r.waiting && !r.installing; }, base.href), 'activation after last app tab closes');
    page = await context.newPage(); const reopened = await navigate(page, base.href + '?campus=seoul', 'reopen after all old clients close'); state = await record(page, 'reopened current');
    check('After leaving all app clients, the same profile receives reviewed current HTML and scripts', documentMatches(reopened, targetHtmlSha) && reopened.fromServiceWorker);
    check('Seoul direct link works after old clients close without clearing any data', state.campus === 'seoul' && state.selected === 'seoul' && preserved(state));
    await page.screenshot({ path: path.join(output, 'same-profile-reopened-seoul.png') });
  } else {
    await waitShell(page, targetVersion);
    state = await record(page, 'candidate active');
    check('Complete candidate activates without closing either old app tab', !state.waiting && state.cacheNames.length === 1 && state.cacheNames[0].endsWith(targetVersion.shellHash), state.cacheNames);
    check('Automatic migration preserves language, both favorites, menu and unrelated storage', preserved(state));
    check('Activation does not reload the other tab or discard its session chat and draft', await keeper.locator('#chat-input').inputValue() === 'Isolated unsent draft must survive the worker update' && await keeper.locator('#chat-messages').innerText() === keeperMessages);
    const reloaded = await navigate(page, undefined, 'candidate reload', true); state = await record(page, 'candidate reload');
    check('Next ordinary reload serves candidate HTML and scripts and correct direct campus while another old tab remains open', documentMatches(reloaded, targetHtmlSha) && reloaded.fromServiceWorker && state.campus === 'seoul');
    check('Corrected direct link retains all saved data', preserved(state));
    await page.screenshot({ path: path.join(output, 'migrated-seoul-link.png') });
    for (const campus of ['yongin', 'seoul']) {
      const link = await navigate(page, base.href + '?campus=' + campus, 'migrated online ' + campus); state = await record(page, 'migrated online ' + campus);
      check('Migrated online ' + campus + ' link selects the requested campus', documentMatches(link, targetHtmlSha) && link.fromServiceWorker && state.campus === campus && preserved(state));
      await navigate(page, undefined, 'migrated online ' + campus + ' reload', true); state = await record(page, 'migrated online ' + campus + ' reload');
      check('Migrated online ' + campus + ' survives reload', state.campus === campus && preserved(state));
    }
    await keeper.close();
  }
  await context.setOffline(true);
  for (const campus of ['yongin', 'seoul']) {
    const doc = await navigate(page, base.href + '?campus=' + campus, 'offline ' + campus); state = await record(page, 'offline ' + campus);
    check('Migrated profile opens ' + campus + ' offline with reviewed target shell', documentMatches(doc, targetHtmlSha) && doc.fromServiceWorker && state.campus === campus && preserved(state));
  }
  await context.close(); context = null;
  context = await chromium.launchPersistentContext(profile, options); await guard(context); await context.setOffline(true);
  page = await context.newPage(); const cold = await navigate(page, base.href + '?campus=seoul', 'offline new browser process'); state = await record(page, 'offline new process');
  check('Migrated profile survives cold offline process restart with correct campus and data', documentMatches(cold, targetHtmlSha) && cold.fromServiceWorker && state.campus === 'seoul' && preserved(state));
  check('No uncaught application JavaScript errors', report.errors.length === 0, report.errors);
  check('No external network requests escape the isolated fixture', report.unexpectedOutboundRequests.length === 0, report.unexpectedOutboundRequests);
  report.passed = true; console.log(JSON.stringify({ mode, passed: report.checks.length, baselineReproduced: mode === 'reproduce', oldHtmlSha, targetHtmlSha, results: path.join(output, 'results.json') }));
})().catch(e => { report.passed = false; report.failure = e.stack || String(e); console.error(e); process.exitCode = 1; }).finally(async () => {
  report.completedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  await context?.close(); if (server) await new Promise(resolve => server.close(resolve));
});
