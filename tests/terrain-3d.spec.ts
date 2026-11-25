import { chooseCharacter, selectAppearance } from './helpers/character-selection';
import { openSettings, closeSettings } from './helpers/game-settings';
import { test, expect } from '@playwright/test';

test('novice appears at login, walks on left click and follows with a resettable orbit camera', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /THREE|WebGL|shader/i.test(message.text())) errors.push(message.text()); });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() +
      '\nconst originalMountForTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const world=await originalMountForTest(...args);window.terrainTest=world;return world;};' });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.selectOption('#language', 'en'); await page.locator('#guest').click(); await chooseCharacter(page);
  const canvas = page.locator('#game canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await page.waitForFunction(() => (window as any).terrainTest?.inspect);
  await page.waitForFunction(() => (window as any).terrainTest.inspect().renderedPlayers > 0);
  const inspect = () => page.evaluate(() => (window as any).terrainTest.inspect());
  const start = await inspect();
  expect(start.player.y).toBeGreaterThan(2);
  expect(start.screen[0]).toBeCloseTo(720, 0);
  expect(start.screen[1]).toBeGreaterThan(460);
  await expect(page.locator('.terrain-toolbar')).toHaveCount(0);
  await expect(page.locator('.game-footer')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/terrain-3d/player-spawn.png' });

  await page.mouse.click(start.screen[0] + 190, start.screen[1] + 45);
  await expect.poll(async () => (await inspect()).moving).toBe(true);
  const target = (await inspect()).destination;
  await expect.poll(async () => (await inspect()).moving, { timeout: 10000 }).toBe(false);
  const arrived = await inspect();
  expect(arrived.player.x).toBeCloseTo(target.x, 3);
  expect(arrived.player.z).toBeCloseTo(target.z, 3);
  expect(arrived.player.x).toBeGreaterThan(start.player.x + 5);
  expect(arrived.screen[0]).toBeCloseTo(start.screen[0], 3);
  expect(arrived.screen[1]).toBeCloseTo(start.screen[1], 3);
  arrived.rotation.forEach((value: number, i: number) => expect(value).toBeCloseTo(start.rotation[i], 7));
  expect(arrived.camera[0] - start.camera[0]).toBeCloseTo(arrived.player.x - start.player.x, 5);
  await page.screenshot({ path: 'test-results/terrain-3d/player-walk.png' });

  // Right drag orbits without issuing movement. Reset restores the walking view.
  await page.mouse.click(900, 420, { button: 'right' });
  for (const button of ['right'] as const) {
    await page.mouse.move(650, 500); await page.mouse.down({ button });
    await page.mouse.move(900, 650, { steps: 10 }); await page.mouse.up({ button });
  }
  await page.mouse.wheel(0, -500); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250);
  const orbited = await inspect();
  expect(orbited.player).toEqual(arrived.player); expect(orbited.moving).toBe(false);
  expect(orbited.orbit.yaw).not.toBe(arrived.orbit.yaw);
  expect(orbited.orbit.clearance).toBeGreaterThanOrEqual(2);
  await openSettings(page); await page.locator('#reset-camera').click(); await closeSettings(page);

  // A fresh click replaces a route that is still in progress.
  await page.mouse.click(1000, 500); await expect.poll(async () => (await inspect()).moving).toBe(true);
  await page.mouse.click(560, 490);
  await expect.poll(async () => { const s = await inspect(); return s.destination?.x < s.player.x; }).toBe(true);
  const redirected = (await inspect()).destination;
  await expect.poll(async () => (await inspect()).moving, { timeout: 10000 }).toBe(false);
  expect((await inspect()).player.x).toBeCloseTo(redirected.x, 3);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toHaveJSProperty('clientWidth', 390);
  expect((await inspect()).screen[0]).toBeCloseTo(195, 0);
  await page.screenshot({ path: 'test-results/terrain-3d/player-mobile.png' });

  const supportsLoss = await canvas.evaluate((element: HTMLCanvasElement) => {
    const ext = element.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    (window as any).restoreTerrainContext = () => ext.restoreContext();
    ext.loseContext(); return true;
  });
  if (supportsLoss) {
    await expect(page.locator('.terrain-status')).toBeVisible(); await page.waitForTimeout(350);
    await page.evaluate(() => (window as any).restoreTerrainContext());
    await expect(page.locator('.terrain-status')).toBeHidden();
  }
  await openSettings(page); await page.locator('#logout').click(); await expect(page.locator('#guest')).toBeVisible();
  await page.selectOption('#language', 'th'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await page.waitForFunction(() => (window as any).terrainTest.inspect().renderedPlayers > 0);
  await expect(canvas).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 960 }); await page.waitForTimeout(250);
  await page.screenshot({ path: 'test-results/terrain-3d/player-th.png' });
  expect((await inspect()).player).toEqual(start.player);
  expect(errors).toEqual([]);
});

test('terrain paths avoid water and detached banks and track the mesh height', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const dataPath = '/src/terrain/terrain-data.ts', movementPath = '/src/terrain/terrain-movement.ts';
    const { loadTerrainData, layoutToWorld } = await import(dataPath);
    const { TerrainMovement, terrainHeight } = await import(movementPath);
    const data = await loadTerrainData(), movement = new TerrainMovement(data);
    const rejectedWater = !movement.moveTo(layoutToWorld(95, 490));
    const rejectedMainland = !movement.moveTo(layoutToWorld(30, 40));
    const rejectedOutside = !movement.moveTo({ x: 999, z: 0 });
    // Find a pair of reachable city cells separated by a real shoreline indentation.
    let pair: any;
    for (let z = -160; z <= 160 && !pair; z += 5) for (let x = -220; x <= 200 && !pair; x += 5) {
      const a = { x, z }, b = { x: x + 35, z };
      if (movement.canStand(a) && movement.canStand(b)
        && Array.from({ length: 34 }, (_, i) => ({ x: x + i + 1, z })).some(p => !movement.canStand(p))) pair = [a, b];
    }
    let safe = true, finite = true;
    const walk = (target: any) => {
      if (!movement.moveTo(target)) return false;
      for (let i = 0; i < 10000 && movement.moving; i++) {
        movement.update(.05);
        safe &&= movement.canStand(movement.position) && movement.height > 1;
        finite &&= Number.isFinite(movement.height);
      }
      return !movement.moving && Math.hypot(movement.position.x - target.x, movement.position.z - target.z) < .001;
    };
    const detour = pair && walk(pair[0]) && walk(pair[1]);
    return { rejectedWater, rejectedMainland, rejectedOutside, detour: !!detour, safe, finite,
      height: movement.height, sampled: terrainHeight(data, movement.position.x, movement.position.z) };
  });
  expect(results).toMatchObject({ rejectedWater: true, rejectedMainland: true, rejectedOutside: true, detour: true, safe: true, finite: true });
  expect(results.height).toBe(results.sampled);
});

test('logout while terrain data loads does not mount a stale renderer', async ({ page }) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/maps/mythraven-land.png', async route => { await pending; await route.continue(); });
  await page.goto('/'); await page.locator('#guest').click();
  await selectAppearance(page, 'novice-male-01');
  const shoreline = page.waitForRequest('**/assets/maps/mythraven-land.png');
  await page.locator('#enter-city').click();
  await shoreline;
  // The loading screen covers the settings controls. Exercise the logout handler directly.
  await page.locator('#logout').evaluate((button: HTMLButtonElement) => button.click());
  release!();
  await expect(page.locator('#guest')).toBeVisible(); await page.waitForTimeout(500);
  await expect(page.locator('canvas')).toHaveCount(0);
});

