'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { readReviewedPhotos, embed, token, imageInfo } = require('../scripts/prepare-building-photos.cjs');
const { getBuildingPhotos } = require('../build/core/building-photos.js');
const { liveSeed } = require('../build/core/data.js');
const { seoulSeed } = require('../build/core/campuses.js');
const root = path.resolve(__dirname, '..');
const manifest = () => JSON.parse(fs.readFileSync(path.join(root, 'data/building-photos.json'), 'utf8'));

test('Every bundled photo belongs to an existing campus place and preserves reviewed display bytes', () => {
  const places = [...liveSeed.places, ...seoulSeed.places];
  const entries = readReviewedPhotos();
  assert.ok(entries.length > 0, 'The gallery build must include reviewed photographs');
  for (const { photo, bytes, info } of entries) {
    assert.ok(places.some(place => place.id === photo.placeId), photo.placeId);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), photo.sha256);
    assert.equal(photo.width, info.width); assert.equal(photo.height, info.height);
    const selected = getBuildingPhotos(photo.placeId);
    assert.ok(selected.some(item => item.id === photo.id && item.src === token(photo.id)));
    assert.ok(selected.every(item => item.placeId === photo.placeId));
  }
  assert.deepEqual(getBuildingPhotos('missing-place'), []);
});

test('Embedding retains reviewed display bytes and cannot leave an unresolved offline photo', () => {
  const records = manifest().photos;
  const compiled = records.map(photo => JSON.stringify(token(photo.id))).join(',');
  const bundled = embed(compiled);
  const images = JSON.parse('[' + bundled + ']');
  assert.equal(images.length, records.length);
  images.forEach((uri, index) => {
    assert.match(uri, /^data:image\/(png|jpeg|gif);base64,/);
    const decoded = Buffer.from(uri.split(',')[1], 'base64');
    assert.deepEqual(decoded, fs.readFileSync(path.join(root, records[index].src)));
  });
  assert.doesNotMatch(bundled, /__MJU_BUILDING_PHOTO_/);
  if (records.length) assert.throws(() => embed(''), /Expected one compiled photo token/);
});

function fixture(t, mutate) {
  const parent = path.join(root, 'build', 'photo-fixtures');
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, 'case-'));
  t.after(() => {
    const actual = fs.realpathSync(temporary), relative = path.relative(fs.realpathSync(parent), actual);
    assert.ok(relative.startsWith('case-') && !relative.includes(path.sep));
    fs.rmSync(actual, { recursive: true, force: true });
  });
  const bytes = fs.readFileSync(path.join(root, 'web/pwa-assets/icon-192.png'));
  const info = imageInfo(bytes);
  const photo = { id: 'fixture-photo', placeId: 'mju-test', src: 'web/building-photos/yongin/test.png',
    caption: { en: 'Test only', ko: '테스트 전용', zh: '仅供测试' },
    sourcePageUrl: 'https://www.mju.ac.kr/example', imageUrl: 'https://www.mju.ac.kr/example.png',
    originalCaption: 'Synthetic test fixture', identificationEvidence: 'Test fixture, never distributed',
    officialOrganization: 'Test only', checkedAt: '2026-10-16', captureDate: null, visualVerified: true,
    width: info.width, height: info.height, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  fs.mkdirSync(path.join(temporary, 'web/building-photos/yongin'), { recursive: true });
  fs.mkdirSync(path.join(temporary, 'data'));
  fs.writeFileSync(path.join(temporary, photo.src), bytes);
  const data = { schemaVersion: 1, photos: [photo] };
  mutate(data);
  fs.writeFileSync(path.join(temporary, 'data/building-photos.json'), JSON.stringify(data));
  return temporary;
}

test('Unreviewed, unofficial and altered photo assets fail closed before the offline build', t => {
  for (const mutate of [
    data => { data.photos[0].visualVerified = false; },
    data => { data.photos[0].sourcePageUrl = 'https://mju.ac.kr.example.org/photo'; },
    data => { data.photos[0].imageUrl = 'https://example.org/photo.png'; },
    data => { data.photos[0].sha256 = '0'.repeat(64); },
    data => { data.photos[0].width += 1; },
    data => { data.photos[0].src = '../private.png'; },
    data => { data.photos.push({ ...data.photos[0], id: 'duplicate-angle' }); }
  ]) assert.throws(() => readReviewedPhotos(fixture(t, mutate)));
});
