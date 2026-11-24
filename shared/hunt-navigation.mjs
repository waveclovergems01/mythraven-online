import {PLAYER_RADIUS} from './terrain-movement.mjs';
export const PLAYER_APPROACH_DISTANCE=PLAYER_RADIUS*4;

/** Prefer the near side; try other dry sides if a bank or root blocks that spot. */
export function playerApproachPoint(movement,target,distance=PLAYER_APPROACH_DISTANCE){
  const from=movement.position;
  if(Math.hypot(from.x-target.x,from.z-target.z)<=distance && movement.clearLine(from,target))return {...from};
  const angle=Math.atan2(from.z-target.z,from.x-target.x);
  for(let step=0;step<=16;step++)for(const sign of step===0?[1]:[1,-1]){
    const theta=angle+sign*step*Math.PI/16;
    const point={x:target.x+Math.cos(theta)*distance,z:target.z+Math.sin(theta)*distance};
    if(movement.canStand(point) && movement.clearLine(point,target))return point;
  }
}

/** Rank by walkable route length, retaining a current target unless a route is meaningfully shorter. */
export function nearestHuntTarget(movement,candidates,standOff,withinHunt,current){
  const from=movement.position;
  const ranked=candidates.map(candidate=>({...candidate,lower:Math.max(0,
    Math.hypot(candidate.goal.x-from.x,candidate.goal.z-from.z)-standOff)}));
  ranked.sort((a,b)=>a.lower-b.lower);
  function cost(goal){
    const end=playerApproachPoint(movement,goal,standOff);
    if(!end || !withinHunt(end))return Infinity;
    const path=movement.planRoute(end);
    if(!path || !path.every(withinHunt))return Infinity;
    let length=0,previous=from;
    for(const point of path){length+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
    return length;
  }
  const pursuing=current && ranked.find(candidate=>candidate.id===current);
  const currentCost=pursuing?cost(pursuing.goal):Infinity;
  let best=Number.isFinite(currentCost)?Math.max(0,currentCost-Math.max(3,currentCost*.2)):Infinity;
  let nearest=Number.isFinite(currentCost)?current:undefined;
  for(const candidate of ranked){
    if(candidate.lower>=best)break;
    if(candidate.id===current)continue;
    const distance=cost(candidate.goal);
    if(distance<best){best=distance;nearest=candidate.id;}
  }
  return nearest;
}
