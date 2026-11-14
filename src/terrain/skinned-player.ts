import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { speedMultiplier, DEFAULT_SPEED_LEVEL } from '../../shared/terrain-movement.mjs';

export interface PlayerAssetDefinition {
  model: string; url: string; hairUrl: string; hairNode: string; hairMaterial: string;
  idle: string; run: string;
}
const HEIGHT = 2.8;

/** One asset per world; geometry, materials and clips are shared, poses never are. */
export async function loadSkinnedPlayers(definition: PlayerAssetDefinition) {
  const gltf = await new GLTFLoader().loadAsync(definition.url);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const sourceSkeletons = new Set<THREE.Skeleton>();
  const collectResources = (scene: THREE.Object3D) => scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    object.userData.playerSurface = true;
    if (object instanceof THREE.SkinnedMesh) sourceSkeletons.add(object.skeleton);
  });
  collectResources(gltf.scene);
  let disposed = false;
  const dispose = () => {
    if (disposed) return; disposed = true;
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    textures.forEach(t => { t.dispose(); if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close(); });
    sourceSkeletons.forEach(s => s.dispose());
  };
  let hairAsset;
  try { hairAsset = await new GLTFLoader().loadAsync(definition.hairUrl); }
  catch (error) { dispose(); throw error; }
  collectResources(hairAsset.scene);
  const newHair = hairAsset.scene.getObjectByName(definition.hairNode);
  let oldHair: THREE.SkinnedMesh | undefined;
  gltf.scene.traverse(object => {
    if (object instanceof THREE.SkinnedMesh && !Array.isArray(object.material) && object.material.name === definition.hairMaterial) {
      oldHair = object; object.userData.hairStyle = 1;
    }
  });
  if (!(newHair instanceof THREE.SkinnedMesh) || !oldHair
    || newHair.skeleton.bones.length !== oldHair.skeleton.bones.length
    || !newHair.skeleton.bones.every((bone, i) => bone.name === oldHair!.skeleton.bones[i].name
      && newHair.skeleton.boneInverses[i].equals(oldHair!.skeleton.boneInverses[i]))) {
    dispose(); throw new Error(`${definition.model} hairstyle has an incompatible skin binding`);
  }
  const idle = gltf.animations.find(clip => clip.name === definition.idle);
  const run = gltf.animations.find(clip => clip.name === definition.run);
  if (!idle || !run) { dispose(); throw new Error(`${definition.model} GLB requires ${definition.idle} and ${definition.run}`); }
  // Measure the standing pose, not the exported rest pose with outstretched arms.
  const referenceMixer = new THREE.AnimationMixer(gltf.scene);
  referenceMixer.clipAction(idle).play(); referenceMixer.update(0);
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
  const scale = HEIGHT / (bounds.max.y - bounds.min.y);
  const center = bounds.getCenter(new THREE.Vector3());
  referenceMixer.stopAllAction(); referenceMixer.uncacheRoot(gltf.scene);
  const shadowGeometry = new THREE.CircleGeometry(.85, 32);
  const ringGeometry = new THREE.RingGeometry(.85, .93, 40);
  geometries.add(shadowGeometry); geometries.add(ringGeometry);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#263b2e', transparent: true, opacity: .2, depthWrite: false });
  const ringMaterials = [true, false].map(mine => new THREE.MeshBasicMaterial({
    color: mine ? '#e9d392' : '#bcd3dd', transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide,
  }));
  materials.add(shadowMaterial); ringMaterials.forEach(m => materials.add(m));
  return {
    dispose,
    create(mine: boolean, initialHairStyle = 1) {
      const group = new THREE.Group(); group.name = `${definition.model}-player`;
      const model = clone(gltf.scene);
      const visual = new THREE.Group(); visual.name = `${definition.model}-visual`;
      visual.scale.setScalar(scale);
      visual.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      visual.add(model); group.add(visual);
      const skeletons = new Set<THREE.Skeleton>();
      model.traverse(object => {
        if (object instanceof THREE.SkinnedMesh) {
          // GLTF primitives can clone the same skin separately. Within one
          // avatar, use one palette for meshes with the identical bone binding.
          const existing = [...skeletons].find(s => s.bones.length === object.skeleton.bones.length
            && s.bones.every((bone, i) => bone === object.skeleton.bones[i]
              && s.boneInverses[i].equals(object.skeleton.boneInverses[i])));
          if (existing) object.skeleton = existing;
          skeletons.add(object.skeleton);
          // Conservative local bounds cover both authored poses without per-frame
          // full-mesh bounds scans or stale rest-pose raycast rejection.
          object.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 4);
          object.boundingBox = new THREE.Box3(new THREE.Vector3(-4, -3, -4), new THREE.Vector3(4, 5, 4));
          object.frustumCulled = false;
        }
      });
      // Keep both lightweight hair meshes on the same animated skeleton, toggling
      // visibility without recreating the avatar, its mixer, or its current pose.
      let hairOne!: THREE.SkinnedMesh;
      model.traverse(object => { if (object instanceof THREE.SkinnedMesh && object.userData.hairStyle === 1) hairOne = object; });
      const hairTwo = new THREE.SkinnedMesh(newHair.geometry, newHair.material);
      hairTwo.name = `${definition.model}-hair-02`; hairTwo.userData.playerSurface = true; hairTwo.userData.hairStyle = 2;
      hairTwo.position.copy(hairOne.position); hairTwo.quaternion.copy(hairOne.quaternion); hairTwo.scale.copy(hairOne.scale);
      hairTwo.bindMode = hairOne.bindMode; hairTwo.bindMatrix.copy(newHair.bindMatrix);
      hairTwo.bindMatrixInverse.copy(newHair.bindMatrixInverse); hairTwo.skeleton = hairOne.skeleton;
      hairTwo.frustumCulled = false; hairTwo.boundingSphere = hairOne.boundingSphere.clone(); hairTwo.boundingBox = hairOne.boundingBox.clone();
      hairOne.parent!.add(hairTwo);
      let hairStyle = 1;
      const setHairStyle = (value: number) => {
        hairStyle = value === 2 ? 2 : 1;
        hairOne.visible = hairStyle === 1; hairTwo.visible = hairStyle === 2;
      };
      setHairStyle(initialHairStyle);
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = .035; group.add(shadow);
      const ring = new THREE.Mesh(ringGeometry, ringMaterials[mine ? 0 : 1]);
      ring.rotation.x = -Math.PI / 2; ring.position.y = .06; group.add(ring);
      const mixer = new THREE.AnimationMixer(model);
      const actions = { idle: mixer.clipAction(idle), run: mixer.clipAction(run) };
      let state: 'idle' | 'run' = 'idle';
      actions.idle.play(); mixer.update(0);
      return {
        group,
        setHairStyle,
        update(delta: number, moving: boolean, speedLevel: number) {
          const next = moving ? 'run' : 'idle';
          if (next !== state) {
            const previous = actions[state];
            actions[next].reset().setEffectiveWeight(1).play();
            previous.crossFadeTo(actions[next], .15, false); state = next;
          }
          // Exploration speed is deliberately exaggerated; cap cadence to keep
          // the supplied run readable rather than playing it five times faster.
          actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speedMultiplier(speedLevel) / speedMultiplier(DEFAULT_SPEED_LEVEL), .65, 1.6));
          mixer.update(Math.min(delta, .1));
        },
        inspect: () => ({ state, clip: actions[state].getClip().name, hairStyle, model: definition.model }),
        dispose() {
          mixer.stopAllAction(); mixer.uncacheRoot(model);
          skeletons.forEach(s => s.dispose()); group.removeFromParent();
        },
      };
    },
  };
}
