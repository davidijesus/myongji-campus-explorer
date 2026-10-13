'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getGeographicCampus, projectGeographicPoint, assessGeographicFix } = require('../build/core/geographic.js');
const { REFERENCE_CAMPUS, REFERENCE_PROJECTION, markerToReferencePoint } = require('../build/core/campus.js');
const { SEOUL_REFERENCE_CAMPUS, SEOUL_REFERENCE_PROJECTION, seoulMarkerToReferencePoint } = require('../build/core/seoul.js');
const fs = require('node:fs');
const path = require('node:path');
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} differs from ${expected}`);
const sources = [
    ['yongin', REFERENCE_CAMPUS, REFERENCE_PROJECTION, markerToReferencePoint, { lat: 37.2222, lon: 127.1867 }],
    ['seoul', SEOUL_REFERENCE_CAMPUS, SEOUL_REFERENCE_PROJECTION, seoulMarkerToReferencePoint, { lat: 37.5801, lon: 126.9233 }],
];
const now = Date.UTC(2026, 9, 3, 12);
const reading = (campus, fields = {}) => ({ ...getGeographicCampus(campus).origin, accuracyM: 12, timestamp: now, ...fields });

for (const [id, source, projection, project, origin] of sources) {
    test(`${id}: geographic projection preserves the documented origin, north/east and metric scale`, () => {
        const campus = getGeographicCampus(id);
        assert.deepEqual(campus.origin, origin);
        const zero = projectGeographicPoint(id, origin.lat, origin.lon);
        near(zero.x, 0); near(zero.y, 0);
        const north = projectGeographicPoint(id, origin.lat + .0001, origin.lon);
        const east = projectGeographicPoint(id, origin.lat, origin.lon + .0001);
        assert.ok(north.y < -11 && north.y > -11.2 && Math.abs(north.x) < .001);
        assert.ok(east.x > 8.7 && east.x < 9 && Math.abs(east.y) < .001);
        for (const feature of source.features.filter(f => f.marker)) {
            const marker = feature.marker, scenePoint = project(marker.lat, marker.lon);
            const point = projectGeographicPoint(id, marker.lat, marker.lon);
            near(point.x, scenePoint[0] / projection.unitsPerMeter);
            near(point.y, scenePoint[1] / projection.unitsPerMeter);
        }
    });

    test(`${id}: geographic pins retain original directory provenance and exclude unlocated illustrations`, () => {
        const campus = getGeographicCampus(id);
        const located = source.features.filter(f => f.marker);
        assert.deepEqual(campus.pins.map(p => p.id), located.map(f => f.id));
        for (const pin of campus.pins) {
            const original = located.find(f => f.id === pin.id);
            assert.deepEqual({ lat: pin.lat, lon: pin.lon, article: pin.article }, original.marker);
            assert.deepEqual(pin.name, original.name);
            assert.equal(pin.code, original.code);
            assert.equal(pin.sourceUrl, source.sourceUrl);
            assert.equal(pin.checkedAt, source.checkedAt);
            assert.ok([pin.x, pin.y].every(Number.isFinite));
            assert.ok(pin.x >= campus.bounds.minX && pin.x <= campus.bounds.maxX);
            assert.ok(pin.y >= campus.bounds.minY && pin.y <= campus.bounds.maxY);
        }
        assert.equal(campus.coveragePaddingM, 200);
        assert.ok(Object.values(campus.bounds).every(Number.isFinite));
    });

    test(`${id}: fix assessment accepts only recent finite readings in map coverage`, () => {
        const fix = reading(id), result = assessGeographicFix(id, fix, now);
        assert.equal(result.status, 'ok');
        near(result.point.x, 0); near(result.point.y, 0);
        assert.deepEqual(result.fix, fix);
        assert.notEqual(result.fix, fix);
        for (const changed of [
            { lat: NaN }, { lat: 90.0001 }, { lat: -90.0001 }, { lon: Infinity }, { lon: 180.0001 }, { lon: -180.0001 },
            { accuracyM: 0 }, { accuracyM: -1 }, { accuracyM: Infinity }, { accuracyM: NaN }, { timestamp: NaN },
        ]) assert.deepEqual(assessGeographicFix(id, reading(id, changed), now), { status: 'invalid' });
        assert.equal(assessGeographicFix(id, null, now).status, 'invalid');
        assert.equal(assessGeographicFix(id, fix, NaN).status, 'invalid');
        for (const timestamp of [now - 60_001, now + 10_001])
            assert.deepEqual(assessGeographicFix(id, reading(id, { timestamp }), now), { status: 'stale' });
        for (const timestamp of [now - 60_000, now + 10_000])
            assert.equal(assessGeographicFix(id, reading(id, { timestamp }), now).status, 'ok');
        assert.equal(assessGeographicFix(id, reading(id, { accuracyM: 10_000 }), now).status, 'ok', 'accuracy is reported, never silently improved');
        for (const outside of [
            { lat: 0, lon: 0 }, { lat: origin.lat + .02, lon: origin.lon },
            { lat: -origin.lat, lon: origin.lon - 180 },
            { ...getGeographicCampus(id === 'seoul' ? 'yongin' : 'seoul').origin },
        ]) assert.deepEqual(assessGeographicFix(id, reading(id, outside), now), { status: 'outside' });
        for (const pin of getGeographicCampus(id).pins)
            assert.equal(assessGeographicFix(id, reading(id, { lat: pin.lat, lon: pin.lon }), now).status, 'ok');
    });

    test(`${id}: 200-metre padding limits map coverage without treating it as a campus boundary`, () => {
        const pins = getGeographicCampus(id).pins;
        const east = pins.reduce((a, b) => a.x > b.x ? a : b);
        const north = pins.reduce((a, b) => a.y < b.y ? a : b);
        for (const [metres, expected] of [[195, 'ok'], [205, 'outside']]) {
            // Independent small-area conversion; the 5 m margin exceeds its sub-metre error.
            const eastFix = reading(id, { lat: east.lat, lon: east.lon + metres / (111_195 * Math.cos(east.lat * Math.PI / 180)) });
            const northFix = reading(id, { lat: north.lat + metres / 111_195, lon: north.lon });
            assert.equal(assessGeographicFix(id, eastFix, now).status, expected);
            assert.equal(assessGeographicFix(id, northFix, now).status, expected);
        }
    });
}

test('Y14 and Y83 preserve nearly coincident source markers instead of separated plan geometry', () => {
    const campus = getGeographicCampus('yongin');
    const a = campus.pins.find(p => p.code === 'Y14'), b = campus.pins.find(p => p.code === 'Y83');
    assert.ok(a && b);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .3);
    const pa = REFERENCE_CAMPUS.features.find(f => f.id === a.id), pb = REFERENCE_CAMPUS.features.find(f => f.id === b.id);
    assert.ok(Math.hypot(pa.center[0] - pb.center[0], pa.center[1] - pb.center[1]) > 1);
    assert.ok(!campus.pins.some(p => p.id === 'mju-i' || p.id === 'mju-j'));
});

test('Seoul geographic coordinates match all original published evidence markers', () => {
    const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/seoul-reference-evidence.json'), 'utf8'));
    for (const pin of getGeographicCampus('seoul').pins) {
        const published = evidence.publishedMarkers.find(m => m.artclSeq === pin.article);
        assert.ok(published);
        assert.equal(pin.lat, Number(published.latitude));
        assert.equal(pin.lon, Number(published.longitude));
    }
});
