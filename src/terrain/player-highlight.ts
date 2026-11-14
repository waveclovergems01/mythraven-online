import * as THREE from 'three';

/** Back-face shells outline the avatar silhouette, excluding its ground ring/shadow. */
export function createPlayerHighlight(player: THREE.Group) {
  const surfaces: THREE.Mesh[] = [];
  player.traverse(object => { if (object instanceof THREE.Mesh && object.userData.playerSurface) surfaces.push(object); });
  const material = new THREE.ShaderMaterial({
    uniforms: {
      viewport: { value: new THREE.Vector2(1, 1) },
      thickness: { value: 2 },
      tint: { value: new THREE.Color('#fff1bd') },
    },
    vertexShader: `
      uniform vec2 viewport;
      uniform float thickness;
      #include <skinning_pars_vertex>
      void main() {
        #include <skinbase_vertex>
        vec3 objectNormal = normal;
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        vec2 direction = (projectionMatrix * vec4(normalMatrix * objectNormal, 0.0)).xy * viewport;
        direction /= max(length(direction), 0.0001);
        clip.xy += direction * (2.0 * thickness / viewport) * clip.w;
        gl_Position = clip;
      }`,
    fragmentShader: `
      uniform vec3 tint;
      void main() {
        gl_FragColor = vec4(tint, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
  const shells = surfaces.map(surface => {
    const shell = surface instanceof THREE.SkinnedMesh
      ? new THREE.SkinnedMesh(surface.geometry, material) : new THREE.Mesh(surface.geometry, material);
    if (shell instanceof THREE.SkinnedMesh && surface instanceof THREE.SkinnedMesh) {
      shell.bindMode = surface.bindMode;
      shell.bindMatrix.copy(surface.bindMatrix); shell.bindMatrixInverse.copy(surface.bindMatrixInverse);
      shell.skeleton = surface.skeleton; shell.frustumCulled = false;
    }
    shell.name = 'player-outline'; shell.visible = false; shell.renderOrder = 2;
    shell.raycast = () => {}; // Decorative shells must never become input targets.
    surface.add(shell); return shell;
  });
  return {
    surfaces,
    update(hovered: boolean, selected: boolean, width: number, height: number) {
      material.uniforms.viewport.value.set(Math.max(1, width), Math.max(1, height));
      material.uniforms.thickness.value = selected ? 2.5 : 2;
      material.uniforms.tint.value.set(selected ? '#f1ce77' : '#fff1bd');
      for (const shell of shells) shell.visible = hovered || selected;
    },
    dispose() { shells.forEach(shell => shell.removeFromParent()); material.dispose(); },
  };
}
