import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings } from './helpers/game-settings';
import { test, expect } from '@playwright/test';

test('one painted 3D oak loads, fades behind the player and restores on reentry',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+'\nconst mountTreeTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountTreeTest(...args);window.treeWorld=w;return w;};'});
  });
  await page.route('**/src/network/terrain-client.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+'\nconst connectTreeTest=TerrainClient.prototype.connect;TerrainClient.prototype.connect=async function(...args){window.treeNetwork=this;return connectTreeTest.apply(this,args);};'});
  });
  await page.setViewportSize({width:1440,height:960});await page.goto('/');await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled();await page.waitForTimeout(150);
  const state=()=>page.evaluate(()=>(window as any).treeWorld.inspect());
  expect((await state()).tree.triangles).toBeGreaterThan(10000);
  expect((await state()).tree.opacity).toBe(1);
  await expect(page.locator('.terrain-minimap-tree')).toHaveCount(1);
  await page.screenshot({path:'test-results/terrain-tree/oak-in-city.png'});
  await page.evaluate(()=>(window as any).treeNetwork.move(-6,123));
  await expect.poll(async()=>(await state()).moving).toBe(true);
  await expect.poll(async()=>(await state()).moving).toBe(false);
  await expect.poll(async()=>(await state()).tree.opacity).toBeLessThan(.15);
  await page.screenshot({path:'test-results/terrain-tree/behind-canopy.png'});
  await page.evaluate(()=>(window as any).treeNetwork.move(6,123));
  await expect.poll(async()=>(await state()).moving).toBe(true);
  await expect.poll(async()=>(await state()).moving).toBe(false);
  await expect.poll(async()=>(await state()).tree.opacity).toBe(1);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
  await page.screenshot({path:'test-results/terrain-tree/mobile.png'});
  await openSettings(page); await page.locator('#logout').click();await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled();
  await expect(page.locator('#game canvas')).toHaveCount(1);
  expect((await state()).tree.triangles).toBe(16800);expect(errors).toEqual([]);
});
