import type { Localized } from './types';
import { BUILDING_PHOTO_CATALOG } from './building-photo-catalog';

/** Individually identified university photographs, embedded for offline use. */
export interface BuildingPhoto {
    id: string;
    placeId: string;
    src: string;
    caption: Localized;
    sourcePageUrl: string;
    imageUrl: string;
    originalCaption: string | null;
    width: number;
    height: number;
    captureDate: string | null;
    checkedAt: string;
    officialOrganization: string;
    sha256: string;
    identificationEvidence: string;
}

export function getBuildingPhotos(placeId: string): readonly BuildingPhoto[] {
    return BUILDING_PHOTO_CATALOG.filter(photo => photo.placeId === placeId);
}
