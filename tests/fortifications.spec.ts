import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {GATES} from '../shared/fortifications.mjs';

test('all three fortified bridges support server-authoritative return trips and reject parapets',async({browser})=>{
 test.setTimeout(120000);const out='test-results/fortifications';await fs.mkdir(out,{recursive:true});
 await Promise.all(GATES.map(async gate=>{
  const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/scenes/WorldScene.ts*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:await response.text()+
    '\nimport {walkable as testWalkable,cellAt as testCellAt} from "/shared/town-grid.mjs";import {CITY_DEFENSES as testDefenses} from "/src/world/fortifications.ts";const fortCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){fortCreate.apply(this,args);window.fortTest={scene:this,walkable:testWalkable,cellAt:testCellAt,layout:testDefenses};};'});
  });
  await page.goto('/');await page.locator('#guest').click();
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:30000});
  await page.waitForFunction(()=>{const s=(window as any).fortTest?.scene;return s?.views.has(s.network.room?.sessionId);});
  // Adding a cap frame changes Phaser's default frame; ordinary wall/rail
  // pieces must explicitly keep the full repeat texture, not stretch the cap.
  expect(await page.evaluate(()=>(window as any).fortTest.scene.children.list
   .filter((o:any)=>o.texture?.key==='city-wall-horizontal'&&!o.name.startsWith('city-wall-cap-'))
   .every((o:any)=>o.frame.name==='__BASE'))).toBe(true);
  const cell=([x,y]:number[])=>({x:Math.floor(x/1448*240),y:Math.floor(y/1086*206)});
  const move=async(destination:number[])=>{
   const c=cell(destination);await page.evaluate(c=>(window as any).fortTest.scene.network.move(c.x,c.y),c);
   await expect.poll(()=>page.evaluate(c=>{const s=(window as any).fortTest.scene,p=s.network.players.get(s.network.room.sessionId);return Math.hypot(p.x-(c.x+.5)*64,p.y-(c.y+.5)*56);},c),{timeout:40000}).toBeLessThan(1);
  };
  // Spawn -> inner road -> opposite bank -> return through the gate, all on server.
  await move(gate.inside);await move(gate.outside);
  await page.screenshot({path:`${out}/${gate.id}-outside.png`});
  await move([(gate.bridge[0]+gate.bridge[2])/2,(gate.bridge[1]+gate.bridge[3])/2]);
  const bridgeState=await page.evaluate(id=>{
   const t=(window as any).fortTest,s=t.scene,p=s.network.players.get(s.network.room.sessionId),deck=s.children.getByName(`bridge-deck-${id}`);
   const bridge=t.layout.bridges.find((b:any)=>b.id===id);
   const rail=t.layout.rails.find((r:any)=>r.axis===bridge.axis&&r.left>=bridge.left-20&&r.right<=bridge.right+20&&r.top>=bridge.top-20&&r.bottom<=bridge.bottom+20);
   const blocked=t.cellAt((rail.left+rail.right)/2,(rail.top+rail.bottom)/2);
   return {position:{x:p.x,y:p.y},blocked,allowed:t.walkable(blocked),deckDepth:deck.depth,playerDepth:s.views.get(s.network.room.sessionId).container.depth};
  },gate.id);
  expect(bridgeState.allowed).toBe(false);expect(bridgeState.playerDepth).toBeGreaterThan(bridgeState.deckDepth);
  await page.evaluate(c=>(window as any).fortTest.scene.network.room.send('move',c),bridgeState.blocked);
  await page.waitForTimeout(350);
  expect(await page.evaluate(()=>{const s=(window as any).fortTest.scene,p=s.network.players.get(s.network.room.sessionId);return {x:p.x,y:p.y};})).toEqual(bridgeState.position);
  await move([gate.x,gate.y]);
  if(gate.axis==='x')await expect.poll(()=>page.evaluate(()=>(window as any).fortTest.scene.children.list.some((o:any)=>o.name.startsWith('city-gate-')&&o.alpha<.7))).toBe(true);
  await page.evaluate(g=>{const s=(window as any).fortTest.scene;s.cameras.main.stopFollow().centerOn(g.x/1448*15360,g.y/1086*11536-300);},gate);
  await page.waitForTimeout(300);await page.screenshot({path:`${out}/${gate.id}-gate.png`});
  await move(gate.inside);
  const image=await page.locator('.minimap-image img').getAttribute('src');
  if(gate.id==='south')await fs.writeFile(out+'/city-overview.png',Buffer.from(image!.split(',')[1],'base64'));
  await fs.writeFile(`${out}/${gate.id}-validation.json`,JSON.stringify({gate,bridgeState,errors},null,2));
  expect(errors).toEqual([]);
  await page.locator('#logout').click();await context.close();
 }));
});
