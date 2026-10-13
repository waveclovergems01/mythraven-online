import sharp from 'sharp';
// Export only the materials currently loaded by WorldScene.
for (const [folder, materials] of [
 ['daflak-ground', [['paving',1,0],['plaza',0,1]]],
 ['daflak-water-bank', [['water',0,1],['bank',1,1]]],
]) {
 const source=`art/source/tiles/${folder}/original.png`;
 const {width,height}=await sharp(source).metadata();
 if(width!==height || width%2) throw Error(`Invalid material atlas: ${source}`);
 const size=width/2;
 for(const [name,x,y] of materials) {
  await sharp(source).extract({left:x*size,top:y*size,width:size,height:size})
   .resize(name==='grass'?512:256,name==='grass'?512:256).png().toFile(`public/assets/tiles/daflak-${name}.png`);
 }
}

await sharp('art/source/tiles/smooth-meadow/grass/original.png').resize(512,512).png().toFile('public/assets/tiles/daflak-grass.png');
