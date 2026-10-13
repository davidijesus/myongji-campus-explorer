import { Dataset, Language, Route, Building, Point } from './types';
import { localPoint, usable } from './core';
import { REFERENCE_CAMPUS, ReferenceFeature } from './campus';
import { SEOUL_REFERENCE_CAMPUS } from './seoul';
import { localize } from './i18n';
import { GeographicFix } from './geographic';
import { assessModelLocation } from './model-location';
type Vec = [
    number,
    number,
    number
];
type RGB = [
    number,
    number,
    number
];
const color = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: Vec): Vec => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function multiply(a: number[], b: number[]): number[] { const o = Array(16).fill(0); for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
        for (let k = 0; k < 4; k++)
            o[c * 4 + r] += a[k * 4 + r]! * b[c * 4 + k]!; return o; }
function lookAt(eye: Vec, target: Vec): number[] { const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]; }
function ortho(l: number, r: number, b: number, t: number, n: number, f: number): number[] { return [2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]; }
function perspective(fov: number, aspect: number, near: number, far: number): number[] { const s = 1 / Math.tan(fov / 2); return [s / aspect, 0, 0, 0, 0, s, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]; }
export type SceneOcclusionRect = { x: number; y: number; width: number; height: number };
/** Scenic height reduction, not measured elevation or a source of storey counts. */
export const REFERENCE_RENDER_HEIGHT_SCALE = .62;
/** Fit every visible model component inside the centered local footprint envelope.
 * The shared horizontal factor preserves the authored proportions and the anchor;
 * even asymmetric canopies, forecourts and shadows cannot shift a source marker.
 * The returned geometry uses the same rotation for all parts, including round forms. */
export function fitReferenceMeshVertices(vertices: readonly number[], f: ReferenceFeature): number[] {
    let maxX=0,maxZ=0;
    for(let i=0;i<vertices.length;i+=9) { maxX=Math.max(maxX,Math.abs(vertices[i]!)); maxZ=Math.max(maxZ,Math.abs(vertices[i+2]!)); }
    const horizontal=Math.min(1,maxX>0?f.size[0]/(2*maxX):1,maxZ>0?f.size[1]/(2*maxZ):1),vertical=REFERENCE_RENDER_HEIGHT_SCALE;
    const cosine=Math.cos(f.angle),sine=Math.sin(f.angle),result:number[]=[];
    for(let i=0;i<vertices.length;i+=9) {
        const x=vertices[i]!*horizontal,z=vertices[i+2]!*horizontal;
        const n=norm([vertices[i+3]!/horizontal,vertices[i+4]!/vertical,vertices[i+5]!/horizontal]);
        result.push(f.center[0]+x*cosine+z*sine,vertices[i+1]!*vertical,f.center[1]-x*sine+z*cosine,n[0]*cosine+n[2]*sine,n[1],-n[0]*sine+n[2]*cosine,vertices[i+6]!,vertices[i+7]!,vertices[i+8]!);
    }
    return result;
}
const sharedGeometryId = (f: ReferenceFeature) => (f as ReferenceFeature & { sharedGeometryWith?: string }).sharedGeometryWith;
export const referenceCampusForData = (data:Pick<Dataset,'campus'>) => data.campus.id === 'mju-seoul-humanities' ? SEOUL_REFERENCE_CAMPUS : REFERENCE_CAMPUS;
/** Qualitative landform from the campus sign inspected on 2026-10-13. These
 * artistic scene units are NOT elevations, slopes, routes or a surveyed boundary.
 * The historic plan still owns every horizontal footprint and road centerline. */
export function createYonginScenicTerrain(features: readonly ReferenceFeature[], paths: readonly (readonly [number,number][])[]) {
    const step=12, origin:[number,number]=[-366,-216], datum=-.95;
    const outline:[number,number][]=[[-367,-208],[-251,-220],[-129,-185],[9,-203],[168,-181],[270,-121],[295,11],[266,151],[135,255],[-32,284],[-203,266],[-298,167],[-335,2]];
    const smooth=(value:number)=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
    const inside=(x:number,z:number)=>{let hit=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i]!,b=outline[j]!;if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
    const segmentDistance=(x:number,z:number,a:readonly number[],b:readonly number[])=>{const dx=b[0]!-a[0]!,dz=b[1]!-a[1]!,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((x-a[0]!)*dx+(z-a[1]!)*dz)/length)):0;return Math.hypot(x-a[0]!-t*dx,z-a[1]!-t*dz);};
    const edgeDistance=(x:number,z:number)=>Math.min(...outline.map((a,i)=>segmentDistance(x,z,a,outline[(i+1)%outline.length]!)));
    const roads=paths.flatMap(path=>path.slice(1).map((b,i)=>[path[i]!,b] as const));
    const roadDistance=(x:number,z:number)=>Math.min(...roads.map(([a,b])=>segmentDistance(x,z,a,b)));
    // Broad residence terrace and the gently rising rear engineering corridor
    // follow the sign's visible relationships; their numerical levels are stylistic.
    const pads=features.filter(f=>!sharedGeometryId(f)).map(f=>({f,cos:Math.cos(f.angle),sin:Math.sin(f.angle),level:f.category==='residence'&&f.center[0]<-90?12:0}));
    const padDistance=(pad:typeof pads[number],x:number,z:number,margin=0)=>{const dx=x-pad.f.center[0],dz=z-pad.f.center[1];return Math.hypot(Math.max(0,Math.abs(dx*pad.cos-dz*pad.sin)-pad.f.size[0]/2-margin),Math.max(0,Math.abs(dx*pad.sin+dz*pad.cos)-pad.f.size[1]/2-margin));};
    const featureDistance=(x:number,z:number)=>Math.min(...pads.map(p=>padDistance(p,x,z,6)));
    const lake=(x:number,z:number)=>((x-220)/66)**2+((z-140)/28)**2<1;
    const woodland=(x:number,z:number)=>x < -112 && z < 143 || z < -133 || z > 170 || x > 233 || z > 75 && x > -80 && x < 190;
    const nodeCache=new Map<string,number>();
    const nodeHeight=(x:number,z:number)=>{
        const key=x+','+z,cached=nodeCache.get(key);if(cached!==undefined)return cached;
        if(lake(x,z)){nodeCache.set(key,-2);return -2;}
        let nearest=pads[0]!,distance=Infinity;
        for(const pad of pads){const d=padDistance(pad,x,z);if(d<distance){nearest=pad;distance=d;}}
        const shore=(Math.hypot((x-220)/66,(z-140)/28)-1)*28;
        const edge=smooth((edgeDistance(x,z)-12)/38),water=smooth(shore/36);
        const residence=12*smooth((-x-52)/78)*smooth((-z+8)/45);
        const rearRise=4*smooth((-x-35)/55)*smooth((z-108)/42);
        const western=23*Math.exp(-1*((x+239)/94)**2-((z-38)/154)**2);
        const northern=16*Math.exp(-1*((x+90)/179)**2-((z+173)/66)**2);
        const southern=17*Math.exp(-1*((x-30)/172)**2-((z-235)/62)**2);
        const lakeside=13*Math.exp(-1*((x-104)/87)**2-((z-153)/68)**2);
        const hillClearance=smooth((distance-24)/30)*smooth((roadDistance(x,z)-8)/22);
        const natural=(residence+rearRise+(western+northern+southern+lakeside)*hillClearance)*water*edge;
        // A full grid diagonal of clearance leaves each historic footprint flat.
        const blend=smooth((distance-20)/28),level=nearest.level*(1-blend)+natural*blend;
        const height=datum+level;nodeCache.set(key,height);return height;
    };
    const cellInside=(x:number,z:number)=>inside(x,z)&&inside(x+step,z)&&inside(x,z+step)&&inside(x+step,z+step);
    const groundHeight=(x:number,z:number)=>{
        if(!inside(x,z))return datum;
        const gx=origin[0]+Math.floor((x-origin[0])/step)*step,gz=origin[1]+Math.floor((z-origin[1])/step)*step;
        if(!cellInside(gx,gz))return datum;
        const u=(x-gx)/step,v=(z-gz)/step,a=nodeHeight(gx,gz),b=nodeHeight(gx+step,gz),c=nodeHeight(gx+step,gz+step),d=nodeHeight(gx,gz+step);
        return u+v<=1?a+(b-a)*u+(d-a)*v:c+(d-c)*(1-u)+(b-c)*(1-v);
    };
    const surfaceHeight=(x:number,z:number)=>lake(x,z)?-.70:groundHeight(x,z)+(roadDistance(x,z)<=2.1?.15:0);
    return {step,origin,datum,outline,inside,cellInside,lake,woodland,featureDistance,roadDistance,nodeHeight,groundHeight,surfaceHeight};
}
/** Lift complete authored meshes without changing horizontal geometry or normals.
 * All supporting vertices share one vertical translation; labels use the new top. */
export function settleReferenceMesh(vertices: readonly number[], groundHeight:(x:number,z:number)=>number): {vertices:number[];top:number;offset:number} {
    let bottom=Infinity,ground=-Infinity;
    for(let i=0;i<vertices.length;i+=9){bottom=Math.min(bottom,vertices[i+1]!);ground=Math.max(ground,groundHeight(vertices[i]!,vertices[i+2]!));}
    const offset=ground-bottom+.035,result=[...vertices];let top=-Infinity;
    for(let i=1;i<result.length;i+=9){result[i]!+=offset;top=Math.max(top,result[i]!);}
    return {vertices:result,top,offset};
}
/** Clip a convex paved area to the existing ground triangles. Unlike merely
 * lifting its corners, this cannot cut through a ridge or bridge over a valley. */
export function drapeScenicPolygon(points: readonly [number,number][], terrain:ReturnType<typeof createYonginScenicTerrain>, offset:number): Vec[][] {
    if(points.length<3)return [];
    const {step,origin}=terrain,triangles:Vec[][]=[];
    const firstX=origin[0]+Math.floor((Math.min(...points.map(p=>p[0]))-origin[0])/step)*step;
    const firstZ=origin[1]+Math.floor((Math.min(...points.map(p=>p[1]))-origin[1])/step)*step;
    const maxX=Math.max(...points.map(p=>p[0])),maxZ=Math.max(...points.map(p=>p[1]));
    const cross2=(a:readonly number[],b:readonly number[],p:readonly number[])=>(b[0]!-a[0]!)*(p[1]!-a[1]!)-(b[1]!-a[1]!)*(p[0]!-a[0]!);
    for(let x=firstX;x<=maxX;x+=step)for(let z=firstZ;z<=maxZ;z+=step){
        for(const clip of [[[x,z],[x+step,z],[x,z+step]],[[x+step,z],[x+step,z+step],[x,z+step]]] as [number,number][][]){
            let polygon=points.map(p=>[...p] as [number,number]);
            for(let edge=0;edge<3&&polygon.length;edge++){
                const a=clip[edge]!,b=clip[(edge+1)%3]!,next:[number,number][]=[];
                for(let i=0;i<polygon.length;i++){
                    const p=polygon[i]!,q=polygon[(i+1)%polygon.length]!,dp=cross2(a,b,p),dq=cross2(a,b,q),pin=dp>=-1e-8,qin=dq>=-1e-8;
                    if(pin)next.push(p);
                    if(pin!==qin){const ratio=dp/(dp-dq);next.push([p[0]+(q[0]-p[0])*ratio,p[1]+(q[1]-p[1])*ratio]);}
                }
                polygon=next;
            }
            for(let i=1;i+1<polygon.length;i++){
                const a=polygon[0]!,b=polygon[i]!,c=polygon[i+1]!,area=cross2(a,b,c);
                if(Math.abs(area)<1e-8)continue;
                const ring=area>0?[a,c,b]:[a,b,c];
                triangles.push(ring.map(p=>[p[0],terrain.groundHeight(p[0],p[1])+offset,p[1]] as Vec));
            }
        }
    }
    return triangles;
}
class Geometry {
    data: number[] = [];
    /** Faceted deciduous canopy. The foliage is decorative, never a tree survey. */
    crown(x: number, y: number, z: number, r: number, h: number, tint: RGB, segments = 7) {
        const rings = [[.12, .45], [.40, 1], [.73, .90], [1, .20]];
        for (let level = 0; level < rings.length - 1; level++) for (let i = 0; i < segments; i++) {
            const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2, lo = rings[level]!, hi = rings[level + 1]!;
            const p = (angle: number, ring: number[]): Vec => [x + Math.cos(angle) * r * ring[1]!, y + h * ring[0]!, z + Math.sin(angle) * r * ring[1]!];
            this.quad(p(b, lo), p(a, lo), p(a, hi), p(b, hi), tint);
        }
        this.disk(x, y + h, z, r * .2, tint, segments);
    }
    polygon(points: [number, number][], y: number, tint: RGB) {
        const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        const cz = points.reduce((sum, p) => sum + p[1], 0) / points.length;
        for (let i = 0; i < points.length; i++) {
            const a = points[i]!, b = points[(i + 1) % points.length]!;
            this.triangle([cx, y, cz], [b[0], y, b[1]], [a[0], y, a[1]], tint);
        }
    }
    ellipse(x: number, y: number, z: number, rx: number, rz: number, tint: RGB, angle = 0, segments = 32) {
        const points: [number, number][] = [];
        for (let i = 0; i < segments; i++) {
            const a = i / segments * Math.PI * 2, px = Math.cos(a) * rx, pz = Math.sin(a) * rz;
            points.push([x + px * Math.cos(angle) + pz * Math.sin(angle), z - px * Math.sin(angle) + pz * Math.cos(angle)]);
        }
        this.polygon(points, y, tint);
    }
    prism(x: number, y: number, z: number, rx: number, rz: number, h: number, tint: RGB, segments = 8, angle = Math.PI / 8) {
        const points: [number, number][] = [];
        for (let i = 0; i < segments; i++) {
            const a = i / segments * Math.PI * 2 + angle;
            points.push([x + rx * Math.cos(a), z + rz * Math.sin(a)]);
        }
        this.polygon(points, y + h, tint);
        for (let i = 0; i < points.length; i++) {
            const a = points[i]!, b = points[(i + 1) % points.length]!;
            this.quad([b[0], y, b[1]], [a[0], y, a[1]], [a[0], y + h, a[1]], [b[0], y + h, b[1]], tint);
        }
    }
    triangle(a: Vec, b: Vec, c: Vec, tint: RGB) { const n = norm(cross(sub(b, a), sub(c, a))); for (const p of [a, b, c])
        this.data.push(...p, ...n, ...tint); }
    quad(a: Vec, b: Vec, c: Vec, d: Vec, tint: RGB) { this.triangle(a, b, c, tint); this.triangle(a, c, d, tint); }
    box(x: number, y: number, z: number, w: number, h: number, d: number, tint: RGB, angle = 0) {
        const transform = (a: number, b: number, c: number): Vec => [x + a * Math.cos(angle) + c * Math.sin(angle), y + b, z - a * Math.sin(angle) + c * Math.cos(angle)];
        const a = transform(-w / 2, 0, -d / 2), b = transform(w / 2, 0, -d / 2), c = transform(w / 2, 0, d / 2), e = transform(-w / 2, 0, d / 2), f = transform(-w / 2, h, -d / 2), g = transform(w / 2, h, -d / 2), i = transform(w / 2, h, d / 2), j = transform(-w / 2, h, d / 2);
        this.quad(f, j, i, g, tint);
        this.quad(e, c, i, j, tint);
        this.quad(b, a, f, g, tint);
        this.quad(a, e, j, f, tint);
        this.quad(c, b, g, i, tint);
    }
    cone(x: number, y: number, z: number, r: number, h: number, tint: RGB, segments = 6) { for (let i = 0; i < segments; i++) {
        const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
        this.triangle([x + r * Math.cos(a), y, z + r * Math.sin(a)], [x, y + h, z], [x + r * Math.cos(b), y, z + r * Math.sin(b)], tint);
    } }
    disk(x: number, y: number, z: number, r: number, tint: RGB, segments = 24) { for (let i = 0; i < segments; i++) {
        const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
        this.triangle([x, y, z], [x + r * Math.cos(b), y, z + r * Math.sin(b)], [x + r * Math.cos(a), y, z + r * Math.sin(a)], tint);
    } }
    segment(a: Vec, b: Vec, width: number, tint: RGB) { const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) || 1, nx = -dz / len * width / 2, nz = dx / len * width / 2; this.quad([a[0] - nx, a[1], a[2] - nz], [a[0] + nx, a[1], a[2] + nz], [b[0] + nx, b[1], b[2] + nz], [b[0] - nx, b[1], b[2] - nz], tint); }
}
export class CampusScene {
    private gl: WebGLRenderingContext | null;
    private ctx: CanvasRenderingContext2D | null = null;
    private program!: WebGLProgram;
    private buffer!: WebGLBuffer;
    private routeBuffer!: WebGLBuffer;
    private routeVertices: number[] = [];
    private count = 0;
    private routeCount = 0;
    private matrix: number[] = Array(16).fill(0);
    private locations!: {
        position: number;
        normal: number;
        color: number;
        matrix: WebGLUniformLocation | null;
    };
    private labels = new Map<string, HTMLButtonElement>();
    private points = new Map<string, Vec>();
    private data: Dataset;
    private reference = false;
    private get referenceCampus() { return referenceCampusForData(this.data); }
    private get seoul() { return this.data.campus.id === 'mju-seoul-humanities'; }
    private occlusionRects: SceneOcclusionRect[] = [];
    private labelsVisible = true;
    private eye: Vec = [0, 500, 500];
    private language: Language = 'en';
    private selected: string | null = null;
    private selectedEntrance: string | null = null;
    private heading = -0.40;
    private tilt = 0.82;
    private zoom = 1;
    private target: Vec = [0, 0, 0];
    private frame = 0;
    private running = true;
    private reduced = false;
    private twoD = false;
    private pointers = new Map<number, {
        x: number;
        y: number;
    }>();
    private lastGesture: {
        x: number;
        y: number;
        d: number;
        angle: number;
    } | null = null;
    private resize: ResizeObserver;
    private vertices: number[] = [];
    private clicksMoved = 0;
    private startTime = 0;
    private frames = 0;
    private animationGeneration = 0;
    private disposed = false;
    private locationAssessment: ReturnType<typeof assessModelLocation> | null = null;
    private locationOverlay: SVGSVGElement | null = null;
    private locationExpiry: number | undefined;
    private locationVisible = false;
    // The rendered scenic surface, never device altitude or measured elevation.
    private terrainHeight: (x: number, z: number) => number = () => 0;
    private referenceGroundHeight: (x: number, z: number) => number = () => 0;
    onSelect: (id: string) => void = () => { };
    onHeading: (angle: number) => void = () => { };
    constructor(private canvas: HTMLCanvasElement, private labelLayer: HTMLElement, data: Dataset) {
        this.data = data;
        const gl = canvas.getContext('webgl', { antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
        this.gl = gl;
        if (!gl) {
            this.ctx = canvas.getContext('2d', { alpha: true });
            if (!this.ctx)
                throw new Error('Canvas rendering is unavailable');
        }
        if (gl) {
            const shader = (type: number, source: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
                throw new Error(gl.getShaderInfoLog(s) || 'Shader error'); return s; };
            const vs = shader(gl.VERTEX_SHADER, `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uMatrix;varying vec3 vColor;void main(){float l=0.67+0.33*max(dot(normalize(aNormal),normalize(vec3(-0.6,1.0,0.5))),0.0);vColor=aColor*l;gl_Position=uMatrix*vec4(aPosition,1.0);}`);
            const fs = shader(gl.FRAGMENT_SHADER, `precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}`);
            this.program = gl.createProgram()!;
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
                throw new Error('Scene link failed');
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            this.buffer = gl.createBuffer()!;
            this.routeBuffer = gl.createBuffer()!;
            this.locations = { position: gl.getAttribLocation(this.program, 'aPosition'), normal: gl.getAttribLocation(this.program, 'aNormal'), color: gl.getAttribLocation(this.program, 'aColor'), matrix: gl.getUniformLocation(this.program, 'uMatrix') };
            gl.enable(gl.DEPTH_TEST);
            gl.clearColor(0, 0, 0, 0);
        }
        this.resize = new ResizeObserver(() => this.request());
        this.resize.observe(canvas);
        this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
        this.canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.lastGesture = this.gesture(); this.clicksMoved = 0; });
        this.canvas.addEventListener('pointermove', e => { if (!this.pointers.has(e.pointerId))
            return; this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); const g = this.gesture(), old = this.lastGesture; if (old) {
            const dx = g.x - old.x, dy = g.y - old.y;
            this.clicksMoved += Math.abs(dx) + Math.abs(dy);
            if (this.pointers.size > 1) {
                if (old.d > 0)
                    this.zoom = this.limitZoom(this.zoom * g.d / old.d);
                this.heading += g.angle - old.angle;
            }
            else if (e.shiftKey || e.buttons === 2)
                this.heading += dx * .008;
            else {
                const s = (this.reference ? this.seoul ? 180 : 440 : 300) / Math.max(300, canvas.clientHeight) / this.zoom;
                this.target[0] -= (dx * Math.cos(this.heading) + dy * Math.sin(this.heading)) * s;
                this.target[2] -= (-dx * Math.sin(this.heading) + dy * Math.cos(this.heading)) * s;
                const bounds = this.reference ? this.seoul ? 150 : 420 : 180;
                this.target[0] = Math.max(-bounds, Math.min(bounds, this.target[0]));
                this.target[2] = Math.max(-bounds, Math.min(bounds, this.target[2]));
            }
            this.request();
        } this.lastGesture = g; });
        const up = (e: PointerEvent) => { if (this.pointers.size === 1 && this.clicksMoved < 8)
            this.pick(e.clientX, e.clientY); this.pointers.delete(e.pointerId); this.lastGesture = this.pointers.size ? this.gesture() : null; };
        this.canvas.addEventListener('pointerup', up);
        this.canvas.addEventListener('pointercancel', e => { this.pointers.delete(e.pointerId); this.lastGesture = null; });
        this.canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoom = this.limitZoom(this.zoom * Math.exp(-e.deltaY * .001)); this.request(); }, { passive: false });
        this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.setActive(false); this.canvas.dispatchEvent(new CustomEvent('scenefailed', { bubbles: true })); });
        this.rebuild();
    }
    private gesture() { const p = [...this.pointers.values()], a = p[0] || { x: 0, y: 0 }, b = p[1] || a; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x) }; }
    private limitZoom(value: number) { return Math.max(this.reference ? .45 : .6, Math.min(this.reference ? 4.5 : 2.8, value)); }
    private upload(buffer: WebGLBuffer, data: number[]) { const gl = this.gl; if (!gl)
        return; gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); }
    setData(data: Dataset) { this.setLocation(null); this.data = data; this.selected = null; this.rebuild(); this.setRoute(null); this.reset(); }
    setReferenceCampus(enabled: boolean) { this.setLocation(null); this.reference = enabled; this.selected = null; this.rebuild(); this.setRoute(null); this.reset(); }
    setOcclusionRects(rects: SceneOcclusionRect[]) { this.occlusionRects = rects.filter(r => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0); this.request(); }
    setLabelsVisible(visible: boolean) { this.labelsVisible = visible; this.request(); }
    setLanguage(l: Language) { this.language = l; this.updateLabels(); this.request(); }
    setReducedMotion(value: boolean) { this.reduced = value; }
    setActive(active: boolean) { this.running = active; if (!active) this.setLocation(null); if (!active && this.frame) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
    } if (active)
        this.request(); }
    set2D(v: boolean) { this.twoD = v; this.request(); }
    zoomBy(factor: number) { this.zoom = this.limitZoom(this.zoom * factor); this.request(); }
    rotate() { this.heading += Math.PI / 6; this.request(); }
    north() { this.heading = 0; this.request(); }
    setLocation(fix: GeographicFix | null): ReturnType<typeof assessModelLocation> {
        window.clearTimeout(this.locationExpiry); this.locationExpiry = undefined;
        this.locationAssessment = null; this.locationVisible = false;
        this.locationOverlay?.remove(); this.locationOverlay = null;
        if (!fix) { this.request(); return { status: 'invalid' }; }
        const result = this.reference && this.running && !this.disposed
            ? assessModelLocation(this.seoul ? 'seoul' : 'yongin', fix)
            : { status: 'unavailable' as const };
        this.locationAssessment = result.status === 'ok' && result.point
            ? { ...result, point: { ...result.point } } : result;
        if (result.status === 'ok') {
            const accepted = this.locationAssessment;
            this.locationExpiry = window.setTimeout(() => {
                if (this.locationAssessment !== accepted) return;
                this.locationAssessment = { status: 'stale' };
                this.locationVisible = false;
                this.locationOverlay?.remove(); this.locationOverlay = null;
                this.request();
            }, Math.max(0, 60001 - (Date.now() - fix.timestamp)));
        }
        this.request();
        return result;
    }
    recenterLocation(): boolean {
        const location = this.locationAssessment;
        if (!this.running || this.disposed || location?.status !== 'ok' || !location.point) return false;
        const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
        if (width <= 0 || height <= 0) return false;
        const area = this.locationViewport(), radius = Math.max(location.radiusWorld ?? 0, this.seoul ? 14 : 35);
        const baseSpan = this.seoul ? 95 : 224, baseDistance = this.seoul ? 250 : 590;
        const available = Math.max(40, Math.min(area.width, area.height) - 28);
        const fitZoom = (this.twoD ? baseSpan : baseDistance * Math.tan(.36)) * available / (height * radius * 1.4);
        this.zoom = this.limitZoom(Math.min(1.75, fitZoom));
        const unitsPerPixel = this.twoD ? 2 * baseSpan / this.zoom / height : 2 * baseDistance / this.zoom * Math.tan(.36) / height;
        const tilt = this.twoD ? 1.56 : this.tilt;
        const right: Vec = [Math.cos(this.heading), 0, -Math.sin(this.heading)];
        const up: Vec = [-Math.sin(this.heading) * Math.sin(tilt), Math.cos(tilt), -Math.cos(this.heading) * Math.sin(tilt)];
        const dx = (area.x + area.width / 2 - width / 2) * unitsPerPixel;
        const dy = (area.y + area.height / 2 - height / 2) * unitsPerPixel;
        const point = this.locationGroundPoint(location.point.x, location.point.z);
        this.animateTarget([point[0] - right[0] * dx + up[0] * dy, point[1] + up[1] * dy, point[2] - right[2] * dx + up[2] * dy]);
        return true;
    }
    private locationViewport(): SceneOcclusionRect {
        const width = this.canvas.clientWidth, height = this.canvas.clientHeight, margin = 12;
        const obstacles = this.occlusionRects.map(r => ({ x: Math.max(margin,r.x-6), y: Math.max(margin,r.y-6), right: Math.min(width-margin,r.x+r.width+6), bottom: Math.min(height-margin,r.y+r.height+6) })).filter(r => r.right > r.x && r.bottom > r.y);
        const xs = [...new Set([margin,width-margin,...obstacles.flatMap(r=>[r.x,r.right])])].sort((a,b)=>a-b);
        const ys = [...new Set([margin,height-margin,...obstacles.flatMap(r=>[r.y,r.bottom])])].sort((a,b)=>a-b);
        let best: SceneOcclusionRect = { x: margin, y: margin, width: Math.max(1,width-2*margin), height: Math.max(1,height-2*margin) }, score = 0;
        for (let a=0;a<xs.length-1;a++) for (let b=a+1;b<xs.length;b++) for (let c=0;c<ys.length-1;c++) for (let d=c+1;d<ys.length;d++) {
            const x=xs[a]!,y=ys[c]!,w=xs[b]!-x,h=ys[d]!-y;
            if (w<60||h<60||obstacles.some(r=>r.x<x+w&&r.right>x&&r.y<y+h&&r.bottom>y)) continue;
            // Prefer a usable circle over a very wide, shallow empty strip.
            const candidate=Math.min(w,h)**2+Math.min(w*h,Math.min(w,h)**2*2)*.05;
            if(candidate>score){score=candidate;best={x,y,width:w,height:h};}
        }
        return best;
    }
    private locationGroundPoint(x: number, z: number): Vec { return [x, this.terrainHeight(x, z) + .35, z]; }
    private projectLocationPoint(point: Vec) {
        const m = this.matrix, [x, y, z] = point;
        const w = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
        const depth = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
        return w > 0 && depth > -w && depth < w ? this.project(point) : null;
    }
    private drawLocation(): SceneOcclusionRect | null {
        const location = this.locationAssessment;
        this.locationVisible = false;
        if (!this.running || location?.status !== 'ok' || !location.point || !Number.isFinite(location.radiusWorld)) {
            this.locationOverlay?.remove(); this.locationOverlay = null; return null;
        }
        const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
        const { x, z } = location.point;
        const anchor = this.projectLocationPoint(this.locationGroundPoint(x, z));
        const svg = this.locationOverlay ?? document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        if (!this.locationOverlay) {
            this.locationOverlay = svg;
            svg.setAttribute('data-scene-location', 'true');
            svg.setAttribute('role', 'img');
            svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;';
            this.labelLayer.append(svg);
        }
        svg.setAttribute('viewBox', `0 0 ${Math.max(1, width)} ${Math.max(1, height)}`);
        const label = this.language === 'ko' ? '모델 지면에 투영한 대략적인 내 위치. 층이나 고도가 아닙니다.'
            : this.language === 'zh' ? '投影到模型地面的近似位置，不表示楼层或海拔。'
                : 'Approximate device location projected onto model ground, not a floor or elevation.';
        svg.setAttribute('aria-label', label);
        svg.replaceChildren();
        const node = (name: string, attributes: Record<string, string | number>) => {
            const element = document.createElementNS('http://www.w3.org/2000/svg', name);
            for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
            return element;
        };
        const title = node('title', {}); title.textContent = label; svg.append(title);
        // Sample a circle in calibrated world units on the same terrain and pass
        // every sample through the exact camera matrix used by WebGL/Canvas/2D.
        // The dashed overlay is uncertainty, not a surveyed boundary or a route.
        let path = '', segmentOpen = false, complete = true;
        for (let i = 0; i <= 64; i++) {
            const angle = (i % 64) / 64 * Math.PI * 2, radius = location.radiusWorld!;
            const point = this.projectLocationPoint(this.locationGroundPoint(x + Math.cos(angle) * radius, z + Math.sin(angle) * radius));
            if (!point) { segmentOpen = false; complete = false; continue; }
            path += `${segmentOpen ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)} `; segmentOpen = true;
        }
        if (path) svg.append(node('path', { d: path + (complete ? 'Z' : ''), fill: complete ? '#2475df' : 'none', 'fill-opacity': .11, stroke: '#185fb8', 'stroke-width': 1.6, 'stroke-dasharray': '5 4', 'data-location-accuracy': 'true' }));
        // The small tether explicitly connects the legible overlay badge to the
        // ground projection, even where a building obscures that surface in 3D.
        // It never asserts that the device is on a roof or at a modeled altitude.
        if (!anchor || anchor.x < 0 || anchor.x > width || anchor.y < 0 || anchor.y > height) return null;
        // Keep the badge readable at the canvas edges without moving the exact
        // ground anchor or uncertainty area. The tether shows this screen offset.
        const dotX = Math.max(10, Math.min(width - 10, anchor.x));
        const dotY = Math.max(10, Math.min(height - 10, anchor.y >= 28 ? anchor.y - 18 : anchor.y + 18));
        svg.append(node('line', { x1: anchor.x, y1: anchor.y, x2: dotX, y2: dotY, stroke: '#ffffff', 'stroke-width': 4, 'data-location-tether': 'true' }));
        svg.append(node('line', { x1: anchor.x, y1: anchor.y, x2: dotX, y2: dotY, stroke: '#185fb8', 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }));
        svg.append(node('circle', { cx: anchor.x, cy: anchor.y, r: 3.2, fill: '#185fb8', stroke: '#ffffff', 'stroke-width': 1.6, 'data-location-anchor': 'true' }));
        svg.append(node('circle', { cx: dotX, cy: dotY, r: 9, fill: '#ffffff', stroke: '#185fb8', 'stroke-width': 1.5, 'data-location-dot': 'true' }));
        svg.append(node('circle', { cx: dotX, cy: dotY, r: 5.7, fill: '#2475df' }));
        this.locationVisible = dotX >= 9 && dotX <= width - 9 && dotY >= 9 && dotY <= height - 9
            && !this.occlusionRects.some(r => dotX + 9 > r.x && dotX - 9 < r.x + r.width && dotY + 9 > r.y && dotY - 9 < r.y + r.height);
        return { x: Math.min(anchor.x,dotX) - 12, y: Math.min(anchor.y,dotY) - 12, width: Math.abs(dotX-anchor.x) + 24, height: Math.abs(dotY-anchor.y) + 24 };
    }
    reset() { this.animationGeneration++; this.heading = this.reference ? this.seoul ? .23 : 1.4 : -.40; this.zoom = 1; this.target = this.reference ? this.seoul ? [-8,0,0] : [5, 0, 10] : [0, 0, 0]; this.request(); }
    select(id: string | null, entranceId?: string) { this.selected = id; this.selectedEntrance = entranceId ?? null; this.updateLabels(); this.setRoute(this.currentRoute); if (id) {
        const p = this.points.get(id);
        if (p) {
            const destination: Vec = this.reference ? [p[0], this.seoul?0:this.terrainHeight(p[0],p[2]), p[2]] : [p[0] * .25, 0, p[2] * .25];
            if (this.reference) this.zoom = Math.max(this.zoom, 1.35);
            this.animateTarget(destination);
        }
    } this.request(); }
    private animateTarget(to: Vec) { if (this.reduced) {
        this.animationGeneration++;
        this.target = to;
        this.request();
        return;
    } const generation=++this.animationGeneration,from = [...this.target] as Vec, start = performance.now(); const step = (t: number) => { if (!this.running||generation!==this.animationGeneration)
        return; const v = Math.min(1, (t - start) / 230), k = 1 - (1 - v) ** 3; this.target = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k]; this.request(); if (v < 1)
        requestAnimationFrame(step); }; requestAnimationFrame(step); }
    private currentRoute: Route | null = null;
    setRoute(route: Route | null) {
        // Illustration features never create route overlays or entrance markers.
        if (this.reference) route = null;
        this.currentRoute = route;
        const g = new Geometry();
        if (route) {
            for (let i = 1; i < route.points.length; i++) {
                const a = localPoint(route.points[i - 1]!, this.data), b = localPoint(route.points[i]!, this.data);
                g.segment([a.x, a.y + .60, a.z], [b.x, b.y + .60, b.z], 3.4, color('#167469'));
            }
            const start = localPoint(route.points[0]!, this.data);
            g.disk(start.x, start.y + .75, start.z, 4, color('#ffffff'));
            g.disk(start.x, start.y + .85, start.z, 2.5, color('#167469'));
        }
        const entrance = !this.reference && this.data.entrances.find(e => e.placeId === this.selected && (!this.selectedEntrance || e.id === this.selectedEntrance) && usable(e.evidence, this.data.mode));
        if (entrance) {
            const p = localPoint(entrance.point, this.data);
            g.disk(p.x, p.y + .65, p.z, 4.9, color('#ffffff'));
            g.disk(p.x, p.y + .75, p.z, 3.2, color('#e89150'));
            g.cone(p.x, p.y + 1, p.z, 2.5, 7, color('#ed9a5a'), 4);
        }
        this.routeVertices = g.data;
        this.upload(this.routeBuffer, g.data);
        this.routeCount = g.data.length / 9;
        this.request();
    }
    private model(g: Geometry, b: Building) {
        const p = localPoint(b.point, this.data), w = b.widthM, d = b.depthM, h = b.heightM, x = p.x, z = p.z, y = p.y, angle = b.bearingDegrees * Math.PI / 180;
        // Supplied dimensions, bearing and elevation stay in the shared geographic frame.
        // Architectural details are only decorative inside each verified envelope.
        if (b.form === 'gate') {
            g.box(x - w * .38, y, z, 5, h, d, color(b.color), angle);
            g.box(x + w * .38, y, z, 5, h, d, color(b.color), angle);
            g.box(x, y + h - 3, z, w, 3, d, color(b.color), angle);
            return;
        }
        g.box(x, y, z, w, h, d, color(b.color), angle);
        g.box(x, y + h, z, w + 1, .8, d + 1, color('#f4ede1'), angle);
        g.box(x, y + h + .8, z, w - 4, .7, d - 4, color('#aebfbb'), angle);
        // Rowed window strips are grouped per floor; no large textures or imported assets.
        const floors = Math.max(1, Math.floor(h / 6));
        for (let i = 0; i < floors; i++) {
            const yy = y + 3 + i * 5.8;
            if (yy + 2 > y + h)
                continue;
            const dz = d / 2 + .06;
            g.box(x + dz * Math.sin(angle), yy, z + dz * Math.cos(angle), w - 5, 2.1, .13, color('#667f80'), angle);
            const side = w / 2 + .06;
            g.box(x + side * Math.cos(angle), yy, z - side * Math.sin(angle), .13, 2.1, d - 5, color('#668083'), angle);
        }
        if (b.form === 'library') {
            for (let i = -2; i <= 2; i++)
                g.box(x + i * 8, y, z + d / 2 + 2, 1.3, h * .52, 1.3, color('#f3eada'));
            g.box(x, y + h * .52, z + d / 2 + 2, w + 3, 1.8, 6, color('#ede7d9'));
        }
        if (b.form === 'tower')
            g.box(x, y + h + 1, z, 13, 3, 8, color('#dddfd3'), angle);
        if (b.form === 'pavilion') {
            g.box(x, y + h * .6, z + d / 2 + 3, w + 3, 1, 7, color('#506e65'), angle);
            g.box(x, y + h + .9, z, 11, 1, 8, color('#f5ece1'), angle);
        }
    }
    private referenceModel(g: Geometry, f: ReferenceFeature): number {
        if(f.planMesh) {
            const exact=new Geometry(),height=this.planReferenceModel(exact,f);
            g.data.push(...exact.data);
            return height;
        }
        const local=new Geometry();
        this.referenceModelLocal(local,{...f,center:[0,0],angle:0,size:[f.size[0],f.size[1],f.id==='mju-hydraulics'?Math.min(f.size[2],3.5):f.size[2]]});
        const fitted=fitReferenceMeshVertices(local.data,f);
        g.data.push(...fitted);
        let height=0;
        for(let i=1;i<fitted.length;i+=9) height=Math.max(height,fitted[i]!);
        return height;
    }
    private planReferenceModel(g: Geometry,f: ReferenceFeature): number {
        const mesh=f.planMesh!,base=.25,height=f.size[2]*REFERENCE_RENDER_HEIGHT_SCALE,top=base+height;
        const gym=f.code==='Y7',lowerDark=f.code==='Y_'||f.code==='Y5';
        const roof=color(gym?'#bca9ac':f.code==='Y12'?'#c4c6bb':'#d4d8ce');
        // Constrained triangles retain the plan's concave outlines/courtyards. There
        // are no enlarged pads, eaves or shadows around these adjoining complexes.
        for(const triangle of mesh.triangles) {
            const [a,b,c]=triangle;
            if(!a||!b||!c) continue;
            const signed=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
            if(Math.abs(signed)<1e-12) continue;
            const p:Vec=[a[0],top,a[1]],q:Vec=[b[0],top,b[1]],r:Vec=[c[0],top,c[1]];
            if(signed>0) g.triangle(p,r,q,roof); else g.triangle(p,q,r,roof);
        }
        for(let ringIndex=0;ringIndex<mesh.rings.length;ringIndex++) {
            let ring=mesh.rings[ringIndex]!;
            if(ring.length>1&&Math.hypot(ring[0]![0]-ring[ring.length-1]![0],ring[0]![1]-ring[ring.length-1]![1])<1e-8) ring=ring.slice(0,-1);
            const area=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length]!;return sum+p[0]*q[1]-q[0]*p[1];},0);
            if((ringIndex===0&&area<0)||(ringIndex>0&&area>0)) ring=[...ring].reverse();
            for(let edge=0;edge<ring.length;edge++) {
                const a=ring[edge]!,b=ring[(edge+1)%ring.length]!,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
                if(length<1e-7) continue;
                const midpoint=[(a[0]+b[0])/2,(a[1]+b[1])/2];
                const localX=(midpoint[0]!-f.center[0])*Math.cos(f.angle)-(midpoint[1]!-f.center[1])*Math.sin(f.angle);
                const facade=f.code==='Y12'&&localX<0?'#d6b89f':'#e3e5da';
                const panel=(left:number,right:number,bottom:number,upper:number,tint:string)=>{
                    const point=(t:number,y:number):Vec=>[a[0]+(b[0]-a[0])*t,y,a[1]+(b[1]-a[1])*t];
                    g.quad(point(right,bottom),point(left,bottom),point(left,upper),point(right,upper),color(tint));
                };
                // Very short vector-plan edges need only a plain wall; this keeps
                // microscopic notches from multiplying the mobile mesh budget.
                if(length<1.6) {panel(0,1,base,top,facade);continue;}
                const floors=gym?3:Math.max(1,Math.floor(f.size[2]/4.6)),step=height/floors;
                const columns=Math.max(1,Math.min(24,Math.round(length/2.8)));
                for(let floor=0;floor<floors;floor++) {
                    const bottom=base+floor*step,windowBottom=bottom+step*.29,windowTop=bottom+step*.75,upper=bottom+step;
                    const wall=gym?'#e8e8e2':lowerDark&&floor===0?'#9ca69d':facade;
                    panel(0,1,bottom,windowBottom,wall);panel(0,1,windowTop,upper,wall);
                    if(gym) { panel(0,1,windowBottom,windowTop,'#91afa7'); continue; }
                    for(let column=0;column<columns;column++) {
                        const left=column/columns,right=(column+1)/columns,paneLeft=left+.14/columns,paneRight=right-.14/columns;
                        panel(left,paneLeft,windowBottom,windowTop,wall);
                        panel(paneLeft,paneRight,windowBottom,windowTop,f.code==='Y5'?'#75999c':'#83a29b');
                        panel(paneRight,right,windowBottom,windowTop,wall);
                    }
                }
            }
        }
        return top;
    }
    private referenceModelLocal(g: Geometry, f: ReferenceFeature) {
        if (f.code?.startsWith('S') || f.id==='mju-seoul-field') { this.seoulModel(g,f); return; }
        const [x, z] = f.center, [w, d, h] = f.size, angle = f.angle;
        const at = (xx: number, zz: number): [number, number] => [x + xx * Math.cos(angle) + zz * Math.sin(angle), z - xx * Math.sin(angle) + zz * Math.cos(angle)];
        const box = (xx: number, zz: number, width: number, depth: number, bottom: number, height: number, tint: string) => {
            const p = at(xx, zz); g.box(p[0], bottom, p[1], width, height, depth, color(tint), angle);
        };
        const line = (a: [number, number], b: [number, number], tint = '#eff3dc', width = .6, y = .7) => {
            const p = at(...a), q = at(...b); g.segment([p[0], y, p[1]], [q[0], y, q[1]], width, color(tint));
        };
        if (f.kind === 'gate') {
            // Yongin entrance photos show a round sign pylon and a low blue
            // vehicle-control canopy, not a masonry portal across the road.
            // These qualitative forms keep the existing approximate anchor and
            // envelope; their proportions, orientation and heights are unsurveyed.
            const pillar = at(w * .40, 0), radius = Math.min(d * .13, w * .04);
            g.prism(pillar[0], .1, pillar[1], radius, radius, h, color('#c3cbd0'), 16);
            g.prism(pillar[0], h * .91, pillar[1], radius * 1.025, radius * 1.025, h * .09, color('#e3e8e9'), 16);
            for (const zz of [-d * .33, d * .33]) box(-w * .07, zz, .45, .45, .1, h * .49, '#819396');
            const canopyPoint = (t: number, zz: number): Vec => {
                const p = at(-w * .07 + t * w * .30, zz);
                return [p[0], h * (.49 + .16 * (1 - Math.cos(Math.abs(t) * Math.PI / 2))), p[1]];
            };
            for (let i = 0; i < 10; i++) {
                const left = -1 + i / 5, right = -1 + (i + 1) / 5;
                g.quad(canopyPoint(left, -d * .44), canopyPoint(left, d * .44), canopyPoint(right, d * .44), canopyPoint(right, -d * .44), color(i % 2 ? '#78b8cc' : '#6bafc4'));
                g.segment(canopyPoint(left, -d * .45), canopyPoint(left, d * .45), .16, color('#768d97'));
            }
            for (const zz of [-d * .45, d * .45]) for (let i = 0; i < 10; i++)
                g.segment(canopyPoint(-1 + i / 5, zz), canopyPoint(-1 + (i + 1) / 5, zz), .18, color('#768d97'));
            return;
        }
        if (f.kind === 'field') {
            // The source envelope covers the whole facility, not only its pitch.
            // A has a rounded running track; C is the rectangular small field.
            const track=(width:number,depth:number,y:number,tint:string)=>{
                const radius=depth/2,straight=Math.max(0,width/2-radius),points:[number,number][]=[];
                for(let side=0;side<2;side++) for(let i=0;i<=16;i++) {
                    const a=-Math.PI/2+side*Math.PI+i*Math.PI/16;
                    points.push(at((side===0?straight:-straight)+Math.cos(a)*radius,Math.sin(a)*radius));
                }
                g.polygon(points,y,color(tint));
            };
            const stadium=f.code==='A',pw=stadium?w*.74:w*.92,pd=stadium?d*.61:d*.90;
            if(stadium) {
                track(w,d,.18,'#bd898e');track(w*.974,d*.961,.22,'#ecded9');
                track(w*.956,d*.935,.26,'#bd898e');track(w*.86,d*.79,.30,'#76a38f');
            } else box(0,0,w,d,.18,.1,'#b9c7a5');
            box(0, 0, pw, pd, .34, .10, '#76a38f');
            for (const xx of [-pw / 2 + .6, pw / 2 - .6]) line([xx, -pd / 2 + .6], [xx, pd / 2 - .6]);
            for (const zz of [-pd / 2 + .6, pd / 2 - .6]) line([-pw / 2 + .6, zz], [pw / 2 - .6, zz]);
            line([0, -pd / 2 + .6], [0, pd / 2 - .6]);
            g.disk(x, .75, z, pd * .17, color('#edf0d9')); g.disk(x, .76, z, Math.max(.2,pd * .17 - .5), color('#76a38f'));
            for (const side of [-1, 1]) {
                const edge = side * (pw / 2 - .6), inside = edge - side * pw * .13;
                line([edge, -pd * .24], [inside, -pd * .24]); line([inside, -pd * .24], [inside, pd * .24]); line([inside, pd * .24], [edge, pd * .24]);
            }
            return;
        }
        if (['tennis', 'basketball', 'futsal'].includes(f.kind)) {
            box(0, 0, w, d, .15, .1, '#b9c7a5'); box(0, 0, w-.6, d-.6, .3, .1, f.kind === 'basketball' ? '#c4a484' : '#a5b887');
            for (const zz of [-d / 2 + 1, d / 2 - 1]) line([-w / 2 + 1, zz], [w / 2 - 1, zz]);
            for (const xx of [-w / 2 + 1, 0, w / 2 - 1]) line([xx, -d / 2 + 1], [xx, d / 2 - 1]);
            line([-w / 2 + 1, 0], [w / 2 - 1, 0]);
            if (f.kind === 'tennis') for (const xx of [-w * .3, w * .3]) line([xx, -d / 2 + 1], [xx, d / 2 - 1]);
            return;
        }
        if (f.kind === 'plaza') {
            g.disk(x, .2, z, w * .7, color('#dfe5cd')); g.disk(x, .35, z, w * .5, color('#c2d4b0'));
            box(0, 0, 4, 4, .4, 4, '#d6d2bd');
            // Abstract monument block, not a claim to reproduce the sculpture.
            box(0, 0, 5, 2, 4.4, 3, '#f0eee1'); return;
        }
        if (f.kind === 'stage') {
            for (let i = 4; i >= 0; i--) g.ellipse(x, .35 + (4 - i) * .5, z, w * (.30 + i * .08), d * (.30 + i * .08), color(i % 2 ? '#d3d6ba' : '#e4e1c9'), angle);
            box(0, -d * .35, w * .45, 8, 1, 2, '#e2d6bb'); return;
        }
        if (f.kind === 'bus') {
            box(0, 0, w, d, .18, .1, '#bac1b9');
            for (let i = -2; i <= 2; i++) line([i * w / 5, -d / 2], [i * w / 5, d / 2], '#e9ecdd', .5);
            box(0, -d * .6, w * .8, 3, 5, .6, '#849c85');
            for (const xx of [-w * .35, w * .35]) box(xx, -d * .6, .6, .6, .3, 5, '#e5e3d3'); return;
        }
        // Everything below is deliberately a lightweight architectural illustration.
        // Observed broad materials/forms: supplied aerial; official campus overview
        // /bbs/mjukr/147/5556/download.do; central-campus photo in
        // /bbs/mjukr/147/175263/download.do. Repeating panels and roof detail below
        // are illustrative, not measured pane counts, floor plans or heights.
        const tint = f.code === 'Y19' ? '#b68d76' : f.code === 'Y12' ? '#d8c4ae' : f.category === 'residence' ? '#e3dfcf' : '#e7e8df';
        const roof = f.code === 'Y3' ? '#a9c3b7' : f.form === 'low' ? '#adbdb3' : '#d5d8ce';
        // No external pads or displaced shadow geometry: these would shrink the
        // actual building when fitting its source-derived footprint envelope.
        if (f.form === 'octagon') {
            g.prism(x, .4, z, w * .54, d * .54, h - 2, color('#dfe1d7'));
            for (const yy of [3.4,7,10.5]) { g.prism(x, yy, z, w * .554, d * .554, 1.25, color('#a0b7b1')); g.prism(x, yy + 1.25, z, w * .572, d * .572, .9, color('#f4f2e9')); }
            g.prism(x, h - 2.4, z, w * .58, d * .58, 1.2, color('#f1efe3'));
            g.prism(x, h - 1.2, z, w * .55, d * .55, 1.1, color('#a18d77'));
            g.prism(x, h - .1, z, w * .49, d * .49, .25, color('#ad9a84'));
            g.prism(x, h + .2, z, 3, 3, 1, color('#dce1d6'), 12);
            g.disk(x, h + 1.22, z, 2.7, color('#9cafa8'), 12); return;
        }
        if (f.form === 'chapel') {
            // Official 2024 exterior photo: rounded upper hall, stepped rectangular
            // plinth, tall arched panels and a small teal pyramid roof light.
            box(0,0,w,d,.4,h*.30,'#dadcd3'); box(0,0,w*.94,d*.94,h*.30,h*.15,'#e5e5da');
            g.prism(x,h*.44,z,w*.47,d*.46,h*.53,color('#e2e3da'),24);
            for(let i=1;i<6;i++) g.prism(x,h*.44+i*h*.085,z,w*.474,d*.464,.17,color('#cfd3cb'),24);
            g.prism(x,h*.97,z,w*.49,d*.48,.55,color('#edeee4'),24);
            g.ellipse(x,h+.6,z,w*.45,d*.43,color('#939e96'),0,24);
            g.cone(x,h+.7,z,2.2,2.1,color('#81aca8'),4);
            for(let i=-2;i<=2;i++) {
                const xx=i*w*.145, pz=d*.463*Math.sqrt(1-(xx/(w*.475))**2), bottom=h*.51, height=h*.26, radius=w*.035;
                g.box(x+xx,bottom,z+pz,radius*2,height,.13,color('#8faaa0'));
                for(let j=0;j<8;j++) { const a=j*Math.PI/8,b=(j+1)*Math.PI/8; g.triangle([x+xx,bottom+height,z+pz+.08],[x+xx+radius*Math.cos(a),bottom+height+radius*Math.sin(a),z+pz+.08],[x+xx+radius*Math.cos(b),bottom+height+radius*Math.sin(b),z+pz+.08],color('#8faaa0')); }
                box(xx,d*.503,w*.06,.1,h*.10,h*.10,'#76988d');
            }
            return;
        }
        if (f.form === 'greenhouse') {
            box(0, 0, w, d, .4, h * .7, '#acd0c2'); box(0, 0, w, d * .9, h * .7, h * .3, '#d4e8d4');
            for (let i = -3; i <= 3; i++) box(i * w / 7, 0, .5, d + .4, .4, h, '#e9ead6'); return;
        }
        const surface = (vertices: Vec[], tint: string) => { const p = vertices.map(v => { const pt = at(v[0],v[2]); return [pt[0],v[1],pt[1]] as Vec; }); g.quad(p[0]!,p[1]!,p[2]!,p[3]!,color(tint)); };
        const pitchedRoof = (xx: number, zz: number, pw: number, pd: number, base: number, rise: number, tint: string) => {
            const pt = (a: number, b: number, y: number): Vec => { const p = at(a,b); return [p[0],y,p[1]]; };
            const a=pt(xx-pw/2,zz-pd/2,base), b=pt(xx+pw/2,zz-pd/2,base), c=pt(xx+pw/2,zz+pd/2,base), e=pt(xx-pw/2,zz+pd/2,base), l=pt(xx-pw/2,zz,base+rise), r=pt(xx+pw/2,zz,base+rise);
            g.quad(a,l,r,b,color(tint)); g.quad(e,c,r,l,color(tint)); g.triangle(a,e,l,color('#d8d7c8')); g.triangle(c,b,r,color('#d8d7c8'));
        };
        const part = (xx: number, zz: number, pw: number, pd: number, ph: number, bottom = .4, body = tint) => {
            box(xx, zz, pw, pd, bottom, ph, body); box(xx, zz, pw + .9, pd + .9, bottom + ph, .65, '#f0eee3'); box(xx, zz, pw - 1.4, pd - 1.4, bottom + ph + .66, .12, roof);
            if (['Y5','Y_','Y19','Y33','Y34'].includes(f.code || '')) box(xx,zz,pw+.025,pd+.025,bottom,ph*.27,f.code === 'Y19' ? '#d8d5c4' : f.code === 'Y33' ? '#d5b79d' : '#9ea49e');
            if (f.code === 'Y23') box(xx,zz,pw+.03,pd+.03,bottom+.6,ph-1.1,'#789b98');
            for (const edge of [-1,1]) { box(xx, zz + edge * (pd / 2 - .3), pw, .50, bottom + ph + .65, .6, '#eeede4'); box(xx + edge * (pw / 2 - .3), zz, .50, pd, bottom + ph + .65, .6, '#eeede4'); }
            const floors = Math.max(1, Math.floor(ph / 4.6)), step = ph / floors;
            for (let floor = 0; floor < floors; floor++) {
                const yy = bottom + floor * step + step * .30, top = yy + step * .49;
                const columns = f.code === 'Y2' ? Math.max(1,Math.round(pw/7)) : Math.max(1, Math.round(pw / 3.1)), pane = (pw - 2.4) / columns;
                for (let col = 0; col < columns; col++) {
                    const left = xx - pw / 2 + 1.2 + col * pane, right = left + pane * (f.code === 'Y2' ? .96 : .73);
                    const glass = f.code === 'Y2' ? '#667f84' : f.code === 'Y23' ? ['#769d96','#8caeaa','#6c918c'][col % 3]! : ['#789591','#90aaa6','#809e9b'][(col + floor) % 3]!;
                    surface([[left,yy,zz + pd/2 + .035],[right,yy,zz + pd/2 + .035],[right,top,zz + pd/2 + .035],[left,top,zz + pd/2 + .035]],glass);
                    surface([[right,yy,zz - pd/2 - .035],[left,yy,zz - pd/2 - .035],[left,top,zz - pd/2 - .035],[right,top,zz - pd/2 - .035]],glass);
                }
                const sideColumns = Math.max(1, Math.round(pd / 3.1)), sidePane = (pd - 2) / sideColumns;
                for (let col = 0; col < sideColumns; col++) {
                    const front = zz - pd/2 + 1 + col * sidePane, back = front + sidePane * .72;
                    surface([[xx+pw/2+.035,yy,back],[xx+pw/2+.035,yy,front],[xx+pw/2+.035,top,front],[xx+pw/2+.035,top,back]],'#789791');
                    surface([[xx-pw/2-.035,yy,front],[xx-pw/2-.035,yy,back],[xx-pw/2-.035,top,back],[xx-pw/2-.035,top,front]],'#819d98');
                }
                if (f.code === 'Y9') for (const side of [-1,1]) box(xx,zz+side*(pd/2+.07),pw,.10,yy-step*.20,step*.18,'#81a49d');
            }
        };
        if (f.code === 'Y3') {
            // Square roof, repeated dark window grid and ground-floor arcade are
            // visible in the official oblique photograph; counts stay schematic.
            part(0, 0, w, d, h - 3.1, 3.5);
            for (let i = -3; i <= 3; i++) for (const side of [-1,1]) box(i * w / 8, side * (d / 2 - 1.1), .85, .85, .4, 3.1, '#dcded2');
            box(0, 0, w * .42, d * .40, h + 1.2, .7, '#b5c7be');
        } else if (f.code === 'Y2') {
            // Actual university/architect photographs show a flat-roof elevated
            // white bar, dark glazed end, open pilotis and lower stepped volume.
            // The earlier overview render's blue roof accent is not retained.
            part(0,-d*.09,w,d*.78,h*.52,h*.48);
            part(w*.035,d*.20,w*.82,d*.61,h*.25);
            for (let i=-2;i<=2;i++) for (const side of [-1,1]) box(i*w*.16,side*d*.23,1.0,1.1,h*.25,h*.24,'#d9ddd4');
            surface([[w/2+.07,h*.53,d*.26],[w/2+.07,h*.53,-d*.40],[w/2+.07,h*.93,-d*.40],[w/2+.07,h*.93,d*.26]],'#557375');
            for (let i=0;i<5;i++) box(w/2+.10,-d*.36+i*d*.14,.09,.16,h*.53,h*.40,'#a0b0a9');
            for (let i=0;i<6;i++) box(-w*.31+i*w*.12,-d*.07,w*.085,d*.37,h+1.1,.35,'#657e7b');
        } else if (f.code === 'Y30') {
            part(0,0,w,d,h*.84);
            box(0,0,w+.03,d+.03,.4,h*.16,'#ba927a');
            pitchedRoof(0,0,w+1.1,d+1.1,h*.84+1.1,h*.13,'#737d77');
            for (let i=-2;i<=2;i++) { box(i*w*.17,d*.23,w*.085,d*.24,h*.86,h*.13,'#ecebdd'); box(i*w*.17,d*.23,w*.065,d*.26,h*.89,h*.07,'#849b96'); }
            box(-w*.41,-d*.10,w*.16,d*.74,.4,h,'#acb4ad');
        } else if (f.code === 'Y31') {
            // A shallow faceted arc interprets the observed curved residence front.
            for (let i=-1;i<=1;i++) { const xx=i*w*.31, zz=Math.abs(i)*-d*.075; part(xx,zz,w*.34,d*.89,h*.89); for(let floor=1;floor<=5;floor++) box(xx,zz+d*.447,w*.34,.16,floor*h*.135,h*.055,'#769b91'); }
            for (const side of [-1,1]) { box(side*w*.46,-d*.10,w*.11,d*.78,.4,h,'#809f97'); for(let floor=1;floor<=6;floor++) box(side*w*.46,-d*.10,w*.115,d*.79,floor*h*.143,.35,'#d8dace'); }
        } else if (f.code === 'Y32') {
            part(0,-d*.05,w,d*.86,h*.87); pitchedRoof(0,-d*.05,w+.6,d*.90,h*.87+1,h*.10,'#79827a');
            box(0,d*.025,w*.16,d*.94,.4,h,'#d3b199'); box(0,d*.495,w*.07,.10,1.4,h*.90,'#83a19a');
        } else if (f.code === 'Y33' || f.code === 'Y34') {
            part(0,-d*.04,w,d*.87,h);
            box(0,d*.405,w*.17,.10,1.2,h*.93,'#85918b');
            for(let floor=1;floor<=6;floor++) box(0,d*.46,w*.21,d*.07,floor*h*.14,.7,'#e4e3d5');
        } else if (f.code === 'Y35') {
            part(0,0,w,d,h*.72); part(w*.36,0,w*.23,d*.72,h);
            for(let i=-2;i<=2;i++) for(const side of [-1,1]) box(i*w*.15,side*d*.31,.45,.45,h*.72,2.4,'#e7e8dd');
            for(const side of [-1,1]) box(-w*.04,side*d*.31,w*.73,.6,h*.72+2.4,.45,'#e7e8dd');
        } else if (f.code === 'Y24') {
            box(0,0,w,d,.4,h*.87,'#dedcc8'); pitchedRoof(0,0,w+1,d+1,h*.87,h*.09,'#ae8980');
            box(0,d/2+.05,w*.84,.13,h*.66,h*.13,'#768d89');
            box(-w*.17,d/2+.08,w*.24,.15,.4,h*.46,'#aeb8b2');
            for(let i=1;i<=5;i++) box(-w*.17,d/2+.17,w*.24,.08,i*h*.075,.13,'#c4ccc4');
            box(w*.37,0,w*.24,d*.83,.4,h*.69,'#b9c0b7'); box(w*.37,0,w*.26,d*.84,h*.69,.6,'#778f9d');
        } else if (f.code === 'Y12') {
            part(0,-d*.32,w,d*.35,h,.4,'#d7b8a0');
            part(-w*.38,d*.10,w*.24,d*.70,h,.4,'#d7b8a0');
            part(w*.36,d*.10,w*.28,d*.72,h*.93,.4,'#e2e5dc');
            box(0,d*.20,w*.42,d*.34,.2,.1,'#c9b9a5');
            box(w*.23,d*.46,w*.40,d*.15,3.5,.6,'#7e8c87');
        } else if (f.code === 'Y16') {
            // Government architectural-guide photograph: dark projecting upper bar,
            // open concrete supports and pale lower terraces, interpreted compactly.
            box(w*.06,d*.16,w*.81,d*.63,.4,h*.24,'#d1cfc0');
            for(const xx of [-w*.33,0,w*.33]) box(xx,d*.16,.7,.85,h*.24,h*.27,'#b9bbac');
            const rim: [number,number][]=[[-w*.51,-d*.43],[w*.50,-d*.43],[w*.48,d*.32],[w*.23,d*.44],[-w*.17,d*.49],[-w*.46,d*.36]];
            g.polygon(rim.map(p=>at(...p)),h,color('#757c72'));
            for(let i=0;i<rim.length;i++) { const a=rim[i]!,b=rim[(i+1)%rim.length]!; surface([[b[0],h*.50,b[1]],[a[0],h*.50,a[1]],[a[0],h,a[1]],[b[0],h,b[1]]],'#777b70'); }
            for(let i=-2;i<=2;i++) box(i*w*.16,d*.46,w*.115,.12,h*.67,h*.13,'#a1b6ad');
        } else if (f.form === 'courtyard') {
            part(0, -d * .32, w, d * .35, h); part(-w * .38, d * .1, w * .24, d * .7, h); part(w * .38, d * .1, w * .24, d * .7, h * .88);
            box(0, d * .20, w * .4, d * .3, .3, .1, '#d6dbbe');
        } else if (f.form === 'wing') {
            part(0, -d * .16, w, d * .66, h); part(-w * .33, d * .23, w * .34, d * .54, h * .90);
        } else {
            part(0, 0, w, d, h);
            if (f.code === 'Y5') for (const side of [-1,1]) { box(side * w * .30, 0, w * .12, d * .34, h + 1.2, 1.4, '#e4e6dc'); box(side * w * .30, 0, w * .08, d * .24, h + 2.6, .1, '#a8b4ac'); }
        }
        if (f.code === 'Y23') box(w*.38,-d*.15,w*.15,d*.68,.4,h,'#7d8982');
        if (f.code === 'Y13') {
            for(let floor=1;floor<=3;floor++) box(0,d*.18,w*.88,.9,floor*h*.24,.18,'#899d98');
            for(const side of [-1,1]) box(side*w*.42,d*.18,.27,.7,.4,h*.8,'#8c9e99');
        }
        if (f.code === 'Y5' || f.code === 'Y_') {
            // Decorative facade cues only: these do not identify usable entrances.
            box(0,d*.49,w*.12,.18,1.3,h*.72,'#648e95');
            for(let i=0;i<4;i++) box(0,d*.54+(3-i)*.62,w*.25,1.35,.15,.25+i*.24,'#bec4ba');
        }
    }
    /** Seoul forms interpret the reviewed official overview/photo. They are not
     * surveyed footprints, window counts or storey/entrance assignments. */
    private seoulModel(g:Geometry,f:ReferenceFeature) {
        const [w,d,h]=f.size;
        const box=(x:number,z:number,pw:number,pd:number,y:number,ph:number,tint:string)=>g.box(x,y,z,pw,ph,pd,color(tint));
        const panel=(x:number,z:number,pw:number,pd:number,ph:number,y=0.4,tint='#dce1d9')=>{
            box(x,z,pw,pd,y,ph,tint);box(x,z,pw,pd,y+ph,.45,'#f0eee4');
            const rows=Math.max(2,Math.round(ph/3.8)),columns=Math.max(2,Math.round(pw/2.4)),step=ph/rows;
            for(let row=0;row<rows;row++) {
                for(const side of [-1,1]) for(let col=0;col<columns;col++) box(x-pw/2+(col+.5)*pw/columns,z+side*(pd/2+.015),pw/columns*.58,.025,y+row*step+step*.30,step*.44,f.code==='S1'?'#809caa':'#8aa9a5');
                const sideColumns=Math.max(2,Math.round(pd/2.6));
                for(const side of [-1,1]) for(let col=0;col<sideColumns;col++) box(x+side*(pw/2+.015),z-pd/2+(col+.5)*pd/sideColumns,.025,pd/sideColumns*.57,y+row*step+step*.30,step*.44,'#91aca6');
            }
        };
        const rounded=(pw:number,pd:number,y:number,ph:number,tint:string)=>{
            const r=Math.min(pw,pd)*.24,points:[number,number][]=[];
            for(const [cx,cz,start] of [[pw/2-r,pd/2-r,0],[-pw/2+r,pd/2-r,Math.PI/2],[-pw/2+r,-pd/2+r,Math.PI],[pw/2-r,-pd/2+r,Math.PI*1.5]]) for(let i=0;i<=4;i++) {const a=start!+i*Math.PI/8;points.push([cx!+Math.cos(a)*r,cz!+Math.sin(a)*r]);}
            g.polygon(points,y+ph,color(tint));
            for(let i=0;i<points.length;i++) {const a=points[i]!,b=points[(i+1)%points.length]!;g.quad([b[0],y,b[1]],[a[0],y,a[1]],[a[0],y+ph,a[1]],[b[0],y+ph,b[1]],color(tint));}
        };
        if(f.id==='mju-seoul-field') {
            // A raised sports terrace is visible in the official campus image.
            // Its height here is symbolic and does not establish MCC roof levels.
            box(0,0,w,d,.1,2.3,'#c9cec3');box(0,0,w*.97,d*.94,2.4,.13,'#8ca777');
            const line=(a:[number,number],b:[number,number])=>g.segment([a[0],2.56,a[1]],[b[0],2.56,b[1]],.22,color('#eef0db'));
            for(const z of [-d*.41,d*.41]) line([-w*.44,z],[w*.44,z]);
            for(const x of [-w*.44,0,w*.44]) line([x,-d*.41],[x,d*.41]);
            g.disk(0,2.57,0,d*.13,color('#eef0db'));g.disk(0,2.58,0,d*.13-.24,color('#8ca777'));
            return;
        }
        if(f.code==='S9') {
            rounded(w,d,.4,h*.18,'#d2d7ce');
            for(let row=0;row<3;row++) {rounded(w,d,h*.18+row*h*.25,h*.19,'#8bb8b0');rounded(w,d,h*.37+row*h*.25,h*.06,'#e3e8dc');}
            rounded(w*.96,d*.95,h*.93,.65,'#8ea777');
            box(-w*.05,0,w*.53,d*.50,h*.94,.65,'#d9d4c1');box(-w*.05,0,w*.37,d*.35,h*.95,.70,'#edf0df');
            return;
        }
        if(f.code==='S5') {
            rounded(w,d,.4,h,'#dce3d8');
            for(let row=0;row<3;row++) rounded(w*.985,d*.985,2+row*h*.25,h*.11,'#9dbcb4');
            rounded(w*.92,d*.88,h+.4,.55,'#dde4d8');return;
        }
        if(f.code==='S8') {
            for(let i=-1;i<=1;i++) {
                const x=i*w*.31,z=Math.abs(i)*-d*.08;
                panel(x,z,w*.35,d*.83,h,.4,'#b68e7a');
                box(x,z,w*.35,d*.83,h*.83,h*.17,'#e9e9df');
            }
            return;
        }
        if(f.code==='S10') {
            panel(0,0,w,d,h*.43,.4,'#d6d9cf');
            panel(-w*.19,-d*.12,w*.61,d*.74,h*.42,h*.47,'#d7dbd2');
            box(w*.24,d*.02,w*.40,d*.86,h*.46,.45,'#92aa7e');
            box(-w*.19,-d*.12,w*.59,d*.70,h*.90,.38,'#a3b58b');
            for(let i=0;i<7;i++) box(-w*.46+i*w*.074,-d*.10,w*.033,d*.55,h*.93,.22,'#e4e7da');
            return;
        }
        panel(0,0,w,d,h,.4,f.code==='S3'?'#e6e9df':'#dfe2d8');
        if(f.code==='S1') {
            for(const side of [-1,1]) box(side*w*.46,0,w*.035,d,h*.05,h*.94,'#ebede4');
            box(0,0,w*.36,d*.58,h+.85,1.2,'#cdd4cc');
        } else if(f.code==='S4') {
            box(0,0,w,d,h+.45,.30,'#7a8d91');box(-w*.18,-d*.15,w*.33,d*.31,h+.76,1.1,'#d3b8a6');
        }
    }
    private seoulTerrain(g:Geometry) {
        this.terrainHeight = () => -.72;
        // A compact urban presentation board. Its edge is NOT a campus boundary;
        // paving/planting are illustrative context, never pedestrian-route data.
        g.box(-7,-1.5,2,184,.6,143,color('#dfe3d8'));
        g.box(-7,-.88,2,181,.10,140,color('#e8e9dc'));
        for(let x=-91;x<79;x+=8) for(let z=-65;z<70;z+=8) {
            if((Math.floor(x/8)+Math.floor(z/8))%3===0) g.box(x,-.76,z,7.7,.035,7.7,color('#e2e5d8'));
        }
        const clear=(x:number,z:number)=>this.referenceCampus.features.every(f=>Math.abs(x-f.center[0])>f.size[0]/2+6||Math.abs(z-f.center[1])>f.size[1]/2+6);
        const tree=(x:number,z:number,i:number)=>{
            if(!clear(x,z)) return;
            g.disk(x,-.65,z,3.7,color('#bcc8a4'),10);g.box(x,-.6,z,.42,2.8,.42,color('#96896e'));
            g.crown(x,1.4,z,2.8,5.6,color(i%2?'#7d9d69':'#698e67'),7);
        };
        for(let i=0;i<21;i++) tree(-83+i*7.4,-57,i);
        for(let i=0;i<13;i++) tree(-84,-48+i*8,i+21);
        for(let i=0;i<10;i++) tree(70,-45+i*10,i+35);
        for(const [x,z] of [[-57,13],[-41,7],[-26,5],[-11,6],[5,9],[19,9],[34,12],[47,16],[-47,48],[20,46],[38,42]]) tree(x!,z!,Math.round(x!+90));
    }
    private referenceTerrain(g: Geometry) {
        const terrain=createYonginScenicTerrain(this.referenceCampus.features,this.referenceCampus.paths);
        const {outline,inside,lake,woodland,featureDistance,roadDistance,nodeHeight,groundHeight,step,origin,datum}=terrain;
        this.terrainHeight=terrain.surfaceHeight;
        this.referenceGroundHeight=groundHeight;
        const seed = (x: number, z: number) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
        const groundColor = (x: number, z: number): RGB => {
            const forest = woodland(x,z);
            const base = color(forest ? '#789764' : '#acbf8d');
            const variation = Math.sin(x * .032 + z * .018) * .025 + Math.sin(z * .095) * .010 + (seed(x, z) - .5) * .016;
            return base.map(c => Math.max(0, Math.min(1, c + variation))) as RGB;
        };
        g.polygon(outline, datum-.02, color('#91aa76'));
        for (let x = origin[0]; x < 294; x += step) for (let z = origin[1]; z < 282; z += step) {
            if (!terrain.cellInside(x,z)) continue;
            const a: Vec = [x, nodeHeight(x, z), z], b: Vec = [x + step, nodeHeight(x + step, z), z], c: Vec = [x + step, nodeHeight(x + step, z + step), z + step], d: Vec = [x, nodeHeight(x, z + step), z + step];
            g.triangle(a, d, b, groundColor(x, z)); g.triangle(b, d, c, groundColor(x + 4, z + 6));
        }
        for (const [x, z, rx, rz] of [[220,140,67,29]]) {
            g.ellipse(x!, -.86, z!, rx! + 2, rz! + 2, color('#b7b992'), 0, 40);
            g.ellipse(x!, -.80, z!, rx!, rz!, color('#668f98'), 0, 40);
            g.ellipse(x! - 2, -.75, z! + 1, rx! * .87, rz! * .92, color('#76a7ad'), 0, 36);
            g.ellipse(x! - 6, -.70, z! + 8, rx! * .60, rz! * .70, color('#82b2b6'), 0, 28);
        }
        // The official central-campus oblique photo shows pale paving divided by
        // rectangular lawn pockets. This scenic pattern is not an access/path plan.
        const paved=(points:[number,number][],offset:number,tint:string)=>{for(const triangle of drapeScenicPolygon(points,terrain,offset))g.triangle(triangle[0]!,triangle[1]!,triangle[2]!,color(tint));};
        const rectangle=(x:number,z:number,w:number,d:number,offset:number,tint:string)=>paved([[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]],offset,tint);
        paved([[30,-59],[77,-51],[73,-19],[39,-16]],.08,'#d0d1bd');
        for(const [x,z,w,d] of [[47,-45,12,10],[63,-42,11,10],[47,-29,12,9],[61,-27,9,9]]) {
            rectangle(x!,z!,w!,d!,.10,'#a3b480');
            for(let i=0;i<3;i++)rectangle(x!-w!*.30+i*w!*.30,z!,w!*.15,d!,.12,'#aabb88');
        }
        // Curbs/shoulders visually separate approximate roads from lawns. These never
        // imply pedestrian access, lane counts, crossing permission or travel time.
        for (const path of this.referenceCampus.paths) for (let i = 1; i < path.length; i++) {
            const a = path[i - 1]!, b = path[i]!;
            const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1e-8)continue;
            for (const [width, offset, tint] of [[5.4,.07,'#d8d8c7'],[4.2,.11,'#909891'],[3.5,.15,'#9da39b']] as const) {
                const nx=-dz/length*width/2,nz=dx/length*width/2;
                paved([[a[0]-nx,a[1]-nz],[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz]],offset,tint);
                // Drape joins too; planar discs would float on the rising corridor.
                for(const p of i===path.length-1?[a,b]:[a])paved(Array.from({length:10},(_,j)=>[p[0]+Math.cos(j/10*Math.PI*2)*width/2,p[1]+Math.sin(j/10*Math.PI*2)*width/2] as [number,number]),offset+.003,tint);
            }
        }
        const tree = (x: number, z: number, index: number, radius: number) => {
            const y = groundHeight(x,z), pine = index % 5 === 0;
            g.box(x, y, z, .85, 5.6, .85, color('#8d8264'));
            const tint = color(['#527d56','#64894f','#739756','#86a367','#6d8e4e','#9aac69'][index % 6]!);
            if (pine) { g.cone(x, y + 2, z, radius * .86, 10, tint, 7); g.cone(x, y + 7, z, radius * .61, 8, tint, 7); }
            else { g.crown(x, y + 3.1, z, radius, 10 + radius * .3, tint, 7); if (index % 3 === 0) g.crown(x + radius * .43, y + 4, z - radius * .34, radius * .63, 9, tint, 6); }
        };
        // Sample the whole forest area before applying the budget, avoiding a dense
        // north edge followed by bare southern slopes when the budget is reached.
        const planting: [number,number,boolean][] = [];
        for (let z = -204; z < 264; z += 14) for (let x = -352; x < 284; x += 14) {
            const px = x + (seed(x, z) - .5) * 6, pz = z + (seed(z, x) - .5) * 6;
            const dense = woodland(px,pz);
            if (!inside(px, pz) || lake(px, pz) || featureDistance(px, pz) < 10 || roadDistance(px, pz) < 12 || (!dense && seed(px, pz) < .86)) continue;
            planting.push([px,pz,dense]);
        }
        const priority = (p: [number,number,boolean]) => seed(p[0]+19,p[1]+7)-(p[1]>75&&p[1]<200&&p[0]>-80&&p[0]<190?.23:0);
        planting.sort((a,b) => priority(a)-priority(b));
        planting.slice(0,420).forEach(([px,pz,dense],index) => tree(px,pz,index,(dense?7.3:4.2)+seed(px+4,pz)*2.3));
        // Avenue planting is a visual rhythm from the aerial reference, not individual
        // surveyed trees. Keep it clear of every named facility's illustrated envelope.
        for (let i = 0; i < 26; i++) { const x = -82 + i * 7.8, z = 74 + Math.sin(i * .2) * 13; if (featureDistance(x, z) > 5 && roadDistance(x, z) > 7) tree(x, z, i + 80, 3.4); }
    }
    private rebuild() {
        const g = new Geometry();
        this.terrainHeight = () => 0;
        this.referenceGroundHeight = () => 0;
        this.points.clear();
        for (const el of this.labels.values())
            el.remove();
        this.labels.clear();
        if (this.reference) {
            if(this.seoul) this.seoulTerrain(g); else this.referenceTerrain(g);
            const heights=new Map<string,number>();
            for (const f of this.referenceCampus.features) {
                if(sharedGeometryId(f)) continue;
                let height:number;
                if(this.seoul)height=this.referenceModel(g,f);
                else {
                    const authored=new Geometry();this.referenceModel(authored,f);
                    const settled=settleReferenceMesh(authored.data,this.referenceGroundHeight);
                    g.data.push(...settled.vertices);height=settled.top;
                }
                heights.set(f.id,height);
                this.points.set(f.id,[f.center[0],height+5,f.center[1]]);
            }
            for(const f of this.referenceCampus.features) {
                const shared=sharedGeometryId(f);
                if(!shared) continue;
                const primary=this.referenceCampus.features.find(other=>other.id===shared);
                if(primary) this.points.set(f.id,[primary.center[0],(heights.get(primary.id)??primary.size[2]*REFERENCE_RENDER_HEIGHT_SCALE)+5,primary.center[1]]);
            }
        }
        if (this.data.mode === 'demo' && !this.reference) {
            g.box(0, -7, 0, 292, 7, 280, color('#c1cdb1'));
            g.box(0, -.3, 0, 292, .4, 280, color('#d6dfbf'));
            g.box(-67, .15, 79, 80, .2, 52, color('#c5d4ad'));
            g.box(58, .15, 83, 53, .2, 38, color('#c5d4ad'));
            g.disk(15, .23, -15, 18, color('#c8d8b2'));
            // Geometric football pitch is a fictional first-party decorative feature.
            g.box(60, .27, 92, 54, .2, 34, color('#a8c49d'));
            for (const z of [76, 108])
                g.segment([34, .53, z], [86, .53, z], .55, color('#e5edce'));
            for (const x of [34, 60, 86])
                g.segment([x, .53, 76], [x, .53, 108], .55, color('#e5edce'));
            g.disk(60, .55, 92, 5, color('#dce9c8'));
            g.disk(60, .58, 92, 4.4, color('#a8c49d'));
        }
        for (const e of this.reference ? [] : this.data.edges) {
            if (!usable(e.evidence, this.data.mode) || e.access !== 'public')
                continue;
            const a = this.data.nodes.find(n => n.id === e.from), b = this.data.nodes.find(n => n.id === e.to);
            if (!a || !b)
                continue;
            const p = localPoint(a.point, this.data), q = localPoint(b.point, this.data);
            g.segment([p.x, p.y + .2, p.z], [q.x, q.y + .2, q.z], e.stairs ? 4 : 7, color(e.stairs ? '#c6c3b4' : '#e8e3d3'));
        }
        for (const b of this.reference ? [] : this.data.buildings) {
            if (!usable(b.evidence, this.data.mode))
                continue;
            this.model(g, b);
            const p = localPoint(b.point, this.data);
            this.points.set(b.placeId, [p.x, p.y + b.heightM + 5, p.z]);
        }
        if (this.data.mode === 'demo' && !this.reference) {
            // Fixed pseudo-random layout; trees kept away from path centerlines and footprints.
            const trees: Vec[] = [];
            for (let i = 0; i < 18; i++) {
                trees.push([-132 + (i % 3) * 9, 0, -121 + Math.floor(i / 3) * 25]);
                trees.push([124 + (i % 2) * 10, 0, -121 + Math.floor(i / 2) * 27]);
            }
            for (const x of [-107, -79, -53, 45, 72])
                trees.push([x, 0, 118]);
            for (const p of [[-66, 72], [-84, 64], [-104, 78], [-116, -62], [-81, -86], [20, -111], [38, -110], [-78, -115], [104, 65], [113, 103], [-113, 110], [-117, 48], [-23, -10]] as number[][])
                trees.push([p[0]!, 0, p[1]!]);
            trees.forEach(([x, y, z], i) => { g.disk(x + 1, .28, z + 2, 5, color('#b4c19f'), 8); g.box(x, y, z, 1.5, 6, 1.5, color('#9d8a67')); const green = color(i % 4 === 0 ? '#829b60' : i % 3 === 0 ? '#9bad73' : '#699779'); g.cone(x, y + 4, z, 5 + (i % 2), 9, green, 7); g.cone(x, y + 8, z, 3.8, 7, green, 7); });
            for (const [x, z] of [[-54, 61], [-92, 76], [24, -15], [-19, 7]]) {
                g.box(x!, .4, z!, 9, 1.5, 2, color('#ad946b'));
                g.box(x!, 1.9, z! + 1, 9, 2, .5, color('#ad946b'));
            }
        }
        this.vertices = g.data;
        this.upload(this.buffer, g.data);
        this.count = g.data.length / 9;
        for (const p of this.data.places) {
            if (!this.points.has(p.id))
                continue;
            const el = document.createElement('button');
            el.className = 'map-label';
            el.type = 'button';
            el.dataset.place = p.id;
            el.addEventListener('click', e => { e.stopPropagation(); this.onSelect(p.id); });
            this.labelLayer.append(el);
            this.labels.set(p.id, el);
        }
        this.updateLabels();
        this.request();
    }
    private updateLabels() { for (const p of this.data.places) {
        const label = this.labels.get(p.id);
        if (!label)
            continue;
        const sharedCodes=this.reference?this.referenceCampus.features.filter(f=>sharedGeometryId(f)===p.id).map(f=>f.code).filter(Boolean):[];
        label.textContent = this.reference && p.id !== this.selected ? [p.code,...sharedCodes].filter(Boolean).join(' / ') || localize(p.name,this.language) : localize(p.name,this.language).replace(/^Demo /, '').replace(/^샘플 /, '');
        label.title = localize(p.name,this.language);
        label.setAttribute('aria-label', localize(p.name,this.language));
        label.classList.toggle('selected', p.id === this.selected);
        label.setAttribute('aria-pressed', String(p.id === this.selected));
    } }
    project(point: Vec) { const m = this.matrix, x = point[0], y = point[1], z = point[2], clipW = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!; if (clipW <= 0) return { x: -10000, y: -10000 }; return { x: ((m[0]! * x + m[4]! * y + m[8]! * z + m[12]!) / clipW + 1) * this.canvas.clientWidth / 2, y: (1 - (m[1]! * x + m[5]! * y + m[9]! * z + m[13]!) / clipW) * this.canvas.clientHeight / 2 }; }
    private pick(x: number, y: number) { const bounds = this.canvas.getBoundingClientRect(); let best: string | null = null, distance = 45; for (const [id, p] of this.points) {
        const ground=this.reference&&!this.seoul?this.referenceGroundHeight(p[0],p[2]):null;
        // Label anchors include five units above the roof. Pick the raised volume's
        // middle, without halving the terrace elevation along with its own height.
        const pickHeight=ground===null?p[1]*.5:ground+(p[1]-5-ground)*.5;
        const q = this.project([p[0], pickHeight, p[2]]), d = Math.hypot(q.x - (x - bounds.left), q.y - (y - bounds.top));
        if (d < distance) {
            best = id;
            distance = d;
        }
    } if (best)
        this.onSelect(best); }
    private request() { if (this.frame || !this.running || this.disposed)
        return; this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); }); }
    private draw() {
        const gl = this.gl;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.6), w = Math.max(1, Math.round(this.canvas.clientWidth * ratio)), h = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
        if (w !== this.canvas.width || h !== this.canvas.height) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
        if (gl) {
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.useProgram(this.program);
        }
        const span = (this.reference ? this.seoul ? 95 : 224 : 176) / this.zoom, aspect = w / h, tilt = this.twoD ? 1.56 : this.tilt;
        const distance = this.reference && !this.twoD ? (this.seoul ? 250 : 590) / this.zoom : 500;
        this.eye = [this.target[0] + Math.sin(this.heading) * Math.cos(tilt) * distance, this.target[1] + Math.sin(tilt) * distance, this.target[2] + Math.cos(this.heading) * Math.cos(tilt) * distance];
        // The camera always stays well above the model. A sensible near plane
        // preserves depth precision for thin court markings and layered paving.
        const projection = this.reference && !this.twoD ? perspective(.72, aspect, 12, 2400) : ortho(-span * aspect, span * aspect, -span, span, 1, 1800);
        this.matrix = multiply(projection, lookAt(this.eye, this.target));
        if (gl) {
            gl.uniformMatrix4fv(this.locations.matrix, false, new Float32Array(this.matrix));
            const draw = (buffer: WebGLBuffer, count: number) => { gl.bindBuffer(gl.ARRAY_BUFFER, buffer); for (const [index, offset] of [[this.locations.position, 0], [this.locations.normal, 12], [this.locations.color, 24]]) {
                gl.enableVertexAttribArray(index!);
                gl.vertexAttribPointer(index!, 3, gl.FLOAT, false, 36, offset!);
            } gl.drawArrays(gl.TRIANGLES, 0, count); };
            draw(this.buffer, this.count);
            draw(this.routeBuffer, this.routeCount);
        }
        else
            this.softwareDraw(w, h);
        const locationRect = this.drawLocation();
        const occupied = this.occlusionRects.map(r => ({ x: r.x - 7, y: r.y - 7, w: r.width + 14, h: r.height + 14 }));
        if (locationRect) occupied.push({ x: locationRect.x, y: locationRect.y, w: locationRect.width, h: locationRect.height });
        const ordered = [...this.labels].sort(([a], [b]) => Number(b === this.selected) - Number(a === this.selected));
        const selectedPlace = this.data.places.find(p => p.id === this.selected), selectedLabel = this.selected ? this.labels.get(this.selected) : null;
        // Retry the full name every frame so a compact fallback automatically
        // restores after the viewport, language, scale or overlay sizes change.
        if (selectedPlace && selectedLabel) selectedLabel.textContent = localize(selectedPlace.name,this.language).replace(/^Demo /, '').replace(/^샘플 /, '');
        for (const [id, el] of ordered) el.style.display = this.labelsVisible || id === this.selected ? 'block' : 'none';
        const sizes = new Map(ordered.map(([id, el]) => [id, { width: el.offsetWidth, height: el.offsetHeight }]));
        for (const [id, el] of ordered) {
            const p = this.points.get(id)!, q = this.project(p);
            const f = this.reference ? this.referenceCampus.features.find(feature => feature.id === id) : null;
            let show = (this.labelsVisible || id === this.selected) && q.x > 20 && q.x < this.canvas.clientWidth - 20 && q.y > 20 && q.y < this.canvas.clientHeight - 15 && (this.zoom > .8 || id === this.selected || (this.reference ? (this.seoul ? ['mju-s1','mju-s4','mju-s9','mju-s10'] : ['mju-y-main', 'mju-y3', 'mju-a', 'mju-y19', 'mju-y30']).includes(id) : ['demo-library', 'demo-union', 'demo-gate'].includes(id)));
            if (this.reference && !f?.code && id !== this.selected && this.zoom < 1.4) show = false;
            if (f && sharedGeometryId(f) && id !== this.selected) show = false;
            let labelX = q.x, labelY = q.y;
            if (this.reference && show) {
                const placeLabel = (width: number,height: number,offsets: number[][]) => {
                    for (const [dx, dy] of offsets) {
                        const rect = { x: q.x + dx! - width / 2, y: q.y + dy! - height, w: width, h: height };
                        if (rect.x < 8 || rect.y < 8 || rect.x + rect.w > this.canvas.clientWidth - 8 || rect.y + rect.h > this.canvas.clientHeight - 8 || occupied.some(r => r.x < rect.x + rect.w && r.x + r.w > rect.x && r.y < rect.y + rect.h && r.y + r.h > rect.y)) continue;
                        occupied.push(rect); labelX = q.x + dx!; labelY = q.y + dy!; return true;
                    }
                    return false;
                };
                const size = sizes.get(id)!;
                // Keep the small gate canopy visible beside its selected label.
                const selectedOffsets = f?.kind === 'gate' ? [[-100,55],[100,55],[0,-55],[0,110],[0,0]] : [[0,0],[0,-35],[0,35],[-45,-15],[45,-15]];
                let placed = placeLabel(size.width+6,size.height+7,id === this.selected ? selectedOffsets : [[0,0]]);
                if (!placed && id === this.selected) {
                    // The details dock and aria-label retain the complete name.
                    el.textContent = f?.code ?? '●';
                    const width=el.offsetWidth+6,height=el.offsetHeight+7,maxX=this.canvas.clientWidth-width-8,maxY=this.canvas.clientHeight-height-8;
                    if(maxX>=8&&maxY>=8) {
                        const clampX=(value:number)=>Math.max(8,Math.min(maxX,value)),clampY=(value:number)=>Math.max(8,Math.min(maxY,value));
                        // A free rectangle's closest placement touches the desired
                        // anchor, a viewport edge, or an obstacle edge. Enumerating
                        // those coordinates handles arbitrary chrome/text reflow.
                        const xs=[...new Set([8,maxX,clampX(q.x-width/2),...occupied.flatMap(r=>[clampX(r.x-width),clampX(r.x+r.w)])])];
                        const ys=[...new Set([8,maxY,clampY(q.y-height),...occupied.flatMap(r=>[clampY(r.y-height),clampY(r.y+r.h)])])];
                        const offsets=xs.flatMap(x=>ys.map(y=>[x+width/2-q.x,y+height-q.y]));
                        offsets.sort((a,b)=>a[0]!*a[0]!+a[1]!*a[1]!-b[0]!*b[0]!-b[1]!*b[1]!);
                        placed=placeLabel(width,height,offsets);
                    }
                }
                show = placed;
            }
            el.style.display = show ? 'block' : 'none';
            el.style.transform = `translate(${labelX}px,${labelY}px) translate(-50%,-100%)`;
        }
        this.onHeading(this.heading);
        this.frames++;
        if (!this.startTime)
            this.startTime = performance.now();
    }
    /** Software z-buffer fallback, using the exact same first-party triangles and projection.
     * It is intentionally resolution-limited and event-driven. No mobile FPS claim is made. */
    private softwareDraw(width: number, height: number) {
        const ctx = this.ctx;
        if (!ctx)
            return;
        const scale = Math.min(1, 900 / width, 900 / height), w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
        const raster = document.createElement('canvas');
        raster.width = w;
        raster.height = h;
        const rc = raster.getContext('2d')!;
        const image = rc.createImageData(w, h), pixels = image.data;
        const depths = new Float32Array(w * h);
        depths.fill(Infinity);
        const m = this.matrix, all = this.vertices.concat(this.routeVertices), light = norm([-.6, 1, .5]);
        for (let i = 0; i < all.length; i += 27) {
            const centroid: Vec = [(all[i]! + all[i + 9]! + all[i + 18]!) / 3, (all[i + 1]! + all[i + 10]! + all[i + 19]!) / 3, (all[i + 2]! + all[i + 11]! + all[i + 20]!) / 3];
            if (dot([all[i + 3]!, all[i + 4]!, all[i + 5]!], sub(this.eye, centroid)) <= 0.00001)
                continue;
            const pts: number[][] = [];
            for (let v = 0; v < 3; v++) {
                const j = i + v * 9, x = all[j]!, y = all[j + 1]!, z = all[j + 2]!;
                const clipW = m[3]! * x + m[7]! * y + m[11]! * z + m[15]!;
                if (clipW <= .5) break;
                pts.push([((m[0]! * x + m[4]! * y + m[8]! * z + m[12]!) / clipW + 1) * w / 2, (1 - (m[1]! * x + m[5]! * y + m[9]! * z + m[13]!) / clipW) * h / 2, (m[2]! * x + m[6]! * y + m[10]! * z + m[14]!) / clipW]);
            }
            if (pts.length !== 3) continue;
            const [a, b, c] = pts as [
                number[],
                number[],
                number[]
            ];
            const denom = (b[1]! - c[1]!) * (a[0]! - c[0]!) + (c[0]! - b[0]!) * (a[1]! - c[1]!);
            if (Math.abs(denom) < .001)
                continue;
            const minX = Math.max(0, Math.floor(Math.min(a[0]!, b[0]!, c[0]!))), maxX = Math.min(w - 1, Math.ceil(Math.max(a[0]!, b[0]!, c[0]!)));
            const minY = Math.max(0, Math.floor(Math.min(a[1]!, b[1]!, c[1]!))), maxY = Math.min(h - 1, Math.ceil(Math.max(a[1]!, b[1]!, c[1]!)));
            const brightness = .67 + .33 * Math.max(dot([all[i + 3]!, all[i + 4]!, all[i + 5]!], light), 0);
            const red = Math.round(all[i + 6]! * brightness * 255), green = Math.round(all[i + 7]! * brightness * 255), blue = Math.round(all[i + 8]! * brightness * 255);
            for (let y = minY; y <= maxY; y++)
                for (let x = minX; x <= maxX; x++) {
                    const u = ((b[1]! - c[1]!) * (x + .5 - c[0]!) + (c[0]! - b[0]!) * (y + .5 - c[1]!)) / denom;
                    const v = ((c[1]! - a[1]!) * (x + .5 - c[0]!) + (a[0]! - c[0]!) * (y + .5 - c[1]!)) / denom;
                    const t = 1 - u - v;
                    if (u < -.00001 || v < -.00001 || t < -.00001)
                        continue;
                    const depth = u * a[2]! + v * b[2]! + t * c[2]!, index = y * w + x;
                    if (depth >= depths[index]!)
                        continue;
                    depths[index] = depth;
                    const at = index * 4;
                    pixels[at] = red;
                    pixels[at + 1] = green;
                    pixels[at + 2] = blue;
                    pixels[at + 3] = 255;
                }
        }
        rc.putImageData(image, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(raster, 0, 0, width, height);
    }
    diagnostics() { return { renderer: this.gl ? 'WebGL 1 · first-party low-poly meshes' : 'Canvas 2D software-projected 3D fallback', vertices: this.count, drawCalls: this.gl ? 2 : null, frames: this.frames, continuousRendering: false, reference: this.reference, referenceFeatureCount: this.reference ? this.referenceCampus.features.length : 0, geometry: this.reference ? 'illustration only; approximate footprints and heights; no routing graph' : this.data.mode, locationVisible: this.locationVisible, locationStatus: this.locationAssessment?.status ?? 'idle', accuracyM: this.locationAssessment?.accuracyM ?? null, modelUncertaintyM: this.locationAssessment?.modelUncertaintyM ?? null, uncertaintyM: this.locationAssessment?.uncertaintyM ?? null }; }
    dispose() { this.disposed = true; this.setActive(false); this.animationGeneration++; this.resize.disconnect(); this.gl?.deleteBuffer(this.buffer); this.gl?.deleteBuffer(this.routeBuffer); this.gl?.deleteProgram(this.program); }
}
