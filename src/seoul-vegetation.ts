import type { ReferenceFeature } from './campus';
import type { Localized } from './types';
import { SEOUL_PATH_TRACES, seoulPavementDistance } from './seoul-paths';

/** Area-level evidence, not a tree inventory. See data/seoul-vegetation-evidence.json.
 * Positions, sizes and symbol counts are schematic choices inside existing envelopes. */
export const SEOUL_VEGETATION_SOURCE_URL = 'https://news.mju.ac.kr/news/articleView.html?idxno=12317';
export const SEOUL_VEGETATION_NOTE: Localized = {
    en: 'Planting groups follow the university illustration and photographs around the sports terrace, MCC frontage and main entrance. Their positions and sizes are schematic, not a surveyed tree inventory; species and individual tree counts are not verified.',
    ko: '운동장 테라스, MCC 앞과 정문 주변의 식재는 대학 안내 그림과 사진을 참고했습니다. 위치와 크기는 개략적 표현이며, 측량한 수목 현황이 아닙니다. 수종과 개별 나무 수는 확인되지 않았습니다.',
    zh: '运动场平台、MCC楼前及正门周边的绿化参考了学校示意图和照片。位置与大小仅为示意，并非实测树木清单；树种和具体树木数量尚未核实。',
};
export const SEOUL_VEGETATION_ZONE_IDS = [
    'terrace-mcc-side', 'terrace-front', 'terrace-gate-side', 'mcc-street-gardens',
    'gate-approach-island', 'gate-west-pocket', 'gate-east-pocket',
] as const;
export type SeoulVegetationZoneId = typeof SEOUL_VEGETATION_ZONE_IDS[number];
export interface SeoulPlant {
    kind: 'tree' | 'shrub';
    center: [number, number];
    baseY: number;
    radius: number;
    height: number;
}
export interface SeoulVegetationZone {
    id: SeoulVegetationZoneId;
    anchorId: string;
    surface: 'terrace' | 'ground';
    plants: SeoulPlant[];
}
/** Full pavement shoulder plus a small visual gap; applied to the canopy, not trunk. */
export const SEOUL_PLANTING_GAP = .20;
export const SEOUL_PAVEMENT_HALF_WIDTH = 1.5;

function footprintDistance(x: number, z: number, feature: ReferenceFeature): number {
    const dx = x - feature.center[0], dz = z - feature.center[1];
    const localX = dx * Math.cos(feature.angle) - dz * Math.sin(feature.angle);
    const localZ = dx * Math.sin(feature.angle) + dz * Math.cos(feature.angle);
    return Math.hypot(Math.max(0, Math.abs(localX) - feature.size[0] / 2), Math.max(0, Math.abs(localZ) - feature.size[1] / 2));
}

/** Uses existing illustration anchors only. Never adds geographic or navigation data.
 * renderHeightScale is the shared model scale, so terrace plants follow the field mesh.
 * The field's current authored green surface is 2.53; a geometry test checks this coupling. */
export function createSeoulVegetation(features: readonly ReferenceFeature[], renderHeightScale: number): SeoulVegetationZone[] {
    const field = features.find(f => f.id === 'mju-seoul-field');
    const mcc = features.find(f => f.id === 'mju-s10');
    const gate = features.find(f => f.id === 'mju-seoul-gate');
    const booth = features.find(f => f.id === 'mju-seoul-guardhouse');
    if (!field || !mcc || !gate || !booth) return [];
    const zones: SeoulVegetationZone[] = [];
    const groundY = -.70, terraceY = 2.53 * renderHeightScale + .012;
    const plant = (anchor: ReferenceFeature, x: number, z: number, radius: number, height: number, kind: SeoulPlant['kind'], baseY = groundY): SeoulPlant => ({
        kind, center: [anchor.center[0] + x * Math.cos(anchor.angle) + z * Math.sin(anchor.angle), anchor.center[1] - x * Math.sin(anchor.angle) + z * Math.cos(anchor.angle)], baseY, radius, height,
    });
    const add = (id: SeoulVegetationZoneId, anchor: ReferenceFeature, surface: SeoulVegetationZone['surface'], candidates: SeoulPlant[]) => {
        // Each entire canopy clears pavement and other facility envelopes. The field
        // is the supporting surface only for terrace plants, never for ground plants.
        const plants = candidates.filter(p => seoulPavementDistance(...p.center) > p.radius + SEOUL_PAVEMENT_HALF_WIDTH + SEOUL_PLANTING_GAP && features.every(f =>
            (surface === 'terrace' && f.id === field.id) || footprintDistance(...p.center, f) > p.radius + SEOUL_PLANTING_GAP));
        zones.push({ id, anchorId: anchor.id, surface, plants });
    };
    const [w, d] = field.size;
    // Tiny side margins outside the existing white playing lines. Gaps between
    // symbols retain the transverse access breaks visible in the reference image.
    add('terrace-mcc-side', field, 'terrace', [-.27, -.05, .17].map(z => plant(field, -w * .465, d * z, .38, 1.65, 'tree', terraceY)));
    add('terrace-front', field, 'terrace', [-.30, -.10, .10, .30].map((x, i) => plant(field, w * x, d * .445, .33, i % 2 ? .32 : 1.45, i % 2 ? 'shrub' : 'tree', terraceY)));
    add('terrace-gate-side', field, 'terrace', [-.27, -.05, .17].map(z => plant(field, w * .465, d * z, .38, 1.65, 'tree', terraceY)));
    // Two street-level garden groups. The center of MCC frontage remains open;
    // no stair or street geometry is inferred from these schematic planted symbols.
    const street: SeoulPlant[] = [];
    for (const side of [-1, 1]) {
        for (const x of [.31, .43]) street.push(plant(mcc, side * mcc.size[0] * x, mcc.size[1] / 2 + 3.6, .88, 3.1, 'tree'));
        for (const x of [.27, .37, .46]) street.push(plant(mcc, side * mcc.size[0] * x, mcc.size[1] / 2 + 5.6, .58, .48, 'shrub'));
    }
    add('mcc-street-gardens', mcc, 'ground', street);
    // The verified narrow island is beside the gate-to-union corridor, not a
    // broad woodland. Offset its symbols from the existing schematic segment.
    const approach = SEOUL_PATH_TRACES.find(p => p.id === 'gate-inner-corridor');
    const a = approach?.points[1], b = approach?.points[0];
    if (a && b) {
        const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
        const island = [.25, .375, .50, .625, .75].map((t, i): SeoulPlant => ({
            kind: i % 2 ? 'shrub' : 'tree', center: [a[0] + dx * t - dz / length * 3.1, a[1] + dz * t + dx / length * 3.1],
            baseY: groundY, radius: i % 2 ? .34 : .62, height: i % 2 ? .40 : 2.75,
        }));
        add('gate-approach-island', gate, 'ground', island);
    }
    add('gate-west-pocket', booth, 'ground', [plant(booth, -3.8, 3.3, .76, 2.8, 'tree'), plant(booth, -2.7, 4.5, .48, .45, 'shrub')]);
    add('gate-east-pocket', gate, 'ground', [plant(gate, 6.2, 3.8, .76, 2.8, 'tree'), plant(gate, 7.3, 5, .48, .45, 'shrub')]);
    return zones;
}
