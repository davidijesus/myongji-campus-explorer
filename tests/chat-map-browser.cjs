'use strict';
// Headless browser regression of the packaged WebView UI and its Back bridge.
// This does not execute Java/Android or claim a physical-device test.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const out = process.env.MCE_TEST_OUTPUT || path.join(root, 'build/review-20261021/chat-map');
const pagePath = path.resolve(process.env.MCE_PAGE || path.join(root, 'preview.html'));
const html = fs.readFileSync(pagePath);
const activity = fs.readFileSync(path.join(root, 'android-standalone/src/dev/student/myongjiexplorer/standalone/MainActivity.java'), 'utf8');
const csp = activity.match(/headers\.put\("Content-Security-Policy", "([^"]+)"\)/)?.[1];
assert.ok(csp, 'Use the current Android asset CSP');
const origin = 'https://appassets.androidplatform.net/assets/index.html';
const fixedTime = '2026-10-21T03:00:00.000Z'; // 21 October, noon in Korea.
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'data/reviewed-community-2026-10-12.json'), 'utf8'));
const checks = [], errors = [], requests = [], scenarios = [];
fs.mkdirSync(out, { recursive: true });
function check(name, value) {
  checks.push({ name, passed: Boolean(value) });
  assert.ok(value, name);
}
const state = page => page.evaluate(() => MCE.getState());
const back = page => page.evaluate(() => MCE.handleBack());
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const scrollState = page => page.evaluate(() => Object.fromEntries(['workspace', 'content-panel', 'panel-body'].map(id => [id, document.getElementById(id).scrollTop])));
const tab = (page, name) => page.locator(`.nav-tab[data-tab="${name}"]`).click();
let browser;

async function openPage(viewport) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 761, hasTouch: viewport.width < 761, timezoneId: 'Asia/Seoul' });
  await context.route('**/*', async route => {
    if (route.request().url() === origin) return route.fulfill({ status: 200, contentType: 'text/html;charset=utf-8', headers: { 'Content-Security-Policy': csp }, body: html });
    requests.push(route.request().url());
    await route.abort();
  });
  await context.setOffline(true);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(fixedTime); // Date is fixed; animation frames/timers continue normally.
  await page.goto(origin);
  await settle(page);
  return { context, page };
}

async function captureAndOpen(page, selector) {
  const action = page.locator(selector);
  await action.scrollIntoViewIfNeeded();
  await action.focus();
  await settle(page);
  // Observe the actual click before the app handler, including Playwright's
  // accessibility scrolling. No app state is changed by this instrumentation.
  await page.evaluate(selector => {
    window.__chatMapClick = null;
    document.addEventListener('click', event => {
      const button = event.target.closest(selector);
      if (!button) throw new Error('Unexpected navigation target');
      window.__chatMapClick = {
        selected: MCE.getState().selected,
        scroll: Object.fromEntries(['workspace', 'content-panel', 'panel-body'].map(id => [id, document.getElementById(id).scrollTop])),
        messageIndex: button.dataset.chatMap,
        placeId: button.dataset.place,
      };
    }, { capture: true, once: true });
  }, selector);
  await action.click();
  await settle(page);
  return page.evaluate(() => window.__chatMapClick);
}

async function navigationScenario(campus, language, viewport) {
  const label = `${campus}/${language}/${viewport.width}x${viewport.height}`;
  const { context, page } = await openPage(viewport);
  const previous = campus === 'yongin' ? 'mju-y3' : 'mju-s2';
  const target = campus === 'yongin' ? 'mju-y9' : 'mju-s10';
  const room = campus === 'yongin' ? 'Y9228' : 'S10303';
  const otherCampus = campus === 'yongin' ? 'seoul' : 'yongin';
  try {
    await page.locator('#campus-select').selectOption(campus);
    await page.locator('#language-select').selectOption(language);
    await page.locator(`.place-card[data-place="${previous}"]`).click();
    await tab(page, 'chat');
    check(`${label}: opening chat preserves the existing building selection`, (await state(page)).selected === previous);
    const question = { en: `Where is classroom ${room}?`, ko: `${room} 강의실은 어디인가요?`, zh: `${room}教室在哪里？` }[language];
    for (let i = 0; i < 12; i++) {
      await page.locator('#chat-input').fill(question);
      await page.locator('#chat-form button').click();
    }
    check(`${label}: long conversation contains twelve saved answers`, (await state(page)).chatMessages === 12 && await page.locator('.answer-message').count() === 12);
    const selector = `[data-chat-map="4"][data-place="${target}"]`;
    check(`${label}: an earlier classroom answer has a specific in-campus map action`, await page.locator(selector).count() === 1 && await page.locator('.answer-message').nth(4).locator('[data-source]').count() > 0);
    const originState = await captureAndOpen(page, selector);
    check(`${label}: earlier answer was reached by scrolling the conversation`, Object.values(originState.scroll).some(value => value > 100));
    const mapped = await state(page);
    check(`${label}: chat action opens the intended building on the same campus`, mapped.tab === 'explore' && mapped.campusId === campus && mapped.selected === target);
    check(`${label}: return control is present only while map context exists`, await page.locator('[data-action="return-chat"]').count() === 1);
    await page.locator('[data-action="place-detail"]').click();
    check(`${label}: native Back consumes the source/building dialog first`, await back(page) === true && !(await page.locator('#dialog').evaluate(el => el.open)) && (await state(page)).selected === target && (await state(page)).tab === 'explore');
    check(`${label}: native Back consumes the chat-map context`, await back(page) === true);
    await settle(page);
    const restored = await state(page);
    check(`${label}: native Back restores chat and the pre-existing map selection`, restored.tab === 'chat' && restored.campusId === campus && restored.selected === previous && restored.chatMessages === 12);
    const restoredScroll = await scrollState(page);
    check(`${label}: native Back restores every scroll container`, Object.entries(originState.scroll).every(([id, value]) => Math.abs(restoredScroll[id] - value) <= 2));
    check(`${label}: keyboard/accessibility focus returns to the exact earlier answer`, await page.locator(selector).evaluate(el => document.activeElement === el));
    check(`${label}: returned conversation has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    scenarios.push({ label, previous, target, originScroll: originState.scroll, restoredScroll });
    await page.screenshot({ path: path.join(out, `${campus}-${language}-${viewport.width}-returned.png`) });

    check(`${label}: subsequent Back returns to Explore without discarding previous selection`, await back(page) === true && (await state(page)).tab === 'explore' && (await state(page)).selected === previous);
    check(`${label}: next Back clears that restored selection`, await back(page) === true && (await state(page)).selected === null);
    check(`${label}: only Explore with no context delegates Back to Android`, await back(page) === false);

    await tab(page, 'chat');
    await captureAndOpen(page, selector);
    await page.locator('[data-action="close-place"]').click();
    await settle(page);
    check(`${label}: closing a chat-opened sheet also restores a previously empty selection`, (await state(page)).tab === 'chat' && (await state(page)).selected === null && await page.locator(selector).evaluate(el => document.activeElement === el));

    await captureAndOpen(page, selector);
    await page.locator('#campus-select').selectOption(otherCampus);
    await settle(page);
    check(`${label}: changing campus cancels the old chat return action`, (await state(page)).campusId === otherCampus && (await state(page)).tab === 'explore' && await page.locator('[data-action="return-chat"]').count() === 0);
    check(`${label}: Back on the fresh other campus cannot jump to the old answer`, await back(page) === false && (await state(page)).campusId === otherCampus);
    await page.locator('#campus-select').selectOption(campus);
    check(`${label}: revisiting campus retains selection but does not revive cancelled chat context`, (await state(page)).selected === target && await page.locator('[data-action="return-chat"]').count() === 0 && await back(page) === true && (await state(page)).tab === 'explore' && (await state(page)).selected === null);
    await tab(page, 'chat');
    check(`${label}: campus switching preserved the original conversation`, (await state(page)).chatMessages === 12 && await page.locator(selector).count() === 1);
  } finally {
    await context.close();
  }
}

async function expiredMenus() {
  const { context, page } = await openPage({ width: 390, height: 844 });
  try {
    const savedMenus = snapshot.updates.filter(update => update.kind === 'menu');
    const savedSources = [...new Set(savedMenus.map(update => update.sourceId))];
    check('Saved reviewed menus cover 12–16 October and are all expired on 21 October', savedMenus.length > 0 && Math.min(...savedMenus.map(update => Number(update.validFrom.slice(-2)))) === 12 && savedMenus.every(update => update.validFrom >= '2026-10-12' && update.validThrough <= '2026-10-16'));
    for (const language of ['en', 'ko', 'zh']) {
      await page.locator('#language-select').selectOption(language);
      await tab(page, 'food');
      check(`${language}: expired meals are absent from today's feed`, await page.locator('[data-community-updates="menu"] [data-community-update]').count() === 0 && await page.locator('[data-community-empty="menu"]').count() === 1);
      for (const source of savedSources) {
        const availability = page.locator(`[data-menu-availability="${source}"]`);
        const latest = savedMenus.filter(update => update.sourceId === source).map(update => update.validThrough).sort().at(-1);
        check(`${language}/${source}: saved menu is explicitly outdated with its last valid date`, await availability.getAttribute('data-menu-state') === 'outdated' && (await availability.innerText()).includes(latest));
        check(`${language}/${source}: the official source and provenance remain available offline`, await page.locator(`[data-community-official-source="${source}"] [data-url]`).count() === 1 && await page.locator(`[data-community-official-source="${source}"] [data-source="${source}"]`).count() === 1);
      }
      check(`${language}: no saved source is falsely labelled current`, await page.locator('[data-menu-state="current"]').count() === 0);
      await page.screenshot({ path: path.join(out, `expired-menus-${language}.png`) });
    }
  } finally {
    await context.close();
  }
}

(async () => {
  let failure;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
    for (const campus of ['yongin', 'seoul']) {
      for (const language of ['en', 'ko', 'zh']) await navigationScenario(campus, language, { width: 390, height: 844 });
      await navigationScenario(campus, 'en', { width: 1440, height: 1000 });
    }
    await expiredMenus();
    check('No uncaught browser errors', errors.length === 0);
    check('No external request was attempted during these offline flows', requests.length === 0);
  } catch (error) {
    failure = error;
  } finally {
    if (browser) await browser.close();
    const result = {
      test: 'offline chat-map Back bridge and expired menus',
      executedAt: new Date().toISOString(),
      fixedTime,
      environment: 'Headless Chrome with Android asset origin/CSP; Java, emulator and physical device not executed',
      pagePath,
      pageSha256: crypto.createHash('sha256').update(html).digest('hex'),
      checks, scenarios, errors, requests,
      passed: !failure,
      ...(failure ? { failure: failure.stack } : {}),
    };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ passed: result.passed, checks: checks.length, scenarios: scenarios.length, output: path.join(out, 'results.json'), pageSha256: result.pageSha256, ...(failure ? { failure: failure.message } : {}) }, null, 2));
    if (failure) process.exitCode = 1;
  }
})();
