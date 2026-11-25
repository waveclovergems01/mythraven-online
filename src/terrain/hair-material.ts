import * as THREE from 'three';

/** Replace the baked hue while retaining the texture's light and dark strands. */
export function dyeHairMaterial(source: THREE.Material, dye: { value: THREE.Color }, enabled: { value: number }) {
  if (!(source instanceof THREE.MeshStandardMaterial)) return source;
  const material = source.clone();
  const recolor = (rgb: string) => `{
    float strandTone = dot(${rgb}, vec3(0.2126, 0.7152, 0.0722));
    float strandDetail = clamp(sqrt(max(strandTone, 0.0)) * 2.0, 0.08, 1.35);
    ${rgb} = mix(${rgb}, max(hairDye, vec3(0.004)) * strandDetail, hairDyed);
  }`;
  material.onBeforeCompile = (shader, renderer) => {
    source.onBeforeCompile.call(material, shader, renderer);
    shader.uniforms.hairDye = dye;
    shader.uniforms.hairDyed = enabled;
    shader.fragmentShader = 'uniform vec3 hairDye;\nuniform float hairDyed;\n' + shader.fragmentShader;
    if (source.map || !source.emissiveMap) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n' + recolor('diffuseColor.rgb'));
    }
    if (source.emissiveMap) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n' + recolor('totalEmissiveRadiance'));
    }
  };
  material.customProgramCacheKey = () => source.customProgramCacheKey() + '-hair-dye-v1';
  return material;
}
