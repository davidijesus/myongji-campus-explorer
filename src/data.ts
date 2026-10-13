import { Dataset, Evidence, DemoPoint, Localized, Category, Building } from './types';
import { CAMPUS_ID, SOURCE_MAP } from './core';
import { createReferencePlaces } from './campus';
const tr = (en: string, ko: string): Localized => ({ en, ko });
export const DEMO_EVIDENCE: Evidence = { status: 'demo', sourceUrl: null, checkedAt: null, note: tr('Fictional fixture. Not a real campus place or surveyed coordinate.', '가상 샘플입니다. 실제 캠퍼스 장소나 측량 좌표가 아닙니다.') };
export const UNKNOWN_EVIDENCE: Evidence = { status: 'unverified', sourceUrl: null, checkedAt: null, note: tr('Not yet verified.', '아직 확인되지 않았습니다.') };
export const OFFICIAL_EVIDENCE: Evidence = { status: 'verified', sourceUrl: SOURCE_MAP, checkedAt: '2026-09-29T12:42:48Z', note: tr('Campus identity and address checked against the official campus map page. No entrance, path or building coordinates were verified.', '공식 캠퍼스 지도 페이지에서 캠퍼스명과 주소를 확인했습니다. 출입구, 보행로, 건물 좌표는 확인되지 않았습니다.') };
export const liveSeed: Dataset = {
    schemaVersion: 1, id: 'mju-yongin-live', mode: 'live', version: 2, updatedAt: '2026-09-29T14:00:00Z',
    campus: { id: CAMPUS_ID, name: tr('Myongji University · Natural Science Campus', '명지대학교 자연캠퍼스'), address: tr('116 Myongji-ro, Cheoin-gu, Yongin-si, Gyeonggi-do, 17058, Korea', '경기도 용인시 처인구 명지로 116 (17058)'), evidence: OFFICIAL_EVIDENCE, origin: null, boundary: null, geometryEvidence: UNKNOWN_EVIDENCE },
    places: [{ id: 'mju-yongin-campus', name: tr('Natural Science Campus', '자연캠퍼스'), aliases: ['Myongji Yongin', '명지대학교 자연캠퍼스', 'Yongin campus', '용인'], category: 'services', description: { en: '116 Myongji-ro, Cheoin-gu, Yongin.', ko: '용인시 처인구 명지로 116.', zh: '龙仁市处仁区明知路116号。' }, code: null, point: null, evidence: OFFICIAL_EVIDENCE, geometryEvidence: UNKNOWN_EVIDENCE, buildingId: null, entranceIds: [], photo: null }],
    buildings: [], entrances: [], nodes: [], edges: [], food: [], events: [], rooms: []
};
liveSeed.places.push(...createReferencePlaces());
const pt = (x: number, z: number, elevationM = 0): DemoPoint => ({ frame: 'demo', x, z, elevationM });
/** All sample coordinates are local meters, deliberately NOT WGS84. */
export function createDemoData(): Dataset {
    const data: Dataset = { schemaVersion: 1, id: 'mju-isolated-demo', mode: 'demo', version: 1, updatedAt: '2026-09-29T12:00:00+09:00', campus: { ...liveSeed.campus, name: tr('Campus design sandbox', '캠퍼스 디자인 샌드박스'), address: tr('Fictional layout · not Myongji campus geography', '가상 배치 · 실제 명지대 캠퍼스 지형이 아닙니다'), evidence: DEMO_EVIDENCE, geometryEvidence: DEMO_EVIDENCE, origin: null, boundary: null }, places: [], buildings: [], entrances: [], nodes: [], edges: [], food: [], events: [], rooms: [] };
    const specs: {
        id: string;
        en: string;
        ko: string;
        category: Category;
        x: number;
        z: number;
        w: number;
        d: number;
        h: number;
        form: Building['form'];
        color: string;
        code: string;
        ex: number;
        ez: number;
        description: Localized;
    }[] = [
        { id: 'library', en: 'Demo Library', ko: '샘플 도서관', category: 'library', x: -47, z: -38, w: 51, d: 30, h: 23, form: 'library', color: '#e8dcc6', code: 'D-01', ex: -47, ez: -18, description: tr('A quiet place to find your next idea. This sample building demonstrates search, entrances and saved places.', '새로운 아이디어를 찾는 조용한 공간입니다. 검색, 출입구, 즐겨찾기를 체험하는 가상 건물입니다.') },
        { id: 'science', en: 'Demo Science Hall', ko: '샘플 과학관', category: 'academic', x: 42, z: -51, w: 38, d: 32, h: 34, form: 'hall', color: '#dcd6c9', code: 'D-02', ex: 42, ez: -30, description: tr('A sample academic building. Try its building code or the fictional room D201 in search.', '가상의 교육 건물입니다. 건물 코드나 가상 강의실 D201을 검색해 보세요.') },
        { id: 'union', en: 'Demo Student Hub', ko: '샘플 학생회관', category: 'services', x: 0, z: 42, w: 42, d: 26, h: 18, form: 'pavilion', color: '#edd0b4', code: 'D-03', ex: 0, ez: 24, description: tr('A sample meeting place for clubs and campus life. Event cards connect back to this venue.', '동아리와 캠퍼스 생활을 위한 가상 공간입니다. 행사 카드에서 이 장소를 지도에 표시할 수 있습니다.') },
        { id: 'coffee', en: 'Demo Garden Café', ko: '샘플 가든 카페', category: 'food', x: -88, z: 28, w: 27, d: 22, h: 12, form: 'pavilion', color: '#d9c5aa', code: 'D-04', ex: -88, ez: 13, description: tr('A fictional café next to the sample garden. Prices and hours are demonstration data, not real offers.', '샘플 정원 옆의 가상 카페입니다. 가격과 영업시간은 실제 정보가 아닌 시연용 데이터입니다.') },
        { id: 'dining', en: 'Demo Dining Hall', ko: '샘플 학생식당', category: 'food', x: 78, z: 24, w: 35, d: 26, h: 15, form: 'hall', color: '#dbc9b8', code: 'D-05', ex: 78, ez: 6, description: tr('A fictional cafeteria with a sample budget-friendly menu. No dietary or allergen claims are made.', '저렴한 샘플 메뉴를 제공하는 가상 식당입니다. 식이 요법이나 알레르기 관련 정보를 보장하지 않습니다.') },
        { id: 'residence', en: 'Demo Residence', ko: '샘플 생활관', category: 'residence', x: -23, z: -104, w: 31, d: 22, h: 43, form: 'tower', color: '#d9d7cf', code: 'D-06', ex: -23, ez: -88, description: tr('A sample residence hall with multiple floors. Its geometry and entrances are fictional.', '여러 층으로 구성된 가상 생활관입니다. 건물 형태와 출입구는 실제와 다릅니다.') },
        { id: 'arts', en: 'Demo Studio Hall', ko: '샘플 스튜디오관', category: 'academic', x: 94, z: -82, w: 30, d: 26, h: 21, form: 'hall', color: '#e3cab5', code: 'D-07', ex: 94, ez: -64, description: tr('A sample studio building. The stairs option shows how path restrictions affect route choices.', '가상 스튜디오 건물입니다. 계단 회피 옵션으로 경로 선택이 어떻게 달라지는지 확인할 수 있습니다.') },
        { id: 'gate', en: 'Demo Welcome Gate', ko: '샘플 정문', category: 'outdoors', x: 0, z: 107, w: 26, d: 9, h: 12, form: 'gate', color: '#d4c3ac', code: 'D-00', ex: 0, ez: 99, description: tr('The default starting point in this fictional scene. This is not the location of the real university entrance.', '가상 장면의 기본 출발지입니다. 실제 대학 정문 위치가 아닙니다.') }
    ];
    for (const s of specs) {
        const id = `demo-${s.id}`, entranceId = `${id}-entrance`, nodeId = `${id}-node`;
        data.places.push({ id, name: tr(s.en, s.ko), aliases: [s.en.replace('Demo ', ''), s.ko.replace('샘플 ', ''), s.id], category: s.category, description: s.description, code: s.code, point: pt(s.x, s.z), evidence: DEMO_EVIDENCE, geometryEvidence: DEMO_EVIDENCE, buildingId: `${id}-model`, entranceIds: [entranceId], photo: null });
        data.buildings.push({ id: `${id}-model`, placeId: id, point: pt(s.x, s.z), widthM: s.w, depthM: s.d, heightM: s.h, bearingDegrees: 0, form: s.form, color: s.color, evidence: DEMO_EVIDENCE });
        data.entrances.push({ id: entranceId, placeId: id, nodeId, name: tr('Sample main entrance', '샘플 주 출입구'), point: pt(s.ex, s.ez), stairs: false, notes: tr('Fictional entrance · step-free status is not an accessibility certification.', '가상 출입구 · 계단 유무는 휠체어 접근성 인증이 아닙니다.'), evidence: DEMO_EVIDENCE });
        data.nodes.push({ id: nodeId, point: pt(s.ex, s.ez), access: 'public', evidence: DEMO_EVIDENCE });
    }
    const junctions = [['south', 0, 76], ['center', 0, 6], ['north', 0, -74], ['west', -88, 6], ['lib', -47, 6], ['sci', 42, 6], ['far-east', 114, 6], ['arts', 114, -64], ['dorm', -23, -74]] as const;
    for (const [id, x, z] of junctions)
        data.nodes.push({ id: `demo-j-${id}`, point: pt(x, z), access: 'public', evidence: DEMO_EVIDENCE });
    const links: [
        string,
        string,
        boolean?
    ][] = [['demo-gate-node', 'demo-j-south'], ['demo-j-south', 'demo-union-entrance-path'], ['demo-union-entrance-path', 'demo-j-center'], ['demo-j-center', 'demo-j-lib'], ['demo-j-lib', 'demo-j-west'], ['demo-j-center', 'demo-j-sci'], ['demo-j-sci', 'demo-dining-node'], ['demo-dining-node', 'demo-j-far-east'], ['demo-j-center', 'demo-j-north'], ['demo-j-north', 'demo-j-dorm'], ['demo-j-dorm', 'demo-residence-node'], ['demo-j-lib', 'demo-library-node'], ['demo-j-west', 'demo-coffee-node'], ['demo-j-sci', 'demo-science-node'], ['demo-j-far-east', 'demo-j-arts'], ['demo-j-arts', 'demo-arts-node'], ['demo-dining-node', 'demo-arts-node', true]];
    // The student hub entrance is on a side branch, never under the building footprint.
    data.nodes.push({ id: 'demo-union-entrance-path', point: pt(-34, 76), access: 'public', evidence: DEMO_EVIDENCE });
    data.nodes.push({ id: 'demo-hub-side', point: pt(-34, 24), access: 'public', evidence: DEMO_EVIDENCE });
    // Correct the northbound segment so it skirts the hub rather than crossing it.
    links.splice(2, 1, ['demo-union-entrance-path', 'demo-hub-side'], ['demo-hub-side', 'demo-j-center'], ['demo-hub-side', 'demo-union-node']);
    links.forEach(([from, to, stairs = false], i) => { const a = data.nodes.find(n => n.id === from)!.point as DemoPoint, b = data.nodes.find(n => n.id === to)!.point as DemoPoint; data.edges.push({ id: `demo-edge-${i}`, from, to, distanceM: Math.hypot(a.x - b.x, a.z - b.z), stairs, slopePercent: 0, access: 'public', bidirectional: true, evidence: DEMO_EVIDENCE }); });
    data.food = [
        { id: 'demo-food-coffee', placeId: 'demo-coffee', kind: 'cafe', campusSide: 'on-campus', price: { min: 3000, max: 6500, currency: 'KRW', evidence: DEMO_EVIDENCE }, hours: { timeZone: 'Asia/Seoul', weekly: [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, open: '08:00', close: '22:00' })), exceptions: [], evidence: DEMO_EVIDENCE }, dietaryClaims: [], evidence: DEMO_EVIDENCE },
        { id: 'demo-food-dining', placeId: 'demo-dining', kind: 'cafeteria', campusSide: 'on-campus', price: { min: 4500, max: 7000, currency: 'KRW', evidence: DEMO_EVIDENCE }, hours: null, dietaryClaims: [], evidence: DEMO_EVIDENCE }
    ];
    data.events = [
        { id: 'demo-event-welcome', title: tr('Find your people', '친구를 만나는 시간'), description: tr('A fictional welcome gathering to preview the events experience. Not a real scheduled event.', '행사 화면을 체험하기 위한 가상 환영 모임입니다. 실제 예정된 행사가 아닙니다.'), organizer: tr('Sample International Club', '샘플 국제교류 동아리'), placeId: 'demo-union', startsAt: '2026-10-02T17:00:00+09:00', endsAt: '2026-10-02T19:00:00+09:00', timeZone: 'Asia/Seoul', language: tr('English & Korean', '영어 및 한국어'), state: 'published', registrationUrl: null, evidence: DEMO_EVIDENCE },
        { id: 'demo-event-studio', title: tr('A little room for ideas', '아이디어가 자라는 공간'), description: tr('A fictional student design evening. Demonstration only; there is no registration.', '가상의 학생 디자인 모임입니다. 시연용으로, 실제 등록은 없습니다.'), organizer: tr('Sample Design Society', '샘플 디자인 동아리'), placeId: 'demo-arts', startsAt: '2026-10-06T18:30:00+09:00', endsAt: '2026-10-06T20:00:00+09:00', timeZone: 'Asia/Seoul', language: tr('English', '영어'), state: 'published', registrationUrl: null, evidence: DEMO_EVIDENCE },
        { id: 'demo-event-ended', title: tr('Past sample event', '종료된 샘플 행사'), description: tr('Should not appear in the upcoming feed.', '예정된 행사 목록에 표시되면 안 됩니다.'), organizer: tr('Sample Club', '샘플 동아리'), placeId: 'demo-library', startsAt: '2026-09-01T10:00:00+09:00', endsAt: '2026-09-01T11:00:00+09:00', timeZone: 'Asia/Seoul', language: tr('Korean', '한국어'), state: 'completed', registrationUrl: null, evidence: DEMO_EVIDENCE }
    ];
    data.rooms = [{ id: 'demo-room-D201', aliases: ['D201', 'D-201'], placeId: 'demo-science', floor: '2', evidence: DEMO_EVIDENCE }];
    return data;
}
