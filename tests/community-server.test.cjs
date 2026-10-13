'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createContentServer } = require('../server/server.cjs');
const { MAX_COMMUNITY_BYTES, publicCommunitySnapshot, emptyCommunitySnapshot, canonicalCommunityJson, communityRepresentation } = require('../server/community.cjs');
const { main: admin } = require('../server/admin.cjs');
const token = 'synthetic-community-test-token-'.repeat(2);
const auth = { Authorization: `Bearer ${token}` };
const route = '/v1/community/yongin', administrative = '/v1/admin/community/yongin';
const tag = value => communityRepresentation(typeof value === 'number' ? (value === 1 ? emptyCommunitySnapshot() : snapshot({ version: value })) : value).etag;
// Public-looking URLs and summaries here are synthetic fixtures, never fetched.
const record = (changes = {}) => ({
  id: 'synthetic-menu', sourceId: 'mjhs_lounge', kind: 'menu',
  summary: { en: 'Synthetic reviewed menu.', ko: '검토용 예시 메뉴.', zh: '已审核示例菜单。' },
  sourceUrl: 'https://www.instagram.com/p/SYNTHETIC_TEST/',
  publishedAt: '2026-09-30T01:00:00Z', reviewedAt: '2026-09-30T02:00:00Z',
  validFrom: '2026-09-30', validThrough: '2026-09-30', ...changes,
});
const snapshot = (changes = {}) => ({ schemaVersion: 1, campusId: 'yongin', version: 2, updatedAt: '2026-10-03T00:00:00Z', updates: [record()], ...changes });
const official = (changes = {}) => record({
  id: 'synthetic-official-menu', sourceId: 'mju-menu-library',
  sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28',
  publishedAt: null, observedAt: '2026-09-30T01:00:00Z',
  ...changes,
});

async function temporaryDirectory(t) {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, 'mce-community-server-'));
  t.after(async () => {
    const resolved = await fs.realpath(directory);
    assert.equal(path.dirname(resolved).toLowerCase(), base.toLowerCase());
    assert.match(path.basename(resolved), /^mce-community-server-/);
    await fs.rm(resolved, { recursive: true });
  });
  return directory;
}
async function fixture(t, options = {}) {
  const directory = await temporaryDirectory(t);
  const communityFile = path.join(directory, 'community.json');
  const contentFile = path.join(directory, 'campus.json');
  const server = await createContentServer({ file: contentFile, communityFile, adminToken: token, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, directory, communityFile, contentFile };
}
async function publish(url, document, revision = 1, headers = {}) {
  return fetch(url + administrative, { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json', 'If-Match': tag(revision), ...headers }, body: JSON.stringify(document) });
}

test('community public reads expose a stable empty baseline, HEAD/CORS/ETag, and no write operation', async t => {
  const f = await fixture(t);
  const initial = await fetch(f.url + route);
  assert.equal(initial.status, 200); assert.deepEqual(await initial.json(), emptyCommunitySnapshot());
  assert.equal(initial.headers.get('etag'), tag(1));
  assert.equal(initial.headers.get('access-control-allow-origin'), '*');
  assert.equal(initial.headers.get('access-control-expose-headers'), 'ETag');
  assert.equal(initial.headers.get('cache-control'), 'public, no-cache');
  const head = await fetch(f.url + route, { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.equal(head.headers.get('etag'), tag(1));
  const cached = await fetch(f.url + route, { headers: { 'If-None-Match': tag(1) } });
  assert.equal(cached.status, 304); assert.equal(await cached.text(), '');
  const preflight = await fetch(f.url + route, { method: 'OPTIONS' });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
  assert.equal((await fetch(f.url + route, { method: 'PUT' })).status, 405);
  assert.equal((await fetch(f.url + '/v1/community/seoul')).status, 404);
  await assert.rejects(fs.stat(f.communityFile), { code: 'ENOENT' });
});

test('conditional public requests accept weak/list validators while publication still requires the exact strong tag', async t => {
  const f = await fixture(t);
  for (const validator of [tag(1), 'W/' + tag(1), `"other", W/${tag(1)}`, '*']) {
    const response = await fetch(f.url + route, { headers: { 'If-None-Match': validator } });
    assert.equal(response.status, 304); assert.equal((await response.arrayBuffer()).byteLength, 0);
    assert.equal(response.headers.get('etag'), tag(1)); assert.equal(response.headers.get('cache-control'), 'public, no-cache');
  }
  assert.equal((await fetch(f.url + route, { headers: { 'If-None-Match': '"community-yongin-v1"' } })).status, 200);
  for (const validator of ['W/' + tag(1), '*', `"other", ${tag(1)}`]) {
    assert.equal((await publish(f.url, snapshot(), 1, { 'If-Match': validator })).status, 412);
  }
  assert.equal((await publish(f.url, snapshot())).status, 200);
  assert.equal((await fetch(f.url + route, { headers: { 'If-None-Match': tag(1) } })).status, 200);
});

test('content-derived validators stay stable across key ordering but invalidate changed content at the same revision after restart', async t => {
  const directory = await temporaryDirectory(t), communityFile = path.join(directory, 'community.json');
  const contentFile = path.join(directory, 'campus.json');
  const original = snapshot();
  const reordered = Object.fromEntries(Object.entries(original).reverse());
  reordered.updates = original.updates.map(value => ({ ...value, summary: { zh: value.summary.zh, ko: value.summary.ko, en: value.summary.en } }));
  assert.equal(canonicalCommunityJson(original), canonicalCommunityJson(reordered));
  const changed = snapshot({ updates: [record({ summary: { ...record().summary, en: 'Different synthetic menu.' } })] });
  assert.notEqual(tag(original), tag(changed));
  await fs.writeFile(communityFile, JSON.stringify(changed));
  const restarted = await createContentServer({ file: contentFile, communityFile, adminToken: token });
  await new Promise(resolve => restarted.listen(0, '127.0.0.1', resolve));
  t.after(async () => { restarted.closeAllConnections(); await new Promise(resolve => restarted.close(resolve)); });
  const url = `http://127.0.0.1:${restarted.address().port}`;
  const response = await fetch(url + route, { headers: { 'If-None-Match': tag(original) } });
  assert.equal(response.status, 200); assert.equal(response.headers.get('etag'), tag(changed));
  assert.equal(await response.text(), canonicalCommunityJson(changed));
  const administrativeRead = await fetch(url + administrative, { headers: auth });
  assert.equal(administrativeRead.headers.get('etag'), tag(changed));
});

test('community administration uses the existing bearer secret and forbids browser-origin requests', async t => {
  const f = await fixture(t);
  assert.equal((await fetch(f.url + administrative)).status, 401);
  assert.equal((await publish(f.url, snapshot(), 1, { Authorization: 'Bearer wrong' })).status, 401);
  for (const Origin of ['https://untrusted.example', 'null', '']) {
    const result = await fetch(f.url + administrative, { headers: { ...auth, Origin } });
    assert.equal(result.status, 403); assert.equal(result.headers.get('access-control-allow-origin'), null);
  }
  const result = await fetch(f.url + administrative, { headers: auth });
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(f.url + administrative, { method: 'POST', headers: auth })).status, 405);
  const readonly = await fixture(t, { adminToken: '' });
  assert.equal((await fetch(readonly.url + route)).status, 200);
  assert.equal((await publish(readonly.url, snapshot())).status, 401);
});

test('publishing persists only reviewed fields, leaves old campus data isolated, and restores on restart', async t => {
  const audit = [], f = await fixture(t, { onAudit: event => audit.push(event) });
  const campusBefore = await (await fetch(f.url + '/v1/content')).json();
  const value = snapshot({ updates: [record(), official()] });
  const response = await publish(f.url, value);
  assert.equal(response.status, 200); assert.equal(response.headers.get('etag'), tag(value));
  assert.deepEqual(await response.json(), { ok: true, version: 2 });
  assert.deepEqual(await (await fetch(f.url + route)).json(), value);
  assert.deepEqual(JSON.parse(await fs.readFile(f.communityFile, 'utf8')), value);
  assert.deepEqual(await (await fetch(f.url + '/v1/content')).json(), campusBefore);
  assert.deepEqual(await fs.readdir(f.directory), ['community.json']);
  assert.deepEqual(Object.keys(audit[0]).sort(), ['action', 'at', 'campusId', 'sha256', 'version']);
  assert.equal(audit[0].action, 'community-publish'); assert.match(audit[0].sha256, /^[a-f0-9]{64}$/);
  const restarted = await createContentServer({ file: f.contentFile, communityFile: f.communityFile, adminToken: token });
  await new Promise(resolve => restarted.listen(0, '127.0.0.1', resolve));
  t.after(async () => { restarted.closeAllConnections(); await new Promise(resolve => restarted.close(resolve)); });
  const reloaded = await fetch(`http://127.0.0.1:${restarted.address().port}` + route);
  assert.equal(reloaded.headers.get('etag'), tag(value)); assert.deepEqual(await reloaded.json(), value);
});

test('server retains expired and future entries unchanged under a revision; the client owns KST filtering', async t => {
  const f = await fixture(t);
  const future = new Date(Date.now() + 3 * 86400000 + 9 * 3600000).toISOString().slice(0, 10);
  const value = snapshot({ updates: [record(), record({ id: 'future-announcement', sourceId: 'o_ulami', kind: 'announcement', validFrom: future, validThrough: future })] });
  assert.equal((await publish(f.url, value)).status, 200);
  assert.deepEqual(await (await fetch(f.url + route)).json(), value);
  assert.equal((await fetch(f.url + route, { headers: { 'If-None-Match': tag(value) } })).status, 304);
});

test('concurrent reviewed publications serialize compare-and-swap and cannot silently replace each other', async t => {
  const f = await fixture(t);
  const versions = [snapshot({ updates: [record({ id: 'writer-a' })] }), snapshot({ updates: [record({ id: 'writer-b' })] })];
  const responses = await Promise.all(versions.map(value => publish(f.url, value)));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 412]);
  const winner = versions[responses.findIndex(response => response.status === 200)];
  assert.deepEqual(await (await fetch(f.url + route)).json(), winner);
  assert.deepEqual(JSON.parse(await fs.readFile(f.communityFile, 'utf8')), winner);
  assert.deepEqual(await fs.readdir(f.directory), ['community.json']);
});

test('version rollback, skips, stale preconditions and timestamp rollback preserve the latest revision', async t => {
  const f = await fixture(t), current = snapshot();
  assert.equal((await publish(f.url, current)).status, 200);
  assert.equal((await publish(f.url, snapshot({ version: 3 }), 1)).status, 412);
  assert.equal((await publish(f.url, snapshot({ version: 3 }), 2, { 'If-Match': '' })).status, 412);
  for (const version of [1, 2, 4]) assert.equal((await publish(f.url, snapshot({ version }), 2)).status, 409);
  assert.equal((await publish(f.url, snapshot({ version: 3, updatedAt: '2026-10-02T00:00:00Z' }), 2)).status, 422);
  assert.equal((await fetch(f.url + route, { headers: { 'If-None-Match': tag(2) } })).status, 304);
  assert.deepEqual(await (await fetch(f.url + route)).json(), current);
});

test('snapshot validation rejects malformed, unknown and inconsistent source/date records without exposing payloads', async t => {
  const f = await fixture(t), privateValue = 'RAW_PRIVATE_SENTINEL';
  const cases = [
    snapshot({ campusId: 'seoul' }), snapshot({ schemaVersion: 2 }), snapshot({ version: 0 }), snapshot({ version: Number.MAX_SAFE_INTEGER + 1 }),
    snapshot({ updatedAt: new Date(Date.now() + 3600000).toISOString() }), snapshot({ updatedAt: '2026-02-30T00:00:00Z' }),
    snapshot({ updatedAt: '2026-09-30T01:30:00Z' }), snapshot({ rawHtml: privateValue }),
    snapshot({ updates: [record({ privateNotes: privateValue })] }), snapshot({ updates: [record({ summary: { ...record().summary, raw: privateValue } })] }),
    snapshot({ updates: [record({ sourceId: 'unreviewed' })] }), snapshot({ updates: [record({ reviewedAt: '2026-09-29T00:00:00Z' })] }),
    snapshot({ updates: [record(), record()] }), snapshot({ updates: Array.from({ length: 101 }, (_, n) => record({ id: `id-${n}` })) }),
    snapshot({ updates: [record({ publishedAt: null, observedAt: '2026-09-30T01:00:00Z' })] }),
    snapshot({ updates: [official({ observedAt: undefined })] }),
    snapshot({ updates: [official({ sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/5/view.do?monday=2026.09.28' })] }),
    snapshot({ updates: [official({ sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.29' })] }),
    snapshot({ updates: [official({ validFrom: '2026-10-05', validThrough: '2026-10-05' })] }),
  ];
  for (const value of cases) {
    const response = await publish(f.url, value);
    assert.equal(response.status, 422); assert.ok(!(await response.text()).includes(privateValue));
  }
  assert.deepEqual(await (await fetch(f.url + route)).json(), emptyCommunitySnapshot());
  await assert.rejects(fs.stat(f.communityFile), { code: 'ENOENT' });
});

test('community request bytes and UTF-8 are bounded before parsing; invalid requests do not publish', async t => {
  const f = await fixture(t);
  const headers = { ...auth, 'Content-Type': 'application/json', 'If-Match': tag(1) };
  for (const [body, status] of [[' '.repeat(MAX_COMMUNITY_BYTES + 1), 413], ['{broken', 400], [Buffer.from([0xff, 0xfe]), 400]]) {
    assert.equal((await fetch(f.url + administrative, { method: 'PUT', headers, body })).status, status);
  }
  assert.equal((await publish(f.url, snapshot(), 1, { 'Content-Type': 'text/plain' })).status, 415);
  assert.deepEqual(await (await fetch(f.url + route)).json(), emptyCommunitySnapshot());
});

test('explicit public projection drops all extra fields even before schema validation is considered', () => {
  const clean = snapshot({ updates: [record(), official()] });
  const dirty = { ...clean, collectorToken: 'private', rawResponse: 'private', updates: clean.updates.map(value => ({ ...value, rawHtml: 'private', summary: { ...value.summary, privateNotes: 'private' } })) };
  assert.deepEqual(publicCommunitySnapshot(dirty), clean);
  const detached = publicCommunitySnapshot(clean); detached.updates[0].summary.en = 'Changed by caller';
  assert.equal(clean.updates[0].summary.en, record().summary.en);
});

test('invalid stored snapshots fail startup instead of publishing an empty replacement', async t => {
  const directory = await temporaryDirectory(t), file = path.join(directory, 'community.json');
  for (const text of ['{broken', JSON.stringify(snapshot({ rawData: 'private' })), ' '.repeat(MAX_COMMUNITY_BYTES + 1)]) {
    await fs.writeFile(file, text);
    await assert.rejects(createContentServer({ file: path.join(directory, 'campus.json'), communityFile: file, adminToken: token }), /Stored community snapshot invalid/);
    assert.equal(await fs.readFile(file, 'utf8'), text);
  }
  await assert.rejects(createContentServer({ file, communityFile: file, adminToken: token }), /separate files/);
});

test('failed atomic rename preserves the in-memory revision and the publication queue can recover', async t => {
  const f = await fixture(t);
  await fs.mkdir(f.communityFile);
  assert.equal((await publish(f.url, snapshot())).status, 500);
  assert.deepEqual(await (await fetch(f.url + route)).json(), emptyCommunitySnapshot());
  assert.deepEqual(await fs.readdir(f.directory), ['community.json']);
  await fs.rmdir(f.communityFile);
  assert.equal((await publish(f.url, snapshot())).status, 200);
  assert.deepEqual(await (await fetch(f.url + route)).json(), snapshot());
});

test('community CLI gets a new review copy, validates before publishing and uses ETag/version protection', async t => {
  const f = await fixture(t), file = path.join(f.directory, 'review.json');
  const environment = { CONTENT_SERVER_URL: f.url, ADMIN_TOKEN: token };
  const output = []; t.mock.method(console, 'log', text => output.push(text));
  await admin(['community-get', file], environment);
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), emptyCommunitySnapshot());
  await assert.rejects(admin(['community-get', file], environment), { code: 'EEXIST' });
  await fs.writeFile(file, JSON.stringify(snapshot()));
  await admin(['community-publish', file], environment);
  assert.deepEqual(await (await fetch(f.url + route)).json(), snapshot());
  await assert.rejects(admin(['community-publish', file], environment), /HTTP 409/);
  await fs.writeFile(file, JSON.stringify(snapshot({ version: 3, secret: 'PRIVATE_SENTINEL' })));
  await assert.rejects(admin(['community-publish', file], environment), /unsupported fields/);
  assert.ok(!JSON.stringify(output).includes(token)); assert.ok(!JSON.stringify(output).includes('PRIVATE_SENTINEL'));
  await assert.rejects(admin(['community-get', file], { ...environment, CONTENT_SERVER_URL: 'http://remote.invalid' }), /HTTPS/);
});
