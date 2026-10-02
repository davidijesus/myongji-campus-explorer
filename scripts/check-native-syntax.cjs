'use strict';
/** Syntax-only check. Does not resolve npm types, Swift/Kotlin APIs or native dependencies. */
const fs=require('node:fs');const path=require('node:path');
let ts;try{ts=require('typescript');}catch{const cp=require('node:child_process');ts=require(path.join(cp.execSync('npm root -g',{encoding:'utf8'}).trim(),'typescript'));}
let errors=0;
for(const file of ['mobile/App.tsx','mobile/app.config.ts','mobile/index.ts']){
 const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 const problems=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);if(problems.length){errors+=problems.length;console.error(file,problems.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')));}else console.log('Syntax only:',file,'passed');
}
process.exitCode=errors?1:0;
