'use strict';
// Packaging only: preserve the reviewed original illustration and resize it.
// Requires Python 3 with Pillow; no Expo installation or network access is needed.
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=String.raw`
from pathlib import Path
from PIL import Image
import sys
assets=Path(sys.argv[1])
with Image.open(assets/'icon-master.png') as image:
    if image.width != image.height:
        raise ValueError('Launcher icon master must be square')
    image.load()
    for size in (180,192,512):
        image.resize((size,size),Image.Resampling.LANCZOS).save(assets/f'icon-{size}.png',optimize=True)
print('PWA icon variants generated from the reviewed blue campus illustration.')
`;
const candidates=process.env.PYTHON?[process.env.PYTHON]:process.platform==='win32'?['python','python3']:['python3','python'];
for(const executable of candidates){
 const result=spawnSync(executable,['-',path.join(root,'web/pwa-assets')],{input:script,encoding:'utf8',windowsHide:true});
 if(result.error?.code==='ENOENT')continue;
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)console.error(result.error.message);
 process.exit(result.status??1);
}
console.error('Python 3 with Pillow is required to regenerate launcher icons. Set PYTHON to its executable path.');
process.exit(1);
