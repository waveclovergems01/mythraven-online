import { test, expect } from '@playwright/test';
import { chooseCharacter } from './helpers/character-selection';

test('a ground click paints a visible destination on terrain, bridge decking and approach paving',async({page})=>{
  test.setTimeout(120000);
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      const bridge=fortifications.inspect().bridges.find(b=>b.id==='west');
      const along=window.checkSurface==='approach' ? (bridge.end+bridge.to)/2 : (bridge.start+bridge.end)/2;
      const x=window.checkSurface==='ground' ? 0 : bridge.outward.x*along;
      const z=window.checkSurface==='ground' ? 60 : bridge.outward.z*along;
      camera.position.set(x,30,z+8);camera.lookAt(x,terrainHeight(data,x,z),z);camera.updateMatrixWorld();
      renderer.render(scene, camera);
      window.bridgeCheck={ready:prediction.ready, visible:marker.visible, painted:()=>{
        if(!marker.visible || Math.hypot(marker.position.x-x,marker.position.z-z)>.5) return 0;
        const gl=renderer.getContext(), p=marker.position.clone().project(camera);
        const left=Math.round((p.x+1)*canvas.width/2)-32,bottom=Math.round((p.y+1)*canvas.height/2)-32;
        const pixels=()=>{const bytes=new Uint8Array(64*64*4);gl.readPixels(left,bottom,64,64,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
        renderer.render(scene,camera);const withRing=pixels();
        marker.visible=false;renderer.render(scene,camera);const withoutRing=pixels();
        marker.visible=true;renderer.render(scene,camera);
        let changed=0;
        for(let i=0;i<withRing.length;i+=4)if(Math.abs(withRing[i]-withoutRing[i])+Math.abs(withRing[i+1]-withoutRing[i+1])+Math.abs(withRing[i+2]-withoutRing[i+2])>24)changed++;
        return changed;
      }};
    `);
    await route.fulfill({response,body});
  });
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await expect.poll(()=>page.evaluate(()=>(window as any).bridgeCheck?.ready),{timeout:60000}).toBe(true);
  const canvas=page.locator('#game canvas');
  for(const surface of ['deck','approach','ground']){
    await page.evaluate(async value=>{
      (window as any).checkSurface=value;
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    },surface);
    await canvas.click();
    await expect.poll(()=>page.evaluate(()=>(window as any).bridgeCheck.painted())).toBeGreaterThan(12);
  }
});

test('owner walls surround the city and all three gates and bridges carry the player',async({page})=>{
  test.setTimeout(180000);const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/.test(m.text()))errors.push(m.text());});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.fortProbe={go:(p)=>{network.setSpeedLevel(10);prediction.movement.setSpeedLevel(10);if(prediction.move(network.nextInputSeq,p.x,p.z))network.move(p.x,p.z);},
        screen:(p)=>{const v=new THREE.Vector3(p.x,4.908,p.z).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},
        joints:()=>{const meshes=fortifications.group.children.filter(o=>o.isInstancedMesh);const results=[];scene.updateMatrixWorld(true);
          for(const g of fortifications.inspect().gates)for(const sign of [-1,1])for(const distance of [g.joinHalf,g.half-1,g.half+1])for(const height of [3,7,10]){
            const x=g.x+g.tangent.x*distance*sign+g.outward.x*g.joinDepth,z=g.z+g.tangent.z*distance*sign+g.outward.z*g.joinDepth;
            const ray=new THREE.Raycaster(new THREE.Vector3(x+g.outward.x*10,4.9+height,z+g.outward.z*10),new THREE.Vector3(-g.outward.x,0,-g.outward.z),0,20);
            results.push({gate:g.id,sign,distance,height,solid:ray.intersectObjects(meshes,false).length>0});
          }return results;},
        info:()=>({layout:fortifications.inspect(),position:focus.toArray(),moving:prediction.movement.moving||network.players.get(network.room?.sessionId)?.moving,ready:network.connected})};
      if(window.fortOverview){camera.position.set(0,400,340);camera.lookAt(0,0,0);camera.updateMatrixWorld();}
      if(window.fortReview){const v=window.fortReview;camera.position.set(...v.position);camera.lookAt(...v.target);camera.updateMatrixWorld();}
      renderer.render(scene,camera);`);
    await route.fulfill({response,body});
  });
  await page.setViewportSize({width:1440,height:960});await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  const info=()=>page.evaluate(()=>(window as any).fortProbe?.info());
  await expect.poll(async()=>(await info())?.ready,{timeout:60000}).toBe(true);
  await page.screenshot({path:'test-results/fortifications/city-entry.png'});
  await page.evaluate(()=>{(window as any).fortOverview=true;});await page.waitForTimeout(100);
  await page.screenshot({path:'test-results/fortifications/overview.png'});
  await page.evaluate(()=>{(window as any).fortOverview=false;});
  const layout=(await info()).layout;expect(layout.gates.length).toBe(4);expect(layout.bridges.length).toBe(4);
  expect(layout.instances.every((p:any)=>p.sx===p.sy&&p.sy===p.sz)).toBe(true);
  const joints=await page.evaluate(()=>(window as any).fortProbe.joints());expect(joints.filter((p:any)=>!p.solid)).toEqual([]);
  const south=layout.gates.find((g:any)=>g.id==='south');
  expect(south.passage*2).toBeGreaterThan(7);
  await page.evaluate(g=>{(window as any).fortReview={position:[g.x,16,g.z-48],target:[g.x,17,g.z]};},south);
  await page.waitForTimeout(100);await page.screenshot({path:'test-results/fortifications/enlarged-gate.png'});
  await page.evaluate(g=>{(window as any).fortReview={position:[g.x+42,24,g.z+48],target:[g.x+g.half,13,g.z+g.joinDepth]};},south);
  await page.waitForTimeout(100);await page.screenshot({path:'test-results/fortifications/gate-join.png'});
  const southBridge=layout.bridges.find((b:any)=>b.id==='south');
  await page.evaluate(b=>{(window as any).fortReview={position:[65,55,(b.start+b.end)/2],target:[0,4.9,(b.start+b.end)/2]};},southBridge);
  await page.waitForTimeout(100);await page.screenshot({path:'test-results/fortifications/bridge-proportions.png'});
  await page.evaluate(()=>{(window as any).fortReview=undefined;});
  const go=async(p:{x:number;z:number})=>{
    await page.evaluate(p=>(window as any).fortProbe.go(p),p);
    await expect.poll(async()=>{const s=await info();return !s.moving&&Math.hypot(s.position[0]-p.x,s.position[2]-p.z)<.05;},{timeout:30000}).toBe(true);
  };
  for(const b of layout.bridges){
    await go({x:0,z:60});
    await go({x:b.outward.x*(b.start+b.end)/2,z:b.outward.z*(b.start+b.end)/2});
    expect((await info()).position[1]).toBeCloseTo(4.9,2);
    await page.screenshot({path:`test-results/fortifications/${b.id}-bridge.png`});
    const clicked={x:b.outward.x*((b.start+b.end)/2+6),z:b.outward.z*((b.start+b.end)/2+6)};
    const screen=await page.evaluate(p=>(window as any).fortProbe.screen(p),clicked);
    await page.mouse.click(screen.x,screen.y);
    await expect.poll(async()=>{const s=await info();return Math.hypot(s.position[0]-clicked.x,s.position[2]-clicked.z);},{timeout:10000}).toBeLessThan(.15);
    await go({x:b.outward.x*(b.to-2),z:b.outward.z*(b.to-2)});
    await page.screenshot({path:`test-results/fortifications/${b.id}-outside.png`});
  }
  await go({x:0,z:60});expect(errors).toEqual([]);
});
