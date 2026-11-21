import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import sharp from 'sharp';
import { chooseCharacter } from './helpers/character-selection';
import { setWheelZoom } from './helpers/game-settings';

test('front sunlight casts animated rear shadows for both classes and follows the visible map', async ({page}) => {
  test.setTimeout(120000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error' && /THREE|WebGL|shader|GL_INVALID/.test(m.text()))errors.push(m.text());});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.shadowProbe={
        enabled:value=>sun.shadow.intensity=value?1:0,
        go:(x,z)=>network.move(x,z),
        info:()=>({focus:focus.toArray(),light:sun.position.toArray(),target:sun.target.position.toArray(),
          live:sun.shadow.autoUpdate,halfWidth:sun.shadow.camera.right,
          avatars:[...views.values()].map(v=>({state:v.avatar.inspect(),position:v.mesh.position.toArray(),
            surfaces:(()=>{const a=[];v.mesh.traverse(o=>{if(o.isMesh&&o.userData.playerSurface&&o.visible)a.push({cast:o.castShadow,receive:o.receiveShadow});});return a;})()}))})};
      renderer.render(scene, camera);`);
    await route.fulfill({response,body});
  });
  await page.setViewportSize({width:1440,height:960});await page.goto('/');await page.locator('#guest').click();
  await chooseCharacter(page,'warrior-male-02');await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
  await expect(page.locator('.world-player-name')).toHaveCount(1);
  await setWheelZoom(page,200);
  const info=()=>page.evaluate(()=>(window as any).shadowProbe.info());
  const lighting=await info();expect(lighting.live).toBe(true);
  expect(lighting.light[0]-lighting.target[0]).toBeCloseTo(0);
  expect(lighting.light[2]-lighting.target[2]).toBeGreaterThan(200);
  expect(lighting.avatars[0].surfaces.every((s:any)=>s.cast&&s.receive)).toBe(true);
  const captureDifference=async(name:string)=>{
    await page.evaluate(()=>(window as any).shadowProbe.enabled(true));await page.waitForTimeout(120);
    const on=await page.screenshot({path:`test-results/terrain-shadows/${name}.png`});
    await page.evaluate(()=>(window as any).shadowProbe.enabled(false));await page.waitForTimeout(120);
    const off=await page.screenshot({path:`test-results/terrain-shadows/${name}-no-shadow.png`});
    const a=await sharp(on).removeAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(off).removeAlpha().raw().toBuffer();
    // The region behind the centered avatar includes the projected head/arm shadow.
    let darkened=0;
    for(let y=300;y<440;y++)for(let x=650;x<790;x++){
      const i=(y*a.info.width+x)*a.info.channels;
      if(b[i]+b[i+1]+b[i+2]-a.data[i]-a.data[i+1]-a.data[i+2]>35)darkened++;
    }
    expect(darkened).toBeGreaterThan(30);
    await page.evaluate(()=>(window as any).shadowProbe.enabled(true));
  };
  await captureDifference('warrior-rear-shadow');
  const peer=await new Client('ws://127.0.0.1:'+(process.env.GAME_PORT||'5275')).joinOrCreate('mythraven-world',{characterId:'novice-male-01'});
  peer.reconnection.enabled=false;
  try {
    await expect.poll(async()=>(await info()).avatars.length,{timeout:30000}).toBe(2);
    expect((await info()).avatars.every((a:any)=>a.surfaces.every((s:any)=>s.cast&&s.receive))).toBe(true);
    await page.mouse.click(1150,350);
    await expect.poll(async()=>(await info()).avatars.find((a:any)=>a.state.model==='warrior').state.clip).toBe('n_run');
    await page.screenshot({path:'test-results/terrain-shadows/running.png'});
    await page.evaluate(()=>(window as any).shadowProbe.go(55,80));
    await expect.poll(async()=>Math.abs((await info()).focus[0]-55),{timeout:20000}).toBeLessThan(.2);
    await expect.poll(async()=>(await info()).avatars.find((a:any)=>a.state.model==='warrior').state.clip).toBe('n_idle');
    const moved=await info();expect(Math.abs(moved.target[0]-moved.focus[0])).toBeLessThan(.1);
    await captureDifference('away-from-oak');
    await setWheelZoom(page,50);
    await page.waitForTimeout(150);expect((await info()).halfWidth).toBeGreaterThan(lighting.halfWidth*2);
    await page.screenshot({path:'test-results/terrain-shadows/wide.png'});
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
    await page.screenshot({path:'test-results/terrain-shadows/mobile.png'});
    expect(errors).toEqual([]);
  } finally {await peer.leave();}
});
