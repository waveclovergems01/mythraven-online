import {test,expect,type Page} from '@playwright/test';
async function enter(page:Page){
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nconst oldCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){oldCreate.apply(this,args);window.testScene=this;};'});});
 await page.goto('/');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:20000});
 await page.waitForFunction(()=>!!(window as any).testScene?.network.room?.sessionId);
}
const snapshot=(page:Page)=>page.evaluate(()=>{const n=(window as any).testScene.network;return {id:n.room.sessionId,room:n.room.roomId,players:Object.fromEntries(n.players)};});
test('two same-browser guests share authoritative movement, resize and leave',async({page,context})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1280,height:720});await enter(page);
 const other=await context.newPage();other.on('pageerror',e=>errors.push(e.message));await other.setViewportSize({width:1920,height:960});await enter(other);
 await expect.poll(async()=>Object.keys((await snapshot(page)).players).length).toBe(2);
 const a=await snapshot(page),b=await snapshot(other);expect(a.id).not.toBe(b.id);expect(a.room).toBe(b.room);
 const storageA=await page.evaluate(()=>sessionStorage.getItem('mr.demo.session.v1'));
 const storageB=await other.evaluate(()=>sessionStorage.getItem('mr.demo.session.v1'));expect(storageA).not.toBe(storageB);
 for (const tab of [page,other]) {
  await expect(tab.locator('.minimap-player')).toHaveCount(2);
  await expect(tab.locator('.minimap-player[data-mine="true"]')).toHaveAttribute('fill','#ffe18a');
  await expect(tab.locator('.minimap-player[data-mine="false"]')).toHaveAttribute('fill','#b8bec5');
 }
 const remoteDot=other.locator(`.minimap-player[data-player-id="${a.id}"]`);
 const dotStart=Number(await remoteDot.getAttribute('cx'));
 const own=a.players[a.id];
 await page.bringToFront();await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');
 await expect.poll(async()=>(await snapshot(other)).players[a.id].x).toBeGreaterThan(own.x+150);
 await expect.poll(async()=>{const left=(await snapshot(page)).players[a.id],right=(await snapshot(other)).players[a.id];return Math.abs(left.x-right.x)+Math.abs(left.y-right.y);}).toBeLessThan(1);
 await expect.poll(async()=>Number(await remoteDot.getAttribute('cx'))).toBeGreaterThan(dotStart+150);
 const beforeB=(await snapshot(other)).players[b.id];await other.bringToFront();await other.keyboard.down('s');await other.waitForTimeout(500);await other.keyboard.up('s');
 await expect.poll(async()=>(await snapshot(page)).players[b.id].y).toBeGreaterThan(beforeB.y+80);
 // Click-to-walk uses the server pathfinder.
 await other.evaluate(()=>{const s=(window as any).testScene,p=s.network.players.get(s.network.room.sessionId);s.network.move(Math.floor(p.x/64)+2,Math.floor(p.y/56));});
 await expect.poll(async()=>(await snapshot(other)).players[b.id].x).toBeGreaterThan(beforeB.x+80);
 // An actual diagonal click must change both axes immediately and sync to the other guest.
 await other.waitForTimeout(700);
 const diagonal=await other.evaluate(()=>{
  const s=(window as any).testScene,p=s.network.players.get(s.network.room.sessionId),c=s.cameras.main;
  const target={x:Math.floor(p.x/64)+4,y:Math.floor(p.y/56)+4};
  return {start:{x:p.x,y:p.y},target,screen:{x:c.width/2+((target.x+.5)*64-c.midPoint.x)*c.zoom,y:c.height/2+((target.y+.5)*56-c.midPoint.y)*c.zoom}};
 });
 await other.mouse.click(diagonal.screen.x,diagonal.screen.y);
 await expect.poll(async()=>{const p=(await snapshot(other)).players[b.id];return p.x>diagonal.start.x+40&&p.y>diagonal.start.y+35;},{timeout:1800}).toBe(true);
 await expect.poll(async()=>{const p=(await snapshot(page)).players[b.id];return Math.hypot(p.x-(diagonal.target.x+.5)*64,p.y-(diagonal.target.y+.5)*56);}).toBeLessThan(1);
 // Two keys also produce diagonal motion, at the server's normal world speed.
 const keysStart=(await snapshot(other)).players[b.id];
 await other.keyboard.down('s');await other.keyboard.down('d');await other.waitForTimeout(500);await other.keyboard.up('s');await other.keyboard.up('d');
 await expect.poll(async()=>{const p=(await snapshot(page)).players[b.id];return p.x>keysStart.x+60&&p.y>keysStart.y+50;}).toBe(true);
 // Reject out-of-map and fountain-cell destinations, including malicious payloads.
 await page.waitForTimeout(700);const stable=(await snapshot(page)).players[a.id];
 await page.evaluate(()=>{const n=(window as any).testScene.network;n.room.send('move',{x:-100,y:0});});
 await page.waitForTimeout(100);await page.evaluate(()=>(window as any).testScene.network.room.send('move',{x:60,y:50}));
 await page.waitForTimeout(400);expect((await snapshot(page)).players[a.id].x).toBeCloseTo(stable.x,1);
 const mapA=await page.evaluate(()=>{const b=(window as any).testScene.cameras.main.getBounds();return [b.width,b.height];});
 await page.setViewportSize({width:1920,height:960});await page.waitForTimeout(400);
 expect((await snapshot(page)).id).toBe(a.id);
 expect(await page.evaluate(()=>{const b=(window as any).testScene.cameras.main.getBounds();return [b.width,b.height];})).toEqual(mapA);
 await expect(page.locator('.minimap-stats')).toContainText('50%');
 await page.bringToFront();await page.screenshot({path:'test-results/multiplayer-player-one.png'});
 await other.bringToFront();await other.screenshot({path:'test-results/multiplayer-player-two.png'});
 await other.locator('#logout').click();await expect.poll(async()=>Object.keys((await snapshot(page)).players).length).toBe(1);
 await expect(page.locator('.minimap-player')).toHaveCount(1);
 await expect(page.locator('.minimap-player[data-mine="true"]')).toHaveCount(1);
 await expect(other.locator('#guest')).toBeVisible();expect(await page.locator('#network-status').count()).toBe(1);
 expect(errors).toEqual([]);await other.close();
});
