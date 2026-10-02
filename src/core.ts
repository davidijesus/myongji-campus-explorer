import { Dataset, Evidence, GeoPoint, Point, Place, RouteResult, Mode, Hours, CampusEvent, LocationReading, LocationStatus, NativeMessage } from './types';
import { localize } from './i18n';
export const SOURCE_MAP = 'https://www.mju.ac.kr/us/3407/subview.do';
export const CAMPUS_ID = 'mju-yongin-natural-science';
export const SEOUL_CAMPUS_ID = 'mju-seoul-humanities';
export const APP_ID = 'com.campusexplorer.myongji';
export const DAY_MS = 86400000;
export function usable(e: Evidence, mode: Mode): boolean {
    if (mode === 'demo')
        return e.status === 'demo';
    return e.status === 'verified' && !!e.sourceUrl && !!e.checkedAt;
}
export function fresh(e: Evidence, now = Date.now(), maxDays = 30): boolean {
    if (!e.checkedAt)
        return false;
    const age = now - Date.parse(e.checkedAt);
    return Number.isFinite(age) && age >= 0 && age <= maxDays * DAY_MS;
}
export function normalize(input: string): string {
    return input.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\s._-]+/g, '').trim();
}
export function searchPlaces(data: Dataset, query: string, category = 'all', favorites?: Set<string>): Place[] {
    const q = normalize(query);
    const rooms = data.rooms.filter(r => usable(r.evidence, data.mode) && [r.id, ...r.aliases].some(a => normalize(a) === q));
    return data.places.filter(p => usable(p.evidence, data.mode))
        .filter(p => category === 'all' || p.category === category)
        .filter(p => !favorites || favorites.has(p.id))
        .map(p => {
        const names = [p.name.en, p.name.ko, localize(p.name, 'zh'), p.code || '', ...p.aliases.flatMap(alias => [alias, localize({ en: alias, ko: alias }, 'zh')])].map(normalize);
        const score = !q ? 1 : rooms.some(r => r.placeId === p.id) ? 100 : names.includes(q) ? 90 : names.some(n => n.startsWith(q)) ? 60 : names.some(n => n.includes(q)) ? 30 : 0;
        return { p, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.p.name.en.localeCompare(b.p.name.en)).map(x => x.p);
}
/** Small-area, east/up/south campus coordinates in meters. No second geographic dataset. */
export function geoToLocal(p: GeoPoint, origin: GeoPoint): {
    x: number;
    y: number;
    z: number;
} {
    const r = Math.PI / 180;
    return { x: (p.lon - origin.lon) * r * 6378137 * Math.cos(origin.lat * r), z: -(p.lat - origin.lat) * r * 6378137,
        y: p.elevationM !== null && origin.elevationM !== null ? p.elevationM - origin.elevationM : 0 };
}
export function localToGeo(p: {
    x: number;
    y: number;
    z: number;
}, origin: GeoPoint): GeoPoint {
    const r = Math.PI / 180;
    return { frame: 'wgs84', lat: origin.lat - p.z / 6378137 / r, lon: origin.lon + p.x / (6378137 * Math.cos(origin.lat * r)) / r,
        elevationM: origin.elevationM === null ? null : origin.elevationM + p.y };
}
export function localPoint(p: Point, data: Dataset): {
    x: number;
    y: number;
    z: number;
} {
    if (p.frame === 'demo') {
        if (data.mode !== 'demo')
            throw new Error('Demo geometry cannot be used in live mode.');
        return { x: p.x, y: p.elevationM, z: p.z };
    }
    if (data.mode !== 'live' || !data.campus.origin)
        throw new Error('Missing verified geographic origin.');
    return geoToLocal(p, data.campus.origin);
}
export function geographicDistance(a: GeoPoint, b: GeoPoint): number {
    const r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const v = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1 - v)));
}
export function insideBoundary(p: GeoPoint, polygon: GeoPoint[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i]!, b = polygon[j]!;
        if ((a.lat > p.lat) !== (b.lat > p.lat) && p.lon < (b.lon - a.lon) * (p.lat - a.lat) / (b.lat - a.lat) + a.lon)
            inside = !inside;
    }
    return inside;
}
/** Dijkstra: uses only explicitly public, verified graph segments. Never snaps GPS to an invented connector. */
export function findRoute(data: Dataset, from: string, to: string, avoidStairs = false): RouteResult {
    const nodes = new Map(data.nodes.map(n => [n.id, n]));
    const a = nodes.get(from), b = nodes.get(to);
    if (!a || !b)
        return { ok: false, reason: 'missing-node' };
    const allowed = (id: string) => { const n = nodes.get(id); return !!n && n.access === 'public' && usable(n.evidence, data.mode); };
    if (!allowed(from) || !allowed(to))
        return { ok: false, reason: 'unverified' };
    const adjacency = new Map<string, {
        to: string;
        id: string;
        distance: number;
    }[]>();
    for (const e of data.edges) {
        if (!usable(e.evidence, data.mode) || e.access !== 'public' || (avoidStairs && e.stairs !== false) || !allowed(e.from) || !allowed(e.to) || !Number.isFinite(e.distanceM) || e.distanceM <= 0)
            continue;
        const add = (f: string, t: string) => { const list = adjacency.get(f) || []; list.push({ to: t, id: e.id, distance: e.distanceM }); adjacency.set(f, list); };
        add(e.from, e.to);
        if (e.bidirectional)
            add(e.to, e.from);
    }
    const distances = new Map<string, number>([[from, 0]]), previous = new Map<string, {
        from: string;
        edge: string;
    }>(), visited = new Set<string>();
    while (true) {
        let current: string | null = null, best = Infinity;
        for (const [id, d] of distances)
            if (!visited.has(id) && d < best) {
                current = id;
                best = d;
            }
        if (current === null)
            break;
        if (current === to)
            break;
        visited.add(current);
        for (const e of adjacency.get(current) || []) {
            const distance = best + e.distance;
            if (distance < (distances.get(e.to) ?? Infinity)) {
                distances.set(e.to, distance);
                previous.set(e.to, { from: current, edge: e.id });
            }
        }
    }
    const total = distances.get(to);
    if (total === undefined)
        return { ok: false, reason: 'disconnected' };
    const path = [to], edges: string[] = [];
    let cur = to;
    while (cur !== from) {
        const prev = previous.get(cur);
        if (!prev)
            return { ok: false, reason: 'disconnected' };
        edges.unshift(prev.edge);
        cur = prev.from;
        path.unshift(cur);
    }
    return { ok: true, route: { nodeIds: path, edgeIds: edges, points: path.map(id => nodes.get(id)!.point), distanceM: total, estimatedMinutes: Math.max(1, Math.ceil(total / 70)), mode: data.mode } };
}
export function locationStatus(reading: LocationReading | null, now = Date.now()): LocationStatus {
    if (!reading || !Number.isFinite(reading.lat) || !Number.isFinite(reading.lon) || Math.abs(reading.lat) > 90 || Math.abs(reading.lon) > 180)
        return 'unavailable';
    if (!Number.isFinite(reading.timestamp) || now - reading.timestamp > 30000 || reading.timestamp > now + 5000)
        return 'stale';
    if (reading.accuracyM === null || !Number.isFinite(reading.accuracyM) || reading.accuracyM < 0 || reading.accuracyM > 35)
        return 'weak';
    return 'usable';
}
function seoulParts(date: Date): {
    date: string;
    day: number;
    minute: number;
} {
    // KST is UTC+9 without daylight-saving transitions in the supported modern date range.
    const d = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return { date: d.toISOString().slice(0, 10), day: d.getUTCDay(), minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function openStatus(hours: Hours | null, mode: Mode, now = new Date()): 'open' | 'closed' | 'unknown' {
    if (!hours || !usable(hours.evidence, mode) || (mode === 'live' && !fresh(hours.evidence, now.getTime(), 14)))
        return 'unknown';
    const today = seoulParts(now), yesterday = seoulParts(new Date(now.getTime() - DAY_MS));
    const intervals = (day: typeof today) => hours.exceptions.find(x => x.date === day.date)?.intervals ?? hours.weekly.filter(x => x.day === day.day);
    // A specific closure today overrides any spillover from yesterday.
    const exception = hours.exceptions.find(x => x.date === today.date);
    if (exception && exception.intervals.length === 0)
        return 'closed';
    if (intervals(today).some(i => minutes(i.close) > minutes(i.open) ? today.minute >= minutes(i.open) && today.minute < minutes(i.close) : today.minute >= minutes(i.open)))
        return 'open';
    if (intervals(yesterday).some(i => minutes(i.close) < minutes(i.open) && today.minute < minutes(i.close)))
        return 'open';
    return 'closed';
}
export function upcomingEvents(data: Dataset, now = new Date()): CampusEvent[] {
    return data.events.filter(e => e.state === 'published' && usable(e.evidence, data.mode) && Date.parse(e.endsAt) > now.getTime()).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
function naverPoint(p: GeoPoint) { if (p.frame !== 'wgs84' || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || p.lat < 31.43 || p.lat > 44.35 || p.lon < 122.37 || p.lon > 132)
    throw new Error('Invalid Naver destination coordinate'); }
export function naverUrl(action: 'place' | 'walk', point: GeoPoint, name: string, appId = APP_ID, start?: {
    point: GeoPoint;
    name: string;
}): string {
    naverPoint(point);
    if (!appId.trim())
        throw new Error('App identifier is required.');
    const params = new URLSearchParams();
    if (action === 'place') {
        params.set('lat', String(point.lat));
        params.set('lng', String(point.lon));
        params.set('name', name);
    }
    else {
        if (start) {
            naverPoint(start.point);
            params.set('slat', String(start.point.lat));
            params.set('slng', String(start.point.lon));
            params.set('sname', start.name);
        }
        params.set('dlat', String(point.lat));
        params.set('dlng', String(point.lon));
        params.set('dname', name);
    }
    params.set('appname', appId);
    return `nmap://${action === 'walk' ? 'route/walk' : 'place'}?${params.toString()}`;
}
export function naverSearch(query: string, appId = APP_ID): string { if (!appId.trim() || !query.trim())
    throw new Error('Query and app identifier are required.'); return `nmap://search?${new URLSearchParams({ query, appname: appId })}`; }
export function destination(data: Dataset, placeId: string, entranceId?: string): {
    point: GeoPoint;
    name: string;
} | null {
    if (data.mode !== 'live')
        return null;
    const p = data.places.find(p => p.id === placeId);
    if (!p || !usable(p.evidence, 'live'))
        return null;
    const e = data.entrances.find(e => e.placeId === placeId && e.id === entranceId);
    if (!e || !p.entranceIds.includes(e.id) || !usable(e.evidence, 'live') || e.point.frame !== 'wgs84')
        return null;
    return { point: e.point, name: `${p.name.ko} · ${e.name.ko}` };
}
export function safeExternalUrl(value: string): boolean { try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
}
catch {
    return false;
} }
/** Strict structural + relational checks. Used at publication and at every remote/cache ingestion. */
export function validateDataset(value: unknown, expectedMode?: Mode): string[] {
    try {
        return validateDatasetShape(value, expectedMode);
    }
    catch {
        return ['Malformed nested record. Dataset rejected.'];
    }
}
function validateDatasetShape(value: unknown, expectedMode?: Mode): string[] {
    const errors: string[] = [];
    const err = (s: string) => { if (errors.length < 80)
        errors.push(s); };
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return ['Dataset must be an object.'];
    const d = value as Dataset;
    if (d.schemaVersion !== 1)
        err('schemaVersion must be 1');
    if (!['live', 'demo'].includes(d.mode))
        err('Invalid mode');
    if (expectedMode && d.mode !== expectedMode)
        err(`Expected ${expectedMode} dataset`);
    if (!Number.isInteger(d.version) || d.version < 1)
        err('Invalid version');
    const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
    if (!date(d.updatedAt))
        err('Invalid updatedAt');
    const text = (v: unknown, max = 3000) => typeof v === 'string' && v.length > 0 && v.length <= max;
    const loc = (v: any, label: string) => { if (!v || !text(v.en) || !text(v.ko))
        err(`${label}: English and Korean translations required`);
        if (v && v.zh !== undefined && !text(v.zh)) err(`${label}: invalid optional Chinese translation`); };
    const evidence = (v: any, label: string) => {
        if (!v || !['verified', 'unverified', 'demo'].includes(v.status)) {
            err(`${label}: invalid evidence`);
            return;
        }
        loc(v.note, label + '.note');
        if (v.sourceUrl !== null && (!text(v.sourceUrl, 2048) || !safeExternalUrl(v.sourceUrl)))
            err(label + ': source must be HTTPS');
        if (v.checkedAt !== null && !date(v.checkedAt))
            err(label + ': invalid verification date');
        if (v.status === 'verified' && (!v.sourceUrl || !v.checkedAt))
            err(label + ': verified data requires source and date');
        if (d.mode === 'live' && v.status === 'demo')
            err(label + ': demo evidence in live data');
        if (d.mode === 'demo' && v.status === 'verified')
            err(label + ': real evidence in demo data');
    };
    const point = (v: any, label: string, nullable = false) => {
        if (nullable && v === null)
            return;
        if (!v || typeof v !== 'object') {
            err(label + ': point missing');
            return;
        }
        if (d.mode === 'demo') {
            if (v.frame !== 'demo' || ![v.x, v.z, v.elevationM].every(Number.isFinite) || Math.abs(v.x) > 10000 || Math.abs(v.z) > 10000)
                err(label + ': invalid demo point');
        }
        else if (v.frame !== 'wgs84' || !Number.isFinite(v.lat) || !Number.isFinite(v.lon) || Math.abs(v.lat) > 90 || Math.abs(v.lon) > 180 || (v.elevationM !== null && !Number.isFinite(v.elevationM)))
            err(label + ': invalid geographic point');
    };
    if (!text(d.id, 100))
        err('Invalid dataset ID');
    if (!d.campus || ![CAMPUS_ID, SEOUL_CAMPUS_ID].includes(d.campus.id))
        return [...errors, 'Wrong campus or missing campus'];
    loc(d.campus.name, 'campus.name');
    loc(d.campus.address, 'campus.address');
    evidence(d.campus.evidence, 'campus');
    evidence(d.campus.geometryEvidence, 'campus.geometry');
    if (d.campus.origin !== null) {
        if (d.mode === 'demo')
            err('Demo must not have a geographic origin');
        else
            point(d.campus.origin, 'origin');
    }
    if (d.campus.boundary !== null) {
        if (!Array.isArray(d.campus.boundary) || d.campus.boundary.length < 3)
            err('Invalid boundary');
        else
            for (const p of d.campus.boundary)
                point(p, 'boundary');
    }
    const names = ['places', 'buildings', 'entrances', 'nodes', 'edges', 'food', 'events', 'rooms'] as const;
    for (const k of names)
        if (!Array.isArray(d[k]) || d[k].length > 10000)
            return [...errors, `Invalid or oversized ${k}`];
    const ids = new Map<string, Set<string>>();
    const all = new Set<string>();
    for (const key of names) {
        ids.set(key, new Set());
        for (const r of d[key]) {
            if (!r || typeof r !== 'object')
                return [...errors, `Invalid ${key} record`];
            if (!text(r.id, 100) || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(r.id) || all.has(r.id))
                err(`Missing/duplicate ID ${r.id}`);
            all.add(r.id);
            ids.get(key)!.add(r.id);
            evidence(r.evidence, `${key}.${r.id}`);
        }
    }
    for (const p of d.places) {
        loc(p.name, p.id);
        loc(p.description, p.id);
        if (!['academic', 'library', 'food', 'residence', 'services', 'outdoors'].includes(p.category))
            err(p.id + ': invalid category');
        if (!Array.isArray(p.aliases) || p.aliases.some(x => !text(x, 100)))
            err(p.id + ': invalid aliases');
        point(p.point, p.id, true);
        evidence(p.geometryEvidence, p.id + '.geometry');
        if (p.code !== null && !text(p.code, 30))
            err(p.id + ': invalid code');
        if (p.buildingId !== null && !ids.get('buildings')!.has(p.buildingId))
            err(p.id + ': unknown building');
        if (!Array.isArray(p.entranceIds) || p.entranceIds.some(id => !ids.get('entrances')!.has(id)))
            err(p.id + ': invalid entrances');
        if (p.photo !== null && (!p.photo || !safeExternalUrl(p.photo.url) || !safeExternalUrl(p.photo.sourceUrl) || !text(p.photo.credit)))
            err(p.id + ': photo needs URL, source and credit');
    }
    for (const b of d.buildings) {
        if (!ids.get('places')!.has(b.placeId))
            err(b.id + ': unknown place');
        point(b.point, b.id);
        if (![b.widthM, b.depthM, b.heightM].every(n => Number.isFinite(n) && n > 0 && n <= 500))
            err(b.id + ': invalid dimensions');
        if (!Number.isFinite(b.bearingDegrees))
            err(b.id + ': invalid orientation');
        if (!['hall', 'library', 'tower', 'pavilion', 'gate'].includes(b.form) || !/^#[\da-f]{6}$/i.test(b.color))
            err(b.id + ': invalid model');
    }
    for (const n of d.nodes) {
        point(n.point, n.id);
        if (!['public', 'restricted', 'unknown'].includes(n.access))
            err(n.id + ': invalid access');
    }
    const nodeById = new Map(d.nodes.map(n => [n.id, n]));
    for (const e of d.entrances) {
        loc(e.name, e.id);
        loc(e.notes, e.id);
        point(e.point, e.id);
        if (!ids.get('places')!.has(e.placeId) || !ids.get('nodes')!.has(e.nodeId))
            err(e.id + ': broken reference');
        if (e.stairs !== null && typeof e.stairs !== 'boolean')
            err(e.id + ': invalid stairs');
        const n = nodeById.get(e.nodeId);
        if (n && JSON.stringify(n.point) !== JSON.stringify(e.point))
            err(e.id + ': entrance and node coordinates must match exactly');
        const p = d.places.find(p => p.id === e.placeId);
        if (p && !p.entranceIds?.includes(e.id))
            err(e.id + ': entrance ownership mismatch');
    }
    for (const e of d.edges) {
        if (!ids.get('nodes')!.has(e.from) || !ids.get('nodes')!.has(e.to) || e.from === e.to)
            err(e.id + ': invalid nodes');
        if (!Number.isFinite(e.distanceM) || e.distanceM <= 0)
            err(e.id + ': invalid distance');
        if (!['public', 'restricted', 'unknown'].includes(e.access) || typeof e.bidirectional !== 'boolean')
            err(e.id + ': invalid access');
        if (e.stairs !== null && typeof e.stairs !== 'boolean')
            err(e.id + ': invalid stairs');
        if (e.slopePercent !== null && !Number.isFinite(e.slopePercent))
            err(e.id + ': invalid slope');
    }
    const hm = (s: any) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
    for (const f of d.food) {
        if (!ids.get('places')!.has(f.placeId) || !['cafe', 'cafeteria', 'restaurant'].includes(f.kind) || !['on-campus', 'nearby'].includes(f.campusSide))
            err(f.id + ': invalid food venue');
        if (f.price !== null) {
            if (!f.price || !Number.isFinite(f.price.min) || !Number.isFinite(f.price.max) || f.price.min < 0 || f.price.max < f.price.min || f.price.currency !== 'KRW')
                err(f.id + ': invalid price');
            else
                evidence(f.price.evidence, f.id + '.price');
        }
        if (!Array.isArray(f.dietaryClaims))
            err(f.id + ': invalid dietary claims');
        else
            for (const c of f.dietaryClaims) {
                loc(c.text, f.id);
                evidence(c.evidence, f.id + '.dietary');
            }
        if (f.hours !== null) {
            const h = f.hours;
            if (!h || h.timeZone !== 'Asia/Seoul' || !Array.isArray(h.weekly) || !Array.isArray(h.exceptions))
                err(f.id + ': invalid hours');
            else {
                evidence(h.evidence, f.id + '.hours');
                for (const t of h.weekly)
                    if (!Number.isInteger(t.day) || t.day < 0 || t.day > 6 || !hm(t.open) || !hm(t.close) || t.open === t.close)
                        err(f.id + ': invalid weekly interval');
                for (const t of h.exceptions) {
                    if (!/^\d{4}-\d\d-\d\d$/.test(t.date) || !Array.isArray(t.intervals))
                        err(f.id + ': invalid exception');
                    else
                        for (const i of t.intervals)
                            if (!hm(i.open) || !hm(i.close) || i.open === i.close)
                                err(f.id + ': invalid exception interval');
                }
            }
        }
    }
    for (const e of d.events) {
        loc(e.title, e.id);
        loc(e.description, e.id);
        loc(e.organizer, e.id);
        loc(e.language, e.id);
        if (!ids.get('places')!.has(e.placeId) || !['draft', 'published', 'canceled', 'completed'].includes(e.state) || e.timeZone !== 'Asia/Seoul')
            err(e.id + ': invalid event');
        if (!date(e.startsAt) || !date(e.endsAt) || Date.parse(e.endsAt) <= Date.parse(e.startsAt))
            err(e.id + ': invalid event time');
        if (e.registrationUrl !== null && !safeExternalUrl(e.registrationUrl))
            err(e.id + ': invalid registration URL');
    }
    for (const r of d.rooms)
        if (!ids.get('places')!.has(r.placeId) || !text(r.floor, 60) || !Array.isArray(r.aliases) || r.aliases.some(a => !text(a, 100)))
            err(r.id + ': invalid room');
    // A geographic 3D scene is not permitted without verified origin / campus geometry.
    if (d.mode === 'live' && d.buildings.length && (!d.campus.origin || !usable(d.campus.geometryEvidence, 'live')))
        err('Live models require a verified campus coordinate frame');
    return errors;
}
export function parseNativeMessage(value: unknown): NativeMessage | null {
    if (!value || typeof value !== 'object')
        return null;
    const m = value as any;
    const language = m.language === 'en' || m.language === 'ko' || m.language === 'zh';
    const mode = m.mode === 'live' || m.mode === 'demo';
    if (m.type === 'ready' || m.type === 'refresh')
        return { type: m.type };
    if (m.type === 'location' && language && mode)
        return { type: 'location', language: m.language, mode: m.mode };
    if (m.type === 'external' && typeof m.url === 'string' && m.url.length < 2048 && safeExternalUrl(m.url))
        return { type: 'external', url: m.url };
    if (m.type === 'save' && language && (m.campusId === undefined || m.campusId === 'yongin' || m.campusId === 'seoul') && Array.isArray(m.favorites) && m.favorites.length <= 1000 && m.favorites.every((s: unknown) => typeof s === 'string' && s.length <= 100))
        return { type: 'save', language: m.language, favorites: m.favorites, ...(m.campusId === undefined ? {} : { campusId: m.campusId }) };
    if (m.type === 'naver' && mode && language && ['place', 'walk', 'search'].includes(m.action) && typeof m.placeId === 'string' && m.placeId.length <= 100 && (m.entranceId === undefined || (typeof m.entranceId === 'string' && m.entranceId.length <= 100)))
        return m;
    if (m.type === 'native-map' && mode && language && (m.placeId === null || (typeof m.placeId === 'string' && m.placeId.length <= 100)) && (m.entranceId === undefined || (typeof m.entranceId === 'string' && m.entranceId.length <= 100)) && (m.route === undefined || (m.route && typeof m.route === 'object' && Array.isArray(m.route.nodeIds) && Array.isArray(m.route.edgeIds) && m.route.nodeIds.length <= 10000 && m.route.edgeIds.length <= 10000 && [...m.route.nodeIds, ...m.route.edgeIds].every((id: unknown) => typeof id === 'string' && id.length <= 100))))
        return m;
    return null;
}
