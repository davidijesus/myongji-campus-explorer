'use strict';
// Preserve the original RGB master; apply the requested circular alpha and resize.
// Requires Python 3 with Pillow; no Expo installation or network access is needed.
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=String.raw`
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, __version__ as pillow_version
import hashlib, json, sys
root=Path(sys.argv[1])
assets=root/'web/pwa-assets'
master=assets/'icon-master.png'
provenance_path=assets/'icon-provenance.json'
provenance=json.loads(provenance_path.read_text(encoding='utf-8'))
master_hash=hashlib.sha256(master.read_bytes()).hexdigest()
if master_hash != provenance['master']['sha256']:
    raise ValueError('Launcher icon master differs from the reviewed original')
outputs=[]
with Image.open(assets/'icon-master.png') as image:
    if image.width != image.height:
        raise ValueError('Launcher icon master must be square')
    image.load()
    scale=4
    inset=round(image.width*.01*scale)
    extent=image.width*scale
    mask=Image.new('L',(extent,extent),0)
    ImageDraw.Draw(mask).ellipse((inset,inset,extent-inset-1,extent-inset-1),fill=255)
    mask=mask.resize(image.size,Image.Resampling.LANCZOS)
    circular=image.convert('RGBA')
    circular.putalpha(mask)
    if ImageChops.difference(image.convert('RGB'),circular.convert('RGB')).getbbox():
        raise ValueError('Circular alpha must not alter original RGB pixels')
    targets=[(size,assets/f'icon-{size}.png') for size in (180,192,512)]
    targets.append((1024,root/'mobile/assets/icon.png'))
    for size,target in targets:
        target.parent.mkdir(parents=True,exist_ok=True)
        output=circular.resize((size,size),Image.Resampling.LANCZOS)
        if any(output.getpixel(point)[3] for point in ((0,0),(size-1,0),(0,size-1),(size-1,size-1))):
            raise ValueError('Circular icon corners must be transparent')
        output.save(target,optimize=True)
        outputs.append({'file':target.relative_to(root).as_posix(),'size':size,'mode':'RGBA','sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
provenance['packaging']={
    'script':'scripts/generate-pwa-icons.cjs',
    'pillowVersion':pillow_version,
    'method':'Apply a centered circular alpha mask at 98 percent diameter with 4x supersampling and LANCZOS antialiasing, then LANCZOS resize and PNG optimization. Original master and RGB pixels at the mask stage remain unchanged; no artwork recreation, recoloring or retouching.',
    'circularTreatmentVersion':'0.6.3',
    'sizes':[180,192,512,1024],
    'outputs':outputs
}
provenance_path.write_bytes((json.dumps(provenance,indent=2)+'\n').encode('utf-8'))
print('Circular RGBA PWA icons and native 1024px icon generated; original master preserved.')
`;
const candidates=process.env.PYTHON?[process.env.PYTHON]:process.platform==='win32'?['python','python3']:['python3','python'];
for(const executable of candidates){
 const result=spawnSync(executable,['-',root],{input:script,encoding:'utf8',windowsHide:true});
 if(result.error?.code==='ENOENT')continue;
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)console.error(result.error.message);
 process.exit(result.status??1);
}
console.error('Python 3 with Pillow is required to regenerate launcher icons. Set PYTHON to its executable path.');
process.exit(1);
