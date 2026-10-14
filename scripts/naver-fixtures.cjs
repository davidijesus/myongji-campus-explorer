// Interoperability fixtures for the host Java policy tests. Never bundled.
const fs = require('node:fs');
const path = require('node:path');
const {naverLinksForPlace} = require('../build/core/naver.js');
const {REFERENCE_CAMPUS} = require('../build/core/campus.js');
const {SEOUL_REFERENCE_CAMPUS} = require('../build/core/seoul.js');
if (!process.argv[2]) throw new Error('Pass an explicit output path for Naver test fixtures.');
const rows = [];
for (const [id, campus] of [['yongin', REFERENCE_CAMPUS], ['seoul', SEOUL_REFERENCE_CAMPUS]]) {
  for (const feature of campus.features) {
    const link = naverLinksForPlace(id, feature.id);
    if (!link) throw new Error('Missing Naver destination: ' + feature.id);
    rows.push([link.nativeRequestUrl, link.webUrl, link.kind].join('\t'));
  }
}
const output = path.resolve(process.argv[2]);
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, rows.join('\n') + '\n', 'utf8');
console.log('Generated ' + rows.length + ' Naver destination fixtures.');
