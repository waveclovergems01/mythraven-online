import sharp from 'sharp';
import {mkdir, writeFile} from 'node:fs/promises';
const iconSource='art/source/ui/favicon';
await mkdir('public/assets/icons',{recursive:true});
const pngs=[];
for(const size of [16,32,48,180,192,512]){
 const png=await sharp(iconSource+'/original.png').resize(size,size,{fit:'contain',background:'#00000000'}).png().toBuffer();
 if(size!==48)await writeFile('public/assets/icons/mythraven-'+size+'.png',png);
 if(size<=48)pngs.push({size,png});
}
// ICO container with three PNG-encoded entries, not a PNG renamed to .ico.
const header=Buffer.alloc(6+16*pngs.length);header.writeUInt16LE(1,2);header.writeUInt16LE(pngs.length,4);
let offset=header.length;
pngs.forEach(({size,png},i)=>{const at=6+i*16;header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(png.length,at+8);header.writeUInt32LE(offset,at+12);offset+=png.length;});
await writeFile('public/favicon.ico',Buffer.concat([header,...pngs.map(x=>x.png)]));
console.log('Exported favicon PNGs and true ICO container.');

