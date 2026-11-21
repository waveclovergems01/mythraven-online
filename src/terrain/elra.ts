import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createPlayerHighlight} from './player-highlight';

export const ELRA_ID = 'npc:elra';
const callInterval = () => 45 + Math.random() * 30;

export async function loadElra() {
  const {scene, animations} = await new GLTFLoader().loadAsync('/assets/models/npcs/elra-provisions.glb');
  const mixer = new THREE.AnimationMixer(scene);
  function action(name: string) {
    const clip = THREE.AnimationClip.findByName(animations, name);
    if (!clip) throw new Error('Missing Elra animation: ' + name);
    return mixer.clipAction(clip);
  }
  const idle = action('n_idle').play();
  const call = action('n_idle_call').setLoop(THREE.LoopOnce, 1);
  const welcome = action('n_idle_welcome').setLoop(THREE.LoopOnce, 1);
  call.clampWhenFinished = welcome.clampWhenFinished = true;
  mixer.update(0);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene, true);
  const scale = 2.8 / (box.max.y-box.min.y);
  const center = box.getCenter(new THREE.Vector3());
  const group = new THREE.Group();
  group.name = ELRA_ID;
  scene.scale.multiplyScalar(scale);
  scene.position.add(new THREE.Vector3(-center.x, -box.min.y, -center.z).multiplyScalar(scale));
  group.add(scene);
  scene.traverse(o => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = o.receiveShadow = o.userData.playerSurface = true;
    }
  });
  const highlight = createPlayerHighlight(group);
  let active = idle, untilCall = callInterval(), bowCooldown = 0;
  function play(next: THREE.AnimationAction) {
    if (active === next) return;
    next.reset().play().crossFadeFrom(active, .2, false);
    active = next;
  }
  mixer.addEventListener('finished', event => {
    if (event.action === active) play(idle);
  });
  return {group, highlight,
    greet() {
      if (bowCooldown > 0) return;
      play(welcome); bowCooldown = welcome.getClip().duration + 2; untilCall = callInterval();
    },
    update(dt: number) {
      const step = Math.min(dt,.1);
      mixer.update(step);
      bowCooldown = Math.max(0,bowCooldown-step);
      if (active === idle && (untilCall -= step) <= 0) { play(call); untilCall = callInterval(); }
    },
    dispose() {
      highlight.dispose(); group.removeFromParent(); mixer.stopAllAction(); mixer.uncacheRoot(scene);
      const resources = new Set<THREE.Texture|THREE.BufferGeometry|THREE.Material|THREE.Skeleton>();
      scene.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return;
        resources.add(o.geometry);
        if (o instanceof THREE.SkinnedMesh) resources.add(o.skeleton);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          resources.add(m);
          for (const t of Object.values(m)) if (t instanceof THREE.Texture) resources.add(t);
        }
      });
      resources.forEach(r => {r.dispose(); if (r instanceof THREE.Texture && r.image instanceof ImageBitmap) r.image.close();});
    }
  };
}
