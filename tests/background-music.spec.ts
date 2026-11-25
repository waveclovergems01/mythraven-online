import { expect, test } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';
import { openSettings } from './helpers/game-settings';

test('music starts at selection, continues into town and changes at map boundaries', async ({page}) => {
  test.setTimeout(120000);
  await page.route('**/src/background-music.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      'const decks = [createDeck(), createDeck()];',
      'const decks = window.musicQA = [createDeck(), createDeck()];') });
  });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(
      'renderer.render(scene, camera);',
      "window.musicWarp=()=>onWarp(area==='city'?'west-march':'city');renderer.render(scene, camera);") });
  });
  const state = () => page.evaluate(() =>
    ((window as any).musicQA as {audio: HTMLAudioElement; loops: number}[]).map(({audio, loops}) => ({
      track: audio.getAttribute('src'), playing: !audio.paused, time: audio.currentTime,
      volume: audio.volume, duration: audio.duration, loops,
    })));
  const loaded = async () => (await state()).filter(deck => deck.track);
  const current = async () => (await loaded())[0];
  await page.goto('/');
  expect(await loaded()).toHaveLength(0);
  await page.locator('#guest').click();
  await expect(page.locator('#character-title')).toBeVisible();
  await expect.poll(async () => (await current())?.time).toBeGreaterThan(0);
  const selectionTrack = (await current()).track;
  await chooseCharacter(page);
  expect((await current()).track).toBe(selectionTrack);
  await page.evaluate(() => (window as any).musicWarp());
  const checkOverlap = () => expect.poll(async () => {
    const decks = await loaded();
    return decks.length === 2 && decks.every(deck => deck.playing && deck.volume > 0 && deck.volume < .25);
  }).toBe(true);
  await checkOverlap();
  await expect(page.locator('#game')).toHaveAttribute('data-area', 'west-march', {timeout: 60000});
  await expect(page.locator('.scene-loading')).toBeHidden({timeout: 60000});
  await expect.poll(async () => (await loaded()).length).toBe(1);
  const {track: battleTrack, duration} = await current();
  const battle = /\/(edge-of-the-arena|clash-of-banners|last-stand|ironwood-groove|thunderstring-rally|wildfire-jamboree)\.mp3$/;
  expect(battleTrack).toMatch(battle);
  const rounds = Math.round(270 / duration);
  expect(duration * rounds).toBeGreaterThanOrEqual(240);
  expect(duration * rounds).toBeLessThanOrEqual(301);
  const seekNearEnd = (seconds: number) => page.evaluate(({track, seconds}) => {
    const deck = (window as any).musicQA.find(({audio}: {audio: HTMLAudioElement}) => audio.getAttribute('src') === track);
    deck.audio.currentTime = deck.audio.duration - seconds;
  }, {track: battleTrack, seconds});
  for (let round = 1; round < rounds; round++) {
    await seekNearEnd(.45);
    await expect.poll(async () => (await current())?.loops).toBe(round);
    expect((await loaded()).map(deck => deck.track)).toEqual([battleTrack]);
  }
  await seekNearEnd(3.8);
  await checkOverlap();
  await expect.poll(async () => (await loaded()).map(deck => deck.track)).not.toContain(battleTrack);
  expect((await current()).track).toMatch(battle);
  await page.evaluate(() => (window as any).musicWarp());
  await expect(page.locator('#game')).toHaveAttribute('data-area', 'city', {timeout: 60000});
  await expect(page.locator('.scene-loading')).toBeHidden({timeout: 60000});
  await expect.poll(async () => (await loaded()).length).toBe(1);
  expect((await current()).track).not.toMatch(battle);
  await openSettings(page);
  await page.locator('[aria-controls="settings-audio"]').click();
  await expect(page.locator('#settings-controls')).toBeHidden();
  await page.locator('#music-volume').fill('50');
  await page.locator('#master-volume').fill('10');
  expect((await current()).volume).toBeCloseTo(.05);
  await page.locator('#effects-enabled').uncheck();
  expect((await current()).volume).toBeCloseTo(.05);
  await page.locator('#music-enabled').uncheck();
  expect(await current()).toMatchObject({volume: 0, playing: false});
  await page.locator('#music-enabled').check();
  await expect(page.locator('#music-volume')).toHaveValue('50');
  expect((await current()).volume).toBeCloseTo(.05);
  await page.screenshot({path:'test-results/audio-settings/sound.png'});
  await page.locator('#music-volume').press('Home');
  expect(await current()).toMatchObject({volume: 0, playing: false});
  await page.locator('#music-volume').press('ArrowRight');
  await expect.poll(async () => (await current()).playing).toBe(true);
  await page.locator('#logout').click();
  await expect(page.locator('#guest')).toBeVisible();
  expect(await loaded()).toHaveLength(0);
});
