import { CampusId, isCampusId } from './campuses';
import { REFERENCE_CAMPUS } from './campus';
import { SEOUL_REFERENCE_CAMPUS } from './seoul';

/** A local Android handoff, never an address to fetch or an arbitrary intent. */
export const NAVER_NATIVE_REQUEST = 'https://appassets.androidplatform.net/native/naver';
export type NaverPlaceLinks = {
    kind: 'marker' | 'search';
    webUrl: string;
    nativeRequestUrl: string;
    sourceUrl: string;
    checkedAt: string;
};

/** Use original directory markers, not model centres, GPS or inferred entrances.
 * Korean campus-qualified names disambiguate repeated building names in web search.
 * External Naver results and routes are managed by Naver, not this offline guide. */
export function naverLinksForPlace(campusId: CampusId, placeId: string): NaverPlaceLinks | null {
    if (!isCampusId(campusId)) return null;
    const campus = campusId === 'seoul' ? SEOUL_REFERENCE_CAMPUS : REFERENCE_CAMPUS;
    const feature = campus.features.find(p => p.id === placeId);
    if (!feature) return null;
    const campusName = campusId === 'seoul' ? '명지대학교 인문캠퍼스' : '명지대학교 자연캠퍼스';
    const name = `${campusName} ${feature.name.ko}`;
    const params = new URLSearchParams({ campus: campusId, place: feature.id, name });
    if (feature.marker) {
        params.set('lat', String(feature.marker.lat));
        params.set('lon', String(feature.marker.lon));
    }
    return {
        kind: feature.marker ? 'marker' : 'search',
        webUrl: `https://map.naver.com/p/search/${encodeURIComponent(name)}`,
        nativeRequestUrl: `${NAVER_NATIVE_REQUEST}?${params}`,
        sourceUrl: campus.sourceUrl,
        checkedAt: campus.checkedAt,
    };
}
