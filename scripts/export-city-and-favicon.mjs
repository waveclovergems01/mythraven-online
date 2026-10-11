import sharp from 'sharp';
import {copyFile, mkdir, writeFile} from 'node:fs/promises';
const generated=process.argv[2];
const citySource='art/source/maps/daflak-city/v001';
const iconSource='art/source/ui/favicon-v001';
for(const p of [citySource,iconSource,'public/assets/maps','public/assets/icons'])await mkdir(p,{recursive:true});
if(generated){
 await copyFile(generated+'/exec-09716486-5dcf-43d5-8349-be010afc362a.png',citySource+'/original.png',1);
 await copyFile(generated+'/exec-04e74ba2-c684-406c-bca1-c78be08ed17c.png',citySource+'/generation-reference.png',1);
 await copyFile(generated+'/exec-3d5223e8-0f03-424a-9b1b-c1beb036e7e6.png',iconSource+'/original.png',1);
}
const mapInfo=await sharp(citySource+'/original.png').webp({quality:92}).toFile('public/assets/maps/daflak-city-v001.webp');
await writeFile(citySource+'/metadata.json',JSON.stringify({styleId:'MR-ART-v1',assetId:'daflak-city',revision:'v001',status:'reviewed',sourcePath:citySource+'/original.png',promptPath:citySource+'/PROMPT.md',references:[citySource+'/generation-reference.png'],generationTool:'built-in image_gen (earlier turn)',exportPath:'public/assets/maps/daflak-city-v001.webp',width:mapInfo.width,height:mapInfo.height,logicalGrid:[40,40],worldTileSize:128,worldSize:[5120,5120],note:'Painted concept backdrop scaled in Phaser, NOT a reusable tileset. Main road collision is authored separately; painted objects have no separate depth layers.'},null,2));
const pngs=[];
for(const size of [16,32,48,180,192,512]){
 const png=await sharp(iconSource+'/original.png').resize(size,size,{fit:'contain',background:'#00000000'}).png().toBuffer();
 await writeFile('public/assets/icons/mythraven-'+size+'-v001.png',png);
 if(size<=48)pngs.push({size,png});
}
// ICO container with three PNG-encoded entries, not a PNG renamed to .ico.
const header=Buffer.alloc(6+16*pngs.length);header.writeUInt16LE(1,2);header.writeUInt16LE(pngs.length,4);
let offset=header.length;
pngs.forEach(({size,png},i)=>{const at=6+i*16;header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length;});
await writeFile('public/favicon.ico',Buffer.concat([header,...pngs.map(x=>x.png)]));
await writeFile(iconSource+'/metadata.json',JSON.stringify({styleId:'MR-ART-v1',assetId:'mythraven-favicon',revision:'v001',status:'reviewed',sourcePath:iconSource+'/original.png',promptPath:iconSource+'/PROMPT.md',references:['public/assets/ui/mythraven-logo-v001.webp'],generationTool:'built-in image_gen (earlier turn)',sizes:[16,32,48,180,192,512],icoSizes:[16,32,48]},null,2));
console.log('City export:',mapInfo.width,mapInfo.height,'; exported favicon PNGs and true ICO container.');

