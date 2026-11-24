import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('minimap travel walks to the portal, can cancel, and warps both ways',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.portalQA={area,network,portal,read:()=>({area,portalTravel,
        mine:network.players.get(network.room?.sessionId),position:prediction.position,
        path:prediction.movement.path}),redirect:()=>{
          const p=prediction.position;
          moveToPoint({point:new THREE.Vector3(p.x,terrainHeight(data,p.x,p.z),p.z),normal:new THREE.Vector3(0,1,0)});
        }};
      renderer.render(scene, camera);`);
    await route.fulfill({response,body});
  });
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  const button=page.locator('.terrain-portal-travel');
  await expect(button).toBeEnabled({timeout:60000});
  const map=await page.locator('.terrain-minimap > svg').boundingBox();
  const bounds=await button.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(map!.y+map!.height);
  const start=await page.evaluate(()=>(window as any).portalQA.read().position);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.evaluate(()=>{
    const q=(window as any).portalQA;return q.read().mine?.moving;
  })).toBe(true);
  await page.screenshot({path:'test-results/portal-travel/desktop.png'});
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>page.evaluate(()=>(window as any).portalQA.read().mine?.moving)).toBe(false);
  await button.click();
  await page.evaluate(()=>(window as any).portalQA.redirect());
  await expect(button).toHaveAttribute('aria-pressed','false');
  await button.click();
  await page.keyboard.press('i');
  await expect(button).toHaveAttribute('aria-pressed','true');
  await page.keyboard.press('i');
  // Use the normal server simulation and default speed all the way from the fountain.
  await expect.poll(()=>page.evaluate(()=>{
    const q=(window as any).portalQA,p=q.read().position;
    return q.area==='west-march' || Math.hypot(p.x,p.z)>100;
  }),{timeout:30000}).toBe(true);
  await page.waitForFunction(()=>{
    const q=(window as any).portalQA;return q?.area==='west-march' && q.network.connected;
  },undefined,{timeout:45000});
  expect(Math.hypot(start.x,start.z)).toBeLessThan(40);
  await expect(button).toHaveAttribute('aria-pressed','false');
  await expect(button).toBeEnabled();
  await page.setViewportSize({width:390,height:844});
  const mobileButton=await button.boundingBox(),mobileMap=await page.locator('.terrain-minimap > svg').boundingBox();
  expect(mobileButton!.x).toBeGreaterThanOrEqual(0);
  expect(mobileButton!.x+mobileButton!.width).toBeLessThanOrEqual(390);
  expect(mobileButton!.y).toBeGreaterThanOrEqual(mobileMap!.y+mobileMap!.height);
  await page.screenshot({path:'test-results/portal-travel/mobile-return.png'});
  await button.click();
  await page.waitForFunction(()=>{
    const q=(window as any).portalQA;return q?.area==='city' && q.network.connected;
  },undefined,{timeout:30000});
  await expect(button).toHaveAttribute('aria-pressed','false');
  expect(errors).toEqual([]);
});
