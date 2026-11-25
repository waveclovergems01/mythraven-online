import {expect, test} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('city lanterns glow at night and light terrain throughout the clear range', async ({page}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /shader|WebGL|THREE/i.test(message.text())) errors.push(message.text());
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1324,height:730});
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const source = (await response.text())
      .replace('daylight.update(camera, focus, network.serverNow);', `
        daylight.update(camera, focus, window.lanternEpoch ?? Date.parse('2026-11-24T00:45:00+07:00'));
      `)
      .replace('renderer.render(scene, camera);', `
        const lamps = buildings.lanternGroup;
        const halos = lamps.getObjectByName('lantern-halos');
        window.lanternQA = {
          state: {
            visible: lamps.visible, count: halos.count, strength: daylight.lanternStrength
          },
          haloPixels() {
            const gl = renderer.getContext();
            const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
            const before = new Uint8Array(pixels.length);
            halos.visible = false;
            renderer.render(scene, camera);
            gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, before);
            halos.visible = true;
            renderer.render(scene, camera);
            gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            let changed = 0;
            for (let i = 0; i < pixels.length; i += 4) if (pixels[i] - before[i] > 6) changed++;
            return changed;
          },
          groundLight(distances) {
            const gl = renderer.getContext();
            const on = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
            const off = new Uint8Array(on.length);
            const strength = halos.material.uniforms.strength;
            const night = strength.value;
            const hidden = scene.children.filter(child => child.visible && child !== terrain && !child.isLight);
            const sampleFocus = focus.clone();
            for (const child of hidden) child.visible = false;
            try {
              return distances.map(distance => {
                sampleFocus.set(distance,focus.y,0);
                viewDistance.update(sampleFocus);
                strength.value = 0;
                renderer.render(scene, camera);
                gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,off);
                strength.value = night;
                renderer.render(scene, camera);
                gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,on);
                let glow = 0;
                for (let i = 0; i < on.length; i += 4) glow += Math.max(0,on[i]-off[i]);
                return glow;
              });
            } finally {
              strength.value = night;
              for (const child of hidden) child.visible = true;
              viewDistance.update(focus);
              renderer.render(scene, camera);
            }
          }
        };
        renderer.render(scene, camera);
      `);
    await route.fulfill({response, body: source});
  });
  await page.goto('/');
  await page.locator('#guest').click();
  await chooseCharacter(page);
  const state = () => page.evaluate(() => (window as any).lanternQA?.state);
  expect(await state()).toMatchObject({visible:false, strength:0});
  expect((await state()).count).toBeGreaterThan(10);
  await page.screenshot({path:'test-results/city-lanterns/day.png'});
  // 18:30 in game is slightly past sunset. 22:00 is fully dark.
  const setHour = (hour: number) => page.evaluate(h => {
    (window as any).lanternEpoch = Date.parse('2026-11-24T00:00:00+07:00') + (h - 6) * 450000;
  },hour);
  await setHour(18.5);
  await expect.poll(async () => (await state()).strength).toBeGreaterThan(0);
  expect((await state()).strength).toBeLessThan(1);
  await setHour(22);
  await expect.poll(async () => (await state()).strength).toBe(1);
  const night = await state();
  expect(night.visible).toBe(true);
  expect(await page.evaluate(() => (window as any).lanternQA.haloPixels())).toBeGreaterThan(100);
  const [near, clearEdge, fog, outside] = await page.evaluate(() =>
    (window as any).lanternQA.groundLight([0,145,200,320]));
  expect(near).toBeGreaterThan(1000);
  expect(clearEdge).toBeGreaterThan(near*.85);
  expect(fog).toBeGreaterThan(0);
  expect(fog).toBeLessThan(clearEdge*.85);
  expect(outside).toBe(0);
  await page.screenshot({path:'test-results/city-lanterns/night.png'});
  await setHour(7);
  await expect.poll(async () => (await state()).visible).toBe(false);
  expect(errors).toEqual([]);
});
