import behavior from '../shared/monster-behavior.json' with {type:'json'};

export function roamingRandom(seed){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
export function restDuration(random){return behavior.restSeconds.min+random()*(behavior.restSeconds.max-behavior.restSeconds.min);}
export function pathLength(start,path){let total=0;for(const p of path){total+=Math.hypot(p.x-start.x,p.z-start.z);start=p;}return total;}

/** Walk one 5–30 m section of a longer journey, retaining bends/bridge crossings. */
export function nextExcursion(mob,destinations){
  const nav=mob.mover,random=mob.random;
  if(!mob.journey?.length || pathLength(nav.position,mob.journey)<behavior.walkMetres.min){
    mob.journey=[];
    for(let attempt=0;attempt<3;attempt++){
      const target=destinations[Math.floor(random()*destinations.length)];
      if(Math.hypot(target.x-nav.position.x,target.z-nav.position.z)<behavior.walkMetres.min)continue;
      const path=nav.planRoute(target);
      if(path?.length){mob.journey=path;break;}
    }
  }
  if(!mob.journey.length)return false;
  let remaining=behavior.walkMetres.min+random()*(behavior.walkMetres.max-behavior.walkMetres.min);
  let start={...nav.position};const outing=[];
  while(mob.journey.length && remaining>1e-6){
    const next=mob.journey[0],distance=Math.hypot(next.x-start.x,next.z-start.z);
    if(distance<=remaining){outing.push(next);mob.journey.shift();remaining-=distance;start=next;}
    else {outing.push({x:start.x+(next.x-start.x)*remaining/distance,z:start.z+(next.z-start.z)*remaining/distance});break;}
  }
  if(!outing.length)return false;
  nav.setSpeedLevel(behavior.speedLevel);nav.restorePath(JSON.stringify(outing),0,true);
  return true;
}
