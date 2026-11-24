import * as THREE from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {TerrainMovement, terrainHeight, turnTowards} from './terrain-movement';
import {createPlayerHighlight} from './player-highlight';
import {createMonsterDissolve} from './monster-dissolve';
import type {TerrainData} from './terrain-data';

import {createPatrols} from '../../shared/frontier-patrols.mjs';
import type {MonsterState} from '../network/terrain-client';
import monsters from '../../shared/monster-master.json';

const species = {
  rabbit: {file:'meadow-rabbit', height:1.12, travel:'n_jump',
    rests:['n_idle','n_stand_idle','n_stand_bite_hand']},
  wolf: {file:'wolf-cube', height:1.65, travel:'n_run', rests:['n_idle']},
};
type Species = keyof typeof species;
export interface WildlifeTarget {
  position:THREE.Vector3; height:number; th:string; en:string; kind:Species;
  model?:THREE.Object3D; alive:boolean; combat?:MonsterState;
  react:(clip:'n_die'|'n_attack'|'n_take_attack')=>void;
}
export async function loadFrontierWildlife(data:TerrainData, nav:TerrainMovement) {
  const group = new THREE.Group(), loader = new GLTFLoader();
  const targets=new Map<string,WildlifeTarget>();
  let outlined:THREE.Object3D|undefined, outline:ReturnType<typeof createPlayerHighlight>|undefined;
  const highlights=new Map<THREE.Object3D,ReturnType<typeof createPlayerHighlight>>();
  function showSelection(target:WildlifeTarget|undefined, width:number, height:number) {
    if(target?.model?.userData.motion==='n_die')target=undefined;
    if(target?.model!==outlined){
      outline?.update(false,false,width,height);
      outlined=target?.model;
      outline=outlined ? highlights.get(outlined) : undefined;
      if(outlined && !outline){outline=createPlayerHighlight(outlined,true);highlights.set(outlined,outline);}
    }
    outline?.update(false,true,width,height);
  }
  const resources = new Set<THREE.Material|THREE.Texture|THREE.BufferGeometry|THREE.Skeleton>();
  const mixers:THREE.AnimationMixer[] = [];
  const effects=new Set<ReturnType<typeof createMonsterDissolve>>();
  let onStep:((kind:Species,position:THREE.Vector3)=>void)|undefined;
  const ticks:((seconds:number,dt:number,focus:THREE.Vector3)=>void)[] = [];
  const dispose = () => {
    for(const highlight of highlights.values())highlight.dispose();
    group.removeFromParent();
    for(const mixer of mixers){mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot());}
    for(const effect of effects)effect.dispose();
    for(const resource of resources){
      resource.dispose();
      if(resource instanceof THREE.Texture && resource.image instanceof ImageBitmap) resource.image.close();
    }
  };
  const assets = new Map<Species,GLTF>();
  try {
    for(const key of ['rabbit','wolf'] as const){
      const asset = await loader.loadAsync('/assets/models/monsters/'+species[key].file+'.glb');
      assets.set(key,asset);
      asset.scene.traverse(o=>{
        if(!(o instanceof THREE.Mesh)) return;
        resources.add(o.geometry);
        if(o instanceof THREE.SkinnedMesh) resources.add(o.skeleton);
        for(const mat of Array.isArray(o.material)?o.material:[o.material]){
          resources.add(mat);
          for(const value of Object.values(mat)) if(value instanceof THREE.Texture) resources.add(value);
        }
      });
    }
    const bounds=new Map<Species,THREE.Box3>();
    const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),visibleBounds=new THREE.Sphere();
    function createActor(key:Species){
      const profile=species[key],model=clone(assets.get(key)!.scene),pivot=new THREE.Group();
      const asset=assets.get(key)!;
      pivot.add(model);
      model.traverse(o=>{
        if(o instanceof THREE.Mesh) o.castShadow=o.receiveShadow=true;
        if(o instanceof THREE.SkinnedMesh) resources.add(o.skeleton);
      });
      const mixer=new THREE.AnimationMixer(model); mixers.push(mixer);
      const actions=new Map([profile.travel,...profile.rests,'n_die','n_attack','n_take_attack'].map(name=>{
        const clip=THREE.AnimationClip.findByName(asset.animations,name);
        if(!clip) throw new Error('Missing '+key+' clip '+name);
        return [name,mixer.clipAction(clip)] as const;
      }));
      let active=actions.get('n_idle')!.play(); mixer.update(0); model.updateMatrixWorld(true);
      const box=bounds.get(key)??new THREE.Box3().setFromObject(model,true);
      bounds.set(key,box);
      const center=box.getCenter(new THREE.Vector3());
      const scale=profile.height/(box.max.y-box.min.y);
      pivot.scale.setScalar(scale); model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));
      // Measure the author's forward axis from the posed skeleton before steering.
      const bone=(name:string)=>model.getObjectByName(name)?.getWorldPosition(new THREE.Vector3());
      const head=bone('DEF-nose'), tail=bone('DEF-tail004');
      if(head && tail) pivot.rotation.y=-Math.atan2(head.x-tail.x,head.z-tail.z);
      let poseTime=0,reaction='',until=0,nextFlinch=0,stepClock=0;
      let dissolve:ReturnType<typeof createMonsterDissolve>|undefined,dissolving=false;
      function react(clip:'n_die'|'n_attack'|'n_take_attack'){
        const now=performance.now();
        if(clip==='n_take_attack' && (now<nextFlinch || now<until && reaction==='n_attack'))return;
        if(reaction==='n_die')return;
        if(clip==='n_die' && outlined===model)showSelection(undefined,1,1);
        const action=actions.get(clip)!;
        action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
        action.reset().play();
        if(active!==action)action.crossFadeFrom(active,.06,false);
        active=action;reaction=clip;until=now+action.getClip().duration*1000;
        nextFlinch=now+650;poseTime=0;
        model.userData.motion=clip;
      }
      function updateDeath(){
        const now=performance.now(),duration=active.getClip().duration;
        // Advance by actual clip time even if a render frame was delayed.
        const time=Math.min(duration,Math.max(0,duration+(now-until)/1000));
        mixer.update(Math.max(0,time-active.time));
        const elapsed=now-until-800;
        if(elapsed<0)return true;
        if(elapsed>=1100)return false;
        if(!dissolving){
          if(!dissolve){dissolve=createMonsterDissolve(model);effects.add(dissolve);}
          dissolve.start(pivot.parent!);dissolving=true;
        }
        dissolve!.update(elapsed/1100);
        return true;
      }
      function animate(name:string,dt:number,distance:number){
        if(performance.now()<until){stepClock=0;mixer.update(dt);return false;}
        reaction='';
        const next=actions.get(name)!;
        const walking=name===profile.travel;
        const cadence=next.getClip().duration/1.4/(key==='wolf'?2:1);
        if(active!==next){
          next.reset().play().crossFadeFrom(active,.16,false);active=next;
          // The first push-off is audible even on a short five-metre outing.
          stepClock=walking?cadence*.75:0;
        }
        model.userData.motion=next.getClip().name;
        next.setEffectiveTimeScale(walking?1.4:1);
        if(walking)stepClock+=dt;else stepClock=0;
        const step=walking && stepClock>=cadence;
        if(step)stepClock%=cadence;
        poseTime+=dt;
        if(distance<65**2 || poseTime>=(distance<130**2?.12:.4)){
          mixer.update(poseTime); poseTime=0;
        }
        return step;
      }
      function release(){
        if(dissolving){dissolve!.reset();dissolving=false;}
        pivot.removeFromParent();mixer.stopAllAction();
        active=actions.get('n_idle')!.reset().play();
        until=nextFlinch=poseTime=stepClock=0;reaction='';model.userData.motion='n_idle';
      }
      return {model,pivot,react,animate,release,updateDeath,dying:()=>reaction==='n_die'};
    }
    // Navigation and the minimap track every patrol. Reuse animated rigs as they enter view.
    type Actor=ReturnType<typeof createActor>;
    const free:Record<Species,Actor[]>={rabbit:[],wolf:[]};
    for(const route of createPatrols(nav)){
      const key=route.kind,profile=species[key],animal=new THREE.Group();
      let actor:Actor|undefined;
      let lastMapSample=-1;
      animal.name=route.id;
      const target:WildlifeTarget={position:animal.position,height:profile.height,th:monsters[key].th,en:monsters[key].en,
        kind:key,alive:true,react:clip=>actor?.react(clip)};
      targets.set(route.id,target);
      ticks.push((seconds,dt,focus)=>{
        // A replicated zero HP can arrive before the hit notification.
        if(actor && !target.alive && !actor.dying())actor.react('n_die');
        if(actor?.dying()){
          if(actor.updateDeath())return;
          actor.release();free[key].push(actor);actor=undefined;
          target.model=undefined;animal.removeFromParent();
        }
        if(!target.alive)return;
        const home=target.combat??route.spawn;
        if(!actor && !target.combat?.engaged && (home.x-focus.x)**2+(home.z-focus.z)**2>115**2){
          const sample=Math.floor(seconds*8+route.index*.618);
          if(sample===lastMapSample)return;
          lastMapSample=sample;
        }
        const pose=target.combat??{...route.spawn,heading:0,moving:false};
        const distance=(pose.x-focus.x)**2+(pose.z-focus.z)**2;
        const dx=pose.x-animal.position.x,dz=pose.z-animal.position.z;
        const alpha=actor && pose===target.combat && dx*dx+dz*dz<9 ? 1-Math.exp(-dt/.035) : 1;
        animal.position.x+=dx*alpha;animal.position.z+=dz*alpha;
        if(distance>(actor?82:78)**2){
          if(actor){
            if(outlined===actor.model)showSelection(undefined,1,1);
            actor.release();free[key].push(actor);actor=undefined;
            target.model=undefined;animal.removeFromParent();
          }
          return;
        }
        animal.position.y=terrainHeight(data,animal.position.x,animal.position.z);
        // Keep a generous shadow margin around the camera; offscreen patrols
        // still move on the map without updating bones or drawing their rigs.
        visibleBounds.center.copy(animal.position);visibleBounds.radius=profile.height+5;
        animal.visible=frustum.intersectsSphere(visibleBounds);
        if(!animal.visible)return;
        if(!actor){
          actor=free[key].pop()??createActor(key);
          target.model=actor.model;animal.add(actor.pivot);group.add(animal);
          animal.rotation.y=pose.heading;
        }
        animal.rotation.y=turnTowards(animal.rotation.y,pose.heading,dt);
        const rest=profile.rests[route.index%profile.rests.length];
        if(actor.animate(pose.moving?profile.travel:rest,dt,distance) && distance<18**2)onStep?.(key,animal.position);
      });
    }
    return {group,targets,dispose,showSelection,update(seconds:number,dt:number,focus:THREE.Vector3,camera:THREE.Camera,step?:(kind:Species,position:THREE.Vector3)=>void){
      onStep=step;
      frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      for(const tick of ticks)tick(seconds,dt,focus);
    }};
  }catch(error){dispose();throw error;}
}
