const fs=require('node:fs');const {validateDataset}=require('../build/core/core.js');
const file=process.argv[2]||'data/live-seed.json';
try {const value=JSON.parse(fs.readFileSync(file,'utf8'));const errors=validateDataset(value,process.argv[3]||value.mode);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Valid ${value.mode} dataset: ${value.id} v${value.version}`);}catch(e){console.error(e.message);process.exitCode=1;}
