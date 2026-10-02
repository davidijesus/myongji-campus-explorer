const {execFileSync}=require('node:child_process');
const options={stdio:'inherit',cwd:__dirname,shell:process.platform==='win32'};
execFileSync('npm',['ci'],options);
execFileSync('npm',['run','typecheck'],options);
execFileSync('npm',['run','doctor'],options);
console.log('Installed the tested lockfile. Use npm run prebuild:android or npm run prebuild:ios next. Store configuration is explained in ../docs/STORE_RELEASE.md.');
