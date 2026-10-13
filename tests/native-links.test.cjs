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

test('Instagram opens only the four supplied profiles and canonical post/reel/Story references',()=>{
 for(const host of ['instagram.com','www.instagram.com'])for(const handle of ['o_ulami','mjhs_lounge','mju_lounge','mj_bokji_foodist'])for(const suffix of ['','/']){
  assert.equal(allowedExternalLink(`https://${host}/${handle}${suffix}`),true);
  assert.equal(allowedExternalLink(`https://${host}/${handle.toUpperCase()}/p/AbC_123-x${suffix}`),true);
  assert.equal(allowedExternalLink(`https://${host}/stories/${handle.toUpperCase()}/12345678901234567890123456789012${suffix}`),true);
 }
 for(const url of ['https://www.instagram.com/O_ulami/','HTTPS://WWW.INSTAGRAM.COM:443/O_ULAMI/','https://instagram.com/p/AbC_123-x/','https://www.instagram.com/reel/AbC_123-x','https://www.instagram.com/mj_bokji_foodist/reel/AbC_123-x/'])assert.equal(allowedExternalLink(url),true,url);
});

test('Instagram rejects credentials, tracking, unknown accounts and parser-normalized paths',()=>{
 const rejected=[
  'http://www.instagram.com/o_ulami/','https://www.instagram.com:444/o_ulami/','https://www.instagram.com:0443/o_ulami/',
  'https://www.instagram.com.evil.example/o_ulami/','https://instagram.com@evil.example/o_ulami/','https://evil.example@instagram.com/o_ulami/',
  'https://m.instagram.com/o_ulami/','https://l.instagram.com/?u=https://evil.example','instagram://user?username=o_ulami',
  'https://www.instagram.com/','https://www.instagram.com/not_a_reviewed_account/','https://www.instagram.com/not_a_reviewed_account/p/AbC123/',
  'https://www.instagram.com/accounts/login/','https://www.instagram.com/direct/inbox/',
  'https://www.instagram.com/stories/not_a_reviewed_account/123456/','https://www.instagram.com/stories/o_ulami/not-a-number/',
  'https://www.instagram.com/stories/o_ulami/','https://www.instagram.com/stories/highlights/123456/',
  'https://www.instagram.com/stories/o_ulami/123456789012345678901234567890123/',
  'https://www.instagram.com/stories/o_ulami/123456/?igsh=tracking',
  'https://www.instagram.com/o_ulami/?igsh=tracking','https://www.instagram.com/p/AbC123/?utm_source=tracking','https://www.instagram.com/p/AbC123/?',
  'https://www.instagram.com/o_ulami/#section','https://www.instagram.com/o_ulami/#','https://www.instagram.com/o_ulami/?next=https://evil.example',
  'https://www.instagram.com/p/','https://www.instagram.com/reels/AbC123/','https://www.instagram.com/p/AbC123/embed/','https://www.instagram.com/p/AbC123/extra',
  'https://www.instagram.com//o_ulami/','https://www.instagram.com/unreviewed/../o_ulami/','https://www.instagram.com/%2e/o_ulami/',
  'https://www.instagram.com/%6f_ulami/','https://www.instagram.com/p/AbC%2f123/','https://www.instagram.com\\o_ulami/',
  ' https://www.instagram.com/o_ulami/','https://www.instagram.com/o_ulami/\n','https://www.instagram.com/o_\tulami/',
  `https://www.instagram.com/p/${'a'.repeat(65)}/`
 ];
 for(const url of rejected){
  assert.equal(allowedExternalLink(url),false,url);
  assert.equal(allowedExternalLink(url,['https://www.instagram.com/support']),false,`publisher override must not broaden Instagram: ${url}`);
 }
});
