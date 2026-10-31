import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {configureNavigation,walkable,canStep,findPath,SPAWN,MAP_COLUMNS,MAP_ROWS,MAP_WIDTH,MAP_HEIGHT,cellAt} from '../shared/town-grid.mjs';
import {FOUNTAIN,CASTLE} from '../shared/town-layout.mjs';
import {GATES,getFortifications} from '../shared/fortifications.mjs';
const {data,info}=await sharp(fileURLToPath(new URL('../public/assets/maps/mythraven-navigation.png',import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
configureNavigation({data,width:info.width,height:info.height});
const at=(x,y)=>cellAt(x*MAP_WIDTH,y*MAP_HEIGHT);
test('expanded capital spawns on land, blocks river on all sides, and detours around basin',()=>{
 assert.equal(walkable(SPAWN),true);
 assert.equal(MAP_COLUMNS,240);assert.equal(MAP_ROWS,206);
 assert.equal(MAP_WIDTH,15360);assert.equal(MAP_HEIGHT,11536);
 const basin=at(FOUNTAIN.x,FOUNTAIN.y);
 for(const c of [{x:-1,y:0},{x:MAP_COLUMNS,y:0},basin,at(.5,.04),at(.47,.91),at(.045,.5),at(.95,.5)])assert.equal(walkable(c),false,JSON.stringify(c));
 const a=at(FOUNTAIN.x-.05,FOUNTAIN.y),b=at(FOUNTAIN.x+.05,FOUNTAIN.y),route=findPath(a,b);
 assert.ok(route.length>0);let previous=a;
 for(const c of route){assert.ok(walkable(c));assert.ok(canStep(previous,c));previous=c;}
 assert.deepEqual(route.at(-1),b);assert.deepEqual(findPath(SPAWN,basin),[]);
 // Every district and castle court remain reachable inside the new perimeter.
 for(const c of [at(.51,.215),at(.27,.36),at(.76,.29),at(.26,.68),at(.76,.68),at(.51,.70)]){
  const path=findPath(SPAWN,c);assert.ok(path.length>0,JSON.stringify(c));assert.deepEqual(path.at(-1),c);
 }
});

test('three fortified gates connect the city to mainland; walls and bridge rails stay solid',()=>{
 const layout=getFortifications(MAP_WIDTH,MAP_HEIGHT),sourceCell=([x,y])=>at(x/1448,y/1086);
 for(const gate of GATES){
  const inside=sourceCell(gate.inside),outside=sourceCell(gate.outside);
  for(const c of [inside,outside,sourceCell([gate.x,gate.y])])assert.ok(walkable(c),`${gate.id} ${JSON.stringify(c)}`);
  for(const [start,end] of [[SPAWN,inside],[inside,outside],[outside,inside]]){
   const path=findPath(start,end);assert.ok(path.length>0,gate.id);assert.deepEqual(path.at(-1),end);
   let prev=start;for(const c of path){assert.ok(canStep(prev,c));prev=c;}
  }
 }
 for(const wall of layout.walls)assert.equal(walkable(cellAt((wall.x1+wall.x2)/2,(wall.y1+wall.y2)/2)),false);
 for(const t of layout.towers)assert.equal(walkable(cellAt(t.x,t.y)),false);
 for(const r of layout.rails)assert.equal(walkable(cellAt((r.left+r.right)/2,(r.top+r.bottom)/2)),false);
 // Closing just the three gate passages must disconnect the outside: no holes
 // at wall corners or accidental routes through the castle's northern court.
 const closed=c=>GATES.some(g=>{const x=(c.x+.5)*1448/MAP_COLUMNS,y=(c.y+.5)*1086/MAP_ROWS;return Math.abs(x-g.x)<(g.axis==='x'?18:42)&&Math.abs(y-g.y)<(g.axis==='x'?42:18);});
 const seen=new Set([`${SPAWN.x},${SPAWN.y}`]),queue=[SPAWN];
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
  const c={x:queue[i].x+dx,y:queue[i].y+dy},key=`${c.x},${c.y}`;
  if(!seen.has(key)&&walkable(c)&&!closed(c)){seen.add(key);queue.push(c);}
 }
 for(const g of GATES){const c=sourceCell(g.outside);assert.equal(seen.has(`${c.x},${c.y}`),false,g.id+' perimeter leak');}
});

test('all green destinations belong to the reachable town and bridge network',()=>{
 const seen=new Set([`${SPAWN.x},${SPAWN.y}`]),queue=[SPAWN];
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
  const c={x:queue[i].x+dx,y:queue[i].y+dy},key=`${c.x},${c.y}`;
  if(!seen.has(key)&&walkable(c)){seen.add(key);queue.push(c);}
 }
 let total=0;for(let y=0;y<MAP_ROWS;y++)for(let x=0;x<MAP_COLUMNS;x++)if(walkable({x,y}))total++;
 assert.ok(total>25000);assert.equal(seen.size,total);
});

test('castle blocks physical wings, gate and stairs; approaches and perimeter stay reachable',()=>{
 const scale=CASTLE.width/CASTLE.sourceWidth,cx=CASTLE.x*MAP_WIDTH,cy=CASTLE.y*MAP_HEIGHT;
 const point=(x,y)=>cellAt(cx+(x-CASTLE.anchorX)*scale,cy+(y-CASTLE.anchorY)*scale);
 for(const c of [point(200,750),point(1600,750),point(600,900),point(1100,900),point(900,970)]){
  assert.equal(walkable(c),false,JSON.stringify(c));assert.deepEqual(findPath(SPAWN,c),[]);
 }
 // Entire movement cells that overlap a wall are blocked, even with centers outside.
 const left=cx+(CASTLE.footprints[0][0]-CASTLE.anchorX)*scale;
 assert.equal(walkable(cellAt(left-1,cy+(750-CASTLE.anchorY)*scale)),false);
 const front=point(900,1040),wingFront=point(300,910),rear=point(900,580);
 for(const c of [front,wingFront,rear,point(15,740),point(1785,740)]){
  assert.ok(walkable(c),JSON.stringify(c));assert.ok(findPath(SPAWN,c).length>0,JSON.stringify(c));
 }
 const a=point(20,900),b=point(1780,900),route=findPath(a,b);
 assert.ok(route.length>0);let previous=a;
 for(const c of route){assert.ok(canStep(previous,c));previous=c;}
 assert.deepEqual(route.at(-1),b);
});
