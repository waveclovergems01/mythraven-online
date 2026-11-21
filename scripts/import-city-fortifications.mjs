// Owner PBR sources; preserve materials/textures, normalize metres and ground pivot.
// node scripts/import-city-fortifications.mjs <owner asset directory>
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, transformMesh } from '@gltf-transform/functions';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const directory = process.argv[2];
if (!directory) throw new Error('Supply the owner asset directory');
const entries = [
  ['2e4ab540-7366-40a4-a93a-517d1d1655b9/base_basic_pbr.glb', 'city-gate', 24],
  ['4d51879d-1743-4688-831b-bdaefc1037f7/base_basic_pbr.glb', 'city-wall-banner', 12],
  ['8f34be8b-b817-4d66-8803-6756a4fbf5a1/base_basic_pbr.glb', 'city-stone-bridge', 10],
  ['base_basic_pbr(2).glb', 'city-watchtower', 21],
  ['base_basic_pbr(3).glb', 'city-wall', 12],
];
const io = new NodeIO(), output = resolve('public/assets/models/fortifications'), metadata = {};
await mkdir(output, { recursive: true });
for (const [source, id, height] of entries) {
  const input = resolve(directory, source), doc = await io.read(input), root = doc.getRoot();
  assert.equal(root.listMeshes().length, 1); assert.equal(root.listSkins().length, 0);
  assert.equal(root.listAnimations().length, 0);
  for (const node of root.listNodes()) assert.deepEqual(node.getMatrix(), [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const mesh = root.listMeshes()[0], primitive = mesh.listPrimitives()[0], position = primitive.getAttribute('POSITION');
  const min = position.getMin([]), max = position.getMax([]), scale = height / (max[1] - min[1]);
  transformMesh(mesh, [scale,0,0,0,0,scale,0,0,0,0,scale,0,-(min[0]+max[0])*.5*scale,-min[1]*scale,-(min[2]+max[2])*.5*scale,1]);
  mesh.setName(id); root.listNodes().forEach(n => n.setName(id));
  root.listMaterials().forEach(m => { m.setName(id+'-pbr'); assert.ok(m.getBaseColorTexture() && m.getNormalTexture() && m.getMetallicRoughnessTexture()); });
  const textures = root.listTextures().map(t => Buffer.from(t.getImage()));
  await doc.transform(dedup(), prune());
  const filename = resolve(output, id+'.glb'); await io.write(filename, doc);
  assert.deepEqual((await io.read(filename)).getRoot().listTextures().map(t => Buffer.from(t.getImage())), textures);
  const transformed = mesh.listPrimitives()[0].getAttribute('POSITION');
  const boundsMin = transformed.getMin([]), boundsMax = transformed.getMax([]);
  const info = { url: '/assets/models/fortifications/'+id+'.glb', width: boundsMax[0]-boundsMin[0], height,
    depth: boundsMax[2]-boundsMin[2], triangles: primitive.getIndices().getCount()/3,
    bytes: (await stat(filename)).size, source, sha256: createHash('sha256').update(await readFile(input)).digest('hex') };
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(transformed.getArray(),3));
  geometry.setIndex(new THREE.BufferAttribute(primitive.getIndices().getArray(),1));
  const proxy = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})); proxy.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  if (id === 'city-stone-bridge') {
    info.deck = [];
    for (let j=0;j<=64;j++) {
      const x = -info.width*.49+info.width*.98*j/64;
      ray.set(new THREE.Vector3(x, height+1, 0),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObject(proxy)[0]; assert.ok(hit,'Bridge has a continuous centre deck');
      info.deck.push([x,hit.point.y]);
    }
  }
  if (id === 'city-gate') {
    let half=0;
    for(let x=0;x<info.width/2;x+=.05) {
      let clear=true;
      for(const y of [.1, .7, 1.4, 2.1, 2.9, 3.5]) {
        ray.set(new THREE.Vector3(x,y,info.depth+1),new THREE.Vector3(0,0,-1));
        if(ray.intersectObject(proxy).length){clear=false;break;}
        ray.set(new THREE.Vector3(-x,y,info.depth+1),new THREE.Vector3(0,0,-1));
        if(ray.intersectObject(proxy).length){clear=false;break;}
      }
      if(!clear)break; half=x;
    }
    info.passageHalfWidth=half; console.log('Gate half clearance',half); assert.ok(half>1.7,'Gate opening fits the player with navigation clearance');
  }
  metadata[id]=info; console.log(JSON.stringify(info));
  geometry.dispose(); proxy.material.dispose();
}
await writeFile('shared/fortification-assets.json',JSON.stringify(metadata,null,2)+'\n');
