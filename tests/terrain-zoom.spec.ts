import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { openSettings, closeSettings } from './helpers/game-settings';

test('settings zoom preserves walking, follows resize and scales the minimap footprint', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst mountZoomTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountZoomTest(...args);window.zoomWorld=w;return w;};' });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled();
  const state = () => page.evaluate(() => (window as any).zoomWorld.inspect());
  await expect.poll(async () => (await state()).renderedPlayers).toBeGreaterThan(0);
  const slider = page.locator('#camera-zoom');
  const footprint = () => page.locator('.minimap-camera').getAttribute('width').then(Number);
  const original = await state(); await expect(slider).toHaveValue('100');
  await expect.poll(footprint).toBeGreaterThan(0); const originalWidth = await footprint();
  for (const [key, zoom] of [['Home', .5], ['End', 2]] as const) {
    await openSettings(page); await slider.focus(); await slider.press(key);
    await expect(page.locator('.terrain-zoom output')).toHaveText(`${zoom * 100}%`);
    await expect.poll(async () => (await state()).zoom).toBe(zoom);
    await expect.poll(footprint).toBeCloseTo(originalWidth / zoom, 3);
    expect((await state()).rotation).toEqual(original.rotation);
    expect((await state()).moving).toBe(false);
    await closeSettings(page);
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
  await openSettings(page); await expect(slider).toHaveValue('200');
  expect((await state()).zoom).toBe(2);
  const panel = (await page.locator('#settings-dialog').boundingBox())!;
  const logout = (await page.locator('#logout').boundingBox())!;
  expect(panel.y).toBeGreaterThanOrEqual(16); expect(panel.y + panel.height).toBeLessThanOrEqual(828);
  expect(logout.y).toBeGreaterThan((await slider.boundingBox())!.y);
  await page.locator('.settings-reset').click(); await expect(slider).toHaveValue('100');
  expect((await state()).zoom).toBe(1);
  await page.screenshot({ path: 'test-results/terrain-zoom/settings-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await expect.poll(footprint).toBeCloseTo(originalWidth, 3);
  await page.screenshot({ path: 'test-results/terrain-zoom/settings-desktop.png' });
  await slider.focus(); await slider.press('Home'); await page.locator('#logout').click();
  await page.locator('#guest').click(); await chooseCharacter(page); await expect(page.locator('#walk-speed')).toBeEnabled();
  await expect(slider).toHaveCount(1); await expect(slider).toHaveValue('100');
  expect(errors).toEqual([]);
});
