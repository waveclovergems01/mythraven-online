import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const records=[];
for(const name of ['yellow','clover','tulip']){
 const source=`art/source/props/daflak-flowers/${name}.png`;
 const stats=await sharp(source).stats();if(stats.isOpaque)throw Error(`No alpha: ${name}`);
 const output=`public/assets/props/daflak-${name}.png`;
 await sharp(source).trim().resize(128,128,{fit:'contain',background:'#00000000'}).png().toFile(output);
 records.push({styleId:'MR-ART-v1',assetId:`daflak-${name}`,status:'candidate-local-preview',sourcePath:source,exportPath:output,promptPath:'art/source/props/daflak-flowers/PROMPTS.md',referenceAtGeneration:'previous public/assets/tiles/daflak-grass.png (attached, superseded)',generationTool:'built-in image_gen',width:128,height:128,runtimeWidthCSS:[22,36],alpha:true});
}
await writeFile('art/source/props/daflak-flowers/metadata.json',JSON.stringify(records,null,2));
