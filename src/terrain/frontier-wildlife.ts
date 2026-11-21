import * as THREE from 'three';
import {GLTFLoader, type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {speedMultiplier, WALK_SPEED, TerrainMovement, terrainHeight, turnTowards} from './terrain-movement';
import {createPlayerHighlight} from './player-highlight';
import type {TerrainData} from './terrain-data';

const species = {
  rabbit: {file:'meadow-rabbit', th:'กระต่ายโคลเวอร์', en:'Clover Hare', height:1.12, travel:'n_jump',
    rests:['n_idle','n_stand_idle','n_stand_bite_hand']},
  wolf: {file:'wolf-cube', th:'ลูกหมาป่าแอชเฟอร์', en:'Ashfur Pup', height:1.65, travel:'n_run', rests:['n_idle']},
};
type Species = keyof typeof species;
type Point = {x:number; z:number};
export interface WildlifeTarget {
  position:THREE.Vector3; height:number; th:string; en:string; kind:Species;
  model:THREE.Object3D; destination?:Point;
}
const wildlifeSpeedLevel = 2.5;
const travelSpeed = WALK_SPEED * speedMultiplier(wildlifeSpeedLevel);

// Each clearing gets a short closed route. The common clock and deterministic
// routes let all visitors see the same passive wildlife without movement packets.
function patrol(nav: TerrainMovement, x:number, z:number, index:number) {
  const points:Point[]=[];
  for(let i=0;i<96 && points.length<3;i++){
    const angle = index*1.71 + i*2.4;
    const r = 3 + (i*7+index)%10;
    const p = {x:x+Math.cos(angle)*r,z:z+Math.sin(angle)*r};
    if(nav.canStand(p) && points.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>4 && nav.clearLine(p,q))) points.push(p);
  }
  return points;
}

export async function loadFrontierWildlife(data:TerrainData, nav:TerrainMovement) {
  const group = new THREE.Group(), loader = new GLTFLoader();
  const targets=new Map<string,WildlifeTarget>();
  let outlined:WildlifeTarget|undefined, outline:ReturnType<typeof createPlayerHighlight>|undefined;
  function showSelection(target:WildlifeTarget|undefined, width:number, height:number) {
    if(target!==outlined){
      outline?.dispose();
      outline=target ? createPlayerHighlight(target.model,true) : undefined;
      outlined=target;
    }
    outline?.update(false,true,width,height);
  }
  const resources = new Set<THREE.Material|THREE.Texture|THREE.BufferGeometry|THREE.Skeleton>();
  const mixers:THREE.AnimationMixer[] = [];
  const ticks:((seconds:number,dt:number,focus:THREE.Vector3)=>void)[] = [];
  const dispose = () => {
    outline?.dispose();
    group.removeFromParent();
    for(const mixer of mixers){mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot());}
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
    const clearings:Point[]=[{x:192,z:26},{x:189,z:9},{x:134,z:18},{x:122,z:41}];
    for(let row=0;row<7;row++) for(let col=0;col<8;col++){
      clearings.push({x:-194+col*55+7*Math.sin(row+col),z:-193+row*63+9*Math.cos(col*2+row)});
    }
    clearings.forEach(({x,z},i)=>{
      const key:Species = i%3===1?'wolf':'rabbit', profile=species[key], asset=assets.get(key)!;
      const points=patrol(nav,x,z,i); if(points.length<3) return;
      const model=clone(asset.scene), pivot=new THREE.Group(), animal=new THREE.Group();
      animal.name=key+'-'+i; pivot.add(model); animal.add(pivot); group.add(animal);
      const target:WildlifeTarget={kind:key,position:animal.position,height:profile.height,th:profile.th,en:profile.en,model};
      targets.set(animal.name,target);
      model.traverse(o=>{
        if(o instanceof THREE.Mesh) o.castShadow=o.receiveShadow=true;
        if(o instanceof THREE.SkinnedMesh) resources.add(o.skeleton);
      });
      const mixer=new THREE.AnimationMixer(model); mixers.push(mixer);
      const actions=new Map([profile.travel,...profile.rests].map(name=>{
        const clip=THREE.AnimationClip.findByName(asset.animations,name);
        if(!clip) throw new Error('Missing '+key+' clip '+name);
        return [name,mixer.clipAction(clip)] as const;
      }));
      let active=actions.get('n_idle')!.play(); mixer.update(0); model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model,true), center=box.getCenter(new THREE.Vector3());
      const scale=profile.height/(box.max.y-box.min.y);
      pivot.scale.setScalar(scale); model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));
      // Measure the author's forward axis from the posed skeleton before steering.
      const bone=(name:string)=>model.getObjectByName(name)?.getWorldPosition(new THREE.Vector3());
      const head=bone('DEF-nose'), tail=bone('DEF-tail004');
      if(head && tail) pivot.rotation.y=-Math.atan2(head.x-tail.x,head.z-tail.z);
      const legs=points.map((a,j)=>{
        const b=points[(j+1)%points.length], dx=b.x-a.x,dz=b.z-a.z;
        const rest=4+(i*3+j*5)%8, travel=Math.hypot(dx,dz)/travelSpeed;
        return {a,b,dx,dz,rest,travel,duration:rest+travel,heading:Math.atan2(dx,dz)};
      });
      const period=legs.reduce((sum,l)=>sum+l.duration,0);
      let poseTime=0;
      ticks.push((seconds,dt,focus)=>{
        let t=(seconds+i*13.57)%period,j=0;
        while(j<legs.length-1 && t>=legs[j].duration){t-=legs[j].duration;j++;}
        const leg=legs[j], moving=t>=leg.rest, u=moving?(t-leg.rest)/leg.travel:0;
        target.destination=moving ? leg.b : undefined;
        const px=leg.a.x+leg.dx*u,pz=leg.a.z+leg.dz*u;
        animal.position.set(px,terrainHeight(data,px,pz),pz);
        animal.rotation.y=turnTowards(animal.rotation.y,leg.heading,dt);
        const distance=animal.position.distanceToSquared(focus);
        if(distance>155**2){if(pivot.parent) pivot.removeFromParent(); return;}
        if(!pivot.parent) animal.add(pivot);
        const next=actions.get(moving?profile.travel:profile.rests[(i+j)%profile.rests.length])!;
        if(active!==next){next.reset().play().crossFadeFrom(active,.16,false);active=next;}
        poseTime+=dt;
        if(distance<65**2 || poseTime>=(distance<130**2?.12:.4)){
          mixer.update(poseTime); poseTime=0;
        }
      });
    });
    return {group,targets,dispose,showSelection,update(seconds:number,dt:number,focus:THREE.Vector3){for(const tick of ticks) tick(seconds,dt,focus);}};
  }catch(error){dispose();throw error;}
}
