import {test,expect,type Page} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('a suspended tab keeps hunting and other players observe its kills and new targets',async({page,browser})=>{
  test.setTimeout(120000);
  const context=await browser.newContext(),other=await context.newPage();
  const errors:string[]=[];
  async function enter(tab:Page){
    tab.on('pageerror',e=>errors.push(e.message));
    await tab.route('**/src/terrain/TerrainWorld.ts*',async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace('renderer.render(scene, camera);',`
        window.backgroundQA={network,area,enter:()=>onWarp('west-march'),position:()=>prediction.position,
          prepare:async()=>{
            for(let i=0;i<30;i++)await profile.change({kind:'level'});
            await profile.change({kind:'allocate',increases:{AGI:98,STR:40}});
          },read:id=>network.players.get(id)};
        renderer.render(scene, camera);`);
      await route.fulfill({response,body});
    });
    await tab.goto('/');await tab.locator('#guest').click();await chooseCharacter(tab);
    await tab.waitForFunction(()=>(window as any).backgroundQA?.network.connected);
  }
  const cdp=await page.context().newCDPSession(page);
  try{
    await enter(page);
    const spawn=await page.evaluate(()=>(window as any).backgroundQA.position());
    expect(Math.abs(spawn.x)).toBeLessThan(6);expect(spawn.z).toBeGreaterThan(20);expect(spawn.z).toBeLessThan(35);
    await page.screenshot({path:'test-results/combat/fountain-spawn.png'});
    await page.keyboard.press('i');await page.locator('[data-item=dagger]').click({button:'right'});await page.keyboard.press('i');
    await page.evaluate(async()=>{await (window as any).backgroundQA.prepare();(window as any).backgroundQA.enter();});
    await page.waitForFunction(()=>{const q=(window as any).backgroundQA;return q?.area==='west-march' && q.network.connected;});
    const id=await page.evaluate(()=>(window as any).backgroundQA.network.room.sessionId);
    await enter(other);await other.evaluate(()=>(window as any).backgroundQA.enter());
    await other.waitForFunction(id=>{const q=(window as any).backgroundQA;return q?.area==='west-march' && q.read(id);},id);
    await other.evaluate(id=>{
      const w=window as any;w.observedKills=[];
      w.backgroundQA.network.room.onMessage('combat-hit',(event:any)=>{if(event.player===id && event.to==='monster' && event.lethal)w.observedKills.push(event.mob);});
    },id);
    await page.bringToFront();await page.keyboard.press('Control+a');
    await page.waitForFunction(()=>(window as any).backgroundQA.network.players.get((window as any).backgroundQA.network.room.sessionId)?.autoHunt);
    const before=await other.evaluate(id=>(window as any).backgroundQA.read(id).swing,id);
    await other.bringToFront();
    // Freeze all JS in the hunting tab, a stronger condition than background RAF throttling.
    await cdp.send('Page.setWebLifecycleState',{state:'frozen'});
    await expect.poll(()=>other.evaluate(()=>(window as any).observedKills.length),{timeout:40000}).toBeGreaterThanOrEqual(2);
    const observed=await other.evaluate(id=>({player:(window as any).backgroundQA.read(id),kills:(window as any).observedKills}),id);
    expect(observed.player.swing).toBeGreaterThan(before);
    expect(new Set(observed.kills).size).toBeGreaterThanOrEqual(2);
    expect(observed.player.autoHunt).toBe(true);
    expect(await other.evaluate(()=>(window as any).backgroundQA.network.players.get((window as any).backgroundQA.network.room.sessionId).autoHunt)).toBe(false);
    await cdp.send('Page.setWebLifecycleState',{state:'active'});await page.bringToFront();
    await expect(page.locator('.auto-combat')).toHaveAttribute('aria-pressed','true');
    await expect.poll(()=>page.evaluate(()=>{const q=(window as any).backgroundQA,p=q.read(q.network.room.sessionId),v=q.position();return Math.hypot(p.x-v.x,p.z-v.z);})).toBeLessThan(3);
    await page.screenshot({path:'test-results/combat/background-hunt-resumed.png'});
    await page.keyboard.press('Control+a');
    await expect.poll(()=>other.evaluate(id=>(window as any).backgroundQA.read(id).autoHunt,id)).toBe(false);
    expect(errors).toEqual([]);
  }finally{await cdp.send('Page.setWebLifecycleState',{state:'active'}).catch(()=>{});await context.close();}
});
