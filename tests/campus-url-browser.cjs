'use strict';
// Stable campus URL checks in disposable browser contexts; never publishes.
// Local default: serves the built preview. Explicit live mode reads only real HTTPS:
//   MCE_URL_LIVE_BASE=https://davidijesus.github.io/myongji-campus-explorer/
//   node tests/campus-url-browser.cjs --live-base <approved app URL>
// Run live mode only after the release owner confirms publication. This script
// disables service workers to capture real network HTML; it is not an offline test.
// Optional: MCE_URL_EXTENDED_MATRIX=1 adds fresh/mobile and saved-other/desktop.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2), liveFlag = args.indexOf('--live-base');
if (liveFlag !== -1) assert.ok(args[liveFlag + 1] && !args[liveFlag + 1].startsWith('--'), '--live-base requires the approved URL');
const argumentBase = liveFlag === -1 ? undefined : args[liveFlag + 1];
if (argumentBase !== undefined && process.env.MCE_URL_LIVE_BASE !== undefined) assert.equal(argumentBase, process.env.MCE_URL_LIVE_BASE, 'live base argument and environment must agree');
const requestedLiveBase = argumentBase ?? process.env.MCE_URL_LIVE_BASE;
const live = requestedLiveBase !== undefined;
const approvedBase = 'https://davidijesus.github.io/myongji-campus-explorer/';
const officialMenuFeed = new URL('menus/yongin.json', approvedBase).href;
if (live) assert.ok([approvedBase, approvedBase + 'index.html'].includes(requestedLiveBase), 'live mode is limited to the exact approved Campus Explorer base or index.html');
const extendedMatrix = process.env.MCE_URL_EXTENDED_MATRIX === '1';
const expectedHtmlSha256 = process.env.MCE_EXPECTED_INDEX_SHA256 || '';
if (expectedHtmlSha256) assert.match(expectedHtmlSha256, /^[a-f0-9]{64}$/i, 'expected HTML SHA-256 must be a complete digest');
const out = path.resolve(process.env.MCE_URL_OUTPUT || path.join(root, 'build/review-20261109', live ? 'campus-urls-live' : 'campus-urls'));
// Live mode must not read, fulfil or serve a local HTML fixture.
const html = live ? null : fs.readFileSync(process.env.MCE_PAGE || path.join(root, 'preview.html'));
const checks = [], errors = [], blockedRequests = [], validatedUrls = [], htmlResponses = [], htmlCaptureErrors = [], network = [];
let browser, server, baseUrl = live ? new URL(requestedLiveBase) : null;
const contexts = new Set(), captures = new Map();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function documentUrl(query = '', fragment = '') { const url = new URL(baseUrl.href); url.search = query; url.hash = fragment; return url.href; }
function allowedRequest(request) {
    const href = request.url();
    if (href.startsWith('data:')) return true;
    try {
        const url = new URL(href);
        if (!['GET', 'HEAD'].includes(request.method())) return false;
        if (!live) return url.origin === baseUrl.origin;
        const app = new URL(approvedBase);
        if (url.protocol !== 'https:' || url.origin !== app.origin || !url.pathname.startsWith(app.pathname)) return false;
        if (url.pathname.startsWith(app.pathname + 'menus/')) return href === officialMenuFeed;
        return true;
    } catch { return false; }
}
async function recordUrl(page, scenario, phase) {
    const actual = new URL(page.url()), current = await state(page);
    check(`${scenario}/${phase}: original app origin and path are preserved`, actual.origin === baseUrl.origin && actual.pathname === baseUrl.pathname);
    const requested = actual.searchParams.getAll('campus');
    check(`${scenario}/${phase}: URL and displayed campus agree`, requested.length === 1 && ['seoul', 'yongin'].includes(requested[0]) && current.campusId === requested[0]);
    validatedUrls.push({ scenario, phase, url: actual.href, campusId: current.campusId, campusParameters: actual.searchParams.getAll('campus') });
}
async function attachHtmlCapture(context, page) {
    // Enable and read Network on this SAME CDP session. Large self-contained HTML
    // must fit the per-resource buffer; Playwright response.body() is not used.
    const cdp = await context.newCDPSession(page), documents = new Map(), pending = new Set();
    await cdp.send('Network.enable', { maxTotalBufferSize: 128 * 1024 * 1024, maxResourceBufferSize: 128 * 1024 * 1024 });
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    cdp.on('Network.responseReceived', event => {
        if (event.type !== 'Document') return;
        const response = event.response, url = new URL(response.url);
        if (url.origin !== baseUrl.origin || url.pathname !== baseUrl.pathname) return;
        const headers = Object.fromEntries(Object.entries(response.headers).filter(([name]) => ['content-type', 'etag', 'last-modified', 'cache-control', 'x-github-request-id'].includes(name.toLowerCase())));
        const record = { url: response.url, status: response.status, mimeType: response.mimeType, fromDiskCache: !!response.fromDiskCache, fromPrefetchCache: !!response.fromPrefetchCache, fromServiceWorker: !!response.fromServiceWorker, headers };
        documents.set(event.requestId, record); htmlResponses.push(record);
    });
    cdp.on('Network.loadingFinished', event => {
        const record = documents.get(event.requestId); if (!record) return;
        documents.delete(event.requestId);
        const task = cdp.send('Network.getResponseBody', { requestId: event.requestId }).then(result => {
            const bytes = Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
            record.bytes = bytes.length; record.sha256 = sha(bytes);
        }).catch(error => { record.captureError = error.message; htmlCaptureErrors.push({ url: record.url, error: error.message }); });
        pending.add(task); task.finally(() => pending.delete(task));
    });
    cdp.on('Network.loadingFailed', event => {
        const record = documents.get(event.requestId); if (!record) return;
        documents.delete(event.requestId); record.captureError = event.errorText;
        htmlCaptureErrors.push({ url: record.url, error: event.errorText });
    });
    captures.set(context, { flush: async () => { while (pending.size) await Promise.all([...pending]); } });
}
function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); assert.ok(passed, name); }
const state = page => page.evaluate(() => MCE.getState());
async function ready(page) { await page.waitForFunction(() => window.MCE && MCE.diagnostics().vertices > 0); }
async function contextFor(viewport, preferences) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 761, hasTouch: viewport.width < 761, reducedMotion: 'reduce', serviceWorkers: 'block' });
    contexts.add(context);
    await context.route('**/*', route => {
        const request = route.request(), url = request.url();
        if (allowedRequest(request)) { if (!url.startsWith('data:')) network.push({ url, method: request.method(), resourceType: request.resourceType() }); return route.continue(); }
        blockedRequests.push(url); return route.abort();
    });
    if (preferences) await context.addInitScript(p => {
        if (!sessionStorage.getItem('mce-campus-url-test-seeded')) {
            localStorage.setItem('mce-preferences-v1', JSON.stringify(p));
            sessionStorage.setItem('mce-campus-url-test-seeded', '1');
        }
    }, preferences);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await attachHtmlCapture(context, page);
    return { context, page };
}
async function close(context) { await captures.get(context)?.flush(); await context.close(); captures.delete(context); contexts.delete(context); }
async function directLink(campus, saved, mobile = saved) {
    const other = campus === 'seoul' ? 'yongin' : 'seoul';
    const label = `${campus}/${saved ? 'saved-other' : 'fresh'}/${mobile ? 'mobile' : 'desktop'}`;
    const { context, page } = await contextFor(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, saved ? { campusId: other, language: 'zh', favorites: ['mju-y3', 'mju-s9'] } : null);
    let documentRequests = 0; page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests++; });
    await page.goto(documentUrl('campus=' + campus)); await ready(page);
    await recordUrl(page, label, 'direct-entry');
    check(label + ': explicit URL selects the requested campus', (await state(page)).campusId === campus && await page.locator('#campus-select').inputValue() === campus);
    check(label + ': correct campus directory is mounted', (await page.evaluate(() => MCE.diagnostics())).referenceFeatureCount === (campus === 'seoul' ? 11 : 50));
    if (saved) check(label + ': unrelated saved language and favorites survive', (await state(page)).language === 'zh' && (await state(page)).favorites.includes('mju-y3') && (await state(page)).favorites.includes('mju-s9'));
    await page.evaluate(href => history.replaceState(history.state, '', href), documentUrl('source=campus-link&tag=a&tag=b&campus=' + campus, 'map'));
    await page.reload(); await ready(page);
    await recordUrl(page, label, 'reload-with-query-and-fragment');
    check(label + ': reload retains explicit campus', (await state(page)).campusId === campus);
    await page.evaluate(() => history.replaceState({ review: 'campus-links' }, '', location.href));
    const historyLength = await page.evaluate(() => history.length), requestsBeforeSwitch = documentRequests;
    await page.locator('#campus-select').selectOption(other); await ready(page);
    const url = new URL(page.url());
    await recordUrl(page, label, 'selector-switch');
    check(label + ': selector updates the same document URL', (await state(page)).campusId === other && url.searchParams.get('campus') === other && documentRequests === requestsBeforeSwitch);
    check(label + ': other query values and fragment survive', url.searchParams.get('source') === 'campus-link' && JSON.stringify(url.searchParams.getAll('tag')) === '["a","b"]' && url.hash === '#map');
    check(label + ': switch adds no history entry and preserves history state', await page.evaluate(expected => history.length === expected && history.state.review === 'campus-links', historyLength));
    await page.reload(); await ready(page);
    check(label + ': reload cannot switch back to the original link campus', (await state(page)).campusId === other);
    await recordUrl(page, label, 'reload-after-selector');
    await page.locator(`[data-campus-map="${campus}"]`).click(); await ready(page);
    check(label + ': existing map choice also produces the campus link', (await state(page)).campusId === campus && new URL(page.url()).searchParams.get('campus') === campus);
    const sameUrl = page.url(), sameHistory = await page.evaluate(() => history.length), sameRequests = documentRequests;
    await page.locator(`[data-campus-map="${campus}"]`).click();
    check(label + ': selecting the active campus is idempotent', page.url() === sameUrl && documentRequests === sameRequests && await page.evaluate(expected => history.length === expected, sameHistory));
    await page.reload(); await ready(page);
    check(label + ': page map choice survives reload', (await state(page)).campusId === campus);
    await recordUrl(page, label, 'reload-after-map-choice');
    await page.screenshot({ path: path.join(out, `${campus}-${saved ? 'saved-other' : 'fresh'}-${mobile ? 'mobile' : 'desktop'}.png`) });
    await close(context);
}
async function invalidLinks() {
    for (const query of ['campus=invalid', 'campus=seoul&campus=yongin', 'campus=yongin&campus=yongin']) {
        const { context, page } = await contextFor({ width: 390, height: 844 }, { campusId: 'seoul', language: 'en', favorites: [] });
        await page.goto(documentUrl(query + '&keep=1', 'saved')); await ready(page);
        check(query + ': invalid or ambiguous link uses saved campus', (await state(page)).campusId === 'seoul');
        await page.locator('#campus-select').selectOption('yongin');
        const url = new URL(page.url());
        check(query + ': deliberate selection normalizes only campus', JSON.stringify(url.searchParams.getAll('campus')) === '["yongin"]' && url.searchParams.get('keep') === '1' && url.hash === '#saved');
        await page.reload(); await ready(page);
        check(query + ': normalized link reloads consistently', (await state(page)).campusId === 'yongin');
        await recordUrl(page, query, 'normalized-reload');
        await close(context);
    }
}
async function delayedPreferences() {
    const { context, page } = await contextFor({ width: 390, height: 844 });
    await page.goto(documentUrl('campus=seoul')); await ready(page);
    await page.evaluate(() => MCE.receive({ type: 'preferences', campusId: 'yongin', language: 'ko', favorites: ['mju-y3'] })); await ready(page);
    check('direct URL wins over late native campus preference without losing other preferences', (await state(page)).campusId === 'seoul' && (await state(page)).language === 'ko' && (await state(page)).favorites.includes('mju-y3'));
    await page.locator('#campus-select').selectOption('yongin');
    await page.evaluate(() => MCE.receive({ type: 'preferences', campusId: 'seoul', language: 'en', favorites: ['mju-y3'] })); await ready(page);
    check('later explicit page choice wins over both the original link and stale native campus', (await state(page)).campusId === 'yongin' && new URL(page.url()).searchParams.get('campus') === 'yongin');
    await close(context);
    const blocked = await contextFor({ width: 390, height: 844 });
    await blocked.context.addInitScript(() => { Storage.prototype.getItem = function () { throw new DOMException('Storage denied', 'SecurityError'); }; });
    await blocked.page.goto(documentUrl('campus=seoul')); await ready(blocked.page);
    check('explicit campus works when preference storage is unavailable', (await state(blocked.page)).campusId === 'seoul');
    await close(blocked.context);
}
(async () => {
    fs.mkdirSync(out, { recursive: true });
    if (!live) {
        server = http.createServer((req, res) => {
            if (new URL(req.url, 'http://localhost').pathname !== baseUrl.pathname) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html);
        });
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
        baseUrl = new URL('http://127.0.0.1:' + server.address().port + '/preview.html');
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    for (const campus of ['seoul', 'yongin']) for (const saved of [false, true]) await directLink(campus, saved);
    if (extendedMatrix) for (const campus of ['seoul', 'yongin']) for (const saved of [false, true]) await directLink(campus, saved, !saved);
    await invalidLinks(); await delayedPreferences();
    check('all URL scenarios have no uncaught page errors', errors.length === 0);
    check('every app document returned successful HTML and a CDP body digest', htmlResponses.length > 0 && htmlResponses.every(r => r.status === 200 && r.mimeType === 'text/html' && r.bytes > 0 && /^[a-f0-9]{64}$/.test(r.sha256 || '')) && htmlCaptureErrors.length === 0);
    check('all scenarios received the same final HTML version', new Set(htmlResponses.map(r => r.sha256)).size === 1);
    if (live) check('live HTML came from real network responses without service-worker fixtures', htmlResponses.every(r => !r.fromServiceWorker && !r.fromDiskCache && !r.fromPrefetchCache));
    else check('local CDP response bytes match the supplied fixture', htmlResponses.every(r => r.sha256 === sha(html)));
    if (expectedHtmlSha256) check('HTML matches the explicitly expected release digest', htmlResponses.every(r => r.sha256 === expectedHtmlSha256.toLowerCase()));
    console.log(`${checks.length} campus URL browser checks passed`);
})().catch(error => { errors.push(error.stack || String(error)); process.exitCode = 1; }).finally(async () => {
    for (const context of contexts) await close(context).catch(error => htmlCaptureErrors.push({ error: error.message }));
    await browser?.close(); if (server) await new Promise(resolve => server.close(resolve));
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ executedAt: new Date().toISOString(), mode: live ? 'live-network' : 'local-fixture', baseUrl: baseUrl?.href, extendedMatrix, serviceWorkers: 'blocked; online URL behavior only', campusEntryUrls: baseUrl ? { seoul: documentUrl('campus=seoul'), yongin: documentUrl('campus=yongin') } : null, expectedHtmlSha256: expectedHtmlSha256 || null, htmlSha256: htmlResponses.length && new Set(htmlResponses.map(r => r.sha256)).size === 1 ? htmlResponses[0].sha256 : null, htmlHashMethod: 'same-session CDP Network.getResponseBody with 128 MiB total/resource buffers; decoded response bytes', validatedUrls, htmlResponses, htmlCaptureErrors, checks, errors, blockedRequests, network }, null, 2));
});
