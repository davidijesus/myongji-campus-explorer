/** First-party campus data. Unknown data is null, never silently filled. */
export type Language = 'en' | 'ko' | 'zh';
export type CampusId = 'yongin' | 'seoul';
export type Mode = 'demo' | 'live';
export type Localized = {
    en: string;
    ko: string;
    /** Optional for legacy remote records; bundled Chinese text is resolved by i18n. */
    zh?: string;
};
export type Verification = 'verified' | 'unverified' | 'demo';
export type Evidence = {
    status: Verification;
    sourceUrl: string | null;
    checkedAt: string | null;
    note: Localized;
};
export type DemoPoint = {
    frame: 'demo';
    x: number;
    z: number;
    elevationM: number;
};
export type GeoPoint = {
    frame: 'wgs84';
    lat: number;
    lon: number;
    elevationM: number | null;
};
export type Point = DemoPoint | GeoPoint;
export type Category = 'academic' | 'library' | 'food' | 'residence' | 'services' | 'outdoors';
export type Place = {
    id: string;
    name: Localized;
    aliases: string[];
    category: Category;
    description: Localized;
    code: string | null;
    point: Point | null;
    evidence: Evidence;
    geometryEvidence: Evidence;
    buildingId: string | null;
    entranceIds: string[];
    photo: {
        url: string;
        credit: string;
        sourceUrl: string;
    } | null;
};
export type Building = {
    id: string;
    placeId: string;
    point: Point;
    widthM: number;
    depthM: number;
    heightM: number;
    bearingDegrees: number;
    form: 'hall' | 'library' | 'tower' | 'pavilion' | 'gate';
    color: string;
    evidence: Evidence;
};
export type Entrance = {
    id: string;
    placeId: string;
    nodeId: string;
    name: Localized;
    point: Point;
    stairs: boolean | null;
    notes: Localized;
    evidence: Evidence;
};
export type PathNode = {
    id: string;
    point: Point;
    evidence: Evidence;
    access: 'public' | 'restricted' | 'unknown';
};
export type PathEdge = {
    id: string;
    from: string;
    to: string;
    distanceM: number;
    stairs: boolean | null;
    slopePercent: number | null;
    access: 'public' | 'restricted' | 'unknown';
    bidirectional: boolean;
    evidence: Evidence;
};
export type Hours = {
    timeZone: 'Asia/Seoul';
    /** Sunday=0. Overnight intervals are encoded with close < open. */
    weekly: {
        day: number;
        open: string;
        close: string;
    }[];
    /** ISO local date override. [] explicitly means closed all day. */
    exceptions: {
        date: string;
        intervals: {
            open: string;
            close: string;
        }[];
    }[];
    evidence: Evidence;
};
export type FoodVenue = {
    id: string;
    placeId: string;
    kind: 'cafe' | 'cafeteria' | 'restaurant';
    campusSide: 'on-campus' | 'nearby';
    price: {
        min: number;
        max: number;
        currency: 'KRW';
        evidence: Evidence;
    } | null;
    hours: Hours | null;
    dietaryClaims: {
        text: Localized;
        evidence: Evidence;
    }[];
    evidence: Evidence;
};
export type CampusEvent = {
    id: string;
    title: Localized;
    description: Localized;
    organizer: Localized;
    placeId: string;
    startsAt: string;
    endsAt: string;
    timeZone: 'Asia/Seoul';
    language: Localized;
    state: 'draft' | 'published' | 'canceled' | 'completed';
    registrationUrl: string | null;
    evidence: Evidence;
};
export type Room = {
    id: string;
    aliases: string[];
    placeId: string;
    floor: string;
    evidence: Evidence;
};
export type Dataset = {
    schemaVersion: 1;
    id: string;
    mode: Mode;
    version: number;
    updatedAt: string;
    campus: {
        id: string;
        name: Localized;
        address: Localized;
        evidence: Evidence;
        origin: GeoPoint | null;
        boundary: GeoPoint[] | null;
        geometryEvidence: Evidence;
    };
    places: Place[];
    buildings: Building[];
    entrances: Entrance[];
    nodes: PathNode[];
    edges: PathEdge[];
    food: FoodVenue[];
    events: CampusEvent[];
    rooms: Room[];
};
export type Route = {
    nodeIds: string[];
    edgeIds: string[];
    points: Point[];
    distanceM: number;
    estimatedMinutes: number;
    mode: Mode;
};
export type RouteResult = {
    ok: true;
    route: Route;
} | {
    ok: false;
    reason: 'missing-node' | 'unverified' | 'disconnected';
};
export type LocationReading = {
    lat: number;
    lon: number;
    accuracyM: number | null;
    timestamp: number;
};
export type LocationStatus = 'unavailable' | 'stale' | 'weak' | 'usable';
export type NativeMessage = {
    type: 'ready';
} | {
    type: 'location';
    language: Language;
    mode: Mode;
} | {
    type: 'save';
    favorites: string[];
    language: Language;
    campusId?: CampusId;
} | {
    type: 'naver';
    mode: Mode;
    action: 'place' | 'walk' | 'search';
    placeId: string;
    entranceId?: string;
    language: Language;
} | {
    type: 'native-map';
    mode: Mode;
    placeId: string | null;
    entranceId?: string;
    route?: Route;
    language: Language;
} | {
    type: 'external';
    url: string;
} | {
    type: 'refresh';
};
