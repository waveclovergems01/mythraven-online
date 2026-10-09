import sharp from 'sharp';
import {copyFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const sourceDir='art/source/ui/cursors-v001';
const outDir='public/assets/ui/cursors';
await mkdir(sourceDir,{recursive:true});
await mkdir(outDir,{recursive:true});
const originalDir=process.argv[2];
const assets=[
 {id:'cursor-default',original:'exec-8005f845-f863-430e-8b9c-866da6d2f0c2.png'},
 {id:'cursor-pointer',original:'exec-995f80c8-dc9a-49c1-a3ea-158e17a9aedd.png'}
];
const manifest=[];
for(const asset of assets){
 const source=path.join(sourceDir,asset.id+'.png');
 if(originalDir) await copyFile(path.join(originalDir,asset.original),source,1);
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=0,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  if(data[(y*info.width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 }
 const output=path.join(outDir,asset.id+'-v001.png');
 await sharp(source).extract({left,top,width:right-left+1,height:bottom-top+1})
  .resize(36,36,{fit:'contain',background:'#00000000'})
  .extend({top:2,bottom:2,left:2,right:2,background:'#00000000'}).png().toFile(output);
 const exported=await sharp(output).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let hotspot;
 for(let y=0;y<40&&!hotspot;y++){
  const xs=[];
  for(let x=0;x<40;x++)if(exported.data[(y*40+x)*4+3]>=128)xs.push(x);
  if(xs.length)hotspot=[Math.round(xs.reduce((a,b)=>a+b,0)/xs.length),y];
 }
 const stats=await sharp(output).stats();
 if(stats.isOpaque||!hotspot)throw Error('Invalid cursor alpha/hotspot');
 manifest.push({styleId:'MR-ART-v1',assetId:asset.id,revision:'v001',status:'reviewed',
 sourcePath:source,exportPath:output,promptPath:sourceDir+'/PROMPTS.md',
 references:['public/assets/ui/login-frame-v001.webp'],generationTool:'built-in image_gen',
 width:40,height:40,runtimeScale:1,hotspotPx:hotspot,hasTransparency:true});
}
await writeFile(path.join(sourceDir,'metadata.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));

