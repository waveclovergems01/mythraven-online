import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';

test('forest HUD, glowing radar types and server-driven roaming stay usable on desktop and mobile',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.wildlifeQA={area,enter:()=>onWarp('west-march'),network,
        samples:()=>[...wildlife.targets].map(([id,a])=>({id,x:a.position.x,z:a.position.z,moving:a.combat?.moving})),
        partyPreview:()=>{
          const id=network.room.sessionId,p=network.players.get(id),players=new Map([[id,p],
            ['party',{...p,name:'Party',x:p.x-25,z:p.z-20}],['other',{...p,name:'Other',x:p.x-45,z:p.z-20}]]);
          minimap.update(players,id,orbit.footprint(),wildlife?.targets,undefined,new Set(['party']));minimapUpdatedAt=performance.now()+10000;
        }};
      renderer.render(scene, camera);`);
    await route.fulfill({response,body});
  });
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await page.evaluate(()=>(window as any).wildlifeQA.enter());
  await page.waitForFunction(()=>(window as any).wildlifeQA?.area==='west-march');
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:60000});
  await expect(page.locator('.game-footer')).toHaveCount(0);
  const before=await page.evaluate(()=>(window as any).wildlifeQA.samples());
  await expect.poll(()=>page.evaluate(before=>{
    return (window as any).wildlifeQA.samples().filter((a:any,i:number)=>Math.hypot(a.x-before[i].x,a.z-before[i].z)>3).length;
  },before),{timeout:40000}).toBeGreaterThan(5);
  await expect(page.locator('[data-marker-type=monster]').first()).toHaveAttribute('fill',/monster/);
  await page.evaluate(()=>(window as any).wildlifeQA.partyPreview());
  await expect(page.locator('[data-marker-type=self]')).toHaveCount(1);
  await expect(page.locator('[data-marker-type=party]')).toHaveCount(1);
  await expect(page.locator('[data-marker-type=other]')).toHaveCount(1);
  for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]] as const){
    await page.setViewportSize({width,height});
    await expect(page.locator('.hunt-controls')).toBeVisible();
    const hunt=(await page.locator('.hunt-controls').boundingBox())!,gear=(await page.locator('#settings-toggle').boundingBox())!;
    expect(Math.abs(hunt.y+hunt.height/2-gear.y-gear.height/2)).toBeLessThanOrEqual(2);
    expect(hunt.x+hunt.width).toBeLessThan(gear.x);
    await page.screenshot({path:`test-results/wildlife/${name}.png`});
  }
  expect(errors).toEqual([]);
});


test('short animal outings emit steps while idle, reactions and death stay silent',async({page})=>{
  await page.route('**/__wildlife_qa',route=>route.fulfill({contentType:'text/html',body:`<script type="module">
    import * as THREE from '/node_modules/three/build/three.module.js';
    import {loadFrontierWildlife} from '/src/terrain/frontier-wildlife.ts';
    import {buildWestMarch} from '/shared/west-march.mjs';
    import {TerrainMovement} from '/shared/terrain-movement.mjs';
    const data=buildWestMarch(),nav=new TerrainMovement(data),wildlife=await loadFrontierWildlife(data,nav);
    const camera=new THREE.PerspectiveCamera(60,1,.1,1000),focus=new THREE.Vector3(nav.spawn.x,0,nav.spawn.z);
    camera.position.copy(focus).add(new THREE.Vector3(0,15,15));camera.lookAt(focus);camera.updateMatrixWorld(true);
    for(const a of wildlife.targets.values())a.alive=false;
    window.stepQA=()=>{
      const result=[];
      for(const kind of ['rabbit','wolf']){
        const target=[...wildlife.targets.values()].find(a=>a.kind===kind);let steps=0;
        target.alive=true;target.combat={x:focus.x,z:focus.z,heading:0,hp:100,moving:true,engaged:false};
        const tick=()=>wildlife.update(Date.now()/1000,.05,focus,camera,()=>steps++);
        for(let i=0;i<6;i++)tick();const walking=steps;
        target.combat.moving=false;for(let i=0;i<30;i++)tick();const idle=steps;
        target.combat.moving=true;target.react('n_attack');for(let i=0;i<6;i++)tick();const attacking=steps;
        target.alive=false;for(let i=0;i<6;i++)tick();
        result.push({kind,walking,idle,attacking,dead:steps});
      }
      wildlife.dispose();return result;
    };
  </script>`}));
  await page.goto('/__wildlife_qa');await page.waitForFunction(()=>(window as any).stepQA);
  const result=await page.evaluate(()=>(window as any).stepQA());
  for(const sample of result){
    expect(sample.walking).toBeGreaterThan(0);
    expect(sample.idle).toBe(sample.walking);expect(sample.attacking).toBe(sample.walking);expect(sample.dead).toBe(sample.walking);
  }
});
