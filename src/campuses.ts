import { Dataset, Localized } from './types';
import { liveSeed } from './data';
import { createReferencePlaces, CAMPUS_DIRECTORY_URL } from './campus';
import { SEOUL_CAMPUS, createSeoulReferencePlaces, SEOUL_DIRECTORY_URL } from './seoul';

export type CampusId = 'yongin' | 'seoul';
export const CAMPUS_IDS: CampusId[] = ['yongin', 'seoul'];
export const isCampusId = (value: unknown): value is CampusId => value === 'yongin' || value === 'seoul';
export const seoulSeed: Dataset = {
    schemaVersion: 1, id: 'mju-seoul-live', mode: 'live', version: 1,
    updatedAt: '2026-10-01T00:00:00+09:00', campus: SEOUL_CAMPUS,
    places: createSeoulReferencePlaces(), buildings: [], entrances: [], nodes: [], edges: [], food: [], events: [], rooms: [],
};
export const CAMPUSES: Record<CampusId, {
    id: CampusId; dataset: Dataset; city: Localized; name: Localized; directoryUrl: string;
    referencePlaces: () => Dataset['places'];
}> = {
    yongin: {
        id: 'yongin', dataset: liveSeed, city: {en:'Yongin',ko:'용인',zh:'龙仁'},
        name: {en:'Nature Campus',ko:'자연캠퍼스',zh:'自然校区'}, directoryUrl: CAMPUS_DIRECTORY_URL,
        referencePlaces: createReferencePlaces,
    },
    seoul: {
        id: 'seoul', dataset: seoulSeed, city: {en:'Seoul',ko:'서울',zh:'首尔'},
        name: {en:'Humanities Campus',ko:'인문캠퍼스',zh:'人文校区'}, directoryUrl: SEOUL_DIRECTORY_URL,
        referencePlaces: createSeoulReferencePlaces,
    },
};

/** An incoming content update belongs to exactly one campus. */
export function contentCampusId(data: Pick<Dataset,'campus'>): CampusId | null {
    return CAMPUS_IDS.find(id => CAMPUSES[id].dataset.campus.id === data.campus.id) || null;
}
