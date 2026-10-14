import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const d='art/source/tiles/mythraven-granite/';
await sharp(d+'original-v001.png').resize(512,512).png().toFile(d+'granite-v001.png');
const input=await sharp(d+'granite-v001.png').toBuffer();
await sharp(input).png().toFile('public/assets/tiles/mythraven-granite.png');
await sharp({create:{width:1536,height:1536,channels:3,background:'#bcb8ae'}}).composite(Array.from({length:9},(_,i)=>({input,left:i%3*512,top:Math.floor(i/3)*512}))).png().toFile(d+'repeat-3x3.png');
