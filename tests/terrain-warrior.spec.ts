import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings } from './helpers/game-settings';

test('Warrior previews, both hairstyles and class-specific animations coexist with Novice', async ({page,browser}) => {
  test.setTimeout(150000);
  const errors:string[]=[], requests:string[]=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console',m=>{if(/error|warning/.test(m.type())&&/THREE|WebGL|shader|PropertyBinding/i.test(m.text())) errors.push(m.text());});
  page.on('request',r=>{if(/\/characters\/.+\.glb/.test(r.url())) requests.push(r.url());});
  const hook=async(p:typeof page)=>{
    await p.route('**/src/terrain/TerrainWorld.ts*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+'\nconst mountWarTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountWarTest(...args);window.warWorld=w;return w;};'});});
    await p.route('**/src/terrain/skinned-player.ts*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+'\nconst loadWarTest=loadSkinnedPlayers;loadSkinnedPlayers=async(...args)=>{const f=await loadWarTest(...args);window.warInstances??=[];const create=f.create;f.create=(...args)=>{const a=create(...args);window.warInstances.push(a);return a;};return f;};'});});
  };
  await hook(page);await page.setViewportSize({width:1440,height:960});
  await page.goto('/');await page.locator('#guest').click();
  for(const id of ['warrior-male-01','warrior-male-02']) {
    await page.locator(`input[value="${id}"]`).check();
    await expect(page.locator('#character-preview')).toHaveAttribute('data-character-id',id,{timeout:45000});
    expect(await page.evaluate(()=>{const a=(window as any).warInstances.find((a:any)=>a.group.parent);return a.inspect().clip;})).toBe('n_war_idle');
    await page.screenshot({path:`test-results/terrain-warrior/${id}-preview.png`});
  }
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/terrain-warrior/mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:960});await page.locator('#enter-city').click();
  const state=()=>page.evaluate(()=>(window as any).warWorld?.inspect());
  await expect.poll(async()=>(await state())?.renderedPlayers,{timeout:45000}).toBe(1);
  const mine=(await state()).id;
  expect((await state()).avatars[mine]).toMatchObject({model:'warrior',hairStyle:2,clip:'n_war_idle'});
  await openSettings(page);await page.locator('#camera-zoom').fill('200');await closeSettings(page);
  const label=(await page.locator(`.world-player-name[data-player-id="${mine}"]`).boundingBox())!;
  await page.mouse.move(label.x+label.width/2,label.y+label.height+45);
  await expect.poll(async()=>(await state()).hoveredPlayer).toBe(mine);
  await page.screenshot({path:'test-results/terrain-warrior/outline.png'});
  const otherContext=await browser.newContext({viewport:{width:1440,height:960}}),other=await otherContext.newPage();
  const remote=await new Client('ws://127.0.0.1:'+(process.env.GAME_PORT||'5275')).joinOrCreate('mythraven-world',{characterId:'warrior-male-01'});
  remote.reconnection.enabled=false;
  try {
    await hook(other);await other.goto('/');await other.locator('#guest').click();await chooseCharacter(other);
    await expect.poll(async()=>(await state()).renderedPlayers,{timeout:45000}).toBe(3);
    await expect.poll(()=>other.evaluate(()=>(window as any).warWorld?.inspect().renderedPlayers),{timeout:45000}).toBe(3);
    const peer=await other.evaluate(()=>(window as any).warWorld.inspect());
    expect(peer.avatars[mine]).toMatchObject({model:'warrior',hairStyle:2,clip:'n_war_idle'});
    expect(peer.avatars[remote.sessionId]).toMatchObject({model:'warrior',hairStyle:1,clip:'n_war_idle'});
    expect(peer.avatars[peer.id]).toMatchObject({model:'novice',clip:'n_idle'});
    await page.bringToFront();
    expect(requests.filter(u=>u.endsWith('m1-warrior1.glb'))).toHaveLength(1);
    expect(requests.filter(u=>u.endsWith('warrior-hair-02.glb'))).toHaveLength(1);
    const ownership=await page.evaluate(()=>{
      const groups=(window as any).warInstances.filter((a:any)=>a.group.parent&&a.inspect().model==='warrior').map((a:any)=>a.group);
      const meshes=groups.map((g:any)=>{const m:any[]=[];g.traverse((o:any)=>{if(o.isSkinnedMesh&&o.userData.playerSurface)m.push(o);});return m;});
      return {shared:meshes[0][0].geometry===meshes[1][0].geometry,independent:meshes[0][0].skeleton.bones[0]!==meshes[1][0].skeleton.bones[0],palettes:meshes.map((m:any[])=>new Set(m.map(o=>o.skeleton)).size)};
    });
    expect(ownership).toEqual({shared:true,independent:true,palettes:[1,1]});
    await page.mouse.click(1140,260);
    await expect.poll(async()=>(await state()).avatars[mine].clip).toBe('n_war_run');
    expect((await state()).avatars[peer.id].clip).toBe('n_idle');
    await page.screenshot({path:'test-results/terrain-warrior/run.png'});
    await expect.poll(async()=>(await state()).avatars[mine].clip,{timeout:15000}).toBe('n_war_idle');
    const p=(await state()).players[remote.sessionId];remote.send('move',{x:p.x+18,z:p.z-10});
    await expect.poll(async()=>(await state()).avatars[remote.sessionId].clip).toBe('n_war_run');
    await page.screenshot({path:'test-results/terrain-warrior/mixed-city.png'});
    expect(errors).toEqual([]);
  } finally {await remote.leave();await otherContext.close();}
});

test('switching class during a slow or failed load cannot display or enter the stale model',async({page})=>{
  test.setTimeout(90000);
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/assets/models/characters/m1-warrior1.glb',async route=>{await gate;await route.continue();});
  await page.goto('/');await page.locator('#guest').click();
  await page.locator('input[value="warrior-male-01"]').check();
  await expect(page.locator('#enter-city')).toBeDisabled();
  await page.locator('input[value="novice-male-02"]').check();
  await expect(page.locator('#character-preview')).toHaveAttribute('data-character-id','novice-male-02',{timeout:45000});
  release();await page.waitForTimeout(1500);
  await expect(page.locator('#character-preview')).toHaveAttribute('data-character-id','novice-male-02');
  await page.locator('[data-gender="female"]').click();await expect(page.locator('#enter-city')).toBeDisabled();
  await page.locator('#character-logout').click();
  await page.unroute('**/assets/models/characters/m1-warrior1.glb');
  let fail=true;await page.route('**/assets/models/characters/m1-warrior1.glb',route=>fail?route.abort():route.continue());
  await page.locator('#guest').click();await page.locator('input[value="warrior-male-02"]').check();
  await expect(page.locator('#character-retry')).toBeVisible();await expect(page.locator('#enter-city')).toBeDisabled();
  fail=false;await page.locator('#character-retry').click();
  await expect(page.locator('#character-preview')).toHaveAttribute('data-character-id','warrior-male-02',{timeout:45000});
  await page.locator('#enter-city').click();await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:30000});
});
