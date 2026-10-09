import sharp from 'sharp';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Export only: preserve artwork and alpha, resize/re-encode for browser delivery.
// Optional argument: original generated-image folder, needed only on first import.
const originalFolder = process.argv[2];
const sourceFolder = 'art/source/ui/login-v001';
const outputFolder = 'public/assets/ui';
await mkdir(sourceFolder,{recursive:true});
await mkdir(outputFolder,{recursive:true});
const assets = [
  {id:'mythraven-logo',original:'exec-db09a908-ec96-4cc0-bc88-9707daacb71f.png',width:640,lossless:true},
  {id:'login-background',original:'exec-0d5d6fae-3f25-4408-a413-abf03f378860.png',width:1280,lossless:false},
  {id:'login-frame',original:'exec-b7a841f2-9e50-4586-bc85-f3cccca146fa.png',width:512,lossless:true},
];
const manifest=[];
for(const asset of assets) {
  const source=path.join(sourceFolder,asset.id+'-v001.png');
  if(originalFolder) {
    try { await stat(source); } catch(error) {
      if(error.code!=='ENOENT') throw error;
      await copyFile(path.join(originalFolder,asset.original),source);
    }
  }
  const output=path.join(outputFolder,asset.id+'-v001.webp');
  const result=await sharp(source).resize({width:asset.width,withoutEnlargement:true})
    .webp({lossless:asset.lossless,quality:78,effort:6}).toFile(output);
  const stats=await sharp(output).stats();
  manifest.push({styleId:'MR-ART-v1',assetId:asset.id,revision:'v001',status:'reviewed',
    sourcePath:source,exportPath:output,promptPath:'art/source/ui/login-v001/PROMPTS.md',
    references:[],generationTool:'built-in image_gen (previous turn)',
    width:result.width,height:result.height,bytes:result.size,hasTransparency:!stats.isOpaque,
    ...(asset.id==='login-frame'?{nineSlicePx:[100,64,100,64],centerFill:false}:{}),
  });
  console.log(asset.id+': '+result.width+'x'+result.height+', '+result.size+' bytes, alpha='+!stats.isOpaque);
}
await writeFile(path.join(sourceFolder,'metadata.json'),JSON.stringify(manifest,null,2)+'\n');
