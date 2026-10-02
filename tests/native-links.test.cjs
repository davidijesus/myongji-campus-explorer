const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../mobile/linkPolicy.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exportsObject={};new Function('exports',code)(exportsObject);
const {allowedExternalLink}=exportsObject;
test('every reviewed visual source can open from the native shell',()=>{
 const {VISUAL_REFERENCES}=require('../build/core/visual-references.js');
 for(const ref of Object.values(VISUAL_REFERENCES)){
  for(const source of ref.sources)assert.equal(allowedExternalLink(source.url),true,source.url);
  if(ref.imageUrl)assert.equal(allowedExternalLink(ref.imageUrl),true,ref.imageUrl);
 }
});
test('native video and architect permissions remain limited to reviewed links',()=>{
 for(const url of ['https://www.youtube.com/watch?v=unreviewed','https://www.youtube.com/watch?v=u-JLFts2Pxc&redirect=http://example.com','https://www.youtube.com/watch?v=u-JLFts2Pxc&t=hello','https://www.gansam.com/works/work.php?code=works&idx=1','https://www.gansam.com/unrelated','https://user:password@www.youtube.com/watch?v=u-JLFts2Pxc','http://www.mju.ac.kr/','javascript:alert(1)','https://www.mju.ac.kr.evil.test/'])assert.equal(allowedExternalLink(url),false,url);
});
