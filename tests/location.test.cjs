'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const filename = require.resolve('../build/core/location.js');
const code = fs.readFileSync(filename, 'utf8');

// Synthetic positions and an isolated deterministic clock. No real navigator,
// browser permission, location service, network or persistence is accessed.
function fixture(options = {}) {
    let now = Date.UTC(2026, 9, 3, 12), nextTimer = 0, nextWatch = 0;
    const timers = new Map(), calls = [], active = new Set(), cleared = [], fixes = [], states = [];
    const clock = {
        setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id; },
        clearTimeout(id) { timers.delete(id); },
        advance(ms) {
            const target = now + ms;
            for (;;) {
                const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
                if (!next) break;
                now = next[1].at; timers.delete(next[0]); next[1].callback();
            }
            now = target;
        },
    };
    class FakeDate extends Date { static now() { return now; } }
    const provider = {
        watchPosition(success, error, config) {
            if (options.throwOnWatch) throw new Error('Synthetic unavailable provider');
            const id = ++nextWatch, call = { id, success, error, config };
            calls.push(call); active.add(id);
            options.onWatch?.(call, position);
            return id;
        },
        clearWatch(id) { active.delete(id); cleared.push(id); },
    };
    const navigator = { geolocation: options.missingProvider ? undefined : provider };
    const exports = {};
    vm.runInNewContext(code, {
        exports, window: { setTimeout: clock.setTimeout }, clearTimeout: clock.clearTimeout, Date: FakeDate,
    }, { filename });
    const tracker = new exports.ForegroundLocation(navigator.geolocation,
        fix => { fixes.push(fix ? { ...fix } : null); }, phase => states.push(phase));
    function position(fields = {}) {
        return {
            coords: { latitude: 12.345, longitude: 45.678, accuracy: 17, ...fields.coords },
            timestamp: fields.timestamp ?? now,
        };
    }
    return { tracker, clock, calls, active, cleared, fixes, states, timers, position, now: () => now,
        lastFix: () => fixes.at(-1), lastState: () => states.at(-1) };
}

function assertStopped(f, state) {
    assert.equal(f.lastState(), state);
    assert.equal(f.lastFix(), null);
    assert.equal(f.active.size, 0);
    assert.equal(f.timers.size, 0);
}

test('location is opt-in and requests fresh readings with no cached-position allowance', () => {
    const f = fixture();
    assert.equal(f.calls.length, 0);
    assert.equal(f.fixes.length, 0);
    assert.equal(f.states.length, 0);
    f.tracker.start();
    assert.equal(f.calls.length, 1);
    assert.equal(f.lastState(), 'requesting');
    assert.equal(f.lastFix(), null);
    assert.equal(f.calls[0].config.maximumAge, 0);
    assert.equal(f.calls[0].config.enableHighAccuracy, true);
    assert.ok(f.calls[0].config.timeout > 0 && f.calls[0].config.timeout <= 20_000);
    f.tracker.dispose();
});

test('location copies a fix without changing its timestamp or reported uncertainty', () => {
    const f = fixture(); f.tracker.start();
    const position = f.position({ coords: { accuracy: 4_000 } });
    f.calls[0].success(position);
    assert.equal(f.lastState(), 'active');
    assert.deepEqual(f.lastFix(), { lat: 12.345, lon: 45.678, accuracyM: 4_000, timestamp: f.now() });
    position.coords.latitude = 0; position.coords.accuracy = 1;
    assert.equal(f.lastFix().lat, 12.345);
    assert.equal(f.lastFix().accuracyM, 4_000);
    f.tracker.stop('paused'); assertStopped(f, 'paused');
});

test('location removes a reading when its source timestamp becomes stale', () => {
    const f = fixture(); f.tracker.start();
    f.calls[0].success(f.position({ timestamp: f.now() - 45_000 }));
    f.clock.advance(14_999);
    assert.equal(f.lastState(), 'active');
    f.clock.advance(1); assertStopped(f, 'stale');
    assert.deepEqual(f.cleared, [f.calls[0].id]);
});

test('a fresh update extends expiry and cancels the initial acquisition watchdog', () => {
    const f = fixture(); f.tracker.start();
    f.clock.advance(10_000); f.calls[0].success(f.position());
    f.clock.advance(15_000); assert.equal(f.lastState(), 'active');
    f.calls[0].success(f.position());
    f.clock.advance(59_999); assert.equal(f.lastState(), 'active');
    f.clock.advance(1); assertStopped(f, 'stale');
});

test('a provider that stays silent times out and cannot publish a delayed position', () => {
    const f = fixture(); f.tracker.start();
    f.clock.advance(19_999); assert.equal(f.lastState(), 'requesting');
    f.clock.advance(1); assertStopped(f, 'timeout');
    const fixes = f.fixes.length, states = f.states.length;
    f.calls[0].success(f.position()); f.calls[0].error({ code: 1 });
    assert.equal(f.fixes.length, fixes); assert.equal(f.states.length, states);
});

test('pause clears the reading, watch and timer; returning requires an explicit start', () => {
    const f = fixture(); f.tracker.start(); f.calls[0].success(f.position());
    f.tracker.stop('paused'); assertStopped(f, 'paused');
    const fixes = f.fixes.length, states = f.states.length;
    f.calls[0].success(f.position()); f.calls[0].error({ code: 3 }); f.clock.advance(120_000);
    assert.equal(f.calls.length, 1);
    assert.equal(f.fixes.length, fixes); assert.equal(f.states.length, states);
    f.tracker.start(); assert.equal(f.calls.length, 2);
    assert.equal(f.lastState(), 'requesting'); assert.equal(f.lastFix(), null);
    f.tracker.dispose();
});

test('repeated start replaces its watch and ignores callbacks from the previous generation', () => {
    const f = fixture(); f.tracker.start();
    f.calls[0].success(f.position()); f.tracker.start();
    assert.deepEqual([...f.active], [f.calls[1].id]);
    assert.deepEqual(f.cleared, [f.calls[0].id]);
    assert.equal(f.lastFix(), null);
    const fixes = f.fixes.length, states = f.states.length;
    f.calls[0].success(f.position()); f.calls[0].error({ code: 1 });
    assert.equal(f.fixes.length, fixes); assert.equal(f.states.length, states);
    f.calls[1].success(f.position()); assert.equal(f.lastState(), 'active');
    f.tracker.dispose(); assertStopped(f, 'idle');
});

for (const [errorCode, phase] of [[1, 'denied'], [2, 'unavailable'], [3, 'timeout'], [99, 'unavailable']]) {
    test(`provider error ${errorCode} clears a previously active fix and reports ${phase}`, () => {
        const f = fixture(); f.tracker.start(); f.calls[0].success(f.position());
        f.calls[0].error({ code: errorCode }); assertStopped(f, phase);
        f.clock.advance(120_000); assertStopped(f, phase);
    });
}

test('missing or throwing location providers report unavailable without leaving timers', () => {
    for (const options of [{ missingProvider: true }, { throwOnWatch: true }]) {
        const f = fixture(options); f.tracker.start(); assertStopped(f, 'unavailable');
    }
});

test('invalid coordinates and accuracy remove any previous valid reading', () => {
    for (const coords of [
        { latitude: NaN }, { latitude: Infinity }, { latitude: 90.001 }, { latitude: -90.001 },
        { longitude: NaN }, { longitude: 180.001 }, { longitude: -180.001 }, { latitude: '12' },
        { accuracy: 0 }, { accuracy: -1 }, { accuracy: NaN }, { accuracy: Infinity },
    ]) {
        const f = fixture(); f.tracker.start(); f.calls[0].success(f.position());
        f.calls[0].success(f.position({ coords })); assertStopped(f, 'unavailable');
    }
});

test('nonfinite timestamps fail validation and old or excessive future timestamps are rejected', () => {
    for (const timestamp of [NaN, Infinity, -Infinity]) {
        const f = fixture(); f.tracker.start();
        f.calls[0].success(f.position({ timestamp })); assertStopped(f, 'unavailable');
    }
    for (const delta of [-60_001, 10_001]) {
        const f = fixture(); f.tracker.start();
        f.calls[0].success(f.position({ timestamp: f.now() + delta })); assertStopped(f, 'stale');
    }
});

test('timestamp tolerance boundaries retain the original timestamp and still expire', () => {
    for (const delta of [-60_000, 10_000]) {
        const f = fixture(); f.tracker.start();
        const timestamp = f.now() + delta;
        f.calls[0].success(f.position({ timestamp }));
        assert.equal(f.lastState(), 'active'); assert.equal(f.lastFix().timestamp, timestamp);
        f.clock.advance(delta === -60_000 ? 1 : 70_000); assertStopped(f, 'stale');
    }
});

test('synchronous success is tracked and synchronous denial or stale results clear the returned watch', () => {
    const good = fixture({ onWatch: (call, position) => call.success(position()) });
    good.tracker.start(); assert.equal(good.lastState(), 'active');
    good.tracker.dispose(); assertStopped(good, 'idle');
    for (const [phase, callback] of [
        ['denied', call => call.error({ code: 1 })],
        ['stale', (call, position) => call.success(position({ timestamp: 1 }))],
    ]) {
        const f = fixture({ onWatch: callback }); f.tracker.start();
        assertStopped(f, phase); assert.deepEqual(f.cleared, [f.calls[0].id]);
    }
});

test('dispose ignores already queued success and error callbacks and is safe to repeat', () => {
    const f = fixture(); f.tracker.start(); f.calls[0].success(f.position());
    f.tracker.dispose(); f.tracker.dispose(); assertStopped(f, 'idle');
    const fixes = f.fixes.length, states = f.states.length;
    f.calls[0].success(f.position()); f.calls[0].error({ code: 2 }); f.clock.advance(120_000);
    assert.equal(f.fixes.length, fixes); assert.equal(f.states.length, states);
    assert.deepEqual(f.cleared, [f.calls[0].id]);
});
