import sharp from 'sharp';
const dir = 'art/source/tiles/mythraven-grass-overlay/';
await sharp(dir+'original-v001.png').resize(512,512).png().toFile(dir+'grass-v001.png');
const input=await sharp(dir+'grass-v001.png').toBuffer();
await sharp({create:{width:1536,height:1536,channels:3,background:'#7fb55a'}}).composite(Array.from({length:9},(_,i)=>({input,left:(i%3)*512,top:Math.floor(i/3)*512}))).png().toFile(dir+'repeat-3x3-v001.png');
console.log(JSON.stringify(await sharp(dir+'grass-v001.png').metadata()));
