'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FEED_URL, previousFeed, buildFeed } = require('../scripts/build-pages-menu-feed.cjs');
const now = () => Date.parse('2026-11-03T12:00:00Z');
const valid = { schemaVersion: 1, campusId: 'yongin', version: 7, updatedAt: '2026-11-03T11:00:00Z', updates: [] };
const bytes = JSON.stringify(valid, null, 2) + '\n';
const json = (body = bytes, headers = {}) => new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

test('Pages reads only the fixed public snapshot without credentials and preserves its exact bytes', async () => {
  let calls = 0;
  const result = await previousFeed({ now, fetcher: async (url, options) => {
    calls++;
    const requested = new URL(url);
    assert.equal(requested.origin + requested.pathname, FEED_URL);
    assert.equal(requested.searchParams.get('_mce_check'), String(now()));
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    return json();
  } });
  assert.equal(calls, 1);
  assert.equal(result.toString(), bytes);
});

test('missing, redirected, unauthorized and failing previous feed never trigger implicit initialization', async () => {
  for (const status of [301, 302, 401, 404, 500, 503]) {
    await assert.rejects(previousFeed({ now, fetcher: async () => new Response('unavailable', { status }) }));
  }
});

test('previous feed rejects HTML, malformed JSON, invalid UTF-8 and future or wrong-campus data', async () => {
  const responses = [
    new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }),
    json('{not-json'), json(Uint8Array.from([0xff, 0xfe])),
    json(JSON.stringify({ ...valid, updatedAt: '2026-11-04T00:00:00Z' })),
    json(JSON.stringify({ ...valid, campusId: 'seoul' })),
  ];
  for (const response of responses) await assert.rejects(previousFeed({ now, fetcher: async () => response }));
});

test('previous feed bounds declared and streamed bytes before accepting JSON', async () => {
  await assert.rejects(previousFeed({ now, fetcher: async () => json(bytes, { 'content-length': '262145' }) }));
  await assert.rejects(previousFeed({ now, fetcher: async () => json(bytes, { 'content-length': 'unknown' }) }));
  await assert.rejects(previousFeed({ now, fetcher: async () => json(' '.repeat(262145)) }));
});

test('previous feed times out instead of hanging a deployment', async () => {
  await assert.rejects(previousFeed({ now, timeoutMs: 20, fetcher: (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) }));
});

test('Pages passes a validated previous file to the collector and leaves the existing site intact on a read failure', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mce-pages-menu-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'build'));
  fs.mkdirSync(path.join(root, 'pwa/menus'), { recursive: true });
  const published = path.join(root, 'pwa/menus/yongin.json');
  fs.writeFileSync(published, bytes);
  let called = false;
  await assert.rejects(buildFeed({ root, now, fetcher: async () => new Response('', { status: 404 }),
    collectorRun: async () => { called = true; } }));
  assert.equal(called, false);
  assert.equal(fs.readFileSync(published, 'utf8'), bytes);
});

test('Pages collector receives last-known-good data and cannot silently reuse an interrupted capture directory', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mce-pages-valid-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'build'));
  const options = { root, now, fetcher: async () => json(), collectorRun: async options => {
    assert.equal(options.initial, undefined);
    assert.equal(fs.readFileSync(options.previous, 'utf8'), bytes);
    assert.equal(options.output, path.join(root, 'pwa/menus/yongin.json'));
    return { outcome: 'partial', exitCode: 0, snapshot: valid };
  } };
  assert.equal((await buildFeed(options)).outcome, 'partial');
  await assert.rejects(buildFeed(options), error => error.code === 'EEXIST');
});
