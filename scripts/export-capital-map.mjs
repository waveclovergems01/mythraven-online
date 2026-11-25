import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';

// Maintained layout exporter: concept colors supply the 3D shoreline, never surface detail.
const source='art/source/maps/capital-layout.png',out='public/assets/maps';
await mkdir(out,{recursive:true});
const {data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});
const {width:w,height:h}=info,n=w*h;
const land=new Uint8Array(n);
for(let i=0;i<n;i++){
 const r=data[i*3],g=data[i*3+1],b=data[i*3+2];
 land[i]=Number(!(b>r*1.12&&g>r*1.05));
}
// Remove painted foam specks. Bridges now connect the island to outer land.
const visited=new Uint8Array(n),queue=new Int32Array(n);
for(let start=0;start<n;start++){
 if(!land[start]||visited[start])continue;
 let head=0,tail=1;queue[0]=start;visited[start]=1;
 while(head<tail){
  const p=queue[head++],x=p%w,y=Math.floor(p/w);
  for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1]){
   if(q>=0&&land[q]&&!visited[q]){visited[q]=1;queue[tail++]=q;}
  }
 }
 if(tail<80)for(let i=0;i<tail;i++)land[queue[i]]=0;
}
// Reconstruct a rounded contour at 2x mask resolution.
const contour=await sharp(Buffer.from(land.map(v=>v*255)),{raw:{width:w,height:h,channels:1}}).blur(1.2).resize(w*2,h*2).greyscale().raw().toBuffer();
const smoothLand=await sharp(contour,{raw:{width:w*2,height:h*2,channels:1}}).threshold(128).blur(.55).greyscale().raw().toBuffer();
const rgba=Buffer.alloc(w*h*16,255);
for(let i=0;i<smoothLand.length;i++) rgba[i*4+3]=smoothLand[i];
await sharp(rgba,{raw:{width:w*2,height:h*2,channels:4}}).png().toFile(`${out}/mythraven-land.png`);
console.log(`Capital shoreline exported ${w*2}x${h*2}.`);
