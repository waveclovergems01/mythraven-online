import sharp from 'sharp';
for(const name of ['grass','paving']){
 await sharp(`art/source/tiles/painted-town-v004/${name}-source.png`).resize(512,512).removeAlpha().png().toFile(`public/assets/tiles/mythraven-${name}.png`);
}
