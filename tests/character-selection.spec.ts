import { test, expect } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';
import { openSettings } from './helpers/game-settings';

test('guest chooses a model before joining; previews share assets with the city and sync to peers', async ({ page, browser }) => {
  test.setTimeout(120000);
  const errors: string[] = [], assets: string[] = [], sockets: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/\/characters\/.+\.glb/.test(r.url())) assets.push(r.url()); });
  page.on('websocket', s => { if(s.url().includes(':'+(process.env.GAME_PORT||'5275')+'/')) sockets.push(s.url()); });
  const hook = async (target: typeof page) => {
    await target.route('**/src/terrain/TerrainWorld.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text()+'\nconst mountSelectionTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountSelectionTest(...args);window.selectionWorld=w;return w;};' });
    });
  };
  await hook(page); await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click();
  await expect(page.locator('#character-title')).toBeVisible();
  await expect(page.locator('#enter-city')).toBeDisabled();
  await expect(page.locator('input[name="character"]:checked')).toHaveCount(0);
  await expect(page.locator('#game')).toHaveCount(0);
  await expect(page.locator('#character-preview')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  expect(sockets).toHaveLength(0);
  await page.locator('input[value="novice-male-02"]').check();
  await expect(page.locator('#character-preview-name')).toContainText('2');
  await page.screenshot({ path: 'test-results/character-selection/desktop.png' });
  await page.locator('[data-gender="female"]').click();
  await expect(page.locator('#character-empty')).toBeVisible();
  await expect(page.locator('#enter-city')).toBeDisabled();
  await page.locator('[data-gender="male"]').click();
  await chooseCharacter(page, 'novice-male-02');
  const state = () => page.evaluate(() => (window as any).selectionWorld?.inspect());
  await expect.poll(async () => (await state())?.renderedPlayers).toBe(1);
  const mine = (await state()).id;
  expect((await state()).players[mine].characterId).toBe('novice-male-02');
  expect((await state()).avatars[mine].hairStyle).toBe(2);
  expect(assets).toHaveLength(2); // One base + one modular hair, no second loading for city entry.
  await expect(page.locator('#character-preview')).toHaveCount(0);
  await openSettings(page); await expect(page.locator('#hair-style')).toHaveCount(0);
  await page.locator('#close-settings').click();
  const otherContext = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const other = await otherContext.newPage(); await hook(other);
  try {
    await other.goto('/'); await other.locator('#guest').click(); await chooseCharacter(other);
    await expect.poll(async () => (await state()).renderedPlayers).toBe(2);
    const peer = await other.evaluate(() => (window as any).selectionWorld.inspect());
    expect(peer.players[mine].characterId).toBe('novice-male-02'); expect(peer.avatars[mine].hairStyle).toBe(2);
    expect((await state()).avatars[peer.id].hairStyle).toBe(1);
    await page.bringToFront(); await page.context().setOffline(true);
    await expect(page.locator('#network-status')).toHaveAttribute('data-connected','false',{timeout:15000});
    await page.context().setOffline(false); await page.locator('#network-status button').click();
    await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
    const rejoined = await state(); expect(rejoined.players[rejoined.id].characterId).toBe('novice-male-02');
    await page.reload();
    await expect(page.locator('#character-title')).toBeVisible();
    await expect(page.locator('#enter-city')).toBeDisabled();
    await expect(page.locator('#game')).toHaveCount(0);
    await page.setViewportSize({width:390,height:844});
    await page.locator('input[value="novice-male-01"]').check();
    await expect(page.locator('#enter-city')).toBeEnabled({timeout:30000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'test-results/character-selection/mobile.png',fullPage:true});
    await page.locator('#character-logout').click();
    await expect(page.locator('#guest')).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await otherContext.close(); }
});

test('selection can sign out while assets load and retry a failed model download', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/assets/models/characters/m1-novice.glb',async route=>{await pending;await route.continue();});
  await page.goto('/');await page.locator('#guest').click();
  await expect(page.locator('#character-title')).toBeVisible();
  await page.locator('#character-logout').click(); release();
  await expect(page.locator('#guest')).toBeVisible();await page.waitForTimeout(500);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.unroute('**/assets/models/characters/m1-novice.glb');
  let fail=true;
  await page.route('**/assets/models/characters/m1-novice.glb',route=>fail?route.abort():route.continue());
  await page.locator('#guest').click();
  await expect(page.locator('#character-retry')).toBeVisible();
  await page.locator('input[value="novice-male-02"]').check();
  await expect(page.locator('#enter-city')).toBeDisabled();
  fail=false; await page.locator('#character-retry').click();
  await expect(page.locator('#enter-city')).toBeEnabled({timeout:30000});
  await page.locator('#enter-city').click();
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
  expect(errors).toEqual([]);
});
