const test = require('node:test');
const assert = require('node:assert/strict');
const {naverLinksForPlace, NAVER_NATIVE_REQUEST} = require('../build/core/naver.js');
const {REFERENCE_CAMPUS} = require('../build/core/campus.js');
const {SEOUL_REFERENCE_CAMPUS} = require('../build/core/seoul.js');

for (const [campusId, campus] of [['yongin', REFERENCE_CAMPUS], ['seoul', SEOUL_REFERENCE_CAMPUS]]) {
  test(`${campusId}: every Naver destination matches its own directory, never the illustrated centre`, () => {
    for (const feature of campus.features) {
      const link = naverLinksForPlace(campusId, feature.id);
      assert.ok(link, feature.id);
      const request = new URL(link.nativeRequestUrl), web = new URL(link.webUrl);
      assert.equal(request.origin + request.pathname, NAVER_NATIVE_REQUEST);
      assert.equal(request.searchParams.get('campus'), campusId);
      assert.equal(request.searchParams.get('place'), feature.id);
      const query = `${campusId === 'seoul' ? '명지대학교 인문캠퍼스' : '명지대학교 자연캠퍼스'} ${feature.name.ko}`;
      assert.equal(request.searchParams.get('name'), query);
      assert.equal(web.origin, 'https://map.naver.com');
      assert.equal(decodeURIComponent(web.pathname), '/p/search/' + query);
      assert.equal(link.sourceUrl, campus.sourceUrl);
      assert.equal(link.checkedAt, campus.checkedAt);
      if (feature.marker) {
        assert.equal(link.kind, 'marker');
        assert.equal(Number(request.searchParams.get('lat')), feature.marker.lat);
        assert.equal(Number(request.searchParams.get('lon')), feature.marker.lon);
        assert.deepEqual([...request.searchParams.keys()].sort(), ['campus', 'lat', 'lon', 'name', 'place']);
      } else {
        assert.equal(link.kind, 'search');
        assert.deepEqual([...request.searchParams.keys()].sort(), ['campus', 'name', 'place']);
      }
      assert.deepEqual(naverLinksForPlace(campusId, feature.id), link, 'repeated clicks keep the same destination');
    }
  });
}

test('Naver rejects unknown and cross-campus IDs instead of opening the other campus', () => {
  for (const feature of REFERENCE_CAMPUS.features) assert.equal(naverLinksForPlace('seoul', feature.id), null);
  for (const feature of SEOUL_REFERENCE_CAMPUS.features) assert.equal(naverLinksForPlace('yongin', feature.id), null);
  for (const id of ['', 'Y3', 'S9', 'missing', 'https://example.com']) assert.equal(naverLinksForPlace('yongin', id), null);
  assert.equal(naverLinksForPlace('invalid', REFERENCE_CAMPUS.features[0].id), null);
});

test('equal library concepts stay geographically separate and retain reviewed marker dates', () => {
  const y = REFERENCE_CAMPUS.features.find(p => p.code === 'Y3');
  const s = SEOUL_REFERENCE_CAMPUS.features.find(p => p.code === 'S9');
  const yParams = new URL(naverLinksForPlace('yongin', y.id).nativeRequestUrl).searchParams;
  const sParams = new URL(naverLinksForPlace('seoul', s.id).nativeRequestUrl).searchParams;
  assert.ok(Math.abs(Number(yParams.get('lat')) - Number(sParams.get('lat'))) > 0.3);
  assert.match(yParams.get('name'), /자연캠퍼스.*명진당/);
  assert.match(sParams.get('name'), /인문캠퍼스.*방목/);
});
