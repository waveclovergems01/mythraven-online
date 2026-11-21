import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { openSettings, closeSettings } from './helpers/game-settings';

test('wheel zoom preserves walking, follows resize and scales the minimap footprint', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst mountZoomTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountZoomTest(...args);window.zoomWorld=w;return w;};' });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled({timeout:45000});
  const state = () => page.evaluate(() => (window as any).zoomWorld.inspect());
  await expect.poll(async () => (await state()).renderedPlayers).toBeGreaterThan(0);
  const footprint = () => page.locator('.minimap-camera').evaluate(element => (element as SVGGraphicsElement).getBBox().width);
  const original = await state(); expect(original.zoom).toBe(1);
  await expect.poll(footprint).toBeGreaterThan(0); const originalWidth = await footprint();
  for (const zoom of [.5,2] as const) {
    await page.mouse.move(720,480); await page.mouse.wheel(0,zoom===2?-2000:2000);
    await expect.poll(async () => (await state()).zoom).toBe(zoom);
    // Perspective gives a trapezoid; its far edge also expands as zoom widens.
    if (zoom < 1) await expect.poll(footprint).toBeGreaterThan(originalWidth * 1.8);
    else await expect.poll(footprint).toBeLessThan(originalWidth * .6);
    expect((await state()).rotation).toEqual(original.rotation);
    expect((await state()).moving).toBe(false);
    await page.screenshot({ path: `test-results/terrain-zoom/view-${zoom * 100}.png` });
    // A raycast after changing projection must still reach the clicked dry ground.
    const before = await state(); await page.mouse.click(900, 450);
    await expect.poll(async () => (await state()).moving).toBe(true);
    const destination = (await state()).destination;
    expect(destination.x).toBeGreaterThan(before.player.x);
    await expect.poll(async () => (await state()).moving).toBe(false);
    expect((await state()).player.x).toBeCloseTo(destination.x, 2);
    expect((await state()).player.z).toBeCloseTo(destination.z, 2);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await openSettings(page); await expect(page.locator('#camera-zoom')).toHaveCount(0);
  expect((await state()).zoom).toBe(2);
  const panel = (await page.locator('#settings-dialog').boundingBox())!;
  const logout = (await page.locator('#logout').boundingBox())!;
  expect(panel.y).toBeGreaterThanOrEqual(16); expect(panel.y + panel.height).toBeLessThanOrEqual(828);
  expect(logout.y).toBeGreaterThan(panel.y);
  await page.screenshot({ path: 'test-results/terrain-zoom/settings-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await closeSettings(page);
  await page.mouse.move(720,480); await page.mouse.wheel(0,600);
  await expect.poll(async()=>(await state()).zoom).toBe(1);
  await expect.poll(footprint).toBeCloseTo(originalWidth, 3);
  await page.screenshot({ path: 'test-results/terrain-zoom/settings-desktop.png' });
  await openSettings(page); await page.locator('#logout').click();
  await page.locator('#guest').click(); await chooseCharacter(page); await expect(page.locator('#walk-speed')).toBeEnabled({timeout:45000});
  await expect.poll(async()=>(await state()).zoom).toBe(1);
  expect(errors).toEqual([]);
});
