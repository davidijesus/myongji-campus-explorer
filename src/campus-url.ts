import { CampusId, isCampusId } from './campuses';

/** Only one exact, lowercase campus value selects a campus. Invalid or duplicate
 * values (even identical duplicates) are ambiguous and defer to saved preferences. */
export function campusFromUrl(href: string): CampusId | null {
    try {
        const values = new URL(href).searchParams.getAll('campus');
        return values.length === 1 && isCampusId(values[0]) ? values[0] : null;
    } catch { return null; }
}

export function initialCampus(href: string, savedCampus: unknown): CampusId {
    return campusFromUrl(href) ?? (isCampusId(savedCampus) ? savedCampus : 'yongin');
}

/** Replace only the campus parameter. Other query values and the fragment remain.
 * Unsupported/opaque WebView addresses may keep their in-memory selection instead. */
export function campusUrlFor(href: string, campus: CampusId): string | null {
    try {
        const url = new URL(href);
        if (!isCampusId(campus) || !['https:', 'http:', 'file:'].includes(url.protocol)) return null;
        url.searchParams.set('campus', campus);
        return url.href;
    } catch { return null; }
}
