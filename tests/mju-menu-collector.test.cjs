'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { MAX_HTML_BYTES, parseMenuHtml, fetchOfficialMenu, makeCandidates, collect, parseArgs, cachePath, readCache } = require('../scripts/collect-mju-menus.cjs');
const { officialMenuUrl, validateDocument } = require('../scripts/import-community.cjs');

const SOURCE = 'mju-menu-student';
const URL = officialMenuUrl(SOURCE, '2026-09-28');
const title = '자연캠퍼스 학생회관 식당(Student Union Restaurant)';
const row = '<tr><th rowspan="2">09.28 (월)</th><td>조식</td><td>-</td><td class="alignL">합성 음식 A<br/>합성 음식 B &amp; C</td><td>-</td></tr><tr><td>중식</td><td>-</td><td class="alignL">합성 음식 D</td><td>-</td></tr>';
const emptyRow = '<tr><th rowspan="2">09.28 <br> ( 월 )</th><td>조식</td><td colspan="3">등록된 식단내용이(가) 없습니다.</td></tr><tr><td>중식</td><td colspan="3">등록된 식단내용이(가) 없습니다.</td></tr>';
// Synthetic minimal fixture based on the public table structure, not copied menus.
function html(rows = row) {
  return `<html><body><div id="_JW_diet_basic"><p class="title">${title}</p><p class="date">09.28 ~ 10.04</p><form id="viewForm" action="/diet/mjukr/5/view.do"><input type="hidden" name="monday" value="2026.09.28"><table><caption>일주일간 식단 안내</caption><thead><tr><th>요일</th><th>식단구분</th><th>식단제목</th><th>식단내용</th><th>기타정보</th></tr></thead><tbody>${rows}</tbody></table></form></div></body></html>`;
}
function mockRequest(options = {}) {
  const calls = [];
  const request = (url, config, callback) => {
    calls.push({ url, config });
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => queueMicrotask(() => {
      if (options.hang) return;
      if (options.error) { req.emit('error', new Error('sensitive remote error')); return; }
      const response = Readable.from(options.chunks || [Buffer.from(html())]);
      response.statusCode = options.status ?? 200;
      response.headers = options.headers || { 'content-type': 'text/html; charset=UTF-8' };
      callback(response);
    });
    return req;
  };
  return { request, calls };
}
function temp(t) {
  const base = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(base, 'mce-menu-collector-'));
  t.after(() => {
    const actual = fs.realpathSync(directory);
    assert.equal(path.dirname(actual).toLowerCase(), base.toLowerCase());
    assert.match(path.basename(actual), /^mce-menu-collector-/);
    fs.rmSync(actual, { recursive: true });
  });
  return directory;
}

test('actual table shape carries rowspan dates and parses meal/content separately', () => {
  const result = parseMenuHtml(html(), SOURCE, URL);
  assert.equal(result.status, 'candidates');
  assert.equal(result.records.length, 2);
  assert.deepEqual(result.records.map(value => [value.date, value.meal]), [['2026-09-28', 'breakfast'], ['2026-09-28', 'lunch']]);
  assert.equal(result.records[0].originalText, '합성 음식 A\n합성 음식 B & C');
});

test('explicit empty rows are no-records; missing table, error and login HTML are failures', () => {
  const result = parseMenuHtml(html(emptyRow), SOURCE, URL);
  assert.equal(result.status, 'no-records');
  assert.equal(result.emptyRows.length, 2);
  for (const value of ['', '<html>Login required</html>', '<h1>Service unavailable</h1>', html(''), html(emptyRow).replace('등록된 식단내용이(가) 없습니다.', 'Unknown status')]) assert.throws(() => parseMenuHtml(value, SOURCE, URL), /Missing|Expected|Unexpected|Unrecognized/);
});

test('source, hidden Monday, displayed range, weekday and date must all agree', () => {
  for (const value of [
    html().replace('/diet/mjukr/5/view.do', '/diet/mjukr/4/view.do'),
    html().replace('value="2026.09.28"', 'value="2026.10.05"'),
    html().replace('09.28 ~ 10.04', '10.05 ~ 10.11'),
    html().replace('09.28 (월)', '09.28 (화)'),
    html().replace('09.28 (월)', '10.05 (월)'),
    html().replace(title, 'Different cafeteria'),
    html().replace('식단내용</th>', 'Different column</th>'),
  ]) assert.throws(() => parseMenuHtml(value, SOURCE, URL));
});

test('malformed spans, ambiguous duplicate meals, unknown markup and invalid UTF8 fail closed', () => {
  for (const value of [html().replace('rowspan="2"', 'rowspan="3"'), html().replace('rowspan="2"', 'rowspan="0"'), html().replace('<td>중식</td>', '<td>조식</td>'), html().replace('합성 음식 D', '<script>run()</script>'), html().replace('합성 음식 D', '<img src="private">'), html().replace('합성 음식 D', '&unsupported;')]) assert.throws(() => parseMenuHtml(value, SOURCE, URL));
  assert.throws(() => parseMenuHtml(Buffer.from([0xc3, 0x28]), SOURCE, URL), /UTF-8/);
  assert.throws(() => parseMenuHtml(Buffer.alloc(MAX_HTML_BYTES + 1), SOURCE, URL), /byte limit/);
});

test('year boundary derives each date from requested week instead of current year', () => {
  const value = html().replaceAll('2026.09.28', '2026.12.28').replace('09.28 ~ 10.04', '12.28 ~ 01.03').replace('09.28 (월)', '01.01 (금)');
  const result = parseMenuHtml(value, SOURCE, officialMenuUrl(SOURCE, '2026-12-28'));
  assert.equal(result.records[0].date, '2027-01-01');
  assert.equal(result.weekThrough, '2027-01-03');
});

test('unreviewed candidates preserve unknown publication and cannot be imported as approved records', () => {
  const parsed = parseMenuHtml(html(), SOURCE, URL);
  const result = makeCandidates(parsed, SOURCE, URL, '2026-10-05T00:00:00Z');
  assert.equal(result.reviewState, 'unreviewed');
  assert.equal(result.temporalState, 'past');
  assert.equal(result.candidates[0].publishedAt, null);
  assert.equal(result.candidates[0].reviewedAt, null);
  assert.deepEqual(result.candidates[0].summary, { en: null, ko: null, zh: null });
  assert.throws(() => validateDocument({ schemaVersion: 1, updates: result.candidates }), /unsupported fields/);
});

test('network fetch only uses allowlisted HTTPS GET with no cookie, auth or redirect following', async () => {
  const mock = mockRequest();
  const result = await fetchOfficialMenu(SOURCE, '2026-09-28', mock);
  assert.equal(result.statusCode, 200);
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].url, URL);
  assert.equal(mock.calls[0].config.method, 'GET');
  assert.equal(Object.keys(mock.calls[0].config.headers).some(value => /cookie|authorization/i.test(value)), false);
  const redirect = mockRequest({ status: 302, headers: { location: 'https://outside.invalid/private' } });
  await assert.rejects(fetchOfficialMenu(SOURCE, '2026-09-28', redirect), error => error.code === 'REDIRECT');
  assert.equal(redirect.calls.length, 1);
  assert.throws(() => fetchOfficialMenu('unlisted', '2026-09-28', mock), /unknown/);
  assert.throws(() => fetchOfficialMenu(SOURCE, '2026-09-29', mock), /Monday/);
});

test('network failure, timeout, size and content type never become empty menus', async () => {
  for (const [options, code] of [
    [{ error: true }, 'NETWORK'], [{ hang: true }, 'TIMEOUT'], [{ status: 403 }, 'HTTP_STATUS'],
    [{ headers: { 'content-type': 'application/json' } }, 'CONTENT_TYPE'],
    [{ headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' } }, 'CONTENT_TYPE'],
    [{ headers: { 'content-type': 'text/html', 'content-length': String(MAX_HTML_BYTES + 1) } }, 'BODY_LIMIT'],
    [{ chunks: [Buffer.alloc(MAX_HTML_BYTES), Buffer.from('x')] }, 'BODY_LIMIT'],
  ]) await assert.rejects(fetchOfficialMenu(SOURCE, '2026-09-28', { ...mockRequest(options), timeoutMs: 20 }), error => error.code === code);
});

test('collection stores private capture/provenance and refuses to overwrite prior evidence', async t => {
  const directory = temp(t), outputDir = path.join(directory, 'capture');
  const result = await collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir, fetchOptions: mockRequest() });
  assert.equal(result.manifest.results[0].status, 'candidates');
  assert.equal(result.manifest.results[0].candidateCount, 2);
  assert.match(result.manifest.results[0].rawSha256, /^[a-f0-9]{64}$/);
  assert.equal(fs.existsSync(path.join(outputDir, `${SOURCE}.html`)), true);
  const candidates = JSON.parse(fs.readFileSync(path.join(outputDir, `${SOURCE}.candidates.json`)));
  assert.equal(candidates.reviewState, 'unreviewed');
  await assert.rejects(collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir, fetchOptions: mockRequest() }), /EEXIST/);
});

test('manifest distinguishes real no-records, parse-error and fetch-error', async t => {
  const directory = temp(t);
  for (const [name, options, status] of [
    ['empty', { chunks: [Buffer.from(html(emptyRow))] }, 'no-records'],
    ['format', { chunks: [Buffer.from('<html>Login</html>')] }, 'parse-error'],
    ['network', { status: 503 }, 'fetch-error'],
  ]) {
    const result = await collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), fetchOptions: mockRequest(options) });
    assert.equal(result.manifest.results[0].status, status);
    if (status.endsWith('error')) assert.equal(result.manifest.results[0].candidateCount, undefined);
  }
});

test('CLI requires an explicit Monday and local fixture source, rejecting arbitrary URLs', () => {
  for (const args of [[], ['--monday', '2026-09-29'], ['--monday', '2026-09-28', '--url', 'https://other.invalid'], ['--monday', '2026-09-28', '--source', 'unknown'], ['--monday', '2026-09-28', '--html', 'capture.html']]) assert.throws(() => parseArgs(args));
  assert.deepEqual(parseArgs(['--help']), { help: true });
  assert.equal(parseArgs(['--monday', '2026-09-28']).monday, '2026-09-28');
});


test('ETag and Last-Modified conditionals accept bounded headers and 304 has no body', async () => {
  const etag = mockRequest({ status: 304, headers: { etag: '"one"' }, chunks: [] });
  const result = await fetchOfficialMenu(SOURCE, '2026-09-28', { ...etag, etag: '"one"', lastModified: 'Mon, 28 Sep 2026 01:00:00 GMT' });
  assert.equal(etag.calls[0].config.headers['If-None-Match'], '"one"');
  assert.equal(etag.calls[0].config.headers['If-Modified-Since'], undefined);
  assert.equal(result.statusCode, 304);
  assert.equal(result.bytes.length, 0);
  assert.equal(result.responseBodyBytes, 0);
  const modified = mockRequest();
  await fetchOfficialMenu(SOURCE, '2026-09-28', { ...modified, lastModified: 'Mon, 28 Sep 2026 01:00:00 GMT' });
  assert.equal(modified.calls[0].config.headers['If-Modified-Since'], 'Mon, 28 Sep 2026 01:00:00 GMT');
  const malicious = mockRequest();
  await fetchOfficialMenu(SOURCE, '2026-09-28', { ...malicious, etag: '"x"\r\nCookie: secret', lastModified: 'bad\r\nAuthorization: secret' });
  assert.equal(malicious.calls[0].config.headers['If-None-Match'], undefined);
  assert.equal(malicious.calls[0].config.headers['If-Modified-Since'], undefined);
  await assert.rejects(fetchOfficialMenu(SOURCE, '2026-09-28', mockRequest({ status: 304, chunks: [] })), /HTTP 304/);
});

test('persisted cache revalidates 304 across explicit runs without inventing new body observation', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const run = (name, fetchOptions) => collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), cacheDir, fetchOptions });
  const first = await run('first', mockRequest({ headers: { 'content-type': 'text/html', etag: '"first"' } }));
  const saved = readCache(cacheDir, SOURCE, '2026-09-28');
  assert.equal(saved.state, 'available');
  const secondMock = mockRequest({ status: 304, headers: { etag: '"first"' }, chunks: [] });
  const second = await run('second', secondMock);
  const initial = first.manifest.results[0], repeated = second.manifest.results[0];
  assert.equal(secondMock.calls[0].config.headers['If-None-Match'], '"first"');
  assert.equal(repeated.cacheReuse, 'revalidated-body');
  assert.equal(repeated.responseBodyBytes, 0);
  assert.equal(repeated.rawSha256, initial.rawSha256);
  assert.equal(repeated.observedAt, initial.observedAt);
  assert.equal(repeated.contentChanged, false);
  assert.equal(fs.readFileSync(path.join(directory, 'first', `${SOURCE}.html`), 'utf8'), fs.readFileSync(path.join(directory, 'second', `${SOURCE}.html`), 'utf8'));
  assert.equal(fs.existsSync(path.join(cacheDir, 'collector.lock')), false);
});

test('changed HTML invalidates cache; identical unconditional body claims no network savings', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const run = (name, fetchOptions) => collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), cacheDir, fetchOptions });
  await run('first', mockRequest());
  const unchanged = await run('unchanged', mockRequest());
  assert.equal(unchanged.manifest.results[0].cacheReuse, 'same-body-downloaded');
  assert.equal(unchanged.manifest.results[0].responseBodyBytes, Buffer.byteLength(html()));
  assert.equal(unchanged.manifest.results[0].conditionalRequest, false);
  const changed = await run('changed', mockRequest({ chunks: [Buffer.from(html().replace('A<br/>', 'changed A<br/>'))] }));
  assert.equal(changed.manifest.results[0].contentChanged, true);
  assert.equal(changed.manifest.results[0].cacheReuse, 'none');
  assert.equal(readCache(cacheDir, SOURCE, '2026-09-28').entry.rawSha256, changed.manifest.results[0].rawSha256);
});

test('network failure retains old cache as evidence but produces no fresh candidates', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  await collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, 'first'), cacheDir, fetchOptions: mockRequest() });
  const original = fs.readFileSync(cachePath(cacheDir, SOURCE, '2026-09-28'), 'utf8');
  const failure = await collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, 'failure'), cacheDir, fetchOptions: mockRequest({ error: true }) });
  assert.equal(failure.manifest.results[0].status, 'fetch-error');
  assert.equal(failure.manifest.results[0].observedAt, null);
  assert.equal(failure.manifest.results[0].candidateCount, undefined);
  assert.equal(fs.existsSync(path.join(directory, 'failure', `${SOURCE}.candidates.json`)), false);
  assert.equal(fs.readFileSync(cachePath(cacheDir, SOURCE, '2026-09-28'), 'utf8'), original);
});

test('corrupt cache triggers unconditional fetch; different weeks never share validators', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const run = (name, fetchOptions) => collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), cacheDir, fetchOptions });
  await run('first', mockRequest({ headers: { 'content-type': 'text/html', etag: '"first"' } }));
  const file = cachePath(cacheDir, SOURCE, '2026-09-28');
  const corrupt = JSON.parse(fs.readFileSync(file));
  corrupt.rawSha256 = '0'.repeat(64);
  fs.writeFileSync(file, JSON.stringify(corrupt));
  const unconditional = mockRequest();
  const recovered = await run('recovered', unconditional);
  assert.equal(recovered.manifest.results[0].cacheState, 'invalid');
  assert.equal(unconditional.calls[0].config.headers['If-None-Match'], undefined);
  assert.equal(recovered.manifest.results[0].status, 'candidates');
  assert.equal(readCache(cacheDir, SOURCE, '2026-10-05').state, 'missing');
  assert.notEqual(cachePath(cacheDir, SOURCE, '2026-09-28'), cachePath(cacheDir, 'mju-menu-library', '2026-09-28'));
});

test('a changed invalid page fails parsing without poisoning prior valid cache', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const run = (name, fetchOptions) => collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), cacheDir, fetchOptions });
  await run('first', mockRequest());
  const original = fs.readFileSync(cachePath(cacheDir, SOURCE, '2026-09-28'), 'utf8');
  const changed = await run('invalid', mockRequest({ chunks: [Buffer.from('<html>maintenance</html>')] }));
  assert.equal(changed.manifest.results[0].status, 'parse-error');
  assert.equal(changed.manifest.results[0].candidateCount, undefined);
  assert.equal(fs.readFileSync(cachePath(cacheDir, SOURCE, '2026-09-28'), 'utf8'), original);
});

test('simultaneous collectors fail explicitly instead of overwriting a newer cache', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const first = collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, 'first'), cacheDir, fetchOptions: { ...mockRequest({ hang: true }), timeoutMs: 40 } });
  await assert.rejects(collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, 'second'), cacheDir, fetchOptions: mockRequest() }), error => error.code === 'CACHE_BUSY');
  const completed = await first;
  assert.equal(completed.manifest.results[0].errorCode, 'TIMEOUT');
  assert.equal(fs.existsSync(path.join(cacheDir, 'collector.lock')), false);
  assert.equal(fs.existsSync(path.join(directory, 'second')), false);
});

test('revalidation evaluates actual KST date independently of original observation', () => {
  const parsed = parseMenuHtml(html(), SOURCE, URL);
  const observed = '2026-09-28T01:00:00Z';
  const past = makeCandidates(parsed, SOURCE, URL, observed, Date.parse('2026-10-04T10:00:00Z'));
  assert.equal(past.temporalState, 'current');
  assert.equal(past.temporalScope, 'requested-week');
  assert.equal(past.evaluatedForKstDate, '2026-10-04');
  assert.equal(past.validTodayCount, 0);
  assert.equal(past.candidates.every(item => item.temporalState === 'past'), true);
  assert.equal(makeCandidates(parsed, SOURCE, URL, observed, Date.parse('2026-09-27T15:00:00Z')).validTodayCount, 2);
  assert.equal(makeCandidates(parsed, SOURCE, URL, observed, Date.parse('2026-09-27T14:59:59Z')).validTodayCount, 0);
});

test('local HTML is not a newly observed response and explicit cache controls remain optional', async t => {
  const directory = temp(t), local = path.join(directory, 'fixture.html');
  fs.writeFileSync(local, html());
  const result = await collect({ monday: '2026-09-28', sourceId: SOURCE, htmlFile: local, outputDir: path.join(directory, 'capture'), cacheDir: path.join(directory, 'unused-cache') });
  const manifest = result.manifest.results[0];
  const candidates = JSON.parse(fs.readFileSync(path.join(directory, 'capture', `${SOURCE}.candidates.json`)));
  assert.equal(manifest.observedAt, null);
  assert.equal(manifest.responseBodyBytes, 0);
  assert.equal(manifest.cacheState, 'disabled');
  assert.equal(candidates.candidates[0].needsReview.includes('observation-timestamp'), true);
  assert.equal(fs.existsSync(path.join(directory, 'unused-cache')), false);
  assert.equal(parseArgs(['--monday', '2026-09-28', '--no-cache']).cacheDir, null);
  assert.equal(parseArgs(['--no-cache', '--monday', '2026-09-28']).cacheDir, null);
  assert.equal(parseArgs(['--monday', '2026-09-28', '--cache-dir', 'custom']).cacheDir, 'custom');
  assert.throws(() => parseArgs(['--monday', '2026-09-28', '--cache-dir', 'custom', '--no-cache']));
  assert.throws(() => parseArgs(['--monday', '2026-09-28', '--no-cache', '--no-cache']));
});


test('mismatched 304 ETag fails closed while equivalent weak validators remain valid', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const run = (name, fetchOptions) => collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), cacheDir, fetchOptions });
  await run('first', mockRequest({ headers: { 'content-type': 'text/html', etag: '"original"' } }));
  const file = cachePath(cacheDir, SOURCE, '2026-09-28');
  const original = fs.readFileSync(file, 'utf8');
  for (const [name, etag] of [['different', '"different"'], ['malformed', 'not-an-etag']]) {
    const rejected = await run(name, mockRequest({ status: 304, headers: { etag }, chunks: [] }));
    assert.equal(rejected.manifest.results[0].status, 'fetch-error');
    assert.equal(rejected.manifest.results[0].errorCode, 'CACHE_VALIDATOR');
    assert.equal(rejected.manifest.results[0].observedAt, null);
    assert.equal(rejected.manifest.results[0].candidateCount, undefined);
    assert.equal(fs.existsSync(path.join(directory, name, `${SOURCE}.candidates.json`)), false);
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
  const weak = await run('weak', mockRequest({ status: 304, headers: { etag: 'W/"original"' }, chunks: [] }));
  assert.equal(weak.manifest.results[0].cacheReuse, 'revalidated-body');
  const strongMock = mockRequest({ status: 304, headers: { etag: '"original"' }, chunks: [] });
  const strong = await run('strong', strongMock);
  assert.equal(strongMock.calls[0].config.headers['If-None-Match'], 'W/"original"');
  assert.equal(strong.manifest.results[0].cacheReuse, 'revalidated-body');
});

test('menu hash ignores unrelated outer asset cache-busters but detects changed meal content', async t => {
  const directory = temp(t), cacheDir = path.join(directory, 'cache');
  const run = (name, content) => collect({ monday: '2026-09-28', sourceId: SOURCE, outputDir: path.join(directory, name), cacheDir, fetchOptions: mockRequest({ chunks: [Buffer.from(content)] }) });
  const first = await run('first', `<link href="/public.css?v=1">${html()}`);
  const second = await run('second', `<link href="/public.css?v=2">${html()}`);
  assert.equal(second.manifest.results[0].contentChanged, true);
  assert.equal(second.manifest.results[0].menuContentChanged, false);
  assert.equal(second.manifest.results[0].menuSha256, first.manifest.results[0].menuSha256);
  const third = await run('third', `<link href="/public.css?v=2">${html().replace('A<br/>', 'new meal<br/>')}`);
  assert.equal(third.manifest.results[0].menuContentChanged, true);
  assert.notEqual(third.manifest.results[0].menuSha256, first.manifest.results[0].menuSha256);
});
