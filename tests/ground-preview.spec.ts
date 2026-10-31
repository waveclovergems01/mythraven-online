import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('capital uses fixed 4x6 camera extent, streamed detailed ground and matching collision',async({page})=>{
 test.setTimeout(90000);const out='test-results/capital-map';await fs.mkdir(out,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nconst originalPreviewCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(data){originalPreviewCreate.call(this,data);window.previewScene=this;};'});
 });
 await page.setViewportSize({width:1920,height:960});await page.goto('/');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:30000});
 await page.waitForFunction(()=>{const s=(window as any).previewScene;return s?.views.has(s.network.room?.sessionId)&&s.textures.getTextureKeys().filter((k:string)=>k.startsWith('town-ground-')).length>6;});
 const measure=()=>page.evaluate(()=>{
  const s=(window as any).previewScene,c=s.cameras.main,b=c.getBounds(),p=s.network.players.get(s.network.room.sessionId);
  return {map:[b.width,b.height],camera:[c.width/c.zoom,c.height/c.zoom],visible:[c.width/c.zoom/b.width,c.height/c.zoom/b.height],chunks:s.textures.getTextureKeys().filter((k:string)=>k.startsWith('town-ground-')).length,player:{x:p.x,y:p.y}};
 });
 const start=await measure();expect(start.map).toEqual([15360,11536]);expect(start.visible[0]).toBe(.25);expect(start.visible[1]).toBeCloseTo(1/6,3);expect(start.chunks).toBeLessThan(40);
 await page.screenshot({path:out+'/spawn.png'});
 await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');
 await expect.poll(async()=>(await measure()).player.x).toBeGreaterThan(start.player.x+150);
 await page.waitForTimeout(500);
 // Actual click-to-walk on nearby terrain.
 const target=await page.evaluate(()=>{
  const s=(window as any).previewScene,c=s.cameras.main,p=s.network.players.get(s.network.room.sessionId);
  const wx=(Math.floor(p.x/64)+2.5)*64,wy=(Math.floor(p.y/56)+2.5)*56;
  return {wx,wy,x:c.width/2+(wx-c.midPoint.x)*c.zoom,y:c.height/2+(wy-c.midPoint.y)*c.zoom};
 });
 await page.mouse.click(target.x,target.y);
 await expect.poll(async()=>{const p=(await measure()).player;return Math.hypot(p.x-target.wx,p.y-target.wy);}).toBeLessThan(1);
 // Reject a non-bridge water destination on the real server.
 const stable=(await measure()).player;
 await page.evaluate(()=>(window as any).previewScene.network.room.send('move',{x:120,y:8}));
 await page.waitForTimeout(350);expect((await measure()).player).toEqual(stable);
 const shots=[['plaza',.518,.457],['grass-road',.43,.56],['west-river',.105,.45],['north-court',.515,.16],['south-river',.51,.87],['east-river',.9,.48]] as const;
 for(const [name,x,y] of shots){
  await page.evaluate(([x,y])=>{const s=(window as any).previewScene,c=s.cameras.main,b=c.getBounds();c.stopFollow().centerOn(b.width*x,b.height*y);},[x,y]);
  await page.waitForTimeout(250);expect((await measure()).chunks).toBeLessThan(40);
  await page.screenshot({path:`${out}/${name}.png`});
 }
 const ground=await page.locator('.minimap-image img').getAttribute('src');
 await fs.writeFile(out+'/overview.png',Buffer.from(ground!.split(',')[1],'base64'));
 await page.setViewportSize({width:1056,height:960});await page.waitForTimeout(300);expect((await measure()).map).toEqual(start.map);
 await page.setViewportSize({width:1920,height:960});await page.waitForTimeout(300);expect((await measure()).visible).toEqual(start.visible);
 await fs.writeFile(out+'/measurements.json',JSON.stringify({start,end:await measure()},null,2));
 await page.locator('#logout').click();await expect(page.locator('#guest')).toBeVisible();
 await page.locator('#guest').click();await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
 expect((await measure()).map).toEqual(start.map);expect((await measure()).chunks).toBeLessThan(40);
 expect(errors).toEqual([]);
});
