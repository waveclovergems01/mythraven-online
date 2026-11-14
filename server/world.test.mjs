import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {configureNavigation,walkable,canStep,findPath,SPAWN,MAP_COLUMNS,MAP_ROWS,MAP_WIDTH,MAP_HEIGHT,cellAt} from '../shared/town-grid.mjs';
import {FOUNTAIN,CASTLE} from '../shared/town-layout.mjs';
import {GATES,getFortifications} from '../shared/fortifications.mjs';
import {createBridgeSurface} from '../shared/bridge-surface.mjs';
import {getExteriorTrees,TREE_CLEARINGS,TREE_PLACEMENTS} from '../shared/exterior-trees.mjs';
import {getFlowerbeds,flowerbedTouchesCell} from '../shared/flowerbeds.mjs';
import {getTownProperties} from '../shared/town-properties.mjs';
const {data,info}=await sharp(fileURLToPath(new URL('../public/assets/maps/mythraven-navigation.png',import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
configureNavigation({data,width:info.width,height:info.height});
const at=(x,y)=>cellAt(x*MAP_WIDTH,y*MAP_HEIGHT);
test('town buildings and vendors have solid foundations, accessible fronts and clear streets',async()=>{
 const roads=await sharp(fileURLToPath(new URL('../public/assets/maps/mythraven-roads.png',import.meta.url))).ensureAlpha().raw().toBuffer();
 for(const property of getTownProperties(MAP_WIDTH,MAP_HEIGHT)){
  const {x,y,id,footprint}=property;
  assert.equal(walkable(cellAt(x,(y+footprint.top)/2)),false,id+' foundation');
  const front=cellAt(x,y+100);
  assert.ok(findPath(SPAWN,front).length,id+' approach');
  for(let py=Math.ceil(footprint.top*1086/MAP_HEIGHT);py<=footprint.bottom*1086/MAP_HEIGHT;py++){
   for(let px=Math.ceil(footprint.left*1448/MAP_WIDTH);px<=footprint.right*1448/MAP_WIDTH;px++){
    assert.ok(roads[(py*1448+px)*4+3]<128,id+' footprint crosses a street');
   }
  }
 }
 // Stand beside the east foundation while still north of the front steps.
 const sideApproach=at(516/1448,600/1086);
 assert.ok(findPath(SPAWN,sideApproach).length,'walk alongside the townhouse');
});
test('six concave flowerbeds block rims and planting while preserving fountain axes and castle entry',()=>{
 const beds=getFlowerbeds(MAP_WIDTH,MAP_HEIGHT);assert.equal(beds.length,6);
 for(const bed of beds)for(const [x,y] of bed.points)assert.equal(walkable(cellAt(x,y)),false,bed.id+' rim');
 for(const [x,y] of [[750,605],[620,490],[750,397],[880,490],[740,260],[740,215]]){
  const end=at(x/1448,y/1086);assert.ok(walkable(end));assert.ok(findPath(SPAWN,end).length>0);
 }
 const concave={points:[[0,0],[100,0],[100,20],[20,20],[20,100],[0,100]],rim:0};
 assert.equal(flowerbedTouchesCell(concave,45,45,10,10),false,'concave opening is not a bounding-box collider');
 assert.equal(flowerbedTouchesCell(concave,40,-10,10,40),true,'thin arm crossing a cell is blocked even without contained vertices');
});
test('exterior trees block roots while all bridge and future warp clearings remain free of canopies',()=>{
 const trees=getExteriorTrees(MAP_WIDTH,MAP_HEIGHT);
 assert.equal(new Set(trees.map(t=>t.type)).size,5);
 assert.ok(trees.length>40);
 assert.ok(TREE_PLACEMENTS.filter(t=>t.x>480&&t.x<1020&&t.y<212).length>80,'dense castle gardens');
 assert.ok(TREE_PLACEMENTS.filter(t=>t.x>100&&t.x<1350&&t.y>90&&t.y<980).length>350,'outside-wall island gardens');
 for(const t of trees){
  assert.equal(walkable(cellAt(t.x,t.y)),false,t.id+' trunk');
  const l=(t.x-t.spec.anchorX*t.scale)/MAP_WIDTH*1448,r=(t.x+(t.spec.width-t.spec.anchorX)*t.scale)/MAP_WIDTH*1448;
  const top=(t.y-t.spec.anchorY*t.scale)/MAP_HEIGHT*1086,b=(t.y+(t.spec.height-t.spec.anchorY)*t.scale)/MAP_HEIGHT*1086;
  assert.ok(!TREE_CLEARINGS.some(([cl,ct,cr,cb])=>l<cr&&r>cl&&top<cb&&b>ct),t.id+' clearing');
 }
});
test('grass covers85 percent of natural land while roads and courts remain separate masks',async()=>{
 const masks=await Promise.all(['land','roads','courts','grass-mask'].map(name=>sharp(fileURLToPath(new URL(`../public/assets/maps/mythraven-${name}.png`,import.meta.url))).resize(1448,1086).ensureAlpha().raw().toBuffer()));
 let natural=0,green=0;
 for(let i=3;i<masks[0].length;i+=4){const weight=masks[0][i]/255*(1-Math.max(masks[1][i],masks[2][i])/255);natural+=weight;green+=weight*masks[3][i]/255;}
 assert.ok(Math.abs(green/natural-.85)<.005,`natural coverage ${green/natural}`);
});
test('arched bridge projection raises the crest, joins land continuously and reverses clicks',()=>{
 const surface=createBridgeSurface(MAP_WIDTH,MAP_HEIGHT);
 for(const b of surface.bridges){
  const center={x:(b.left+b.right)/2,y:(b.top+b.bottom)/2};
  assert.ok(surface.project(center.x,center.y).y<center.y-60,b.id+' crest');
  for(const t of [0,.001,.1,.25,.5,.75,.9,.999,1])for(const across of [.1,.5,.9]){
   const p=b.axis==='x'?{x:b.left+(b.right-b.left)*t,y:b.top+(b.bottom-b.top)*across}:{x:b.left+(b.right-b.left)*across,y:b.top+(b.bottom-b.top)*t};
   const image=surface.project(p.x,p.y),roundTrip=surface.unproject(image.x,image.y);
   assert.ok(Math.hypot(roundTrip.x-p.x,roundTrip.y-p.y)<.001,`${b.id} ${t} ${across}`);
   if(t===0||t===1)assert.ok(Math.hypot(image.x-p.x,image.y-p.y)<.001,b.id+' landing');
  }
 }
 assert.deepEqual(surface.project(100,100),{x:100,y:100});
 assert.deepEqual(surface.unproject(100,100),{x:100,y:100});
});
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
 for(const r of layout.supports)assert.equal(walkable(cellAt((r.left+r.right)/2,(r.top+r.bottom)/2)),false);
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
 // Dense outside-wall forests intentionally replace formerly open bank cells.
 // Keep a broad playable town while requiring EVERY green cell to be reachable.
 // Enlarged formal gardens occupy another portion of the formerly open plaza.
 assert.ok(total>21000);assert.equal(seen.size,total);
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
