'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { validateDocument } = require('../scripts/import-community.cjs');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/community.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {}; new Function('exports', compiled)(api);
const { currentCommunityUpdates, communitySourceAvailability } = api;
const now = new Date('2026-10-12T15:30:00Z'); // October 13 in Korea.
const fixture = (extra = {}) => ({ id: 'synthetic-menu', sourceId: 'mju_lounge', kind: 'menu',
  summary: { en: 'Synthetic reviewed lunch', ko: '검증용 점심 요약', zh: '测试午餐摘要' },
  sourceUrl: 'https://www.instagram.com/mju_lounge/p/SYNTHETIC_ONLY/',
  publishedAt: '2026-10-12T00:00:00Z', reviewedAt: '2026-10-12T01:00:00Z',
  validFrom: '2026-10-13', validThrough: '2026-10-13', ...extra });
const availability = (updates, at = now) => communitySourceAvailability(updates, 'mju_lounge', 'menu', at);

test('empty saved content is unavailable without asserting a live fetch or closure', () => {
  assert.deepEqual(availability([]), { state: 'unavailable', current: [], lastValidThrough: null, nextValidFrom: null });
  assert.equal(communitySourceAvailability([fixture()], 'unknown', 'menu', now).state, 'unavailable');
  assert.deepEqual(availability([fixture()], new Date('invalid')), availability([]));
});

test('an expired summary exposes its last validity date but never its meal body', () => {
  const old = fixture({ validFrom: '2026-10-12', validThrough: '2026-10-12' });
  const state = availability([old]);
  assert.deepEqual(state, { state: 'outdated', current: [], lastValidThrough: '2026-10-12', nextValidFrom: null });
  assert.equal(JSON.stringify(state).includes(old.summary.en), false);
  assert.deepEqual(currentCommunityUpdates([old], 'menu', now), []);
});

test('upcoming menus expose the next date without presenting future meals as today', () => {
  const future = fixture({ validFrom: '2026-10-14', validThrough: '2026-10-14' });
  assert.deepEqual(availability([future]), { state: 'upcoming', current: [], lastValidThrough: null, nextValidFrom: '2026-10-14' });
  assert.deepEqual(currentCommunityUpdates([future], 'menu', now), []);
});

test('source status rolls from upcoming through current to outdated at KST midnight', () => {
  const item = fixture();
  const times = [
    ['2026-10-12T14:59:59.999Z', 'upcoming'],
    ['2026-10-12T15:00:00Z', 'current'],
    ['2026-10-13T14:59:59.999Z', 'current'],
    ['2026-10-13T15:00:00Z', 'outdated'],
  ];
  for (const [instant, expected] of times) {
    const state = availability([item], new Date(instant));
    assert.equal(state.state, expected);
    assert.deepEqual(state.current, currentCommunityUpdates([item], 'menu', new Date(instant)));
  }
});

test('each source is independent, so an official menu does not mark Instagram current', () => {
  const official = fixture({ sourceId: 'mju-menu-library',
    sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.10.12',
    publishedAt: null, observedAt: '2026-10-12T00:00:00Z' });
  assert.equal(availability([official]).state, 'unavailable');
  const state = communitySourceAvailability([official], 'mju-menu-library', 'menu', now);
  assert.equal(state.state, 'current');
  assert.equal(state.current[0].publishedAt, null);
  assert.equal(state.current[0].observedAt, official.observedAt);
  assert.equal(communitySourceAvailability([fixture({ kind: 'announcement' })], 'mju_lounge', 'menu', now).state, 'unavailable');
});

test('current content wins while retaining last expired and earliest future dates', () => {
  const old = fixture({ id: 'old', validFrom: '2026-10-10', validThrough: '2026-10-10' });
  const recent = fixture({ id: 'recent', validFrom: '2026-10-12', validThrough: '2026-10-12' });
  const upcoming = fixture({ id: 'next', validFrom: '2026-10-14', validThrough: '2026-10-14' });
  const later = fixture({ id: 'later', validFrom: '2026-10-16', validThrough: '2026-10-16' });
  assert.deepEqual(availability([later, old, fixture(), upcoming, recent]), {
    state: 'current', current: [fixture()], lastValidThrough: '2026-10-12', nextValidFrom: '2026-10-14',
  });
  assert.equal(availability([old, recent, upcoming, later]).state, 'upcoming');
});

test('unreviewed, mismatched, malformed and overlong records never become freshness evidence', () => {
  for (const extra of [
    { reviewedAt: null }, { reviewedAt: '2026-10-14T00:00:00Z' }, { publishedAt: null },
    { publishedAt: '2026-10-12T00:00:00+14:01' }, { validFrom: '2026-02-30' },
    { validFrom: '2026-10-01', validThrough: '2026-10-13' },
    { sourceUrl: 'https://www.instagram.com/mjhs_lounge/p/SYNTHETIC_ONLY/' },
    { summary: { en: 'Only one language' } }, { observedAt: '2026-10-12T00:00:00Z' },
  ]) assert.equal(availability([fixture(extra)]).state, 'unavailable', JSON.stringify(extra));
  const outsideWeek = fixture({ sourceId: 'mju-menu-library', sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.10.05' });
  assert.equal(communitySourceAvailability([outsideWeek], 'mju-menu-library', 'menu', now).state, 'unavailable');
});

test('a supported reviewed post imports and reaches current source state without network calls', () => {
  for (const sourceUrl of ['https://instagram.com/p/SYNTHETIC_ONLY', 'https://instagram.com/stories/mju_lounge/123456789']) {
    const imported = validateDocument({ schemaVersion: 1, updates: [fixture({ sourceUrl })] }, now.getTime());
    const state = availability(imported);
    assert.equal(state.state, 'current');
    assert.equal(state.current[0].publishedAt, fixture().publishedAt);
    assert.equal(state.current[0].reviewedAt, fixture().reviewedAt);
    assert.equal(state.current[0].sourceUrl.startsWith('https://www.instagram.com/'), true);
  }
});
