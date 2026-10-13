import { CommunityUpdate, getCommunitySource, isCommunityPermalink } from './community';

export type CommunitySnapshot = {
  schemaVersion: 1;
  campusId: 'yongin';
  version: number;
  updatedAt: string;
  updates: CommunityUpdate[];
};
export type CommunityStatus = 'unconfigured' | 'idle' | 'loading' | 'updated' | 'cached' | 'error' | 'cancelled';
const DAY = 86400000;
function exact(value: unknown, required: string[], optional: string[] = []): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return required.every(key => Object.prototype.hasOwnProperty.call(value, key)) && keys.every(key => required.includes(key) || optional.includes(key));
}
function day(value: unknown): number {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return NaN;
  const result = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(result) && new Date(result).toISOString().slice(0, 10) === value ? result : NaN;
}
function time(value: unknown): number {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/.test(value) || !Number.isFinite(day(value.slice(0, 10)))) return NaN;
  return Date.parse(value);
}
function plain(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.trim() !== value || [...value].length > 400 || new TextEncoder().encode(value).length > 2000) return false;
  if (/[<>\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value)) return false;
  if (/(?:https?:\/\/|www\.|mailto:|tel:|data:|javascript:)/i.test(value) || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return false;
  if (/(?:-----BEGIN|\b(?:sk-|ghp_|github_pat_|AKIA)[A-Za-z0-9_-]{8,}|\b(?:password|access[_ -]?token|api[_ -]?key)\s*[:=])/i.test(value)) return false;
  return !Array.from(value.matchAll(/\+?\d[\d ().-]{7,}\d/g)).some(match => (match[0].match(/\d/g) || []).length >= 10);
}
/** Build a public-only canonical shape. Invalid snapshots never replace saved data. */
export function validateCommunitySnapshot(value: unknown, now = Date.now()): CommunitySnapshot | null {
  try {
    if (!Number.isFinite(now) || !exact(value, ['schemaVersion', 'campusId', 'version', 'updatedAt', 'updates'])) return null;
    if (value.schemaVersion !== 1 || value.campusId !== 'yongin' || !Number.isSafeInteger(value.version) || (value.version as number) < 1) return null;
    const updated = time(value.updatedAt);
    if (!Number.isFinite(updated) || updated > now || !Array.isArray(value.updates) || value.updates.length > 100 || new TextEncoder().encode(JSON.stringify(value)).length > 262144) return null;
    const updates: CommunityUpdate[] = [], ids = new Set<string>();
    for (const record of value.updates) {
      if (!exact(record, ['id', 'sourceId', 'kind', 'summary', 'sourceUrl', 'publishedAt', 'reviewedAt', 'validFrom', 'validThrough'], ['observedAt'])) return null;
      if (typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(record.id) || ids.has(record.id) || typeof record.sourceId !== 'string') return null;
      const source = getCommunitySource(record.sourceId);
      if (!source || (record.kind !== 'menu' && record.kind !== 'announcement') || (record.kind === 'menu' && source.kind !== 'menu') || (source.sourceType === 'official-menu' && record.kind !== 'menu')) return null;
      if (!exact(record.summary, ['en', 'ko', 'zh']) || !plain(record.summary.en) || !plain(record.summary.ko) || !plain(record.summary.zh) || !isCommunityPermalink(record.sourceUrl, record.sourceId)) return null;
      const reviewed = time(record.reviewedAt), observed = time(record.observedAt), published = time(record.publishedAt);
      if (!Number.isFinite(reviewed) || reviewed > updated) return null;
      if (record.publishedAt === null) {
        if (source.sourceType !== 'official-menu' || !Number.isFinite(observed) || observed > reviewed) return null;
      } else if (!Number.isFinite(published) || published > reviewed) return null;
      if ('observedAt' in record && (source.sourceType !== 'official-menu' || !Number.isFinite(observed) || observed > reviewed || (Number.isFinite(published) && published > observed))) return null;
      const from = day(record.validFrom), through = day(record.validThrough);
      if (!Number.isFinite(from) || !Number.isFinite(through) || through < from || (through - from) / DAY + 1 > (record.kind === 'menu' ? 7 : 366)) return null;
      if (source.sourceType === 'official-menu') {
        const monday = day(record.sourceUrl.slice(-10).replace(/\./g, '-'));
        if (!Number.isFinite(monday) || from < monday || through > monday + 6 * DAY) return null;
      }
      ids.add(record.id);
      updates.push({ id: record.id, sourceId: source.id, kind: record.kind, summary: { en: record.summary.en, ko: record.summary.ko, zh: record.summary.zh }, sourceUrl: record.sourceUrl,
        publishedAt: record.publishedAt as string | null, reviewedAt: record.reviewedAt as string, validFrom: record.validFrom as string, validThrough: record.validThrough as string,
        ...('observedAt' in record ? { observedAt: record.observedAt as string } : {}) });
    }
    return { schemaVersion: 1, campusId: 'yongin', version: value.version as number, updatedAt: value.updatedAt as string, updates };
  } catch { return null; }
}
/** The same version may be delivered again only with the same reviewed content. */
export function acceptCommunitySnapshot(candidate: unknown, previous: CommunitySnapshot | null, now = Date.now()): CommunitySnapshot | null {
  const next = validateCommunitySnapshot(candidate, now);
  if (!next || (previous && (next.version < previous.version || Date.parse(next.updatedAt) < Date.parse(previous.updatedAt) || (next.version === previous.version && JSON.stringify(next) !== JSON.stringify(previous))))) return null;
  return next;
}
