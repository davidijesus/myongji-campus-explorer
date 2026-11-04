#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { run, atomicWrite, MAX_BYTES } = require('./update-official-menu-feed.cjs');

const FEED_URL = 'https://davidijesus.github.io/myongji-campus-explorer/menus/yongin.json';
function failure(code) { return Object.assign(new Error(code), { code }); }

// Read only the exact deployed feed. A network error is not a first deployment.
async function previousFeed({ fetcher = fetch, now = Date.now, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(FEED_URL);
    url.searchParams.set('_mce_check', String(now()));
    const response = await fetcher(url.href, { credentials: 'omit', redirect: 'manual',
      cache: 'no-store', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' }, signal: controller.signal });
    if (response.status === 404) { await response.body?.cancel(); throw failure('PREVIOUS_MISSING'); }
    if (response.status !== 200 || response.redirected) throw failure('PREVIOUS_HTTP');
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) throw failure('PREVIOUS_TYPE');
    const declared = response.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) throw failure('PREVIOUS_LIMIT');
    if (!response.body) throw failure('PREVIOUS_EMPTY');
    const reader = response.body.getReader(), chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) { await reader.cancel(); throw failure('PREVIOUS_LIMIT'); }
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks);
    let parsed;
    try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw failure('PREVIOUS_JSON'); }
    const { validateCommunitySnapshot } = require('../build/core/community-sync.js');
    if (!validateCommunitySnapshot(parsed, now())) throw failure('PREVIOUS_INVALID');
    return bytes;
  } finally { clearTimeout(timer); controller.abort(); }
}

async function buildFeed({ root = path.resolve(__dirname, '..'), fetcher, now, timeoutMs, collectorRun = run } = {}) {
  const work = path.join(root, 'build/pages-menu-run');
  // A new directory prevents reusing an interrupted collection as fresh evidence.
  fs.mkdirSync(work, { recursive: false });
  const previous = await previousFeed({ fetcher, now, timeoutMs });
  const previousPath = path.join(work, 'previous.json');
  atomicWrite(previousPath, previous);
  const result = await collectorRun({ previous: previousPath,
    output: path.join(root, 'pwa/menus/yongin.json'), captureDir: path.join(work, 'capture'),
    cacheDir: path.join(work, 'http-cache'), status: path.join(work, 'status.json'), ...(now ? { now } : {}) });
  return result;
}
async function main() {
  try {
    const result = await buildFeed();
    process.stdout.write(`Official menus: ${result.outcome}; version=${result.snapshot?.version || 'none'}; timeZone=Asia/Seoul\n`);
    if (result.outcome === 'partial') process.stdout.write('::warning::An official source failed; its last valid records were retained. See the collection report.\n');
    return result.exitCode;
  } catch (error) {
    const code = /^[A-Z_]{1,40}$/.test(error.code || '') ? error.code : 'FEED_BUILD_FAILED';
    process.stderr.write(`Menu deployment stopped (${code}); the existing Pages deployment remains unchanged.\n`);
    return 1;
  }
}
module.exports = { FEED_URL, previousFeed, buildFeed, main };
if (require.main === module) main().then(code => { process.exitCode = code; });
