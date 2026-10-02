const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { t, localize, hasChineseTranslation } = require('../build/core/i18n.js');
const { liveSeed } = require('../build/core/data.js');
const { REFERENCE_CAMPUS } = require('../build/core/campus.js');
const { searchPlaces, validateDataset, parseNativeMessage, SEOUL_CAMPUS_ID } = require('../build/core/core.js');

test('localization honors explicit Chinese while preserving legacy en/ko and unknown remote names', () => {
  assert.equal(t('Explore', '탐색', 'zh'), '探索');
  assert.equal(t('Explore', '탐색', 'en'), 'Explore');
  assert.equal(t('Explore', '탐색', 'ko'), '탐색');
  assert.equal(localize({ en: 'Explore', ko: '탐색', zh: '浏览' }, 'zh'), '浏览');
  assert.equal(localize({ en: 'New remote proper name', ko: '새 이름' }, 'zh'), 'New remote proper name');
  for (const name of ['constructor', 'toString', '__proto__']) {
    assert.equal(localize({ en: name, ko: name }, 'zh'), name);
    assert.equal(hasChineseTranslation(name), false);
  }
});

test('Chinese names and translated aliases find the same verified Yongin buildings', () => {
  assert.equal(searchPlaces(liveSeed, '第３工学馆')[0].id, 'mju-y19');
  assert.equal(searchPlaces(liveSeed, '图书馆')[0].id, 'mju-y3');
  assert.equal(searchPlaces(liveSeed, '礼拜堂')[0].id, 'mju-y22');
  assert.equal(searchPlaces(liveSeed, '学生会馆')[0].id, searchPlaces(liveSeed, '학생회관')[0].id);
  const explicit = structuredClone(liveSeed);
  explicit.places.find(p => p.id === 'mju-y3').name.zh = '中文测试馆';
  assert.equal(searchPlaces(explicit, '中文测试馆')[0].id, 'mju-y3');
  assert.equal(searchPlaces(liveSeed, '图书馆', 'food').length, 0);
});

test('optional zh data is backwards compatible and validated when supplied', () => {
  assert.deepEqual(validateDataset(liveSeed, 'live'), []);
  const data = structuredClone(liveSeed);
  data.campus.name.zh = '明知大学自然校区';
  assert.deepEqual(validateDataset(data, 'live'), []);
  for (const invalid of [null, 42, '', {}, '字'.repeat(3001)]) {
    data.campus.name.zh = invalid;
    assert.ok(validateDataset(data, 'live').some(e => e.includes('Chinese translation')));
  }
});

test('only the two explicit campus dataset IDs are accepted', () => {
  const data = structuredClone(liveSeed);
  data.campus.id = SEOUL_CAMPUS_ID;
  assert.deepEqual(validateDataset(data, 'live'), []);
  for (const id of ['seoul', 'mju-seoul', 'yongin', 'other-campus']) {
    data.campus.id = id;
    assert.ok(validateDataset(data, 'live').some(e => e.includes('Wrong campus')));
  }
});

test('native preferences retain global favorites, zh and campus while accepting old save messages', () => {
  const message = { type: 'save', language: 'zh', campusId: 'seoul', favorites: ['mju-y3', 'mju-s1'] };
  assert.deepEqual(parseNativeMessage(message), message);
  const legacy = { type: 'save', language: 'ko', favorites: ['mju-y3'] };
  assert.deepEqual(parseNativeMessage(legacy), legacy);
  for (const campusId of ['mju-seoul-humanities', '', null, 12]) assert.equal(parseNativeMessage({ ...message, campusId }), null);
  assert.equal(parseNativeMessage({ ...message, language: 'ja' }), null);
});

test('every bundled Yongin localized name, detail and evidence note has a Chinese translation', () => {
  const missing = new Set();
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.en === 'string' && typeof value.ko === 'string' && !value.zh?.trim() && !hasChineseTranslation(value.en)) missing.add(value.en);
    for (const child of Object.values(value)) walk(child);
  }
  walk(liveSeed); walk(REFERENCE_CAMPUS.features);
  assert.deepEqual([...missing], []);
});

test('all static web and native UI translations have explicit or dictionary Chinese coverage', () => {
  const missing = new Set();
  for (const file of ['src/ui.ts', 'mobile/App.tsx']) {
    const absolute = path.join(__dirname, '..', file);
    const source = ts.createSourceFile(file, fs.readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isCallExpression(node) && ['L', 'say', 't'].includes(node.expression.getText(source)) && node.arguments.length >= 2 && ts.isStringLiteralLike(node.arguments[0]) && ts.isStringLiteralLike(node.arguments[1])) {
        const en = node.arguments[0].text;
        const explicit = node.arguments[node.expression.getText(source) === 'L' ? 2 : 3];
        if (!(explicit && ts.isStringLiteralLike(explicit) && explicit.text.trim()) && !hasChineseTranslation(en)) missing.add(`${file}: ${en}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual([...missing], []);
});
