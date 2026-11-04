import { Localized } from './types';

/** Official illustration, reviewed 2026-10-16. Source pixels/observations and
 * exclusions are recorded in data/seoul-path-evidence.json. These are manually
 * placed schematic centre lines, not georeferenced traces or routing edges. */
export const SEOUL_PATH_SOURCE_URL = 'https://www.mju.ac.kr/sites/mjukr/images/temp_1783296837696100.png';
export const SEOUL_PATH_CHECKED_AT = '2026-10-16';
export const SEOUL_PATH_NOTE: Localized = {
    en: 'Paved corridors are schematic traces of the university’s illustrated campus map. Their position and width are approximate; they do not establish walking directions, entrances, steps or accessible routes.',
    ko: '포장된 통로는 대학의 캠퍼스 안내 그림을 바탕으로 개략적으로 표시했습니다. 위치와 폭은 대략적이며, 보행 경로·출입구·계단·무장애 경로를 확인한 자료가 아닙니다.',
    zh: '铺装通道依据大学校园示意图作概略描绘。位置和宽度均为近似值，不代表已核实的步行导航、入口、台阶或无障碍路线。',
};
export const SEOUL_PATH_TRACES: {id:string; points:[number,number][]}[] = [
    {id:"gate-inner-corridor",points:[[25.6,17],[20,6],[18,-2],[18,-21]]},
    {id:"general-hall-frontage",points:[[20,6],[2,6],[-29,6],[-54,6]]},
    {id:"international-library-gap",points:[[18,-21],[32,-21],[32,-29]]}
];
export const SEOUL_REFERENCE_ROADS: [number,number][][] = SEOUL_PATH_TRACES.map(path => path.points);

/** Keep decorative planting off the illustrated pavement. This is a scene
 * distance only; it must never be interpreted as a walking distance. */
export function seoulPavementDistance(x:number,z:number):number {
    let distance=Infinity;
    for(const path of SEOUL_REFERENCE_ROADS) for(let i=1;i<path.length;i++) {
        const a=path[i-1]!,b=path[i]!,dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
        const t=length ? Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length)) : 0;
        distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
    }
    return distance;
}
