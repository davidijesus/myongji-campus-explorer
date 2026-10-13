import type { CampusId } from './campuses';
import { REFERENCE_CAMPUS, REFERENCE_PROJECTION } from './campus';
import { SEOUL_REFERENCE_CAMPUS, SEOUL_REFERENCE_PROJECTION } from './seoul';
import { PLAN_CALIBRATION } from './plan-layout';
import { assessGeographicFix, GeographicFix, projectGeographicPoint } from './geographic';

export type ModelLocationPoint = { x: number; z: number };
export type ModelLocationAssessment = {
    status: 'ok' | 'outside' | 'invalid' | 'stale' | 'unavailable';
    point?: ModelLocationPoint;
    radiusWorld?: number;
    accuracyM?: number;
    modelUncertaintyM?: number;
    uncertaintyM?: number;
};
type Transform = { a: number; b: number; tx: number; tz: number };
type Anchor = { id: string; east: number; south: number; x: number; z: number };
type ErrorSummary = { count: number; medianM: number; p95M: number; maxM: number; rmseM: number };
export type ModelLocationCalibration = {
    campusId: CampusId;
    available: boolean;
    method: 'published-marker-frame' | 'fixed-scale-plan-registration';
    /** x = a*east - b*south + tx; z = b*east + a*south + tz. */
    transform: Transform;
    unitsPerMeter: number;
    rotationDegrees: number;
    anchorIds: string[];
    planAnchorCount: number;
    /** There are no surveyed controls; some plan allocations share a polygon. */
    independentSurveyControlCount: 0;
    excludedAnchors: { id: string; reason: string; discrepancyM: number }[];
    fallbackIds: string[];
    controls: { id: string; role: 'fit' | 'excluded' | 'fallback' | 'construction'; discrepancyM: number; leaveOneOutM: number | null }[];
    fit: ErrorSummary;
    validation: ErrorSummary & { kind: 'leave-one-out' | 'construction-only' };
    /** A display policy, not a measured error bound or a statistical confidence interval. */
    assumedMarkerFloorM: number;
    /** Rounded source/model disagreement used by the display policy, not a physical error bound. */
    registrationEnvelopeM: number;
    modelUncertaintyM: number;
    sourceAccuracyKnown: false;
    sources: string[];
};

// Exclusions are based on the source conflicts in docs/POSITION_EVIDENCE.md,
// rather than selecting the smallest numerical residuals after fitting.
const EXCLUDED_PLAN_ANCHORS: Record<string, string> = {
    'mju-y14': 'Y14/Y83 directory pins nearly coincide although the labelled plan has distinct buildings; the correspondence is ambiguous.',
    'mju-y83': 'Y14/Y83 directory pins nearly coincide although the labelled plan has distinct buildings; the correspondence is ambiguous.',
    'mju-hydraulics': 'Directory pin is near Y13; the labelled plan identifies hydraulics beside Y15.',
    'mju-y32': 'Dormitory identity/name and directory-to-plan association are disputed.',
    'mju-y33': 'Dormitory directory-marker ordering conflicts with the labelled plan.',
    'mju-y34': 'Dormitory directory-marker ordering conflicts with the labelled plan.',
    'mju-y35': 'Dormitory directory-marker ordering conflicts with the labelled plan.',
    'mju-guardhouse': 'The small plan footprint has no readable building label; guardhouse identity is provisional.',
};

/** Unknown source-marker accuracy must never be displayed as zero. This explicit
 * 25 m policy allowance avoids a falsely precise presentation; it is NOT evidence
 * that the true source error is <=25 m. No surveyed control points are available. */
export const ASSUMED_MARKER_UNCERTAINTY_M = 25;

function transformPoint(transform: Transform, east: number, south: number): ModelLocationPoint {
    return { x: transform.a * east - transform.b * south + transform.tx, z: transform.b * east + transform.a * south + transform.tz };
}
function residualM(transform: Transform, anchor: Anchor, unitsPerMeter: number) {
    const point = transformPoint(transform, anchor.east, anchor.south);
    return Math.hypot(point.x - anchor.x, point.z - anchor.z) / unitsPerMeter;
}
function summarize(errors: number[]): ErrorSummary {
    const sorted = [...errors].sort((a, b) => a - b), count = sorted.length;
    if (!count) return { count: 0, medianM: 0, p95M: 0, maxM: 0, rmseM: 0 };
    const middle = Math.floor(count / 2);
    return {
        count, medianM: count % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2,
        p95M: sorted[Math.ceil(count * .95) - 1]!, maxM: sorted[count - 1]!,
        rmseM: Math.hypot(...sorted) / Math.sqrt(count),
    };
}
/** Equal-weight rigid registration with the source plan's fixed metre scale.
 * Only one rotation/translation is estimated: no local warps, snapping, shear,
 * anisotropic scale or per-building GPS offset is introduced. */
function fitFixedScale(anchors: Anchor[], unitsPerMeter: number): Transform | null {
    if (anchors.length < 3) return null;
    const mean = { east: 0, south: 0, x: 0, z: 0 };
    for (const anchor of anchors) for (const key of ['east', 'south', 'x', 'z'] as const) mean[key] += anchor[key] / anchors.length;
    let dot = 0, cross = 0, spread = 0;
    for (const anchor of anchors) {
        const east = anchor.east - mean.east, south = anchor.south - mean.south, x = anchor.x - mean.x, z = anchor.z - mean.z;
        dot += east * x + south * z; cross += east * z - south * x; spread += east * east + south * south;
    }
    if (spread < 1 || !Number.isFinite(dot + cross) || Math.hypot(dot, cross) < 1e-9) return null;
    const angle = Math.atan2(cross, dot), a = Math.cos(angle) * unitsPerMeter, b = Math.sin(angle) * unitsPerMeter;
    return { a, b, tx: mean.x - a * mean.east + b * mean.south, tz: mean.z - b * mean.east - a * mean.south };
}
function buildCalibration(campusId: CampusId): ModelLocationCalibration {
    const source = campusId === 'seoul' ? SEOUL_REFERENCE_CAMPUS : REFERENCE_CAMPUS;
    const projection = campusId === 'seoul' ? SEOUL_REFERENCE_PROJECTION : REFERENCE_PROJECTION;
    const unitsPerMeter = campusId === 'seoul' ? projection.unitsPerMeter : PLAN_CALIBRATION.unitsPerMeter;
    const all: Anchor[] = source.features.filter(feature => feature.marker).map(feature => {
        const marker = feature.marker!, point = projectGeographicPoint(campusId, marker.lat, marker.lon);
        return { id: feature.id, east: point.x, south: point.y, x: feature.center[0], z: feature.center[1] };
    });
    const fallbackIds = campusId === 'yongin' ? source.features.filter(feature => feature.marker && feature.layoutSource !== 'official-plan').map(feature => feature.id) : [];
    const plan = all.filter(anchor => !fallbackIds.includes(anchor.id));
    const anchors = campusId === 'seoul' ? all : plan.filter(anchor => !EXCLUDED_PLAN_ANCHORS[anchor.id]);
    const fitted = campusId === 'seoul' ? { a: unitsPerMeter, b: 0, tx: 0, tz: 0 } : fitFixedScale(anchors, unitsPerMeter);
    const transform = fitted || { a: unitsPerMeter, b: 0, tx: 0, tz: 0 };
    const fit = summarize(anchors.map(anchor => residualM(transform, anchor, unitsPerMeter)));
    const validationErrors = campusId === 'seoul' ? anchors.map(anchor => residualM(transform, anchor, unitsPerMeter)) : anchors.map((anchor, index) => {
        const omitted = fitFixedScale(anchors.filter((_, i) => i !== index), unitsPerMeter);
        return omitted ? residualM(omitted, anchor, unitsPerMeter) : Infinity;
    });
    const validation = { ...summarize(validationErrors), kind: campusId === 'seoul' ? 'construction-only' as const : 'leave-one-out' as const };
    const excludedAnchors = campusId === 'seoul' ? [] : plan.filter(anchor => EXCLUDED_PLAN_ANCHORS[anchor.id]).map(anchor => ({ id: anchor.id, reason: EXCLUDED_PLAN_ANCHORS[anchor.id]!, discrepancyM: residualM(transform, anchor, unitsPerMeter) }));
    // Retain the large known disagreements in the displayed uncertainty instead
    // of hiding them after excluding their unreliable matches from the fit.
    const controls = all.map(anchor => {
        const index = anchors.findIndex(candidate => candidate.id === anchor.id);
        const role = campusId === 'seoul' ? 'construction' as const : fallbackIds.includes(anchor.id) ? 'fallback' as const : index >= 0 ? 'fit' as const : 'excluded' as const;
        return { id: anchor.id, role, discrepancyM: residualM(transform, anchor, unitsPerMeter), leaveOneOutM: role === 'fit' ? validationErrors[index]! : null };
    });
    // Fallback models retain their raw-marker frame. Their discrepancy with the
    // registered dot is audited, but never used as an independent fit control.
    const largestDiscrepancy = Math.max(validation.maxM, ...controls.map(anchor => anchor.discrepancyM));
    const registrationEnvelopeM = largestDiscrepancy < 1e-6 ? 0 : Math.ceil(largestDiscrepancy / 5) * 5;
    // These are regression gates, not claims of surveyed accuracy. A changed
    // dataset that breaks the registration should stop displaying a model fix.
    const available = !!fitted && Number.isFinite(registrationEnvelopeM) && (campusId === 'seoul' ? anchors.length >= 3 && fit.maxM < 1e-6 : anchors.length >= 12 && fit.rmseM < 35 && validation.maxM < 80);
    return {
        campusId, available, method: campusId === 'seoul' ? 'published-marker-frame' : 'fixed-scale-plan-registration',
        transform, unitsPerMeter, rotationDegrees: Math.atan2(transform.b, transform.a) * 180 / Math.PI,
        anchorIds: anchors.map(anchor => anchor.id), planAnchorCount: campusId === 'seoul' ? 0 : anchors.length,
        independentSurveyControlCount: 0, excludedAnchors, fallbackIds, controls, fit, validation,
        assumedMarkerFloorM: ASSUMED_MARKER_UNCERTAINTY_M, registrationEnvelopeM,
        modelUncertaintyM: ASSUMED_MARKER_UNCERTAINTY_M + registrationEnvelopeM,
        sourceAccuracyKnown: false,
        sources: campusId === 'seoul' ? [source.sourceUrl] : [source.sourceUrl, PLAN_CALIBRATION.sourceUrl],
    };
}
const calibrations: Record<CampusId, ModelLocationCalibration> = {
    yongin: buildCalibration('yongin'), seoul: buildCalibration('seoul'),
};
export function getModelLocationCalibration(campusId: CampusId): ModelLocationCalibration {
    // Consumers receive diagnostic metadata, never a device location. Copy it
    // so UI inspection cannot modify the transform used by later readings.
    const c = calibrations[campusId];
    return { ...c, transform: { ...c.transform }, anchorIds: [...c.anchorIds], excludedAnchors: c.excludedAnchors.map(anchor => ({ ...anchor })), fallbackIds: [...c.fallbackIds], controls: c.controls.map(anchor => ({ ...anchor })), fit: { ...c.fit }, validation: { ...c.validation }, sources: [...c.sources] };
}
/** Approximate direct model placement. The circle adds the reported device
 * accuracy and a deliberately conservative model-registration display allowance.
 * It is not a 95% confidence region, a campus geofence, or navigation guidance. */
export function assessModelLocation(campusId: CampusId, fix: GeographicFix, now = Date.now()): ModelLocationAssessment {
    if (campusId !== 'yongin' && campusId !== 'seoul') return { status: 'unavailable' };
    const assessment = assessGeographicFix(campusId, fix, now);
    if (assessment.status !== 'ok' || !assessment.point) return { status: assessment.status };
    const calibration = calibrations[campusId];
    if (!calibration.available) return { status: 'unavailable' };
    const point = transformPoint(calibration.transform, assessment.point.x, assessment.point.y);
    const uncertaintyM = fix.accuracyM + calibration.modelUncertaintyM, radiusWorld = uncertaintyM * calibration.unitsPerMeter;
    if (![point.x, point.z, uncertaintyM, radiusWorld].every(Number.isFinite)) return { status: 'invalid' };
    return { status: 'ok', point, radiusWorld, accuracyM: fix.accuracyM, modelUncertaintyM: calibration.modelUncertaintyM, uncertaintyM };
}
