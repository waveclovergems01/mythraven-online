import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings } from './helpers/game-settings';
import { test, expect, type Page } from '@playwright/test';
import { Client, type Room } from '@colyseus/sdk';

async function enter(page: Page) {
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst mountTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountTest(...args);window.onlineWorld=w;return w;};' });
  });
  await page.route('**/src/network/terrain-client.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst connectTest=TerrainClient.prototype.connect;TerrainClient.prototype.connect=async function(...args){window.onlineNetwork=this;return connectTest.apply(this,args);};' });
  });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true', { timeout: 20000 });
  await page.waitForFunction(() => (window as any).onlineWorld?.inspect().renderedPlayers > 0);
}
const snapshot = (page: Page) => page.evaluate(() => (window as any).onlineWorld.inspect());

test('64 sessions share a city and the next session enters a separate instance', async () => {
  test.setTimeout(90000);
  const sessions: Room[] = [];
  const endpoint = 'ws://127.0.0.1:' + (process.env.GAME_PORT || '5275');
  try {
    // Bounded batches avoid turning the capacity check into an HTTP burst test.
    for (let batch = 0; batch < 16; batch++) {
      const joined = await Promise.all(Array.from({ length: 4 }, (_, i) =>
        new Client(endpoint).joinOrCreate('mythraven-world', { characterId: 'novice-male-01', displayName: 'Capacity-' + (batch * 4 + i) })
          .then(room => { sessions.push(room); return room; })));
      joined.forEach(room => { room.reconnection.enabled = false; });
    }
    expect(new Set(sessions.map(room => room.roomId)).size).toBe(1);
    const first = sessions[0];
    await expect.poll(() => first.state?.players?.size).toBe(64);
    const overflow = await new Client(endpoint).joinOrCreate('mythraven-world', { characterId: 'novice-male-01', displayName: 'Capacity-overflow' });
    overflow.reconnection.enabled = false; sessions.push(overflow);
    expect(overflow.roomId).not.toBe(first.roomId);
    await expect.poll(() => overflow.state?.players?.size).toBe(1);
    const mine = first.state.players.get(first.sessionId), startX = mine.x;
    first.send('move', { x: mine.x + 5, z: mine.z - 3 });
    await expect.poll(() => first.state.players.get(first.sessionId).x, { timeout: 5000 }).toBeGreaterThan(startX + 3);
    await expect.poll(() => sessions[63].state.players.get(first.sessionId).x).toBeGreaterThan(startX + 3);
  } finally { await Promise.allSettled(sessions.map(room => room.leave())); }
});

test('independent players share the 3D city, authoritative clicks, late joins, drop and reconnect', async ({ page, browser }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 960 }); await enter(page);
  const secondContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const other = await secondContext.newPage(); other.on('pageerror', e => errors.push(e.message));
  try {
    await enter(other);
    await expect.poll(async () => (await snapshot(page)).renderedPlayers).toBe(2);
    await expect.poll(async () => (await snapshot(other)).renderedPlayers).toBe(2);
    const a = await snapshot(page), b = await snapshot(other);
    expect(a.id).not.toBe(b.id); expect(a.room).toBe(b.room);
    expect(Math.hypot(a.player.x - b.player.x, a.player.z - b.player.z)).toBeGreaterThan(2);
    await expect(page.locator('.world-player-name[data-mine="false"]')).toHaveCount(1);
    await expect(page.locator('.terrain-minimap-player')).toHaveCount(2);
    await expect(other.locator('.terrain-minimap-player')).toHaveCount(2);
    const ownDot = page.locator('.terrain-minimap-player[data-mine="true"]');
    const dotStart = Number(await ownDot.getAttribute('cx'));
    const minimapBox = (await page.locator('.terrain-minimap').boundingBox())!;
    const logoutBox = (await page.locator('#settings-toggle').boundingBox())!;
    expect(minimapBox.x).toBeGreaterThan(1100); expect(minimapBox.y).toBeLessThanOrEqual(16);
    expect(logoutBox.x).toBeGreaterThan(1200); expect(logoutBox.y).toBeGreaterThan(880);
    await page.bringToFront(); await page.mouse.click(a.screen[0] + 180, a.screen[1] - 60);
    await expect.poll(async () => (await snapshot(other)).players[a.id].moving).toBe(true);
    await expect.poll(async () => (await snapshot(other)).players[a.id].x).toBeGreaterThan(a.player.x + 4);
    await expect.poll(async () => (await snapshot(page)).moving).toBe(false);
    const end = await snapshot(page);
    await expect.poll(async () => Number(await ownDot.getAttribute('cx'))).toBeGreaterThan(dotStart + 2);
    expect(Number(await ownDot.getAttribute('cx'))).toBeCloseTo((end.players[a.id].x / 500 + .5) * 256, 2);
    // HUD clicks must not issue world movement through the minimap.
    await page.locator('.terrain-minimap').click({ position: { x: 40, y: 50 } });
    await page.waitForTimeout(180); expect((await snapshot(page)).players[a.id].x).toBeCloseTo(end.players[a.id].x, 3);
    await expect.poll(async () => (await snapshot(other)).players[a.id].x).toBeCloseTo(end.players[a.id].x, 3);
    expect((await snapshot(other)).players[b.id].x).toBeCloseTo(b.player.x, 3);

    // Forged positions/speeds/IDs do not grant control of another player.
    await other.bringToFront();
    await other.evaluate(() => {
      const n = (window as any).onlineNetwork;
      n.room.send('move', { x: -9999, z: 0, speed: 9999, sessionId: 'someone-else' });
    });
    await expect(other.locator('.terrain-move-hint')).toBeVisible();
    expect((await snapshot(other)).players[b.id].x).toBeCloseTo(b.player.x, 3);
    // The river is blocked by the server even when UI raycasts are bypassed.
    await other.waitForTimeout(120);
    await other.evaluate(async () => {
      const path = '/src/terrain/terrain-data.ts'; const { layoutToWorld } = await import(path);
      (window as any).onlineNetwork.room.send('move', layoutToWorld(95, 490));
    });
    await other.waitForTimeout(180); expect((await snapshot(other)).players[b.id].x).toBeCloseTo(b.player.x, 3);
    await page.bringToFront(); await page.screenshot({ path: 'test-results/terrain-online/two-players.png' });
    await other.bringToFront(); await other.screenshot({ path: 'test-results/terrain-online/other-player.png' });

    // A late join receives current authoritative positions, not the original spawn.
    const late = await secondContext.newPage(); await enter(late);
    await expect.poll(async () => Object.keys((await snapshot(late)).players).length).toBe(3);
    expect((await snapshot(late)).players[a.id].x).toBeCloseTo(end.players[a.id].x, 3);
    await late.close(); await expect.poll(async () => Object.keys((await snapshot(page)).players).length).toBe(2);

    await other.evaluate(() => (window as any).onlineNetwork.room.connection.close());
    await expect(other.locator('#network-status')).toHaveAttribute('data-connected', 'false');
    await expect.poll(async () => (await snapshot(page)).players[b.id]).toBeUndefined();
    await expect(other.locator('.world-player-name[data-player-id]')).toHaveCount(0);
    await expect(other.locator('.terrain-minimap-player')).toHaveCount(0);
    await other.locator('#network-status button').click();
    await expect(other.locator('#network-status')).toHaveAttribute('data-connected', 'true');
    const rejoined = await snapshot(other); expect(rejoined.id).not.toBe(b.id); expect(rejoined.room).toBe(a.room);
    await expect.poll(async () => Object.keys((await snapshot(page)).players).length).toBe(2);
    await expect(other.locator('.terrain-minimap-player')).toHaveCount(2);
    for (const width of [390, 320]) {
      await other.setViewportSize({ width, height: 844 });
      const map = (await other.locator('.terrain-minimap').boundingBox())!;
      const vitals = (await other.locator('.game-header .combat-vitals').boundingBox())!;
      const leave = (await other.locator('#settings-toggle').boundingBox())!;
      expect(map.x + map.width).toBeLessThanOrEqual(width);
      expect(vitals.x + vitals.width).toBeLessThanOrEqual(map.x);
      expect(leave.y + leave.height).toBeLessThanOrEqual(844);
      expect(leave.y).toBeGreaterThan(780);
      await other.screenshot({ path: 'test-results/terrain-online/minimap-mobile-' + width + '.png' });
    }
    await openSettings(other); await other.locator('#logout').click();
    await expect.poll(async () => Object.keys((await snapshot(page)).players).length).toBe(1);
    await expect(page.locator('.world-player-name[data-player-id]')).toHaveCount(1);
    await expect(page.locator('.terrain-minimap-player')).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally { await secondContext.close(); }
});
