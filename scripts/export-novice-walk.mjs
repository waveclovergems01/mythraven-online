import fs from 'node:fs/promises';import sharp from 'sharp';
const source='art/source/characters/novice-male-walk-w-v005/novice-male-walk-w-v005.png';
const meta=await sharp(source).metadata();
if(meta.width!==960||meta.height!==480||!meta.hasAlpha)throw Error('Invalid approved walk atlas');
await fs.copyFile(source,'public/assets/characters/novice-male-walk-w.png');
console.log('Exported approved west walk; east uses runtime flipX.');

