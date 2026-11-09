import { Localized } from './types';

/** Official illustration, reviewed 2026-11-09. Source pixels/observations and
 * exclusions are recorded in data/seoul-path-evidence.json. These are manually
 * placed schematic centre lines, not georeferenced traces or routing edges. */
export const SEOUL_PATH_SOURCE_URL = 'https://www.mju.ac.kr/sites/mjukr/images/temp_1783296837696100.png';
export const SEOUL_PATH_CHECKED_AT = '2026-11-09';
export const SEOUL_PATH_NOTE: Localized = {
    en: "Internal paved areas follow the university illustration and photographs. Positions, widths and connections are schematic, not measured walking directions. The side stair by the sports terrace ends at a raised intermediate landing; steps, levels and accessible routes are not verified.",
    ko: "교내 포장 공간은 대학의 안내 그림과 사진을 참고했습니다. 위치, 폭, 연결은 개략적인 표현이며 실측 보행 경로가 아닙니다. 운동장 테라스 옆 계단은 지면보다 높은 중간참에서 끝납니다. 계단 수, 높이와 무장애 경로는 확인되지 않았습니다.",
    zh: "校内铺装区域参考大学示意图和照片。位置、宽度与连接为示意表达，并非实测步行路线。运动平台侧面的楼梯止于高于地面的中间平台；台阶数量、高度及无障碍路线尚未核实。",
};
export const SEOUL_PATH_TRACES: {id:string; points:[number,number][]}[] = [
    {id:"gate-inner-corridor",points:[[25.6,17],[20,6],[18,-2],[18,-21]]},
    {id:"general-hall-frontage",points:[[20,6],[2,6],[-29,6],[-54,6]]},
    {id:"international-library-gap",points:[[18,-21],[32,-21],[32,-29]]},
    {id:"entrance-west-approach",points:[[21.2,18.6],[14,17],[10,9],[2,6]]},
    {id:"sports-terrace-lower-apron",points:[[14,17],[4,20],[1,32],[1,47],[-8,51]]},
    {id:"mcc-street-court",points:[[-32.5,62],[-32.5,56]]},
    {id:"administration-frontage",points:[[25.6,17],[32,11],[44,11],[50,11]]}
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
