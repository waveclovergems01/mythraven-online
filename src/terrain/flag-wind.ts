import * as THREE from 'three';
import panels from './flag-panels.json';

type Shader = {vertexShader: string; uniforms: Record<string, unknown>};
type WindMaterial = THREE.MeshStandardMaterial | THREE.MeshDepthMaterial;

// Local-space bounds measured against the normalized GLBs. A pennant ties to
// its low-X edge. Hanging banners tie to their high-Y edge and lift away from masonry.
export function installFlagWind(mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
  model: string, clock: {value: number}) {
  const regions = panels[model as keyof typeof panels];
  if (!regions) return;
  const positions = mesh.geometry.getAttribute('position');
  const weights = new Float32Array(positions.count * 4);
  for (const region of regions) {
    const [xmin, ymin, zmin, xmax, ymax, zmax] = region.slice(0, 6) as number[];
    const facing = region[6], free = facing === 'fly';
    const length = free ? xmax-xmin : ymax-ymin;
    for (let i=0; i<positions.count; i++) {
      const x=positions.getX(i), y=positions.getY(i), z=positions.getZ(i);
      if (x<xmin || x>xmax || y<ymin || y>ymax || z<zmin || z>zmax) continue;
      const travel=free ? (x-xmin)/length : (ymax-y)/length;
      const strength=THREE.MathUtils.smoothstep(travel,.05,1)*length*(free ? .2 : .10);
      const offset=4*i;
      weights[offset]=strength;
      weights[offset+1]=travel;
      weights[offset+2]=facing==='left' ? -1 : facing==='right' ? 1 : 0;
      weights[offset+3]=facing==='back' ? -1 : facing==='front' ? 1 : 0;
    }
  }
  mesh.geometry.setAttribute('flagCloth',new THREE.BufferAttribute(weights,4));
  const patch=(shader:Shader)=>{
    shader.uniforms.flagSeconds=clock;
    shader.vertexShader='attribute vec4 flagCloth; uniform float flagSeconds;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      if(flagCloth.x>0.){
        vec3 world=(instanceMatrix*vec4(position,1.)).xyz;
        float exposure=dot(world.xz,vec2(.17,.21));
        float gust=.66+.34*sin(flagSeconds*.73-exposure*.4);
        float wave=sin(flagSeconds*3.2-flagCloth.y*5.8-exposure)
                  +.24*sin(flagSeconds*5.1-flagCloth.y*10.+world.y*.31);
        vec2 outward=flagCloth.zw;
        if(dot(outward,outward)<.5){
          // A shared world breeze, expressed in the rotated instance's local axes.
          vec2 breeze=vec2(cos(flagSeconds*.16)*.42,.91);
          vec2 localWind=vec2(dot(normalize(instanceMatrix[0].xz),breeze),
                              dot(normalize(instanceMatrix[2].xz),breeze));
          transformed.xz+=localWind*flagCloth.x*gust*wave;
          transformed.y+=.19*flagCloth.x*sin(flagSeconds*3.-flagCloth.y*5.-exposure);
        } else {
          transformed.xz+=outward*flagCloth.x*gust*(.7+.55*wave);
        }
      }`);
  };
  const attach=(material:WindMaterial)=>{
    const original=material.onBeforeCompile.bind(material);
    const key=material.customProgramCacheKey();
    material.customProgramCacheKey=()=>key+'-cloth-v1';
    material.onBeforeCompile=(shader,renderer)=>{original(shader,renderer);patch(shader);};
  };
  attach(mesh.material);
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  attach(depth);mesh.customDepthMaterial=depth;
  return depth;
}
