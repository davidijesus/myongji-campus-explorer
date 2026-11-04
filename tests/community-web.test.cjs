'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createCommunityWebClient, COMMUNITY_FEED_URL, COMMUNITY_CACHE_KEY,
  COMMUNITY_AUTO_INTERVAL, COMMUNITY_REQUEST_TIMEOUT,
} = require('../build/core/community-web.js');

const NOW = Date.parse('2026-11-03T03:00:00Z');
const snapshot = (version = 1, extra = {}) => ({
  schemaVersion: 1, campusId: 'yongin', version,
  updatedAt: '2026-11-03T00:00:00Z', updates: [], ...extra,
});
const originalMenu = (extra = {}) => ({
  id: 'official-library-2026-11-03-lunch', sourceId: 'mju-menu-library', kind: 'menu',
  originalLanguage: 'ko', originalText: '\uae40\uce58\ucc0c\uac1c\n\uc300\ubc25', meal: 'lunch',
  sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.11.02',
  publishedAt: null, reviewedAt: null, observedAt: '2026-11-03T00:00:00Z', validatedAt: '2026-11-03T00:00:00Z',
  validFrom: '2026-11-03', validThrough: '2026-11-03', ...extra,
});
const jsonResponse = value => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };

function fixture(initial = null) {
  let instant = NOW, nextTimer = 0;
  const saved = new Map(initial === null ? [] : [[COMMUNITY_CACHE_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  const timers = new Map(), calls = [], states = [], responses = [];
  let writes = 0, failRead = false, failWrite = false;
  const storage = {
    getItem(key) { if (failRead) throw new Error('Synthetic storage read failure'); return saved.get(key) ?? null; },
    setItem(key, value) { if (failWrite) throw new Error('Synthetic storage write failure'); writes++; saved.set(key, value); },
  };
  const client = createCommunityWebClient({
    storage, receive: state => states.push(structuredClone(state)), now: () => instant,
    fetch: (url, options) => { calls.push({ url, options }); const next = responses.shift(); return next instanceof Error ? Promise.reject(next) : Promise.resolve(next ?? jsonResponse(snapshot())); },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  return {
    client, storage, saved, timers, calls, states, responses,
    get writes() { return writes; }, set failRead(value) { failRead = value; }, set failWrite(value) { failWrite = value; },
    advance(ms) { instant += ms; }, last() { return states.at(-1); }, cached() { return JSON.parse(saved.get(COMMUNITY_CACHE_KEY)); },
  };
}

test('web client uses only the fixed credential-free JSON URL and stores a validated response', async () => {
  const f = fixture(); f.client.start(); await flush();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, COMMUNITY_FEED_URL);
  assert.equal(COMMUNITY_FEED_URL, 'https://davidijesus.github.io/myongji-campus-explorer/menus/yongin.json');
  const options = f.calls[0].options;
  assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
  assert.deepEqual(options.headers, { Accept: 'application/json' });
  assert.equal(f.last().status, 'updated'); assert.deepEqual(f.cached(), snapshot());
  assert.equal(f.writes, 1); assert.equal(f.timers.size, 0);
  f.client.close();
});

test('validated cache is emitted before network refresh and survives a process restart offline', async () => {
  const f = fixture(snapshot(4)); f.responses.push(new Error('Synthetic offline'));
  f.client.start();
  assert.equal(f.states[0].status, 'cached'); assert.equal(f.states[0].snapshot.version, 4);
  await flush();
  assert.equal(f.last().status, 'error'); assert.equal(f.last().reason, 'network');
  assert.equal(f.last().snapshot.version, 4); assert.equal(f.writes, 0);
  f.client.close();
  const reopened = fixture(f.saved.get(COMMUNITY_CACHE_KEY)); reopened.responses.push(new Error('Still offline'));
  reopened.client.start(); await flush();
  assert.equal(reopened.states[0].snapshot.version, 4);
  assert.equal(reopened.last().snapshot.version, 4); reopened.client.close();
});

test('automatic resume has a fifteen-minute cooldown while manual refresh bypasses it', async () => {
  const f = fixture(); f.client.start(); await flush();
  f.client.pause(); f.client.resume(); await flush(); assert.equal(f.calls.length, 1);
  f.advance(COMMUNITY_AUTO_INTERVAL - 1); f.client.resume(); await flush(); assert.equal(f.calls.length, 1);
  f.advance(1); f.client.resume(); await flush(); assert.equal(f.calls.length, 2);
  f.client.refresh(); await flush(); assert.equal(f.calls.length, 3);
  assert.equal(f.writes, 1, 'unchanged canonical data is not repeatedly written');
  f.client.close();
});

test('simultaneous start, resume and manual events share one in-flight request', async () => {
  const f = fixture(), waiting = deferred(); f.responses.push(waiting.promise);
  f.client.start(); f.client.resume(); f.client.refresh(); f.client.start();
  assert.equal(f.calls.length, 1);
  waiting.resolve(jsonResponse(snapshot())); await flush();
  assert.equal(f.last().status, 'updated'); assert.equal(f.writes, 1); f.client.close();
});

test('pause aborts a request, ignores its late response and permits a fresh resume attempt', async () => {
  const f = fixture(snapshot(1)), waiting = deferred(); f.responses.push(waiting.promise);
  f.client.start(); const firstSignal = f.calls[0].options.signal;
  f.client.pause(); assert.equal(firstSignal.aborted, true);
  assert.equal(f.last().status, 'cancelled'); assert.equal(f.last().snapshot.version, 1);
  f.responses.push(jsonResponse(snapshot(3))); f.client.resume(); await flush();
  waiting.resolve(jsonResponse(snapshot(2))); await flush();
  assert.equal(f.calls.length, 2); assert.equal(f.cached().version, 3); assert.equal(f.last().snapshot.version, 3);
  f.client.close();
});

test('background and closed clients cannot initiate a request or deliver a late result', async () => {
  const f = fixture(); f.client.refresh(); assert.equal(f.calls.length, 0);
  const waiting = deferred(); f.responses.push(waiting.promise); f.client.start(); f.client.close();
  const count = f.states.length; f.client.resume(); f.client.refresh();
  waiting.resolve(jsonResponse(snapshot())); await flush();
  assert.equal(f.calls.length, 1); assert.equal(f.states.length, count); assert.equal(f.writes, 0);
});

test('timeout covers the complete response and retains the last good snapshot', async () => {
  const f = fixture(snapshot(2)), waiting = deferred(); f.responses.push(waiting.promise);
  f.client.start(); const timer = [...f.timers.values()][0];
  assert.equal(timer.delay, COMMUNITY_REQUEST_TIMEOUT); timer.callback(); await flush();
  assert.equal(f.calls[0].options.signal.aborted, true); assert.equal(f.last().reason, 'timeout');
  assert.equal(f.last().snapshot.version, 2); assert.equal(f.writes, 0); assert.equal(f.timers.size, 0);
  waiting.resolve(jsonResponse(snapshot(3))); await flush(); assert.equal(f.cached().version, 2);
  f.client.close();
});

test('HTTP errors and unrequested 304 responses never replace the cache', async () => {
  for (const status of [304, 404, 429, 500]) {
    const f = fixture(snapshot(2)); f.responses.push(new Response(null, { status }));
    f.client.start(); await flush();
    assert.equal(f.last().reason, 'http'); assert.equal(f.cached().version, 2); assert.equal(f.writes, 0);
    f.client.close();
  }
});

test('redirected responses or a different final URL are rejected', async () => {
  for (const extra of [{ redirected: true }, { url: 'https://other.example/menus.json' }]) {
    const f = fixture(snapshot(2)), response = jsonResponse(snapshot(3));
    for (const [key, value] of Object.entries(extra)) Object.defineProperty(response, key, { value });
    f.responses.push(response); f.client.start(); await flush();
    assert.equal(f.last().reason, 'redirect'); assert.equal(f.cached().version, 2); f.client.close();
  }
});

test('non-JSON or unexpected character encodings are rejected before parsing', async () => {
  for (const type of ['text/html', 'text/plain', 'application/json; charset=iso-8859-1', 'application/javascript', '']) {
    const f = fixture(snapshot(2)); f.responses.push(new Response(JSON.stringify(snapshot(3)), { headers: { 'Content-Type': type } }));
    f.client.start(); await flush(); assert.equal(f.last().reason, 'content_type'); assert.equal(f.writes, 0); f.client.close();
  }
});

test('invalid JSON, invalid UTF-8 and an invalid schema retain existing bytes', async () => {
  for (const body of ['{not JSON}', JSON.stringify({ ...snapshot(3), secret: 'extra field' }), new Uint8Array([0xc3, 0x28])]) {
    const f = fixture(snapshot(2)), original = f.saved.get(COMMUNITY_CACHE_KEY);
    f.responses.push(new Response(body, { headers: { 'Content-Type': 'application/json' } }));
    f.client.start(); await flush();
    assert.equal(f.last().reason, 'invalid_snapshot'); assert.equal(f.saved.get(COMMUNITY_CACHE_KEY), original); f.client.close();
  }
});

test('split UTF-8 chunks preserve the original Korean and its line breaks without invented summaries', async () => {
  const value = snapshot(2, { updates: [originalMenu()] }), bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i++) controller.enqueue(bytes.slice(i, i + 1)); controller.close(); } });
  const f = fixture(); f.responses.push(new Response(stream, { headers: { 'Content-Type': 'application/json' } }));
  f.client.start(); await flush();
  assert.equal(f.last().status, 'updated'); assert.deepEqual(f.cached(), value);
  assert.equal(f.cached().updates[0].reviewedAt, null); assert.equal('summary' in f.cached().updates[0], false);
  f.client.close();
});

test('a response that stalls after its headers still reaches the total request timeout', async () => {
  const f = fixture(snapshot(2));
  f.responses.push(new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{')); } }), { headers: { 'Content-Type': 'application/json' } }));
  f.client.start(); await flush();
  [...f.timers.values()][0].callback(); await flush();
  assert.equal(f.last().reason, 'timeout'); assert.equal(f.cached().version, 2); assert.equal(f.writes, 0);
  f.client.close();
});

test('declared or streamed response bodies above 256 KiB are bounded', async () => {
  for (const response of [
    new Response('{}', { headers: { 'Content-Type': 'application/json', 'Content-Length': '262145' } }),
    new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(200000)); controller.enqueue(new Uint8Array(70000)); controller.close(); } }), { headers: { 'Content-Type': 'application/json' } }),
  ]) {
    const f = fixture(snapshot(2)); f.responses.push(response); f.client.start(); await flush();
    assert.equal(f.last().reason, 'too_large'); assert.equal(f.cached().version, 2); assert.equal(f.writes, 0); f.client.close();
  }
});

test('lower revisions, time rollback and conflicting same revisions cannot overwrite cache', async () => {
  const base = snapshot(3);
  for (const candidate of [snapshot(2), snapshot(4, { updatedAt: '2026-11-02T00:00:00Z' }), snapshot(3, { updatedAt: '2026-11-03T01:00:00Z' })]) {
    const f = fixture(base); f.responses.push(jsonResponse(candidate)); f.client.start(); await flush();
    assert.equal(f.last().reason, 'invalid_snapshot'); assert.deepEqual(f.cached(), base); assert.equal(f.writes, 0); f.client.close();
  }
});

test('a newer snapshot saved by another tab is re-read before a delayed commit', async () => {
  const f = fixture(snapshot(1)), waiting = deferred(); f.responses.push(waiting.promise); f.client.start();
  f.saved.set(COMMUNITY_CACHE_KEY, JSON.stringify(snapshot(4))); waiting.resolve(jsonResponse(snapshot(3))); await flush();
  assert.equal(f.cached().version, 4); assert.equal(f.last().snapshot.version, 4); assert.equal(f.last().reason, 'invalid_snapshot');
  assert.equal(f.writes, 0); f.client.close();
});

test('quota/write failure keeps the previously saved and visible snapshot', async () => {
  const f = fixture(snapshot(1)); f.failWrite = true; f.responses.push(jsonResponse(snapshot(2)));
  f.client.start(); await flush();
  assert.equal(f.last().reason, 'cache_write'); assert.equal(f.last().snapshot.version, 1); assert.equal(f.cached().version, 1);
  f.client.close();
});

test('unreadable storage is not treated as an empty cache', async () => {
  const f = fixture(snapshot(2)); f.failRead = true; f.responses.push(jsonResponse(snapshot(1)));
  f.client.start(); await flush();
  assert.equal(f.last().reason, 'cache_read'); assert.equal(f.cached().version, 2); assert.equal(f.writes, 0); f.client.close();
});

test('a valid response can repair malformed local cache without erasing it on failure', async () => {
  const f = fixture('{corrupt'); f.responses.push(new Error('offline')); f.client.start(); await flush();
  assert.equal(f.saved.get(COMMUNITY_CACHE_KEY), '{corrupt'); assert.equal(f.writes, 0);
  f.responses.push(jsonResponse(snapshot(2))); f.client.refresh(); await flush();
  assert.equal(f.last().status, 'updated'); assert.equal(f.cached().version, 2); f.client.close();
});

test('expired records remain cached for freshness evidence instead of being erased on resume', async () => {
  const old = snapshot(7, { updatedAt: '2026-11-02T00:00:00Z', updates: [originalMenu({
    validFrom: '2026-11-02', validThrough: '2026-11-02', observedAt: '2026-11-02T00:00:00Z', validatedAt: '2026-11-02T00:00:00Z',
  })] });
  const f = fixture(old); f.responses.push(new Error('offline')); f.client.start(); await flush();
  f.advance(86400000); f.responses.push(new Error('offline')); f.client.pause(); f.client.resume(); await flush();
  assert.deepEqual(f.cached(), old); assert.deepEqual(f.last().snapshot, old); assert.equal(f.writes, 0); f.client.close();
});
