import {NodeIO} from '@gltf-transform/core';import {transformMesh} from '@gltf-transform/functions';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('assets/pending/buildings/manifest.json','utf8'));
const specs=[['house-red-gable',15],['house-banner',17],['house-blue-awning',16],['house-red-cottage',14],['castle-red-spires',56],['market-produce-cart',6],['tavern-red-awning',17],['market-produce-stall',7],['shop-red-awning',16],['plaza-angel-fountain',9]];
const io=new NodeIO(),output='public/assets/models/buildings',metadata={};await mkdir(output,{recursive:true});
for(const [i,entry] of manifest.entries.entries()){
 const [id,height]=specs[i],rootPath='assets/pending/buildings/'+entry.id,doc=await io.read(rootPath+'/'+entry.files[0].file),root=doc.getRoot();
 assert.equal(root.listMeshes().length,1);for(const n of root.listNodes())assert.deepEqual(n.getMatrix(),[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const mesh=root.listMeshes()[0],p=mesh.listPrimitives()[0],pos=p.getAttribute('POSITION'),min=pos.getMin([]),max=pos.getMax([]),s=height/(max[1]-min[1]);
 transformMesh(mesh,[s,0,0,0,0,s,0,0,0,0,s,0,-(min[0]+max[0])*.5*s,-min[1]*s,-(min[2]+max[2])*.5*s,1]);
 mesh.setName(id);root.listNodes().forEach(n=>n.setName(id));root.listMaterials().forEach(m=>m.setName(id+'-pbr'));
 if(entry.files[1]){const bytes=await readFile(rootPath+'/'+entry.files[1].file),texture=doc.createTexture(id+'-emissive').setImage(bytes).setMimeType('image/png');root.listMaterials().forEach(m=>m.setEmissiveTexture(texture).setEmissiveFactor([1,1,1]));}
 await io.write(output+'/'+id+'.glb',doc);
 metadata[id]={url:'/assets/models/buildings/'+id+'.glb',height,width:(max[0]-min[0])*s,depth:(max[2]-min[2])*s,sourceId:entry.sourceId,emissive:!!entry.files[1]};
 entry.runtime=id;entry.category=id;entry.status='integrated-city-2026-11-15';
}
await writeFile('shared/building-assets.json',JSON.stringify(metadata,null,2)+'\n');
manifest.status='Owner authorized city placement 2026-11-15. Originals retained as active importer inputs; see scripts/import-city-buildings.mjs.';
await writeFile('assets/pending/buildings/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(metadata,null,2));
