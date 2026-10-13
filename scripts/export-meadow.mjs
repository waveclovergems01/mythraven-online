import fs from 'node:fs/promises';
import sharp from 'sharp';
await fs.mkdir('assets/_tests',{recursive:true});
const root='art/source/tiles/smooth-meadow';
await sharp(`${root}/grass/original.png`).resize(512,512).removeAlpha().png().toFile('public/assets/tiles/daflak-grass.png');
const earth=`${root}/earth/original.png`;
const meta=await sharp(earth).metadata();
console.log('Earth alpha',meta.hasAlpha);
if(!meta.hasAlpha)throw Error('Earth requires real transparency');
await sharp(earth).resize(512,512,{fit:'contain',background:'#00000000'}).png().toFile('public/assets/props/daflak-groundcover-earth.png');
const stats=await sharp('public/assets/props/daflak-groundcover-earth.png').stats();
console.log('Alpha range',stats.channels[3].min,stats.channels[3].max);
if(stats.channels[3].min!==0)throw Error('Opaque earth backdrop');
for(const name of ['clover','leaves','tufts']){
 await sharp(`art/source/tiles/continuous-meadow/${name}/original.png`).trim().resize(204,204,{fit:'inside'}).extend({top:26,bottom:26,left:26,right:26,background:'#00000000'}).resize(256,256,{fit:'contain',background:'#00000000'}).png().toFile(`public/assets/props/daflak-groundcover-${name}.png`);
}
await sharp({create:{width:1536,height:1536,channels:3,background:'#7fb55a'}}).composite(Array.from({length:9},(_,i)=>({input:'public/assets/tiles/daflak-grass.png',left:i%3*512,top:Math.floor(i/3)*512}))).png().toFile('assets/_tests/grass-repeat.png');
