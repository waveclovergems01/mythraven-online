import test from 'node:test';
import assert from 'node:assert/strict';
import {shortestPath,canStep} from '../shared/pathfinding.mjs';
import {TownRoom} from './town-room.mjs';
import {configureNavigation,centerOf} from '../shared/town-grid.mjs';
const options=(blocked=[])=>({columns:12,rows:12,width:64,height:56,walkable:c=>!blocked.some(b=>b.x===c.x&&b.y===c.y)});
const length=(from,path)=>path.reduce((sum,p)=>{const d=Math.hypot((p.x-from.x)*64,(p.y-from.y)*56);from=p;return sum+d;},0);
test('0,0 to 9,9 takes nine diagonal steps, not an L',()=>{
 const a={x:0,y:0},b={x:9,y:9},route=shortestPath(a,b,options());
 assert.equal(route.length,9);route.forEach((p,i)=>assert.deepEqual(p,{x:i+1,y:i+1}));
 assert.ok(Math.abs(length(a,route)-9*Math.hypot(64,56))<1e-6);
});
test('blocked corners cannot be crossed by paths or keyboard steps',()=>{
 const a={x:0,y:0},b={x:1,y:1},o=options([{x:1,y:0},{x:0,y:1}]);
 assert.equal(canStep(a,b,o.walkable),false);assert.deepEqual(shortestPath(a,b,o),[]);
 assert.deepEqual(shortestPath(a,a,options()),[]);assert.deepEqual(shortestPath(a,{x:12,y:0},options()),[]);
});
// Independent Dijkstra cost oracle checks optimality on asymmetric, obstructed grids.
test('A* gives minimum world-distance cost around obstacles',()=>{
 for(let seed=1;seed<=15;seed++){
  const blocked=[];for(let y=0;y<12;y++)for(let x=0;x<12;x++)if((x*37+y*17+seed*13)%11<3)blocked.push({x,y});
  const start={x:0,y:0},end={x:11,y:11};const o=options(blocked.filter(c=>(c.x||c.y)&&(c.x!==11||c.y!==11)));
  const valid=c=>c.x>=0&&c.y>=0&&c.x<12&&c.y<12&&o.walkable(c);
  const queue=[{...start,cost:0}],costs=new Map([['0,0',0]]);let expected=Infinity;
  while(queue.length){queue.sort((a,b)=>a.cost-b.cost);const p=queue.shift();if(p.cost!==costs.get(`${p.x},${p.y}`))continue;if(p.x===11&&p.y===11){expected=p.cost;break;}
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    if(!dx&&!dy)continue;const q={x:p.x+dx,y:p.y+dy};
    if(!valid(q)||(dx&&dy&&(!valid({x:p.x+dx,y:p.y})||!valid({x:p.x,y:p.y+dy}))))continue;
    const cost=p.cost+Math.hypot(dx*64,dy*56),key=`${q.x},${q.y}`;
    if(cost<(costs.get(key)??Infinity)){costs.set(key,cost);queue.push({...q,cost});}
   }
  }
  const route=shortestPath(start,end,o);
  if(!Number.isFinite(expected))assert.equal(route.length,0);else assert.ok(Math.abs(length(start,route)-expected)<1e-6);
 }
});
test('server movement consumes the same distance budget in straight and diagonal directions',()=>{
 configureNavigation({width:1,height:1,data:new Uint8Array([255,255,255,255])});
 for(const direction of [{x:1,y:0},{x:1,y:1}]){
  const cell={x:10,y:10},start=centerOf(cell),p={...start},m={cell,path:[],target:null,direction,directionUntil:Infinity};
  const room={movers:new Map([['p',m]]),state:{players:new Map([['p',p]])}};
  for(let i=0;i<20;i++)TownRoom.prototype.tick.call(room,50);
  assert.ok(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-420)<1e-5);
 }
});
