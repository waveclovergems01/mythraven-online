import { test, expect } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings, setWheelZoom } from './helpers/game-settings';

test('owner groves share anchored instances with crown wind, shadows, fades and clean reentry', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /THREE|shader|WebGL|GL_INVALID/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (/tree-(oak-green|pine-green|coconut-palm)\.glb/.test(r.url())) requests.push(r.url()); });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('renderer.render(scene, camera);', `
      window.groveProbe={go:(x,z)=>network.move(x,z),behindTree:()=>{
        const tree=groves.inspect().placements.find(t=>t.region==='city-ring'&&t.model===0&&t.z>65&&Math.abs(t.x)<100&&navigation.canStand({x:t.x,z:t.z-8}));
        return tree?{x:tree.x,z:tree.z-8}:undefined;
      },info:()=>({
        ...groves.inspect(), position:focus.toArray(), moving:network.players.get(network.room?.sessionId)?.moving,
        staticMatrices:groves.group.children.map(m=>Array.from(m.instanceMatrix.array)),
        pbr:groves.group.children.every(m=>m.material.map&&m.material.normalMap&&m.material.roughnessMap&&!m.material.emissiveMap),oldOak:!!scene.getObjectByName("riverside-oak"),shadows:groves.group.children.every(m=>m.castShadow&&m.receiveShadow),
        windShadows:groves.group.children.every(m=>!!m.customDepthMaterial),
        geometries:new Set(groves.group.children.map(m=>m.geometry)).size,
        materials:new Set(groves.group.children.map(m=>m.material)).size,
        calls:renderer.info.render.calls,triangles:renderer.info.render.triangles
      })};renderer.render(scene, camera);`);
    await route.fulfill({ response, body });
  });
  await page.setViewportSize({ width: 1440, height: 960 }); await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true'); await expect(page.locator('.world-player-name')).toHaveCount(1);
  const state = () => page.evaluate(() => (window as any).groveProbe.info());
  const initial = await state(); expect(initial.count).toBe(650); expect(initial.geometries).toBe(3); expect(initial.materials).toBe(3); expect(initial.shadows).toBe(true); expect(initial.pbr).toBe(true); expect(initial.oldOak).toBe(false);
  expect(initial.windShadows).toBe(true);
  await expect.poll(async()=>(await state()).windTime).toBeGreaterThan(initial.windTime+.2);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(async()=>(await state()).windTime).toBe(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  expect(requests.length).toBe(3); await expect(page.locator('.terrain-minimap-groves circle')).toHaveCount(650);
  await page.screenshot({ path: 'test-results/terrain-groves/default.png' });
  await setWheelZoom(page,50);
  await page.screenshot({ path: 'test-results/terrain-groves/wide.png' });
  await page.mouse.move(1000, 650); await page.mouse.down({ button: 'right' }); await page.mouse.move(750, 510, { steps: 12 }); await page.mouse.up({ button: 'right' });
  await page.screenshot({ path: 'test-results/terrain-groves/low-orbit.png' });
  await page.evaluate(() => (window as any).groveProbe.go(0,70));
  await expect.poll(async () => (await state()).moving).toBe(true);
  await expect.poll(async () => (await state()).moving, { timeout: 20000 }).toBe(false);
  expect((await state()).position[2]).toBeCloseTo(70, 3);
  await openSettings(page); await page.locator('#reset-camera').click(); await closeSettings(page); await setWheelZoom(page,100);
  await page.screenshot({ path: 'test-results/terrain-groves/inside-ring.png' });
  const behindTree = await page.evaluate(() => (window as any).groveProbe.behindTree()); expect(behindTree).toBeTruthy();
  await page.evaluate(p => (window as any).groveProbe.go(p.x,p.z), behindTree);
  await expect.poll(async () => (await state()).moving).toBe(true);
  await expect.poll(async () => (await state()).moving, { timeout: 20000 }).toBe(false);
  await page.screenshot({ path: 'test-results/terrain-groves/behind-owner-oak.png' });
  await openSettings(page); await page.locator('[data-hour="22"]').click(); await closeSettings(page);
  await page.screenshot({ path: 'test-results/terrain-groves/night.png' });
  expect((await state()).staticMatrices).toEqual(initial.staticMatrices);
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'test-results/terrain-groves/mobile.png' });
  await openSettings(page); await page.locator('#logout').click(); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  expect((await state()).placements).toEqual(initial.placements);
  await expect(page.locator('.terrain-minimap-groves circle')).toHaveCount(650); await expect(page.locator('#game canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});
