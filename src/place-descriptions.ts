import type { Localized } from './types';

/** Content review dates concern the cited text, never map accuracy or live operation. */
export type SourcedPlaceDescription = {
    description: Localized;
    sourceUrls: string[];
    checkedAt: string;
};

export const YONGIN_DESCRIPTION_SOURCE_URLS = {
    welfare: 'https://www.mju.ac.kr/mjukr/492/subview.do',
    facilities: 'https://mjtrans.mju.ac.kr/bbs/mjtrans/1003/215452/artclView.do',
    civil: 'https://gsie.mju.ac.kr/gsie/10829/subview.do',
    architecture: 'https://www.mju.ac.kr/mjukr/213/subview.do',
    health: 'https://www.mju.ac.kr/mjukr/3132/subview.do',
    staffDining: 'https://www.mju.ac.kr/mjukr/488/subview.do',
    cooperation: 'https://mjuresearch.mju.ac.kr/mjuresearch/index.do',
    chaplaincy: 'https://www.mju.ac.kr/mjukr/197/subview.do',
    structuralTesting: 'https://www.mju.ac.kr/mjuresearch/9354/subview.do',
} as const;

const s = YONGIN_DESCRIPTION_SOURCE_URLS;
const fact = (en: string, ko: string, zh: string, ...sourceUrls: string[]): SourcedPlaceDescription => ({
    description: { en, ko, zh }, sourceUrls, checkedAt: '2026-10-06',
});

/** Unsupported description paragraphs are omitted; gaps live in the development audit. */
export const YONGIN_PLACE_DESCRIPTIONS: Record<string, SourcedPlaceDescription> = {
    'mju-y-main': fact(
        'Copy room on 1F.',
        '1층에 복사실이 있습니다.',
        '1层设有复印室。', s.welfare),
    'mju-y1': fact(
        'Cafeteria, café, convenience store, postal counter and Health Center on 1F.',
        '1층에 학생식당, 카페, 편의점, 우편취급국과 보건의료센터가 있습니다.',
        '1层设有食堂、咖啡店、便利店、邮政代办所和保健医疗中心。', s.welfare, s.health),
    'mju-y2': fact(
        'Paris Baguette is in the 4F lobby.',
        '4층 로비에 파리바게트가 있습니다.',
        '巴黎贝甜位于4层大厅。', s.welfare, s.facilities),
    'mju-y3': fact(
        'Library, reading rooms and study rooms; cafeteria and convenience store in the basement.',
        '도서관, 열람실과 스터디룸이 있으며 지하에는 식당과 편의점이 있습니다.',
        '设有图书馆、阅览室和自习室，地下设有食堂和便利店。', s.facilities, s.welfare),
    'mju-y5': fact(
        'Smart Mobility office on 3F; copy room on 1F.',
        '3층에 스마트모빌리티공학전공 사무실, 1층에 복사실이 있습니다.',
        '3层设有智能交通工程专业办公室，1层设有复印室。', s.facilities, s.welfare),
    'mju-y9': fact(
        'Cheongnyeon Bakery and 7-Eleven on 3F.',
        '3층에 청년제빵소와 세븐일레븐이 있습니다.',
        '3层设有青年面包店和7-Eleven。', s.welfare),
    'mju-y12': fact(
        'College of Architecture; CAFEING on 1F.',
        '건축대학이 있으며 1층에 CAFEING이 있습니다.',
        '建筑学院所在地，1层设有CAFEING咖啡店。', s.architecture, s.welfare),
    'mju-y13': fact(
        'Civil Engineering office.',
        '토목공학 사무실이 있습니다.',
        '土木工程办公室所在地。', s.civil),
    'mju-y16': fact(
        'Staff cafeteria.',
        '교직원식당이 있습니다.',
        '设有教职工食堂。', s.staffDining),
    'mju-y17': fact(
        'Industry-Academic Cooperation Foundation on 3F.',
        '3층에 산학협력단이 있습니다.',
        '3层设有产学合作团办公室。', s.cooperation),
    'mju-y19': fact(
        'GRAZIE café; emart24 and copy room in the basement.',
        'GRAZIE 카페가 있으며 지하에 이마트24와 복사실이 있습니다.',
        '设有GRAZIE咖啡店，地下设有emart24便利店和复印室。', s.welfare),
    'mju-y21': fact(
        'Hana Bank on 1F; café and shops on 2F.',
        '1층에 하나은행, 2층에 카페와 매장이 있습니다.',
        '1层设有韩亚银行，2层设有咖啡店和商店。', s.welfare, s.facilities),
    'mju-y22': fact(
        'Mission Support Team on 4F.',
        '4층에 선교지원팀이 있습니다.',
        '4层设有宗教事务支持团队办公室。', s.chaplaincy),
    'mju-y23': fact(
        'Copy room on 4F.',
        '4층에 복사실이 있습니다.',
        '4层设有复印室。', s.welfare),
    'mju-y24': fact(
        'Structural testing for construction research and education.',
        '건설 분야 연구·교육을 위한 구조실험 시설입니다.',
        '用于建设领域研究与教学的结构试验设施。', s.structuralTesting),
    'mju-y30': fact('Student residence.', '학생 생활관입니다.', '学生宿舍。', s.facilities),
    'mju-y31': fact('Student residence.', '학생 생활관입니다.', '学生宿舍。', s.facilities),
    'mju-y32': fact('Student residence.', '학생 생활관입니다.', '学生宿舍。', s.facilities),
    'mju-y33': fact('Student residence.', '학생 생활관입니다.', '学生宿舍。', s.facilities),
    'mju-y34': fact('Student residence.', '학생 생활관입니다.', '学生宿舍。', s.facilities),
    'mju-bus-office': fact(
        'Hana Bank ATM outside the bus office.',
        '버스관리사무소 앞에 하나은행 ATM이 있습니다.',
        '公交管理办公室前设有韩亚银行ATM。', s.welfare),
};

export function getYonginPlaceDescription(placeId: string): SourcedPlaceDescription | undefined {
    return Object.prototype.hasOwnProperty.call(YONGIN_PLACE_DESCRIPTIONS, placeId)
        ? YONGIN_PLACE_DESCRIPTIONS[placeId] : undefined;
}
