import { chooseCharacter } from './helpers/character-selection';
import { openSettings, closeSettings } from './helpers/game-settings';
import { test, expect } from '@playwright/test';

test('direction changes survive mouse travel during each press and release', async ({ page }) => {
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+
      '\nconst mountGestureTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountGestureTest(...args);window.gestureWorld=w;return w;};'});
  });
  await page.setViewportSize({width:1440,height:960}); await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled();
  await openSettings(page); await page.locator('#walk-speed').focus(); await page.locator('#walk-speed').press('End'); await closeSettings(page);
  const state=()=>page.evaluate(()=>(window as any).gestureWorld.inspect());
  // Inspect the command in the same event turn. At 5x speed a short route can
  // finish between Playwright's mouse.down RPC and its next evaluate RPC.
  await page.evaluate(() => document.querySelector('#game canvas')!.addEventListener('pointerdown', () => {
    (window as any).gesturePress = (window as any).gestureWorld.inspect();
  }));
  await page.mouse.click(1040,430);
  await page.mouse.move(450,430); await page.mouse.down();
  await page.mouse.move(390,410,{steps:3}); await page.mouse.up();
  const reverse=await state();
  expect(reverse.destination?.x).toBeLessThan(reverse.player.x);
  const directions=[{x:1040,y:430,axis:'x',sign:1},{x:450,y:430,axis:'x',sign:-1},
    {x:720,y:300,axis:'z',sign:-1},{x:720,y:600,axis:'z',sign:1}] as const;
  for(let i=0;i<12;i++) {
    const direction=directions[i%directions.length];
    await page.mouse.move(direction.x,direction.y); await page.mouse.down();
    // The new destination must exist before release, independent of hand movement.
    const pressed=await page.evaluate(() => (window as any).gesturePress);
    expect((pressed.destination[direction.axis]-pressed.player[direction.axis])*direction.sign).toBeGreaterThan(0);
    const destination=pressed.destination;
    await page.mouse.move(direction.x+60,direction.y+20,{steps:2}); await page.mouse.up();
    const released = await state(), endpoint = released.destination ?? released.player;
    expect(endpoint.x).toBeCloseTo(destination.x, 4);
    expect(endpoint.z).toBeCloseTo(destination.z, 4);
  }
  const last = await state(), target = last.destination ?? last.player;
  await expect.poll(async()=>(await state()).moving).toBe(false);
  const final=await state();
  expect(final.player.x).toBeCloseTo(target.x,2);
  expect(final.players[final.id].x).toBeCloseTo(target.x,2);
  expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe('');
});

test('5x rapid redirects predict before delayed acknowledgement and converge on the final click', async ({ page }) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+
      '\nconst mountInputTest=mountTerrainWorld;mountTerrainWorld=async(...args)=>{const w=await mountInputTest(...args);window.inputWorld=w;return w;};'});
  });
  await page.route('**/src/network/terrain-client.ts*',async route=>{
    const response=await route.fetch(), source=await response.text();
    // 150ms in each direction at the transport/snapshot boundary; real server still runs.
    let code=source.replace(/this\.room\?\.send\(["']move["'], \{ x, z, seq: \+\+this\.inputSeq \}\);/,
      'const seq=++this.inputSeq, sendingRoom=this.room; setTimeout(()=>{if(this.room===sendingRoom&&this.connected)sendingRoom?.send("move",{x,z,seq});},150);');
    expect(code).not.toBe(source);
    expect(code).toContain('this.snapshot?.(mine);');
    code=code.replace('this.snapshot?.(mine);','setTimeout(()=>{if(current()&&this.connected)this.snapshot?.(mine);},150);');
    code+='\nconst connectInputTest=TerrainClient.prototype.connect;TerrainClient.prototype.connect=async function(...args){window.inputNetwork=this;return connectInputTest.apply(this,args);};';
    await route.fulfill({response,body:code});
  });
  await page.setViewportSize({width:1440,height:960}); await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#walk-speed')).toBeEnabled(); await page.waitForTimeout(250);
  await openSettings(page); await page.locator('#walk-speed').focus(); await page.locator('#walk-speed').press('End'); await closeSettings(page); await page.waitForTimeout(250);
  const state=()=>page.evaluate(()=>(window as any).inputWorld.inspect());
  const start=await state();
  await page.mouse.click(1020,460); await page.waitForTimeout(65);
  const predicted=await state();
  // The client predicts rotation immediately, before the delayed server sees
  // this click. Translation now correctly waits for the character to face it.
  expect(predicted.heading).toBeGreaterThan(start.heading + .1);
  expect(predicted.players[start.id].x).toBeCloseTo(start.players[start.id].x,3);
  for(let i=0;i<12;i++) {
    await page.mouse.click(i%2?470:1020,440);
    const current=await state();
    expect(current.destination).toBeTruthy();
    expect(i%2?current.destination.x<current.player.x:current.destination.x>current.player.x).toBe(true);
    await page.waitForTimeout(30);
  }
  const finalTarget=(await state()).destination;
  const finalSeq=await page.evaluate(()=>(window as any).inputNetwork.nextInputSeq-1);
  await expect.poll(async()=>(await state()).players[start.id].inputSeq).toBe(finalSeq);
  await expect.poll(async()=>(await state()).moving,{timeout:10000}).toBe(false);
  const done=await state();
  expect(done.player.x).toBeCloseTo(finalTarget.x,2); expect(done.player.z).toBeCloseTo(finalTarget.z,2);
  expect(done.player.x).toBeCloseTo(done.players[start.id].x,2);
  expect(done.player.z).toBeCloseTo(done.players[start.id].z,2);
  // Stop cancels both prediction and any delayed unacknowledged destinations.
  await page.mouse.click(1020,440);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur'))); await page.waitForTimeout(500);
  const stopped=await state(); expect(stopped.moving).toBe(false);
  await page.waitForTimeout(200); expect((await state()).player).toEqual(stopped.player);
  await page.screenshot({path:'test-results/terrain-input/rapid-5x.png'});
  expect(errors).toEqual([]);
});
