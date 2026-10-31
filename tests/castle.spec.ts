import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('castle fits northern court, blocks walls and animates only cloth with fixed hoists',async({page},testInfo)=>{
 test.setTimeout(90000);const out='test-results/castle';await fs.mkdir(out,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+
   '\nimport {CASTLE as testCastle} from "/shared/town-layout.mjs";import {walkable as testWalkable,cellAt as testCellAt} from "/shared/town-grid.mjs";const castleCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){castleCreate.apply(this,args);window.castleTest={scene:this,layout:testCastle,walkable:testWalkable,cellAt:testCellAt};};'});
 });
 await page.setViewportSize({width:1920,height:1200});await page.goto('/');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:25000});
 await page.waitForFunction(()=>{const s=(window as any).castleTest?.scene;return s?.views.has(s.network.room?.sessionId);});
 const layout=await page.evaluate(()=>{
  const t=(window as any).castleTest,s=t.scene,k=t.layout,b=s.cameras.main.getBounds(),x=b.width*k.x,y=b.height*k.y,scale=k.width/k.sourceWidth;
  return {x,y,scale,width:k.width,anchorX:k.anchorX,anchorY:k.anchorY,footprints:k.footprints,
   target:{x:Math.floor(x/64),y:Math.ceil((y+100)/56)}};
 });
 // Real server path from entry spawn to the front steps, not a client teleport.
 await page.evaluate(target=>(window as any).castleTest.scene.network.move(target.x,target.y),layout.target);
 await expect.poll(()=>page.evaluate(target=>{
  const s=(window as any).castleTest.scene,p=s.network.players.get(s.network.room.sessionId);
  return Math.hypot(p.x-(target.x+.5)*64,p.y-(target.y+.5)*56);
 },layout.target),{timeout:20000}).toBeLessThan(1);
 const frame=()=>page.evaluate(()=>{
  const s=(window as any).castleTest.scene;
  return {building:s.children.list.filter((o:any)=>o.name.startsWith('castle-section-')).map((o:any)=>[o.x,o.y,o.scaleX,o.scaleY,o.depth,o.frame.name]),
   cloth:s.children.list.filter((o:any)=>o.name.startsWith('castle-flag-')).map((o:any)=>({name:o.name,x:o.x,y:o.y,scaleY:o.scaleY})),
   player:{...s.network.players.get(s.network.room.sessionId)}};
 });
 const before=await frame();expect(before.building).toHaveLength(5);expect(before.cloth).toHaveLength(80);
 await page.evaluate(()=>{const s=(window as any).castleTest.scene,k=(window as any).castleTest.layout,b=s.cameras.main.getBounds();s.cameras.main.stopFollow().centerOn(b.width*k.x,1200);});
 await page.waitForTimeout(250);await page.screenshot({path:out+'/castle-in-city.png'});
 // Crop only tower/cloth pixels as visual evidence of a real rendered change.
 await page.screenshot({path:out+'/flag-a.png',clip:{x:90,y:100,width:360,height:220}});
 await page.waitForTimeout(1400);const after=await frame();
 await page.screenshot({path:out+'/flag-b.png',clip:{x:90,y:100,width:360,height:220}});
 expect(after.building).toEqual(before.building);
 for(const root of ['castle-flag-0-0','castle-flag-1-0'])expect(after.cloth.find((p:any)=>p.name===root)).toEqual(before.cloth.find((p:any)=>p.name===root));
 expect(after.cloth.some((p:any,i:number)=>Math.abs(p.y-before.cloth[i].y)>3)).toBe(true);
 expect(await fs.readFile(out+'/flag-a.png')).not.toEqual(await fs.readFile(out+'/flag-b.png'));
 // The client marker and authoritative server both reject physical walls.
 const blocked=await page.evaluate(()=>{
  const t=(window as any).castleTest,s=t.scene,k=t.layout,b=s.cameras.main.getBounds(),scale=k.width/k.sourceWidth;
  const p=t.cellAt(b.width*k.x+(900-k.anchorX)*scale,b.height*k.y+(800-k.anchorY)*scale);
  return {cell:p,walkable:t.walkable(p)};
 });
 expect(blocked.walkable).toBe(false);
 const stopped=(await frame()).player;
 await page.evaluate(cell=>(window as any).castleTest.scene.network.room.send('move',cell),blocked.cell);
 await page.waitForTimeout(400);expect((await frame()).player).toEqual(stopped);
 // Walk in front of the recessed left wing; it must sort behind the player.
 const wing=await page.evaluate(()=>{
  const t=(window as any).castleTest,s=t.scene,k=t.layout,b=s.cameras.main.getBounds(),scale=k.width/k.sourceWidth;
  return t.cellAt(b.width*k.x+(300-k.anchorX)*scale,b.height*k.y+(920-k.anchorY)*scale);
 });
 await page.evaluate(c=>(window as any).castleTest.scene.network.move(c.x,c.y),wing);
 await expect.poll(()=>page.evaluate(c=>{const s=(window as any).castleTest.scene,p=s.network.players.get(s.network.room.sessionId);return Math.hypot(p.x-(c.x+.5)*64,p.y-(c.y+.5)*56);},wing),{timeout:12000}).toBeLessThan(1);
 expect(await page.evaluate(()=>{const s=(window as any).castleTest.scene,p=s.views.get(s.network.room.sessionId).container;return p.depth>s.children.getByName('castle-section-0').depth;})).toBe(true);
 await page.screenshot({path:out+'/wing-front-depth.png'});
 await fs.writeFile(out+'/validation.json',JSON.stringify({layout,before,after,blocked,wing},null,2));
 await page.locator('#logout').click();await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
 await page.waitForFunction(()=>(window as any).castleTest.scene.children.list.filter((o:any)=>o.name.startsWith('castle-flag-')).length===80);
 expect((await frame()).building).toHaveLength(5);expect(errors).toEqual([]);
});
