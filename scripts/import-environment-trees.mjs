// Maintained importer for the owner's three static GLBs. Texture bytes are preserved.
// node scripts/import-environment-trees.mjs <external asset directory>
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, transformMesh } from '@gltf-transform/functions';
import { mkdir, stat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const directory = process.argv[2];
if (!directory) throw new Error('Supply the owner GLB directory.');
const io = new NodeIO(), output = resolve('public/assets/models/trees');
await mkdir(output, { recursive: true });
for (const [source, slug, name, height] of [
  ['base_basic_pbr(4).glb', 'tree-oak-green', 'Tree_Oak_Green', 9],
  ['base_basic_pbr.glb', 'tree-pine-green', 'Tree_Pine_Green', 11],
  ['base_basic_pbr(1).glb', 'tree-coconut-palm', 'Tree_Coconut_Palm', 10],
]) {
  const input = resolve(directory, source), doc = await io.read(input), root = doc.getRoot();
  assert.equal(root.listMeshes().length, 1); assert.equal(root.listSkins().length, 0); assert.equal(root.listAnimations().length, 0);
  const mesh = root.listMeshes()[0], p = mesh.listPrimitives()[0], position = p.getAttribute('POSITION');
  const a = position.getArray(); let minY = Infinity, maxY = -Infinity;
  for (let i = 1; i < a.length; i += 3) { minY = Math.min(minY, a[i]); maxY = Math.max(maxY, a[i]); }
  let x = 0, z = 0, n = 0;
  for (let i = 0; i < a.length; i += 3) if (a[i + 1] < minY + (maxY - minY) * .025) { x += a[i]; z += a[i + 2]; n++; }
  const scale = height / (maxY - minY);
  transformMesh(mesh, [scale,0,0,0,0,scale,0,0,0,0,scale,0,-x/n*scale,-minY*scale,-z/n*scale,1]);
  mesh.setName(name); root.listNodes().forEach(node => node.setName(name));
  root.listMaterials().forEach(material => {
    material.setName(name + '_PBR');
    assert.ok(material.getBaseColorTexture() && material.getNormalTexture() && material.getMetallicRoughnessTexture());
    assert.equal(material.getEmissiveTexture(), null);
  });
  const textures = root.listTextures().map(t => Buffer.from(t.getImage()));
  await doc.transform(dedup(), prune());
  const filename = resolve(output, slug + '.glb'); await io.write(filename, doc);
  const check = (await io.read(filename)).getRoot();
  assert.equal(check.listMeshes()[0].getName(), name);
  assert.deepEqual(check.listTextures().map(t => Buffer.from(t.getImage())), textures);
  console.log(JSON.stringify({ source, runtime: slug + '.glb', height, triangles: p.getIndices().getCount()/3,
    bytes: (await stat(filename)).size, sourceSha256: createHash('sha256').update(await readFile(input)).digest('hex') }));
}
