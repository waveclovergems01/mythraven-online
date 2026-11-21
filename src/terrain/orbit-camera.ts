import * as THREE from 'three';
import { TERRAIN, type TerrainData } from './terrain-data';
import { terrainHeight } from './terrain-movement';

/** Orbit is presentation only: it never turns the avatar or changes its destination. */
export function createOrbitCamera(data: TerrainData) {
  const distance = Math.hypot(45, 55);
  const camera = new THREE.PerspectiveCamera(28.4, 1, .15, 1800);
  const target = new THREE.Vector3(), offset = new THREE.Vector3();
  const ray = new THREE.Raycaster(), point = new THREE.Vector3();
  let slide = 0, orbitDistance = distance, groundY = 0;
  let yaw = 0, pitch = Math.atan2(45, 55);
  const reset = () => { yaw = 0; pitch = Math.atan2(45, 55); };
  const floor = (x: number, z: number) => Math.abs(x) <= TERRAIN.size / 2 && Math.abs(z) <= TERRAIN.size / 2
    ? Math.max(TERRAIN.waterLevel, terrainHeight(data, x, z)) : TERRAIN.waterLevel;
  return {
    camera,
    reset,
    drag(dx: number, dy: number) {
      yaw = THREE.MathUtils.euclideanModulo(yaw - dx * .006, Math.PI * 2);
      pitch = THREE.MathUtils.clamp(pitch + dy * .004, THREE.MathUtils.degToRad(-65), THREE.MathUtils.degToRad(78));
    },
    resize(width: number, height: number) {
      camera.aspect = width / height;
      // Retain the old default framing, including narrow portrait screens.
      const span = Math.max(36, 26 / camera.aspect);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(span / (2 * distance)));
      camera.updateProjectionMatrix();
    },
    update(focus: THREE.Vector3) {
      groundY = focus.y;
      // Below the level view, vertical drag becomes a reversible dolly toward
      // the player. Keep the aim on their upper body instead of looking away.
      slide = THREE.MathUtils.smoothstep(-pitch, 0, THREE.MathUtils.degToRad(65));
      // Leave enough room for the whole 2.8-unit avatar even at 200% zoom.
      const closeDistance = 12 * Math.max(1, camera.zoom);
      orbitDistance = THREE.MathUtils.lerp(distance, closeDistance, slide);
      target.copy(focus); target.y += THREE.MathUtils.lerp(1, 1.75, slide);
      const horizontal = Math.cos(Math.max(0, pitch)) * orbitDistance;
      offset.set(Math.sin(yaw) * horizontal, Math.sin(pitch) * orbitDistance, Math.cos(yaw) * horizontal);
      camera.position.copy(target).add(offset);
      // Test the whole boom, not just the camera endpoint. Raise above intervening
      // banks and keep the near plane above ground/water even at the lowest pitch.
      let cameraY = Math.max(camera.position.y, floor(camera.position.x, camera.position.z) + .65);
      const feetY = focus.y + .15;
      for (let i = 1; i <= 96; i++) {
        const t = i / 96;
        const x = target.x + offset.x * t, z = target.z + offset.z * t;
        cameraY = Math.max(cameraY, target.y + (floor(x, z) + .4 - target.y) / t);
        // A clear line to the chest alone can still hide the legs behind a bank.
        cameraY = Math.max(cameraY, feetY + (floor(x, z) + .1 - feetY) / t);
      }
      camera.position.y = cameraY;
      camera.lookAt(target);
      camera.updateMatrixWorld();
    },
    footprint() {
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
        ray.setFromCamera(new THREE.Vector2(x, y), camera);
        const travel = ray.ray.direction.y < -.001 ? (groundY - ray.ray.origin.y) / ray.ray.direction.y : 600;
        ray.ray.at(THREE.MathUtils.clamp(travel, 0, 600), point);
        return { x: point.x, z: point.z };
      });
    },
    inspect: () => ({ yaw: THREE.MathUtils.radToDeg(yaw), pitch: THREE.MathUtils.radToDeg(pitch),
      slide, distance: orbitDistance, target: target.toArray(),
      clearance: camera.position.y - floor(camera.position.x, camera.position.z) }),
  };
}
