import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('walk through the west crossing, meet passive wildlife and return to the west gate',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const source=(await response.text()).replace('renderer.render(scene, camera);',`
      window.crossingQA={
        area, ready:network.connected, enter:()=>moveToPoint(portal), distance:focus.distanceTo(warp.position),
        cross:()=>moveToPoint({x:133,z:28}), crossed:focus.x<136, selected:selectedPlayer,
        following:approach?.id, playerX:focus.x,playerZ:focus.z,
        marker:marker.visible, outline:selectedPlayer && wildlife?.targets.get(selectedPlayer)?.model.getObjectByName('player-outline')?.visible,
        aim:(id)=>{
          const a=wildlife.targets.get(id),p=a.position.clone();p.y+=a.height*.65;p.project(camera);
          const b=canvas.getBoundingClientRect();return [b.left+(p.x+1)*b.width/2,b.top+(1-p.y)*b.height/2];
        },
        gap:selectedPlayer&&wildlife?.targets.get(selectedPlayer)?.position.distanceTo(focus),
        close:wildlife?.group.children.some(a=>a.position.distanceTo(focus)<5),
        animals:wildlife?.group.children.map(a=>({name:a.name,x:a.position.x,z:a.position.z})) ?? []
      };
      renderer.render(scene,camera);`);
    await route.fulfill({response,body:source});
  });
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  const arrival=async(area:string)=>page.waitForFunction(a=>{
    const qa=(window as any).crossingQA;return qa?.area===a && qa.ready;
  },area,{timeout:90000});
  await arrival('city');
  await page.evaluate(()=>(window as any).crossingQA.enter());
  await arrival('west-march');
  const positions=()=>page.evaluate(()=>(window as any).crossingQA.animals as {name:string;x:number;z:number}[]);
  const first=await positions();
  expect(first.length).toBeGreaterThan(45);
  await expect(page.locator('[data-monster]')).toHaveCount(first.length);
  for(const species of ['rabbit','wolf']){
    expect(first.filter(a=>a.name.startsWith(species)).length).toBeGreaterThan(2);
    await expect.poll(async()=>(await positions()).some((a,i)=>a.name.startsWith(species)&&Math.hypot(a.x-first[i].x,a.z-first[i].z)>.2)).toBeTruthy();
  }
  await page.screenshot({path:'test-results/west-march/arrival.png'});
  const clickAnimal=async(id:string)=>{
    const [x,y]=await page.evaluate(id=>(window as any).crossingQA.aim(id),id);await page.mouse.click(x,y);
    await page.waitForFunction(id=>(window as any).crossingQA.selected===id,id);
    await expect(page.locator('.monster-name')).toBeVisible();
    await page.waitForFunction(()=>{const q=(window as any).crossingQA;return q.outline && !q.marker;});
    await page.waitForFunction(()=>(window as any).crossingQA.gap<3.2,null,{timeout:15000});
  };
  await clickAnimal('wolf-1');await expect(page.locator('.monster-name')).toContainText(/Ashfur|แอชเฟอร์/);
  await clickAnimal('rabbit-0');await expect(page.locator('.monster-name')).toContainText(/Clover|โคลเวอร์/);
  const start=await page.evaluate(()=>[(window as any).crossingQA.playerX,(window as any).crossingQA.playerZ]);
  await page.waitForFunction(([x,z])=>{
    const q=(window as any).crossingQA;
    return q.following==='rabbit-0' && q.gap<3.3 && Math.hypot(q.playerX-x,q.playerZ-z)>3;
  },start,{timeout:25000});
  await page.screenshot({path:'test-results/west-march/meadow.png'});
  await page.evaluate(()=>(window as any).crossingQA.cross());
  await page.waitForFunction(()=>(window as any).crossingQA.crossed,null,{timeout:20000});
  await expect(page.locator('.monster-name')).toBeHidden();
  await page.evaluate(()=>(window as any).crossingQA.enter());
  await arrival('city');
  const distance=await page.evaluate(()=>(window as any).crossingQA.distance);
  expect(distance).toBeGreaterThan(3); expect(distance).toBeLessThan(16);
  expect(errors).toEqual([]);
});
