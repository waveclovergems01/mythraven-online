import sharp from 'sharp';
import fs from 'node:fs/promises';
const output='public/assets/props/castle';
await fs.mkdir(output,{recursive:true});
const {data,info}=await sharp('art/source/props/castle-walls/original.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==1536||info.height!==1024)throw Error('Source dimensions changed; review frame boundaries');
let removed=0;
for(let p=0;p<data.length;p+=4){
 const r=data[p],g=data[p+1],b=data[p+2];
 const spill=Math.min(r,b)-g;
 if(spill<=20)continue;
 const a=spill>=245?0:1-spill/255;
 if(!a){data.fill(0,p,p+4);removed++;continue;}
 // Unmix the solid magenta matte from antialiased edge pixels; preserve blue banners.
 data[p]=Math.max(0,Math.min(255,(r-255*(1-a))/a));
 data[p+1]=Math.min(255,g/a);
 data[p+2]=Math.max(0,Math.min(255,(b-255*(1-a))/a));
 data[p+3]=Math.round(a*255);
}
await sharp(data,{raw:info}).png().toFile(`${output}/castle-walls.png`);
const rows=[
 {prefix:'tower',y:0,h:274,x:[0,185,386,548,703,864,1064,1243,1393,1536]},
 {prefix:'wall',y:274,h:204,x:[0,174,570,715,853,985,1147,1295,1536]},
 {prefix:'corner',y:478,h:238,x:[0,298,539,749,970,1285,1536]},
 {prefix:'gate-junction',y:716,h:308,x:[0,238,482,829,1120,1398,1536]}
];
const frames={};
for(const row of rows)for(let i=0;i<row.x.length-1;i++){
 const x0=row.x[i],x1=row.x[i+1];
 let left=x1,top=row.y+row.h,right=x0,bottom=row.y;
 for(let y=row.y;y<row.y+row.h;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>8){
 left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 if(right<left)throw Error('Empty frame');
 const name=`${row.prefix}-${String(i+1).padStart(2,'0')}`;
 const w=right-left+1,h=bottom-top+1;
 frames[name]={frame:{x:left,y:top,w,h},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w,h},sourceSize:{w,h},pivot:{x:.5,y:1}};
}
await fs.writeFile(`${output}/castle-walls.json`,JSON.stringify({frames,meta:{image:'castle-walls.png',size:{w:info.width,h:info.height},scale:'1'}},null,2));
await fs.writeFile('art/source/props/castle-walls/metadata.json',JSON.stringify({source:'user-supplied sheet',processing:'magenta chroma key with edge decontamination; deterministic atlas extraction',key:'#ff00ff',frameCount:Object.keys(frames).length,removedPixels:removed,status:'imported art; placement pivots provisional, no collision footprints assigned',original:'original.png',exporter:'scripts/export-castle-walls.mjs'},null,2));
await sharp(data,{raw:info}).flatten({background:'#4d6545'}).png().toFile('art/source/props/castle-walls/preview.png');
console.log(`${Object.keys(frames).length} frames; ${removed} transparent background pixels`);
