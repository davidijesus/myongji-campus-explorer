const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {generateImageAsync}=require(path.join(root,'mobile/node_modules/@expo/image-utils'));
(async()=>{const out=path.join(root,'web/pwa-assets');fs.mkdirSync(out,{recursive:true});for(const size of [180,192,512]) {const image=await generateImageAsync({projectRoot:root,cacheType:'pwa-icons'},{src:path.join(root,'mobile/assets/icon.png'),name:`icon-${size}.png`,width:size,height:size,resizeMode:'contain',backgroundColor:'#ffffff',removeTransparency:true});fs.writeFileSync(path.join(out,`icon-${size}.png`),image.source);}console.log('PWA icon variants generated from the existing original app icon.');})().catch(e=>{console.error(e.message);process.exit(1)});
