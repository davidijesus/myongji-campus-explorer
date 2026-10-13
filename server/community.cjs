'use strict';

// Public review snapshots only. Raw collection output and credentials have no
// place in this file format. The importer owns the source/date validation rules.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { LIMITS, parseInput, validateSnapshot } = require('../scripts/import-community.cjs');
const MAX_COMMUNITY_BYTES = LIMITS.inputBytes;

function publicCommunitySnapshot(snapshot) {
  return {
    schemaVersion: 1, campusId: 'yongin', version: snapshot.version, updatedAt: snapshot.updatedAt,
    updates: snapshot.updates.map(record => ({
      id: record.id, sourceId: record.sourceId, kind: record.kind,
      summary: { en: record.summary.en, ko: record.summary.ko, zh: record.summary.zh },
      sourceUrl: record.sourceUrl, publishedAt: record.publishedAt, reviewedAt: record.reviewedAt,
      validFrom: record.validFrom, validThrough: record.validThrough,
      ...(Object.hasOwn(record, 'observedAt') ? { observedAt: record.observedAt } : {}),
    })),
  };
}

function reviewedCommunitySnapshot(value, now = Date.now()) {
  const snapshot = publicCommunitySnapshot(validateSnapshot(value, now));
  if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > MAX_COMMUNITY_BYTES) throw new Error('Community snapshot exceeds byte limit');
  return snapshot;
}

function emptyCommunitySnapshot() {
  // Fixed baseline keeps a missing-file snapshot and its ETag stable over
  // restarts. This timestamp does not claim that any record was reviewed.
  return { schemaVersion: 1, campusId: 'yongin', version: 1, updatedAt: '2000-01-01T00:00:00Z', updates: [] };
}

// Shared with CommunitySnapshot.java: sorted object keys, preserved array order,
// literal Unicode, and lowercase \u00xx for every ASCII control character.
// A content-derived validator must bind the validated cache to its exact content,
// including after a server restart or an accidentally replaced storage file.
function canonicalCommunityJson(snapshot) {
  const quote = value => '"' + value.replace(/["\\\u0000-\u001f]/g, character =>
    character === '"' || character === '\\' ? '\\' + character : '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0')) + '"';
  function encode(value) {
    if (value === null) return 'null';
    if (typeof value === 'string') return quote(value);
    if (Array.isArray(value)) return '[' + value.map(encode).join(',') + ']';
    if (typeof value === 'object') return '{' + Object.keys(value).sort().map(key => quote(key) + ':' + encode(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  return encode(publicCommunitySnapshot(snapshot));
}

function communityRepresentation(snapshot) {
  const json = canonicalCommunityJson(snapshot);
  const hash = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
  return { json, etag: `"community-yongin-v${snapshot.version}-${hash}"` };
}

async function readCommunitySnapshot(file, now = Date.now()) {
  const handle = await fs.open(file, 'r');
  try {
    if (!(await handle.stat()).isFile()) throw new Error('Community snapshot must be a regular file');
    const bytes = Buffer.alloc(MAX_COMMUNITY_BYTES + 1);
    let size = 0;
    while (size < bytes.length) {
      const result = await handle.read(bytes, size, bytes.length - size, null);
      if (!result.bytesRead) break;
      size += result.bytesRead;
    }
    return reviewedCommunitySnapshot(parseInput(bytes.subarray(0, size)), now);
  } finally { await handle.close(); }
}

async function writeCommunitySnapshot(file, snapshot) {
  const encoded = canonicalCommunityJson(snapshot);
  if (Buffer.byteLength(encoded, 'utf8') > MAX_COMMUNITY_BYTES) throw new Error('Community snapshot exceeds byte limit');
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, encoded, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.unlink(temporary).catch(() => {});
    throw error;
  }
  return encoded;
}

module.exports = { MAX_COMMUNITY_BYTES, publicCommunitySnapshot, reviewedCommunitySnapshot, emptyCommunitySnapshot, canonicalCommunityJson, communityRepresentation, readCommunitySnapshot, writeCommunitySnapshot };
