import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { openSettings, setWheelZoom } from './helpers/game-settings';

test.use({ hasTouch: true });
test('hover outlines and player selection approach others with space while self clicks do nothing', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const source=(await response.text()).replace('renderer.render(scene, camera);',`
      window.playerBodyPoint=id=>{
        const p=views.get(id).mesh.position.clone();p.y+=1.45;p.project(camera);
        const box=canvas.getBoundingClientRect();
        return {x:box.left+(p.x+1)*box.width/2,y:box.top+(1-p.y)*box.height/2};
      };
      renderer.render(scene,camera);`);
    await route.fulfill({ response, body: source + '\nconst mountHighlightTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountHighlightTest(...args);window.highlightWorld=w;return w;};' });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled({timeout:45000});
  const state = () => page.evaluate(() => (window as any).highlightWorld.inspect());
  await expect.poll(async () => (await state()).renderedPlayers).toBeGreaterThan(0);
  const mine = (await state()).id;
  const bodyPoint = (id:string)=>page.evaluate(id=>(window as any).playerBodyPoint(id),id);
  const hover = async (id: string) => { const p = await bodyPoint(id); await page.mouse.move(p.x, p.y); };
  await hover(mine); await expect.poll(async () => (await state()).hoveredPlayer).toBe(mine);
  await expect(page.locator('#game canvas')).toHaveCSS('cursor', 'pointer');
  await page.screenshot({ path: 'test-results/terrain-highlight/own-hover.png' });
  await page.locator('#settings-toggle').hover(); await expect.poll(async () => (await state()).hoveredPlayer).toBeUndefined();
  const p = await bodyPoint(mine); await page.mouse.click(p.x, p.y);
  expect((await state()).selectedPlayer).toBeUndefined();
  await page.mouse.move(1000, 400); expect((await state()).moving).toBe(false);
  await page.mouse.click(1000, 400, { button: 'right' }); expect((await state()).selectedPlayer).toBeUndefined();
  // Clicking our body during a route must not stop or replace that route.
  await page.mouse.click(1100, 280);
  await expect.poll(async () => (await state()).moving).toBe(true);
  const walkingTarget = (await state()).destination;
  const ownMoving = await bodyPoint(mine); await page.mouse.click(ownMoving.x, ownMoving.y);
  const afterSelfClick = (await state()).destination;
  expect(afterSelfClick.x).toBeCloseTo(walkingTarget.x, 4);
  expect(afterSelfClick.z).toBeCloseTo(walkingTarget.z, 4);
  await page.mouse.click(950, 450); await expect.poll(async () => (await state()).selectedPlayer).toBeUndefined();
  await expect.poll(async () => (await state()).moving).toBe(false);

  const remote = await new Client('ws://127.0.0.1:' + (process.env.GAME_PORT || '5275')).joinOrCreate('mythraven-world', { characterId: 'novice-male-01' });
  remote.reconnection.enabled = false;
  try {
    await expect.poll(async () => (await state()).renderedPlayers).toBe(2);
    await hover(remote.sessionId); await expect.poll(async () => (await state()).hoveredPlayer).toBe(remote.sessionId);
    await page.screenshot({ path: 'test-results/terrain-highlight/remote-hover.png' });
    const peer = (await state()).players[remote.sessionId];
    remote.send('move', { x: peer.x - 7, z: peer.z - 3 });
    // Re-pick every frame: a moving avatar must leave a stationary pointer's hover.
    await expect.poll(async () => (await state()).hoveredPlayer).toBeUndefined();
    await expect.poll(async () => (await state()).players[remote.sessionId].moving).toBe(false);
    const remotePoint = await bodyPoint(remote.sessionId);
    await page.touchscreen.tap(remotePoint.x, remotePoint.y);
    await expect.poll(async () => (await state()).selectedPlayer).toBe(remote.sessionId);
    await expect.poll(async () => (await state()).moving).toBe(true);
    await expect.poll(async () => (await state()).moving).toBe(false);
    const arrived = await state(), target = arrived.players[remote.sessionId];
    expect(Math.hypot(arrived.player.x - target.x, arrived.player.z - target.z)).toBeCloseTo(2.6, 0);
    expect(arrived.player.x).toBeCloseTo(arrived.players[mine].x, 2);
    expect(arrived.player.z).toBeCloseTo(arrived.players[mine].z, 2);
    await page.screenshot({ path: 'test-results/terrain-highlight/remote-selected.png' });
    // Re-click someone already in range: stay put, retain the selected outline.
    const nearby = await bodyPoint(remote.sessionId); await page.mouse.click(nearby.x, nearby.y);
    await page.waitForTimeout(200); expect((await state()).player).toEqual(arrived.player);
    // A selected player is followed only during the approach, then the route ends.
    remote.send('move', { x: target.x + 12, z: target.z - 8 });
    await expect.poll(async () => (await state()).players[remote.sessionId].moving).toBe(true);
    await expect.poll(async () => (await state()).players[remote.sessionId].moving).toBe(false);
    const far = await bodyPoint(remote.sessionId); await page.mouse.click(far.x, far.y);
    await expect.poll(async () => (await state()).moving).toBe(true);
    remote.send('move', { x: target.x + 15, z: target.z - 13 });
    await expect.poll(async () => (await state()).moving, { timeout: 10000 }).toBe(false);
    const followed = await state(), movedTarget = followed.players[remote.sessionId];
    expect(Math.hypot(followed.player.x - movedTarget.x, followed.player.z - movedTarget.z)).toBeLessThan(2.9);
    expect(Math.hypot(followed.player.x - movedTarget.x, followed.player.z - movedTarget.z)).toBeGreaterThan(2.3);
    // A new ground command cancels approach; it must never restart on its own.
    remote.send('move', { x: movedTarget.x - 12, z: movedTarget.z });
    await expect.poll(async () => (await state()).players[remote.sessionId].moving).toBe(true);
    await expect.poll(async () => (await state()).players[remote.sessionId].moving).toBe(false);
    const away = await bodyPoint(remote.sessionId); await page.mouse.click(away.x, away.y);
    await expect.poll(async () => (await state()).moving).toBe(true);
    await page.mouse.click(950, 450); expect((await state()).selectedPlayer).toBeUndefined();
    const manual = (await state()).destination;
    await expect.poll(async () => (await state()).moving).toBe(false);
    expect((await state()).player.x).toBeCloseTo(manual.x, 2);
    // Leaving during approach cancels both the destination and its selection.
    const departing = await bodyPoint(remote.sessionId); await page.mouse.click(departing.x, departing.y);
    await expect.poll(async () => (await state()).moving).toBe(true);
    await remote.leave();
    await expect.poll(async () => (await state()).selectedPlayer).toBeUndefined();
    await expect.poll(async () => (await state()).moving).toBe(false);
    for (const zoom of [.5,2] as const) {
      await setWheelZoom(page,zoom===2 ? 200 : 50); await hover(mine);
      await expect.poll(async () => (await state()).hoveredPlayer).toBe(mine);
      await page.screenshot({ path: `test-results/terrain-highlight/zoom-${zoom}.png` });
    }
    await openSettings(page); await page.locator('#logout').click(); await page.locator('#guest').click(); await chooseCharacter(page);
    await expect(page.locator('#walk-speed')).toBeEnabled({timeout:45000});
    expect((await state()).selectedPlayer).toBeUndefined();
    await expect(page.locator('#game canvas')).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally { if (remote.connection.isOpen) await remote.leave(); }
});
