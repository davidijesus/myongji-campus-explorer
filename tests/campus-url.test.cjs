'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { campusFromUrl, initialCampus, campusUrlFor } = require('../build/core/campus-url.js');
const base = 'https://davidijesus.github.io/myongji-campus-explorer/';

test('a single explicit campus wins over saved preferences; no query preserves saved/default choice', () => {
    for (const campus of ['seoul', 'yongin']) {
        assert.equal(campusFromUrl(base + '?campus=' + campus), campus);
        assert.equal(initialCampus(base + '?campus=' + campus, campus === 'seoul' ? 'yongin' : 'seoul'), campus);
        assert.equal(initialCampus(base + '?campus=' + campus, undefined), campus);
        assert.equal(initialCampus(base, campus), campus);
    }
    assert.equal(initialCampus(base, 'unknown'), 'yongin');
    assert.equal(initialCampus('not a URL', 'seoul'), 'seoul');
});

test('invalid and duplicate campus parameters conservatively defer to saved preferences', () => {
    for (const query of ['campus=', 'campus=invalid', 'campus=SEOUL', 'campus=seoul%20', 'campus=seoul&campus=yongin', 'campus=seoul&campus=seoul', 'campus=invalid&campus=yongin']) {
        const href = base + '?' + query;
        assert.equal(campusFromUrl(href), null, query);
        assert.equal(initialCampus(href, 'seoul'), 'seoul', query);
        assert.equal(initialCampus(href, 'yongin'), 'yongin', query);
        assert.equal(initialCampus(href, undefined), 'yongin', query);
    }
});

test('changing campus preserves other query values and fragments and produces stable reload links', () => {
    const original = base + '?source=home&tag=a&tag=b&q=with%20spaces&campus=seoul#building-info';
    const result = campusUrlFor(original, 'yongin'), url = new URL(result);
    assert.equal(url.origin + url.pathname, base);
    assert.deepEqual(url.searchParams.getAll('campus'), ['yongin']);
    assert.deepEqual(url.searchParams.getAll('tag'), ['a', 'b']);
    assert.equal(url.searchParams.get('source'), 'home'); assert.equal(url.searchParams.get('q'), 'with spaces');
    assert.equal(url.hash, '#building-info');
    assert.equal(initialCampus(result, 'seoul'), 'yongin');
    assert.equal(campusUrlFor(result, 'yongin'), result, 'repeated selection is idempotent');
    const fixed = new URL(campusUrlFor(base + '?campus=x&campus=seoul&source=home#map', 'seoul'));
    assert.deepEqual(fixed.searchParams.getAll('campus'), ['seoul']);
    assert.equal(fixed.searchParams.get('source'), 'home'); assert.equal(fixed.hash, '#map');
});

test('local/native document URLs remain supported without creating external navigation', () => {
    for (const href of ['http://127.0.0.1:4173/preview.html', 'file:///C:/preview.html', 'https://appassets.androidplatform.net/assets/index.html']) {
        const result = campusUrlFor(href, 'seoul');
        assert.equal(new URL(result).pathname, new URL(href).pathname);
        assert.equal(new URL(result).origin, new URL(href).origin);
        assert.equal(campusFromUrl(result), 'seoul');
    }
    assert.equal(campusUrlFor('data:text/html,preview', 'seoul'), null);
    assert.equal(campusUrlFor('invalid', 'seoul'), null);
});
