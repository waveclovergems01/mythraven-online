import {sceneryTrees,sceneryHeight} from './world-surroundings';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TREE_MODELS, createTreePlacements } from '../../shared/terrain-props.mjs';
import type { TerrainData } from './terrain-data';
import { terrainHeight } from './terrain-movement';
import { softenPaintedLighting } from './painted-lighting';
import { addTreeWind } from './tree-wind';

/** Static seeded groves: one download/material/geometry per species, spatial instance batches. */
export async function loadCityTrees(data: TerrainData) {
  const group = new THREE.Group(); group.name = 'owner-city-groves';
  const resources = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  const loaded = await Promise.allSettled(TREE_MODELS.map(model => new GLTFLoader().loadAsync(model.url)));
  for (const result of loaded) if (result.status === 'fulfilled') result.value.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.add(value);
    }
  });
  const dispose = () => { group.removeFromParent(); group.children.forEach(child => (child as THREE.InstancedMesh).dispose());
    resources.forEach(value => { value.dispose(); if (value instanceof THREE.Texture && typeof ImageBitmap !== 'undefined' && value.image instanceof ImageBitmap) value.image.close(); }); };
  const failure = loaded.find(result => result.status === 'rejected');
  if (failure?.status === 'rejected') { dispose(); throw failure.reason; }
  const playable = createTreePlacements(data), backdrop=sceneryTrees(data);
  const placements = [...playable,...backdrop];
  const feet = { value: new THREE.Vector2(10, 10) }, head = { value: new THREE.Vector2(10, 10) };
  const radius = { value: .01 }, aspect = { value: 1 }, depth = { value: new THREE.Vector2(-1, -1) };
  const dummy = new THREE.Object3D(), projected = new THREE.Vector3();
  const windTime = { value: 0 };
  loaded.forEach((result, modelIndex) => {
    if (result.status !== 'fulfilled') return;
    let source!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    result.value.scene.traverse(object => { if (object instanceof THREE.Mesh) source = object; });
    const material = source.material;
    material.transparent = true; material.forceSinglePass = true;
    for (const texture of [material.map, material.normalMap, material.roughnessMap, material.metalnessMap]) if (texture) texture.anisotropy = 4;
    material.normalScale.multiplyScalar(.55);
    material.customProgramCacheKey = () => 'owner-trees-soft-toon-wind-v3';
    material.onBeforeCompile = shader => {
      softenPaintedLighting(shader);
      addTreeWind(shader, windTime, TREE_MODELS[modelIndex].height);
      Object.assign(shader.uniforms, { treeFeet: feet, treeHead: head, treeRadius: radius,
        treeAspect: aspect, treeDepth: depth });
      shader.vertexShader = 'varying vec4 treeClip;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\ntreeClip=gl_Position;');
      shader.fragmentShader = `varying vec4 treeClip; uniform vec2 treeFeet,treeHead,treeDepth;
        uniform float treeRadius,treeAspect;\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p=treeClip.xy/treeClip.w;p.x*=treeAspect;
        vec2 segment=treeHead-treeFeet;
        float along=clamp(dot(p-treeFeet,segment)/max(dot(segment,segment),.0001),0.0,1.0);
        float silhouette=1.0-smoothstep(treeRadius*.8,treeRadius*1.8,length(p-(treeFeet+segment*along)));
        float inFront=smoothstep(-.35,.25,mix(treeDepth.x,treeDepth.y,along)-vViewPosition.z);
        diffuseColor.a*=1.0-.95*silhouette*inFront;
      `);
    };
    const shadowMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    shadowMaterial.onBeforeCompile = shader => addTreeWind(shader, windTime, TREE_MODELS[modelIndex].height);
    shadowMaterial.customProgramCacheKey = () => 'owner-tree-wind-depth-v1';
    resources.add(shadowMaterial);
    const patches = new Map<string, THREE.Matrix4[]>();
    for (const placement of placements.filter(p => p.model === modelIndex)) {
      const key = `${Math.floor(placement.x/50)},${Math.floor(placement.z/50)}`;
      dummy.position.set(placement.x, (placement.region==='scenery'?sceneryHeight(data,placement.x,placement.z):terrainHeight(data, placement.x, placement.z)) - .04, placement.z);
      dummy.rotation.set(0, placement.yaw, 0); dummy.scale.setScalar(placement.scale); dummy.updateMatrix();
      if (!patches.has(key)) patches.set(key, []); patches.get(key)!.push(dummy.matrix.clone());
    }
    for (const matrices of patches.values()) {
      const mesh = new THREE.InstancedMesh(source.geometry, material, matrices.length);
      mesh.name = `grove-${TREE_MODELS[modelIndex].id}`; mesh.castShadow = mesh.receiveShadow = true;
      mesh.customDepthMaterial = shadowMaterial;
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      mesh.boundingBox?.expandByScalar(.6); if (mesh.boundingSphere) mesh.boundingSphere.radius += .6;
      group.add(mesh);
    }
  });
  return {
    group,
    update(camera: THREE.PerspectiveCamera, player: THREE.Vector3 | undefined, seconds: number) {
      windTime.value = seconds;
      if (!player) { depth.value.set(-1, -1); return; }
      aspect.value = camera.aspect;
      projected.copy(player); projected.y += .1; projected.project(camera); feet.value.set(projected.x * camera.aspect, projected.y);
      projected.copy(player); projected.y += 3; projected.project(camera); head.value.set(projected.x * camera.aspect, projected.y);
      projected.copy(player); projected.y += .1; projected.applyMatrix4(camera.matrixWorldInverse); depth.value.x = -projected.z;
      radius.value = camera.projectionMatrix.elements[5] / Math.max(1, -projected.z);
      projected.copy(player); projected.y += 3; projected.applyMatrix4(camera.matrixWorldInverse); depth.value.y = -projected.z;
    },
    inspect: () => ({ count: playable.length, sceneryCount:backdrop.length, batches: group.children.length, placements:playable, windTime: windTime.value }),
    dispose,
  };
}
