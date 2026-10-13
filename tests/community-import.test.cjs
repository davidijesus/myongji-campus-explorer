'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const { SOURCES, OFFICIAL_SOURCES, LIMITS, DEFAULT_OUTPUT, parseTimestamp, parseDay, parseInput, officialMenuUrl, validateDocument, validateSnapshot, renderModule, parseArgs, importFile } = require('../scripts/import-community.cjs');
const instagramSources = Object.entries(SOURCES).filter(([source]) => !Object.hasOwn(OFFICIAL_SOURCES, source));

// Synthetic fixtures only; these URLs are not assertions that a real post exists.
const NOW = Date.parse('2026-10-04T15:00:00Z');
const fixture = (changes = {}) => ({
  id: 'synthetic-test-record', sourceId: 'mjhs_lounge', kind: 'menu',
  summary: { en: 'Synthetic test summary.', ko: '합성 테스트 요약.', zh: '合成测试摘要。' },
  sourceUrl: 'https://www.instagram.com/p/SYNTHETIC_TEST/',
  publishedAt: '2026-10-04T10:00:00+09:00', reviewedAt: '2026-10-04T11:00:00+09:00',
  validFrom: '2026-10-05', validThrough: '2026-10-05', ...changes,
});
const document = (...updates) => ({ schemaVersion: 1, updates });
const validate = value => validateDocument(value, NOW);
const rejectRecord = (changes, pattern) => assert.throws(() => validate(document(fixture(changes))), pattern);

function temporaryDirectory(t) {
  const base = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(base, 'mce-community-import-'));
  t.after(() => {
    const resolved = fs.realpathSync(directory);
    assert.equal(path.dirname(resolved).toLowerCase(), base.toLowerCase());
    assert.match(path.basename(resolved), /^mce-community-import-/);
    fs.rmSync(resolved, { recursive: true });
  });
  return directory;
}

function writeInput(directory, value) {
  const input = path.join(directory, 'reviewed.json');
  fs.writeFileSync(input, JSON.stringify(value));
  return input;
}

test('empty default imports no fabricated updates', () => {
  assert.deepEqual(validate(document()), []);
  assert.match(renderModule([]), /export const COMMUNITY_UPDATES: CommunityUpdate\[\] = \[\];/);
  assert.equal(DEFAULT_OUTPUT, path.resolve(__dirname, '../build/community-review/community-updates.ts'));
});

test('exactly four guide accounts and supported kinds import with all translations', () => {
  assert.deepEqual(instagramSources.map(([source]) => source), ['o_ulami', 'mjhs_lounge', 'mju_lounge', 'mj_bokji_foodist']);
  const values = instagramSources.flatMap(([sourceId, kinds]) => kinds.map(kind => fixture({ id: `${sourceId}-${kind}`, sourceId, kind })));
  assert.deepEqual(validate(document(...values)), values);
});

test('unknown accounts, inherited keys and incompatible source kinds fail closed', () => {
  for (const sourceId of ['unlisted_account', 'constructor', '__proto__', null, 7]) rejectRecord({ sourceId }, /sourceId/);
  rejectRecord({ sourceId: 'o_ulami', kind: 'menu' }, /kind/);
  rejectRecord({ kind: 'event' }, /kind/);
});

test('strict root, record and language schema rejects unknown private fields', () => {
  assert.throws(() => validate({ schemaVersion: 1, updates: [], password: 'not-for-output' }), /unsupported fields/);
  assert.throws(() => validate({ schemaVersion: 2, updates: [] }), /schemaVersion/);
  assert.throws(() => validate([]), /JSON object/);
  assert.throws(() => validate(document(null)), /JSON object/);
  rejectRecord({ contact: 'not-for-output' }, /unsupported fields/);
  rejectRecord({ summary: { en: 'A', ko: 'B' } }, /unsupported fields/);
  rejectRecord({ summary: { en: 'A', ko: 'B', zh: 'C', privateNotes: 'not-for-output' } }, /unsupported fields/);
});

test('record count, unique IDs and ID syntax are bounded', () => {
  assert.throws(() => validate(document(...Array.from({ length: LIMITS.records + 1 }, (_, index) => fixture({ id: `id-${index}` })))), /at most/);
  assert.throws(() => validate(document(fixture(), fixture())), /duplicate ID/);
  for (const id of ['', 'space id', 'Upper', 'a'.repeat(81), null]) rejectRecord({ id }, /\.id/);
});

test('summaries reject empty, oversized, markup, control and invalid Unicode content', () => {
  for (const value of ['', ' padded ', 'a'.repeat(401), '<script>alert(1)</script>', 'line\nline', '\u0000', '\ud800']) {
    rejectRecord({ summary: { ...fixture().summary, en: value } }, /summary\.en/);
  }
  assert.equal(validate(document(fixture({ summary: { ...fixture().summary, en: 'Plain text 😀' } })))[0].summary.en, 'Plain text 😀');
});

test('obvious personal contacts, embedded links and credentials are rejected without echoing content', () => {
  for (const value of ['Email private@example.invalid', 'Call 010-1234-5678', 'Call +82 10 1234 5678', 'https://other.invalid/menu', 'www.other.invalid', 'data:image/png;base64,ABCD', 'api_key=very-secret-value', 'ghp_abcdefgh12345678']) {
    let error;
    try { validate(document(fixture({ summary: { ...fixture().summary, en: value } }))); } catch (caught) { error = caught; }
    assert.ok(error, `reject fixture ${value.slice(0, 4)}`);
    assert.equal(error.message.includes(value), false);
  }
  // A calendar date or price is not a telephone number.
  assert.equal(validate(document(fixture({ summary: { ...fixture().summary, en: 'Synthetic date 2026-10-05; price 10,000 KRW.' } }))).length, 1);
});

test('source URLs allow posts, reels and matching account-scoped Story snapshots', () => {
  for (const sourceUrl of ['https://www.instagram.com/p/A_1-/', 'https://instagram.com/reel/A_1-', 'https://www.instagram.com/mjhs_lounge/p/A_1-/', 'https://www.instagram.com/stories/mjhs_lounge/12345678901234567890123456789012/']) {
    assert.equal(validate(document(fixture({ sourceUrl })))[0].sourceUrl, sourceUrl.replace('https://instagram.com/', 'https://www.instagram.com/').replace(/\/?$/, '/'));
  }
});

test('source URLs reject wrong Story/post authors, tracking, lookalikes and unsupported paths', () => {
  const urls = [
    'https://www.instagram.com/stories/mju_lounge/123/', 'https://www.instagram.com/mju_lounge/p/ABC/',
    'https://www.instagram.com/stories/mjhs_lounge/ABC/', 'https://www.instagram.com/stories/mjhs_lounge/123456789012345678901234567890123/',
    'https://www.instagram.com/p/ABC/?igsh=tracking', 'https://www.instagram.com/p/ABC/#fragment',
    'https://www.instagram.com/mjhs_lounge/', 'https://www.instagram.com/stories/highlights/123/',
    'http://www.instagram.com/p/ABC/', 'https://www.instagram.com.attacker.invalid/p/ABC/',
    'https://user:secret@www.instagram.com/p/ABC/', 'https://www.instagram.com:444/p/ABC/',
    'https://www.instagram.com/p/%41BC/', 'https://www.instagram.com/p/../ABC/',
    'https://www.instagram.com/p/ABC/embed/', 'https://www.instagram.com/direct/inbox/',
    'https://www.instagram.com/p/' + 'A'.repeat(65) + '/',
  ];
  for (const sourceUrl of urls) rejectRecord({ sourceUrl }, /sourceUrl/);
});

test('imported URL variants survive the actual runtime filter across all account/kind pairs', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/community.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  const context = { exports: {} };
  vm.runInNewContext(compiled.outputText, context);
  const values = instagramSources.flatMap(([sourceId, kinds]) => kinds.flatMap(kind => [
    'https://instagram.com/p/SYNTHETIC_TEST',
    'https://www.instagram.com/reel/SYNTHETIC_TEST',
    `https://www.instagram.com/${sourceId}/p/SYNTHETIC_TEST/`,
    `https://instagram.com/${sourceId}/reel/SYNTHETIC_TEST`,
    `https://instagram.com/stories/${sourceId}/123456789`,
  ].map((sourceUrl, index) => fixture({ id: `${sourceId}-${kind}-${index}`, sourceId, kind, sourceUrl }))));
  const imported = validate(document(...values));
  const visible = context.exports.currentCommunityUpdates(imported, undefined, new Date(NOW));
  assert.equal(visible.length, values.length);
  for (const update of imported) assert.equal(context.exports.isCommunityPermalink(update.sourceUrl, update.sourceId), true);
});

test('timestamps require an explicit offset and reject calendar rollover and invalid times', () => {
  assert.equal(parseTimestamp('2026-10-04T10:00:00+09:00', 't'), Date.parse('2026-10-04T01:00:00Z'));
  assert.equal(parseTimestamp('2026-10-04T10:00:00.12-03:30', 't'), Date.parse('2026-10-04T13:30:00.120Z'));
  for (const timestamp of ['2026-10-04', '2026-10-04T10:00:00', '2026-02-30T10:00:00Z', '2026-13-01T10:00:00Z', '2026-10-04T24:00:00Z', '2026-10-04T10:60:00Z', '2026-10-04T10:00:60Z', '2026-10-04T10:00:00+14:01', '2026-10-04T10:00:00+09:60', '1999-01-01T00:00:00Z', null]) {
    assert.throws(() => parseTimestamp(timestamp, 't'), /^Error: t:/);
  }
});

test('future review/publication and review before publication are rejected', () => {
  rejectRecord({ publishedAt: '2026-10-06T00:00:00Z', reviewedAt: '2026-10-06T01:00:00Z' }, /future/);
  rejectRecord({ reviewedAt: '2026-10-06T01:00:00Z' }, /future/);
  rejectRecord({ reviewedAt: '2026-10-03T01:00:00Z' }, /after publication/);
  assert.throws(() => validateDocument(document(), NaN), /validation time/);
});

test('validity uses real KST calendar dates and bounded inclusive intervals', () => {
  assert.equal(parseDay('2028-02-29', 'day'), Date.UTC(2028, 1, 29));
  for (const validFrom of ['2026-02-29', '2026-04-31', '2026-00-01', '2026-10-00', '2026-1-1', '2026-10-04T00:00:00Z']) rejectRecord({ validFrom }, /validFrom/);
  rejectRecord({ validFrom: '2026-10-06', validThrough: '2026-10-05' }, /validity/);
  assert.equal(validate(document(fixture({ validThrough: '2026-10-11' }))).length, 1);
  rejectRecord({ validThrough: '2026-10-12' }, /validity/);
  rejectRecord({ sourceId: 'o_ulami', kind: 'announcement', validThrough: '2027-10-06' }, /validity/);
});

test('UTF-8 and input byte limits are enforced before schema parsing', () => {
  assert.deepEqual(parseInput(Buffer.from('{"schemaVersion":1,"updates":[]}')), document());
  assert.throws(() => parseInput(Buffer.alloc(LIMITS.inputBytes + 1, 32)), /bytes/);
  assert.throws(() => parseInput(Buffer.from([0xc3, 0x28])), /UTF-8/);
  assert.throws(() => parseInput(Buffer.from('{"secret":')), /invalid JSON/);
});

test('generated TypeScript safely round-trips text without executable interpolation', () => {
  const text = 'Synthetic "quote", \\ slash, `backtick`, ${expression}; separator\u2028next\u2029end 😀';
  const values = validate(document(fixture({ summary: { ...fixture().summary, en: text } })));
  const source = renderModule(values);
  assert.equal(source.includes('\u2028'), false);
  assert.equal(source.includes('\u2029'), false);
  assert.ok(source.includes('\\u2028'));
  const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  const context = { exports: {} };
  vm.runInNewContext(result.outputText, context);
  assert.equal(JSON.stringify(context.exports.COMMUNITY_UPDATES), JSON.stringify(values));
  assert.ok(renderModule([{ text: '</script>&' }]).includes('\\u003c/script\\u003e\\u0026'));
});

test('staging creates an auditable hash pair without changing the input', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document(fixture({ sourceUrl: 'https://www.instagram.com/stories/mjhs_lounge/123/' })));
  const before = fs.readFileSync(input);
  const output = path.join(directory, 'stage', 'community-updates.ts');
  const result = importFile(input, output, NOW);
  assert.deepEqual(fs.readFileSync(input), before);
  const audit = JSON.parse(fs.readFileSync(result.auditPath, 'utf8'));
  assert.equal(audit.inputSha256, crypto.createHash('sha256').update(before).digest('hex'));
  assert.equal(audit.outputSha256, crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'));
  assert.equal(audit.records, 1);
  assert.equal(audit.validTodayKst, 1); // 15:00 UTC on October 4 is October 5 in Korea.
  assert.equal(audit.storySnapshots, 1);
  assert.equal(audit.sourceVerification, 'human-review-required');
  assert.equal(audit.networkAccess, false);
  assert.equal(fs.readFileSync(result.auditPath, 'utf8').includes('Synthetic test summary'), false);
});

test('expired snapshots remain reviewable but audit never labels them valid today', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document(fixture({ validFrom: '2026-10-04', validThrough: '2026-10-04' })));
  assert.equal(importFile(input, path.join(directory, 'stage.ts'), NOW).audit.validTodayKst, 0);
});

test('existing output and input files are never overwritten', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document());
  const output = path.join(directory, 'already-reviewed.ts');
  fs.writeFileSync(output, 'preserve existing work');
  assert.throws(() => importFile(input, output, NOW), /EEXIST/);
  assert.equal(fs.readFileSync(output, 'utf8'), 'preserve existing work');
  assert.throws(() => importFile(input, input, NOW), /differ/);
});

test('failed audit creation removes only the new staged module and preserves existing audit', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document());
  const output = path.join(directory, 'stage.ts');
  fs.writeFileSync(`${output}.audit.json`, 'preserve audit');
  assert.throws(() => importFile(input, output, NOW), /EEXIST/);
  assert.equal(fs.existsSync(output), false);
  assert.equal(fs.readFileSync(`${output}.audit.json`, 'utf8'), 'preserve audit');
});

test('invalid import creates no output or audit', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document(fixture({ sourceId: 'unknown' })));
  const output = path.join(directory, 'stage.ts');
  assert.throws(() => importFile(input, output, NOW), /sourceId/);
  assert.equal(fs.existsSync(output), false);
  assert.equal(fs.existsSync(`${output}.audit.json`), false);
});

test('file reader enforces the byte cap without producing output', t => {
  const directory = temporaryDirectory(t);
  const input = path.join(directory, 'oversized.json');
  const output = path.join(directory, 'stage.ts');
  fs.writeFileSync(input, Buffer.alloc(LIMITS.inputBytes + 1, 32));
  assert.throws(() => importFile(input, output, NOW), /byte limit/);
  assert.equal(fs.existsSync(output), false);
});

test('CLI rejects unknown/duplicate/missing arguments and supports explicit staged output', t => {
  for (const args of [[], ['--input'], ['--input', 'a', '--input', 'b'], ['--input', 'a', '--force'], ['--input', 'a', '--token', 'secret']]) assert.throws(() => parseArgs(args), /arguments/);
  assert.deepEqual(parseArgs(['--help']), { help: true });
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document());
  const output = path.join(directory, 'cli-stage.ts');
  const script = path.resolve(__dirname, '../scripts/import-community.cjs');
  const result = spawnSync(process.execPath, [script, '--input', input, '--output', output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Staged 0 records/);
  const second = spawnSync(process.execPath, [script, '--input', input, '--output', output], { encoding: 'utf8' });
  assert.equal(second.status, 1);
  assert.match(second.stderr, /EEXIST/);
});

const officialFixture = (changes = {}) => fixture({
  id: 'synthetic-official-menu', sourceId: 'mju-menu-library', kind: 'menu',
  sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28',
  publishedAt: null, observedAt: '2026-10-04T10:00:00+09:00', reviewedAt: '2026-10-04T11:00:00+09:00',
  validFrom: '2026-09-30', validThrough: '2026-09-30', ...changes,
});
const snapshotFixture = (updates = [], changes = {}) => ({ schemaVersion: 1, campusId: 'yongin', version: 1, updatedAt: '2026-10-04T12:00:00+09:00', updates, ...changes });

test('three official sources retain unknown publication time and actual observation provenance', () => {
  assert.deepEqual(Object.keys(OFFICIAL_SOURCES), ['mju-menu-library', 'mju-menu-student', 'mju-menu-dorm']);
  for (const sourceId of Object.keys(OFFICIAL_SOURCES)) {
    const value = officialFixture({ sourceId, sourceUrl: officialMenuUrl(sourceId, '2026-09-28') });
    assert.deepEqual(validate(document(value))[0], value);
  }
});

test('unknown publication requires official observation and temporal ordering remains strict', () => {
  const base = officialFixture();
  delete base.observedAt;
  assert.throws(() => validate(document(base)), /observedAt/);
  rejectRecord({ publishedAt: null }, /publication time/);
  rejectRecord({ observedAt: '2026-10-04T01:00:00Z' }, /observation time/i);
  for (const changes of [
    { observedAt: '2026-10-06T01:00:00Z' }, { observedAt: '2026-10-04T03:00:00Z' },
    { observedAt: null }, { observedAt: '2026-02-30T00:00:00Z' },
    { publishedAt: '2026-10-04T02:00:00Z', observedAt: '2026-10-04T01:00:00Z' },
  ]) assert.throws(() => validate(document(officialFixture(changes))), /observation|observedAt|future/);
});

test('official URLs are exact, source-scoped, Monday-selected and cover the declared validity', () => {
  for (const sourceUrl of [
    'https://www.mju.ac.kr/diet/mjukr/5/view.do?monday=2026.09.28',
    'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.29',
    'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.02.30',
    'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.10.05',
    'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28&other=1',
    'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026-09-28',
    'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28#x',
    'http://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.09.28',
    'https://www.mju.ac.kr.evil.invalid/diet/mjukr/4/view.do?monday=2026.09.28',
  ]) assert.throws(() => validate(document(officialFixture({ sourceUrl }))), /sourceUrl|validity/);
  assert.throws(() => validate(document(officialFixture({ kind: 'announcement' }))), /kind/);
  assert.throws(() => validate(document(officialFixture({ validThrough: '2026-10-05' }))), /validity/);
});

test('snapshots validate exact public fields, version, timestamp and record review ordering', () => {
  const value = snapshotFixture([officialFixture()]);
  assert.deepEqual(validateSnapshot(value, NOW), value);
  for (const change of [{ version: 0 }, { version: 1.5 }, { version: Number.MAX_SAFE_INTEGER + 1 }, { campusId: 'seoul' }, { schemaVersion: 2 }, { privateCapture: 'not public' }, { updatedAt: '2026-10-06T00:00:00Z' }, { updatedAt: '2026-10-03T00:00:00Z' }]) {
    assert.throws(() => validateSnapshot(snapshotFixture([officialFixture()], change), NOW));
  }
  const oversized = Array.from({ length: 100 }, (_, index) => fixture({ id: `id-${index}`, summary: { en: '界'.repeat(400), ko: '界'.repeat(400), zh: '界'.repeat(400) } }));
  assert.throws(() => validateSnapshot(snapshotFixture(oversized), NOW), /byte limit/);
});

test('explicit snapshot staging includes hashes and preserves unknown publication dates', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document(officialFixture()));
  const result = importFile(input, path.join(directory, 'stage.ts'), NOW, 7);
  const bytes = fs.readFileSync(result.snapshotPath);
  assert.equal(result.audit.snapshotSha256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(result.snapshot.version, 7);
  assert.equal(result.snapshot.updates[0].publishedAt, null);
  assert.equal(result.snapshot.updates[0].observedAt, officialFixture().observedAt);
  assert.deepEqual(validateSnapshot(JSON.parse(bytes), NOW), result.snapshot);
});

test('snapshot write conflicts preserve existing files and remove only new output', t => {
  const directory = temporaryDirectory(t);
  const input = writeInput(directory, document());
  const output = path.join(directory, 'stage.ts');
  fs.writeFileSync(`${output}.snapshot.json`, 'preserve snapshot');
  assert.throws(() => importFile(input, output, NOW, 1), /EEXIST/);
  assert.equal(fs.existsSync(output), false);
  assert.equal(fs.readFileSync(`${output}.snapshot.json`, 'utf8'), 'preserve snapshot');
  for (const value of ['0', '-1', 'NaN', '1.5', '9007199254740992']) assert.throws(() => parseArgs(['--input', 'x.json', '--snapshot-version', value]), /arguments/);
});
