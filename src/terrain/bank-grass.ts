import * as THREE from 'three';
import { TERRAIN, type TerrainData } from './terrain-data';
import { terrainHeight } from './terrain-movement';

/** Upright ribbon blades, independent of ground textures and navigation. */
export function createBankGrass(data: TerrainData) {
  const group = new THREE.Group(); group.name = 'bank-grass';
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const root = new THREE.Color('#355124'), middle = new THREE.Color('#608338'), tip = new THREE.Color('#a2ac55');
  const random = (seed: number) => { const x = Math.sin(seed * 127.1 + 17.73) * 43758.5453; return x - Math.floor(x); };
  for (let blade = 0; blade < 9; blade++) {
    const angle = blade * 2.39996, direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    const x = direction.x * .22, z = direction.y * .22;
    const height = .65 + random(blade + 9) * .65, width = .045 + random(blade + 30) * .04;
    const bend = .18 + random(blade + 90) * .3;
    const cross = new THREE.Vector2(-direction.y, direction.x);
    const a = vertices.length / 3;
    vertices.push(x-cross.x*width,0,z-cross.y*width,x+cross.x*width,0,z+cross.y*width,
      x+direction.x*bend*.35-cross.x*width*.6,height*.57,z+direction.y*bend*.35-cross.y*width*.6,
      x+direction.x*bend*.35+cross.x*width*.6,height*.57,z+direction.y*bend*.35+cross.y*width*.6,
      x+direction.x*bend,height,z+direction.y*bend);
    root.toArray(colors,a*3); root.toArray(colors,(a+1)*3);
    middle.toArray(colors,(a+2)*3); middle.toArray(colors,(a+3)*3); tip.toArray(colors,(a+4)*3);
    indices.push(a,a+1,a+2,a+1,a+3,a+2,a+2,a+3,a+4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const feet = {value:new THREE.Vector2(10,10)}, head = {value:new THREE.Vector2(10,10)};
  const radius = {value:.01}, aspect = {value:1}, playerDepth = {value:new THREE.Vector2(-1,-1)}, time = {value:0};
  const material = new THREE.MeshStandardMaterial({ vertexColors:true, side:THREE.DoubleSide,
    roughness:.95, transparent:true, depthWrite:false });
  material.customProgramCacheKey = () => 'bank-grass-occlusion-v1';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms,{ grassFeet:feet,grassHead:head,grassRadius:radius,
      grassAspect:aspect,grassPlayerDepth:playerDepth,grassTime:time });
    shader.vertexShader='uniform float grassTime; varying vec4 grassClip;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.x+=sin(grassTime*1.3+instanceMatrix[3].x*.6+instanceMatrix[3].z*.4)*position.y*position.y*.045;`);
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ngrassClip=gl_Position;');
    shader.fragmentShader=`uniform vec2 grassFeet; uniform vec2 grassHead; uniform float grassRadius;
      uniform float grassAspect; uniform vec2 grassPlayerDepth; varying vec4 grassClip;\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=grassClip.xy/grassClip.w; p.x*=grassAspect;
      vec2 segment=grassHead-grassFeet;
      float along=clamp(dot(p-grassFeet,segment)/max(dot(segment,segment),.0001),0.0,1.0);
      float distanceToPlayer=length(p-(grassFeet+along*segment));
      float silhouette=1.0-smoothstep(grassRadius*.65,grassRadius*1.45,distanceToPlayer);
      float characterDepth=mix(grassPlayerDepth.x,grassPlayerDepth.y,along);
      float inFront=smoothstep(-.35,.25,characterDepth-vViewPosition.z);
      diffuseColor.a*=1.0-.92*silhouette*inFront;
    `);
  };

  // Small spatial batches allow ordinary frustum culling of distant river edges.
  const patches = new Map<string, THREE.Matrix4[]>();
  const dummy = new THREE.Object3D(); let count = 0;
  const step = .65;
  for (let z = -249; z < 249; z += step) for (let x = -249; x < 249; x += step) {
    const seed = Math.round((x+250)/step) + Math.round((z+250)/step)*1024;
    const px=x+(random(seed)-.5)*step, pz=z+(random(seed+3)-.5)*step;
    const col=Math.round((px/TERRAIN.size+.5)*(data.side-1)), row=Math.round((pz/TERRAIN.size+.5)*(data.side-1));
    const i=row*data.side+col, d=data.shoreDistance[i];
    if(d<3.7 || d>7.6 || data.heights[i]<2.7) continue;
    dummy.position.set(px,terrainHeight(data,px,pz)-.025,pz);
    dummy.rotation.set(0,random(seed+5)*Math.PI*2,0);
    const scale=.75+random(seed+7)*.6;
    dummy.scale.setScalar(scale); dummy.updateMatrix();
    const key=`${Math.floor(px/24)},${Math.floor(pz/24)}`;
    let matrices=patches.get(key); if(!matrices){matrices=[];patches.set(key,matrices);}
    matrices.push(dummy.matrix.clone()); count++;
  }
  for(const matrices of patches.values()) {
    const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);
    matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    // Account for the small wind displacement beyond the resting blade tips.
    if(mesh.boundingSphere) mesh.boundingSphere.radius+=.2;
    mesh.name='bank-grass-patch'; group.add(mesh);
  }
  const bottom=new THREE.Vector3(), top=new THREE.Vector3(), view=new THREE.Vector3();
  return {
    group, count,
    update(camera: THREE.OrthographicCamera, player: THREE.Vector3 | undefined, seconds: number) {
      time.value=seconds;
      if(!player){ playerDepth.value.set(-1,-1); return; }
      aspect.value=(camera.right-camera.left)/(camera.top-camera.bottom);
      bottom.copy(player); bottom.y+=.15; bottom.project(camera);
      top.copy(player); top.y+=2.8; top.project(camera);
      feet.value.set(bottom.x*aspect.value,bottom.y); head.value.set(top.x*aspect.value,top.y);
      radius.value=2*1.0/(camera.top-camera.bottom);
      view.copy(player); view.y+=.15; view.applyMatrix4(camera.matrixWorldInverse);
      playerDepth.value.x=-view.z;
      view.copy(player); view.y+=2.8; view.applyMatrix4(camera.matrixWorldInverse);
      playerDepth.value.y=-view.z;
    },
    dispose() {
      group.children.forEach(child => (child as THREE.InstancedMesh).dispose());
      geometry.dispose(); material.dispose(); group.removeFromParent();
    },
  };
}
