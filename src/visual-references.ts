import { REFERENCE_CAMPUS } from './campus';

/** Visual research records, not a survey or permission to redistribute source images. */
export interface VisualSource {
    url: string;
    imageUrl?: string;
    kind: 'official-photo' | 'architect-photo' | 'official-video' | 'official-overview' | 'directory';
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
type Detail = Pick<VisualReference, 'coverage' | 'observations' | 'sources'> & { unknowns?: string[] };
const photo = (url: string, imageUrl: string, localResearchFile: string, kind: VisualSource['kind'] = 'official-photo'): VisualSource => ({ url, imageUrl, localResearchFile, kind, reviewed: true, captureDate: null });
const video = (frameTime: string): VisualSource => ({ url: `${VIDEO}&t=${frameTime.split(':').reduce((n, v) => n * 60 + Number(v), 0)}s`, kind: 'official-video', reviewed: true, frameTime, captureDate: null });
const overviewSource: VisualSource = { url: OVERVIEW, kind: 'official-overview', reviewed: true, captureDate: null, localResearchFile: 'aerial-1.jpg' };
const centralAerialSource: VisualSource = { url: 'https://www.mju.ac.kr/bbs/mjukr/147/175263/download.do', kind: 'official-overview', reviewed: true, captureDate: null, localResearchFile: 'event-aerial-8.jpg' };
const overview = (observation: string): Detail => ({ coverage: 'overview-only', observations: [observation], sources: [overviewSource], unknowns: ['Only an older overview/composite was reviewed. This does not verify a current facade.'] });
const dormant = (filename: string, local: string, observation: string): Detail => ({ coverage: 'closeup-photo', observations: [observation], sources: [photo(DORM, DORM_IMAGES + encodeURIComponent(filename), local)] });

const details: Record<string, Detail> = {
    'mju-y-main': { coverage: 'video-frame', observations: ['Pale facade, dark lower bands, rectangular windows, broad steps and shrubs.'], sources: [video('2:34')] },
    'mju-y1': { coverage: 'video-frame', observations: ['Light beige facade, green glazed entry, paved forecourt and deciduous trees.'], sources: [video('1:26')] },
    'mju-y2': { coverage: 'closeup-photo', observations: ['White upper bar with narrow vertical windows and a dark glazed end; open supports above a smaller lower block.', 'Aerial photograph shows roof arrays and a paved, planted forecourt.'], sources: [
        photo('https://www.mju.ac.kr/mjukr/160/subview.do', 'https://www.mju.ac.kr/sites/mjukr/images/sub01/hisbox01.png', 'hisbox01.png'),
        photo('https://www.gansam.com/works/work.php?code=works&idx=2527', 'https://www.gansam.com/admin/data/bbs/works/2105110910094_5.jpg', 'gansam-2105110910094_5.jpg', 'architect-photo'),
    ], unknowns: ['Other Gansam gallery images are design renderings; proposed neighbouring volumes were excluded.'] },
    'mju-y3': { coverage: 'video-frame', observations: ['Pale block with a dark window grid and deep vertical facade elements; planted verges and paved approaches.'], sources: [video('4:58'), centralAerialSource], unknowns: ['The PDF reuses a page with a 2025 festival diagram; aerial photo capture date is unknown.'] },
    'mju-y5': { coverage: 'video-frame', observations: ['Long pale flat roof with rectangular rooftop projections; dark lower facade, blue glazed bays and broad entry steps.'], sources: [video('1:44'), centralAerialSource] },
    'mju-y6': overview('Older overview shows a pale rectangular block with a greenish roof surface and repeated dark horizontal windows.'),
    'mju-y7': { coverage: 'video-frame', observations: ['Faceted white horizontal bands, blue glazing and a broad exterior ramp; the overview shows an octagonal roof.'], sources: [video('4:13'), overviewSource] },
    'mju-y8': overview('Older overview shows a pale elongated rectangular block with dark glazing on its end.'),
    'mju-y9': { coverage: 'video-frame', observations: ['Pale grid facade, blue-green strips and large dark-framed windows; a white pedestrian bridge and conifer appear nearby.'], sources: [video('3:23')] },
    'mju-y10': overview('Older overview identifies the residence beside the athlete courts, partly screened by trees.'),
    'mju-y11': overview('Older overview identifies a low pale building beside the sports field and athlete courts.'),
    'mju-y12': { coverage: 'video-frame', observations: ['Peach volume beside a pale window-grid wing, dark entrance canopy, red-gray paving, conifers and ramp rails.'], sources: [video('5:57')], unknowns: ['The relative outlines of the design complex and adjacent Architecture Institute are not independently surveyed.'] },
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
};

/** Every currently modeled building/gate is present, including explicit gaps. */
export const VISUAL_REFERENCES: Readonly<Record<string, VisualReference>> = Object.fromEntries(
    REFERENCE_CAMPUS.features.filter(f => f.kind === 'building' || f.kind === 'gate').map(f => {
        const d = details[f.id];
        const sources: VisualSource[] = d?.sources ?? [{ url: DIRECTORY, kind: 'directory', reviewed: false, captureDate: null }];
        const first = sources[0] ?? { url: DIRECTORY, kind: 'directory' as const, reviewed: false, captureDate: null };
        const record: VisualReference = {
            featureId: f.id, code: f.code, nameEn: f.name.en, checkedAt: VISUAL_REVIEW_DATE,
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
