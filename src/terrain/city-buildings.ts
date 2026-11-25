import {installFlagWind} from './flag-wind';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BUILDING_ASSETS,createCityLayout} from '../../shared/city-layout.mjs';
import type {TerrainData} from './terrain-data';
import {createFountainWater} from './fountain-water';
import {softenPaintedLighting} from './painted-lighting';
import {createCityLanterns, lanternSockets, type CityLantern} from './city-lanterns';

export async function loadCityBuildings(data:TerrainData){
  const layout=createCityLayout(data),group=new THREE.Group();group.name='city-buildings';
  const flagClock={value:0};
  const resources=new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture>();
  const materials:THREE.MeshStandardMaterial[]=[];
  const fountains:ReturnType<typeof createFountainWater>[]=[];
  const lanternPoints: CityLantern[] = [];
  const lanternNight = {value: 0};
  let lanterns: ReturnType<typeof createCityLanterns> | undefined;
  const dispose=()=>{group.removeFromParent();lanterns?.dispose();fountains.forEach(f=>f.dispose());group.children.forEach(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});resources.forEach(r=>{
    r.dispose();if(r instanceof THREE.Texture&&typeof ImageBitmap!=='undefined'&&r.image instanceof ImageBitmap)r.image.close();
  });};
  const entries=Object.entries(BUILDING_ASSETS).filter(([id])=>layout.buildings.some(b=>b.model===id));
  const loaded=await Promise.allSettled(entries.map(([,a])=>new GLTFLoader().loadAsync(a.url)));
  for(const result of loaded)if(result.status==='fulfilled')result.value.scene.traverse(o=>{if(o instanceof THREE.Mesh){resources.add(o.geometry);
    for(const m of Array.isArray(o.material)?o.material:[o.material]){resources.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)resources.add(value);}
  }});
  const failure=loaded.find(r=>r.status==='rejected');if(failure?.status==='rejected'){dispose();throw failure.reason;}
  const feet={value:new THREE.Vector2()},head={value:new THREE.Vector2()},depth={value:new THREE.Vector2(-1,-1)},radius={value:.01},aspect={value:1};
  const projected=new THREE.Vector3(),dummy=new THREE.Object3D();
  loaded.forEach((result,index)=>{
    if(result.status!=='fulfilled')return;
    let source!:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
    result.value.scene.traverse(o=>{if(o instanceof THREE.Mesh)source=o;});
    const id = entries[index][0];
    const sockets = lanternSockets[id] ?? [];
    const material=source.material;materials.push(material);material.transparent=true;material.forceSinglePass=true;
    material.normalScale.multiplyScalar(.65);material.emissiveIntensity=.25;
    for(const value of Object.values(material))if(value instanceof THREE.Texture)value.anisotropy=4;
    material.customProgramCacheKey=()=> 'city-building-toon-player-fade-v1' + (sockets.length ? '-' + id : '');
    material.onBeforeCompile=shader=>{
      softenPaintedLighting(shader);Object.assign(shader.uniforms,{buildingFeet:feet,buildingHead:head,buildingDepth:depth,buildingRadius:radius,buildingAspect:aspect});
      shader.vertexShader='varying vec4 buildingClip;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nbuildingClip=gl_Position;');
      shader.fragmentShader='varying vec4 buildingClip;uniform vec2 buildingFeet,buildingHead,buildingDepth;uniform float buildingRadius,buildingAspect;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 p=buildingClip.xy/buildingClip.w;p.x*=buildingAspect;vec2 segment=buildingHead-buildingFeet;
        float along=clamp(dot(p-buildingFeet,segment)/max(dot(segment,segment),.0001),0.,1.);
        float silhouette=1.-smoothstep(buildingRadius*.8,buildingRadius*1.8,length(p-(buildingFeet+segment*along)));
        float inFront=smoothstep(-.35,.25,mix(buildingDepth.x,buildingDepth.y,along)-vViewPosition.z);
        diffuseColor.a*=1.-.95*silhouette*inFront;`);
      if (sockets.length && material.emissiveMap) {
        shader.uniforms.lanternNight = lanternNight;
        shader.vertexShader = 'varying vec3 lanternLocal;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>', '#include <begin_vertex>\nlanternLocal = position;');
        const masks = sockets.map(([x,y,z,r]) =>
          `lampMask = max(lampMask, 1. - smoothstep(${(r*1.25).toFixed(3)}, ${(r*1.55).toFixed(3)}, distance(lanternLocal, vec3(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}))));`);
        shader.fragmentShader = 'varying vec3 lanternLocal; uniform float lanternNight;\n' + shader.fragmentShader
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            float lampMask = 0.;
            ${masks.join('\n')}
            totalEmissiveRadiance *= mix(1., lanternNight * 1.35, lampMask);`);
      }
    };
    const placements=layout.buildings.filter(b=>b.model===id);
    const mesh=new THREE.InstancedMesh(source.geometry,material,placements.length);mesh.name=id;mesh.castShadow=mesh.receiveShadow=true;
    const flagDepth=installFlagWind(mesh,mesh.name,flagClock);
    if(flagDepth)resources.add(flagDepth);
    placements.forEach((p,i)=>{
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      for (const [x,y,z,radius] of sockets) lanternPoints.push({
        center:new THREE.Vector3(x,y,z).applyMatrix4(dummy.matrix), radius:radius*p.scale, scale:p.scale,
      });
    });
    mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
    if(id==='plaza-angel-fountain')for(const p of placements){
      const fountain=createFountainWater(source.geometry);fountain.group.position.set(p.x,p.y,p.z);fountain.group.rotation.y=p.yaw;fountain.group.scale.setScalar(p.scale);group.add(fountain.group);fountains.push(fountain);
    }
  });
  const lampLighting = lanterns = createCityLanterns(lanternPoints);
  return {group,lanternGroup:lampLighting.group,installLanternSpill:lampLighting.installSpill,dispose,inspect:()=>layout,update(camera:THREE.PerspectiveCamera,player:THREE.Vector3,brightness:number,seconds:number,night:number){
    flagClock.value=seconds;
    lanternNight.value=night;
    lampLighting.update(player,night);
    fountains.forEach(f=>f.update(seconds));
    for(const m of materials)if(m.emissiveMap)m.emissiveIntensity=1.15-brightness*.9;
    aspect.value=camera.aspect;
    projected.copy(player);projected.y+=.1;projected.project(camera);feet.value.set(projected.x*camera.aspect,projected.y);
    projected.copy(player);projected.y+=3;projected.project(camera);head.value.set(projected.x*camera.aspect,projected.y);
    projected.copy(player);projected.y+=.1;projected.applyMatrix4(camera.matrixWorldInverse);depth.value.x=-projected.z;
    radius.value=camera.projectionMatrix.elements[5]/Math.max(1,-projected.z);
    projected.copy(player);projected.y+=3;projected.applyMatrix4(camera.matrixWorldInverse);depth.value.y=-projected.z;
  }};
}
