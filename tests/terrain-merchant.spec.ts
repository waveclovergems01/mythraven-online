import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('Elra greets a customer who clicks and walks up to the stall',async({page})=>{
  test.setTimeout(120000);
  await page.route('**/src/terrain/elra.ts*',async route=>{
    const response=await route.fetch();
    const source=(await response.text()).replace('mixer.update(step);','mixer.update(step);window.elraClips.add(active.getClip().name);');
    await route.fulfill({response,body:source});
  });
  await page.addInitScript(()=>{(window as any).elraClips=new Set();});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const source=(await response.text()).replace('renderer.render(scene, camera);',`
      window.vendorQA = {ready:network.connected, walk:()=>moveToPoint({x:26,z:26}),
        arrived:Math.hypot(focus.x-26,focus.z-26)<.1, distance:Math.hypot(focus.x-29,focus.z-20),
        rushIdle:()=>{for(let i=0;i<800;i++) elra.update(.1);},
        screen:()=>{const p=elra.group.position.clone();p.y+=1.5;p.project(camera);
          const b=canvas.getBoundingClientRect();return [b.left+(p.x+1)*b.width/2,b.top+(1-p.y)*b.height/2];}};
      renderer.render(scene,camera);`);
    await route.fulfill({response,body:source});
  });
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await page.waitForFunction(()=>(window as any).vendorQA?.ready,null,{timeout:90000});
  await page.evaluate(()=>{(window as any).vendorQA.walk();});
  await page.waitForFunction(()=>(window as any).vendorQA.arrived,null,{timeout:40000});
  await page.evaluate(()=>{(window as any).vendorQA.rushIdle();});
  expect(await page.evaluate(()=>Array.from((window as any).elraClips))).toContain('n_idle_call');
  const [x,y]=await page.evaluate(()=>(window as any).vendorQA.screen());await page.mouse.click(x,y);
  await page.waitForFunction(()=>(window as any).elraClips.has('n_idle_welcome'),null,{timeout:12000});
  expect(await page.evaluate(()=>(window as any).vendorQA.distance)).toBeLessThan(2.7);
  await page.screenshot({path:'test-results/terrain-town/elra-market.png'});
});
