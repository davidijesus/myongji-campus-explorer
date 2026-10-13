'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createReferencePlaces } = require('../build/core/campus.js');
const { createSeoulReferencePlaces, SEOUL_BUILDING_CONTENT, SEOUL_CONTENT_CHECKED } = require('../build/core/seoul.js');
const { YONGIN_PLACE_DESCRIPTIONS } = require('../build/core/place-descriptions.js');
const { answerQuestion, getCampusKnowledge } = require('../build/core/knowledge.js');
const { localize } = require('../build/core/i18n.js');

const languages = ['en', 'ko', 'zh'];
const placesByCampus = { yongin: createReferencePlaces(), seoul: createSeoulReferencePlaces() };
const contentFor = (campus, place) => campus === 'yongin'
  ? YONGIN_PLACE_DESCRIPTIONS[place.id] : SEOUL_BUILDING_CONTENT[place.code];
const sourcesFor = (campus, content) => {
  const sources = getCampusKnowledge(campus).sources;
  return campus === 'yongin'
    ? content.sourceUrls.map(url => sources.find(source => source.url === url))
    : content.sourceIds.map(id => sources.find(source => source.id === id));
};

test('all reviewed descriptions reach the place cards in EN, KO and ZH with dated official sources', () => {
  assert.equal(Object.keys(YONGIN_PLACE_DESCRIPTIONS).length, 21);
  assert.deepEqual(Object.keys(SEOUL_BUILDING_CONTENT).sort(), ['S1', 'S10', 'S2', 'S3', 'S4', 'S5', 'S8', 'S9']);
  for (const campus of ['yongin', 'seoul']) {
    let reviewed = 0;
    for (const place of placesByCampus[campus]) {
      const content = contentFor(campus, place);
      if (!content) continue;
      reviewed++;
      assert.deepEqual(place.description, content.description, place.id);
      for (const language of languages) {
        const text = content.description[language];
        assert.equal(typeof text, 'string', `${place.id}/${language}`);
        assert.ok(text.trim(), `${place.id}/${language}`);
        assert.notEqual(text, localize(place.name, language), `${place.id}/${language}`);
        assert.doesNotMatch(text, /illustrat(?:ion|ive)|schematic|generic|rendered|not surveyed/i, place.id);
      }
      assert.match(content.description.ko, /[가-힣]/, place.id);
      assert.match(content.description.zh, /[\u4e00-\u9fff]/, place.id);
      assert.equal(campus === 'yongin' ? content.checkedAt : SEOUL_CONTENT_CHECKED, '2026-10-06');
      const sources = sourcesFor(campus, content);
      assert.ok(sources.length, place.id);
      for (const source of sources) {
        assert.ok(source, `${place.id}: source must be registered`);
        assert.equal(source.kind, 'official', source.id);
        assert.equal(source.status, 'checked', source.id);
        assert.equal(source.checkedAt, '2026-10-06', source.id);
        const url = new URL(source.url);
        assert.equal(url.protocol, 'https:', source.id);
        assert.ok(url.hostname === 'mju.ac.kr' || url.hostname.endsWith('.mju.ac.kr'), source.id);
      }
      // A content review must never advance the date or status of physical verification.
      assert.equal(place.geometryEvidence.status, 'unverified', place.id);
      assert.equal(place.geometryEvidence.checkedAt, null, place.id);
    }
    assert.equal(reviewed, campus === 'yongin' ? 21 : 8);
  }
});

test('key facility and office facts preserve the reviewed floors across translations', () => {
  const expected = [
    ['yongin', 'mju-y12', /CAFEING on 1F/, /1층에 CAFEING/, /1层设有CAFEING/],
    ['yongin', 'mju-y13', /Civil Engineering office/, /토목공학 사무실/, /土木工程办公室/],
    ['yongin', 'mju-y21', /Hana Bank on 1F; café and shops on 2F/, /1층에 하나은행, 2층에 카페/, /1层设有韩亚银行，2层设有咖啡店/],
    ['seoul', 'mju-s1', /Social Sciences administration is on floor 6; Humanities administration is on floor 7/, /사회과학대학교학팀은 6층, 인문대학교학팀은 7층/, /社会科学学院教务组位于6楼，人文学院教务组位于7楼/],
    ['seoul', 'mju-s3', /Future Convergence academic administration team is on floor 2/, /미래융합대학교학팀은 2층/, /未来融合学院教务组位于2楼/],
    ['seoul', 'mju-s4', /Health Center, Disability Support Center and Student Counseling Center are on floor 1/, /보건의료센터, 장애학생지원센터, 학생상담센터는 1층/, /保健医疗中心、残障学生支援中心和学生咨询中心位于1楼/],
    ['seoul', 'mju-s5', /International Exchange Support is on floor 4.*bank and convenience store are on floor 1/, /국제교류지원팀은 4층.*은행과 편의점은 1층/, /国际交流支援组位于4楼，银行和便利店位于1楼/],
    ['seoul', 'mju-s10', /Business academic administration is on floor 4.*Veritas Hall, floor 3, room 10350/, /경영대학교학팀은 4층.*베리타스홀 3층 10350호/, /经营学院教务组位于4楼.*Veritas Hall 3楼10350室/],
  ];
  for (const [campus, id, ...patterns] of expected) {
    const place = placesByCampus[campus].find(p => p.id === id);
    languages.forEach((language, i) => assert.match(place.description[language], patterns[i], `${id}/${language}`));
  }
});

for (const campus of ['yongin', 'seoul']) {
  for (const language of languages) {
    test(`${campus} Ask reuses every sourced description and citation for exact names and codes in ${language}`, () => {
      for (const place of placesByCampus[campus]) {
        const content = contentFor(campus, place);
        if (!content) continue;
        const queries = new Set([place.code, localize(place.name, language)].filter(Boolean));
        for (const query of queries) {
          const context = `${place.id}/${language}/${query}`;
          const answer = answerQuestion(query, language, campus);
          assert.ok(answer.answer.includes(place.description[language]), context);
          assert.deepEqual(answer.placeCodes, place.code ? [place.code] : [], context);
          assert.equal(answer.status, place.code === 'Y32' ? 'limited' : 'supported', context);
          for (const source of sourcesFor(campus, content)) {
            assert.ok(source && answer.citations.includes(source.id), `${context}: ${source?.id}`);
          }
          assert.ok(answer.citations.every(id => getCampusKnowledge(campus).sources.some(s => s.id === id)), context);
        }
      }
    });
  }
}

test('reference entries without reviewed descriptions show only their localized names and codes', () => {
  for (const campus of ['yongin', 'seoul']) {
    const places = placesByCampus[campus].filter(place => !contentFor(campus, place));
    assert.equal(places.length, campus === 'yongin' ? 29 : 3);
    for (const place of places) {
      assert.deepEqual(place.description, place.name, place.id);
      for (const language of languages) {
        const name = localize(place.name, language);
        for (const query of new Set([name, place.code].filter(Boolean))) {
          const answer = answerQuestion(query, language, campus);
          assert.equal(answer.answer, name + (place.code ? ` · ${place.code}` : ''), `${place.id}/${language}/${query}`);
          assert.deepEqual(answer.placeCodes, place.code ? [place.code] : [], place.id);
          assert.ok(answer.citations.includes(campus === 'yongin'
            ? (['I', 'J'].includes(place.code) ? 'user-campus-reference' : 'mju-campus-directory')
            : 'seoul-directory'), place.id);
        }
      }
    }
  }
});

test('the legacy Seoul Main Building shop keeps its source location without an invented map link', () => {
  const food = getCampusKnowledge('seoul').food;
  const legacy = food.find(venue => venue.id === 'seoul-main-store');
  assert.equal(legacy.placeCode, null);
  assert.equal(legacy.location.en, 'Main Building (본관) · 4F');
  assert.deepEqual(legacy.sourceIds, ['seoul-welfare']);
  assert.equal(legacy.hours, null);
  assert.equal(legacy.price, null);
  for (const language of languages) {
    const allStores = answerQuestion('convenience stores', language, 'seoul');
    assert.ok(allStores.answer.includes(legacy.name[language]));
    assert.ok(allStores.answer.includes(legacy.location[language]));
    assert.deepEqual(allStores.placeCodes, ['S5']);
    assert.deepEqual(allStores.citations, ['seoul-welfare']);
    assert.doesNotMatch(allStores.answer, /\(null\)|\(S1\)/);
    const generalHall = answerQuestion('stores S1', language, 'seoul');
    assert.equal(generalHall.status, 'unknown');
    assert.ok(!generalHall.answer.includes(legacy.name[language]));
  }
});
