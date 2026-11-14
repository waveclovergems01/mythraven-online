import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { openSettings, closeSettings } from './helpers/game-settings';

test('gear settings isolate input, start at level five and keep minimap badges inside the map', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst mountSettingsTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountSettingsTest(...args);window.settingsWorld=w;return w;};' });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  const slider = page.locator('#walk-speed'), dialog = page.locator('#settings-dialog');
  await expect(slider).toBeEnabled(); await expect(slider).toHaveValue('5');
  await expect(slider).toBeHidden(); await expect(page.locator('#logout')).toBeHidden();
  const state = () => page.evaluate(() => (window as any).settingsWorld.inspect());
  await expect.poll(async () => (await state()).players[(await state()).id]?.speedLevel).toBe(5);
  await expect(page.locator('.terrain-minimap-legend')).toHaveCount(0);
  await expect(page.locator('.terrain-minimap-compass text')).toHaveText(['N', 'S', 'E', 'W']);
  await page.screenshot({ path: 'test-results/terrain-settings/hud.png' });
  await page.mouse.click(1000, 450);
  await expect.poll(async () => (await state()).moving).toBe(true);
  await openSettings(page); await expect(dialog).toBeVisible();
  await expect.poll(async () => (await state()).moving).toBe(false);
  await expect.poll(async () => (await state()).players[(await state()).id]?.moving).toBe(false);
  // The rendered focus updates on the frame after the authoritative stop snapshot.
  await expect.poll(async () => { const s = await state(); return Math.hypot(s.player.x - s.players[s.id].x, s.player.z - s.players[s.id].z); }).toBeLessThan(.001);
  const stopped = (await state()).player;
  await slider.focus(); await slider.press('End');
  await expect.poll(async () => (await state()).players[(await state()).id]?.speedLevel).toBe(10);
  expect((await state()).player).toEqual(stopped);
  await page.screenshot({ path: 'test-results/terrain-settings/panel-desktop.png' });
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  await expect(page.locator('#settings-toggle')).toBeFocused();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const map = (await page.locator('.terrain-minimap > svg').boundingBox())!;
    for (const selector of ['.terrain-minimap-city', '.terrain-minimap-compass']) {
      const badge = (await page.locator(selector).boundingBox())!;
      expect(badge.x).toBeGreaterThanOrEqual(map.x); expect(badge.y).toBeGreaterThanOrEqual(map.y);
      expect(badge.x + badge.width).toBeLessThanOrEqual(map.x + map.width);
      expect(badge.y + badge.height).toBeLessThanOrEqual(map.y + map.height);
    }
    await openSettings(page);
    const panel = (await dialog.boundingBox())!, logout = (await page.locator('#logout').boundingBox())!;
    const control = (await slider.boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(16); expect(panel.x + panel.width).toBeLessThanOrEqual(width - 16);
    expect(logout.y).toBeGreaterThan(control.y + control.height);
    await page.screenshot({ path: `test-results/terrain-settings/panel-${width}.png` });
    await closeSettings(page);
  }
  await openSettings(page); await page.locator('#logout').click();
  await expect(page.locator('#guest')).toBeVisible(); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(slider).toBeEnabled(); await expect(slider).toHaveValue('5');
  await expect(dialog).toBeHidden(); await expect(page.locator('#settings-toggle')).toHaveCount(1);
  expect(errors).toEqual([]);
});
