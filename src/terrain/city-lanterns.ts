import * as THREE from 'three';
import {FOG_START, VIEW_DISTANCE} from './view-distance';
import {createLanternSpill} from './lantern-spill';

// Local centers of the painted lamp glass, measured on the shipped building GLBs.
// The fourth component is the glass radius in the same model units.
export const lanternSockets: Record<string, readonly (readonly [number, number, number, number])[]> = {
  'plaza-angel-fountain': [
    [-5.664, 3.761, 3.681, .29], [5.655, 3.759, 3.664, .29],
    [-3.824, 4.750, -2.440, .29], [3.948, 4.750, -2.433, .29],
  ],
  'market-produce-cart': [[-2.244, 3.269, 1.361, .24]],
  'market-produce-stall': [[3.083, 3.798, .379, .36]],
  'shop-red-awning': [[4.331, 5.274, 4.635, .52], [-1.697, 5.307, 4.695, .52]],
  'tavern-red-awning': [[8.077, 4.238, .155, .25]],
};

export type CityLantern = { center: THREE.Vector3; radius: number; scale: number };

export function createCityLanterns(lanterns: CityLantern[]) {
  const group = new THREE.Group();
  group.name = 'city-lanterns';
  group.visible = false;
  const strength = {value: 0};
  const focus = {value: new THREE.Vector2()};
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {strength, focus},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: `
      varying vec2 halo;
      varying vec2 anchor;
      void main() {
        vec4 center = modelMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
        anchor = center.xz;
        vec4 eye = viewMatrix * center;
        float radius = instanceMatrix[0][0];
        eye.z += radius * 1.15;
        eye.xy += position.xy * radius * 4.4;
        halo = position.xy;
        gl_Position = projectionMatrix * eye;
      }`,
    fragmentShader: `
      uniform float strength;
      uniform vec2 focus;
      varying vec2 halo;
      varying vec2 anchor;
      void main() {
        float radius = length(halo);
        float edge = 1. - smoothstep(.25, 1., radius);
        float opacity = (exp(-radius * 8.) * .62 + exp(-radius * radius * 7.5) * .44) * edge;
        vec3 color = mix(vec3(1., .31, .045), vec3(1., .90, .60), exp(-radius * 5.));
        float fog = 1. - smoothstep(${FOG_START.toFixed(1)}, ${VIEW_DISTANCE.toFixed(1)}, length(anchor - focus));
        gl_FragColor = vec4(color, opacity * strength * fog);
        #include <colorspace_fragment>
      }`,
  });
  const halos = new THREE.InstancedMesh(geometry, material, lanterns.length);
  halos.name = 'lantern-halos';
  halos.frustumCulled = false;
  halos.renderOrder = 2;
  const matrix = new THREE.Matrix4();
  lanterns.forEach(({center,radius}, i) => {
    matrix.makeScale(radius,radius,radius).setPosition(center);
    halos.setMatrixAt(i, matrix);
  });
  if (lanterns.length) group.add(halos);

  const spill = createLanternSpill(lanterns,strength);
  return {
    group, installSpill:spill?.install,
    update(player: THREE.Vector3, night: number) {
      strength.value = night;
      group.visible = lanterns.length > 0 && night > .001;
      if (!group.visible) return;
      focus.value.set(player.x, player.z);
    },
    dispose() { group.removeFromParent(); halos.dispose(); geometry.dispose(); material.dispose(); spill?.dispose(); },
  };
}
