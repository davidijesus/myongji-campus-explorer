'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { assessModelLocation, getModelLocationCalibration, ASSUMED_MARKER_UNCERTAINTY_M } = require('../build/core/model-location.js');
const { getGeographicCampus, projectGeographicPoint } = require('../build/core/geographic.js');
const { REFERENCE_CAMPUS } = require('../build/core/campus.js');
const { SEOUL_REFERENCE_CAMPUS } = require('../build/core/seoul.js');
const now = Date.UTC(2026, 9, 3, 12);
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} differs from ${expected}`);
const reading = (id, values = {}) => ({ ...getGeographicCampus(id).origin, accuracyM: 18, timestamp: now, ...values });
const sources = { yongin: REFERENCE_CAMPUS, seoul: SEOUL_REFERENCE_CAMPUS };

for (const id of ['yongin', 'seoul']) {
    test(`${id}: origin, north, east and scale place fixes directly in the model frame`, () => {
        const origin = getGeographicCampus(id).origin;
        const zero = assessModelLocation(id, reading(id), now);
        assert.equal(zero.status, 'ok');
        const expected = id === 'yongin' ? { x: 1.6811398656546859, z: 3.9052045803488475 } : { x: 0, z: 0 };
        near(zero.point.x, expected.x); near(zero.point.z, expected.z);
        const north = assessModelLocation(id, reading(id, { lat: origin.lat + .0001 }), now).point;
        const east = assessModelLocation(id, reading(id, { lon: origin.lon + .0001 }), now).point;
        // Independent small WGS84 steps: +latitude ~11.1m north, +longitude ~8.8m east.
        assert.ok(north.z < zero.point.z - 5.05 && north.z > zero.point.z - 5.15);
        assert.ok(Math.abs(north.x - zero.point.x) < .03);
        assert.ok(east.x > zero.point.x + 4 && east.x < zero.point.x + 4.15);
        assert.ok(Math.abs(east.z - zero.point.z) < .03);
        const c = getModelLocationCalibration(id), { a, b } = c.transform;
        near(Math.hypot(a, b), .46);
        assert.ok(a * a + b * b > 0, 'rotation never reflects or collapses axes');
        assert.ok(Math.abs(c.rotationDegrees) < .25, 'source axes are east/right and south/down');
    });

    test(`${id}: every published pin keeps pairwise metric distances without snapping to model centres`, () => {
        const pins = getGeographicCampus(id).pins;
        const points = pins.map(pin => assessModelLocation(id, reading(id, pin), now));
        assert.ok(points.every(point => point.status === 'ok'));
        for (let i = 0; i < pins.length; i++) for (let j = 0; j < i; j++) {
            const rawDistance = Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y);
            const worldDistance = Math.hypot(points[i].point.x - points[j].point.x, points[i].point.z - points[j].point.z);
            near(worldDistance, rawDistance * .46);
        }
        // A point between source pins remains the same affine interpolation in model space.
        const p = pins[0], q = pins.at(-1), midpoint = { lat: (p.lat + q.lat) / 2, lon: (p.lon + q.lon) / 2 };
        const mid = assessModelLocation(id, reading(id, midpoint), now).point;
        near(mid.x, (points[0].point.x + points.at(-1).point.x) / 2, .01);
        near(mid.z, (points[0].point.z + points.at(-1).point.z) / 2, .01);
    });

    test(`${id}: visible radius adds device accuracy to an explicitly assumed model allowance`, () => {
        const c = getModelLocationCalibration(id), allowance = id === 'yongin' ? 140 : 25;
        assert.equal(c.available, true);
        assert.equal(c.sourceAccuracyKnown, false);
        assert.equal(c.independentSurveyControlCount, 0);
        assert.equal(c.assumedMarkerFloorM, ASSUMED_MARKER_UNCERTAINTY_M);
        assert.equal(c.assumedMarkerFloorM, 25);
        assert.equal(c.modelUncertaintyM, allowance);
        const fix = assessModelLocation(id, reading(id), now);
        assert.equal(fix.accuracyM, 18);
        assert.equal(fix.modelUncertaintyM, allowance);
        assert.equal(fix.uncertaintyM, allowance + 18);
        near(fix.radiusWorld, (allowance + 18) * .46);
        const coarse = assessModelLocation(id, reading(id, { accuracyM: 10_000 }), now);
        assert.equal(coarse.accuracyM, 10_000);
        near(coarse.radiusWorld, (allowance + 10_000) * .46, 1e-7);
        assert.deepEqual(Object.keys(fix).sort(), ['accuracyM', 'modelUncertaintyM', 'point', 'radiusWorld', 'status', 'uncertaintyM']);
        assert.deepEqual(Object.keys(fix.point).sort(), ['x', 'z'], 'no raw device coordinates or timestamp in assessment');
    });

    test(`${id}: invalid, stale and outside readings never yield a point or radius`, () => {
        for (const values of [{ lat: NaN }, { lon: Infinity }, { lat: 91 }, { lon: 181 }, { accuracyM: 0 }, { accuracyM: -1 }, { timestamp: NaN }])
            assert.deepEqual(assessModelLocation(id, reading(id, values), now), { status: 'invalid' });
        assert.deepEqual(assessModelLocation(id, null, now), { status: 'invalid' });
        assert.deepEqual(assessModelLocation(id, reading(id), NaN), { status: 'invalid' });
        for (const timestamp of [now - 60_001, now + 10_001])
            assert.deepEqual(assessModelLocation(id, reading(id, { timestamp }), now), { status: 'stale' });
        for (const timestamp of [now - 60_000, now + 10_000])
            assert.equal(assessModelLocation(id, reading(id, { timestamp }), now).status, 'ok');
        const origin = getGeographicCampus(id).origin;
        for (const outside of [{ lat: 0, lon: 0 }, { lat: -origin.lat, lon: origin.lon - 180 }, getGeographicCampus(id === 'yongin' ? 'seoul' : 'yongin').origin])
            assert.deepEqual(assessModelLocation(id, reading(id, outside), now), { status: 'outside' });
    });

    test(`${id}: diagnostics are copies and cannot alter the transform or later fixes`, () => {
        const before = getModelLocationCalibration(id), expected = assessModelLocation(id, reading(id), now);
        const changed = getModelLocationCalibration(id);
        changed.transform.tx = 1e9; changed.controls[0].discrepancyM = 1e9;
        changed.sources.length = 0; changed.anchorIds.length = 0;
        changed.fit.maxM = 1e9; changed.validation.maxM = 1e9;
        changed.fallbackIds.push('invented'); changed.excludedAnchors.push({ id: 'invented', reason: '', discrepancyM: 1e9 });
        assert.deepEqual(getModelLocationCalibration(id), before);
        assert.deepEqual(assessModelLocation(id, reading(id), now), expected);
    });
}

test('Yongin accounts for all 48 marker-bearing features as 36 plan controls, 8 semantic exclusions and 4 circular fallbacks', () => {
    const c = getModelLocationCalibration('yongin');
    assert.equal(c.planAnchorCount, 36); assert.equal(c.anchorIds.length, 36);
    assert.deepEqual(c.excludedAnchors.map(a => a.id).sort(), ['mju-y14', 'mju-y83', 'mju-y32', 'mju-y33', 'mju-y34', 'mju-y35', 'mju-guardhouse', 'mju-hydraulics'].sort());
    assert.deepEqual(c.fallbackIds.sort(), ['mju-g', 'mju-k', 'mju-elpenheim', 'mju-gate'].sort());
    assert.ok(c.excludedAnchors.every(a => a.reason.length > 40));
    const partition = [...c.anchorIds, ...c.excludedAnchors.map(a => a.id), ...c.fallbackIds];
    assert.equal(new Set(partition).size, 48);
    assert.deepEqual(partition.sort(), REFERENCE_CAMPUS.features.filter(f => f.marker).map(f => f.id).sort());
    assert.ok(!partition.includes('mju-i') && !partition.includes('mju-j'));
    assert.ok(c.anchorIds.every(id => REFERENCE_CAMPUS.features.find(f => f.id === id).layoutSource === 'official-plan'));
    assert.equal(c.controls.length, 48);
    assert.equal(c.controls.filter(a => Number.isFinite(a.leaveOneOutM)).length, 36);
    assert.ok(c.controls.filter(a => a.role === 'fallback').every(a => a.leaveOneOutM === null && a.discrepancyM > 8 && a.discrepancyM < 12));
    // Y14 has low residual yet is excluded: source ambiguity, not residual cherry-picking.
    assert.ok(c.excludedAnchors.find(a => a.id === 'mju-y14').discrepancyM < c.fit.medianM);
});

test('Yongin fixed-scale fit and genuine held-out errors retain the independently reviewed metrics', () => {
    const c = getModelLocationCalibration('yongin');
    assert.equal(c.validation.kind, 'leave-one-out');
    assert.equal(c.validation.count, 36);
    near(c.rotationDegrees, -.22834563155526172);
    near(c.fit.rmseM, 11.569724838749094);
    near(c.fit.medianM, 8.015263889094173);
    near(c.validation.rmseM, 12.066192964913066);
    near(c.validation.p95M, 28.844975307569065);
    near(c.validation.maxM, 29.962672989173576);
    const worst = c.controls.filter(a => a.role === 'fit').sort((a, b) => b.leaveOneOutM - a.leaveOneOutM)[0];
    assert.equal(worst.id, 'mju-y2');
    assert.ok(worst.leaveOneOutM > worst.discrepancyM, 'held-out error is not the in-sample residual');
    near(c.excludedAnchors.find(a => a.id === 'mju-hydraulics').discrepancyM, 114.45412914284391);
    assert.equal(c.registrationEnvelopeM, 115, 'the large excluded disagreement stays in the display allowance');
});

test('Conflicting Y14/Y83 pins stay nearly coincident instead of being warped 250-fold onto their separate models', () => {
    const [a, b] = ['mju-y14', 'mju-y83'].map(id => REFERENCE_CAMPUS.features.find(f => f.id === id));
    const [pa, pb] = [a, b].map(f => assessModelLocation('yongin', reading('yongin', f.marker), now).point);
    const dotDistanceM = Math.hypot(pa.x - pb.x, pa.z - pb.z) / .46;
    const modelDistanceM = Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) / .46;
    assert.ok(dotDistanceM > .23 && dotDistanceM < .25);
    assert.ok(modelDistanceM > 59 && modelDistanceM < 61);
});

test('Seoul zero residual verifies construction only; no Yongin plan, fit, or independent accuracy claim is reused', () => {
    const c = getModelLocationCalibration('seoul');
    assert.equal(c.method, 'published-marker-frame');
    assert.equal(c.planAnchorCount, 0);
    assert.equal(c.validation.kind, 'construction-only');
    assert.equal(c.controls.length, 11);
    assert.ok(c.controls.every(a => a.role === 'construction' && a.leaveOneOutM === null));
    assert.equal(c.fit.maxM, 0); assert.equal(c.modelUncertaintyM, 25);
    assert.equal(c.sources.length, 1); assert.match(c.sources[0], /findType=A$/);
    for (const feature of SEOUL_REFERENCE_CAMPUS.features.filter(f => f.marker)) {
        const result = assessModelLocation('seoul', reading('seoul', feature.marker), now);
        near(result.point.x, feature.center[0]); near(result.point.z, feature.center[1]);
    }
});

test('Unknown campus never silently uses either campus transform', () => {
    assert.deepEqual(assessModelLocation('unknown', reading('seoul'), now), { status: 'unavailable' });
});

test('Saved calibration audit matches current public sources, model centres, every control and held-out metric', () => {
    const audit = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/model-location-audit-v0.5.3.json'), 'utf8'));
    for (const id of ['yongin', 'seoul']) {
        assert.deepEqual(audit.campuses[id].calibration, getModelLocationCalibration(id));
        const source = sources[id].features.filter(f => f.marker);
        assert.equal(audit.campuses[id].publicSourcePairs.length, source.length);
        for (const pair of audit.campuses[id].publicSourcePairs) {
            const feature = source.find(f => f.id === pair.id);
            assert.deepEqual(pair.publishedMarker, feature.marker);
            assert.deepEqual(pair.modelCenterWorld, feature.center);
            assert.deepEqual(pair.eastSouthMeters, projectGeographicPoint(id, feature.marker.lat, feature.marker.lon));
        }
    }
});
