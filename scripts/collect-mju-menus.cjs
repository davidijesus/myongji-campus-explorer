#!/usr/bin/env node
'use strict';

// Public allowlisted HTML only. Output is private, unreviewed evidence, never a feed.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const { OFFICIAL_SOURCES, officialMenuUrl, parseOfficialSourceUrl, parseTimestamp } = require('./import-community.cjs');
const MAX_HTML_BYTES = 128 * 1024;
const TIMEOUT_MS = 15000;
const DAY_MS = 86400000;
const MAX_CACHE_BYTES = 256 * 1024;
const DEFAULT_CACHE = path.resolve(__dirname, '../build/community-http-cache');
const EMPTY = '등록된 식단내용이(가) 없습니다.';
const HEADERS = ['요일', '식단구분', '식단제목', '식단내용', '기타정보'];
const MEALS = Object.freeze({ '조식': 'breakfast', '중식': 'lunch', '석식': 'dinner' });
const TITLES = Object.freeze({
  'mju-menu-library': '자연캠퍼스 명진당 식당(Myongjin-Library Restaurant)',
  'mju-menu-student': '자연캠퍼스 학생회관 식당(Student Union Restaurant)',
  'mju-menu-dorm': '자연캠퍼스 생활관식당(복지동)',
});

function failure(code, message) { return Object.assign(new Error(message), { code }); }
function parseFail(message) { throw failure('HTML_FORMAT', message); }
function decodeHtml(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (entity[0] !== '#') {
      if (!Object.hasOwn(named, entity.toLowerCase())) parseFail('Unsupported HTML entity');
      return named[entity.toLowerCase()];
    }
    const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    if (number < 32 || number > 0x10ffff || (number >= 0xd800 && number <= 0xdfff)) parseFail('Invalid HTML character reference');
    return String.fromCodePoint(number);
  });
}
function plainText(html) {
  if (/<\s*(?:script|style|iframe|object|embed|svg|math)\b/i.test(html)) parseFail('Unexpected active markup inside menu text');
  const text = decodeHtml(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:b|strong|em|i|span|p|div|sup|sub)\b[^>]*>/gi, ' '));
  if (/<[^>]*>/.test(text)) parseFail('Unexpected markup inside menu text');
  const normalized = text.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  if (normalized.length > 6000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized)) parseFail('Menu cell exceeds the text contract');
  return normalized;
}
function attrs(raw) {
  const result = {};
  let end = 0;
  const pattern = /([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of raw.matchAll(pattern)) {
    if (raw.slice(end, match.index).trim()) parseFail('Unsupported HTML attribute syntax');
    const key = match[1].toLowerCase();
    if (Object.hasOwn(result, key)) parseFail('Duplicate HTML attribute');
    result[key] = decodeHtml(match[2] ?? match[3] ?? match[4]);
    end = match.index + match[0].length;
  }
  if (raw.slice(end).replace(/\/$/, '').trim()) parseFail('Unsupported HTML attribute syntax');
  return result;
}
function elements(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi'))].map(match => ({ attributes: attrs(match[1]), content: match[2], raw: match[0], index: match.index }));
}
function one(values, label) {
  if (values.length !== 1) parseFail(`Expected one ${label}`);
  return values[0];
}
function cleanOuter(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
}

function parseMenuHtml(input, sourceId, sourceUrl) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  if (bytes.length > MAX_HTML_BYTES) throw failure('BODY_LIMIT', 'HTML exceeds byte limit');
  let decoded;
  try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw failure('ENCODING', 'HTML is not valid UTF-8'); }
  const week = parseOfficialSourceUrl(sourceUrl, sourceId);
  const html = cleanOuter(decoded);
  if (!/<div\b[^>]*\bid=["']_JW_diet_basic["']/i.test(html)) parseFail('Missing official diet wrapper');
  const paragraphs = elements(html, 'p');
  const title = plainText(one(paragraphs.filter(element => element.attributes.class === 'title'), 'cafeteria title').content).replace(/\n/g, ' ');
  if (title !== TITLES[sourceId]) parseFail('Unexpected cafeteria identity');
  const dateRange = plainText(one(paragraphs.filter(element => element.attributes.class === 'date'), 'displayed week').content);
  const end = new Date(week.mondayTime + 6 * DAY_MS).toISOString().slice(0, 10);
  const short = date => date.slice(5).replace('-', '.');
  if (dateRange.replace(/\s+/g, '') !== `${short(week.monday)}~${short(end)}`) parseFail('Displayed week differs from requested week');
  const form = one(elements(html, 'form').filter(element => element.attributes.id === 'viewForm'), 'menu form');
  if (form.attributes.action !== `/diet/mjukr/${week.endpoint}/view.do`) parseFail('Form source differs from requested cafeteria');
  const inputs = [...form.content.matchAll(/<input\b([^>]*)>/gi)].map(match => attrs(match[1]));
  const monday = one(inputs.filter(input => input.name === 'monday'), 'Monday input');
  if (monday.value !== week.monday.replace(/-/g, '.')) parseFail('Returned Monday differs from requested week');
  const table = one(elements(form.content, 'table'), 'menu table');
  if (plainText(one(elements(table.content, 'caption'), 'table caption').content) !== '일주일간 식단 안내') parseFail('Unexpected table caption');
  const header = one(elements(table.content, 'thead'), 'table header');
  const headerNames = elements(header.content, 'th').map(cell => plainText(cell.content));
  if (JSON.stringify(headerNames) !== JSON.stringify(HEADERS)) parseFail('Unexpected menu columns');
  const body = one(elements(table.content, 'tbody'), 'table body');
  const rows = elements(body.content, 'tr');
  if (!rows.length || rows.length > 100) parseFail('Unexpected number of menu rows');
  if (body.content.replace(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi, '').trim()) parseFail('Unrecognized content in table body');
  const grid = [];
  const occupied = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    grid[rowIndex] = occupied[rowIndex] || [];
    const row = rows[rowIndex];
    const cells = [...row.content.matchAll(/<(th|td)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)];
    if (!cells.length || row.content.replace(/<(th|td)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').trim()) parseFail('Malformed menu cells');
    let column = 0;
    for (const cell of cells) {
      while (grid[rowIndex][column]) column++;
      const attributes = attrs(cell[2]);
      const rowSpan = attributes.rowspan === undefined ? 1 : Number(attributes.rowspan);
      const colSpan = attributes.colspan === undefined ? 1 : Number(attributes.colspan);
      if (!Number.isInteger(rowSpan) || rowSpan < 1 || rowSpan > 20 || rowIndex + rowSpan > rows.length || !Number.isInteger(colSpan) || colSpan < 1 || colSpan > 5 || column + colSpan > 5) parseFail('Invalid table span');
      const value = { text: plainText(cell[3]), rowSpan, colSpan, tag: cell[1].toLowerCase() };
      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset++) {
        const target = rowIndex + rowOffset;
        if (!occupied[target]) occupied[target] = target === rowIndex ? grid[rowIndex] : [];
        for (let colOffset = 0; colOffset < colSpan; colOffset++) {
          if (occupied[target][column + colOffset]) parseFail('Overlapping table span');
          occupied[target][column + colOffset] = value;
        }
      }
      column += colSpan;
    }
    if (grid[rowIndex].length !== 5 || Array.from({ length: 5 }, (_, index) => grid[rowIndex][index]).some(value => !value)) parseFail('Menu row does not have five logical columns');
  }
  const dates = Array.from({ length: 7 }, (_, index) => new Date(week.mondayTime + index * DAY_MS).toISOString().slice(0, 10));
  const records = [], emptyRows = [], seen = new Set();
  for (const cells of grid) {
    const dateMatch = /^(\d{2}\.\d{2})\s*\(\s*([월화수목금토일])\s*\)$/.exec(cells[0].text.replace(/\n/g, ' '));
    if (!dateMatch || cells[0].tag !== 'th' || cells[0].colSpan !== 1) parseFail('Unrecognized dated menu row');
    const date = dates.find(value => short(value) === dateMatch[1]);
    if (!date) parseFail('Menu row outside requested week');
    const expectedDay = '일월화수목금토'[new Date(`${date}T00:00:00Z`).getUTCDay()];
    if (dateMatch[2] !== expectedDay) parseFail('Menu weekday differs from calendar date');
    const meal = MEALS[cells[1].text];
    if (!meal || cells[1].colSpan !== 1) parseFail('Unrecognized meal label');
    const key = `${date}-${meal}`;
    if (seen.has(key)) parseFail('Duplicate date/meal; manual parser review required');
    seen.add(key);
    if (cells[2].colSpan === 3 && cells[2] === cells[3] && cells[3] === cells[4] && cells[2].text === EMPTY) {
      emptyRows.push({ date, meal });
      continue;
    }
    if (cells.slice(2).some(cell => cell.colSpan !== 1) || !cells[3].text || cells[3].text === EMPTY || cells[3].text === '-') parseFail('Unrecognized empty or merged menu content');
    records.push({ date, meal, originalTitle: cells[2].text, originalText: cells[3].text, otherInfo: cells[4].text });
  }
  return { weekMonday: week.monday, weekThrough: end, cafeteriaTitle: title, status: records.length ? 'candidates' : 'no-records', records, emptyRows };
}

function safeEtag(value) {
  return typeof value === 'string' && /^(?:W\/)?"[\x21\x23-\x7e]{0,200}"$/.test(value) ? value : null;
}
function safeLastModified(value) {
  return typeof value === 'string' && /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
}
function fetchOfficialMenu(sourceId, monday, options = {}) {
  const url = officialMenuUrl(sourceId, monday);
  const request = options.request || https.request;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const headers = { Accept: 'text/html', 'Accept-Encoding': 'identity', 'User-Agent': 'MyongjiCampusExplorer-local-menu-review/1' };
  const etag = safeEtag(options.etag), lastModified = safeLastModified(options.lastModified);
  if (etag) headers['If-None-Match'] = etag;
  else if (lastModified) headers['If-Modified-Since'] = lastModified;
  return new Promise((resolve, reject) => {
    let req, timer, settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { req?.destroy(); reject(error); } else resolve(value);
    };
    timer = setTimeout(() => finish(failure('TIMEOUT', 'Official menu request timed out')), timeoutMs);
    try {
      req = request(url, { method: 'GET', headers }, response => {
        const metadata = { statusCode: response.statusCode, etag: safeEtag(response.headers.etag), lastModified: safeLastModified(response.headers['last-modified']), conditionalRequest: Boolean(etag || lastModified) };
        if (response.statusCode === 304 && metadata.conditionalRequest) {
          if (etag && response.headers.etag !== undefined && (!metadata.etag || etag.replace(/^W\//, '') !== metadata.etag.replace(/^W\//, ''))) {
            response.resume();
            return finish(failure('CACHE_VALIDATOR', 'Not-modified response ETag differs from the requested representation'));
          }
          response.on('error', () => finish(failure('NETWORK', 'Official menu response could not be read')));
          response.on('aborted', () => finish(failure('NETWORK', 'Official menu response ended early')));
          response.on('end', () => finish(null, { ...metadata, bytes: Buffer.alloc(0), responseBodyBytes: 0, contentType: null }));
          response.resume();
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          return finish(failure(response.statusCode >= 300 && response.statusCode < 400 ? 'REDIRECT' : 'HTTP_STATUS', `Official menu returned HTTP ${response.statusCode}`));
        }
        if (!/^text\/html(?:\s*;|$)/i.test(String(response.headers['content-type'] || '')) || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
          response.resume();
          return finish(failure('CONTENT_TYPE', 'Expected uncompressed HTML from official menu source'));
        }
        const length = Number(response.headers['content-length']);
        if (Number.isFinite(length) && length > MAX_HTML_BYTES) { response.resume(); return finish(failure('BODY_LIMIT', 'Official HTML exceeds byte limit')); }
        const chunks = []; let bytes = 0;
        response.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > MAX_HTML_BYTES) { response.destroy(); return finish(failure('BODY_LIMIT', 'Official HTML exceeds byte limit')); }
          chunks.push(Buffer.from(chunk));
        });
        response.on('end', () => finish(null, { ...metadata, bytes: Buffer.concat(chunks), responseBodyBytes: bytes, contentType: String(response.headers['content-type']) }));
        response.on('error', () => finish(failure('NETWORK', 'Official menu response could not be read')));
        response.on('aborted', () => finish(failure('NETWORK', 'Official menu response ended early')));
      });
      req.on('error', () => finish(failure('NETWORK', 'Official menu could not be reached')));
      req.end();
    } catch { finish(failure('NETWORK', 'Official menu request failed')); }
  });
}

function cachePath(directory, sourceId, monday) {
  officialMenuUrl(sourceId, monday);
  return path.join(directory, `${sourceId}-${monday}.json`);
}
function readCache(directory, sourceId, monday) {
  if (!directory) return { state: 'disabled', entry: null };
  try {
    const file = cachePath(directory, sourceId, monday);
    const descriptor = fs.openSync(file, 'r');
    let bytes;
    try {
      const info = fs.fstatSync(descriptor);
      if (!info.isFile() || info.size > MAX_CACHE_BYTES) throw new Error('Invalid cache file');
      const buffer = Buffer.alloc(MAX_CACHE_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const count = fs.readSync(descriptor, buffer, length, buffer.length - length, null);
        if (!count) break;
        length += count;
      }
      if (length > MAX_CACHE_BYTES) throw new Error('Invalid cache file');
      bytes = buffer.subarray(0, length);
    } finally { fs.closeSync(descriptor); }
    const entry = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    const keys = ['schemaVersion', 'sourceUrl', 'observedAt', 'validatedAt', 'etag', 'lastModified', 'rawSha256', 'rawBase64'];
    if (!entry || Object.keys(entry).length !== keys.length || keys.some(key => !Object.hasOwn(entry, key)) || entry.schemaVersion !== 1 || entry.sourceUrl !== officialMenuUrl(sourceId, monday)) throw new Error('Invalid cache contract');
    if ((entry.etag !== null && safeEtag(entry.etag) !== entry.etag) || (entry.lastModified !== null && safeLastModified(entry.lastModified) !== entry.lastModified)) throw new Error('Invalid cache validator');
    const observed = parseTimestamp(entry.observedAt, 'observedAt'), validated = parseTimestamp(entry.validatedAt, 'validatedAt');
    if (observed > validated || validated > Date.now()) throw new Error('Invalid cache time');
    if (typeof entry.rawBase64 !== 'string' || typeof entry.rawSha256 !== 'string') throw new Error('Invalid cache body');
    const raw = Buffer.from(entry.rawBase64, 'base64');
    if (raw.length > MAX_HTML_BYTES || raw.toString('base64') !== entry.rawBase64 || crypto.createHash('sha256').update(raw).digest('hex') !== entry.rawSha256) throw new Error('Invalid cache integrity');
    return { state: 'available', entry: { ...entry, bytes: raw } };
  } catch (error) { return { state: error.code === 'ENOENT' ? 'missing' : 'invalid', entry: null }; }
}
function writeCache(directory, sourceId, monday, entry) {
  const file = cachePath(directory, sourceId, monday);
  const temporary = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(entry), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function lockCache(directory) {
  if (!directory) return () => {};
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'collector.lock');
  let descriptor;
  try { descriptor = fs.openSync(file, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw failure('CACHE_BUSY', 'Another collector holds this cache; retry after it finishes'); throw error; }
  try { fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })); }
  catch (error) { fs.closeSync(descriptor); fs.unlinkSync(file); throw error; }
  return () => { fs.closeSync(descriptor); fs.unlinkSync(file); };
}

function makeCandidates(parsed, sourceId, sourceUrl, observedAt, evaluationTime) {
  const now = evaluationTime ?? (observedAt === null ? Date.now() : parseTimestamp(observedAt, 'observedAt'));
  const today = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
  return {
    schemaVersion: 1, reviewState: 'unreviewed', sourceId, sourceUrl, observedAt, publishedAt: null,
    status: parsed.status, weekMonday: parsed.weekMonday, weekThrough: parsed.weekThrough,
    temporalState: parsed.weekThrough < today ? 'past' : parsed.weekMonday > today ? 'future' : 'current',
    temporalScope: 'requested-week', evaluatedForKstDate: today,
    validTodayCount: parsed.records.filter(record => record.date === today).length,
    cafeteriaTitle: parsed.cafeteriaTitle, emptyRows: parsed.emptyRows,
    candidates: parsed.records.map(record => ({
      id: `${sourceId}-${record.date}-${record.meal}`, sourceId, kind: 'menu', sourceUrl,
      publishedAt: null, observedAt, reviewedAt: null, validFrom: record.date, validThrough: record.date,
      temporalState: record.date < today ? 'past' : record.date > today ? 'future' : 'current',
      meal: record.meal, originalTitle: record.originalTitle, originalText: record.originalText, otherInfo: record.otherInfo,
      summary: { en: null, ko: null, zh: null }, needsReview: ['source-content', 'validity', 'summary-en-ko-zh', 'redistribution', ...(observedAt === null ? ['observation-timestamp'] : [])],
    })),
  };
}

function readHtmlFile(file) {
  const descriptor = fs.openSync(file, 'r');
  try {
    if (!fs.fstatSync(descriptor).isFile()) throw failure('LOCAL_FILE', 'Expected a regular HTML file');
    const bytes = Buffer.alloc(MAX_HTML_BYTES + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (!read) break;
      length += read;
    }
    if (length > MAX_HTML_BYTES) throw failure('BODY_LIMIT', 'Local HTML exceeds byte limit');
    return bytes.subarray(0, length);
  } finally { fs.closeSync(descriptor); }
}

async function collect(options) {
  const sourceIds = options.sourceId ? [options.sourceId] : Object.keys(OFFICIAL_SOURCES);
  for (const id of sourceIds) officialMenuUrl(id, options.monday);
  if (options.htmlFile && sourceIds.length !== 1) throw failure('ARGUMENTS', 'A local HTML file requires one explicit source');
  const cacheDir = !options.htmlFile && options.cacheDir ? path.resolve(options.cacheDir) : null;
  const unlock = lockCache(cacheDir);
  try {
    const outputDir = path.resolve(options.outputDir);
    fs.mkdirSync(path.dirname(outputDir), { recursive: true });
    fs.mkdirSync(outputDir, { mode: 0o700 }); // Exclusive: preserve all prior captures.
    const results = [];
    for (const sourceId of sourceIds) {
      const sourceUrl = officialMenuUrl(sourceId, options.monday);
      const result = { sourceId, sourceUrl, attemptedAt: new Date().toISOString(), observedAt: null, mode: options.htmlFile ? 'local-fixture' : 'public-get', status: 'fetch-error' };
      const cached = readCache(cacheDir, sourceId, options.monday);
      result.cacheState = cached.state;
      try {
        const fetched = options.htmlFile ? { bytes: readHtmlFile(options.htmlFile), statusCode: null, contentType: null, responseBodyBytes: 0, conditionalRequest: false } : await fetchOfficialMenu(sourceId, options.monday, { ...options.fetchOptions, etag: cached.entry?.etag, lastModified: cached.entry?.lastModified });
        if (fetched.statusCode === 304 && !cached.entry) throw failure('CACHE_INVALID', 'A not-modified response has no valid local body');
        const bytes = fetched.statusCode === 304 ? cached.entry.bytes : fetched.bytes;
        result.validatedAt = options.htmlFile ? null : new Date().toISOString();
        // A 304 checks freshness; it does not claim a new body was downloaded.
        result.observedAt = options.htmlFile ? null : fetched.statusCode === 304 ? cached.entry.observedAt : result.validatedAt;
        result.httpStatus = fetched.statusCode;
        result.contentType = fetched.contentType;
        result.responseBodyBytes = fetched.responseBodyBytes;
        result.conditionalRequest = fetched.conditionalRequest;
        result.rawFile = `${sourceId}.html`;
        result.rawBytes = bytes.length;
        result.rawSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        result.contentChanged = cached.entry ? cached.entry.rawSha256 !== result.rawSha256 : null;
        result.cacheReuse = fetched.statusCode === 304 ? 'revalidated-body' : result.contentChanged === false ? 'same-body-downloaded' : 'none';
        result.etagSupported = Boolean(fetched.etag || (fetched.statusCode === 304 && cached.entry.etag));
        result.lastModifiedSupported = Boolean(fetched.lastModified || (fetched.statusCode === 304 && cached.entry.lastModified));
        result.status = 'capture-error';
        fs.writeFileSync(path.join(outputDir, result.rawFile), bytes, { mode: 0o600, flag: 'wx' });
        let parsed;
        // Reparse bounded cached bytes: corrupted content and changed parser rules fail closed.
        try { parsed = parseMenuHtml(bytes, sourceId, sourceUrl); } catch (error) { result.status = 'parse-error'; throw error; }
        result.menuSha256 = crypto.createHash('sha256').update(JSON.stringify(parsed)).digest('hex');
        result.menuContentChanged = null;
        if (cached.entry) {
          try {
            const previousMenu = parseMenuHtml(cached.entry.bytes, sourceId, sourceUrl);
            result.menuContentChanged = crypto.createHash('sha256').update(JSON.stringify(previousMenu)).digest('hex') !== result.menuSha256;
          } catch { /* An invalid old parse never becomes a source of fresh candidates. */ }
        }
        const candidates = makeCandidates(parsed, sourceId, sourceUrl, result.observedAt, Date.now());
        result.candidateCount = candidates.candidates.length;
        result.emptyCount = candidates.emptyRows.length;
        result.temporalState = candidates.temporalState;
        result.temporalScope = candidates.temporalScope;
        result.evaluatedForKstDate = candidates.evaluatedForKstDate;
        result.validTodayCount = candidates.validTodayCount;
        result.candidatesFile = `${sourceId}.candidates.json`;
        fs.writeFileSync(path.join(outputDir, result.candidatesFile), `${JSON.stringify(candidates, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
        result.status = candidates.status;
        if (cacheDir) {
          try {
            writeCache(cacheDir, sourceId, options.monday, {
              schemaVersion: 1, sourceUrl, observedAt: result.observedAt, validatedAt: result.validatedAt,
              etag: fetched.etag || (fetched.statusCode === 304 ? cached.entry.etag : null),
              lastModified: fetched.lastModified || (fetched.statusCode === 304 ? cached.entry.lastModified : null),
              rawSha256: result.rawSha256, rawBase64: bytes.toString('base64'),
            });
          } catch { result.cacheWriteError = 'CACHE_WRITE'; }
        }
      } catch (error) {
        result.errorCode = error.code || 'COLLECTION_FAILED';
        result.error = ['HTML_FORMAT', 'BODY_LIMIT', 'ENCODING', 'TIMEOUT', 'NETWORK', 'REDIRECT', 'HTTP_STATUS', 'CONTENT_TYPE', 'LOCAL_FILE', 'CACHE_INVALID', 'CACHE_VALIDATOR'].includes(error.code) ? error.message : 'Capture could not be completed';
      }
      results.push(result);
    }
    const manifest = { schemaVersion: 1, reviewState: 'unreviewed', collector: 'scripts/collect-mju-menus.cjs', collectedAt: new Date().toISOString(), monday: options.monday, results };
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    return { outputDir, manifest };
  } finally { unlock(); }
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (flag === '--no-cache' && !Object.hasOwn(args, flag)) { args[flag] = true; index--; continue; }
    if (!['--monday', '--source', '--output-dir', '--html', '--cache-dir'].includes(flag) || !argv[index + 1] || argv[index + 1].startsWith('--') || Object.hasOwn(args, flag)) throw failure('ARGUMENTS', 'Use --monday DATE, optional --source ID, --output-dir NEW_DIRECTORY and --html FILE');
    args[flag] = argv[index + 1];
  }
  if (!args['--monday']) throw failure('ARGUMENTS', '--monday YYYY-MM-DD is required');
  const sourceId = args['--source'];
  const monday = args['--monday'];
  if (args['--html'] && !sourceId) throw failure('ARGUMENTS', '--html requires --source');
  if (args['--no-cache'] && args['--cache-dir']) throw failure('ARGUMENTS', '--no-cache and --cache-dir cannot be combined');
  for (const id of sourceId ? [sourceId] : Object.keys(OFFICIAL_SOURCES)) officialMenuUrl(id, monday);
  return { monday, sourceId, htmlFile: args['--html'], cacheDir: args['--html'] || args['--no-cache'] ? null : args['--cache-dir'] || DEFAULT_CACHE, outputDir: args['--output-dir'] || path.resolve(__dirname, '../build/community-candidates', new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex')) };
}

async function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help) { process.stdout.write('Usage: node scripts/collect-mju-menus.cjs --monday YYYY-MM-DD [--source mju-menu-library|mju-menu-student|mju-menu-dorm] [--output-dir NEW_DIRECTORY] [--html FILE] [--cache-dir DIRECTORY | --no-cache]\nOutput is private, unreviewed evidence. No publication or recurring task is created.\n'); return 0; }
    const result = await collect(options);
    for (const item of result.manifest.results) process.stdout.write(`${item.sourceId}: ${item.status}; candidates=${item.candidateCount ?? 0}, empty rows=${item.emptyCount ?? 0}, valid today=${item.validTodayCount ?? 0}, response bytes=${item.responseBodyBytes ?? 'unknown'}${item.errorCode ? `, code=${item.errorCode}` : ''}\n`);
    process.stdout.write(`Private review files: ${result.outputDir}\n`);
    return result.manifest.results.some(item => item.status.endsWith('error')) ? 1 : 0;
  } catch (error) { process.stderr.write(`Menu collection failed: ${['ARGUMENTS', 'CACHE_BUSY'].includes(error.code) ? error.message : 'check the source, Monday and new output directory'}\n`); return 1; }
}

module.exports = { MAX_HTML_BYTES, MAX_CACHE_BYTES, DEFAULT_CACHE, TIMEOUT_MS, safeEtag, safeLastModified, cachePath, readCache, EMPTY, HEADERS, MEALS, TITLES, decodeHtml, parseMenuHtml, fetchOfficialMenu, makeCandidates, readHtmlFile, collect, parseArgs, main };
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; });
