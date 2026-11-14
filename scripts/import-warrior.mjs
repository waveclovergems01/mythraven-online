// Import the owner Warrior base and extract its compatible second hairstyle.
// Usage: node scripts/import-warrior.mjs <path/to/m1-warrior1.glb> <path/to/m1-warrior2.glb>
import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { stat, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const [baseInput, input] = process.argv.slice(2);
if (!baseInput || !input) throw new Error('Provide both Warrior owner source paths.');
const basePath = fileURLToPath(new URL('../public/assets/models/characters/m1-warrior1.glb', import.meta.url));
const output = fileURLToPath(new URL('../public/assets/models/characters/warrior-hair-02.glb', import.meta.url));
const io = new NodeIO();
const base = await io.read(baseInput), doc = await io.read(input), root = doc.getRoot();
const baseSkin = base.getRoot().listSkins()[0], skin = root.listSkins()[0];
assert.ok(baseSkin && skin, 'Both files must contain a skin');
const boneSignature = s => s.listJoints().map(n => ({ name: n.getName(), t: n.getTranslation(), r: n.getRotation(), s: n.getScale(), children: n.listChildren().map(c => c.getName()) }));
assert.deepEqual(boneSignature(skin), boneSignature(baseSkin), 'Hair rig differs from the base rig');
assert.deepEqual(skin.getInverseBindMatrices().getArray(), baseSkin.getInverseBindMatrices().getArray(), 'Hair bind pose differs');
const clipSignature = doc => doc.getRoot().listAnimations().map(a => [a.getName(), a.listChannels().map(c => [
  c.getTargetNode().getName(), c.getTargetPath(), c.getSampler().getInterpolation(),
  c.getSampler().getInput().getArray(), c.getSampler().getOutput().getArray()])]);
assert.deepEqual(clipSignature(doc), clipSignature(base), 'Warrior variants have different clips: do not discard them');
for (const name of ['n_war_idle', 'n_war_run']) assert.ok(base.getRoot().listAnimations().some(a => a.getName() === name), `Missing ${name}`);
const matches = root.listMeshes().flatMap(mesh => mesh.listPrimitives()
  .filter(p => p.getMaterial()?.getName() === 'model.014').map(primitive => ({ mesh, primitive })));
assert.equal(matches.length, 1, 'Expected the second hairstyle material model.014 exactly once');
const { mesh, primitive } = matches[0];
const material = primitive.getMaterial();
const images = [material.getBaseColorTexture(), material.getMetallicRoughnessTexture(), material.getNormalTexture(),
  material.getOcclusionTexture(), material.getEmissiveTexture()].filter(Boolean).map(t => Buffer.from(t.getImage()));
const attributes = primitive.listSemantics().map(s => [s, primitive.getAttribute(s).getArray().slice()]);
const indices = primitive.getIndices().getArray().slice();
for (const animation of root.listAnimations()) animation.dispose();
for (const node of root.listNodes()) {
  if (node.getMesh() && node.getMesh() !== mesh) node.dispose();
  else if (node.getMesh() === mesh) node.setName('Warrior_Hair_02');
}
for (const other of mesh.listPrimitives()) if (other !== primitive) mesh.removePrimitive(other);
mesh.setName('Warrior_Hair_02');
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
await copyFile(baseInput, basePath);
console.log(JSON.stringify({ basePath, output, bytes: (await stat(output)).size, triangles: exported.getIndices().getCount()/3,
  bones: result.listSkins()[0].listJoints().length, textures: result.listTextures().length, animations: 0 }));
