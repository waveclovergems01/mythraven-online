import { test, expect } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';

test('raised city ground matches server feet and remains reachable across the shoulder', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('renderer.render(scene, camera);', `
      window.plateauProbe={move:(x,z)=>network.move(x,z),info:()=>{
        const p=network.players.get(network.room?.sessionId);
        const mesh=p?views.get(network.room.sessionId)?.mesh:undefined;
        const cast=new THREE.Raycaster(new THREE.Vector3(focus.x,30,focus.z),new THREE.Vector3(0,-1,0));
        return {player:p,visual:mesh?.position.toArray(),surface:cast.intersectObject(ground,false)[0]?.point.y};
      }};
      renderer.render(scene, camera);`);
    await route.fulfill({ response, body });
  });
  await page.setViewportSize({ width: 1440, height: 960 }); await page.goto('/'); await page.locator('#guest').click();
  await chooseCharacter(page, 'warrior-male-01');
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await expect(page.locator('.world-player-name')).toHaveCount(1);
  const info = () => page.evaluate(() => (window as any).plateauProbe.info());
  const spawn = (await info()).player;
  await page.mouse.move(1000, 650); await page.mouse.down({ button: 'right' });
  await page.mouse.move(1000, 505, { steps: 12 }); await page.mouse.up({ button: 'right' });
  await page.screenshot({ path: 'test-results/terrain-plateau/raised-city-low-angle.png' });
  await page.evaluate(() => (window as any).plateauProbe.move(0, 70));
  await expect.poll(async () => (await info()).player.moving).toBe(true);
  await expect.poll(async () => (await info()).player.moving, { timeout: 20000 }).toBe(false);
  const top = await info();
  expect(top.player.x).toBeCloseTo(0, 3); expect(top.player.z).toBeCloseTo(70, 3);
  expect(top.player.y).toBeCloseTo(4.9, 5);
  expect(top.visual[1]).toBeCloseTo(top.surface, 5); expect(top.player.y).toBeCloseTo(top.surface, 5);
  await page.screenshot({ path: 'test-results/terrain-plateau/on-level-foundation.png' });
  await page.evaluate(({ x, z }) => (window as any).plateauProbe.move(x, z), spawn);
  await expect.poll(async () => (await info()).player.moving).toBe(true);
  await expect.poll(async () => (await info()).player.moving, { timeout: 20000 }).toBe(false);
  const back = await info(); expect(back.player.y).toBeCloseTo(spawn.y, 5);
  expect(back.visual[1]).toBeCloseTo(back.surface, 5); expect(errors).toEqual([]);
});
