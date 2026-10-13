import { REFERENCE_CAMPUS } from './campus';
import { Localized } from './types';

/** Visual research records, not a survey or permission to redistribute source images. */
export interface VisualSource {
    url: string;
    imageUrl?: string;
    kind: 'official-photo' | 'architect-photo' | 'primary-photo' | 'official-video' | 'official-overview' | 'directory';
    reviewed: boolean;
    frameTime?: string;
    captureDate: string | null;
    localResearchFile?: string;
}

export interface VisualReference {
    featureId: string;
    code: string | null;
    nameEn: string;
    sourceUrl: string;
    imageUrl: string | null;
    reviewed: boolean;
    coverage: 'closeup-photo' | 'video-frame' | 'overview-only' | 'not-visually-confirmed';
    observations: string[];
    unknowns: string[];
    sources: VisualSource[];
    checkedAt: string;
}

export const VISUAL_REVIEW_DATE = '2026-09-30';
const DIRECTORY = 'https://www.mju.ac.kr/campusMap/mjukr/view.do?findType=B';
const OVERVIEW = 'https://gsit.mju.ac.kr/bbs/mjukr/147/5556/download.do';
const VIDEO = 'https://www.youtube.com/watch?v=u-JLFts2Pxc';
const DORM = 'https://dorm.mju.ac.kr/dorm/6640/subview.do';
const DORM_IMAGES = 'https://dorm.mju.ac.kr/sites/dorm/contents/images/000001/';
const COMMON_UNKNOWNS = [
    'Exact footprint, height, orientation and terrain are not surveyed.',
    'Unseen elevations and the present condition are unverified; image retrieval date is not capture date.',
    'Decorative windows, trees and paths are simplified and are not a measured inventory or navigation network.',
];
type Detail = Pick<VisualReference, 'coverage' | 'observations' | 'sources'> & { unknowns?: string[]; checkedAt?: string };
const photo = (url: string, imageUrl: string, localResearchFile: string, kind: VisualSource['kind'] = 'official-photo'): VisualSource => ({ url, imageUrl, localResearchFile, kind, reviewed: true, captureDate: null });
const video = (frameTime: string): VisualSource => ({ url: `${VIDEO}&t=${frameTime.split(':').reduce((n, v) => n * 60 + Number(v), 0)}s`, kind: 'official-video', reviewed: true, frameTime, captureDate: null });
const overviewSource: VisualSource = { url: OVERVIEW, kind: 'official-overview', reviewed: true, captureDate: null, localResearchFile: 'aerial-1.jpg' };
const centralAerialSource: VisualSource = { url: 'https://www.mju.ac.kr/bbs/mjukr/147/175263/download.do', kind: 'official-overview', reviewed: true, captureDate: null, localResearchFile: 'event-aerial-8.jpg' };
const overview = (observation: string): Detail => ({ coverage: 'overview-only', observations: [observation], sources: [overviewSource], unknowns: ['Only an older overview/composite was reviewed. This does not verify a current facade.'] });
const dormant = (filename: string, local: string, observation: string): Detail => ({ coverage: 'closeup-photo', observations: [observation], sources: [photo(DORM, DORM_IMAGES + encodeURIComponent(filename), local)] });
const PHOTO_WALK = 'https://mostadmired.tistory.com/231';
const STAIRS_NEWS = 'https://www.mju.ac.kr/bbs/mjukr/166/221943/artclView.do';
const STAIRS_PHOTO = 'https://www.mju.ac.kr/CrossEditor/binary/images/000307/20250616160137632_T3RFUW7I.jpg';
const stairsPhoto = photo(STAIRS_NEWS, STAIRS_PHOTO, '2025-stairs.jpg');
const primaryPhoto = (localResearchFile: string): VisualSource => ({ url: PHOTO_WALK, kind: 'primary-photo', reviewed: true, captureDate: null, localResearchFile });

const details: Record<string, Detail> = {
    'mju-y-main': { coverage: 'video-frame', observations: ['Pale facade, dark lower bands, rectangular windows, broad steps and shrubs.'], sources: [video('2:34')] },
    'mju-y1': { coverage: 'video-frame', observations: ['Light beige facade, green glazed entry, paved forecourt and deciduous trees.'], sources: [video('1:26')] },
    'mju-y2': { coverage: 'closeup-photo', checkedAt: '2026-10-03', observations: ['White upper bar with narrow vertical windows and a dark glazed end; open supports above a smaller lower block.', 'Aerial photograph shows roof arrays and a paved, planted forecourt.', 'The architect photograph shows a lower side court, retained grassy bank and stepped connection at the forecourt end. A 2023 primary photo walk shows the broad stair with intermediate planted landings beside the matching Y2 facade.'], sources: [
        photo('https://www.mju.ac.kr/mjukr/160/subview.do', 'https://www.mju.ac.kr/sites/mjukr/images/sub01/hisbox01.png', 'hisbox01.png'),
        photo('https://www.gansam.com/works/work.php?code=works&idx=2527', 'https://www.gansam.com/admin/data/bbs/works/2105110910094_5.jpg', 'gansam-2105110910094_5.jpg', 'architect-photo'),
        primaryPhoto('walk2023-27.jpg'),
    ], unknowns: ['Other Gansam gallery images are design renderings; proposed neighbouring volumes were excluded.', 'The side-court stair is identified by facade/context correspondence. Its surveyed endpoints, risers, elevations and step-free alternative are not established; no arbitrary route geometry is added.'] },
    'mju-y3': { coverage: 'video-frame', observations: ['Pale block with a dark window grid and deep vertical facade elements; planted verges and paved approaches.'], sources: [video('4:58'), centralAerialSource], unknowns: ['The PDF reuses a page with a 2025 festival diagram; aerial photo capture date is unknown.'] },
    'mju-y5': { coverage: 'video-frame', observations: ['Long pale flat roof with rectangular rooftop projections; dark lower facade, blue glazed bays and broad entry steps.'], sources: [video('1:44'), centralAerialSource] },
    'mju-y6': overview('Older overview shows a pale rectangular block with a greenish roof surface and repeated dark horizontal windows.'),
    'mju-y7': { coverage: 'video-frame', observations: ['Faceted white horizontal bands, blue glazing and a broad exterior ramp; the overview shows an octagonal roof.'], sources: [video('4:13'), overviewSource] },
    'mju-y8': { ...overview('Older overview shows a pale elongated rectangular block with dark glazing on its end.'), checkedAt: '2026-10-03', observations: ['Older overview shows a pale elongated rectangular block with dark glazing on its end.', 'The university facilities article dated 2025-06-16 identifies a stair trail connecting Engineering Hall 2 (Y8) and the Design & Modeling Center (Y12). Its inspected photo shows shallow steps, large retaining rocks and a metal railing beside a road.'], sources: [overviewSource, stairsPhoto], unknowns: ['The new close photo depicts the trail, not the building facade. The complete trail alignment, exact road junctions, elevations and step-free alternative remain unverified.'] },
    'mju-y9': { coverage: 'video-frame', observations: ['Pale grid facade, blue-green strips and large dark-framed windows; a white pedestrian bridge and conifer appear nearby.'], sources: [video('3:23')] },
    'mju-y10': overview('Older overview identifies the residence beside the athlete courts, partly screened by trees.'),
    'mju-y11': overview('Older overview identifies a low pale building beside the sports field and athlete courts.'),
    'mju-y12': { coverage: 'video-frame', checkedAt: '2026-10-03', observations: ['Peach volume beside a pale window-grid wing, dark entrance canopy, red-gray paving, conifers and ramp rails.', 'A 2025 university article and inspected photo establish a stair trail toward Engineering Hall 2 (Y8), with metal rails among large retaining rocks.'], sources: [video('5:57'), stairsPhoto], unknowns: ['The relative outlines of the design complex and adjacent Architecture Institute are not independently surveyed.', 'The Y8/Y12 trail is not a surveyed route. The photo does not establish its full alignment, exact junctions, elevations or step-free alternative.'] },
    'mju-y13': { coverage: 'video-frame', observations: ['Pale facade, teal window frames, projecting sunshade brackets and blue exterior columns; trees and parking are visible.'], sources: [video('7:22')] },
    'mju-y14': overview('The older overview labels the low laboratory group; its separate facade cannot be resolved reliably.'),
    'mju-y15': overview('The older overview labels the low laboratory group near Engineering Hall 4; facade detail is unresolved.'),
    'mju-y16': { coverage: 'closeup-photo', observations: ['Dark curved or wedge-shaped upper volume on exposed columns, above pale lower terraces; narrow grouped windows and woodland.'], sources: [{ url: 'https://memory.library.kr/files/original/f962a9ceb37087ac01a6564c77847219.pdf#page=195', kind: 'official-photo', reviewed: true, captureDate: null, localResearchFile: 'bangmok-book-195.png' }], unknowns: ['This is an older Gyeonggi public-library architectural publication, not a recent condition survey. The adjacent administration building is not independently resolved.'] },
    'mju-y17': overview('Older overview shows pale and glazed volumes below the Bangmok area, beside a paved forecourt.'),
    'mju-y18': overview('Older overview labels a small laboratory complex at the wooded edge; individual elevations are unresolved.'),
    'mju-y19': { coverage: 'video-frame', observations: ['Red-brick upper volumes and pale lower wing, flat roofs, horizontal windows, clipped trees and paved parking.'], sources: [video('6:37')] },
    'mju-y20': overview('Older overview labels a light rectangular volume beside the Design and Modeling Center.'),
    'mju-y21': overview('Older overview shows a pale rectangular block beside Student Union; detailed facade is unresolved.'),
    'mju-y22': { coverage: 'closeup-photo', observations: ['Capsule-shaped upper hall above a stepped rectangular base; pale tiled grid, arched recesses and a small pyramid skylight.'], sources: [photo('https://www.mju.ac.kr/bbs/mjukr/166/209975/artclView.do', 'https://www.mju.ac.kr/CrossEditor/binary/images/000209/20240312134604908_4DD5JKDT.png', 'news-20240312134604908_4DD5JKDT.png')] },
    'mju-y23': { coverage: 'video-frame', observations: ['Blue glass facade and dark pier marked 23, with a grassy retaining bank, trees and paved forecourt.'], sources: [video('4:13')] },
    'mju-y24': { coverage: 'closeup-photo', observations: ['Cream industrial hall, reddish shallow roof, dark high window band, large roll-up opening and lower annex; paved yard and woodland.'], sources: [photo('https://hystec.mju.ac.kr/', 'https://hystec.mju.ac.kr/theme/mypage1/images/_index_bg01.jpg', 'hystec-_index_bg01.jpg'), photo('https://hystec.mju.ac.kr/', 'https://hystec.mju.ac.kr/theme/mypage1/images/_index_bg02.jpg', 'hystec-_index_bg02.jpg')], unknowns: ['The website hero with wind turbines is unrelated scenery and was excluded.'] },
    'mju-y30': dormant('명현_건물외관_1.jpg', 'dorm-4.jpg', 'Tan rectangular facade, brick base, dark pitched roof with small dormers, gray projecting stair tower marked 30.'),
    'mju-y31': dormant('명덕_건물외관.jpg', 'dorm-7.jpg', 'Gently curved beige front, continuous green-glass window bands and tall glazed towers at both ends.'),
    'mju-y32': dormant('20260819153556719_OQOFT8CU.jpg', 'dorm-11.jpg', 'Long tan slab with a pitched roof and central peach stair tower; trees and slope in front.'),
    'mju-y33': dormant('20260819153954912_2G6DLNCW.jpg', 'dorm-17.jpg', 'Narrow cream tower, peach lower portion, regular square windows and recessed vertical balcony stack.'),
    'mju-y34': dormant('20260819154108950_T1GMY4EV.jpg', 'dorm-21.jpg', 'Cream tower with darker lower portion, stacked balconies, regular windows and surrounding trees.'),
    'mju-y35': { coverage: 'closeup-photo', observations: ['Low pale block with an open rectangular rooftop frame, glazed end and trees along its paved frontage.'], sources: [photo('https://dorm.mju.ac.kr/dorm/6642/subview.do', 'https://dorm.mju.ac.kr/sites/dorm/images/main/facility1.gif', 'dorm-welfare.gif')], unknowns: ['The official image is only 186 by 114 pixels; fine details are unresolved.'] },
    'mju-y83': overview('Older overview labels this laboratory near Structural Materials Lab; the separate facade is unresolved.'),
    'mju-e': overview('Older overview shows a broad light pitched-roof hall beside the tennis courts.'),
    'mju-gate': { coverage: 'closeup-photo', checkedAt: '2026-10-03', observations: ['A primary 2023 campus photo walk shows the tall round MYONGJI sign pylon, a curved blue vehicle-control canopy with metal supports, and a separate low gatehouse.', 'The model replaces the earlier unsupported rectangular portal with qualitative pylon/canopy forms while retaining the existing approximate anchor and envelope.'], sources: [primaryPhoto('walk2023-01.jpg'), primaryPhoto('walk2023-02.jpg')], unknowns: ['These are the original photographer\'s publicly posted images, not university photographs or a redistribution licence.', 'The pillar/canopy proportions, placement within the envelope, orientation, height, traffic control and current gate condition are not surveyed. The directory marker remains approximate.'] },
};

/** Every currently modeled building/gate is present, including explicit gaps. */
export const VISUAL_REFERENCES: Readonly<Record<string, VisualReference>> = Object.fromEntries(
    REFERENCE_CAMPUS.features.filter(f => f.kind === 'building' || f.kind === 'gate').map(f => {
        const d = details[f.id];
        const sources: VisualSource[] = d?.sources ?? [{ url: DIRECTORY, kind: 'directory', reviewed: false, captureDate: null }];
        const first = sources[0] ?? { url: DIRECTORY, kind: 'directory' as const, reviewed: false, captureDate: null };
        const record: VisualReference = {
            featureId: f.id, code: f.code, nameEn: f.name.en, checkedAt: d?.checkedAt ?? VISUAL_REVIEW_DATE,
            sourceUrl: first.url, imageUrl: first.imageUrl ?? null, reviewed: Boolean(d),
            coverage: d?.coverage ?? 'not-visually-confirmed', observations: d?.observations ?? [],
            unknowns: [...COMMON_UNKNOWNS, ...(d?.unknowns ?? ['No usable individually identified exterior photo was obtained. The directory photo field is null.']),
                ...(f.code === 'Y32' ? ['The official dormitory photo is labelled 3동. Its mapping to Y32 follows the supplied illustration; the directory still uses an inconsistent name.'] : []),
                ...(f.code === 'Y14' || f.code === 'Y83' ? ['Official markers overlap; illustrative separation is not evidence of distinct surveyed footprints.'] : [])],
            sources,
        };
        return [f.id, record];
    }),
);

export const VISUAL_REVIEW_COUNTS = {
    total: Object.keys(VISUAL_REFERENCES).length,
    closeupPhoto: Object.values(VISUAL_REFERENCES).filter(r => r.coverage === 'closeup-photo').length,
    videoFrame: Object.values(VISUAL_REFERENCES).filter(r => r.coverage === 'video-frame').length,
    overviewOnly: Object.values(VISUAL_REFERENCES).filter(r => r.coverage === 'overview-only').length,
    notVisuallyConfirmed: Object.values(VISUAL_REFERENCES).filter(r => r.coverage === 'not-visually-confirmed').length,
};

/** Visual evidence only: these records intentionally provide no GPS or route vertices. */
export interface CampusLandmarkNote {
    id: string;
    featureIds: string[];
    title: Localized;
    observation: Localized;
    limitation: Localized;
    sourceUrl: string;
    imageUrl?: string;
    checkedAt: string;
    geometryStatus: 'qualitative-only' | 'unlocated';
}

export const CAMPUS_LANDMARK_NOTES: readonly CampusLandmarkNote[] = [
    {
        id: 'western-dormitory-corridor', featureIds: ['mju-y30', 'mju-y31', 'mju-y32', 'mju-y33', 'mju-y34', 'mju-y13'], checkedAt: '2026-10-03', geometryStatus: 'unlocated',
        title: { en: 'Dormitories and Civil Engineering', ko: '생활관과 토목공학', zh: '宿舍与土木工程' },
        observation: {
            en: 'The official site plan shows the western corridor from the dormitories toward Engineering Halls 3 and 4. Civil Engineering is listed in Engineering Hall 4 (Y13). The illustration retains this existing corridor.',
            ko: '공식 배치도에는 생활관에서 제3·4공학관 방향으로 이어지는 서쪽 통로가 나타납니다. 토목공학은 제4공학관(Y13)에 안내되어 있습니다. 기존 통로는 일러스트 지도에 유지했습니다.',
            zh: '官方总平面图显示宿舍通向第三、第四工学馆的西侧通道。土木工程位于第四工学馆（Y13）。示意图保留了这条现有通道。',
        },
        limitation: {
            en: 'A separate shortcut through the wooded hill has not been verified. Its starting dormitory, junctions, steps and current access remain unknown; no new trail or accessible route is drawn.',
            ko: '숲 언덕을 통과하는 별도 지름길은 확인되지 않았습니다. 출발 생활관, 갈림길, 계단과 현재 통행 가능 여부는 미확인으로 새 산책로나 무장애 경로를 그리지 않았습니다.',
            zh: '尚未核实穿过林木山坡的另一条捷径。起点宿舍、岔路、台阶及当前通行情况仍不明确，因此未绘制新小径或无障碍路线。',
        },
        sourceUrl: 'https://www.mju.ac.kr/bbs/mjukr/147/116783/download.do',
    },
    {
        id: 'yongin-main-gate-form', featureIds: ['mju-gate'], checkedAt: '2026-10-03', geometryStatus: 'qualitative-only',
        title: { en: 'Main gate appearance', ko: '정문 외관', zh: '正门外观' },
        observation: {
            en: 'The photographer\'s campus walk shows a tall round sign pylon and a lower curved blue canopy at the vehicle entrance. These forms replace the earlier rectangular portal in the illustration.',
            ko: '사진가의 캠퍼스 답사 사진에는 차량 출입구의 높은 원기둥 안내탑과 낮은 파란색 곡면 캐노피가 보입니다. 일러스트의 기존 사각 문틀을 이 형태로 바꿨습니다.',
            zh: '摄影师的校园实拍显示，车辆入口有高大的圆柱标识塔和较低的蓝色曲面雨棚。插图已用这些形态替换原来的矩形门架。',
        },
        limitation: {
            en: 'Shape reference only. The position, proportions, orientation and height remain approximate; no vehicle or pedestrian route is verified.',
            ko: '형태 참고용입니다. 위치·비례·방향·높이는 여전히 근사치이며 차량 또는 보행 경로를 검증한 자료가 아닙니다.',
            zh: '仅作为外形参考。位置、比例、朝向和高度仍为近似值，未核实车辆或行人通行路线。',
        },
        sourceUrl: PHOTO_WALK,
    },
    {
        id: 'y2-side-court-stairs', featureIds: ['mju-y2'], checkedAt: '2026-10-03', geometryStatus: 'unlocated',
        title: { en: 'Stairs beside Y2', ko: 'Y2 옆 계단', zh: 'Y2旁的阶梯' },
        observation: {
            en: 'The architect\'s aerial photo shows the lower side court, a retaining slope and a stepped connection to the forecourt. A primary campus photo walk shows the broad stair and planted landings beside the matching Y2 facade.',
            ko: '설계사의 항공 사진에서 측면의 낮은 마당, 옹벽 사면과 앞마당으로 이어지는 계단을 확인할 수 있습니다. 캠퍼스 답사 사진에는 Y2 외벽과 일치하는 건물 옆의 넓은 계단과 식재된 계단참이 보입니다.',
            zh: '建筑师的航拍照片显示侧面的下沉庭院、挡土坡以及通往前庭的阶梯。校园实拍还显示与Y2外墙相符的建筑旁有宽阶梯和绿化平台。',
        },
        limitation: {
            en: 'The photos do not establish surveyed endpoints, levels or a step-free alternative. An exact stair line has not been added to the map.',
            ko: '사진만으로는 측량된 계단 양 끝점, 높이 또는 무단차 대체 경로를 알 수 없습니다. 지도에 정확한 계단 선형을 추가하지 않았습니다.',
            zh: '这些照片无法确定经过测量的阶梯端点、高程或无障碍替代路线。地图尚未添加精确的阶梯线。',
        },
        sourceUrl: 'https://www.gansam.com/works/work.php?code=works&idx=2527',
        imageUrl: 'https://www.gansam.com/admin/data/bbs/works/2105110910094_5.jpg',
    },
    {
        id: 'y8-y12-stair-trail', featureIds: ['mju-y8', 'mju-y12'], checkedAt: '2026-10-03', geometryStatus: 'unlocated',
        title: { en: 'Engineering 2–Design Center stair trail', ko: '제2공학관–디자인조형센터 오솔길 계단', zh: '第二工学馆至设计造型中心的阶梯小路' },
        observation: {
            en: 'A university article dated 16 June 2025 identifies a stair trail linking Engineering Hall 2 (Y8) and the Design & Modeling Center (Y12). The photo shows shallow steps between large retaining rocks, with an orange metal railing and a road at the lower end.',
            ko: '2025년 6월 16일 대학 기사에는 제2공학관(Y8)과 디자인조형센터(Y12)를 잇는 오솔길 계단이 명시되어 있습니다. 사진에는 큰 옹벽 돌 사이의 낮은 계단, 주황색 금속 난간, 아래쪽의 도로가 보입니다.',
            zh: '大学2025年6月16日的报道确认了连接第二工学馆（Y8）和设计造型中心（Y12）的阶梯小路。照片显示巨石挡土墙之间的低矮台阶、橙色金属栏杆，以及下端的道路。',
        },
        limitation: {
            en: 'The complete trail alignment and exact junctions are not established. It is not mapped as a verified route or a step-free connection, and is distinct from Y2 Creative Arts Hall.',
            ko: '오솔길 전체 선형과 정확한 접속 지점은 확인되지 않았습니다. 검증된 경로나 무단차 연결로 표시하지 않았으며 창조예술관 Y2와는 다른 장소입니다.',
            zh: '完整走向和精确接点尚未确定。未将其标为经过核实的路线或无障碍通道；它与创作艺术馆Y2是不同地点。',
        },
        sourceUrl: STAIRS_NEWS, imageUrl: STAIRS_PHOTO,
    },
];
