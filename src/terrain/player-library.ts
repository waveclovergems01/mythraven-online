import * as THREE from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';

export function createPlayerLibrary() {
  const cache = new Map<string,Promise<GLTF>>();
  const loader = new GLTFLoader();
  const brightness = {value:1};
  let disposed = false;
  function release(asset:GLTF) {
    const resources = new Set<THREE.BufferGeometry|THREE.Material|THREE.Texture|THREE.Skeleton>();
    asset.scene.traverse(mesh=>{
      if (!(mesh instanceof THREE.Mesh)) return;
      resources.add(mesh.geometry);
      if (mesh instanceof THREE.SkinnedMesh) resources.add(mesh.skeleton);
      for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
        resources.add(material);
        for(const value of Object.values(material)) if(value instanceof THREE.Texture) resources.add(value);
      }
    });
    for(const resource of resources){
      resource.dispose();
      if(resource instanceof THREE.Texture && resource.image instanceof ImageBitmap) resource.image.close();
    }
  }
  function load(path:string):Promise<GLTF>{
    if(disposed) return Promise.reject(new Error('Character library disposed'));
    const cached=cache.get(path);
    if(cached) return cached;
    const pending=loader.loadAsync('/assets/models/characters/'+path+'.glb').then(asset=>{
      if(disposed){release(asset);throw new Error('Character library disposed');}
      asset.scene.traverse(mesh=>{
        if(!(mesh instanceof THREE.Mesh)) return;
        mesh.castShadow=mesh.receiveShadow=true;
        mesh.userData.playerSurface=true;
        for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
          if(!(material instanceof THREE.MeshStandardMaterial) || !material.emissiveMap) continue;
          material.onBeforeCompile=shader=>{
            shader.uniforms.paintedBrightness=brightness;
            shader.fragmentShader='uniform float paintedBrightness;\n'+shader.fragmentShader
              .replace('#include <shadowmap_pars_fragment>','#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
              .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= paintedBrightness * mix(.72,1.,getShadowMask());');
          };
          material.customProgramCacheKey=()=>'painted-character-daylight-shadow-v2';
        }
      });
      return asset;
    }).catch(error=>{cache.delete(path);throw error;});
    cache.set(path,pending);
    return pending;
  }
  return {load,brightness,dispose(){
    if(disposed) return;
    disposed=true;
    for(const entry of cache.values()) void entry.then(release,()=>{});
    cache.clear();
  }};
}
export type PlayerLibrary=ReturnType<typeof createPlayerLibrary>;

