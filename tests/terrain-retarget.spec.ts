import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('rapid monster clicks keep the latest visible target while walking',async({page})=>{
  test.setTimeout(90000);
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.switchQA={ready:network.connected,area,enter:()=>onWarp('west-march'),
        click:()=>{
          const bounds=canvas.getBoundingClientRect();
          for(const [id,animal] of wildlife.targets){
            if(!animal.alive || !animal.model || id===selectedPlayer || animal.position.distanceTo(focus)>30)continue;
            const p=animal.position.clone();p.y+=animal.height*.62;p.project(camera);
            const x=bounds.x+(1+p.x)*bounds.width/2,y=bounds.y+(1-p.y)*bounds.height/2;
            if(document.elementFromPoint(x,y)!==canvas)continue;
            aimPointer(x,y);if(pickPlayer()!==id)continue;
            const before=performance.now();
            canvas.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,button:0,isPrimary:true,pointerType:'mouse'}));
            return {selected:selectedPlayer===id,ms:performance.now()-before};
          }
        }};
      renderer.render(scene,camera);`);
    await route.fulfill({response,body});
  });
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await page.waitForFunction(()=>(window as any).switchQA?.ready);
  await page.keyboard.press('i');await page.locator('[data-item=dagger]').click({button:'right'});await page.keyboard.press('i');
  await page.evaluate(()=>(window as any).switchQA.enter());
  await page.waitForFunction(()=>{const q=(window as any).switchQA;return q?.ready && q.area==='west-march';});
  const metrics=await page.evaluate(async()=>{
    const handlers:number[]=[],frames:number[]=[];let previous=0,missed=0;
    for(let i=0;i<100 && handlers.length<30;i++){
      const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));
      if(previous)frames.push(now-previous);previous=now;
      if(i<6 || i%2)continue;
      const result=(window as any).switchQA.click();if(!result)continue;
      handlers.push(result.ms);if(!result.selected)missed++;
    }
    const p95=(a:number[])=>a.sort((x,y)=>x-y)[Math.floor(a.length*.95)];
    return {clicks:handlers.length,missed,handlerP95:p95(handlers),frameP95:p95(frames)};
  });
  console.log('Frontier retarget',metrics);
  expect(metrics.clicks).toBe(30);expect(metrics.missed).toBe(0);
});
