import { expect, test } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';
import { openSettings } from './helpers/game-settings';

test('music starts at selection, continues into town and changes at map boundaries', async ({page}) => {
  test.setTimeout(120000);
  await page.route('**/src/background-music.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      'const audio = new Audio();', 'const audio = window.musicQA = new Audio();') });
  });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      'renderer.render(scene, camera);',
      "window.musicWarp=()=>onWarp(area==='city'?'west-march':'city');renderer.render(scene, camera);") });
  });
  const state = () => page.evaluate(() => {
    const audio = (window as any).musicQA as HTMLAudioElement;
    return { track: audio.getAttribute('src'), playing: !audio.paused, time: audio.currentTime, volume: audio.volume };
  });
  await page.goto('/');
  expect((await state()).track).toBeNull();
  await page.locator('#guest').click();
  await expect(page.locator('#character-title')).toBeVisible();
  await expect.poll(async () => (await state()).time).toBeGreaterThan(0);
  const selectionTrack = (await state()).track;
  await chooseCharacter(page);
  expect((await state()).track).toBe(selectionTrack);
  await page.evaluate(() => (window as any).musicWarp());
  await expect(page.locator('#game')).toHaveAttribute('data-area', 'west-march', {timeout: 60000});
  await expect(page.locator('.scene-loading')).toBeHidden({timeout: 60000});
  await expect.poll(async () => (await state()).time).toBeGreaterThan(0);
  const battleTrack = (await state()).track;
  const battle = /\/(edge-of-the-arena|clash-of-banners|last-stand|ironwood-groove|thunderstring-rally|wildfire-jamboree)\.mp3$/;
  expect(battleTrack).toMatch(battle);
  await page.evaluate(() => {
    const audio = (window as any).musicQA as HTMLAudioElement;
    audio.currentTime = audio.duration - 0.05;
  });
  await expect.poll(async () => (await state()).track).not.toBe(battleTrack);
  expect((await state()).track).toMatch(battle);
  await page.evaluate(() => (window as any).musicWarp());
  await expect(page.locator('#game')).toHaveAttribute('data-area', 'city', {timeout: 60000});
  await expect(page.locator('.scene-loading')).toBeHidden({timeout: 60000});
  expect((await state()).track).not.toMatch(battle);
  await openSettings(page);
  await page.locator('#music-volume').press('Home');
  expect(await state()).toMatchObject({volume: 0, playing: false});
  await page.locator('#music-volume').press('ArrowRight');
  await expect.poll(async () => (await state()).playing).toBe(true);
  await page.locator('#logout').click();
  await expect(page.locator('#guest')).toBeVisible();
  expect(await state()).toMatchObject({track: null, playing: false});
});
