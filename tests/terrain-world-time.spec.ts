import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';
import {openSettings,closeSettings} from './helpers/game-settings';
import {worldHour} from '../shared/world-time.mjs';

test('server world time agrees across tabs, survives local clock changes and always uses a shared light bearing',async({page,context})=>{
  test.setTimeout(120000);
  const errors:string[]=[];
  await context.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.timeQA={ready:revealed,clockReady:network.clockReady,server:network.serverNow,
        light:daylight.inspect(),
        resume:()=>document.dispatchEvent(new Event('visibilitychange'))};
      renderer.render(scene, camera);`);
    await route.fulfill({response,body});
  });
  const second=await context.newPage();
  for(const p of [page,second]){
    p.on('pageerror',e=>errors.push(e.message));
    p.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
    await p.goto('/');
    const guest=p.locator('#guest');if(await guest.isVisible())await guest.click();
    await chooseCharacter(p);await p.waitForFunction(()=>(window as any).timeQA?.ready);
    await expect(p.locator('#world-time-auto, #world-time, #sun-direction, .time-presets')).toHaveCount(0);
  }
  await openSettings(page);await expect(page.locator('#reset-camera')).toBeVisible();
  await page.screenshot({path:'test-results/world-time/settings.png'});await closeSettings(page);
  const info=()=>page.evaluate(()=>(window as any).timeQA);
  const a=await info(),b=await second.evaluate(()=>(window as any).timeQA);
  expect(a.clockReady&&b.clockReady).toBe(true);
  expect(Math.abs(a.server-b.server)).toBeLessThan(2500);
  expect(Math.abs(a.light.hour-worldHour(a.server))).toBeLessThan(.001);
  expect(Math.abs(b.light.hour-worldHour(b.server))).toBeLessThan(.001);
  await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+6*3600000;(window as any).timeQA.resume();});
  await page.waitForTimeout(300);
  expect(Math.abs((await info()).server-Date.now())).toBeLessThan(2500);
  expect((await info()).light.bearing).toBe(b.light.bearing);
  const remaining = await info();
  expect(remaining.light.hour).toBeCloseTo(worldHour(remaining.server), 2);
  expect(errors).toEqual([]);await second.close();
});

test('shadows remain visible at 150 metres, fade with fog, and retain fixed coverage when zooming',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/__shadow-distance',r=>r.fulfill({contentType:'text/html',body:'<style>body{margin:0}</style>'}));
  await page.goto('/__shadow-distance');
  const result=await page.evaluate(async()=>{
    const source=await (await fetch('/src/terrain/daylight.ts')).text();
    const THREE=await import(source.match(/from ["']([^"']*three[^"']*)["']/)![1]);
    const {createDaylight}=await import('/src/terrain/daylight.ts');
    const {createViewDistance}=await import('/src/terrain/view-distance.ts');
    const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(1200,500);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    document.body.append(renderer.domElement);
    const camera=new THREE.OrthographicCamera(-30,280,65,-65,.1,1500);
    camera.position.set(0,500,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
    const focus=new THREE.Vector3(),light=createDaylight(scene);light.configure(9,180);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({color:0x739255}));
    plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;scene.add(plane);
    for(const x of [50,145,190,230]){
      const box=new THREE.Mesh(new THREE.BoxGeometry(8,20,8),new THREE.MeshStandardMaterial({color:0x8c7654}));
      box.position.set(x,10,0);box.castShadow=true;scene.add(box);
    }
    const distance=createViewDistance(scene);distance.addStatic(scene);distance.update(focus);
    function draw(enabled=true){light.update(camera,focus);light.sun.shadow.intensity=enabled?1:0;renderer.render(scene,camera);}
    function sample(){
      const gl=renderer.getContext();return [50,145,190,230].map(x=>{
        const p=new THREE.Vector3(x,.01,-12).project(camera),data=new Uint8Array(9*9*4);
        gl.readPixels(Math.round((p.x+1)*600)-4,Math.round((p.y+1)*250)-4,9,9,gl.RGBA,gl.UNSIGNED_BYTE,data);
        return data.reduce((sum,n,i)=>sum+(i%4<3?n:0),0);
      });
    }
    draw();const on=sample(),extent=light.sun.shadow.camera.right;draw(false);const off=sample();
    camera.zoom=2;camera.updateProjectionMatrix();draw();const zoomExtent=light.sun.shadow.camera.right;
    camera.zoom=.5;camera.updateProjectionMatrix();draw();const wideExtent=light.sun.shadow.camera.right;
    camera.zoom=1;camera.updateProjectionMatrix();draw();
    return {delta:off.map((n,i)=>n-on[i]),extent,zoomExtent,wideExtent};
  });
  console.log('shadow distances',result);
  expect(result.extent).toBeGreaterThan(250);expect(result.zoomExtent).toBe(result.extent);expect(result.wideExtent).toBe(result.extent);
  expect(result.delta[0]).toBeGreaterThan(500);expect(result.delta[1]).toBeGreaterThan(500);
  expect(result.delta[2]).toBeGreaterThan(result.delta[3]);expect(result.delta[3]).toBeLessThan(result.delta[1]*.2);
  await page.screenshot({path:'test-results/world-time/shadow-distance.png'});expect(errors).toEqual([]);
});
