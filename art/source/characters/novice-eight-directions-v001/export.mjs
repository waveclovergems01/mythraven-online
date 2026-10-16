import sharp from 'sharp';
import fs from 'node:fs/promises';
export async function keyImage(path){
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];
  if(r>g+35&&b>g+35){const a=1-Math.min(1,(Math.min(r,b)-g)/180);data[i+3]=Math.round(255*a);if(a<.15)data[i+3]=0;else{data[i]=Math.min(r,g+25);data[i+2]=Math.min(b,g+25);}}
 }
 return sharp(data,{raw:info}).png().toBuffer();
}
export async function split(path,cols,rows){
 const buf=await keyImage(path),meta=await sharp(buf).metadata(),out=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
 const l=Math.round(x*meta.width/cols),t=Math.round(y*meta.height/rows),w=Math.round((x+1)*meta.width/cols)-l,h=Math.round((y+1)*meta.height/rows)-t;
 const cell=await sharp(buf).extract({left:l,top:t,width:w,height:h}).png().toBuffer();
 const {data,info}=await sharp(cell).raw().toBuffer({resolveWithObject:true});let minx=w,miny=h,maxx=0,maxy=0;
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(data[(yy*w+xx)*4+3]>40){minx=Math.min(minx,xx);miny=Math.min(miny,yy);maxx=Math.max(maxx,xx);maxy=Math.max(maxy,yy);}
 if(minx>maxx)throw Error('empty frame');
 out.push({buffer:await sharp(cell).extract({left:minx,top:miny,width:maxx-minx+1,height:maxy-miny+1}).png().toBuffer(),width:maxx-minx+1,height:maxy-miny+1});
 }return out;
}
