import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('six raised flowerbeds preserve fountain and castle approaches, block planting and recreate cleanly',async({page})=>{
 test.setTimeout(150000);const out='test-results/flowerbeds';await fs.mkdir(out,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+
   '\nimport {FLOWERBEDS as gardenBeds} from "/src/world/flowerbeds.ts";import {flowerbedFrontY as gardenFrontY} from "/shared/flowerbeds.mjs";import {walkable as gardenWalkable,cellAt as gardenCellAt} from "/shared/town-grid.mjs";const gardenCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){gardenCreate.apply(this,args);window.gardenTest={scene:this,beds:gardenBeds,frontY:gardenFrontY,walkable:gardenWalkable,cellAt:gardenCellAt};};'});
 });
 await page.setViewportSize({width:1920,height:1080});await page.goto('/?view=2d');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:30000});
 await page.waitForFunction(()=>{const s=(window as any).gardenTest?.scene;return s?.views.has(s.network.room?.sessionId);});
 const state=()=>page.evaluate(()=>{const t=(window as any).gardenTest,s=t.scene;return {beds:t.beds.length,textures:s.textures.getTextureKeys().filter((k:string)=>k.startsWith('flowerbed-')).length,rows:s.children.list.filter((o:any)=>o.name.startsWith('flowerbed-')).length,listeners:s.events.listenerCount('postupdate')};});
 const initial=await state();expect(initial.beds).toBe(6);expect(initial.textures).toBe(6);expect(initial.rows).toBeGreaterThan(30);
 // Reproduce the reported front-edge bug on straight, curved and stepped edges
 // of EVERY bed. Freeze only rendering probes, then resume real server walks.
 const visibility=await page.evaluate(()=>{
  const t=(window as any).gardenTest,s=t.scene,start={x:s.player.x,y:s.player.y};s.scene.pause();
  const result=t.beds.map((bed:any)=>{
   const parts=s.children.list.filter((o:any)=>o.name.startsWith('flowerbed-'+bed.id+'-'));
   const xs=bed.points.map((p:number[])=>p[0]),min=Math.min(...xs),max=Math.max(...xs);
   const probes=[.18,.5,.82].map(f=>{
    const x=min+(max-min)*f,y=t.frontY(bed,x)+bed.rim/2+24;
    s.player.setPosition(x,y);for(let i=0;i<20;i++)s.events.emit('postupdate',0,100);
    return {x,y,alpha:Math.min(...parts.map((o:any)=>o.alpha))};
   });
   // A synthetic covered body must still fade: this guards against disabling
   // occlusion entirely to hide the front-edge regression.
   const x=(min+max)/2,y=t.frontY(bed,x)-80;
   s.player.setPosition(x,y);for(let i=0;i<20;i++)s.events.emit('postupdate',0,100);
   return {id:bed.id,probes,coveredAlpha:Math.max(...parts.map((o:any)=>o.alpha))};
  });
  s.player.setPosition(start.x,start.y);for(let i=0;i<20;i++)s.events.emit('postupdate',0,100);s.scene.resume();return result;
 });
 await fs.writeFile(out+'/visibility.json',JSON.stringify(visibility,null,2));
 for(const bed of visibility){for(const probe of bed.probes)expect(probe.alpha,bed.id+' front edge').toBe(1);expect(bed.coveredAlpha,bed.id+' covered body').toBeLessThan(.5);}
 const mini=await page.locator('.minimap-image img').getAttribute('src');await fs.writeFile(out+'/city-with-flowerbeds.png',Buffer.from(mini!.split(',')[1],'base64'));
 for(const [name,x,y] of [['fountain',750,496],['castle-front',740,235]] as const){
  await page.evaluate(({x,y})=>(window as any).gardenTest.scene.cameras.main.stopFollow().centerOn(x/1448*15360,y/1086*11536),{x,y});
  await page.waitForTimeout(350);await page.screenshot({path:`${out}/${name}.png`});
 }
 await page.evaluate(()=>{const s=(window as any).gardenTest.scene;s.cameras.main.setZoom(.3).centerOn(750/1448*15360,496/1086*11536);});
 await page.waitForTimeout(350);await page.screenshot({path:out+'/four-symmetric-gardens.png'});
 await page.evaluate(()=>(window as any).gardenTest.scene.cameras.main.setZoom(.5));
 const move=async(x:number,y:number)=>{
  const cell={x:Math.floor(x/1448*240),y:Math.floor(y/1086*206)};
  expect(await page.evaluate(c=>(window as any).gardenTest.walkable(c),cell)).toBe(true);
  await page.evaluate(c=>{const s=(window as any).gardenTest.scene;s.cameras.main.startFollow(s.player,true,.12,.12);s.network.move(c.x,c.y);},cell);
  await expect.poll(()=>page.evaluate(c=>{const s=(window as any).gardenTest.scene,p=s.network.players.get(s.network.room.sessionId);return Math.hypot(p.x-(c.x+.5)*64,p.y-(c.y+.5)*56);},cell),{timeout:30000}).toBeLessThan(1);
  return cell;
 };
 // Approach the fountain along all four open axes, then the castle entrance.
 for(const [x,y] of [[750,605],[620,490],[750,397],[880,490]])await move(x,y);
 await move(802,485);
 await expect.poll(()=>page.evaluate(()=>Math.min(...(window as any).gardenTest.scene.children.list.filter((o:any)=>o.name.startsWith('flowerbed-fountain-ne-')).map((o:any)=>o.alpha)))).toBe(1);
 await page.screenshot({path:out+'/player-in-front-opaque.png'});
 const stopped=await move(740,260);
 const blocked={x:Math.floor(660/1448*240),y:Math.floor(246/1086*206)};
 expect(await page.evaluate(c=>(window as any).gardenTest.walkable(c),blocked)).toBe(false);
 await page.evaluate(c=>(window as any).gardenTest.scene.network.room.send('move',c),blocked);await page.waitForTimeout(400);
 expect(await page.evaluate(()=>{const s=(window as any).gardenTest.scene,p=s.network.players.get(s.network.room.sessionId);return {x:Math.floor(p.x/64),y:Math.floor(p.y/56)};})).toEqual(stopped);
 await page.screenshot({path:out+'/castle-approach-player.png'});
 expect(await page.locator('.minimap-image img').getAttribute('src')).toBe(mini);
 await page.locator('#logout').click();await page.locator('#guest').click();await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
 expect(await state()).toEqual(initial);expect(errors).toEqual([]);
 await fs.writeFile(out+'/validation.json',JSON.stringify({initial,visibility,stopped,blocked,errors},null,2));await page.locator('#logout').click();
});
