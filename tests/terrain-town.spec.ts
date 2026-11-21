import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';
import {openSettings,closeSettings} from './helpers/game-settings';

test('castle, northern crossing, residential streets and central angel fountain work in the live town',async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/.test(m.text()))errors.push(m.text());});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.townProbe={go:p=>{network.setSpeedLevel(10);prediction.movement.setSpeedLevel(10);if(prediction.move(network.nextInputSeq,p.x,p.z))network.move(p.x,p.z);},
        info:()=>({ready:network.connected,position:focus.toArray(),moving:prediction.movement.moving,layout:buildings.inspect(),
          water:buildings.group.getObjectByName('angel-fountain-water')?.children.map(m=>m.name),assets:buildings.group.children.filter(m=>m.isInstancedMesh).length,emissives:buildings.group.children.filter(m=>m.material?.emissiveMap).map(m=>m.material.emissiveIntensity)})};
      if(window.townReview){const v=window.townReview;camera.zoom=1;camera.updateProjectionMatrix();camera.position.set(...v.position);camera.lookAt(...v.target);camera.updateMatrixWorld();}
      renderer.render(scene,camera);`);await route.fulfill({response,body});
  });
  await page.setViewportSize({width:1440,height:960});await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  const info=()=>page.evaluate(()=>(window as any).townProbe?.info());
  await expect.poll(async()=>(await info())?.ready,{timeout:90000}).toBe(true);
  expect((await info()).water).toEqual(['basin-water','urn-water-stream']);expect((await info()).assets).toBe(10);expect((await info()).layout.buildings.length).toBe(38);
  await expect(page.locator('.terrain-minimap-buildings rect')).toHaveCount(37);
  const go=async(p:{x:number;z:number})=>{
    await page.evaluate(p=>(window as any).townProbe.go(p),p);
    await expect.poll(async()=>{const s=await info();return !s.moving&&Math.hypot(s.position[0]-p.x,s.position[2]-p.z)<.08;},{timeout:40000}).toBe(true);
  };
  await expect(page.locator('.terrain-minimap-buildings circle')).toHaveCount(1);
  await go({x:0,z:25});await go({x:0,z:-25});await go({x:0,z:25});await page.screenshot({path:'test-results/terrain-town/plaza-player.png'});
  const review=async(position:number[],target:number[],name:string)=>{
    await page.evaluate(v=>{(window as any).townReview=v;},{position,target});await page.waitForTimeout(150);
    await page.screenshot({path:`test-results/terrain-town/${name}.png`});
    await page.evaluate(()=>{(window as any).townReview=undefined;});
  };
  await review([60,140,145],[0,0,0],'plaza');
  await review([40,46,68],[0,12,0],'fountain-close');
  await review([0,90,12],[0,5,0],'fountain-overhead');
  await go({x:65,z:70});await page.screenshot({path:'test-results/terrain-town/neighbourhood.png'});
  await go({x:0,z:-189});expect((await info()).position[1]).toBeCloseTo(4.9,2);
  await page.screenshot({path:'test-results/terrain-town/castle-player.png'});
  await review([78,80,-103],[0,24,-215],'castle-crossing');
  await go({x:0,z:25});
  const day=(await info()).emissives;expect(day.length).toBe(5);
  await openSettings(page);await page.locator('[data-hour="22"]').click();await closeSettings(page);
  await expect.poll(async()=>(await info()).emissives[0]).toBeGreaterThan(day[0]);
  await review([40,46,68],[0,12,0],'fountain-night');
  await review([50,45,65],[20,7,0],'market-night');
  expect(errors).toEqual([]);
});
