import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { openSettings, closeSettings } from './helpers/game-settings';

test('local and remote players rotate through intermediate angles before running', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst mountTurnTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const world=await mountTurnTest(...args);window.turnWorld=world;return world;};' });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  const state = () => page.evaluate(() => (window as any).turnWorld?.inspect());
  await expect.poll(async () => (await state())?.renderedPlayers, { timeout: 30000 }).toBe(1);
  await openSettings(page); await page.locator('#camera-zoom').fill('200'); await closeSettings(page);
  const mine = (await state()).id;
  const startSampling = () => page.evaluate(() => {
    const w = window as any; w.turnSamples = [];
    const until = performance.now() + 700;
    const sample = () => {
      w.turnSamples.push({ at: performance.now(), ...w.turnWorld.inspect() });
      if (performance.now() < until) requestAnimationFrame(sample);
    };
    sample();
  });
  await startSampling();
  await page.mouse.click(720, 200); // 180-degree turn from the initial south-facing pose.
  await page.waitForTimeout(90);
  await page.screenshot({ path: 'test-results/terrain-turning/mid-turn.png' });
  await page.waitForTimeout(650);
  const samples = await page.evaluate(() => (window as any).turnSamples);
  const turning = samples.filter((s: any) => s.turning && Math.abs(s.avatars[mine].heading) > .15);
  expect(turning.length).toBeGreaterThanOrEqual(2);
  for (const sample of turning) {
    expect(sample.avatars[mine].clip).toBe('n_idle');
    expect(Math.hypot(sample.player.x - samples[0].player.x, sample.player.z - samples[0].player.z)).toBeLessThan(.03);
  }
  expect(samples.some((s: any) => !s.turning && s.avatars[mine].clip === 'n_run')).toBe(true);
  for (let i = 1; i < samples.length; i++) {
    const delta = samples[i].avatars[mine].heading - samples[i-1].avatars[mine].heading;
    const angle = Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
    expect(angle).toBeLessThanOrEqual(4*Math.PI*(samples[i].at-samples[i-1].at)/1000 + .08);
  }
  await expect.poll(async () => (await state()).moving).toBe(false);
  const remote = await new Client('ws://127.0.0.1:' + (process.env.GAME_PORT || '5275')).joinOrCreate('mythraven-world', { characterId: 'novice-male-01' });
  remote.reconnection.enabled = false;
  try {
    await expect.poll(async () => (await state()).renderedPlayers).toBe(2);
    const peer = (await state()).players[remote.sessionId];
    await startSampling();
    remote.send('move', { x: peer.x, z: peer.z - 20 });
    await page.waitForTimeout(750);
    const remoteSamples = await page.evaluate(() => (window as any).turnSamples);
    const turns = remoteSamples.filter((s: any) => s.players[remote.sessionId].turning);
    expect(turns.length).toBeGreaterThanOrEqual(2);
    for (const sample of turns) {
      expect(sample.avatars[remote.sessionId].clip).toBe('n_idle');
      expect(sample.players[remote.sessionId].x).toBeCloseTo(peer.x, 4);
      expect(sample.players[remote.sessionId].z).toBeCloseTo(peer.z, 4);
    }
    expect(remoteSamples.some((s: any) => s.avatars[remote.sessionId].clip === 'n_run')).toBe(true);
    expect(remoteSamples.some((s: any) => Math.abs(s.avatars[remote.sessionId].heading) > .2
      && Math.abs(s.avatars[remote.sessionId].heading) < Math.PI - .2)).toBe(true);
    expect((await state()).avatars[mine].clip).toBe('n_idle');
    await page.screenshot({ path: 'test-results/terrain-turning/remote-run.png' });
    expect(errors).toEqual([]);
  } finally { await remote.leave(); }
});
