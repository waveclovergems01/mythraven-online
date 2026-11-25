import {test,expect} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';
import {openSettings,closeSettings} from './helpers/game-settings';
import {nearestHuntTarget} from '../src/terrain/hunt-target';
import {TerrainMovement} from '../shared/terrain-movement.mjs';
import {buildWestMarch} from '../shared/west-march.mjs';

test('a nearby hunt on the same bank takes priority over a longer bridge detour',()=>{
  const movement=new TerrainMovement(buildWestMarch());
  Object.assign(movement.position,{x:82,z:-100});
  const across={id:'across',goal:{x:122,z:-100}},local={id:'local',goal:{x:37,z:-100}};
  expect(movement.clearLine(movement.position,across.goal)).toBe(false);
  expect(movement.clearLine(movement.position,local.goal)).toBe(true);
  const anywhere=()=>true;
  expect(nearestHuntTarget(movement,[across],2.6,anywhere)).toBe('across');
  expect(nearestHuntTarget(movement,[across,local],2.6,anywhere)).toBe('local');
  expect(nearestHuntTarget(movement,[across,local],2.6,anywhere,'across')).toBe('local');
  expect(movement.moving).toBe(false);
});

test('a frontier kill awards EXP once, carries the remainder and grants five stat points',async({page})=>{
  test.setTimeout(135000);
  const errors:string[]=[];
  await page.addInitScript(()=>{
    const original=AudioBufferSourceNode.prototype.start;
    (window as any).combatSounds=[];
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){
      (window as any).combatSounds.push(this.buffer?.duration);
      return original.apply(this,args);
    };
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error' && /shader|WebGLProgram/i.test(message.text()))errors.push(message.text());});
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      const watched=wildlife?.targets.get(selectedPlayer);
      const local=views.get(network.room?.sessionId);
      const trace=window.huntTrace;
      if(trace && trace.id===selectedPlayer && local && watched?.combat?.engaged && !watched.combat.moving
        && watched.position.distanceTo(focus)<=4.2){
        trace.poses.push(local.avatar.inspect().state);
        trace.swings.add(local.swing);
      }
      window.battleQA={enter:()=>onWarp('west-march'),area,ready:network.connected,
        impactQA:()=>{
          const samples=[
            {to:'monster',weapon:'dagger',critical:false,x:-2},
            {to:'monster',weapon:'dagger',critical:true,x:0},
            {to:'player',critical:false,x:2}
          ];
          for(const sample of samples){
            const point=focus.clone();point.x+=sample.x;
            impacts.show({...sample,damage:6},point,2.8,focus);
          }
          impacts.show({to:'monster',weapon:'bow',damage:6,critical:false},focus,2.8,focus);
          impacts.show({to:'player',damage:0,dodged:true,critical:false},focus,2.8,focus);
        },
        checkDamageColumn:()=>{
          const point=focus.clone(), hit={to:'monster',damage:6,critical:false};
          feedback.show(hit,point,2);
          point.x+=.8;
          feedback.show({...hit,critical:true},point,2);
          feedback.show(hit,point,2);
          feedback.show({...hit,to:'player'},point,2);
          feedback.update(camera);
          const numbers=Array.from(host.querySelectorAll('.combat-damage')).slice(-4);
          const centers=numbers.map(node=>{const rect=node.getBoundingClientRect();return rect.x+rect.width/2;});
          return {centers,layers:numbers.map(node=>Number(getComputedStyle(node).zIndex))};
        },
        change:command=>profile.change(command),
        trainAgility:async value=>{
          while((profile.value.level-1)*5<value-1)await profile.change({kind:'level'});
          if(value>profile.value.stats.AGI)await profile.change({kind:'allocate',increases:{AGI:value-profile.value.stats.AGI}});
        },
        attackRate:local?.avatar.inspect().state==='attack' ? 1/network.players.get(network.room.sessionId).attackInterval : 0,
        dissolving:id=>{
          const model=wildlife.targets.get(id)?.model;
          return model?.parent?.parent?.children.some(o=>o.isPoints);
        },
        anchor:[anchor.x,anchor.y],ring:huntRing.visible,
        targetDistance:selectedPlayer && wildlife?.targets.get(selectedPlayer)?.position.distanceTo(focus),
        moving:prediction.movement.moving, target:selectedPlayer,
        guide:routeLights.lights.visible && routeLights.lights.geometry.drawRange.count>0,
        walk:()=>{
          for(let i=0;i<32;i++){
            const point=focus.clone();point.x+=22*Math.cos(i);point.z+=22*Math.sin(i);
            if(navigation.canStand(point) && navigation.clearLine(focus,point)){
              moveToPoint({point,normal:new THREE.Vector3(0,1,0)});return;
            }
          }
        },
        rabbit:()=>{
          const b=canvas.getBoundingClientRect();
          for(const [id,animal] of wildlife.targets){
            if(animal.kind!=='rabbit' || !animal.model || !animal.alive)continue;
            const p=animal.position.clone();p.y+=animal.height*.62;p.project(camera);
            const x=b.x+(1+p.x)*b.width/2,y=b.y+(1-p.y)*b.height/2;
            if(document.elementFromPoint(x,y)!==canvas)continue;
            aimPointer(x,y);if(pickPlayer()===id)return {id,x,y};
          }
        }};
      renderer.render(scene,camera);`);
    await route.fulfill({response,body});
  });
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await page.waitForFunction(()=>(window as any).battleQA?.ready);
  await expect(page.getByRole('progressbar',{name:'MP',exact:true})).toHaveAttribute('aria-valuetext',/\d+ \/ \d+/);
  await expect(page.locator('.auto-combat')).toBeVisible();
  await expect(page.locator('.auto-combat')).toBeDisabled();
  await expect(page.locator('.auto-combat kbd')).toHaveText('Ctrl+A');
  await expect(page.locator('.auto-combat')).toHaveAttribute('aria-keyshortcuts','Control+A');
  await expect(page.locator('.auto-combat img')).toHaveJSProperty('naturalWidth',168);
  await page.locator('.hunt-launch').click();
  await expect(page.locator('.hunt-panel .hunt-range input')).toBeEnabled();
  await page.locator('.hunt-launch').click();
  await page.evaluate(()=>(window as any).battleQA.walk());
  await page.waitForFunction(()=>(window as any).battleQA.guide);
  await page.keyboard.press('i');await page.keyboard.press('c');
  await expect(page.locator('#journal-sheet')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).battleQA.moving)).toBe(true);
  await page.keyboard.press('c');
  await page.locator('[data-item=dagger]').click({button:'right'});
  await expect(page.locator('#journal-bag .bag-count')).toHaveText('0 / 200');
  await page.evaluate(async()=>{
    const q=(window as any).battleQA;
    await q.trainAgility(6);
    await q.change({kind:'experience',amount:140});
    (window as any).battleQA.enter();
  });
  await page.waitForFunction(()=>{const q=(window as any).battleQA;return q?.ready && q.area==='west-march';});
  await expect(page.locator('.scene-loading')).toBeHidden({timeout:30000});
  await page.mouse.click(20,20);
  await expect.poll(async()=>{
    return page.evaluate(()=>{
      const w=window as any;w.combatSounds=[];w.battleQA.impactQA();
      return w.combatSounds.length;
    });
  }).toBe(4);
  const sounds=await page.evaluate(()=>(window as any).combatSounds);
  expect(new Set(sounds).size).toBe(4);
  await page.screenshot({path:'test-results/combat/hit-effects.png'});
  const {centers,layers}=await page.evaluate(()=>(window as any).battleQA.checkDamageColumn());
  expect(Math.max(...centers)-Math.min(...centers)).toBeLessThan(1);
  expect(layers[1]).toBeGreaterThan(Math.max(layers[0],layers[2],layers[3]));
  await expect(page.locator('.exp-caption')).toContainText('87.5%');
  await expect.poll(()=>page.locator('.vital-exp .vital-fill').evaluate(fill=>
    fill.getBoundingClientRect().width/fill.parentElement!.getBoundingClientRect().width)).toBeCloseTo(.875,2);
  await expect(page.locator('.arrival-protection')).toBeHidden({timeout:20000});
  const {id,x,y}=await page.waitForFunction(()=>(window as any).battleQA.rabbit()).then(handle=>handle.jsonValue());
  await page.mouse.click(x,y);
  await expect(page.locator('.monster-name')).toContainText('Lv. 3');
  await expect.poll(()=>page.locator('.monster-name progress').evaluate(el=>(el as HTMLProgressElement).value),{timeout:25000}).toBeLessThan(100);
  await expect.poll(()=>page.locator('.hp-meter').evaluate(el=>(el as HTMLProgressElement).value)).toBeLessThan(100);
  await expect(page.locator('.combat-damage.incoming').first()).toBeVisible({timeout:8000});
  await page.screenshot({path:'test-results/combat/encounter.png'});
  await expect(page.locator('.combat-vitals strong')).toHaveText('Lv. 3',{timeout:45000});
  await expect(page.locator('.exp-caption')).toContainText('15 / 240');
  await expect(page.locator('.hp-caption')).toHaveText('110 / 110');
  await expect(page.locator('.mp-caption')).toHaveText('34 / 34');
  await page.waitForFunction(id=>(window as any).battleQA.dissolving(id),id);
  await page.screenshot({path:'test-results/combat/dissolve.png'});
  await expect(page.locator('[data-monster="'+id+'"]')).toBeHidden();
  await page.keyboard.press('c');await expect(page.locator('[data-points]')).toHaveText('15');
  await page.keyboard.press('c');
  await expect(page.locator('[data-monster]')).toHaveCount(560);
  await openSettings(page);
  await expect(page.locator('#settings-controls .hunt-range')).toHaveCount(0);
  await closeSettings(page);
  const launcher=page.locator('.hunt-launch'),action=page.locator('.auto-combat');
  await launcher.click();
  const range=page.locator('.hunt-range input');
  await expect(range).toHaveValue('110');
  await range.fill('60');await expect(range).toHaveAttribute('aria-valuetext',/60/);
  await page.locator('.hunt-panel input[value=rabbit]').uncheck();
  await page.locator('.hunt-panel input[value=wolf]').uncheck();
  await expect(action).toBeDisabled();
  await page.locator('.hunt-panel input[value=wolf]').check();
  await page.screenshot({path:'test-results/combat/hunt-wolves.png'});
  await launcher.click();
  await action.click();
  await expect(page.locator('.auto-combat')).toHaveAttribute('aria-pressed','true');
  await expect(action).toHaveCSS('background-color','rgb(40, 83, 73)');
  await expect(page.locator('.monster-name')).toContainText(/Ashfur|แอชเฟอร์/);
  const pin=await page.evaluate(()=>(window as any).battleQA.anchor);
  await expect(page.locator('.combat-damage.outgoing,.combat-damage.critical').first()).toBeVisible({timeout:25000});
  await page.evaluate(()=>{(window as any).huntTrace={id:(window as any).battleQA.target,poses:[],swings:new Set()};});
  await page.waitForFunction(()=>(window as any).huntTrace.swings.size>=3,null,{timeout:15000});
  const poses=await page.evaluate(()=>[...new Set((window as any).huntTrace.poses)]);
  expect(poses).toContain('attack');expect(poses).not.toContain('run');
  expect(await page.evaluate(()=>(window as any).battleQA.ring)).toBe(true);
  expect(await page.evaluate(()=>(window as any).battleQA.anchor)).toEqual(pin);
  await page.keyboard.press('c');await page.locator('[data-weapon-slot]').click({button:'right'});
  await expect(page.locator('.auto-combat')).toHaveAttribute('aria-pressed','false');
  await page.keyboard.press('c');
  await launcher.click();await expect(action).toBeDisabled();
  await expect(page.locator('.hunt-panel small')).toContainText(/สวมอาวุธ|Equip a weapon/);
  await expect(range).toBeEnabled();
  await range.fill('70');
  await expect(range).toHaveAttribute('aria-valuetext',/70/);
  await expect(page.locator('.hunt-panel input[value=wolf]')).toBeEnabled();
  await launcher.click();
  await page.keyboard.press('Control+a');
  await expect(action).toHaveAttribute('aria-pressed','false');
  await page.keyboard.press('i');await page.locator('[data-item=dagger]').click({button:'right'});await page.keyboard.press('i');
  await launcher.click();await range.fill('110');
  await launcher.click();
  await page.keyboard.press('Control+a');
  await expect(action).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(()=>(window as any).battleQA.targetDistance>0);
  await page.screenshot({path:'test-results/combat/hunt-route.png'});
  await page.keyboard.press('Control+a');
  await expect(action).toHaveAttribute('aria-pressed','false');
  await page.waitForFunction(()=>!(window as any).battleQA.guide);
  for(const [agi,rate] of [[90,1+89/7],[99,15]]){
    await page.evaluate(value=>(window as any).battleQA.trainAgility(value),agi);
    await page.keyboard.press('Control+a');
    await page.waitForFunction(rate=>Math.abs((window as any).battleQA.attackRate-rate)<.001,rate,{timeout:30000});
    await page.keyboard.press('Control+a');
  }
  await page.reload();await chooseCharacter(page);
  await expect(page.locator('.exp-caption')).toContainText('0 / 100',{timeout:45000});
  await expect(page.locator('.combat-vitals strong')).toHaveText('Lv. 1');
  await page.keyboard.press('c');
  await page.locator('[data-action=level]').click();
  await page.locator('[data-action=reset-level]').click();
  await expect(page.locator('.combat-vitals strong')).toHaveText('Lv. 1');
  await expect(page.locator('[data-points]')).toHaveText('10');
  expect(errors).toEqual([]);
});
