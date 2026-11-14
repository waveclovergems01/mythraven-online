import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings } from './helpers/game-settings';
import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';

test('speed slider updates authoritative walking and reconnects without moving through the HUD', async ({ page }) => {
  const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+
      '\nconst mountSpeedTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const world=await mountSpeedTest(...args);window.speedWorld=world;return world;};'});
  });
  await page.setViewportSize({width:1440,height:960}); await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  const slider=page.locator('#walk-speed'); await expect(slider).toBeEnabled(); await expect(slider).toHaveValue('5');
  const snapshot=()=>page.evaluate(()=>(window as any).speedWorld.inspect());
  await expect.poll(async()=>(await snapshot()).id).toBeTruthy();
  const initial=await snapshot();
  const observer=await new Client('ws://127.0.0.1:'+(process.env.GAME_PORT||'5275')).joinOrCreate('mythraven-world', { characterId: 'novice-male-01' });
  observer.reconnection.enabled=false;
  try {
    await openSettings(page); await slider.focus(); await slider.press('End'); await expect(slider).toHaveValue('10');
    await expect(page.locator('.terrain-speed output')).toHaveText('10/10 · 5×');
    await expect.poll(()=>observer.state.players.get(initial.id)?.speedLevel).toBe(10);
    expect((await snapshot()).player).toEqual(initial.player);
    await closeSettings(page); await page.mouse.click(1000,450);
    await expect.poll(async()=>(await snapshot()).moving).toBe(true);
    await expect.poll(async()=>(await snapshot()).moving,{timeout:4000}).toBe(false);
    expect((await snapshot()).player.x).toBeGreaterThan(initial.player.x+5);
    await page.screenshot({path:'test-results/terrain-speed/desktop.png'});
    await page.setViewportSize({width:320,height:844}); await page.waitForTimeout(100);
    const box=(await page.locator('#network-status').boundingBox())!, map=(await page.locator('.terrain-minimap').boundingBox())!;
    expect(box.x+box.width).toBeLessThanOrEqual(map.x);
    await page.screenshot({path:'test-results/terrain-speed/mobile.png'});
    await page.context().setOffline(true); await expect(slider).toBeDisabled({timeout:15000});
    await page.context().setOffline(false); await page.locator('#network-status button').click(); await expect(slider).toBeEnabled();
    const current=await snapshot();
    await expect.poll(()=>observer.state.players.get(current.id)?.speedLevel).toBe(10);
    await openSettings(page); await slider.focus(); await slider.press('Home'); await expect(slider).toHaveValue('1');
    await expect.poll(()=>observer.state.players.get(current.id)?.speedLevel).toBe(1);
    await page.locator('#logout').click(); await expect(slider).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { await observer.leave(); }
});
