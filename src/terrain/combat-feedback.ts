import * as THREE from 'three';
import type {CombatHit} from '../network/terrain-client';
import {locale} from '../i18n';

export function createCombatFeedback(host:HTMLElement){
  type Hit={node:HTMLElement;position:THREE.Vector3;height:number;until:number};
  const hits=new Set<Hit>();
  const screen=new THREE.Vector3();
  function remove(hit:Hit){
    hit.node.remove();hits.delete(hit);
  }
  return {
    show(event:CombatHit,position:THREE.Vector3,height:number){
      const node=document.createElement('span');
      node.className='combat-damage '+(event.to==='player'?'incoming':event.critical?'critical':'outgoing');
      node.textContent=event.dodged?(locale()==='th'?'หลบ':'Dodge'):String(event.damage);
      node.setAttribute('aria-hidden','true');
      host.append(node);
      hits.add({node,position,height:height+.6,until:performance.now()+900});
    },
    update(camera:THREE.Camera){
      const now=performance.now();
      for(const hit of hits){
        if(now>=hit.until){remove(hit);continue;}
        screen.copy(hit.position);screen.y+=hit.height;screen.project(camera);
        hit.node.hidden=Math.max(Math.abs(screen.x),Math.abs(screen.y),Math.abs(screen.z))>1;
        hit.node.style.left=(screen.x+1)*50+'%';
        hit.node.style.top=(1-screen.y)*50+'%';
      }
    },
    destroy(){for(const hit of hits)remove(hit);}
  };
}
