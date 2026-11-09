import type { ReferenceFeature } from './campus';

/** A qualitative side stair and intermediate landing seen in the official MCC
 * panorama. This is NOT a ground-to-field route or a measured stair inventory.
 * All dimensions, riser counts and fitted orientation are display choices. */
export function createSeoulStairDetail(features: readonly ReferenceFeature[], heightScale: number) {
    const field = features.find(f => f.id === 'mju-seoul-field');
    if (!field) return null;
    const edge = field.center[0] + field.size[0] / 2;
    const z = field.center[1] + field.size[1] * .39;
    const ground = -.70, upper = 2.53 * heightScale + .012;
    const lower = (-.56 + upper) / 2;
    const width = 2.4, stepCount = 6, run = 2.2, start = edge + .3;
    const boxes: { x:number; z:number; y:number; width:number; depth:number; height:number; role:'upper-landing'|'tread'|'lower-landing' }[] = [];
    const box = (x:number,w:number,top:number,role:typeof boxes[number]['role']) => boxes.push({x,z,y:ground,width:w,depth:width,height:top-ground,role});
    box(edge-.1,.8,upper,'upper-landing');
    for (let i=0;i<stepCount;i++) box(start+(i+.5)*run/stepCount,run/stepCount,upper-(upper-lower)*(i+1)/stepCount,'tread');
    box(edge+2.8,.6,lower,'lower-landing');
    return { id:'sports-terrace-side-stair', anchorId:field.id, ground, upper, lower, stepCount, boxes };
}
