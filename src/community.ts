import type { CampusId, Localized } from './types';

export type CommunitySourceId = 'o_ulami' | 'mjhs_lounge' | 'mju_lounge' | 'mj_bokji_foodist' | 'mju-menu-library' | 'mju-menu-student' | 'mju-menu-dorm';
export type CommunityKind = 'menu' | 'announcement';
export type CommunitySource = {
  id: CommunitySourceId;
  handle: string;
  url: string;
  title: Localized;
  kind: CommunityKind;
  campusId: 'yongin';
  guidePage: 1 | 4 | null;
  guideLocation: Localized | null;
  profileStatus: 'guide-only' | 'corroborated-reference' | 'official';
  sourceType?: 'instagram' | 'official-menu';
  note: Localized;
};
/** A human-reviewed offline summary, never a feed item inferred from a handle. */
export type CommunityUpdate = {
  id: string;
  sourceId: CommunitySourceId;
  kind: CommunityKind;
  summary: Localized;
  sourceUrl: string;
  publishedAt: string | null;
  /** When the official page was read; not an inferred publication date. */
  observedAt?: string;
  reviewedAt: string;
  /** Inclusive calendar dates in Asia/Seoul, not the viewer's local timezone. */
  validFrom: string;
  validThrough: string;
};

const l = (en: string, ko: string, zh: string): Localized => ({ en, ko, zh });
function officialMenuSource(id: CommunitySourceId, page: number, title: Localized, location: Localized): CommunitySource {
  return { id, handle: 'MJU', url: `https://www.mju.ac.kr/mjukr/${page}/subview.do`, title,
    kind: 'menu', campusId: 'yongin', guidePage: null, guideLocation: location,
    sourceType: 'official-menu', profileStatus: 'official',
    note: l('Official university weekly menu page. A missing menu is not evidence that the cafeteria is closed. Dates and meals must be reviewed before saving a summary.',
      '대학 공식 주간 식단 페이지입니다. 식단이 없다고 식당이 문을 닫았다는 뜻은 아닙니다. 요약을 저장하기 전에 날짜와 식사를 검토해야 합니다.',
      '大学官方每周菜单页面。未发布菜单不表示食堂关闭。保存摘要前须审核日期和餐次。') };
}
export const COMMUNITY_GUIDE_REVIEWED_AT = '2026-10-04';
export const COMMUNITY_SOURCES: readonly CommunitySource[] = [
  officialMenuSource('mju-menu-library', 485, l('Library-building cafeteria', '명진당 식당', '图书馆食堂'), l('Library / Myongjin Hall', '명진당', '图书馆／明进堂')),
  officialMenuSource('mju-menu-student', 486, l('Student cafeteria', '학생회관 식당', '学生会馆食堂'), l('Student Union', '학생회관', '学生会馆')),
  officialMenuSource('mju-menu-dorm', 487, l('Dormitory cafeteria', '생활관 식당', '宿舍食堂'), l('Dormitory / Welfare Building', '생활관 복지동', '宿舍／福利楼')),
  {
    id: 'o_ulami', handle: '@O_ulami', url: 'https://www.instagram.com/o_ulami/',
    title: l('Oulami international exchange club', '국제교류학생클럽 어우라미', 'Oulami国际交流学生社团'),
    kind: 'announcement', campusId: 'yongin', guidePage: 1, guideLocation: null,
    profileStatus: 'corroborated-reference',
    note: l('The supplied guide names this international-student profile. A university notice also references the account. Current posts and upcoming events have not been verified.',
      '제공된 안내서에 소개된 국제학생 관련 계정이며 대학 공지에서도 언급합니다. 현재 게시물과 예정 행사는 확인되지 않았습니다.',
      '提供的指南列出此国际学生资讯账号，大学通知也曾提及。当前帖子和即将举行的活动尚未核实。'),
  },
  {
    id: 'mjhs_lounge', handle: '@mjhs_lounge', url: 'https://www.instagram.com/mjhs_lounge/',
    title: l('Student cafeteria', '학생식당', '学生食堂'),
    kind: 'menu', campusId: 'yongin', guidePage: 4,
    guideLocation: l('Student Building · 1F (guide)', '학생회관 · 1층 (안내서)', '学生会馆 · 1层（指南）'),
    profileStatus: 'guide-only',
    note: l('This handle is recorded in the supplied guide only. The profile itself and its current operation remain unverified.',
      '제공된 안내서에서만 확인한 계정명입니다. 프로필 자체와 현재 운영 여부는 아직 확인되지 않았습니다.',
      '此账号名仅见于提供的指南。该主页本身及当前运营情况尚未核实。'),
  },
  {
    id: 'mju_lounge', handle: '@mju_lounge', url: 'https://www.instagram.com/mju_lounge/',
    title: l('Library-building cafeteria', '도서관 건물 식당', '图书馆楼食堂'),
    kind: 'menu', campusId: 'yongin', guidePage: 4,
    guideLocation: l('Building 3, library · B1 (guide)', '3번 건물 도서관 · 지하 1층 (안내서)', '3号楼图书馆 · 地下1层（指南）'),
    profileStatus: 'corroborated-reference',
    note: l('The supplied guide lists this cafeteria profile. Current menus, prices and hours have not been verified.',
      '제공된 안내서에 소개된 식당 계정입니다. 현재 메뉴·가격·운영시간은 확인되지 않았습니다.',
      '提供的指南列出此食堂账号。当前菜单、价格和营业时间尚未核实。'),
  },
  {
    id: 'mj_bokji_foodist', handle: '@mj_bokji_foodist', url: 'https://www.instagram.com/mj_bokji_foodist/',
    title: l('Dormitory cafeteria', '기숙사 식당', '宿舍食堂'),
    kind: 'menu', campusId: 'yongin', guidePage: 4,
    guideLocation: l('Dormitory · 1F (guide)', '기숙사 · 1층 (안내서)', '宿舍 · 1层（指南）'),
    profileStatus: 'corroborated-reference',
    note: l('The supplied guide lists this cafeteria profile. Current menus, prices and hours have not been verified.',
      '제공된 안내서에 소개된 식당 계정입니다. 현재 메뉴·가격·운영시간은 확인되지 않았습니다.',
      '提供的指南列出此食堂账号。当前菜单、价格和营业时间尚未核实。'),
  },
];

export function getCommunitySource(id: string): CommunitySource | undefined {
  return COMMUNITY_SOURCES.find(source => source.id === id);
}
export function communitySources(campusId: CampusId, kind?: CommunityKind): readonly CommunitySource[] {
  return COMMUNITY_SOURCES.filter(source => source.campusId === campusId && (!kind || source.kind === kind));
}

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
function timestamp(value: unknown): number {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/.test(value) || !calendarDate(value.slice(0, 10))) return NaN;
  return Date.parse(value);
}
/** Reviewed original links only. Availability and authorship need human review. */
export function isCommunityPermalink(url: unknown, sourceId: string): url is string {
  if (typeof url !== 'string' || !getCommunitySource(sourceId)) return false;
  const official: Record<string, string> = { 'mju-menu-library': '4', 'mju-menu-student': '5', 'mju-menu-dorm': '6' };
  if (official[sourceId]) {
    const match = /^https:\/\/www\.mju\.ac\.kr\/diet\/mjukr\/([456])\/view\.do\?monday=(\d{4})\.(\d{2})\.(\d{2})$/.exec(url);
    if (!match || match[1] !== official[sourceId]) return false;
    const day = `${match[2]}-${match[3]}-${match[4]}`;
    return calendarDate(day) && new Date(day + 'T00:00:00Z').getUTCDay() === 1;
  }
  const story = /^https:\/\/www\.instagram\.com\/stories\/(o_ulami|mjhs_lounge|mju_lounge|mj_bokji_foodist)\/\d{1,32}\/$/.exec(url);
  if (story) return story[1] === sourceId;
  const match = /^https:\/\/www\.instagram\.com\/(?:(o_ulami|mjhs_lounge|mju_lounge|mj_bokji_foodist)\/)?(?:p|reel)\/[A-Za-z0-9_-]{1,64}\/$/.exec(url);
  return !!match && (!match[1] || match[1] === sourceId);
}
/** Validate saved provenance independently of its menu/announcement validity period. */
function reviewedCommunityUpdates(updates: readonly CommunityUpdate[], kind: CommunityKind | undefined, now: Date): CommunityUpdate[] {
  const currentTime = now.getTime();
  if (!Number.isFinite(currentTime)) return [];
  const seen = new Set<string>();
  return updates.filter(update => {
    if (!update || typeof update.id !== 'string' || !update.id.trim() || seen.has(update.id)) return false;
    const source = getCommunitySource(update.sourceId);
    if (!source || (update.kind !== 'menu' && update.kind !== 'announcement') || (kind && update.kind !== kind) || (update.kind === 'menu' && source.kind !== 'menu') || (source.sourceType === 'official-menu' && update.kind !== 'menu')) return false;
    if (!update.summary || !['en', 'ko', 'zh'].every(language => typeof update.summary[language as keyof Localized] === 'string' && !!update.summary[language as keyof Localized]?.trim())) return false;
    if (!isCommunityPermalink(update.sourceUrl, update.sourceId)) return false;
    const reviewed = timestamp(update.reviewedAt);
    const published = update.publishedAt === null && source.sourceType === 'official-menu' ? timestamp(update.observedAt) : timestamp(update.publishedAt);
    if (!Number.isFinite(published) || !Number.isFinite(reviewed) || published > reviewed || reviewed > currentTime) return false;
    if ('observedAt' in update && (source.sourceType !== 'official-menu' || !Number.isFinite(timestamp(update.observedAt)) || timestamp(update.observedAt) > reviewed || published > timestamp(update.observedAt))) return false;
    if (!calendarDate(update.validFrom) || !calendarDate(update.validThrough) || update.validFrom > update.validThrough) return false;
    const from = Date.parse(update.validFrom + 'T00:00:00Z'), through = Date.parse(update.validThrough + 'T00:00:00Z');
    if ((through - from) / 86400000 + 1 > (update.kind === 'menu' ? 7 : 366)) return false;
    if (source.sourceType === 'official-menu') {
      const monday = Date.parse(update.sourceUrl.slice(-10).replace(/\./g, '-') + 'T00:00:00Z');
      if (from < monday || through > monday + 6 * 86400000) return false;
    }
    seen.add(update.id);
    return true;
  }).sort((a, b) => Date.parse(b.publishedAt || b.observedAt || '') - Date.parse(a.publishedAt || a.observedAt || ''));
}

/** Reject expired and upcoming records before rendering meal/announcement summaries. */
export function currentCommunityUpdates(updates: readonly CommunityUpdate[], kind?: CommunityKind, now = new Date()): CommunityUpdate[] {
  if (!Number.isFinite(now.getTime())) return [];
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return reviewedCommunityUpdates(updates, kind, now).filter(update => update.validFrom <= today && update.validThrough >= today);
}

export type CommunitySourceAvailability = {
  /** Describes reviewed saved records, never remote profile availability or opening hours. */
  state: 'current' | 'outdated' | 'upcoming' | 'unavailable';
  current: CommunityUpdate[];
  lastValidThrough: string | null;
  nextValidFrom: string | null;
};

/** Keep a source's old dates visible without presenting its old meals as today's menu. */
export function communitySourceAvailability(updates: readonly CommunityUpdate[], sourceId: string, kind?: CommunityKind, now = new Date()): CommunitySourceAvailability {
  const empty: CommunitySourceAvailability = { state: 'unavailable', current: [], lastValidThrough: null, nextValidFrom: null };
  if (!getCommunitySource(sourceId) || !Number.isFinite(now.getTime())) return empty;
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const saved = reviewedCommunityUpdates(updates, kind, now).filter(update => update.sourceId === sourceId);
  const current = saved.filter(update => update.validFrom <= today && update.validThrough >= today);
  const expired = saved.filter(update => update.validThrough < today).map(update => update.validThrough).sort();
  const upcoming = saved.filter(update => update.validFrom > today).map(update => update.validFrom).sort();
  return { state: current.length ? 'current' : upcoming.length ? 'upcoming' : expired.length ? 'outdated' : 'unavailable',
    current, lastValidThrough: expired[expired.length - 1] || null, nextValidFrom: upcoming[0] || null };
}
