import sharp from 'sharp';
await sharp('art/source/tiles/mythraven-water/original-v001.png').resize(512,512).png().toFile('public/assets/tiles/mythraven-water.png');
