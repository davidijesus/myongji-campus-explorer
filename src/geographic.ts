import type { CampusId } from './campuses';
import type { Localized } from './types';
import { REFERENCE_CAMPUS, REFERENCE_PROJECTION, markerToReferencePoint } from './campus';
import { SEOUL_REFERENCE_CAMPUS, SEOUL_REFERENCE_PROJECTION, seoulMarkerToReferencePoint } from './seoul';

export type GeographicPoint = { x: number; y: number };
export type GeographicBounds = { minX: number; minY: number; maxX: number; maxY: number };
export type GeographicFix = { lat: number; lon: number; accuracyM: number; timestamp: number };
export type GeographicPin = GeographicPoint & {
    id: string;
    code: string | null;
    name: Localized;
    lat: number;
    lon: number;
    article: number;
    sourceUrl: string;
    checkedAt: string;
};
export type GeographicCampus = {
    id: CampusId;
    origin: { lat: number; lon: number };
    pins: GeographicPin[];
    bounds: GeographicBounds;
    sourceUrl: string;
    checkedAt: string;
    /** Display coverage around the directory markers, never a campus boundary. */
    coveragePaddingM: 200;
};
export type GeographicFixAssessment = {
    status: 'ok' | 'invalid' | 'stale' | 'outside';
    point?: GeographicPoint;
    fix?: GeographicFix;
};

const validCoordinates = (lat: number, lon: number) =>
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/** WGS84 local east/south metres, using the same transform as directory markers.
 * No illustrated feature centres, plan calibration, elevations or routing are used. */
export function projectGeographicPoint(campusId: CampusId, lat: number, lon: number): GeographicPoint {
    const projection = campusId === 'seoul' ? SEOUL_REFERENCE_PROJECTION : REFERENCE_PROJECTION;
    const point = campusId === 'seoul' ? seoulMarkerToReferencePoint(lat, lon) : markerToReferencePoint(lat, lon);
    return { x: point[0] / projection.unitsPerMeter, y: point[1] / projection.unitsPerMeter };
}

/** Only the original official-directory pins belong in the geographic view.
 * An illustrated model can be offset from its source marker; never copy its centre. */
export function getGeographicCampus(campusId: CampusId): GeographicCampus {
    const source = campusId === 'seoul' ? SEOUL_REFERENCE_CAMPUS : REFERENCE_CAMPUS;
    const projection = campusId === 'seoul' ? SEOUL_REFERENCE_PROJECTION : REFERENCE_PROJECTION;
    const pins: GeographicPin[] = [];
    for (const feature of source.features) {
        const marker = feature.marker;
        if (!marker || !validCoordinates(marker.lat, marker.lon)) continue;
        pins.push({
            id: feature.id, code: feature.code, name: { ...feature.name },
            lat: marker.lat, lon: marker.lon, article: marker.article,
            ...projectGeographicPoint(campusId, marker.lat, marker.lon),
            sourceUrl: source.sourceUrl, checkedAt: source.checkedAt,
        });
    }
    const bounds = pins.length ? {
        minX: Math.min(...pins.map(pin => pin.x)), minY: Math.min(...pins.map(pin => pin.y)),
        maxX: Math.max(...pins.map(pin => pin.x)), maxY: Math.max(...pins.map(pin => pin.y)),
    } : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return {
        id: campusId, origin: { ...projection.origin }, pins, bounds,
        sourceUrl: source.sourceUrl, checkedAt: source.checkedAt, coveragePaddingM: 200,
    };
}

/** Validate a transient foreground reading for display, without storing it.
 * `ok` means recent and within this map's display coverage; it does not establish
 * campus membership, entrance access, indoor location or surveyed map accuracy. */
export function assessGeographicFix(campusId: CampusId, fix: GeographicFix, now = Date.now()): GeographicFixAssessment {
    if (!fix || !validCoordinates(fix.lat, fix.lon) || !Number.isFinite(fix.accuracyM) ||
        fix.accuracyM <= 0 || !Number.isFinite(fix.timestamp) || !Number.isFinite(now)) return { status: 'invalid' };
    const age = now - fix.timestamp;
    if (age > 60_000 || age < -10_000) return { status: 'stale' };
    const campus = getGeographicCampus(campusId);
    const point = projectGeographicPoint(campusId, fix.lat, fix.lon);
    const { minX, minY, maxX, maxY } = campus.bounds, pad = campus.coveragePaddingM;
    // A tangent plane also projects the opposite side of Earth near its origin.
    // Reject that hemisphere before applying the local display-coverage rectangle.
    const radians = Math.PI / 180, phi = fix.lat * radians, originPhi = campus.origin.lat * radians;
    const hemisphere = Math.sin(phi) * Math.sin(originPhi) + Math.cos(phi) * Math.cos(originPhi) * Math.cos((fix.lon - campus.origin.lon) * radians);
    if (!campus.pins.length || hemisphere <= 0 || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
        point.x < minX - pad || point.x > maxX + pad || point.y < minY - pad || point.y > maxY + pad) return { status: 'outside' };
    return { status: 'ok', point, fix: { lat: fix.lat, lon: fix.lon, accuracyM: fix.accuracyM, timestamp: fix.timestamp } };
}
