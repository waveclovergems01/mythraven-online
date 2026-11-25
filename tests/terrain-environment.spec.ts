import { test, expect } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings, setWheelZoom } from './helpers/game-settings';

test('time, celestial sky and safe right-drag orbit preserve movement and recover on reset/reentry', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /THREE|WebGL|shader|GL_INVALID/.test(message.text())) errors.push(message.text()); });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace('daylight.update(camera, focus, network.serverNow);', `
      const testHour = window.environmentHour ?? 9;
      daylight.update(camera, focus, Date.parse('2026-11-24T00:00:00+07:00') + ((testHour + 18) % 24) * 450000);
    `).replace('renderer.render(scene, camera);', `
      window.environmentMoveToBank=()=>{
        let nearest;
        let distance=Infinity;
        for(let i=0;i<data.heights.length;i++){
          if(data.shoreDistance[i]<5.5||data.shoreDistance[i]>7.6)continue;
          const x=i%data.side/(data.side-1)*500-250;
          const z=Math.floor(i/data.side)/(data.side-1)*500-250;
          const metres=Math.hypot(x-focus.x,z-focus.z);
          if(metres<distance&&navigation.canStand({x,z})){nearest={x,z};distance=metres;}
        }
        if(nearest)network.move(nearest.x,nearest.z);
        return nearest;
      };
      window.environmentWalkClick=()=>{
        for (const [dx,dz] of [[12,0],[-12,0],[0,12],[0,-12],[16,12],[-16,-12]]) {
          const x=focus.x+dx,z=focus.z+dz;
          if(!navigation.canStand({x,z}))continue;
          const point=new THREE.Vector3(x,terrainHeight(data,x,z),z).project(camera);
          if(Math.abs(point.x)>.62||Math.abs(point.y)>.62)continue;
          const rect=canvas.getBoundingClientRect();
          return [rect.left+(point.x+1)*rect.width/2,rect.top+(1-point.y)*rect.height/2];
        }
      };
      window.environmentProbe=()=>{
        const end=new THREE.Vector3(...orbit.inspect().target);
        const delta=end.clone().sub(camera.position);
        const ray=new THREE.Raycaster(camera.position,delta.clone().normalize(),0,delta.length()-.1);
        const feetDelta=focus.clone().add(new THREE.Vector3(0,.15,0)).sub(camera.position);
        const feetRay=new THREE.Raycaster(camera.position,feetDelta.clone().normalize(),0,feetDelta.length()-.1);
        return {blocked:ray.intersectObject(ground,false).length>0,light:sun.position.clone().sub(sun.target.position).normalize().toArray(),
          feetBlocked:feetRay.intersectObject(ground,false).length>0,
          body:[0,1.4,2.8].map(height=>focus.clone().add(new THREE.Vector3(0,height,0)).project(camera).toArray())};
      };
      renderer.render(scene, camera);`);
    body += '\nconst mountEnvironmentTest=mountTerrainWorld; mountTerrainWorld=async(...args)=>{const w=await mountEnvironmentTest(...args);window.environmentWorld=w;return w;};';
    await route.fulfill({ response, body });
  });
  await page.setViewportSize({ width: 1440, height: 960 }); await page.goto('/'); await page.locator('#guest').click();
  await chooseCharacter(page, 'warrior-male-02');
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await expect(page.locator('.world-player-name[data-player-id]')).toHaveCount(1);
  const state = () => page.evaluate(() => (window as any).environmentWorld.inspect());
  const probe = () => page.evaluate(() => (window as any).environmentProbe());
  const visiblePlayer = async () => {
    const view = await probe();
    expect(view.blocked).toBe(false);
    expect(view.feetBlocked).toBe(false);
    expect((await state()).orbit.clearance).toBeGreaterThanOrEqual(.65 - 1e-6);
    for (const [x, y, z] of view.body) {
      expect(Math.abs(x)).toBeLessThan(.1); expect(Math.abs(y)).toBeLessThan(.85);
      expect(z).toBeGreaterThan(-1); expect(z).toBeLessThan(1);
    }
  };
  const drag = async (dx: number, dy: number) => {
    await page.mouse.move(1040, 650); await page.mouse.down({ button: 'right' });
    await page.mouse.move(1040 + dx, 650 + dy, { steps: 12 }); await page.mouse.up({ button: 'right' });
    await expect(page.locator('#game canvas')).not.toHaveAttribute('data-orbiting');
  };
  await page.screenshot({ path: 'test-results/terrain-environment/default.png' });
  const initial = await state(), light = (await probe()).light;
  await drag(-300, 80);
  expect((await state()).orbit.yaw).toBeGreaterThan(90);
  expect((await state()).moving).toBe(false);
  (await probe()).light.forEach((value: number, index: number) => expect(value).toBeCloseTo(light[index], 8));
  expect((await probe()).blocked).toBe(false);
  expect((await state()).orbit.clearance).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: 'test-results/terrain-environment/orbit.png' });
  // Left-click movement still uses the rotated camera's ground ray.
  const walkClick = await page.evaluate(() => (window as any).environmentWalkClick());
  expect(walkClick).toBeTruthy();
  await page.mouse.click(walkClick[0], walkClick[1]);
  await expect.poll(async () => (await state()).moving).toBe(true);
  await expect.poll(async () => (await state()).moving).toBe(false);
  await openSettings(page);
  await page.locator('#reset-camera').click();
  await closeSettings(page);
  // Low orbit dollies in without losing the avatar; reversing the same input
  // must restore the old position without a reset or distance drift.
  const beforeSlide = await state();
  for (let i = 0; i < 4; i++) { await drag(0, -100); await visiblePlayer(); }
  expect((await state()).orbit.distance).toBeLessThan(beforeSlide.orbit.distance / 3);
  await page.screenshot({ path: 'test-results/terrain-environment/close-ground-slide.png' });
  for (let i = 0; i < 4; i++) { await drag(0, 100); await visiblePlayer(); }
  (await state()).camera.forEach((value: number, i: number) => expect(value).toBeCloseTo(beforeSlide.camera[i], 5));
  const setHour = async (hour: number) => {
    await page.evaluate(h => { (window as any).environmentHour = h; }, hour);
    await expect.poll(async () => (await state()).lighting.hour).toBe(hour);
  };
  for (const hour of [7, 12, 17, 22]) {
    await setHour(hour);
    await page.screenshot({ path: `test-results/terrain-environment/time-${hour}.png` });
  }
  expect((await state()).lighting.daylight).toBe(0);
  // Orbit toward the moon's bearing without allowing a sky-only detached view.
  const moon = (await state()).lighting.moonDirection;
  const yaw = Math.atan2(-moon[0], -moon[2]);
  const pitch = -Math.asin(moon[1]);
  await drag(-yaw / .006, (pitch - initial.orbit.pitch * Math.PI / 180) / .004);
  expect((await probe()).blocked).toBe(false);
  await visiblePlayer();
  await page.screenshot({ path: 'test-results/terrain-environment/night-ground-slide.png' });
  await openSettings(page); await page.locator('#reset-camera').click();
  await setHour(9);
  await page.screenshot({ path: 'test-results/terrain-environment/settings.png' }); await closeSettings(page);
  expect((await state()).lighting.bearing).toBe(180);
  const sun = (await state()).lighting.sunDirection;
  await drag(-Math.atan2(-sun[0], -sun[2]) / .006, (-Math.asin(sun[1]) - initial.orbit.pitch * Math.PI / 180) / .004);
  await visiblePlayer();
  await page.screenshot({ path: 'test-results/terrain-environment/day-ground-slide.png' });
  // Travel to the canal's inner bank and sweep all bearings at ground level.
  const bank = await page.evaluate(() => (window as any).environmentMoveToBank());
  expect(bank).toBeTruthy();
  await expect.poll(async () => {
    const {player} = await state();
    return Math.hypot(player.x - bank.x, player.z - bank.z);
  }, {timeout: 20000}).toBeLessThan(.2);
  await expect.poll(async () => (await state()).moving).toBe(false);
  await openSettings(page); await page.locator('#reset-camera').click(); await closeSettings(page);
  await drag(0, -450);
  for (let i = 0; i < 8; i++) {
    await drag(130, 0);
    expect((await probe()).blocked).toBe(false);
    await visiblePlayer();
  }
  await page.screenshot({ path: 'test-results/terrain-environment/bank-low-orbit.png' });
  // Both pitch extremes remain safe, pointer cancellation cannot leave orbit latched.
  await drag(100, -600); expect((await state()).orbit.pitch).toBeCloseTo(-65);
  await visiblePlayer();
  await openSettings(page); await page.locator('#reset-camera').click(); await closeSettings(page);
  await setWheelZoom(page,200);
  await visiblePlayer();
  expect(Math.abs((await probe()).body[1][1])).toBeLessThan(.15); // Torso stays near the center.
  await page.screenshot({ path: 'test-results/terrain-environment/close-max-zoom.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await visiblePlayer();
  await page.screenshot({ path: 'test-results/terrain-environment/close-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await drag(0, 270); await drag(0, 270); await drag(0, 270);
  expect((await state()).orbit.pitch).toBeCloseTo(78); expect((await probe()).blocked).toBe(false);
  await page.mouse.move(600, 500); await page.mouse.down({ button: 'right' });
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up({ button: 'right' });
  await expect(page.locator('#game canvas')).not.toHaveAttribute('data-orbiting');
  await openSettings(page); await page.locator('#reset-camera').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset-camera').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/terrain-environment/mobile-settings.png' });
  await page.locator('#logout').click(); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await expect(page.locator('#world-time, #sun-direction, #world-time-auto')).toHaveCount(0); await expect(page.locator('#game canvas')).toHaveCount(1);
  expect((await state()).orbit.yaw).toBe(0);
  expect(errors).toEqual([]);
});
