import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

for(const area of ['city','west-march'])test(area+' continues beyond all map edges, fades into fog and culls distant batches',async({page})=>{
  test.setTimeout(150000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error' && /shader|WebGL|THREE/i.test(m.text()))errors.push(m.text());});
  page.on('response',r=>{if(new URL(r.url()).hostname==='127.0.0.1' && r.status()>=400)errors.push(r.status()+' '+r.url());});
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.sceneryQA={area,ready:revealed,enter:()=>onWarp('west-march'),
        inspect:()=>({range:viewDistance.inspect(),bounds:new THREE.Box3().setFromObject(surroundings).min.toArray(),
          max:new THREE.Box3().setFromObject(surroundings).max.toArray(),trees:groves.inspect().sceneryCount,
          legalOutside:navigation.canStand({x:270,z:30}),size:TERRAIN.size,
          patches:terrain.children.filter(o=>o.name==='terrain-patch').length,
          calls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};
      const probe=window.sceneryProbe;
      if(probe){
        const [x,z,low]=probe,dir=new THREE.Vector3(x,0,z).normalize();
        focus.set(x,terrainHeight(data,x,z),z);
        const mine=views.get(network.room?.sessionId);if(mine)mine.mesh.position.copy(focus);
        camera.position.copy(focus).addScaledVector(dir,low?-15:-60);camera.position.y+=low?12:48;
        camera.lookAt(focus.clone().addScaledVector(dir,low?160:45));camera.updateMatrixWorld(true);
        daylight.update(camera,focus);viewDistance.update(focus);
        groves.update(camera,focus,0);bankGrass.update(camera,focus,0);
      }
      renderer.render(scene, camera);`);
    await route.fulfill({response,body});
  });
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await page.waitForFunction(()=>(window as any).sceneryQA?.ready);
  if(area==='west-march'){
    await page.evaluate(()=>(window as any).sceneryQA.enter());
    await page.waitForFunction(()=>{const q=(window as any).sceneryQA;return q?.ready&&q.area==='west-march';});
  }
  await expect(page.locator('.scene-loading')).toBeHidden();
  const info=await page.evaluate(()=>(window as any).sceneryQA.inspect());
  expect(info.bounds[0]).toBe(-750);expect(info.bounds[2]).toBe(-750);
  expect(info.max[0]).toBe(750);expect(info.max[2]).toBe(750);
  expect(info.size).toBe(500);expect(info.legalOutside).toBe(false);expect(info.patches).toBe(144);
  expect(info.trees).toBeGreaterThan(300);expect(info.range.radius).toBe(500);
  expect(info.range.visible).toBeLessThan(info.range.batches);
  for(const [name,point] of Object.entries({east:[238,30],west:[-238,-30],north:[30,-238],south:[-30,238],corner:[238,238],horizon:[238,0,1]})){
    await page.evaluate(p=>{(window as any).sceneryProbe=p;},point);
    await page.waitForTimeout(150);
    await page.screenshot({path:'test-results/scenery/'+area+'-'+name+'.png'});
  }
  const edges=await page.evaluate(async()=>{
    const {sceneryHeight,boundarySample}=await import('/src/terrain/world-surroundings.ts');
    const {loadTerrainData}=await import('/src/terrain/terrain-data.ts');
    const {buildWestMarch}=await import('/shared/west-march.mjs');
    const data=(window as any).sceneryQA.area==='city'?await loadTerrainData():buildWestMarch();
    let maxError=0;
    for(let i=0;i<data.side;i++)for(const [x,z] of [[-250,i*500/(data.side-1)-250],[250,i*500/(data.side-1)-250],[i*500/(data.side-1)-250,-250],[i*500/(data.side-1)-250,250]])
      maxError=Math.max(maxError,Math.abs(sceneryHeight(data,x,z)-boundarySample(data,data.heights,x,z)));
    return maxError;
  });
  expect(edges).toBeLessThan(.000001);
  console.log(area,info);
  expect(errors).toEqual([]);
});

test('distance visibility restores hidden chunks when the player approaches',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const source=await (await fetch('/src/terrain/view-distance.ts')).text();
    const threePath=source.match(/from [\"']([^\"']*three[^\"']*)[\"']/)![1];
    const THREE=await import(threePath);
    const {createViewDistance}=await import('/src/terrain/view-distance.ts');
    const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
    const a=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial());group.add(a);
    const b=a.clone();b.position.x=700;group.add(b);
    const c=createViewDistance(scene);c.addStatic(group);c.update(new THREE.Vector3());
    const first=[a.visible,b.visible];c.update(new THREE.Vector3(700,0,0));
    return {first,second:[a.visible,b.visible]};
  });
  expect(result).toEqual({first:[true,false],second:[false,true]});
});
