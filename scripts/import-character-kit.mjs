// node scripts/import-character-kit.mjs <owner character folder>
import {NodeIO} from '@gltf-transform/core';
import {EXTTextureWebP} from '@gltf-transform/extensions';
import {dedup, prune, textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const source = process.argv[2];
if (!source) throw new Error('Provide the exported character directory.');
const output = fileURLToPath(new URL('../public/assets/models/characters/', import.meta.url));
const io = new NodeIO().registerExtensions([EXTTextureWebP]);
const files = [
  ['novice/3-novice-no-hair', 'bodies/novice'],
  ['warrior/3-warrior-no-hair', 'bodies/warrior'],
  ['archer/m1-archer-no-hair', 'bodies/archer'],
  ['novice/3-novice-hair-01', 'hair/male-01'],
  ['novice/3-novice-hair-02', 'hair/male-02'],
  ['animation-obj/1-dagger-novice', 'weapons/dagger'],
  ['animation-obj/1-sword-warrior', 'weapons/longsword'],
  ['animation-obj/1-bow-archer', 'weapons/bow'],
];

for (const [input, name] of files) {
  const doc = await io.read(join(source, input + '.glb'));
  const root = doc.getRoot();
  if (!name.startsWith('bodies/')) {
    for (const clip of root.listAnimations()) clip.dispose();
    // Compact the exported full armature to the palette referenced by this part.
    const skin = root.listSkins()[0], joints = skin.listJoints();
    const primitives = root.listMeshes().flatMap(mesh => mesh.listPrimitives());
    const palette = new Set();
    for (const p of primitives) {
      const indices = p.getAttribute('JOINTS_0').getArray(), weights = p.getAttribute('WEIGHTS_0').getArray();
      for (let i=0; i<indices.length; i++) if (weights[i]>0) palette.add(indices[i]);
    }
    const used = [...palette].sort((a,b)=>a-b);
    const remap = new Map(used.map((old,i)=>[old,i]));
    for (const p of primitives) {
      const indices = p.getAttribute('JOINTS_0').getArray();
      for (let i=0; i<indices.length; i++) indices[i] = remap.get(indices[i]) ?? 0;
    }
    const accessor = skin.getInverseBindMatrices(), inverses = accessor.getArray();
    accessor.setArray(Float32Array.from(used.flatMap(i=>Array.from(inverses.subarray(i*16,i*16+16)))));
    for (const joint of joints) skin.removeJoint(joint);
    for (const i of used) skin.addJoint(joints[i]);
    root.listMeshes()[0].setName(name.split('/').at(-1));
  }
  // Both names identify the right-hand grip in the owner's corresponding rigs.
  for (const node of root.listNodes()) if(node.getName()==='DEF-Bone') node.setName('DEF-hold.R');
  await doc.transform(dedup(),prune({keepAttributes:true}),
    textureCompress({encoder:sharp, targetFormat:'webp', resize:[1024,1024],quality:93}));
  const target = join(output,name+'.glb');
  await mkdir(dirname(target),{recursive:true});
  await io.write(target,doc);
  console.log(name);
}
