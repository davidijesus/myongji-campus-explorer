'use strict';
// Isolated browser verification. Synthetic feed data never replaces a published snapshot.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const pagePath = path.resolve(process.env.MCE_PAGE || path.join(root, 'preview.html'));
const output = path.resolve(process.env.MCE_TEST_OUTPUT || path.join(root, 'build/menu-auto-browser'));
const html = fs.readFileSync(pagePath);
const pageUrl = 'https://davidijesus.github.io/myongji-campus-explorer/';
const endpoint = pageUrl + 'menus/yongin.json';
const nativeUrl = 'https://appassets.androidplatform.net/assets/index.html';
const instant = '2026-11-03T03:00:00Z'; // Noon in Korea.
const original = '합성 식단 — 테스트 전용\n쌀밥 / 된장국\n알레르기: 1.2.3.5.6.7.8.9.10.12.14.15\n가격: 5,000원';
const item = extra => ({ id: 'mju-menu-library-2026-11-03-lunch', sourceId: 'mju-menu-library', kind: 'menu',
  originalLanguage: 'ko', originalText: original, meal: 'lunch',
  sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.11.02', publishedAt: null, reviewedAt: null,
  observedAt: '2026-11-03T00:00:00Z', validatedAt: '2026-11-03T01:00:00Z', validFrom: '2026-11-03', validThrough: '2026-11-03', ...extra });
const snapshot = (version = 1, extra = {}) => ({ schemaVersion: 1, campusId: 'yongin', version,
  updatedAt: '2026-11-03T01:01:00Z', updates: [item()], ...extra });
const checks = [], errors = [], unexpectedRequests = [];
let browser;
function check(name, value) { checks.push({ name, passed: Boolean(value) }); assert.ok(value, name); }
async function settle(page, version, status) {
  await page.waitForFunction(({ version, status }) => window.MCE && MCE.getState().communityVersion === version && MCE.getState().communityStatus === status, { version, status });
}
async function fixture(storageState, native = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Seoul', storageState });
  const control = { requests: [], mode: 'valid', data: snapshot() };
  await context.addCookies([{ name: 'synthetic-session', value: 'must-not-reach-feed', domain: 'davidijesus.github.io', path: '/', secure: true }]);
  await context.route('**/*', async route => {
    const request = route.request(), url = request.url();
    if (url === (native ? nativeUrl : pageUrl)) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (url === endpoint) {
      control.requests.push({ url, headers: request.headers(), method: request.method() });
      if (control.mode === 'offline') return route.abort('internetdisconnected');
      if (control.mode === 'invalid') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"unexpected":"invalid"}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(control.data) });
    }
    unexpectedRequests.push(url); await route.abort();
  });
  await context.addInitScript(() => {
    window.__menuHidden = hidden => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden }); document.dispatchEvent(new Event('visibilitychange')); };
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(instant);
  return { context, page, control, open: () => page.goto(native ? nativeUrl : pageUrl) };
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const first = await fixture();
  try {
    await first.open(); await settle(first.page, 1, 'updated');
    check('Opening automatically fetches the fixed official feed once', first.control.requests.length === 1);
    check('Feed request omits cookies and credentials', !first.control.requests[0].headers.cookie && !first.control.requests[0].headers.authorization && first.control.requests[0].method === 'GET');
    await first.page.locator('[data-tab="food"]').click();
    for (const lang of ['en', 'ko', 'zh']) {
      await first.page.locator('#language-select').selectOption(lang);
      const card = first.page.locator('[data-menu-original="ko"]');
      check(`${lang}: original Korean meal is rendered once`, await card.count() === 1);
      check(`${lang}: original Korean, line breaks, allergens and price remain unchanged`, await card.locator('.community-summary').innerText() === original);
      check(`${lang}: automatic import is labelled without a human-review claim`, /imported automatically|자동 가져오기|自动导入/.test(await card.innerText()) && !/Reviewed|검토일|审核日期/.test(await card.innerText()));
      check(`${lang}: original source points to the exact official dated page`, await card.locator('[data-url]').getAttribute('data-url') === item().sourceUrl);
      check(`${lang}: menu layout does not overflow the mobile viewport`, await first.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await first.page.locator('[data-action="about"]').click();
      const about = await first.page.locator('#dialog').innerText();
      check(`${lang}: About explains automatic GitHub Pages checks and shows the new app version`, about.includes('GitHub Pages') && about.includes('v0.6.5') && /checked automatically|식단을 자동으로 확인|自动检查食堂菜单/.test(about) && !/Optional information updates|선택한 정보 업데이트|可选的信息更新/.test(about));
      await first.page.locator('[data-action="close-dialog"]').click();
    }
    await first.page.screenshot({ path: path.join(output, 'original-ko-menu-zh-ui.png'), fullPage: true });
    await first.page.locator('#campus-select').selectOption('seoul');
    check('Yongin meals are not shown on Seoul campus', await first.page.locator('[data-menu-original]').count() === 0);
    await first.page.locator('#campus-select').selectOption('yongin');
    await first.page.locator('[data-tab="food"]').click();
    await first.page.evaluate(() => { window.__menuHidden(true); window.__menuHidden(false); window.dispatchEvent(new Event('pageshow')); });
    await first.page.waitForTimeout(100);
    check('Immediate resume and repeated lifecycle events are deduplicated by cooldown', first.control.requests.length === 1);
    first.control.data = snapshot(2, { updatedAt: '2026-11-03T02:59:00Z', updates: [item({ validatedAt: '2026-11-03T02:58:00Z' })] });
    await first.page.clock.setFixedTime('2026-11-03T03:16:00Z');
    await first.page.evaluate(() => { window.__menuHidden(true); window.__menuHidden(false); });
    await settle(first.page, 2, 'updated');
    check('Resume after cooldown refreshes without reloading the page', first.control.requests.length === 2);
    first.control.mode = 'invalid';
    await first.page.locator('[data-community-refresh]').click(); await settle(first.page, 2, 'error');
    check('Invalid response retains the last valid menu in the frontend', await first.page.locator('[data-menu-original] .community-summary').innerText() === original);
    first.control.mode = 'valid'; first.control.data = snapshot(1);
    await first.page.locator('[data-community-refresh]').click(); await settle(first.page, 2, 'error');
    check('Older feed cannot replace the latest accepted snapshot', (await first.page.evaluate(() => MCE.getState())).communityVersion === 2);
    const saved = await first.context.storageState();
    const second = await fixture(saved);
    try {
      second.control.mode = 'offline';
      await second.open(); await settle(second.page, 2, 'error');
      await second.page.locator('[data-tab="food"]').click();
      check('Fresh browser context reopens the cached original meal with network failure', await second.page.locator('[data-menu-original] .community-summary').innerText() === original);
      await second.page.clock.setFixedTime('2026-11-03T15:00:01Z'); // New Korean day.
      await second.page.evaluate(() => { window.__menuHidden(true); window.__menuHidden(false); });
      await settle(second.page, 2, 'error');
      check('Resume across KST midnight hides expired meal body', await second.page.locator('[data-menu-original]').count() === 0);
      check('Expired saved feed is clearly marked outdated with the source link retained', await second.page.locator('[data-menu-availability="mju-menu-library"]').getAttribute('data-menu-state') === 'outdated' && await second.page.locator('[data-community-official-source="mju-menu-library"] [data-url]').count() === 1);
      await second.page.screenshot({ path: path.join(output, 'expired-offline-menu.png'), fullPage: true });
    } finally { await second.context.close(); }
  } finally { await first.context.close(); }
  const native = await fixture(undefined, true);
  try {
    await native.open();
    await native.page.evaluate(data => { window.__nativeManual = 0; window.MCECommunity = Object.freeze({ refresh() { window.__nativeManual++; } }); MCE.receive({ type: 'community-state', status: 'cached', snapshot: data }); }, snapshot());
    await native.page.locator('[data-tab="food"]').click();
    await native.page.evaluate(() => { window.__menuHidden(true); window.__menuHidden(false); });
    check('Android asset page never starts the web transport or an automatic JS bridge call', native.control.requests.length === 0 && await native.page.evaluate(() => window.__nativeManual) === 0);
    check('Android native snapshots render original Korean through the same UI', await native.page.locator('[data-menu-original] .community-summary').innerText() === original);
    await native.page.locator('[data-community-refresh]').click();
    check('Android manual refresh still uses its existing bridge after a click', await native.page.evaluate(() => window.__nativeManual) === 1);
  } finally { await native.context.close(); }
  check('No uncaught browser errors', errors.length === 0);
  check('No unrelated network requests', unexpectedRequests.length === 0);
})().catch(error => { errors.push(error.stack || String(error)); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ executedAt: new Date().toISOString(), environment: 'Desktop Chrome headless with mobile viewport and synthetic feed; not Android runtime', pagePath, pageSha256: crypto.createHash('sha256').update(html).digest('hex'), checks, errors, unexpectedRequests }, null, 2));
  console.log(`${checks.filter(c => c.passed).length}/${checks.length} automatic menu browser checks passed`);
  if (errors.length) console.error(errors.join('\n'));
});
