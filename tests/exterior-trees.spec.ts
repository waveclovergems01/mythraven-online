import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('five exterior tree variants show on the map, fade behind the actor and survive reentry',async({page})=>{
 test.setTimeout(180000);const out='test-results/exterior-trees';await fs.mkdir(out,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+
   '\nimport {EXTERIOR_TREES as testTrees} from "/src/world/trees.ts";import {walkable as testWalkable,cellAt as testCellAt,findPath as testPath,SPAWN as testSpawn} from "/shared/town-grid.mjs";const treeCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){treeCreate.apply(this,args);window.treeTest={scene:this,trees:testTrees,walkable:testWalkable,cellAt:testCellAt,path:testPath,spawn:testSpawn};};'});
 });
 await page.setViewportSize({width:1920,height:1080});await page.goto('/?view=2d');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:30000});
 await page.waitForFunction(()=>{const s=(window as any).treeTest?.scene;return s?.views.has(s.network.room?.sessionId);});
 const initial=await page.evaluate(()=>{const t=(window as any).treeTest,s=t.scene;return {count:s.children.list.filter((o:any)=>o.name.startsWith('exterior-tree-')).length,listeners:s.events.listenerCount('postupdate'),types:[...new Set(t.trees.map((o:any)=>o.type))]};});
 expect(initial.count).toBeGreaterThanOrEqual(1000);expect(initial.types).toHaveLength(5);
 const wallOverlaps=await page.evaluate(()=>{
  const t=(window as any).treeTest,s=t.scene,walls=s.children.list.filter((o:any)=>o.name.startsWith('city-wall'));
  let checked=0;const clipped:string[]=[];
  for(const tree of t.trees){const image=s.children.getByName(tree.id),b=image.getBounds();
   for(const wall of walls){const w=wall.getBounds();if(b.left<w.right&&b.right>w.left&&b.top<w.bottom&&b.bottom>w.top){checked++;if(image.depth<=wall.depth)clipped.push(tree.id+' / '+wall.name);}}
  }
  return {checked,clipped};
 });
 expect(wallOverlaps.checked).toBeGreaterThan(100);expect(wallOverlaps.clipped).toEqual([]);
 const mini=await page.locator('.minimap-image img').getAttribute('src');await fs.writeFile(out+'/city-with-trees.png',Buffer.from(mini!.split(',')[1],'base64'));
 for(const [label,x,y] of [['castle-gardens',7850,1300],['west-wall-garden',2300,3550],['east-wall-garden',13550,6200]] as const){
  await page.evaluate(({x,y})=>(window as any).treeTest.scene.cameras.main.stopFollow().centerOn(x,y),{x,y});
  await page.waitForTimeout(350);await page.screenshot({path:out+'/'+label+'.png'});
 }
 // Find a reachable, actually painted canopy sample. Scene pause is used only
 // for candidate selection; the assertion below walks there on the real server.
 const target=await page.evaluate(()=>{
  const t=(window as any).treeTest,s=t.scene;s.scene.pause();const start={x:s.player.x,y:s.player.y};let best:any;
  findTree: for(const tree of [...t.trees].sort((a:any,b:any)=>Math.hypot(a.x-start.x,a.y-start.y)-Math.hypot(b.x-start.x,b.y-start.y))){
   for(const dx of [0,-60,60])for(const dy of [-120,-210]){
    const cell=t.cellAt(tree.x+dx,tree.y+dy);if(!t.walkable(cell))continue;
    const route=t.path(t.spawn,cell);if(!route.length||best&&route.length>=best.length)continue;
    s.player.setPosition((cell.x+.5)*64,(cell.y+.5)*56);for(let i=0;i<15;i++)s.events.emit('postupdate',0,100);
    if(s.children.getByName(tree.id).alpha<.5){best={cell,id:tree.id,length:route.length,x:tree.x,y:tree.y};break findTree;}
   }
  }
  s.player.setPosition(start.x,start.y);s.scene.resume();s.cameras.main.startFollow(s.player,true,.12,.12);return best;
 });
 expect(target).toBeTruthy();
 await page.evaluate(c=>(window as any).treeTest.scene.network.move(c.x,c.y),target.cell);
 await expect.poll(()=>page.evaluate(c=>{const s=(window as any).treeTest.scene,p=s.network.players.get(s.network.room.sessionId);return Math.hypot(p.x-(c.x+.5)*64,p.y-(c.y+.5)*56);},target.cell),{timeout:45000}).toBeLessThan(1);
 await expect.poll(()=>page.evaluate(id=>(window as any).treeTest.scene.children.getByName(id).alpha,target.id)).toBeLessThan(.5);
 await page.screenshot({path:out+'/tree-behind-player.png'});
 expect(await page.locator('.minimap-image img').getAttribute('src')).toBe(mini);
 // A movement request into the root must be rejected by the game server too.
 const root=await page.evaluate(p=>(window as any).treeTest.cellAt(p.x,p.y),target);
 await page.evaluate(c=>(window as any).treeTest.scene.network.room.send('move',c),root);await page.waitForTimeout(400);
 expect(await page.evaluate(()=>{const s=(window as any).treeTest.scene,p=s.network.players.get(s.network.room.sessionId);return {x:Math.floor(p.x/64),y:Math.floor(p.y/56)};})).toEqual(target.cell);
 await page.locator('#logout').click();await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
 expect(await page.evaluate(()=>(window as any).treeTest.scene.events.listenerCount('postupdate'))).toBe(initial.listeners);
 expect(await page.evaluate(()=>(window as any).treeTest.scene.children.list.filter((o:any)=>o.name.startsWith('exterior-tree-')).length)).toBe(initial.count);
 expect(errors).toEqual([]);await fs.writeFile(out+'/validation.json',JSON.stringify({initial,wallOverlaps,target,errors},null,2));
 await page.locator('#logout').click();
});
