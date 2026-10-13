import { Category, Evidence, Localized, Place } from './types';
import { getYonginPlaceDescription } from './place-descriptions';
import { PLAN_CALIBRATION, PLAN_LAYOUT, PLAN_COMPLEX_MESH, PLAN_ROADS, planPointToReferencePoint } from './plan-layout';

const tr = (en: string, ko: string): Localized => ({ en, ko });
export const CAMPUS_DIRECTORY_URL = 'https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B';
export const CAMPUS_DIRECTORY_DATA_URL = 'https://www.mju.ac.kr/campusMap/mjukr/2/artclList.do';
export const CAMPUS_REFERENCE_CHECKED = '2026-09-30';

/** Model coordinates use one WGS84-derived horizontal scale; shapes/heights remain approximate.
 * Official directory markers are anchors, not surveyed centroids or entrances.
 * Keep this data out of Dataset.buildings, entrances, nodes, edges and all GPS/route logic. */
export interface ReferenceFeature {
    id: string;
    code: string | null;
    name: Localized;
    category: Category;
    kind: 'building' | 'field' | 'tennis' | 'plaza' | 'stage' | 'bus' | 'basketball' | 'futsal' | 'gate';
    form: 'block' | 'wing' | 'courtyard' | 'octagon' | 'greenhouse' | 'chapel' | 'low';
    /** Campus-directory map marker only; never a surveyed entrance. */
    marker: { article: number; lat: number; lon: number } | null;
    /** Aliases of unresolved, effectively co-located source markers share one physical illustration. */
    sharedGeometryWith?: string;
    layoutSource?: 'official-plan';
    /** Absolute scene X/Z rings and roof triangles traced from connected plan complexes. */
    planMesh?: { rings: [number,number][][]; triangles: [number,number][][] };
    center: [number, number];
    /** Complete local footprint envelope including wings, roofs, pads and sports surrounds. */
    size: [number, number, number];
    angle: number;
    note?: Localized;
}

export const REFERENCE_PROJECTION = {
    origin: { lat: 37.2222, lon: 127.1867 }, unitsPerMeter: .46,
    model: 'WGS84 local tangent plane', semiMajorAxis: 6378137, inverseFlattening: 298.257223563,
} as const;
const radians = Math.PI / 180;
function ecef(lat: number, lon: number): [number,number,number] {
    const phi=lat*radians,lambda=lon*radians,f=1/REFERENCE_PROJECTION.inverseFlattening,e2=f*(2-f);
    const n=REFERENCE_PROJECTION.semiMajorAxis/Math.sqrt(1-e2*Math.sin(phi)**2);
    return [n*Math.cos(phi)*Math.cos(lambda),n*Math.cos(phi)*Math.sin(lambda),n*(1-e2)*Math.sin(phi)];
}
const originECEF=ecef(REFERENCE_PROJECTION.origin.lat,REFERENCE_PROJECTION.origin.lon);
/** Horizontal reference projection only. It does not create navigable/live Place coordinates. */
export function markerToReferencePoint(lat: number,lon: number): [number,number] {
    const p=ecef(lat,lon),dx=p[0]-originECEF[0],dy=p[1]-originECEF[1],dz=p[2]-originECEF[2];
    const phi=REFERENCE_PROJECTION.origin.lat*radians,lambda=REFERENCE_PROJECTION.origin.lon*radians,s=REFERENCE_PROJECTION.unitsPerMeter;
    const east=-Math.sin(lambda)*dx+Math.cos(lambda)*dy;
    const north=-Math.sin(phi)*Math.cos(lambda)*dx-Math.sin(phi)*Math.sin(lambda)*dy+Math.cos(phi)*dz;
    return [east*s,-north*s];
}
const illustrate=markerToReferencePoint;
type Spec = [string, string, string, Category, number, number, number, number, number, number, ReferenceFeature['form']?];
const specs: Spec[] = [
    ['Y_', 'Engineering Hall 1', '제1공학관', 'academic', 73, 37.22255, 127.18720, 65, 23, 18, 'wing'],
    ['Y1', 'Student Union', '학생회관', 'services', 93, 37.22340, 127.18720, 31, 21, 17, 'wing'],
    ['Y2', 'Creative Arts Hall', '창조예술관', 'academic', 56, 37.22315, 127.18955, 63, 30, 24, 'courtyard'],
    ['Y3', 'Myongjin Hall', '명진당', 'library', 49, 37.222100, 127.188545, 51, 31, 16, 'courtyard'],
    ['Y5', 'Engineering Hall 5', '제5공학관', 'academic', 81, 37.222035, 127.187599, 49, 18, 14],
    ['Y6', 'Sports & Culture Hall', '체육문화관', 'academic', 68, 37.222092, 127.190831, 40, 22, 19, 'wing'],
    ['Y7', 'Gymnasium', '체육관', 'services', 83, 37.221876, 127.190200, 43, 38, 16, 'octagon'],
    ['Y8', 'Engineering Hall 2', '제2공학관 (에코바이오관)', 'academic', 66, 37.221632, 127.186779, 56, 21, 19, 'wing'],
    ['Y9', 'Hambak Hall', '함박관', 'academic', 94, 37.221201, 127.188545, 44, 24, 23, 'wing'],
    ['Y10', 'Athletes’ Residence', '선수숙소', 'residence', 59, 37.221598, 127.191700, 24, 14, 11],
    ['Y11', 'ROTC', '학군단', 'services', 89, 37.222347, 127.191514, 24, 13, 10, 'low'],
    ['Y12', 'Design & Modeling Center', '디자인조형센터', 'academic', 46, 37.220450, 127.185300, 61, 32, 17, 'courtyard'],
    ['Y13', 'Engineering Hall 4', '제4공학관 (토목환경관)', 'academic', 80, 37.218929, 127.183771, 52, 22, 19, 'wing'],
    ['Y14', 'Structural Materials Lab', '구조재료실험동', 'academic', 43, 37.218353, 127.183827, 36, 17, 10, 'low'],
    ['Y15', 'Hydraulic Modeling Lab', '수리모형실습동', 'academic', 62, 37.218657, 127.184440, 31, 18, 8, 'low'],
    ['Y16', 'Bangmok Memorial Hall', '방목기념관', 'academic', 52, 37.220976, 127.187413, 23, 18, 10],
    ['Y17', 'Industry–Academic Cooperation Hall', '산학협력관', 'academic', 95, 37.220808, 127.187961, 31, 25, 19, 'wing'],
    ['Y18', 'Joint Laboratory', '공동실험동', 'academic', 42, 37.222860, 127.186000, 20, 12, 9, 'low'],
    ['Y19', 'Engineering Hall 3', '제3공학관', 'academic', 74, 37.21930, 127.18255, 44, 26, 20, 'wing'],
    ['Y20', 'Architecture & Urban Design Institute', '건축도시설계원', 'academic', 41, 37.220250, 127.185070, 28, 15, 12],
    ['Y21', 'Student Welfare Hall', '학생복지관', 'services', 90, 37.223100, 127.186773, 27, 19, 16, 'wing'],
    ['Y22', '60th Anniversary Chapel', '60주년채플관', 'services', 40, 37.223850, 127.186885, 31, 20, 18, 'chapel'],
    ['Y23', 'Next Generation Science Hall', '차세대과학관', 'academic', 82, 37.221376, 127.189260, 33, 26, 25, 'wing'],
    ['Y24', 'Hybrid Structural Testing Center', '하이브리드구조실험센터', 'academic', 87, 37.217787, 127.185024, 29, 21, 12, 'low'],
    ['Y30', 'Myeonghyeon Residence', '명현관', 'residence', 50, 37.22355, 127.18173, 31, 17, 21],
    ['Y31', 'Myeongdeok Residence', '명덕관', 'residence', 47, 37.224100, 127.18175, 35, 18, 24],
    ['Y32', 'Residence 3 · annex label', '생활관 3동 · 첨부 지도 표기', 'residence', 76, 37.223353, 127.182856, 33, 17, 23],
    ['Y33', 'Residence 4', '생활관 4동', 'residence', 77, 37.223228, 127.183595, 30, 17, 24],
    ['Y34', 'Residence 5', '생활관 5동', 'residence', 78, 37.223758, 127.182802, 29, 17, 24],
    ['Y35', 'Residence Welfare Building B', '생활관 복지동 (B동)', 'residence', 79, 37.223763, 127.183316, 24, 16, 11],
    ['Y82', 'Greenhouse', '온실', 'academic', 69, 37.223883, 127.185072, 22, 13, 7, 'greenhouse'],
    ['Y83', 'Model Testing Laboratory', '모형실험동', 'academic', 51, 37.218351, 127.183826, 22, 13, 8, 'low'],
];

const features: ReferenceFeature[] = specs.map(([code, en, ko, category, article, lat, lon, w, d, h, form = 'block']) => ({
    id: code === 'Y_' ? 'mju-y-main' : `mju-${code.toLowerCase()}`, code, name: tr(en, ko), category,
    kind: 'building', form, marker: { article, lat, lon }, center: illustrate(lat, lon), size: [w, d, h], angle: -.10,
}));
// Directory pins can coincide even where the labelled site plan shows distinct buildings.
features.find(f => f.code === 'Y32')!.note = { en: 'Dormitory names differ between sources. Confirm your assigned residence.', ko: '자료마다 생활관 명칭이 다릅니다. 배정된 생활관을 확인하세요.', zh: '不同资料中的宿舍名称有差异。请确认分配给您的宿舍。' };

const add = (id: string, code: string | null, en: string, ko: string, category: Category, kind: ReferenceFeature['kind'], form: ReferenceFeature['form'], article: number, lat: number, lon: number, size: [number, number, number], angle = -.10) => features.push({ id: `mju-${id}`, code, name: tr(en, ko), category, kind, form, marker: { article, lat, lon }, center: illustrate(lat, lon), size, angle });
add('a', 'A', 'Main Sports Field', '대운동장', 'outdoors', 'field', 'low', 44, 37.22345, 127.19095, [95, 58, 0], -.25);
add('b', 'B', 'Athletes’ Tennis Courts', '선수전용테니스장', 'outdoors', 'tennis', 'low', 60, 37.22220, 127.19170, [38, 34, 0]);
add('c', 'C', 'Small Sports Field', '소운동장', 'outdoors', 'field', 'low', 61, 37.219679, 127.186977, [52, 31, 0]);
add('d', 'D', 'Tennis Courts', '테니스장', 'outdoors', 'tennis', 'low', 84, 37.21930, 127.18640, [39, 34, 0]);
add('e', 'E', 'Indoor Tennis Hall', '실내테니스장', 'services', 'building', 'low', 64, 37.218464, 127.185829, [39, 24, 10]);
add('f', 'F', 'Outdoor Music Hall', '야외음악당', 'outdoors', 'stage', 'low', 65, 37.219356, 127.184521, [29, 23, 4]);
add('g', 'G', 'White Horse Statue', '백마상', 'outdoors', 'plaza', 'low', 57, 37.22240, 127.18975, [16, 16, 4]);
add('h', 'H', 'Student Tennis Courts', '학생테니스장', 'outdoors', 'tennis', 'low', 92, 37.22395, 127.18900, [35, 26, 0]);
// I and J have labels in the supplied overview but no matching official directory marker.
features.push({ id: 'mju-i', code: 'I', name: tr('Outdoor Basketball Court', '야외농구장'), category: 'outdoors', kind: 'basketball', form: 'low', marker: null, center: [62, -92], size: [26, 15, 0], angle: -.10 });
features.push({ id: 'mju-j', code: 'J', name: tr('Futsal Court', '풋살장'), category: 'outdoors', kind: 'futsal', form: 'low', marker: null, center: [117, -107], size: [35, 20, 0], angle: -.10 });
add('k', 'K', 'Commuter Bus Boarding Area', '통학버스승강장', 'services', 'bus', 'low', 86, 37.224176, 127.187628, [35, 15, 0]);
add('elpenheim', null, 'Elpenheim', '엘펜하임', 'residence', 'building', 'wing', 48, 37.2253010, 127.1787850, [36, 24, 19]);
add('visitors', null, 'Visitor Residence', '방문자숙소', 'residence', 'building', 'block', 53, 37.224095, 127.180342, [30, 18, 16]);
add('bus-office', null, 'Bus Management Office', '버스관리사무소', 'services', 'building', 'low', 58, 37.223999, 127.187560, [13, 10, 7]);
add('guardhouse', null, 'Guardhouse', '수위실', 'services', 'building', 'low', 63, 37.224678, 127.187637, [10, 8, 5]);
add('hydraulics', null, 'Hydraulics Laboratory', '유압실', 'academic', 'building', 'low', 71, 37.218781, 127.183385, [17, 11, 7]);
add('gate', null, 'Main Gate', '정문', 'services', 'gate', 'low', 72, 37.224886, 127.187800, [22, 6, 9]);
add('tennis-office', null, 'Tennis Court Office', '테니스장관리사무소', 'services', 'building', 'low', 85, 37.219669, 127.186323, [12, 9, 6]);

// Initial unsurveyed envelopes, subsequently checked against the complete generated mesh.
for (const f of features) if (f.kind === 'building') { f.size[0] *= .75; f.size[1] *= .75; }
features.find(f=>f.id==='mju-hydraulics')!.size[2]=3.5;
for (const f of features) {
    const plan=PLAN_LAYOUT[f.id];
    if (!plan) continue;
    f.center=planPointToReferencePoint(...plan.center);
    const s=PLAN_CALIBRATION.metersPerPoint*PLAN_CALIBRATION.unitsPerMeter;
    f.size=[plan.size[0]*s,plan.size[1]*s,f.size[2]];
    f.angle=plan.angle; f.layoutSource='official-plan';
    const mesh=PLAN_COMPLEX_MESH[f.id];
    if(mesh) f.planMesh={rings:mesh.rings.map(r=>r.map(p=>planPointToReferencePoint(...p))),triangles:mesh.triangles.map(t=>t.map(p=>planPointToReferencePoint(...p)))};
}

export const REFERENCE_CAMPUS = {
    id: 'myongji-yongin-reference-2026-09-30', frame: 'illustration' as const,
    sourceUrl: CAMPUS_DIRECTORY_URL, checkedAt: CAMPUS_REFERENCE_CHECKED,
    features,
    /** Major corridors manually traced from the historical plan; never route edges. */
    paths: PLAN_ROADS.map(r=>r.map(p=>planPointToReferencePoint(...p))),
};
export const REFERENCE_BUILDING_COUNT = features.filter(f => f.kind === 'building' || f.kind === 'gate').length;

export function createReferencePlaces(): Place[] {
    return features.map(f => {
        const note: Localized = { en: 'Name listed in the official campus directory.', ko: '공식 캠퍼스 안내에 등재된 명칭입니다.', zh: '名称载于官方校园目录。' };
        const evidence: Evidence = { status: f.marker && f.code !== 'Y32' ? 'verified' : 'unverified', sourceUrl: f.marker ? CAMPUS_DIRECTORY_URL : null, checkedAt: f.marker ? '2026-09-30T00:00:00+09:00' : null, note: f.note ?? (f.marker ? note : { en: 'Named on the 2021 campus plan; current use is unconfirmed.', ko: '2021년 캠퍼스 배치도에 표시된 명칭이며 현재 이용 여부는 확인되지 않았습니다.', zh: '名称来自2021年校园规划图，目前使用情况未确认。' }) };
        return {
            id: f.id, name: f.name, code: f.code, category: f.category,
            aliases: [f.name.en, f.name.ko, ...(f.code ? [f.code] : []), ...(f.id === 'mju-y-main' ? ['Engineering 1', '제1공학관', 'Yxxx'] : []), ...(f.id === 'mju-y3' ? ['library', '도서관', 'Myongjindang'] : []), ...(f.id === 'mju-y22' ? ['chapel', '채플관'] : [])],
            description: getYonginPlaceDescription(f.id)?.description ?? f.name,
            point: null, evidence,
            geometryEvidence: { status: 'unverified', sourceUrl: f.layoutSource ? PLAN_CALIBRATION.sourceUrl : f.marker ? CAMPUS_DIRECTORY_URL : null, checkedAt: null, note: tr('Historical plan reference and simplified model. Plan-derived relative scale is retained where identified, but current footprints, heights, terrain and roads remain unverified. No GPS position, entrance or walking route is supplied.', '과거 배치도 참고와 단순화된 모형입니다. 식별된 도면의 상대 축척을 유지하지만 현재 외곽·높이·지형·도로는 미확인입니다. GPS 위치·출입구·도보 경로를 제공하지 않습니다.') },
            buildingId: null, entranceIds: [], photo: null,
        };
    });
}
