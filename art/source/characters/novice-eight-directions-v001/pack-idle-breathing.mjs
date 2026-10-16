import sharp from 'sharp';
import fs from 'node:fs/promises';
import { split } from './export.mjs';
const root='art/source/characters/novice-eight-directions-v001/idle-breathing-v001';
const dirs=['s','sw','w','nw','n','ne','e','se'];

const report=[];const atlas=[];
for(const [row,d] of dirs.entries()){
 const frames=await split(root+'/'+d+'-source.png',4,1);
 const scale=144/frames[0].height;
 for(const [i,f] of frames.entries()){
  const w=Math.round(f.width*scale),h=Math.round(f.height*scale);
  const buf=await sharp(f.buffer).resize(w,h).png().toBuffer();
  const out=await sharp({create:{width:240,height:240,channels:4,background:'#00000000'}}).composite([{input:buf,left:120-Math.round(w/2),top:216-h}]).png().toBuffer();
  atlas.push({input:out,left:i*240,top:row*240});report.push({direction:d,frame:i,width:w,height:h,anchor:[120,216]});
 }
}
await sharp({create:{width:960,height:1920,channels:4,background:'#00000000'}}).composite(atlas).png().toFile(root+'/idle-atlas.png');
await fs.writeFile(root+'/manifest.json',JSON.stringify({status:'owner approved idle; integrated in Phaser 2026-10-15',tool:'image_gen.imagegen',model:'not exposed by tool',directions:dirs,action:'idle-breathing',framesPerDirection:4,frameSize:[240,240],anchor:[120,216],frameDurationMs:400,animation:'image frame changes only; no CSS deformation',frames:report},null,2));
console.log('Exported 32 RGBA idle frames and atlas');

