import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RIVERSIDE_OAK } from '../../shared/terrain-props.mjs';
import type { TerrainData } from './terrain-data';
import { terrainHeight } from './terrain-movement';

export async function loadRiversideOak(data: TerrainData) {
  const gltf = await new GLTFLoader().loadAsync('/assets/models/trees/riverside-oak-v001.glb');
  const group=gltf.scene; group.name='riverside-oak';
  const materials:THREE.MeshStandardMaterial[]=[];
  group.traverse(object=>{
    if(object instanceof THREE.Mesh) { object.castShadow=true; object.receiveShadow=true; materials.push(object.material); }
  });
  const crown=group.getObjectByName('Oak_Painted_Foliage') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  const leaves=crown.material.map!; leaves.anisotropy=4;
  crown.material.alphaTest=.38; crown.material.transparent=true;
  crown.material.color.set('#8bb970'); crown.material.emissive.set('#617d3e'); crown.material.emissiveIntensity=.1;
  crown.receiveShadow=false; crown.material.needsUpdate=true;
  const bark=group.getObjectByName('Oak_Trunk_Branches_Roots') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  bark.material.transparent=true;
  const time={value:0};
  crown.material.onBeforeCompile=shader=>{
    shader.uniforms.oakTime=time;
    shader.vertexShader='uniform float oakTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float sway=sin(oakTime*.85+position.x*1.4+position.z*.8)*.045+sin(oakTime*1.7+position.z*2.0)*.018;
      transformed.x+=sway*smoothstep(3.0,8.0,position.y);
    `);
  };
  crown.material.customProgramCacheKey=()=> 'riverside-oak-wind-v1';
  group.position.set(RIVERSIDE_OAK.x,terrainHeight(data,RIVERSIDE_OAK.x,RIVERSIDE_OAK.z),RIVERSIDE_OAK.z);
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(crown),corners:THREE.Vector3[]=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));
  const projected=new THREE.Vector3(),foot=new THREE.Vector3(),head=new THREE.Vector3();
  let opacity=1;
  return {
    group,
    update(camera:THREE.Camera,player:THREE.Vector3|undefined,seconds:number,delta:number) {
      time.value=seconds;
      let obstructs=false;
      if(player && player.z<group.position.z+1.2) {
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const corner of corners) {projected.copy(corner).project(camera);minX=Math.min(minX,projected.x);maxX=Math.max(maxX,projected.x);minY=Math.min(minY,projected.y);maxY=Math.max(maxY,projected.y);}
        foot.copy(player).project(camera);head.copy(player);head.y+=2.8;head.project(camera);
        obstructs=foot.x>minX-.025&&foot.x<maxX+.025&&head.y>minY&&foot.y<maxY;
      }
      const goal = obstructs ? .08 : 1;
      opacity+=(goal-opacity)*(1-Math.exp(-Math.min(delta,.1)*12));
      if(Math.abs(opacity-goal)<.001)opacity=goal;
      crown.material.opacity=opacity;crown.material.alphaTest=.38*opacity;crown.material.depthWrite=opacity>.98;
      bark.material.opacity=THREE.MathUtils.lerp(.3,1,(opacity-.08)/.92);bark.material.depthWrite=opacity>.98;
    },
    inspect:()=>({position:group.position.toArray(),opacity,triangles:(crown.geometry.index!.count+bark.geometry.index!.count)/3}),
    dispose() { group.removeFromParent();group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());leaves.dispose(); },
  };
}
