import * as THREE from 'three';
import { TERRAIN, smoothstep, type TerrainData } from './terrain-data';

/** Painted ground assets; sampling scales are world metres. */
export async function loadTerrainTiles() {
  const loader = new THREE.TextureLoader();
  const loaded = await Promise.allSettled(['painted-grass-v002', 'painted-earth-v001', 'painted-grass-earth-v001'].map(name =>
    loader.loadAsync(`/assets/tiles/terrain/${name}.png`)));
  if (loaded.some(result => result.status === 'rejected')) {
    loaded.forEach(result => { if (result.status === 'fulfilled') result.value.dispose(); });
    throw new Error('Unable to load terrain materials');
  }
  const textures = loaded.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value);
  for (const texture of textures) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }
  return { grass: textures[0], dirt: textures[1], grassEarth: textures[2],
    dispose: () => textures.forEach(t => t.dispose()) };
}
export type TerrainTiles = Awaited<ReturnType<typeof loadTerrainTiles>>;

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), u = smoothstep(0, 1, x - ix), v = smoothstep(0, 1, y - iy);
  return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v)
    + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
}

/** Calibrate blended grass weight to 80% of exposed land, including the bare banks. */
export function terrainGrassCoverage(data: TerrainData) {
  const field = new Float32Array(data.heights.length), banks = new Float32Array(field.length);
  let dry = 0;
  for (let i = 0; i < field.length; i++) {
    const x = i % data.side * TERRAIN.size / (data.side - 1) - TERRAIN.size / 2;
    const z = Math.floor(i / data.side) * TERRAIN.size / (data.side - 1) - TERRAIN.size / 2;
    // Warp and rotate the paint mask so clearings do not follow the old noise-cell grid.
    const u = x + 24 * (noise(x * .023 + 7, z * .023 - 13) - .5);
    const v = z + 24 * (noise(x * .023 - 31, z * .023 + 19) - .5);
    field[i] = noise((u * .8 + v * .6) * .031, (v * .8 - u * .6) * .031) * .67
      + noise((u * .47 - v * .88) * .081 + 17, (v * .47 + u * .88) * .081) * .23
      + noise(u * .19 + 41, v * .19 - 29) * .1;
    banks[i] = data.heights[i] > TERRAIN.waterLevel ? smoothstep(2, 8, data.shoreDistance[i]) : 0;
    if (data.heights[i] > TERRAIN.waterLevel) dry++;
  }
  let low = -1, high = 1;
  for (let pass = 0; pass < 20; pass++) {
    const threshold = (low + high) / 2;
    let total = 0;
    for (let i = 0; i < field.length; i++) total += banks[i] * smoothstep(threshold - .14, threshold + .14, field[i]);
    if (total / dry > .8) low = threshold; else high = threshold;
  }
  let total = 0;
  const threshold = (low + high) / 2;
  for (let i = 0; i < field.length; i++) {
    field[i] = banks[i] * smoothstep(threshold - .14, threshold + .14, field[i]); total += field[i];
  }
  return { weights: field, coverage: total / dry };
}

const noiseGLSL = /* glsl */`
float terrainHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float terrainNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(terrainHash(i),terrainHash(i+vec2(1,0)),f.x),
    mix(terrainHash(i+vec2(0,1)),terrainHash(i+vec2(1,1)),f.x),f.y);
}
vec3 surfaceRelief(vec3 p, vec3 n, float height) {
  vec3 dx=dFdx(p), dy=dFdy(p), r1=cross(dy,n), r2=cross(n,dx);
  float det=dot(dx,r1);
  return normalize(abs(det)*n-sign(det)*(dFdx(height)*r1+dFdy(height)*r2));
}
`;

export function createGroundMaterial(tiles: TerrainTiles) {
  const material = new THREE.MeshStandardMaterial({ roughness: .95 });
  material.customProgramCacheKey = () => 'terrain-painted-lawn-v4';
  material.onBeforeCompile = shader => {
    shader.uniforms.grassTile = { value: tiles.grass };
    shader.uniforms.dirtTile = { value: tiles.dirt };
    shader.uniforms.grassEarthTile = { value: tiles.grassEarth };
    shader.vertexShader = 'attribute float grassWeight; attribute float shoreDistance; varying vec3 groundPoint; varying vec2 groundBlend;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ngroundPoint=position; groundBlend=vec2(grassWeight,shoreDistance);');
    shader.fragmentShader = 'uniform sampler2D grassTile; uniform sampler2D dirtTile; uniform sampler2D grassEarthTile; varying vec3 groundPoint; varying vec2 groundBlend;\n' + noiseGLSL + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      vec2 p=groundPoint.xz;
      float fringe=terrainNoise(p*1.6)-.5;
      float grass=clamp(groundBlend.x+fringe*.18*4.0*groundBlend.x*(1.0-groundBlend.x),0.0,1.0);
      // One complete painted tile every 32 world units, with a fixed orientation.
      // Blend material regions only; never rotate or overlap copies of a tile.
      vec2 tileUv=p/32.0;
      vec3 green=texture2D(grassTile,tileUv).rgb;
      // Dry grass uses the same fine blades, so the old clump grid cannot return.
      vec3 dryGrass=green*vec3(1.55,1.06,.72);
      vec3 wornGrass=texture2D(grassEarthTile,tileUv).rgb;
      vec3 earth=texture2D(dirtTile,tileUv).rgb;
      vec2 climate=p+vec2(terrainNoise(p*.017+21.0),terrainNoise(p*.017-13.0))*18.0;
      float dryPatch=smoothstep(.50,.83,terrainNoise(climate*.037+29.0))*.65;
      float wornPatch=smoothstep(.52,.80,terrainNoise(climate*.051-17.0))*.08;
      vec3 lawn=mix(green,dryGrass,dryPatch);
      lawn=mix(lawn,wornGrass,clamp((1.0-grass)*(.7+wornPatch),0.0,.8))*.62;
      vec3 soil=earth*.60;
      float wet=1.0-smoothstep(-.5,2.6,groundPoint.y);
      soil*=mix(1.0,.64,wet);
      float bank=1.0-smoothstep(5.0,12.0,groundBlend.y);
      vec3 bankSoil=earth*mix(.25,.56,smoothstep(-1.5,3.8,groundPoint.y));
      soil=mix(soil,bankSoil,bank);
      diffuseColor.rgb=mix(soil,lawn,grass);
      // Keep the supplied brushwork readable without the former noisy raised rings.
      float relief=dot(mix(earth,green,grass),vec3(.3,.6,.1))*.008;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nnormal=surfaceRelief(-vViewPosition,normal,relief);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor=mix(.92,.52,wet*(1.0-grass));');
  };
  return material;
}

export function createRiverMaterial(data: TerrainData) {
  // A data texture stores terrain elevation, not artwork. Bilinear sampling follows the banks.
  const heights = Uint8Array.from(data.heights, h => Math.round(THREE.MathUtils.clamp((h + 8) / 16, 0, 1) * 255));
  const depth = new THREE.DataTexture(heights, data.side, data.side, THREE.RedFormat);
  depth.minFilter = depth.magFilter = THREE.LinearFilter; depth.unpackAlignment = 1; depth.needsUpdate = true;
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ transparent: true, roughness: .2, metalness: .08, depthWrite: false });
  material.customProgramCacheKey = () => 'terrain-river-v1';
  material.addEventListener('dispose', () => depth.dispose());
  material.onBeforeCompile = shader => {
    shader.uniforms.riverTime=time; shader.uniforms.riverBed={value:depth};
    shader.vertexShader='varying vec3 waterPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPoint=position;');
    shader.fragmentShader='uniform float riverTime; uniform sampler2D riverBed; varying vec3 waterPoint;\n'+noiseGLSL+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',/* glsl */`
      #include <color_fragment>
      vec2 p=waterPoint.xz;
      vec2 bedUv=(p/500.0+.5)*(384.0/385.0)+.5/385.0;
      float waterDepth=max(0.0,8.0-texture2D(riverBed,bedUv).r*16.0);
      float phase=dot(p,vec2(1.3,.8))-riverTime*1.35+terrainNoise(p*.6)*2.0;
      float crossPhase=dot(p,vec2(-.7,1.7))+riverTime*.9+terrainNoise(p*.9)*1.5;
      float wave=sin(phase)*.025+sin(crossPhase)*.012;
      wave+=sin(dot(p,vec2(4.2,2.7))-riverTime*2.1)*.004;
      float deep=smoothstep(.2,5.5,waterDepth);
      diffuseColor.rgb=mix(vec3(.16,.39,.35),vec3(.025,.17,.21),deep);
      diffuseColor.a=mix(.18,.68,deep)*smoothstep(0.0,.3,waterDepth);
      float edge=(1.0-smoothstep(.12,.75,waterDepth))*smoothstep(0.0,.12,waterDepth);
      float foam=edge*(.5+.5*sin(waterDepth*15.0-riverTime*1.2+terrainNoise(p*.4)))*.12;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.77,.67),foam);
      // Soft connected ripple bands; no isolated white emissive dots.
      float ripple=sin(phase)*.5+.5;
      diffuseColor.rgb*=.92+.16*ripple;
      totalEmissiveRadiance+=vec3(.018,.035,.037)*smoothstep(.8,.99,sin(phase))*smoothstep(.2,1.2,waterDepth);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>', /* glsl */`
      #include <normal_fragment_maps>
      normal=surfaceRelief(-vViewPosition,normal,wave);
      float fresnel=pow(1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0),4.0);
      totalEmissiveRadiance+=vec3(.18,.28,.31)*(.08+fresnel*.45);
      diffuseColor.a=clamp(diffuseColor.a+fresnel*.2,0.0,.85);
    `);
  };
  return { material, update: (value: number) => { time.value=value; } };
}
