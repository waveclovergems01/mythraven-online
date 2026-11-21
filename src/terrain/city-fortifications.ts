import {installFlagWind} from './flag-wind';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createFortifications, FORTIFICATION_ASSETS, fortificationSurface } from '../../shared/terrain-fortifications.mjs';
import type { TerrainData } from './terrain-data';
import { softenPaintedLighting } from './painted-lighting';

export async function loadCityFortifications(data: TerrainData, cityStone: THREE.Texture) {
  const layout=createFortifications(data),group=new THREE.Group();group.name='city-fortifications';
  const flagClock={value:0};
  const resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
  const walkSurfaces:THREE.Mesh[]=[];
  const dispose=()=>{group.removeFromParent();group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});
    resources.forEach(r=>{r.dispose();if(r instanceof THREE.Texture&&typeof ImageBitmap!=='undefined'&&r.image instanceof ImageBitmap)r.image.close();});};
  const models=Object.entries(FORTIFICATION_ASSETS).filter(([id])=>layout.instances.some(item=>item.model===id));
  const loaded=await Promise.allSettled(models.map(([,m])=>new GLTFLoader().loadAsync(m.url)));
  for(const result of loaded)if(result.status==='fulfilled')result.value.scene.traverse(o=>{
    if(!(o instanceof THREE.Mesh))return;resources.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const t of Object.values(m))if(t instanceof THREE.Texture)resources.add(t);}
  });
  const failure=loaded.find(r=>r.status==='rejected');if(failure?.status==='rejected'){dispose();throw failure.reason;}
  const feet={value:new THREE.Vector2()},head={value:new THREE.Vector2()},depth={value:new THREE.Vector2(-1,-1)},radius={value:.01},aspect={value:1},floor={value:0};
  const projected=new THREE.Vector3(),dummy=new THREE.Object3D();

  loaded.forEach((result,index)=>{
    if(result.status!=='fulfilled')return;
    let source!:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
    result.value.scene.traverse(o=>{if(o instanceof THREE.Mesh)source=o;});

    const material=source.material;
    for(const texture of [material.map,material.normalMap,material.roughnessMap,material.metalnessMap])if(texture)texture.anisotropy=4;
    material.transparent=true;material.forceSinglePass=true;
    material.normalScale.multiplyScalar(.65);
    material.customProgramCacheKey=()=> 'city-fortification-soft-toon-fade-v2';
    material.onBeforeCompile=shader=>{
      softenPaintedLighting(shader);
      Object.assign(shader.uniforms,{fortFeet:feet,fortHead:head,fortDepth:depth,fortRadius:radius,fortAspect:aspect,fortFloor:floor});
      shader.vertexShader='varying vec4 fortClip;varying float fortHeight;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        fortClip=gl_Position;vec4 fortWorld=vec4(transformed,1.);
        #ifdef USE_INSTANCING
        fortWorld=instanceMatrix*fortWorld;
        #endif
        fortHeight=(modelMatrix*fortWorld).y;`);
      shader.fragmentShader='varying vec4 fortClip;varying float fortHeight;uniform vec2 fortFeet,fortHead,fortDepth;uniform float fortRadius,fortAspect,fortFloor;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 p=fortClip.xy/fortClip.w;p.x*=fortAspect;vec2 segment=fortHead-fortFeet;
        float along=clamp(dot(p-fortFeet,segment)/max(dot(segment,segment),.0001),0.,1.);
        float silhouette=1.-smoothstep(fortRadius*.8,fortRadius*1.8,length(p-(fortFeet+segment*along)));
        float inFront=smoothstep(-.35,.25,mix(fortDepth.x,fortDepth.y,along)-vViewPosition.z);
        diffuseColor.a*=1.-.95*silhouette*inFront*smoothstep(fortFloor+.2,fortFloor+.6,fortHeight);`);
    };
    const placements=layout.instances.filter(p=>p.model===models[index][0]);
    const mesh=new THREE.InstancedMesh(source.geometry,material,placements.length);
    mesh.name=models[index][0];mesh.castShadow=mesh.receiveShadow=true;
    const flagDepth=installFlagWind(mesh,mesh.name,flagClock);
    if(flagDepth)resources.add(flagDepth);
    placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
    if(mesh.name==='city-stone-bridge') walkSurfaces.push(mesh);
  });
  const paving=new THREE.MeshStandardMaterial({color:'#94846c',roughness:1});resources.add(paving);
  const streetMaterial=new THREE.MeshStandardMaterial({map:cityStone,color:new THREE.Color().setRGB(.78,.78,.78),roughness:1});
  streetMaterial.onBeforeCompile=softenPaintedLighting;streetMaterial.customProgramCacheKey=()=> 'city-street-soft-toon-v1';resources.add(streetMaterial);
  for(const bridge of layout.bridges){
    for(const [start,end] of [[bridge.from,bridge.start],[bridge.end,bridge.to]]){
      const vertices:number[]=[],indices:number[]=[];
      const width=bridge.halfWidth;
      for(const distance of [start,end])for(const offset of [-width,width]){
        const across=offset+(bridge.lateral??0);
        const x=bridge.outward.x*distance+bridge.tangent.x*across,z=bridge.outward.z*distance+bridge.tangent.z*across;
        const y=fortificationSurface(data,x,z)??(distance===bridge.to?bridge.endHeight:bridge.deck);
        vertices.push(x,y+.008,z);
      }
      // Approach masonry extends below the bank; only its paving is walkable.
      indices.push(0,2,1,1,2,3);
      for(let i=0;i<4;i++)vertices.push(vertices[i*3],1,vertices[i*3+2]);
      indices.push(0,4,2,2,4,6,1,3,5,3,7,5,0,1,4,1,5,4,2,6,3,3,6,7);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();resources.add(geometry);
      const surface=new THREE.Mesh(geometry,paving);surface.name=bridge.id+'-approach';
      surface.receiveShadow=surface.castShadow=true;group.add(surface);
      // Dedicated repeating street albedo; the complete bridge keeps its own maps.
      const stonePositions=vertices.slice(0,12),stoneUV:number[]=[];
      for(let i=0;i<4;i++){stonePositions[i*3+1]+=.017;stoneUV.push(stonePositions[i*3]/8,stonePositions[i*3+2]/8);}
      const stoneGeometry=new THREE.BufferGeometry();stoneGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stonePositions,3));
      stoneGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(stoneUV,2));stoneGeometry.setIndex([0,2,1,1,2,3]);stoneGeometry.computeVertexNormals();resources.add(stoneGeometry);
      const stone=new THREE.Mesh(stoneGeometry,streetMaterial);stone.name=bridge.id+'-stone-paving';stone.receiveShadow=true;group.add(stone);
      walkSurfaces.push(stone);
    }
  }
  function pickWalkSurface(raycaster:THREE.Raycaster) {
    for(const hit of raycaster.intersectObjects(walkSurfaces,false)){
      if(!hit.face) continue;
      const matrix=hit.object.matrixWorld.clone();
      if(hit.object instanceof THREE.InstancedMesh && hit.instanceId!==undefined){
        const deck=fortificationSurface(data,hit.point.x,hit.point.z);
        if(deck===undefined || Math.abs(hit.point.y-deck)>.75) continue;
        const instance=new THREE.Matrix4();
        hit.object.getMatrixAt(hit.instanceId,instance);matrix.multiply(instance);
      }
      const normal=hit.face.normal.clone().transformDirection(matrix);
      if(normal.y>.5) return {point:hit.point,normal};
    }
  }
  return {group,pickWalkSurface,dispose,inspect:()=>layout,update(camera:THREE.PerspectiveCamera,player:THREE.Vector3,seconds:number){
    flagClock.value=seconds;
    aspect.value=camera.aspect;floor.value=player.y;
    projected.copy(player);projected.y+=.1;projected.project(camera);feet.value.set(projected.x*camera.aspect,projected.y);
    projected.copy(player);projected.y+=3;projected.project(camera);head.value.set(projected.x*camera.aspect,projected.y);
    projected.copy(player);projected.y+=.1;projected.applyMatrix4(camera.matrixWorldInverse);depth.value.x=-projected.z;
    radius.value=camera.projectionMatrix.elements[5]/Math.max(1,-projected.z);
    projected.copy(player);projected.y+=3;projected.applyMatrix4(camera.matrixWorldInverse);depth.value.y=-projected.z;
  }};
}
