'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { SOURCES, MAX_BYTES, mondayForKst, readPrevious, mergeCollection, run, parseArgs } = require('../scripts/update-official-menu-feed.cjs');
const { officialMenuUrl } = require('../scripts/import-community.cjs');
const { TITLES, HEADERS } = require('../scripts/collect-mju-menus.cjs');

const MONDAY = '2026-11-02';
const OBSERVED = '2026-11-02T22:00:00.000Z';
const CHECKED = '2026-11-03T02:00:00.000Z';
const NOW = Date.parse('2026-11-03T02:01:00.000Z');
const text = '합성 음식 A\n합성 음식 B';

function temp(t) {
  const base = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(base, 'mce-official-feed-'));
  t.after(() => {
    const actual = fs.realpathSync(directory);
    assert.equal(path.dirname(actual).toLowerCase(), base.toLowerCase());
    assert.match(path.basename(actual), /^mce-official-feed-/);
    fs.rmSync(actual, { recursive: true });
  });
  return directory;
}
function auto(sourceId = SOURCES[0], extra = {}) {
  return { id: `${sourceId}-${MONDAY}-lunch`, sourceId, kind: 'menu', originalLanguage: 'ko',
    originalText: text, meal: 'lunch', sourceUrl: officialMenuUrl(sourceId, MONDAY),
    publishedAt: null, reviewedAt: null, observedAt: OBSERVED, validatedAt: CHECKED,
    validFrom: MONDAY, validThrough: MONDAY, ...extra };
}
function snapshot(updates = SOURCES.map(id => auto(id)), version = 7) {
  return { schemaVersion: 1, campusId: 'yongin', version, updatedAt: CHECKED, updates };
}
function candidate(sourceId, extra = {}) {
  return { id: `${sourceId}-${MONDAY}-lunch`, sourceId, kind: 'menu',
    sourceUrl: officialMenuUrl(sourceId, MONDAY), observedAt: OBSERVED, publishedAt: null, reviewedAt: null,
    validFrom: MONDAY, validThrough: MONDAY, meal: 'lunch', originalTitle: '합성 제목',
    originalText: text, otherInfo: '합성 가격 5,000원', ...extra };
}
function collection(directory, options = {}) {
  fs.mkdirSync(directory, { recursive: true });
  const results = SOURCES.map(sourceId => {
    const mode = options[sourceId] || 'ok';
    if (typeof mode === 'string' && !['ok', 'empty'].includes(mode)) {
      return { sourceId, sourceUrl: officialMenuUrl(sourceId, MONDAY), status: 'fetch-error', errorCode: mode };
    }
    const candidates = mode === 'empty' ? [] : [candidate(sourceId, typeof mode === 'object' ? mode : {})];
    const emptyRows = mode === 'empty' ? [{ date: MONDAY, meal: 'lunch' }] : [];
    const status = candidates.length ? 'candidates' : 'no-records';
    const data = { schemaVersion: 1, reviewState: 'unreviewed', sourceId, sourceUrl: officialMenuUrl(sourceId, MONDAY),
      weekMonday: MONDAY, weekThrough: '2026-11-08', observedAt: OBSERVED, publishedAt: null, status, candidates, emptyRows };
    const filename = `${sourceId}.candidates.json`;
    fs.writeFileSync(path.join(directory, filename), JSON.stringify(data));
    return { sourceId, sourceUrl: data.sourceUrl, status, mode: 'public-get', observedAt: OBSERVED, validatedAt: CHECKED,
      candidateCount: candidates.length, emptyCount: emptyRows.length, candidatesFile: filename };
  });
  return { outputDir: directory, manifest: { monday: MONDAY, results } };
}

test('automatic publication chooses the current Monday in Asia/Seoul across UTC and year boundaries', () => {
  assert.equal(mondayForKst(Date.parse('2026-11-01T14:59:59Z')), '2026-10-26');
  assert.equal(mondayForKst(Date.parse('2026-11-01T15:00:00Z')), '2026-11-02');
  assert.equal(mondayForKst(Date.parse('2026-12-31T16:00:00Z')), '2026-12-28');
  assert.equal(mondayForKst(Date.parse('2027-01-03T15:00:00Z')), '2027-01-04');
  assert.throws(() => mondayForKst(NaN), /evaluation time/);
});

test('new feed preserves original Korean fields and does not create human review or translations', t => {
  const result = mergeCollection(null, collection(temp(t)), MONDAY, NOW);
  assert.equal(result.outcome, 'updated');
  assert.equal(result.snapshot.version, NOW);
  assert.equal(result.snapshot.updates.length, 3);
  const record = result.snapshot.updates[0];
  assert.equal(record.originalText, `합성 제목\n${text}\n합성 가격 5,000원`);
  assert.equal(record.originalLanguage, 'ko');
  assert.equal(record.reviewedAt, null);
  assert.equal(record.publishedAt, null);
  assert.equal('summary' in record, false);
  assert.equal(record.observedAt, OBSERVED);
  assert.equal(record.validatedAt, CHECKED);
});

test('partial failure retains all previous records and original timestamps for only the failed source', t => {
  const previous = snapshot();
  const failed = SOURCES[1];
  const result = mergeCollection(previous, collection(temp(t), { [failed]: 'TIMEOUT' }), MONDAY, NOW);
  assert.equal(result.outcome, 'partial');
  assert.equal(result.snapshot.version, NOW);
  assert.ok(result.snapshot.version > previous.version);
  assert.deepEqual(result.snapshot.updates.find(record => record.sourceId === failed), previous.updates[1]);
  assert.equal(result.states.find(record => record.sourceId === failed).errorCode, 'TIMEOUT');
  assert.match(result.snapshot.updates.find(record => record.sourceId === SOURCES[0]).originalText, /합성 제목/);
});

test('explicit valid empty rows replace old menus without asserting that the cafeteria is closed', t => {
  const sourceId = SOURCES[0];
  const result = mergeCollection(snapshot(), collection(temp(t), { [sourceId]: 'empty' }), MONDAY, NOW);
  assert.equal(result.snapshot.updates.some(record => record.sourceId === sourceId), false);
  assert.deepEqual(result.states.find(record => record.sourceId === sourceId), { sourceId, state: 'no-records', recordCount: 0 });
  assert.equal(JSON.stringify(result.snapshot).includes('closed'), false);
});

test('one unsafe or oversized row rejects the whole source without silently shortening its original text', t => {
  const sourceId = SOURCES[0], previous = snapshot();
  for (const [index, originalText] of ['가'.repeat(6001), '음식 <script>bad()</script>', '음식 https://outside.invalid/', '음식\u0001'].entries()) {
    const directory = path.join(temp(t), String(index));
    const result = mergeCollection(previous, collection(directory, { [sourceId]: { originalText } }), MONDAY, NOW);
    assert.deepEqual(result.snapshot.updates.find(record => record.sourceId === sourceId), previous.updates[0]);
    assert.equal(result.states.find(record => record.sourceId === sourceId).errorCode, 'PUBLIC_VALIDATION');
  }
});

test('a forged candidate week, source, review or observation never becomes a public automatic record', t => {
  const sourceId = SOURCES[0], previous = snapshot();
  for (const [index, mutation] of [
    { sourceId: SOURCES[1] }, { sourceUrl: 'https://outside.invalid/' }, { reviewedAt: CHECKED },
    { observedAt: CHECKED }, { meal: 'unknown' }, { validThrough: '2026-11-03' },
    { originalText: text, originalTitle: '' , otherInfo: '', validFrom: '2026-11-10', validThrough: '2026-11-10', id: `${sourceId}-2026-11-10-lunch` },
  ].entries()) {
    const result = mergeCollection(previous, collection(path.join(temp(t), String(index)), { [sourceId]: mutation }), MONDAY, NOW);
    assert.deepEqual(result.snapshot.updates.find(record => record.sourceId === sourceId), previous.updates[0]);
  }
});

test('a missing or duplicate result is a source failure and does not clear its saved records', t => {
  const previous = snapshot(), data = collection(temp(t));
  data.manifest.results = [data.manifest.results[0], data.manifest.results[0], data.manifest.results[2]];
  const result = mergeCollection(previous, data, MONDAY, NOW);
  assert.equal(result.succeeded, 1);
  for (const sourceId of SOURCES.slice(0, 2)) assert.deepEqual(result.snapshot.updates.find(record => record.sourceId === sourceId), previous.updates.find(record => record.sourceId === sourceId));
});

test('an empty result with future or reversed source-check timestamps cannot erase old menus', t => {
  const previous = snapshot();
  for (const validatedAt of ['2026-11-04T00:00:00Z', '2026-11-01T00:00:00Z']) {
    const data = collection(temp(t), { [SOURCES[0]]: 'empty' });
    data.manifest.results[0].validatedAt = validatedAt;
    const result = mergeCollection(previous, data, MONDAY, NOW);
    assert.deepEqual(result.snapshot.updates.find(record => record.sourceId === SOURCES[0]), previous.updates[0]);
    assert.equal(result.states[0].errorCode, 'CANDIDATES_INVALID');
  }
});

test('total failure keeps previous feed bytes exactly and returns a nonzero status', async t => {
  const directory = temp(t), previousFile = path.join(directory, 'previous.json'), output = path.join(directory, 'staging/yongin.json');
  const bytes = Buffer.from(JSON.stringify(snapshot(), null, 4) + '\r\n');
  fs.writeFileSync(previousFile, bytes);
  const result = await run({ previous: previousFile, output, captureDir: path.join(directory, 'capture'),
    now: () => NOW, collect: async () => collection(path.join(directory, 'capture'), Object.fromEntries(SOURCES.map(id => [id, 'NETWORK']))) });
  assert.equal(result.exitCode, 1);
  assert.equal(result.changed, false);
  assert.deepEqual(fs.readFileSync(output), bytes);
  assert.deepEqual(fs.readFileSync(previousFile), bytes);
  assert.equal(result.snapshot.version, 7);
});

test('initial total failure creates no fabricated feed', async t => {
  const directory = temp(t), output = path.join(directory, 'feed.json');
  const result = await run({ initial: true, output, captureDir: path.join(directory, 'capture'), now: () => NOW,
    collect: async () => collection(path.join(directory, 'capture'), Object.fromEntries(SOURCES.map(id => [id, 'HTML_FORMAT']))) });
  assert.equal(result.exitCode, 1);
  assert.equal(result.outcome, 'unavailable');
  assert.equal(fs.existsSync(output), false);
});

test('missing, corrupted, oversized, wrong-campus and future previous feeds abort before any collection', async t => {
  const directory = temp(t), file = path.join(directory, 'previous.json'), output = path.join(directory, 'out.json');
  let calls = 0;
  const options = { previous: file, output, captureDir: path.join(directory, 'capture'), now: () => NOW, collect: async () => { calls++; throw new Error('must not collect'); } };
  await assert.rejects(run(options));
  for (const bytes of [Buffer.from('{'), Buffer.alloc(MAX_BYTES + 1), Buffer.from([0xc3, 0x28]),
    Buffer.from(JSON.stringify({ ...snapshot(), campusId: 'seoul' })),
    Buffer.from(JSON.stringify({ ...snapshot(), updatedAt: '2026-11-04T00:00:00Z' }))]) {
    fs.writeFileSync(file, bytes);
    await assert.rejects(run(options));
    assert.deepEqual(fs.readFileSync(file), bytes);
  }
  assert.equal(calls, 0);
  assert.equal(fs.existsSync(output), false);
});

test('valid legacy reviewed announcements survive an official-menu refresh unchanged', t => {
  const human = { id: 'reviewed-fixture', sourceId: 'o_ulami', kind: 'announcement',
    summary: { en: 'Synthetic notice', ko: '합성 공지', zh: '合成通知' },
    sourceUrl: 'https://www.instagram.com/o_ulami/p/fixture/', publishedAt: OBSERVED, reviewedAt: CHECKED,
    validFrom: MONDAY, validThrough: '2026-11-08' };
  const result = mergeCollection(snapshot([human, auto()]), collection(temp(t)), MONDAY, NOW);
  assert.deepEqual(result.snapshot.updates.find(record => record.id === human.id), human);
});

test('revision overflow refuses publication instead of rolling version backwards', t => {
  const previous = snapshot(undefined, Number.MAX_SAFE_INTEGER);
  assert.throws(() => mergeCollection(previous, collection(temp(t)), MONDAY, NOW), /Merged public feed/);
});

test('revisions advance beyond both legacy counters and the prior accepted timestamp revision', t => {
  const data = collection(temp(t));
  const first = mergeCollection(snapshot(), data, MONDAY, NOW);
  const second = mergeCollection(first.snapshot, data, MONDAY, NOW);
  assert.equal(first.snapshot.version, NOW);
  assert.equal(second.snapshot.version, NOW + 1);
  const stalePrevious = mergeCollection(snapshot(), data, MONDAY, NOW + 1000);
  assert.equal(stalePrevious.snapshot.version, NOW + 1000);
});

test('successful run writes a validated feed atomically and a separate source-level status report', async t => {
  const directory = temp(t), output = path.join(directory, 'site/menus/yongin.json'), status = path.join(directory, 'status.json');
  const result = await run({ initial: true, output, status, captureDir: path.join(directory, 'capture'), now: () => NOW,
    collect: async () => collection(path.join(directory, 'capture'), { [SOURCES[1]]: 'HTTP_STATUS' }) });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(readPrevious(output, NOW).snapshot, result.snapshot);
  const report = JSON.parse(fs.readFileSync(status));
  assert.equal(report.timeZone, 'Asia/Seoul');
  assert.equal(report.outcome, 'partial');
  assert.equal(report.sources[1].state, 'unavailable');
  assert.equal(report.sources[1].errorCode, 'HTTP_STATUS');
  assert.equal(fs.readdirSync(path.dirname(output)).some(name => name.includes('.tmp-')), false);
});

test('CLI requires explicit initial mode or an existing previous snapshot and accepts only named paths', async t => {
  assert.deepEqual(parseArgs(['--previous', 'old.json', '--output', 'new.json', '--capture-dir', 'capture', '--status', 'status.json']),
    { previous: 'old.json', initial: undefined, output: 'new.json', captureDir: 'capture', cacheDir: undefined, status: 'status.json' });
  assert.throws(() => parseArgs(['--previous', 'one', '--previous', 'two']), /Duplicate/);
  assert.throws(() => parseArgs(['--monday', MONDAY]), /Unsupported/);
  const directory = temp(t);
  await assert.rejects(run({ output: path.join(directory, 'out'), captureDir: path.join(directory, 'capture') }), /Choose an existing/);
  await assert.rejects(run({ initial: true, previous: 'old', output: 'out', captureDir: 'capture' }), /Choose an existing/);
});

test('real collector/parser can generate the feed from bounded synthetic official responses', async t => {
  const directory = temp(t), started = Date.now(), monday = mondayForKst(started);
  const through = new Date(Date.parse(monday + 'T00:00:00Z') + 6 * 86400000).toISOString().slice(0, 10);
  const short = value => value.slice(5).replace('-', '.');
  const request = (url, config, callback) => {
    assert.equal(config.method, 'GET');
    const sourceId = SOURCES.find(id => officialMenuUrl(id, monday) === url);
    assert.ok(sourceId);
    const endpoint = url.match(/mjukr\/(\d)\//)[1];
    const body = `<div id="_JW_diet_basic"><p class="title">${TITLES[sourceId]}</p><p class="date">${short(monday)} ~ ${short(through)}</p><form id="viewForm" action="/diet/mjukr/${endpoint}/view.do"><input name="monday" value="${monday.replaceAll('-', '.')}"><table><caption>일주일간 식단 안내</caption><thead><tr>${HEADERS.map(value => `<th>${value}</th>`).join('')}</tr></thead><tbody><tr><th>${short(monday)} (월)</th><td>중식</td><td>합성 제목</td><td>합성 음식</td><td>-</td></tr></tbody></table></form></div>`;
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => queueMicrotask(() => {
      const response = Readable.from([Buffer.from(body)]);
      response.statusCode = 200;
      response.headers = { 'content-type': 'text/html; charset=UTF-8' };
      callback(response);
    });
    return req;
  };
  const result = await run({ initial: true, output: path.join(directory, 'feed.json'), captureDir: path.join(directory, 'capture'),
    cacheDir: path.join(directory, 'cache'), fetchOptions: { request } });
  assert.equal(result.exitCode, 0);
  assert.equal(result.snapshot.updates.length, 3);
  assert.ok(result.snapshot.updates.every(record => record.originalText === '합성 제목\n합성 음식\n-'));
});
