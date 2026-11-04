const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCommunitySnapshot, acceptCommunitySnapshot } = require('../build/core/community-sync.js');
const { currentCommunityUpdates, communitySourceAvailability, isOfficialMenuText } = require('../build/core/community.js');

const now = Date.parse('2026-11-03T12:00:00Z');
const original = '중식\n쌀밥 / 된장국\n알레르기: 1.2.3.5.6.7.8.9.10.12.14.15\n가격: 5,000원';
const menu = (extra = {}) => ({
  id: 'mju-menu-library-2026-11-03-lunch', sourceId: 'mju-menu-library', kind: 'menu',
  originalLanguage: 'ko', originalText: original, meal: 'lunch',
  sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.11.02',
  publishedAt: null, reviewedAt: null, observedAt: '2026-11-03T00:00:00Z', validatedAt: '2026-11-03T01:00:00Z',
  validFrom: '2026-11-03', validThrough: '2026-11-03', ...extra,
});
const snapshot = (updates = [menu()], extra = {}) => ({ schemaVersion: 1, campusId: 'yongin', version: 10, updatedAt: '2026-11-03T01:01:00Z', updates, ...extra });

test('automatic official meals preserve Korean source lines, allergens and prices without invented review or translations', () => {
  const accepted = validateCommunitySnapshot(snapshot(), now);
  assert.ok(accepted);
  const [update] = accepted.updates;
  assert.equal(update.originalText, original);
  assert.equal(update.reviewedAt, null);
  assert.equal(update.publishedAt, null);
  assert.equal('summary' in update, false);
  assert.equal(currentCommunityUpdates(accepted.updates, 'menu', new Date(now))[0].originalText, original);
  assert.equal(communitySourceAvailability(accepted.updates, 'mju-menu-library', 'menu', new Date(now)).state, 'current');
  assert.equal(communitySourceAvailability(accepted.updates, 'mju_lounge', 'menu', new Date(now)).state, 'unavailable');
});

test('automatic branch accepts only exact official meal records and keeps the manual branch strict', () => {
  for (const extra of [
    { originalLanguage: 'en' }, { kind: 'announcement' }, { meal: 'snack' },
    { summary: { en: 'invented', ko: 'invented', zh: 'invented' } }, { privateNote: 'not public' },
    { reviewedAt: '2026-11-03T01:00:00Z' }, { publishedAt: '2026-11-03T00:00:00Z' },
    { sourceId: 'mju_lounge' }, { sourceId: 'unknown' },
    { sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/5/view.do?monday=2026.11.02' },
    { sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.11.03' },
    { sourceUrl: 'https://www.mju.ac.kr/diet/mjukr/4/view.do?monday=2026.11.02&next=1' },
    { sourceUrl: 'https://example.org/menu' }, { id: 'bad id' },
  ]) {
    assert.equal(validateCommunitySnapshot(snapshot([menu(extra)]), now), null, JSON.stringify(extra));
    assert.deepEqual(currentCommunityUpdates([menu(extra)], 'menu', new Date(now)), []);
  }
  for (const missing of ['originalLanguage', 'originalText', 'meal', 'observedAt', 'validatedAt', 'reviewedAt']) {
    const item = menu(); delete item[missing];
    assert.equal(validateCommunitySnapshot(snapshot([item]), now), null, missing);
  }
  const human = { id: 'manual', sourceId: 'mju-menu-library', kind: 'menu', summary: { en: 'Reviewed meal', ko: '검토한 식단', zh: '审核过的菜单' },
    sourceUrl: menu().sourceUrl, publishedAt: null, reviewedAt: '2026-11-03T01:00:00Z', observedAt: menu().observedAt, validFrom: '2026-11-03', validThrough: '2026-11-03' };
  assert.ok(validateCommunitySnapshot(snapshot([human]), now));
  assert.equal(validateCommunitySnapshot(snapshot([{ ...human, reviewedAt: null }]), now), null);
  assert.equal(validateCommunitySnapshot(snapshot([{ ...human, summary: { ko: '번역 없음' } }]), now), null);
});

test('source observation, revalidation and feed generation remain distinct ordered timestamps', () => {
  const revalidated = menu({ validatedAt: '2026-11-03T01:00:30Z' });
  assert.ok(validateCommunitySnapshot(snapshot([revalidated]), now));
  for (const extra of [
    { observedAt: '2026-11-03T01:00:01Z' }, { validatedAt: '2026-11-03T01:01:01Z' },
    { observedAt: null }, { validatedAt: null }, { observedAt: '2026-11-03T00:00:00' },
    { validatedAt: '2026-02-30T00:00:00Z' }, { validFrom: '2026-11-02' },
    { validThrough: '2026-11-04' }, { validFrom: '2026-11-09', validThrough: '2026-11-09' },
  ]) assert.equal(validateCommunitySnapshot(snapshot([menu(extra)]), now), null, JSON.stringify(extra));
  assert.equal(validateCommunitySnapshot(snapshot(), Date.parse('2026-11-03T01:00:59Z')), null);
});

test('automatic original text is bounded and rejects active content without truncating source meals', () => {
  assert.equal(isOfficialMenuText('가'.repeat(6000)), true);
  assert.equal(isOfficialMenuText('😀'.repeat(6000)), true);
  assert.equal(isOfficialMenuText('가'.repeat(6001)), false);
  for (const text of ['', ' meal', 'meal ', 'menu\r\ntext', 'menu\ttext', 'menu\u0000text', '<b>meal</b>',
    'https://example.org', 'www.example.org', 'person@example.org', 'api_key=private', '\ud800', '\udfff']) {
    assert.equal(isOfficialMenuText(text), false, JSON.stringify(text));
    assert.equal(validateCommunitySnapshot(snapshot([menu({ originalText: text })]), now), null);
  }
  const tooLarge = Array.from({ length: 100 }, (_, i) => menu({ id: 'meal-' + i, originalText: '가'.repeat(6000) }));
  assert.equal(validateCommunitySnapshot(snapshot(tooLarge), now), null);
  assert.equal(validateCommunitySnapshot(snapshot([menu(), menu()]), now), null);
});

test('KST expiry and upcoming states use original records without rendering yesterday as today', () => {
  const yesterday = menu({ observedAt: '2026-11-02T00:00:00Z', validatedAt: '2026-11-02T01:00:00Z', validFrom: '2026-11-02', validThrough: '2026-11-02' });
  const before = new Date('2026-11-02T14:59:59.999Z'), after = new Date('2026-11-02T15:00:00Z');
  assert.equal(currentCommunityUpdates([yesterday], 'menu', before).length, 1);
  assert.equal(currentCommunityUpdates([yesterday], 'menu', after).length, 0);
  const outdated = communitySourceAvailability([yesterday], yesterday.sourceId, 'menu', after);
  assert.equal(outdated.state, 'outdated');
  assert.equal(outdated.lastValidThrough, '2026-11-02');
  const upcoming = menu({ observedAt: yesterday.observedAt, validatedAt: yesterday.validatedAt });
  assert.equal(communitySourceAvailability([upcoming], upcoming.sourceId, 'menu', before).state, 'upcoming');
});

test('last valid automatic snapshot rejects rollback, same-version changed text, and malformed replacements', () => {
  const previous = validateCommunitySnapshot(snapshot(), now);
  for (const candidate of [snapshot([], { version: 9 }), snapshot([menu({ originalText: 'changed' })]),
    snapshot([], { version: 11, updatedAt: '2026-11-03T00:30:00Z' }), snapshot([menu({ reviewedAt: 'fake' })], { version: 11 })]) {
    assert.equal(acceptCommunitySnapshot(candidate, previous, now), null);
    assert.equal(previous.updates[0].originalText, original);
  }
  const next = acceptCommunitySnapshot(snapshot([menu({ validatedAt: '2026-11-03T02:00:00Z' })], { version: 11, updatedAt: '2026-11-03T02:01:00Z' }), previous, now);
  assert.equal(next.version, 11);
  assert.equal(next.updates[0].observedAt, previous.updates[0].observedAt);
});
