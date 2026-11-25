import { chooseCharacter } from './helpers/character-selection';
import { test, expect } from '@playwright/test';
import { closeSettings, openSettings, setWheelZoom } from './helpers/game-settings';

test('layered ground, clear animated river and reduced-motion surface render without shader errors', async ({ page }) => {
  const errors: string[] = [];
  const loadedTiles = new Set<string>();
  page.on('response', response => {
    if (response.url().includes('/assets/tiles/') && response.ok()) loadedTiles.add(new URL(response.url()).pathname);
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  // Test-only camera framing puts the nearby bank in view without changing gameplay controls.
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    expect(source).toContain('renderer.render(scene, camera);');
    const code = source.replace('renderer.render(scene, camera);', `
      const probe=window.surfaceProbe;
      if(probe){ camera.position.set(focus.x+(probe.x||0),focus.y+45,focus.z+55+probe.offset);
        camera.lookAt(focus.x+(probe.x||0),probe.y??focus.y,focus.z+probe.offset); camera.updateMatrixWorld();
        for(const entry of views.values()) {
          const point=entry.mesh.position.clone(); point.y+=3.3; point.project(camera);
          entry.label.style.left=((point.x+1)/2*host.clientWidth)+'px';
          entry.label.style.top=((1-point.y)/2*host.clientHeight)+'px';
        }
      }
      window.grassHarness={ count:bankGrass.count, position:focus.toArray(), moving:network.players.get(network.room?.sessionId)?.moving,
        moveToEdge:()=>{
          let best, distance=Infinity;
          for(let i=0;i<data.heights.length;i++) {
            if(data.shoreDistance[i]<5.5||data.shoreDistance[i]>6.8) continue;
            const x=(i%data.side)/(data.side-1)*500-250,z=Math.floor(i/data.side)/(data.side-1)*500-250;
            const d=Math.hypot(x-focus.x,z-focus.z);
            if(z>focus.z&&d<distance&&navigation.canStand({x,z})){ best={x,z};distance=d; }
          }
          if(best) network.move(best.x,best.z); return best;
        }
      };
      if(window.grassOpaque) bankGrass.update(camera,undefined,0);
      renderer.render(scene, camera);`);
    await route.fulfill({ response, body: code });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/'); await page.selectOption('#language', 'th'); await page.locator('#guest').click(); await chooseCharacter(page);
  await expect(page.locator('#game canvas')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#network-status')).toHaveAttribute('data-connected', 'true');
  await expect(page.locator('.world-player-name[data-player-id]')).toHaveCount(1);
  await openSettings(page);
  await page.locator('#world-time-auto').uncheck();
  await page.locator('#world-time').fill('12');
  await closeSettings(page);
  const coverage = await page.evaluate(async () => {
    const dataPath='/src/terrain/terrain-data.ts', materialPath='/src/terrain/terrain-materials.ts';
    const {loadTerrainData}=await import(dataPath), {terrainGrassCoverage}=await import(materialPath);
    const data=await loadTerrainData(), result=terrainGrassCoverage(data);
    return { fraction: result.coverage, wetGrass: result.weights.some((w: number,i: number)=>data.heights[i]<=0&&w>0) };
  });
  expect(coverage.fraction).toBeCloseTo(.8, 3); expect(coverage.wetGrass).toBe(false);
  expect([...loadedTiles].sort()).toEqual(['painted-grass-v002','painted-earth-v001','painted-grass-earth-v001','painted-city-stone-v001'].map(name=>`/assets/tiles/terrain/${name}.png`).sort());
  await page.screenshot({ path:'test-results/terrain-materials/ground.png' });
  for (const percentage of [50,200] as const) {
    await setWheelZoom(page,percentage);
    await page.screenshot({ path:`test-results/terrain-materials/ground-${percentage}.png` });
  }
  await setWheelZoom(page,100);
  // Inspect actual painted clearings/transitions as well as the grassy spawn area.
  const samples = await page.evaluate(async () => {
    const dataPath='/src/terrain/terrain-data.ts', materialPath='/src/terrain/terrain-materials.ts';
    const movementPath='/src/terrain/terrain-movement.ts';
    const {loadTerrainData}=await import(dataPath), {terrainGrassCoverage}=await import(materialPath);
    const {TerrainMovement}=await import(movementPath);
    const data=await loadTerrainData(), weights=terrainGrassCoverage(data).weights, navigation=new TerrainMovement(data);
    const focus=(window as any).grassHarness.position;
    return [.08,.5].map(weight=>{
      let best: any, nearest=Infinity;
      for(let i=0;i<weights.length;i++) {
        if(Math.abs(weights[i]-weight)>.03||data.shoreDistance[i]<16)continue;
        const x=i%data.side/(data.side-1)*500-250,z=Math.floor(i/data.side)/(data.side-1)*500-250;
        if(!navigation.canStand({x,z}))continue;
        const d=Math.hypot(x-focus[0],z-focus[2]);
        if(d<nearest){nearest=d;best={x:x-focus[0],offset:z-focus[2]};}
      }
      return best;
    });
  });
  for(let index=0;index<samples.length;index++) {
    expect(samples[index]).toBeTruthy();
    await page.evaluate(probe=>{(window as any).surfaceProbe=probe;},samples[index]);
    await page.waitForTimeout(150);
    await page.screenshot({path:`test-results/terrain-materials/paint-blend-${index}.png`});
  }
  await page.evaluate(async () => {
    const dataPath='/src/terrain/terrain-data.ts';
    const {loadTerrainData}=await import(dataPath), data=await loadTerrainData();
    const [focusX,,focusZ]=(window as any).grassHarness.position;
    let nearest=Infinity, probe;
    for (let i=0;i<data.heights.length;i++) {
      if (data.heights[i]>-3) continue;
      const x=i%data.side/(data.side-1)*500-250-focusX;
      const offset=Math.floor(i/data.side)/(data.side-1)*500-250-focusZ;
      const distance=Math.hypot(x,offset);
      if (distance<nearest) { nearest=distance; probe={x,offset,y:0}; }
    }
    if (!probe) throw new Error('Missing riverbed for surface probe');
    (window as any).surfaceProbe=probe;
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path:'test-results/terrain-materials/riverbank.png' });
  const waterClip={x:650,y:440,width:140,height:80};
  const movingA=await page.screenshot({clip:waterClip}); await page.waitForTimeout(500);
  const movingB=await page.screenshot({clip:waterClip}); expect(movingA.equals(movingB)).toBe(false);
  await page.emulateMedia({ reducedMotion:'reduce' }); await page.waitForTimeout(150);
  const stillA=await page.screenshot({clip:waterClip}); await page.waitForTimeout(350);
  const stillB=await page.screenshot({clip:waterClip}); expect(stillA.equals(stillB)).toBe(true);
  await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(150);
  await page.screenshot({path:'test-results/terrain-materials/riverbank-mobile.png'});
  await page.setViewportSize({width:1440,height:960});
  await page.evaluate(() => { (window as any).surfaceProbe=undefined; });
  const edge=await page.evaluate(() => (window as any).grassHarness.moveToEdge());
  expect(edge).toBeTruthy();
  await expect.poll(()=>page.evaluate(()=>(window as any).grassHarness.moving)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).grassHarness.moving),{timeout:10000}).toBe(false);
  expect(await page.evaluate(()=>(window as any).grassHarness.count)).toBeGreaterThan(1000);
  await page.screenshot({path:'test-results/terrain-materials/grass-fade.png'});
  const characterClip={x:665,y:420,width:110,height:120};
  const faded=await page.screenshot({clip:characterClip});
  await page.evaluate(() => { (window as any).grassOpaque=true; }); await page.waitForTimeout(100);
  const opaque=await page.screenshot({clip:characterClip});
  expect(faded.equals(opaque)).toBe(false);
  await page.screenshot({path:'test-results/terrain-materials/grass-opaque-comparison.png'});
  expect(errors).toEqual([]);
});
