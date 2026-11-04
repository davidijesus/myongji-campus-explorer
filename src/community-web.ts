import { acceptCommunitySnapshot, CommunitySnapshot, CommunityStatus } from './community-sync';

/** Public read-only feed. Neither the page nor saved data can select a different URL. */
export const COMMUNITY_FEED_URL = 'https://davidijesus.github.io/myongji-campus-explorer/menus/yongin.json';
export const COMMUNITY_CACHE_KEY = 'mce-community-yongin-v1';
export const COMMUNITY_AUTO_INTERVAL = 15 * 60 * 1000;
export const COMMUNITY_REQUEST_TIMEOUT = 15000;
const MAX_BYTES = 256 * 1024;

export type CommunityWebState = {
  status: CommunityStatus;
  snapshot?: CommunitySnapshot;
  reason?: string;
};
export type CommunityWebStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type CommunityWebOptions = {
  storage: CommunityWebStorage | null;
  receive: (state: CommunityWebState) => void;
  /** Dependencies are injectable for deterministic local tests, never through UI input. */
  fetch?: typeof fetch;
  now?: () => number;
  setTimeout?: (callback: () => void, delay: number) => number;
  clearTimeout?: (handle: number) => void;
};
export type CommunityWebClient = {
  start(): void;
  resume(): void;
  pause(): void;
  refresh(): void;
  close(): void;
};

class FeedFailure extends Error {
  constructor(readonly reason: string) { super(reason); }
}

/**
 * Foreground-only web companion to the native community client. The PWA's
 * immutable shell cache deliberately does not own this changing JSON feed.
 */
export function createCommunityWebClient(options: CommunityWebOptions): CommunityWebClient {
  const fetchFeed = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const now = options.now ?? Date.now;
  const later = options.setTimeout ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clearLater = options.clearTimeout ?? (handle => globalThis.clearTimeout(handle));
  let active = false, closed = false, cacheLoaded = false;
  let current: CommunitySnapshot | null = null;
  let lastAttempt: number | null = null;
  type Operation = { abort: AbortController; cancel: () => void; timer: number; previousAttempt: number | null };
  let operation: Operation | null = null;

  function emit(status: CommunityStatus, reason?: string): void {
    if (closed) return;
    options.receive({ status, ...(current ? { snapshot: current } : {}), ...(reason ? { reason } : {}) });
  }

  function savedSnapshot(): CommunitySnapshot | null {
    if (!options.storage) throw new FeedFailure('cache_read');
    const raw = options.storage.getItem(COMMUNITY_CACHE_KEY);
    if (raw === null) return null;
    if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new FeedFailure('invalid_snapshot');
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new FeedFailure('invalid_snapshot'); }
    const valid = acceptCommunitySnapshot(parsed, null, now());
    if (!valid) throw new FeedFailure('invalid_snapshot');
    return valid;
  }

  function loadCache(): void {
    try {
      const saved = savedSnapshot();
      if (saved) {
        const accepted = acceptCommunitySnapshot(saved, current, now());
        if (accepted) current = accepted;
      }
      emit(current ? 'cached' : 'idle');
    } catch (error) {
      emit('error', error instanceof FeedFailure ? error.reason : 'cache_read');
    }
    cacheLoaded = true;
  }

  async function download(signal: AbortSignal): Promise<unknown> {
    const response = await fetchFeed(COMMUNITY_FEED_URL, {
      method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal,
    });
    if (response.redirected || (response.url && response.url !== COMMUNITY_FEED_URL)) throw new FeedFailure('redirect');
    // We do not send a conditional validator: a bare 304 is not proof that our
    // particular saved snapshot is the representation being confirmed.
    if (response.status !== 200) throw new FeedFailure('http');
    if (!/^application\/json(?:\s*;\s*charset="?utf-8"?)?\s*$/i.test(response.headers.get('Content-Type') ?? '')) throw new FeedFailure('content_type');
    const length = response.headers.get('Content-Length');
    if (length !== null && /^\d+$/.test(length) && Number(length) > MAX_BYTES) throw new FeedFailure('too_large');
    if (!response.body) throw new FeedFailure('invalid_snapshot');
    const reader = response.body.getReader();
    const cancelRead = () => { void reader.cancel().catch(() => undefined); };
    signal.addEventListener('abort', cancelRead, { once: true });
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0, body = '';
    try {
      while (true) {
        if (signal.aborted) throw new FeedFailure('cancelled');
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_BYTES) throw new FeedFailure('too_large');
        body += decoder.decode(chunk.value, { stream: true });
      }
      if (signal.aborted) throw new FeedFailure('cancelled');
      body += decoder.decode();
      return JSON.parse(body) as unknown;
    } catch (error) {
      try { await reader.cancel(); } catch { /* Transport cancellation is best effort. */ }
      if (error instanceof FeedFailure) throw error;
      throw new FeedFailure('invalid_snapshot');
    } finally { signal.removeEventListener('abort', cancelRead); reader.releaseLock(); }
  }

  function request(manual: boolean): void {
    if (closed || !active || operation) return;
    if (!cacheLoaded) loadCache();
    const instant = now();
    if (!Number.isFinite(instant)) { emit('error', 'clock'); return; }
    if (!manual && lastAttempt !== null && instant >= lastAttempt && instant - lastAttempt < COMMUNITY_AUTO_INTERVAL) return;
    const previousAttempt = lastAttempt;
    lastAttempt = instant;
    const abort = new AbortController();
    let cancel!: () => void;
    const cancelled = new Promise<never>((_, reject) => { cancel = () => reject(new FeedFailure('cancelled')); });
    let timeout!: number;
    const timedOut = new Promise<never>((_, reject) => {
      timeout = later(() => { abort.abort(); reject(new FeedFailure('timeout')); }, COMMUNITY_REQUEST_TIMEOUT);
    });
    const pending: Operation = { abort, cancel, timer: timeout, previousAttempt };
    operation = pending;
    emit('loading');
    Promise.race([download(abort.signal), cancelled, timedOut]).then(value => {
      if (closed || !active || operation !== pending) return;
      // Re-read before committing. Another tab may already have retained a
      // newer snapshot while this request was in flight.
      let persistent: CommunitySnapshot | null = null;
      try { persistent = savedSnapshot(); }
      catch (error) {
        // A structurally corrupt cache may be repaired by a valid response;
        // inability to read storage must not be treated as an empty cache.
        if (!(error instanceof FeedFailure) || error.reason !== 'invalid_snapshot') throw new FeedFailure('cache_read');
      }
      if (persistent) {
        const newer = acceptCommunitySnapshot(persistent, current, now());
        if (newer) current = newer;
      }
      const accepted = acceptCommunitySnapshot(value, current, now());
      if (!accepted || (persistent && !acceptCommunitySnapshot(accepted, persistent, now()))) throw new FeedFailure('invalid_snapshot');
      const serialized = JSON.stringify(accepted);
      if (!persistent || serialized !== JSON.stringify(persistent)) {
        try {
          if (!options.storage) throw new Error('Storage unavailable');
          options.storage.setItem(COMMUNITY_CACHE_KEY, serialized);
        } catch { throw new FeedFailure('cache_write'); }
      }
      current = accepted;
      emit('updated');
    }).catch(error => {
      if (closed || !active || operation !== pending) return;
      emit('error', error instanceof FeedFailure ? error.reason : 'network');
    }).finally(() => {
      clearLater(pending.timer);
      pending.abort.abort();
      if (operation === pending) operation = null;
    });
  }

  function resume(): void {
    if (closed) return;
    active = true;
    if (!operation) loadCache();
    request(false);
  }
  function pause(): void {
    if (closed) return;
    active = false;
    const pending = operation;
    if (pending) {
      operation = null;
      lastAttempt = pending.previousAttempt;
      clearLater(pending.timer);
      pending.cancel();
      pending.abort.abort();
      emit('cancelled');
    }
  }
  return { start: resume, resume, pause, refresh: () => request(true), close: () => { pause(); closed = true; } };
}
