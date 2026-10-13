#!/usr/bin/env node
'use strict';

// Local, review-first import. This program never fetches, authenticates or publishes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');

const SOURCES = Object.freeze({
  o_ulami: Object.freeze(['announcement']),
  mjhs_lounge: Object.freeze(['menu', 'announcement']),
  mju_lounge: Object.freeze(['menu', 'announcement']),
  mj_bokji_foodist: Object.freeze(['menu', 'announcement']),
  'mju-menu-library': Object.freeze(['menu']),
  'mju-menu-student': Object.freeze(['menu']),
  'mju-menu-dorm': Object.freeze(['menu']),
});
const OFFICIAL_SOURCES = Object.freeze({ 'mju-menu-library': '4', 'mju-menu-student': '5', 'mju-menu-dorm': '6' });
const LIMITS = Object.freeze({ inputBytes: 256 * 1024, records: 100, summaryCharacters: 400, summaryBytes: 2000, menuDays: 7, announcementDays: 366 });
const RECORD_KEYS = ['id', 'sourceId', 'kind', 'summary', 'sourceUrl', 'publishedAt', 'reviewedAt', 'validFrom', 'validThrough'];
const DAY_MS = 86400000;
const KST_MS = 9 * 3600000;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, 'build', 'community-review', 'community-updates.ts');

function invalid(field, reason) {
  // Do not echo untrusted content, secrets or full input records in errors.
  throw new Error(`${field}: ${reason}`);
}

function exactObject(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(field, 'expected a JSON object');
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some(key => !Object.hasOwn(value, key)) || actual.some(key => !keys.includes(key))) invalid(field, 'missing or unsupported fields');
}

function dateParts(year, month, day, field) {
  if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) invalid(field, 'date is outside the supported calendar range');
  const result = Date.UTC(year, month - 1, day);
  const check = new Date(result);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) invalid(field, 'invalid calendar date');
  return result;
}

function parseDay(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(field, 'expected YYYY-MM-DD, interpreted in Asia/Seoul');
  const [year, month, day] = value.split('-').map(Number);
  return dateParts(year, month, day, field);
}

function parseTimestamp(value, field) {
  if (typeof value !== 'string') invalid(field, 'expected an ISO timestamp with an explicit time zone');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) invalid(field, 'expected an ISO timestamp with seconds and Z or an explicit offset');
  const [, year, month, day, hour, minute, second, fraction, zone, sign, offsetHour, offsetMinute] = match;
  const base = dateParts(Number(year), Number(month), Number(day), field);
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) invalid(field, 'invalid clock time');
  const offsetHours = Number(offsetHour || 0);
  const offsetMinutes = Number(offsetMinute || 0);
  if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) invalid(field, 'invalid time-zone offset');
  const offset = zone === 'Z' ? 0 : (offsetHours * 60 + offsetMinutes) * (sign === '-' ? -1 : 1);
  const timestamp = base + Number(hour) * 3600000 + Number(minute) * 60000 + Number(second) * 1000 + Number((fraction || '').padEnd(3, '0')) - offset * 60000;
  if (!Number.isFinite(timestamp)) invalid(field, 'invalid timestamp');
  return timestamp;
}

function validateSummary(value, field) {
  exactObject(value, ['en', 'ko', 'zh'], field);
  const summary = {};
  for (const language of ['en', 'ko', 'zh']) {
    const text = value[language];
    const key = `${field}.${language}`;
    if (typeof text !== 'string' || text.trim() !== text || !text.trim()) invalid(key, 'expected nonempty, trimmed plain text');
    if (Array.from(text).length > LIMITS.summaryCharacters || Buffer.byteLength(text, 'utf8') > LIMITS.summaryBytes) invalid(key, 'summary exceeds the length limit');
    if (/[<>\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(text)) invalid(key, 'HTML, control characters or invalid Unicode are not allowed');
    if (/(?:https?:\/\/|www\.|mailto:|tel:|data:|javascript:)/i.test(text) || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) invalid(key, 'put only a public source permalink in sourceUrl; contact details and embedded URLs are not allowed');
    for (const match of text.matchAll(/\+?\d[\d ().-]{7,}\d/g)) {
      if ((match[0].match(/\d/g) || []).length >= 10) invalid(key, 'possible phone number; remove personal contact details before import');
    }
    if (/(?:-----BEGIN|\b(?:sk-|ghp_|github_pat_|AKIA)[A-Za-z0-9_-]{8,}|\b(?:password|access[_ -]?token|api[_ -]?key)\s*[:=])/i.test(text)) invalid(key, 'possible credential; remove it before import');
    summary[language] = text;
  }
  return summary;
}

function parseOfficialSourceUrl(value, sourceId, field = 'sourceUrl') {
  if (!Object.hasOwn(OFFICIAL_SOURCES, sourceId) || typeof value !== 'string') invalid(field, 'unknown official menu source');
  const match = /^https:\/\/www\.mju\.ac\.kr\/diet\/mjukr\/([456])\/view\.do\?monday=(\d{4})\.(\d{2})\.(\d{2})$/.exec(value);
  if (!match || match[1] !== OFFICIAL_SOURCES[sourceId]) invalid(field, 'expected the exact allowlisted official menu URL for this source');
  const monday = `${match[2]}-${match[3]}-${match[4]}`;
  const time = parseDay(monday, field);
  if (new Date(time).getUTCDay() !== 1) invalid(field, 'official menu URL must select a Monday');
  return { monday, mondayTime: time, endpoint: match[1] };
}

function officialMenuUrl(sourceId, monday) {
  const endpoint = OFFICIAL_SOURCES[sourceId];
  if (!endpoint || typeof monday !== 'string') invalid('sourceId', 'unknown official menu source');
  const url = `https://www.mju.ac.kr/diet/mjukr/${endpoint}/view.do?monday=${monday.replace(/-/g, '.')}`;
  parseOfficialSourceUrl(url, sourceId);
  return url;
}

function validateSourceUrl(value, sourceId, field) {
  if (Object.hasOwn(OFFICIAL_SOURCES, sourceId)) {
    parseOfficialSourceUrl(value, sourceId, field);
    return value;
  }
  if (typeof value !== 'string' || value.length > 200) invalid(field, 'expected an Instagram source URL');
  const story = /^https:\/\/(?:www\.)?instagram\.com\/stories\/(o_ulami|mjhs_lounge|mju_lounge|mj_bokji_foodist)\/(\d{1,32})\/?$/.exec(value);
  if (story) {
    if (story[1] !== sourceId) invalid(field, 'account in Story URL differs from sourceId');
    return `https://www.instagram.com/stories/${story[1]}/${story[2]}/`;
  }
  const match = /^https:\/\/(?:www\.)?instagram\.com\/(?:(o_ulami|mjhs_lounge|mju_lounge|mj_bokji_foodist)\/)?(p|reel)\/([A-Za-z0-9_-]{1,64})\/?$/.exec(value);
  if (!match) invalid(field, 'only exact HTTPS Instagram post, reel or account-scoped Story URLs are supported; no profiles, tracking parameters or credentials');
  if (match[1] && match[1] !== sourceId) invalid(field, 'account in permalink differs from sourceId');
  // Unscoped /p and /reel URLs do not identify their author. A human must check it.
  return `https://www.instagram.com/${match[1] ? `${match[1]}/` : ''}${match[2]}/${match[3]}/`;
}

function validateDocument(document, now = Date.now()) {
  if (!Number.isFinite(now)) invalid('now', 'invalid validation time');
  exactObject(document, ['schemaVersion', 'updates'], 'document');
  if (document.schemaVersion !== 1) invalid('schemaVersion', 'only version 1 is supported');
  if (!Array.isArray(document.updates) || document.updates.length > LIMITS.records) invalid('updates', `expected an array of at most ${LIMITS.records} records`);
  const ids = new Set();
  return document.updates.map((record, index) => {
    const field = `updates[${index}]`;
    exactObject(record, record && Object.hasOwn(record, 'observedAt') ? [...RECORD_KEYS, 'observedAt'] : RECORD_KEYS, field);
    if (typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(record.id)) invalid(`${field}.id`, 'expected a lowercase ID of 1–80 letters, numbers, hyphens or underscores');
    if (ids.has(record.id)) invalid(`${field}.id`, 'duplicate ID');
    ids.add(record.id);
    if (typeof record.sourceId !== 'string' || !Object.hasOwn(SOURCES, record.sourceId)) invalid(`${field}.sourceId`, 'unknown campus account');
    if (!SOURCES[record.sourceId].includes(record.kind)) invalid(`${field}.kind`, 'unsupported kind for this account');
    const summary = validateSummary(record.summary, `${field}.summary`);
    const sourceUrl = validateSourceUrl(record.sourceUrl, record.sourceId, `${field}.sourceUrl`);
    const official = Object.hasOwn(OFFICIAL_SOURCES, record.sourceId);
    if (record.publishedAt === null && !official) invalid(`${field}.publishedAt`, 'unknown publication time is only supported for official menu sources');
    if (Object.hasOwn(record, 'observedAt') && !official) invalid(`${field}.observedAt`, 'observation time is only supported for official menu sources');
    const published = record.publishedAt === null ? null : parseTimestamp(record.publishedAt, `${field}.publishedAt`);
    const observed = Object.hasOwn(record, 'observedAt') ? parseTimestamp(record.observedAt, `${field}.observedAt`) : null;
    if (published === null && observed === null) invalid(`${field}.observedAt`, 'required when publication time is unknown');
    const reviewed = parseTimestamp(record.reviewedAt, `${field}.reviewedAt`);
    if ((published !== null && published > now) || (observed !== null && observed > now) || reviewed > now) invalid(field, 'publication, observation and review timestamps must not be in the future');
    if ((published !== null && reviewed < published) || (observed !== null && reviewed < observed)) invalid(field, 'review must be at or after publication and observation');
    if (published !== null && observed !== null && observed < published) invalid(field, 'observation must be at or after publication');
    const from = parseDay(record.validFrom, `${field}.validFrom`);
    const through = parseDay(record.validThrough, `${field}.validThrough`);
    const days = (through - from) / DAY_MS + 1;
    const maximumDays = record.kind === 'menu' ? LIMITS.menuDays : LIMITS.announcementDays;
    if (days < 1 || days > maximumDays) invalid(field, `validity must span 1–${maximumDays} inclusive KST calendar days`);
    if (official) {
      const { mondayTime } = parseOfficialSourceUrl(sourceUrl, record.sourceId, `${field}.sourceUrl`);
      if (from < mondayTime || through > mondayTime + 6 * DAY_MS) invalid(field, 'official menu validity must be within the week selected by its source URL');
    }
    // Rebuild the exact permitted shape; input prototypes or extra data never reach the bundle.
    return { id: record.id, sourceId: record.sourceId, kind: record.kind, summary, sourceUrl, publishedAt: record.publishedAt, ...(observed !== null ? { observedAt: record.observedAt } : {}), reviewedAt: record.reviewedAt, validFrom: record.validFrom, validThrough: record.validThrough };
  });
}

function validateSnapshot(snapshot, now = Date.now()) {
  exactObject(snapshot, ['schemaVersion', 'campusId', 'version', 'updatedAt', 'updates'], 'snapshot');
  if (!Number.isFinite(now)) invalid('now', 'invalid validation time');
  if (snapshot.schemaVersion !== 1 || snapshot.campusId !== 'yongin') invalid('snapshot', 'expected schema version 1 and campusId yongin');
  if (!Number.isSafeInteger(snapshot.version) || snapshot.version < 1) invalid('snapshot.version', 'expected a positive safe integer');
  const updated = parseTimestamp(snapshot.updatedAt, 'snapshot.updatedAt');
  if (updated > now) invalid('snapshot.updatedAt', 'must not be in the future');
  const updates = validateDocument({ schemaVersion: 1, updates: snapshot.updates }, updated);
  const result = { schemaVersion: 1, campusId: 'yongin', version: snapshot.version, updatedAt: snapshot.updatedAt, updates };
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > LIMITS.inputBytes) invalid('snapshot', 'snapshot exceeds byte limit');
  return result;
}

function parseInput(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > LIMITS.inputBytes) invalid('input', `expected at most ${LIMITS.inputBytes} UTF-8 bytes`);
  let json;
  try { json = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { invalid('input', 'invalid UTF-8'); }
  try { return JSON.parse(json); } catch { invalid('input', 'invalid JSON'); }
}

function renderModule(updates) {
  const encoded = JSON.stringify(updates, null, 2).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `// Generated by scripts/import-community.cjs; review sources and translations before bundling.\n// Validation checks structure only, not authorship, availability or factual accuracy.\nimport type { CommunityUpdate } from './community';\n\nexport const COMMUNITY_UPDATES: CommunityUpdate[] = ${encoded};\n`;
}

function readBounded(file) {
  const descriptor = fs.openSync(file, 'r');
  try {
    if (!fs.fstatSync(descriptor).isFile()) invalid('input', 'expected a regular file');
    const bytes = Buffer.alloc(LIMITS.inputBytes + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (!read) break;
      length += read;
    }
    if (length > LIMITS.inputBytes) invalid('input', 'file exceeds byte limit');
    return bytes.subarray(0, length);
  } finally { fs.closeSync(descriptor); }
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (!['--input', '--output', '--snapshot-version'].includes(flag) || !argv[index + 1] || argv[index + 1].startsWith('--') || Object.hasOwn(options, flag.slice(2))) invalid('arguments', 'use --input FILE, optional --output FILE and optional --snapshot-version INTEGER exactly once');
    options[flag.slice(2)] = argv[index + 1];
  }
  if (!options.input) invalid('arguments', '--input is required');
  if (Object.hasOwn(options, 'snapshot-version') && (!/^[1-9]\d*$/.test(options['snapshot-version']) || !Number.isSafeInteger(Number(options['snapshot-version'])))) invalid('arguments', '--snapshot-version must be a positive safe integer');
  return options;
}

function importFile(inputFile, outputFile = DEFAULT_OUTPUT, now = Date.now(), snapshotVersion) {
  const input = path.resolve(inputFile);
  const output = path.resolve(outputFile);
  const auditPath = `${output}.audit.json`;
  const snapshotPath = snapshotVersion === undefined ? null : `${output}.snapshot.json`;
  const pathKey = file => process.platform === 'win32' ? file.toLowerCase() : file;
  if ([output, auditPath, snapshotPath].filter(Boolean).some(file => pathKey(input) === pathKey(file))) invalid('output', 'must differ from the input file');
  const bytes = readBounded(input);
  const updates = validateDocument(parseInput(bytes), now);
  const moduleText = renderModule(updates);
  const snapshot = snapshotVersion === undefined ? null : validateSnapshot({ schemaVersion: 1, campusId: 'yongin', version: snapshotVersion, updatedAt: new Date(now).toISOString(), updates }, now);
  const snapshotText = snapshot ? `${JSON.stringify(snapshot)}\n` : null;
  if (snapshotText && Buffer.byteLength(snapshotText, 'utf8') > LIMITS.inputBytes) invalid('snapshot', 'encoded snapshot exceeds byte limit');
  const counts = {};
  for (const record of updates) counts[record.sourceId] = (counts[record.sourceId] || 0) + 1;
  const todayKst = new Date(now + KST_MS).toISOString().slice(0, 10);
  const audit = {
    schemaVersion: 1,
    tool: 'scripts/import-community.cjs',
    validatedAt: new Date(now).toISOString(),
    sourceVerification: 'human-review-required',
    networkAccess: false,
    inputSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    outputSha256: crypto.createHash('sha256').update(moduleText, 'utf8').digest('hex'),
    ...(snapshotText ? { snapshotSha256: crypto.createHash('sha256').update(snapshotText, 'utf8').digest('hex'), snapshotVersion } : {}),
    records: updates.length,
    recordsBySource: counts,
    storySnapshots: updates.filter(record => record.sourceUrl.includes('/stories/')).length,
    validTodayKst: updates.filter(record => record.validFrom <= todayKst && record.validThrough >= todayKst).length,
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const created = [];
  try {
    // Never overwrite an existing source module, staging file or audit report.
    fs.writeFileSync(output, moduleText, { encoding: 'utf8', flag: 'wx' });
    created.push(output);
    if (snapshotPath) {
      fs.writeFileSync(snapshotPath, snapshotText, { encoding: 'utf8', flag: 'wx' });
      created.push(snapshotPath);
    }
    fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    for (const file of created.reverse()) fs.unlinkSync(file);
    throw error;
  }
  return { output, auditPath, audit, ...(snapshot ? { snapshotPath, snapshot } : {}) };
}

function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write('Usage: node scripts/import-community.cjs --input reviewed.json [--output build/community-review/community-updates.ts] [--snapshot-version INTEGER]\nLocal validation only. Default output is staging; existing files are never overwritten. See docs/COMMUNITY_IMPORT.md.\n');
      return 0;
    }
    const result = importFile(options.input, options.output, Date.now(), options['snapshot-version'] === undefined ? undefined : Number(options['snapshot-version']));
    process.stdout.write(`Staged ${result.audit.records} records; ${result.audit.validTodayKst} within their declared KST dates today.\nModule: ${result.output}\nAudit: ${result.auditPath}\nA human must verify source ownership, content, permission and translations before copying into src/community-updates.ts.\n`);
    if (result.snapshotPath) process.stdout.write(`Reviewed snapshot staged for explicit publication: ${result.snapshotPath}\n`);
    return 0;
  } catch (error) {
    const message = error && error.code ? `file operation failed (${error.code}); use a readable input and a new output path` : error.message;
    process.stderr.write(`Community import failed: ${message}\n`);
    return 1;
  }
}

module.exports = { SOURCES, OFFICIAL_SOURCES, LIMITS, DEFAULT_OUTPUT, parseTimestamp, parseDay, parseInput, parseOfficialSourceUrl, officialMenuUrl, validateDocument, validateSnapshot, renderModule, parseArgs, importFile, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
