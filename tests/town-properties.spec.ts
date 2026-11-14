import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('town lots appear on entry and fade behind a player walking around a house', async ({page}) => {
  test.setTimeout(120000);
  const out = 'test-results/town-properties';
  await fs.mkdir(out, {recursive: true});
  const errors:string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/scenes/WorldScene.ts*', async route => {
    const response = await route.fetch();
    const hook = `const originalCreate = WorldScene.prototype.create;
      WorldScene.prototype.create = function(...args) {
        originalCreate.apply(this, args);
        window.propertyScene = this;
      };`;
    await route.fulfill({response, body: await response.text() + '\n' + hook});
  });
  await page.setViewportSize({width: 1600, height: 900});
  await page.goto('/?view=2d');
  await page.locator('#guest').click();
  await page.waitForFunction(() => {
    const scene = (window as any).propertyScene;
    return scene?.views.has(scene.network.room?.sessionId);
  });
  const count = await page.evaluate(() => (window as any).propertyScene.children.list.filter((o:any) => o.name.startsWith('property-')).length);
  expect(count).toBe(11);
  const overview = await page.locator('.minimap-image img').getAttribute('src');
  await fs.writeFile(out+'/city.png', Buffer.from(overview!.split(',')[1], 'base64'));
  await page.evaluate(() => (window as any).propertyScene.cameras.main.stopFollow().centerOn(1008/1448*15360,267/1086*11536));
  await page.waitForTimeout(450);
  await page.screenshot({path:out+'/guild-and-market.png'});
  await page.evaluate(() => (window as any).propertyScene.cameras.main.centerOn(477/1448*15360,680/1086*11536));
  await page.waitForTimeout(450);
  await page.screenshot({path:out+'/timber-cottage.png'});
  const move = async (y:number, x=480) => {
    const cell = {x:Math.floor(x/1448*240), y:Math.floor(y/1086*206)};
    await page.evaluate(cell => {
      const scene=(window as any).propertyScene;
      scene.cameras.main.startFollow(scene.player,true,.12,.12);
      scene.network.move(cell.x,cell.y);
    },cell);
    await expect.poll(() => page.evaluate(cell => {
      const scene=(window as any).propertyScene;
      const actor=scene.network.players.get(scene.network.room.sessionId);
      return Math.hypot(actor.x-(cell.x+.5)*64,actor.y-(cell.y+.5)*56);
    },cell),{timeout:40000}).toBeLessThan(1);
  };
  const alpha = () => page.evaluate(() => (window as any).propertyScene.children.getByName('property-southwest-townhouse').alpha);
  await move(570);
  await expect.poll(alpha).toBeLessThan(.5);
  await move(600,516);
  await expect.poll(alpha).toBe(1);
  await move(613);
  await expect.poll(alpha).toBe(1);
  await page.screenshot({path:out+'/residential-street.png'});
  expect(errors).toEqual([]);
  await page.locator('#logout').click();
});
