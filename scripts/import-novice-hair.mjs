// Re-import the owner's second hairstyle without shipping a second full avatar.
// Usage: node scripts/import-novice-hair.mjs <path/to/m1-novice2.glb>
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const input = process.argv[2];
if (!input) throw new Error('Provide the owner m1-novice2.glb source path.');
const basePath = fileURLToPath(new URL('../public/assets/models/characters/m1-novice.glb', import.meta.url));
const output = fileURLToPath(new URL('../public/assets/models/characters/novice-hair-02.glb', import.meta.url));
const io = new NodeIO();
const base = await io.read(basePath), doc = await io.read(input), root = doc.getRoot();
const baseSkin = base.getRoot().listSkins()[0], skin = root.listSkins()[0];
assert.ok(baseSkin && skin, 'Both files must contain a skin');
const boneSignature = s => s.listJoints().map(n => ({ name: n.getName(), t: n.getTranslation(), r: n.getRotation(), s: n.getScale(), children: n.listChildren().map(c => c.getName()) }));
assert.deepEqual(boneSignature(skin), boneSignature(baseSkin), 'Hair rig differs from the base rig');
assert.deepEqual(skin.getInverseBindMatrices().getArray(), baseSkin.getInverseBindMatrices().getArray(), 'Hair bind pose differs');
const matches = root.listMeshes().flatMap(mesh => mesh.listPrimitives()
  .filter(p => p.getMaterial()?.getName() === 'model.021').map(primitive => ({ mesh, primitive })));
assert.equal(matches.length, 1, 'Expected the second hairstyle material model.021 exactly once');
const { mesh, primitive } = matches[0];
const material = primitive.getMaterial();
const images = [material.getBaseColorTexture(), material.getMetallicRoughnessTexture(), material.getNormalTexture(),
  material.getOcclusionTexture(), material.getEmissiveTexture()].filter(Boolean).map(t => Buffer.from(t.getImage()));
const attributes = primitive.listSemantics().map(s => [s, primitive.getAttribute(s).getArray().slice()]);
const indices = primitive.getIndices().getArray().slice();
for (const animation of root.listAnimations()) animation.dispose();
for (const node of root.listNodes()) {
  if (node.getMesh() && node.getMesh() !== mesh) node.dispose();
  else if (node.getMesh() === mesh) node.setName('Novice_Hair_02');
}
for (const other of mesh.listPrimitives()) if (other !== primitive) mesh.removePrimitive(other);
mesh.setName('Novice_Hair_02');
await doc.transform(prune({ keepAttributes: true }));
await io.write(output, doc);
const check = await io.read(output), result = check.getRoot();
assert.equal(result.listAnimations().length, 0);
assert.equal(result.listMeshes().length, 1);
assert.equal(result.listMaterials().length, 1);
const exported = result.listMeshes()[0].listPrimitives()[0];
assert.deepEqual(exported.getIndices().getArray(), indices);
const exportedBones = boneSignature(result.listSkins()[0]), baseBones = boneSignature(baseSkin);
assert.equal(exportedBones.length, baseBones.length);
exportedBones.forEach((bone, i) => {
  assert.equal(bone.name, baseBones[i].name);
  assert.deepEqual(bone.children, baseBones[i].children);
  // glTF Transform omits near-identity TRS components when serializing.
  for (const key of ['t', 'r', 's']) assert.ok(bone[key].every((v, j) => Math.abs(v-baseBones[i][key][j]) < 1e-5), `Rest transform changed: ${bone.name}.${key}`);
});
assert.deepEqual(result.listSkins()[0].getInverseBindMatrices().getArray(), baseSkin.getInverseBindMatrices().getArray());
for (const [semantic, values] of attributes) assert.deepEqual(exported.getAttribute(semantic).getArray(), values);
assert.deepEqual(result.listTextures().map(t => Buffer.from(t.getImage())), images, 'Texture bytes must remain unchanged');
console.log(JSON.stringify({ output, bytes: (await stat(output)).size, triangles: exported.getIndices().getCount()/3,
  bones: result.listSkins()[0].listJoints().length, textures: result.listTextures().length, animations: 0 }));
