import sharp from 'sharp';
const dir='art/source/tiles/mythraven-paving/';
await sharp(dir+'original-v001.png').resize(512,512).png().toFile(dir+'paving-v001.png');
const input=await sharp(dir+'paving-v001.png').toBuffer();
await sharp({create:{width:1536,height:1536,channels:3,background:'#c9bca3'}}).composite(Array.from({length:9},(_,i)=>({input,left:i%3*512,top:Math.floor(i/3)*512}))).png().toFile(dir+'repeat-3x3.png');
await sharp(input).png().toFile('public/assets/tiles/mythraven-paving.png');
