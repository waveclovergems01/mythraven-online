import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';
import {mkdir,writeFile} from 'node:fs/promises';

test('archer arrow follows the authored draw bones, releases after frame six and flies to contact',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:1000,height:720});
  await page.route('**/__archer_qa',route=>route.fulfill({contentType:'text/html',body:`
    <style>body{margin:0;background:#182b30}canvas{display:block}</style><script type="module">
    import * as THREE from '/node_modules/three/build/three.module.js';
    import {createCharacterAssets} from '/src/terrain/character-assets.ts';
    import {characterById} from '/shared/character-catalog.mjs';
    import {createBowProjectiles} from '/src/terrain/bow-projectiles.ts';
    const scene=new THREE.Scene();scene.background=new THREE.Color('#182b30');
    const camera=new THREE.PerspectiveCamera(38,1000/720,.01,100);camera.position.set(5,3.5,6);camera.lookAt(0,1.4,0);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,720);document.body.append(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x657565,3));
    const assets=createCharacterAssets(),factory=await assets.ensure(characterById('archer-male-01'));
    const avatar=factory.create(true);avatar.setWeapon('bow',await assets.loadWeapon('bow'));scene.add(avatar.group);
    const shots=createBowProjectiles(scene);
    function draw(){scene.updateMatrixWorld(true);renderer.render(scene,camera);}
    const arrow=avatar.group.getObjectByName('nocked-arrow');
    window.archerQA={
      frame(frame){avatar.strike(frame/10);draw();return {visible:arrow.visible,length:arrow.scale.x,
        bones:['DEF-holdL','DEF-hold-tweakL','DEF-handR'].map(n=>({name:n,position:avatar.group.getObjectByName(n)?.getWorldPosition(new THREE.Vector3()).toArray()}))};},
      side(){camera.position.set(6,3,0);camera.lookAt(0,1.5,0);draw();},
      projectile(){
        const origin=avatar.bowRelease();avatar.strike(.7);
        const target={position:origin.clone().add(new THREE.Vector3(0,0,5)),height:1.5};
        shots.launch({id:1,player:'a',mob:'rabbit-0',releaseAt:10,impactAt:10.1,from:origin},target,origin);
        shots.update(10.05);draw();const flying=scene.getObjectByName('bow-projectiles').children.filter(a=>a.visible);
        const before=flying[0].position.clone();target.position.z+=.5;shots.update(10.09);draw();
        const after=flying[0].position.clone();shots.impact(1);draw();
        return {origin:origin.toArray(),distance:before.distanceTo(origin),advanced:after.distanceTo(before),remaining:scene.getObjectByName('bow-projectiles').children.filter(a=>a.visible).length};
      },
      unequip(){avatar.setWeapon(undefined);draw();return arrow.visible;}
    };avatar.strike(.6);draw();
    </script>`}));
  await page.goto('/__archer_qa');await page.waitForFunction(()=>(window as any).archerQA);
  expect((await page.evaluate(()=>(window as any).archerQA.frame(1))).visible).toBe(false);
  for(const frame of [2,4,6]){
    const sample=await page.evaluate(frame=>(window as any).archerQA.frame(frame),frame);
    expect(sample.visible).toBe(true);expect(sample.length).toBeGreaterThan(.15);expect(sample.length).toBeLessThan(1.5);
    expect(sample.bones.every((b:any)=>b.position)).toBe(true);
    await page.screenshot({path:`test-results/archer/draw-${frame}.png`});
  }
  await page.evaluate(()=>(window as any).archerQA.side());await page.screenshot({path:'test-results/archer/draw-side.png'});
  expect((await page.evaluate(()=>(window as any).archerQA.frame(7))).visible).toBe(false);
  const shot=await page.evaluate(()=>(window as any).archerQA.projectile());
  expect(shot.distance).toBeGreaterThan(1);expect(shot.advanced).toBeGreaterThan(1);expect(shot.remaining).toBe(0);
  expect(await page.evaluate(()=>(window as any).archerQA.unequip())).toBe(false);
  expect(errors).toEqual([]);
});


test('live archer releases visible projectiles and hit feedback consumes the matching shot',async({page})=>{
  test.setTimeout(100000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();let body=await response.text();
    body=body.replace('projectiles.impact(event.shotId);',`
      if(event.shotId!==undefined){
        window.archerTrace??={frames:0,nocked:0,hits:[]};window.archerTrace.hits.push(event.shotId);
      }
      projectiles.impact(event.shotId);`);
    body=body.replace('renderer.render(scene, camera);',`
      renderer.render(scene, camera);
      window.archerLive={area,network,enter:()=>onWarp('west-march')};
      const trace=window.archerTrace??={frames:0,nocked:0,hits:[]};
      const active=scene.getObjectByName('bow-projectiles').children.filter(a=>a.visible);
      if(active.length){trace.frames++;if(!trace.image)trace.image=renderer.domElement.toDataURL('image/png');}
      for(const v of views.values())if(v.mesh.getObjectByName('nocked-arrow')?.visible)trace.nocked++;
    `);
    await route.fulfill({response,body});
  });
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page,'archer-male-01');
  await page.keyboard.press('i');await page.locator('[data-item=bow]').click({button:'right'});await page.keyboard.press('i');
  await page.evaluate(()=>(window as any).archerLive.enter());
  await page.waitForFunction(()=>(window as any).archerLive?.area==='west-march');
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:60000});
  await page.evaluate(()=>{
    const w=window as any;w.shotEvents=[];
    w.archerLive.network.room.onMessage('bow-shot',(shot:any)=>w.shotEvents.push(shot));
  });
  await page.keyboard.press('Control+a');
  await expect.poll(()=>page.evaluate(()=>(window as any).archerTrace?.hits.length??0),{timeout:35000}).toBeGreaterThanOrEqual(3);
  const result=await page.evaluate(()=>({trace:(window as any).archerTrace,shots:(window as any).shotEvents}));
  expect(result.trace.frames).toBeGreaterThan(0);expect(result.trace.nocked).toBeGreaterThan(0);
  for(const id of result.trace.hits)expect(result.shots.some((s:any)=>s.id===id && s.impactAt>s.releaseAt)).toBe(true);
  await mkdir('test-results/archer',{recursive:true});
  await writeFile('test-results/archer/live-projectile.png',Buffer.from(result.trace.image.split(',')[1],'base64'));
  await page.screenshot({path:'test-results/archer/live-combat.png'});
  await page.keyboard.press('Control+a');expect(errors).toEqual([]);
});
