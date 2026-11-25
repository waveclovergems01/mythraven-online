import {test,expect} from '@playwright/test';
import { selectAppearance } from './helpers/character-selection';

test('loading counts completed tasks and covers the scene until body, equipment and server readiness',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    (window as any).loadingSamples=[];
    new MutationObserver(()=>{
      const screen=document.querySelector('.scene-loading'),bar=screen?.querySelector('progress');
      if(bar)(window as any).loadingSamples.push(bar.value);
    }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['value']});
  });
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text()).replace('renderer.render(scene, camera);',`
      window.loadingQA={network,area,enter:()=>onWarp('west-march'),read:()=>({
        mine:network.players.get(network.room?.sessionId),own:views.get(network.room?.sessionId)?.avatar.inspect(),
        weapon:views.get(network.room?.sessionId)?.weapon,initialModelsReady,revealed})};
      renderer.render(scene, camera);`)});
  });
  let releaseBuildings!:()=>void;
  const buildingsGate=new Promise<void>(resolve=>releaseBuildings=resolve);
  await page.route('**/assets/models/buildings/**',async route=>{await buildingsGate;await route.continue();});
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');await page.locator('#guest').click();
  await selectAppearance(page, 'novice-male-01');
  await page.locator('[data-hair-color="#79c9ef"]').click();
  await expect(page.locator('#enter-city')).toBeEnabled({timeout:30000});await page.locator('#enter-city').click();
  await expect(page.locator('.scene-loading')).toBeVisible();
  await expect.poll(()=>page.locator('.scene-loading progress').evaluate((el:HTMLProgressElement)=>el.value)).toBeGreaterThan(0);
  const progress=await page.locator('.scene-loading progress').evaluate((el:HTMLProgressElement)=>el.value);
  expect(progress).toBeLessThan(100);
  await page.screenshot({path:'test-results/loading/city-loading.png'});
  releaseBuildings();
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:60000});
  const city=await page.evaluate(()=>(window as any).loadingQA.read());
  expect(city.own).toBeTruthy();expect(city.initialModelsReady).toBe(true);expect(city.mine.sceneReady).toBe(true);
  await expect(page.locator('.arrival-protection')).toBeVisible();
  const hud=page.locator('.combat-vitals');
  const artwork=hud.locator('.vital-artwork');
  const desktopArtwork=(await artwork.boundingBox())!;
  expect([desktopArtwork.x,desktopArtwork.y]).toEqual([4,-2]);
  await expect(hud.locator('#player-name')).toHaveText(/^Guest-/);
  await expect(hud).not.toContainText('Novice');
  await expect(hud.locator('strong')).toHaveText('Lv. 1');
  await expect(hud.locator('.hp-caption')).toHaveText('100 / 100');
  const readHair=()=>hud.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>{
    const {data}=canvas.getContext('2d')!.getImageData(48,25,96,75);
    let bluePixels=0;
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]===255 && data[i+2]-data[i]>20)bluePixels++;
    }
    return bluePixels;
  });
  expect(await readHair()).toBeGreaterThan(250);
  const samples=await page.evaluate(()=>(window as any).loadingSamples as number[]);
  expect(samples).toContain(0);expect(samples).toContain(100);
  expect(samples.every((value,i)=>!i||value>=samples[i-1])).toBe(true);
  await page.keyboard.press('i');await page.locator('[data-item=dagger]').click({button:'right'});await page.keyboard.press('i');
  await page.waitForFunction(()=>(window as any).loadingQA.read().weapon==='dagger');
  let releaseWeapon!:()=>void;
  const weaponGate=new Promise<void>(resolve=>releaseWeapon=resolve);
  await page.route('**/assets/models/characters/weapons/dagger.glb',async route=>{await weaponGate;await route.continue();});
  await page.evaluate(()=>(window as any).loadingQA.enter());
  await page.waitForFunction(()=>{
    const q=(window as any).loadingQA;return q?.area==='west-march'&&q.network.connected;
  },undefined,{timeout:45000});
  await expect(page.locator('.scene-loading')).toBeVisible();
  const waiting=await page.evaluate(()=>(window as any).loadingQA.read());
  expect(waiting.mine.sceneReady).toBe(false);expect(waiting.mine.protectedUntil).toBe(0);expect(waiting.weapon).toBeUndefined();
  const stalled=await page.locator('.scene-loading progress').evaluate((el:HTMLProgressElement)=>el.value);
  await page.waitForTimeout(600);
  expect(await page.locator('.scene-loading progress').evaluate((el:HTMLProgressElement)=>el.value)).toBe(stalled);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/loading/field-loading-mobile.png'});
  releaseWeapon();
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:30000});
  const field=await page.evaluate(()=>(window as any).loadingQA.read());
  expect(field.weapon).toBe('dagger');expect(field.mine.sceneReady).toBe(true);
  expect(field.mine.protectedUntil-Date.now()/1000).toBeGreaterThan(12);
  const hudBounds=(await hud.boundingBox())!;
  const mobileArtwork=(await artwork.boundingBox())!;
  expect([mobileArtwork.x,mobileArtwork.y]).toEqual([desktopArtwork.x,desktopArtwork.y]);
  const mapBounds=(await page.locator('.terrain-minimap').boundingBox())!;
  expect(hudBounds.y+hudBounds.height).toBeLessThanOrEqual(mapBounds.y);
  const nameFits=await hud.locator('#player-name').evaluate(el=>el.scrollWidth<=el.clientWidth);
  expect(nameFits).toBe(true);
  expect(await readHair()).toBeGreaterThan(250);
  await page.screenshot({path:'test-results/loading/field-ready.png'});
  expect(errors).toEqual([]);
});
