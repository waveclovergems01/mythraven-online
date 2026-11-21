import { test, expect } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';

test('predicted grove detours keep the run clip and server corridor through every bend', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('renderer.render(scene, camera);', `
      if (!window.detours) {
        let plans=0; const originalMove=prediction.movement.moveTo.bind(prediction.movement);
        prediction.movement.moveTo=(p)=>{plans++;return originalMove(p);};
        window.detours={
          pair:()=>{const t=groves.inspect().placements.filter(t=>t.region==='city-ring'&&navigation.canStand({x:t.x-6,z:t.z})&&navigation.canStand({x:t.x+6,z:t.z})).sort((a,b)=>Math.hypot(a.x-focus.x,a.z-focus.z)-Math.hypot(b.x-focus.x,b.z-focus.z))[0];return {a:{x:t.x-6,z:t.z},b:{x:t.x+6,z:t.z}};},
          go:(p,level)=>{network.setSpeedLevel(level);prediction.movement.setSpeedLevel(level);if(prediction.move(network.nextInputSeq,p.x,p.z))network.move(p.x,p.z);},
          read:()=>({at:performance.now(),plans,position:prediction.position,turning:prediction.movement.turning,moving:prediction.movement.moving,
            server:network.players.get(network.room?.sessionId),clip:views.get(network.room?.sessionId)?.avatar.inspect().clip})
        };
      }
      renderer.render(scene, camera);`);
    await route.fulfill({ response, body });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await expect.poll(() => page.evaluate(() => !!(window as any).detours)).toBe(true);
  const pair = await page.evaluate(() => (window as any).detours.pair());
  const read = () => page.evaluate(() => (window as any).detours.read());
  await page.evaluate(p => (window as any).detours.go(p, 5), pair.a);
  await expect.poll(async () => {
    const s = await read(); return !s.moving && !s.server.moving && Math.hypot(s.position.x-pair.a.x,s.position.z-pair.a.z)<.01;
  }, { timeout: 20000 }).toBe(true);
  for (const [target, level] of [[pair.b, 1], [pair.a, 10]] as const) {
    const sequence = (await read()).server.inputSeq;
    await page.evaluate(({ target, level }) => {
      const w = window as any; w.detourSamples=[]; w.detours.go(target, level);
      const until=performance.now()+8000;
      const sample=()=>{const s=w.detours.read();w.detourSamples.push(s);if(performance.now()<until&&(s.moving||s.server.moving||w.detourSamples.length<3))requestAnimationFrame(sample);};sample();
    }, { target, level });
    await page.waitForTimeout(level === 1 ? 900 : 300);
    await page.screenshot({ path: `test-results/terrain-detours/speed-${level}.png` });
    await expect.poll(async () => {
      const s=await read();return !s.moving&&!s.server.moving&&Math.hypot(s.position.x-target.x,s.position.z-target.z)<.01;
    }, { timeout: 15000 }).toBe(true);
    const samples = await page.evaluate(() => (window as any).detourSamples);
    const running = samples.findIndex((s: any) => s.moving && !s.turning && s.clip === 'n_run');
    expect(running).toBeGreaterThanOrEqual(0);
    const travel = samples.slice(running).filter((s: any) => s.moving && Math.hypot(s.position.x-target.x,s.position.z-target.z)>1);
    expect(travel.length).toBeGreaterThan(2);
    for (const s of travel) { expect(s.turning).toBe(false); expect(s.clip).toBe('n_run'); }
    // Older snapshots may replay the unacknowledged click. Once acknowledged,
    // every subsequent snapshot must keep the accepted corridor without A*.
    const acknowledged = samples.filter((s: any) => s.server.inputSeq > sequence);
    expect(acknowledged.length).toBeGreaterThan(2);
    expect(new Set(acknowledged.map((s: any) => s.plans)).size).toBe(1);
    expect(new Set(acknowledged.map((s: any) => s.server.path)).size).toBe(1);
  }
  expect(errors).toEqual([]);
});
