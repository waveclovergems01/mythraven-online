import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { openSettings, closeSettings } from './helpers/game-settings';

test('owner novice plays independent idle/run poses, picks skinned silhouettes and survives reentry', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/error|warning/.test(m.type()) && /THREE|WebGL|shader|PropertyBinding/i.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (r.url().includes('/characters/m1-novice.glb')) requests.push(r.url()); });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst mountNoviceTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountNoviceTest(...args);window.noviceWorld=w;return w;};' });
  });
  await page.route('**/src/terrain/novice-player.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: await response.text() + '\nconst loadNoviceTest=loadNovicePlayers;loadNovicePlayers=async()=>{const factory=await loadNoviceTest();window.noviceInstances=[];const create=factory.create;factory.create=(...args)=>{const avatar=create(...args);window.noviceInstances.push(avatar);return avatar;};return factory;};' });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  const state = () => page.evaluate(() => (window as any).noviceWorld?.inspect());
  await expect.poll(async () => (await state())?.renderedPlayers, { timeout: 45000 }).toBe(1);
  const own = (await state()).id;
  expect((await state()).avatars[own].clip).toBe('n_idle');
  const pose = () => page.evaluate(() => {
    const bones: number[] = [];
    (window as any).noviceInstances.find((v: any) => v.group.parent).group.traverse((o: any) => { if (o.isBone) bones.push(...o.quaternion.toArray()); });
    return bones;
  });
  const initialPose = await pose();
  await page.waitForTimeout(300); expect(await pose()).not.toEqual(initialPose);
  await openSettings(page); await page.locator('#camera-zoom').fill('200'); await closeSettings(page);
  await page.screenshot({ path: 'test-results/terrain-novice/idle.png' });
  const label = (await page.locator(`.world-player-name[data-player-id="${own}"]`).boundingBox())!;
  await page.mouse.move(label.x + label.width / 2, label.y + label.height + 45);
  await expect.poll(async () => (await state()).hoveredPlayer).toBe(own);
  await page.screenshot({ path: 'test-results/terrain-novice/outline.png' });
  const remote = await new Client('ws://127.0.0.1:' + (process.env.GAME_PORT || '5275')).joinOrCreate('mythraven-world', { characterId: 'novice-male-01' });
  remote.reconnection.enabled = false;
  try {
    await expect.poll(async () => (await state()).renderedPlayers).toBe(2);
    expect(requests).toHaveLength(1);
    const ownership = await page.evaluate(() => {
      const meshes = (window as any).noviceInstances.filter((v: any) => v.group.parent).map((v: any) => {
        const a: any[] = []; v.group.traverse((o: any) => { if (o.isSkinnedMesh && o.userData.playerSurface) a.push(o); }); return a;
      });
      return { sharedGeometry: meshes[0][0].geometry === meshes[1][0].geometry,
        sharedMaterial: meshes[0][0].material === meshes[1][0].material,
        palettesPerAvatar: meshes.map((parts: any[]) => new Set(parts.map(p => p.skeleton)).size),
        independentBones: meshes[0][0].skeleton.bones[0] !== meshes[1][0].skeleton.bones[0] };
    });
    expect(ownership).toEqual({ sharedGeometry: true, sharedMaterial: true, palettesPerAvatar: [1, 1], independentBones: true });
    await page.mouse.click(1150, 280);
    await expect.poll(async () => (await state()).avatars[own].clip).toBe('n_run');
    expect((await state()).avatars[remote.sessionId].clip).toBe('n_idle');
    await page.screenshot({ path: 'test-results/terrain-novice/run.png' });
    await page.mouse.click(320, 350);
    await expect.poll(async () => { const s = await state(); return s.destination?.x < s.player.x; }).toBe(true);
    await expect.poll(async () => (await state()).moving).toBe(false);
    await expect.poll(async () => (await state()).avatars[own].clip).toBe('n_idle');
    const peer = (await state()).players[remote.sessionId];
    remote.send('move', { x: peer.x + 18, z: peer.z - 10 });
    await expect.poll(async () => (await state()).avatars[remote.sessionId].clip).toBe('n_run');
    expect((await state()).avatars[own].clip).toBe('n_idle');
    await page.screenshot({ path: 'test-results/terrain-novice/remote-run.png' });
    await remote.leave();
    await expect.poll(async () => (await state()).renderedPlayers).toBe(1);
    await page.mouse.click(1000, 320);
    await expect.poll(async () => (await state()).avatars[own].clip).toBe('n_run');
    await expect.poll(async () => (await state()).moving).toBe(false);
    await expect.poll(async () => (await state()).avatars[own].clip).toBe('n_idle');
    await openSettings(page); await page.locator('#logout').click();
    await page.locator('#guest').click(); await chooseCharacter(page);
    await expect.poll(async () => (await state())?.renderedPlayers, { timeout: 45000 }).toBe(1);
    await expect(page.locator('#game canvas')).toHaveCount(1);
    expect((await state()).avatars[(await state()).id].clip).toBe('n_idle');
    await page.screenshot({ path: 'test-results/terrain-novice/reentry.png' });
    expect(errors).toEqual([]);
  } finally { if (remote.connection.isOpen) await remote.leave(); }
});
