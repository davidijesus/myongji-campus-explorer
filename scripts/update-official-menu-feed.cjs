#!/usr/bin/env node
'use strict';

// Publish only parsed official menu cells. This does not manufacture human
// review, publication timestamps, translations, opening hours or empty menus.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const { collect, DEFAULT_CACHE } = require('./collect-mju-menus.cjs');
const { OFFICIAL_SOURCES, officialMenuUrl, parseTimestamp } = require('./import-community.cjs');

const MAX_BYTES = 256 * 1024;
const MAX_CANDIDATE_BYTES = 1024 * 1024;
const SOURCES = Object.freeze(Object.keys(OFFICIAL_SOURCES));
const MEALS = new Set(['breakfast', 'lunch', 'dinner']);
const DAY_MS = 86400000;
const KST_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

function fail(code, message) { return Object.assign(new Error(message), { code }); }
function validate(value, now) {
  // Reuse the same TypeScript validator as the public client. npm test/build
  // compiles it first; an absent or outdated build fails closed.
  const { validateCommunitySnapshot } = require('../build/core/community-sync.js');
  return validateCommunitySnapshot(value, now);
}
function instant(now) {
  const value = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(value)) throw fail('CLOCK', 'A valid evaluation time is required');
  return value;
}
function mondayForKst(now = Date.now()) {
  const parts = Object.fromEntries(KST_DATE.formatToParts(new Date(instant(now))).map(part => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const date = new Date(`${today}T00:00:00Z`);
  return new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
}
function boundedRead(file, limit) {
  const descriptor = fs.openSync(file, 'r');
  try {
    if (!fs.fstatSync(descriptor).isFile()) throw fail('INPUT', 'Expected a regular JSON file');
    const bytes = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = fs.readSync(descriptor, bytes, length, bytes.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > limit) throw fail('BODY_LIMIT', 'JSON input exceeds its byte limit');
    return bytes.subarray(0, length);
  } finally { fs.closeSync(descriptor); }
}
function decode(bytes) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw fail('JSON', 'Expected valid UTF-8 JSON'); }
}
function readPrevious(file, now) {
  const bytes = boundedRead(file, MAX_BYTES);
  const snapshot = validate(decode(bytes), instant(now));
  if (!snapshot) throw fail('PREVIOUS_INVALID', 'The previous public feed is invalid; publication stopped');
  return { bytes, snapshot };
}
function originalText(candidate) {
  if (![candidate.originalTitle, candidate.originalText, candidate.otherInfo].every(value => typeof value === 'string')) {
    throw fail('CANDIDATES_INVALID', 'Expected the original menu text fields');
  }
  // Preserve all nonempty original fields and line breaks. Do not translate,
  // summarize, truncate or strip a field to make it pass public validation.
  return [candidate.originalTitle, candidate.originalText, candidate.otherInfo].filter(value => value !== '').join('\n');
}
function sourceRecords(result, outputDir, monday, now = Date.now()) {
  const sourceId = result.sourceId;
  const sourceUrl = officialMenuUrl(sourceId, monday);
  if (!['candidates', 'no-records'].includes(result.status) || result.sourceUrl !== sourceUrl ||
      !result.observedAt || !result.validatedAt || result.mode !== 'public-get') {
    throw fail('COLLECTION_FAILED', 'No validated public-source response');
  }
  const expectedFile = `${sourceId}.candidates.json`;
  if (result.candidatesFile !== expectedFile) throw fail('CANDIDATES_INVALID', 'Unexpected candidate filename');
  const data = decode(boundedRead(path.join(outputDir, expectedFile), MAX_CANDIDATE_BYTES));
  if (data.schemaVersion !== 1 || data.reviewState !== 'unreviewed' || data.sourceId !== sourceId ||
      data.sourceUrl !== sourceUrl || data.weekMonday !== monday ||
      data.weekThrough !== new Date(Date.parse(monday + 'T00:00:00Z') + 6 * DAY_MS).toISOString().slice(0, 10) || data.status !== result.status ||
      data.observedAt !== result.observedAt || data.publishedAt !== null || !Array.isArray(data.candidates) ||
      !Array.isArray(data.emptyRows) || data.candidates.length !== result.candidateCount ||
      data.emptyRows.length !== result.emptyCount ||
      (data.status === 'no-records' ? data.candidates.length !== 0 || data.emptyRows.length === 0 : data.candidates.length === 0)) {
    throw fail('CANDIDATES_INVALID', 'Candidate provenance does not match the successful collection');
  }
  const observed = parseTimestamp(result.observedAt, 'observedAt');
  const checked = parseTimestamp(result.validatedAt, 'validatedAt');
  if (observed > checked || checked > instant(now)) throw fail('CANDIDATES_INVALID', 'Invalid observation or validation time');
  return data.candidates.map(candidate => {
    if (candidate.sourceId !== sourceId || candidate.sourceUrl !== sourceUrl || candidate.kind !== 'menu' ||
        candidate.publishedAt !== null || candidate.reviewedAt !== null || candidate.observedAt !== result.observedAt ||
        candidate.validFrom !== candidate.validThrough || !MEALS.has(candidate.meal) ||
        candidate.id !== `${sourceId}-${candidate.validFrom}-${candidate.meal}`) {
      throw fail('CANDIDATES_INVALID', 'Candidate does not match its source and dated meal');
    }
    return {
      id: candidate.id, sourceId, kind: 'menu', originalLanguage: 'ko', originalText: originalText(candidate),
      meal: candidate.meal, sourceUrl, publishedAt: null, reviewedAt: null,
      observedAt: result.observedAt, validatedAt: result.validatedAt,
      validFrom: candidate.validFrom, validThrough: candidate.validThrough,
    };
  });
}

/** A source is replaced as a whole only after every one of its rows validates. */
function mergeCollection(previous, collection, monday, now = Date.now()) {
  const time = instant(now), updatedAt = new Date(time).toISOString();
  if (previous && !validate(previous, time)) throw fail('PREVIOUS_INVALID', 'The previous feed is invalid');
  if (!collection || !collection.manifest || collection.manifest.monday !== monday || !Array.isArray(collection.manifest.results)) {
    throw fail('COLLECTION_INVALID', 'Unexpected collector manifest');
  }
  const oldUpdates = previous?.updates || [];
  let updates = oldUpdates.filter(record => !SOURCES.includes(record.sourceId));
  const states = [];
  for (const sourceId of SOURCES) {
    const matches = collection.manifest.results.filter(result => result.sourceId === sourceId);
    let records, errorCode;
    try {
      if (matches.length !== 1) throw fail('COLLECTION_INVALID', 'Expected one result per official source');
      const result = matches[0];
      if (!['candidates', 'no-records'].includes(result.status)) throw fail(result.errorCode || 'COLLECTION_FAILED', 'Source collection failed');
      records = sourceRecords(result, collection.outputDir, monday, time);
      if (!validate({ schemaVersion: 1, campusId: 'yongin', version: 1, updatedAt, updates: records }, time)) {
        throw fail('PUBLIC_VALIDATION', 'Original menu content failed the public contract');
      }
    } catch (error) {
      errorCode = /^[A-Z_]{1,40}$/.test(error.code || '') ? error.code : 'COLLECTION_FAILED';
      records = oldUpdates.filter(record => record.sourceId === sourceId);
    }
    updates.push(...records);
    states.push({ sourceId, state: errorCode ? (records.length ? 'retained' : 'unavailable') : records.length ? 'updated' : 'no-records',
      recordCount: records.length, ...(errorCode ? { errorCode } : {}) });
  }
  const succeeded = states.filter(result => !result.errorCode).length;
  if (!succeeded) return { snapshot: previous, changed: false, succeeded, states, outcome: previous ? 'retained' : 'unavailable' };
  updates.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  // Start above legacy counter-based app caches, and avoid reusing the same
  // revision when an intermediary briefly returns an older deployed feed.
  const version = Math.max((previous?.version || 0) + 1, Math.floor(time));
  const snapshot = validate({ schemaVersion: 1, campusId: 'yongin', version, updatedAt, updates }, time);
  if (!snapshot) throw fail('PUBLIC_VALIDATION', 'Merged public feed failed validation; previous feed retained');
  return { snapshot, changed: true, succeeded, states, outcome: succeeded === SOURCES.length ? 'updated' : 'partial' };
}

function atomicWrite(file, bytes) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
async function run(options) {
  const clock = options.now || Date.now;
  const started = instant(clock());
  if (!!options.previous === !!options.initial) throw fail('ARGUMENTS', 'Choose an existing --previous feed or explicit --initial mode');
  if (!options.output || !options.captureDir) throw fail('ARGUMENTS', 'Output and a new capture directory are required');
  const previous = options.previous ? readPrevious(options.previous, started) : null;
  const monday = mondayForKst(started);
  const collection = await (options.collect || collect)({ monday, outputDir: options.captureDir,
    cacheDir: options.cacheDir || DEFAULT_CACHE, ...(options.fetchOptions ? { fetchOptions: options.fetchOptions } : {}) });
  const merged = mergeCollection(previous?.snapshot || null, collection, monday, clock());
  if (merged.changed) {
    const bytes = Buffer.from(JSON.stringify(merged.snapshot, null, 2) + '\n');
    if (bytes.length > MAX_BYTES) throw fail('BODY_LIMIT', 'Serialized feed exceeds byte limit; previous feed retained');
    atomicWrite(options.output, bytes);
  } else if (previous && path.resolve(options.output) !== path.resolve(options.previous)) {
    // Preserve the exact bytes, including whitespace, when every source fails.
    atomicWrite(options.output, previous.bytes);
  }
  const status = { schemaVersion: 1, kind: 'official-menu-collection', timeZone: 'Asia/Seoul',
    attemptedAt: new Date(started).toISOString(), completedAt: new Date(instant(clock())).toISOString(),
    monday, outcome: merged.outcome, version: merged.snapshot?.version || null, sources: merged.states };
  if (options.status) atomicWrite(options.status, Buffer.from(JSON.stringify(status, null, 2) + '\n'));
  return { ...merged, status, exitCode: merged.succeeded ? 0 : 1 };
}
function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--help') return { help: true };
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (Object.hasOwn(args, key)) throw fail('ARGUMENTS', 'Duplicate argument');
    if (key === '--initial') { args[key] = true; continue; }
    if (!['--previous', '--output', '--capture-dir', '--cache-dir', '--status'].includes(key) || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      throw fail('ARGUMENTS', 'Unsupported or incomplete argument');
    }
    args[key] = argv[++i];
  }
  return { previous: args['--previous'], initial: args['--initial'], output: args['--output'],
    captureDir: args['--capture-dir'], cacheDir: args['--cache-dir'], status: args['--status'] };
}
async function main(argv) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write('Usage: node scripts/update-official-menu-feed.cjs (--previous FILE | --initial) --output FILE --capture-dir NEW_DIRECTORY [--cache-dir DIRECTORY] [--status FILE]\nUses original Korean official menus, Asia/Seoul dates and the last valid feed on failure. Run npm test/build first.\n');
      return 0;
    }
    const result = await run(options);
    for (const item of result.states) process.stdout.write(`${item.sourceId}: ${item.state}; records=${item.recordCount}${item.errorCode ? `; code=${item.errorCode}` : ''}\n`);
    process.stdout.write(`Feed: ${result.outcome}; version=${result.snapshot?.version || 'none'}; week=${result.status.monday}; timeZone=Asia/Seoul\n`);
    return result.exitCode;
  } catch (error) {
    const code = /^[A-Z_]{1,40}$/.test(error.code || '') ? error.code : 'PIPELINE_FAILED';
    process.stderr.write(`Official menu publication stopped (${code}); existing feed was not replaced.\n`);
    return 1;
  }
}

module.exports = { MAX_BYTES, SOURCES, mondayForKst, boundedRead, readPrevious, originalText, sourceRecords, mergeCollection, atomicWrite, run, parseArgs, main };
if (require.main === module) main(process.argv.slice(2)).then(code => { process.exitCode = code; });
