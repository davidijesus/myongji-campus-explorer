'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REFERENCE_CAMPUS, REFERENCE_BUILDING_COUNT, createReferencePlaces } = require('../build/core/campus.js');
const { liveSeed } = require('../build/core/data.js');
const { findRoute, validateDataset } = require('../build/core/core.js');

test('every code in the supplied illustrated overview has one selectable feature', () => {
  const expected = ['Y_', 'Y1', 'Y2', 'Y3', ...Array.from({length: 20}, (_, i) => `Y${i + 5}`), ...Array.from({length: 6}, (_, i) => `Y${i + 30}`), 'Y82', 'Y83', ...'ABCDEFGHIJK'];
  const codes = REFERENCE_CAMPUS.features.map(f => f.code).filter(Boolean);
  assert.deepEqual([...codes].sort(), [...expected].sort());
  assert.equal(new Set(codes).size, expected.length);
});

test('all 48 official directory landmarks except four shuttle stops and parking are represented', () => {
  // Audited against 2026-09-29 official artclList response. Stops 96–99 and parking 103
  // are outside this structural overview; no unnamed building is claimed complete.
  const articles = [40,41,42,43,44,46,47,48,49,50,51,52,53,56,57,58,59,60,61,62,63,64,65,66,68,69,71,72,73,74,76,77,78,79,80,81,82,83,84,85,86,87,89,90,92,93,94,95];
  assert.deepEqual(REFERENCE_CAMPUS.features.filter(f => f.marker).map(f => f.marker.article).sort((a,b)=>a-b), articles);
  assert.equal(REFERENCE_CAMPUS.features.length, 50);
  assert.equal(REFERENCE_BUILDING_COUNT, 40);
  assert.equal(REFERENCE_CAMPUS.features.filter(f => f.kind === 'building').length, 39);
});

test('reference geometry cannot silently become live navigation geometry', () => {
  const places = createReferencePlaces();
  assert.equal(REFERENCE_CAMPUS.frame, 'illustration');
  for (const p of places) {
    assert.equal(p.point, null, p.id);
    assert.equal(p.buildingId, null, p.id);
    assert.deepEqual(p.entranceIds, [], p.id);
    assert.equal(p.geometryEvidence.status, 'unverified', p.id);
    assert.equal(p.geometryEvidence.checkedAt, null, p.id);
  }
  const dataset = {...liveSeed, places};
  assert.deepEqual(validateDataset(dataset, 'live'), []);
  assert.deepEqual(findRoute(dataset, places[0].id, places[1].id), {ok:false, reason:'missing-node'});
  for (const key of ['buildings', 'entrances', 'nodes', 'edges']) assert.deepEqual(dataset[key], []);
});

test('reference-only courts and disputed dorm name remain unverified', () => {
  const places = createReferencePlaces();
  for (const id of ['mju-i', 'mju-j', 'mju-y32']) assert.equal(places.find(p => p.id === id).evidence.status, 'unverified');
  for (const id of ['mju-i', 'mju-j']) assert.equal(REFERENCE_CAMPUS.features.find(f => f.id === id).marker, null);
  assert.match(places.find(p => p.id === 'mju-y32').description.en, /3동.*1동/);
});

test('conflicting directory pins stay separate from the labelled plan placement', () => {
  for (const id of ['mju-y20', 'mju-y83', 'mju-hydraulics']) {
    const f = REFERENCE_CAMPUS.features.find(f => f.id === id);
    assert.ok(f.note?.en, id);
    assert.ok(f.marker?.article, id);
  }
  const a = REFERENCE_CAMPUS.features.find(f => f.code === 'Y14');
  const b = REFERENCE_CAMPUS.features.find(f => f.code === 'Y83');
  assert.ok(Math.abs(a.marker.lon - b.marker.lon) < .00001);
  assert.equal(a.layoutSource, 'official-plan');
  assert.equal(b.layoutSource, 'official-plan');
  assert.ok(Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1]) > 10);
  assert.equal(b.sharedGeometryWith, undefined);
});

test('all selectable features have bounded finite render data and unique identities', () => {
  const features = REFERENCE_CAMPUS.features;
  assert.equal(new Set(features.map(f => f.id)).size, features.length);
  assert.deepEqual(new Set(createReferencePlaces().map(p => p.id)), new Set(features.map(f => f.id)));
  for (const f of features) {
    assert.ok(f.name.en && f.name.ko, f.id);
    for (const n of [...f.center, ...f.size, f.angle]) assert.ok(Number.isFinite(n), f.id);
    assert.ok(f.size[0] > 0 && f.size[1] > 0 && f.size[2] >= 0, f.id);
    assert.ok(f.center.every(n => Math.abs(n) < 420), f.id);
  }
});

test('engineering hall one is distinct from student union and gymnasium is octagonal', () => {
  const places = createReferencePlaces();
  assert.equal(places.find(p => p.code === 'Y_').id, 'mju-y-main');
  assert.equal(places.find(p => p.code === 'Y1').id, 'mju-y1');
  assert.notEqual(places.find(p => p.code === 'Y_').name.ko, places.find(p => p.code === 'Y1').name.ko);
  assert.equal(REFERENCE_CAMPUS.features.find(f => f.code === 'Y7').form, 'octagon');
  assert.equal(REFERENCE_CAMPUS.features.find(f => f.code === 'Y82').form, 'greenhouse');
});
