import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const source='art/source/props/mythraven-fountain/round-v003/original.png';
await sharp(source).extract({left:158,top:14,width:1100,height:1140}).resize({width:768}).png().toFile('public/assets/props/fountain/mythraven-fountain.png');
const dir='art/source/fx/fountain-tiered/';
const src=dir+'original-v001.png';
const meta=await sharp(src).metadata();
const layers=[],records=[];
for(let row=0;row<2;row++)for(let i=0;i<4;i++){
 const left=Math.round(i*meta.width/4),right=Math.round((i+1)*meta.width/4),top=Math.round(row*meta.height/2),bottom=Math.round((row+1)*meta.height/2);
 const {data,info}=await sharp(src).extract({left,top,width:right-left,height:bottom-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=info.width,minY=info.height,maxX=0,maxY=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 let ax,ay;
 if(row===0){ax=minX+8;ay=0;for(let y=0;y<info.height;y++)for(let x=minX;x<=minX+12;x++)if(data[(y*info.width+x)*4+3]>128)ay=Math.max(ay,y);ay-=5;}
 else {ay=minY+3;let sum=0,count=0;for(let y=minY;y<minY+12;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){sum+=x;count++;}ax=sum/count;}
 const anchor=row===0?[48,112]:[128,32];
 const offsetX=Math.round(anchor[0]-ax*.5),offsetY=Math.round(anchor[1]-ay*.5);
 const input=await sharp(src).extract({left,top,width:right-left,height:bottom-top}).resize(Math.round(info.width*.5),Math.round(info.height*.5)).png().toBuffer();
 if(offsetX<0||offsetY<0)throw new Error('Invalid frame padding');
 const frame=await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite([{input,left:offsetX,top:offsetY}]).png().toBuffer();

 layers.push({input:frame,left:i*256,top:row*256});records.push({row,index:i,sourceRoot:[ax,ay],anchor,scale:.5,offset:[offsetX,offsetY]});
}
await sharp({create:{width:1024,height:512,channels:4,background:'#00000000'}}).composite(layers).png().toFile('public/assets/fx/fountain-tiered-water.png');
await writeFile(dir+'normalization.json',JSON.stringify({frames:records,frameSize:[256,256],sourceSize:[meta.width,meta.height],scale:.5},null,2));
console.log('exported base and 8 anchored water frames');

