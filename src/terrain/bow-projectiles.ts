import * as THREE from 'three';
import type {BowShot} from '../network/terrain-client';
import type {WildlifeTarget} from './frontier-wildlife';
import {createEnergyArrow} from './energy-arrow';

export function createBowProjectiles(scene:THREE.Scene){
  const group=new THREE.Group();group.name='bow-projectiles';scene.add(group);
  const pool=Array.from({length:96},()=>{
    const arrow=createEnergyArrow();arrow.group.visible=false;group.add(arrow.group);
    return {arrow,shot:undefined as BowShot|undefined,target:undefined as WildlifeTarget|undefined,origin:new THREE.Vector3()};
  });
  let cursor=0;
  const end=new THREE.Vector3(),tip=new THREE.Vector3(),tail=new THREE.Vector3(),direction=new THREE.Vector3();
  function clear(){for(const p of pool){p.shot=undefined;p.arrow.group.visible=false;}}
  const visibility=()=>{if(document.hidden)clear();};
  document.addEventListener('visibilitychange',visibility);
  return {
    launch(shot:BowShot,target:WildlifeTarget,origin?:THREE.Vector3){
      if(document.hidden)return;
      const p=pool[cursor++%pool.length];p.shot=shot;p.target=target;
      p.origin.copy(origin??new THREE.Vector3(shot.from.x,shot.from.y,shot.from.z));p.arrow.group.visible=true;
    },
    impact(id:number|undefined){
      if(id===undefined)return;
      for(const p of pool)if(p.shot?.id===id){p.shot=undefined;p.arrow.group.visible=false;break;}
    },
    update(serverTime:number){
      for(const p of pool){
        const shot=p.shot,target=p.target;if(!shot || !target)continue;
        if(document.hidden || serverTime>shot.impactAt+.3){p.shot=undefined;p.arrow.group.visible=false;continue;}
        const bone=target.model?.getObjectByName('DEF-spine003');
        if(bone)bone.getWorldPosition(end);else {end.copy(target.position);end.y+=target.height*.7;}
        const phase=THREE.MathUtils.clamp((serverTime-shot.releaseAt)/(shot.impactAt-shot.releaseAt),0,.99);
        tip.lerpVectors(p.origin,end,phase);direction.subVectors(end,p.origin);
        const length=direction.length();if(length>.001)direction.divideScalar(length);
        tail.copy(tip).addScaledVector(direction,-Math.min(1.5,length));
        p.arrow.place(tail,tip);
      }
    },
    clear,
    destroy(){document.removeEventListener('visibilitychange',visibility);for(const p of pool)p.arrow.dispose();group.removeFromParent();}
  };
}
