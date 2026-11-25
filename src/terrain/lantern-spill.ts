import * as THREE from 'three';
import type {CityLantern} from './city-lanterns';

export type SurfaceShader = Parameters<THREE.Material['onBeforeCompile']>[0];

const CELL_SIZE = 8;
const RANGE_PER_SCALE = 6.8;

/** Index the static lamps by the surfaces they can reach. */
export function createLanternSpill(lanterns: CityLantern[], strength: {value: number}) {
  if (!lanterns.length) return;
  const lamps = lanterns.map(({center, scale})=>({
    center, range:RANGE_PER_SCALE*scale,
  }));
  const originX = Math.floor(Math.min(...lamps.map(l=>l.center.x-l.range))/CELL_SIZE);
  const originZ = Math.floor(Math.min(...lamps.map(l=>l.center.z-l.range))/CELL_SIZE);
  const cols = Math.floor(Math.max(...lamps.map(l=>l.center.x+l.range))/CELL_SIZE)-originX+1;
  const rows = Math.floor(Math.max(...lamps.map(l=>l.center.z+l.range))/CELL_SIZE)-originZ+1;
  const cells = Array.from({length:cols*rows},()=>[] as typeof lamps);
  for (const lamp of lamps) {
    const {center:{x,z},range}=lamp;
    const left=Math.floor((x-range)/CELL_SIZE)-originX, right=Math.floor((x+range)/CELL_SIZE)-originX;
    const top=Math.floor((z-range)/CELL_SIZE)-originZ, bottom=Math.floor((z+range)/CELL_SIZE)-originZ;
    for (let row=top;row<=bottom;row++) {
      for (let col=left;col<=right;col++) cells[row*cols+col].push(lamp);
    }
  }
  // One count texel per cell, followed by the world position and local radius of each lamp.
  const stride = 1+Math.max(...cells.map(cell=>cell.length));
  const data = new Float32Array(cols*rows*stride*4);
  cells.forEach((cell,index)=>{
    const first=4*index*stride;
    data[first]=cell.length;
    cell.forEach(({center,range},i)=>data.set([center.x,center.y,center.z,range],first+4*(i+1)));
  });
  const texture = new THREE.DataTexture(data,cols*stride,rows,THREE.RGBAFormat,THREE.FloatType);
  texture.needsUpdate = true;
  const bounds = new THREE.Vector4(originX,originZ,cols,rows);
  const color = new THREE.Color('#ffc477');
  return {
    install(shader: SurfaceShader) {
      Object.assign(shader.uniforms,{
        lampSpillStrength:strength,
        lampSpillGrid:{value:texture},
        lampSpillBounds:{value:bounds},
        lampSpillStride:{value:stride},
        lampSpillColor:{value:color},
      });
      shader.fragmentShader = `
        uniform float lampSpillStrength;
        uniform highp sampler2D lampSpillGrid;
        uniform vec4 lampSpillBounds;
        uniform int lampSpillStride;
        uniform vec3 lampSpillColor;
      `+shader.fragmentShader.replace('#include <lights_fragment_end>',`
        #include <lights_fragment_end>
        if (lampSpillStrength > .001) {
          vec2 cell = floor(distanceWorld.xz / ${CELL_SIZE.toFixed(1)}) - lampSpillBounds.xy;
          if (all(greaterThanEqual(cell, vec2(0.))) && all(lessThan(cell, lampSpillBounds.zw))) {
            ivec2 address = ivec2(int(cell.x) * lampSpillStride, int(cell.y));
            int count = int(texelFetch(lampSpillGrid, address, 0).x);
            for (int i = 1; i <= count; i++) {
              vec4 lamp = texelFetch(lampSpillGrid, address + ivec2(i, 0), 0);
              vec3 offset = lamp.xyz - distanceWorld;
              float lampDistance = length(offset);
              if (lampDistance < lamp.w) {
                float scale = lamp.w / ${RANGE_PER_SCALE.toFixed(1)};
                IncidentLight lampLight;
                lampLight.direction = mat3(viewMatrix) * offset / max(lampDistance, .0001);
                lampLight.color = lampSpillColor * lampSpillStrength * 21. * scale * scale
                  * getDistanceAttenuation(lampDistance, lamp.w, 2.);
                lampLight.visible = true;
                RE_Direct(lampLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
              }
            }
          }
        }
      `);
    },
    dispose() { texture.dispose(); },
  };
}
