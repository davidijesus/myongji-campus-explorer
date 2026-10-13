'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { validateDocument } = require('../scripts/import-community.cjs');
function readModule(name) {
  const source = fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const value = {}; new Function('exports', compiled)(value); return value;
}
const { COMMUNITY_UPDATES } = readModule('community-updates.ts');
const { currentCommunityUpdates, communitySourceAvailability } = readModule('community.ts');
const input = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/reviewed-community-2026-10-12.json'), 'utf8'));

test('bundled real MJU snapshot equals the strict reviewed input and retains unknown publication', () => {
  const records = validateDocument(input, Date.parse('2026-10-13T03:00:00Z'));
  assert.deepEqual(COMMUNITY_UPDATES, records);
  assert.equal(records.length, 25);
  for (const record of records) {
    assert.equal(record.publishedAt, null);
    assert.ok(record.observedAt);
    assert.ok(Date.parse(record.reviewedAt) >= Date.parse(record.observedAt));
    assert.equal(record.validFrom, record.validThrough);
    assert.match(record.sourceId, /^mju-menu-/);
    assert.match(record.sourceUrl, /^https:\/\/www\.mju\.ac\.kr\/diet\/mjukr\/[456]\/view\.do\?monday=2026\.10\.12$/);
    for (const language of ['en', 'ko', 'zh']) assert.ok(record.summary[language].trim());
  }
});

test('real saved menus select only their applicable KST day, then become outdated', () => {
  for (const day of ['13', '14', '15', '16']) {
    const now = new Date(`2026-10-${day}T03:00:00Z`);
    const today = currentCommunityUpdates(COMMUNITY_UPDATES, 'menu', now);
    assert.equal(today.length, 5);
    assert.ok(today.every(update => update.validFrom === `2026-10-${day}`));
  }
  const after = new Date('2026-10-17T03:00:00Z');
  assert.deepEqual(currentCommunityUpdates(COMMUNITY_UPDATES, 'menu', after), []);
  for (const sourceId of ['mju-menu-library', 'mju-menu-student', 'mju-menu-dorm']) {
    const state = communitySourceAvailability(COMMUNITY_UPDATES, sourceId, 'menu', after);
    assert.equal(state.state, 'outdated');
    assert.equal(state.lastValidThrough, '2026-10-16');
    assert.deepEqual(state.current, []);
  }
});

test('official records do not imply a successful Instagram import', () => {
  for (const sourceId of ['mjhs_lounge', 'mju_lounge', 'mj_bokji_foodist']) {
    assert.deepEqual(communitySourceAvailability(COMMUNITY_UPDATES, sourceId, 'menu', new Date('2026-10-13T03:00:00Z')), {
      state: 'unavailable', current: [], lastValidThrough: null, nextValidFrom: null,
    });
  }
});
