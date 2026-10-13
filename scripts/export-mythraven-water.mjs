import sharp from 'sharp';
const dir='art/source/tiles/mythraven-water/';
await sharp(dir+'original-v001.png').resize(512,512).png().toFile(dir+'water-v001.png');
const input=await sharp(dir+'water-v001.png').toBuffer();
await sharp(input).png().toFile('public/assets/tiles/mythraven-water.png');
await sharp({create:{width:1536,height:1536,channels:3,background:'#6ab7d9'}}).composite(Array.from({length:9},(_,i)=>({input,left:i%3*512,top:Math.floor(i/3)*512}))).png().toFile(dir+'repeat-3x3.png');
