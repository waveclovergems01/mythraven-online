import {test,expect,type Locator,type Page} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';
import master from '../shared/character-master.json' with {type:'json'};

async function dragHeader(page:Page,panel:Locator,dx:number,dy:number){
  const before=(await panel.boundingBox())!;
  const x=before.x+50,y=before.y+20;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+dx,y+dy,{steps:4});
  await page.mouse.up();
  const after=(await panel.boundingBox())!;
  expect(after.x).toBeCloseTo(before.x+dx,0);
  expect(after.y).toBeCloseTo(before.y+dy,0);
}

test('independent inventory and status windows equip and restore starter weapons',async({page})=>{
  test.setTimeout(240000);
  const legacy=process.env.MR_LEGACY_ROOM==='1';
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+'\nconst original=mountTerrainWorld;mountTerrainWorld=async(...args)=>window.inventoryWorld=await original(...args);'});
  });
  const ownWeapon=()=>page.evaluate(()=>{
    const world=(window as any).inventoryWorld?.inspect();
    return world?.connected && world.avatars[world.id]?.clip
      ? [world.avatars[world.id].weapon??'',world.players[world.id].weapon] : null;
  });
  const bag=page.locator('#journal-bag'),sheet=page.locator('#journal-sheet');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await page.locator('#guest').click();
  const characters=[['novice','dagger','6'],['warrior','longsword','9'],['archer','bow','7']] as const;
  for(const [job,item,physical] of legacy?characters.slice(0,1):characters){
    await chooseCharacter(page,job+'-male-01');
    await expect.poll(ownWeapon,{timeout:60000}).toEqual(['','']);
    await page.keyboard.press('i');
    await expect(bag).toBeVisible();
    await expect(sheet).toBeHidden();
    await page.keyboard.press('c');
    await expect(sheet).toBeVisible();
    expect((await bag.boundingBox())!.x).toBeGreaterThan(720);
    expect((await sheet.boundingBox())!.x).toBeLessThan(100);
    await dragHeader(page,bag,-75,25);
    await dragHeader(page,sheet,45,20);
    await page.keyboard.press('i');
    await expect(bag).toBeHidden();
    await expect(sheet).toBeVisible();
    await page.keyboard.press('i');
    await expect(bag.locator('.bag-cell')).toHaveCount(50);
    await expect(sheet.locator('.paper-doll canvas')).toHaveAttribute('data-appearance',job+'-male-01/unarmed');
    await bag.locator('[data-page="1"]').click();
    await expect(bag.locator('.bag-cell')).toHaveCount(50);
    await expect(bag.locator('.bag-item')).toHaveCount(0);
    await bag.locator('.bag-grid').hover();
    await page.mouse.wheel(0,-160);
    await expect(bag.locator('[data-page="0"]')).toHaveAttribute('aria-pressed','true');
    const icon=bag.locator('[data-item="'+item+'"] img');
    await expect(icon).toHaveAttribute('src',master.items[item].icon);
    await expect.poll(()=>icon.evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBe(96);
    await icon.hover();
    await expect(bag.getByRole('tooltip')).toContainText('ATK +'+master.items[item].attack);
    if(job==='novice'&&!legacy)await page.screenshot({path:'test-results/inventory/windows.png'});
    if(job==='warrior')await icon.dragTo(sheet.locator('[data-weapon-slot]'));
    else await icon.click({button:'right'});
    const equipped=[item,legacy?'':item];
    await expect.poll(ownWeapon,{timeout:20000}).toEqual(equipped);
    await expect(bag.locator('.journal-empty')).toBeVisible();
    await expect(sheet.locator('.worn-icon')).toHaveAttribute('src',master.items[item].icon);
    await expect(sheet.locator('.paper-doll canvas')).toHaveAttribute('data-appearance',job+'-male-01/'+item);
    await expect(sheet.locator('dd').first()).toHaveText(physical);
    await expect(sheet.locator('[data-points]')).toHaveText('0');
    if(job==='novice'){
      await sheet.locator('[data-action=level]').click();
      await expect(sheet.locator('[data-points]')).toHaveText('5');
      const strength=sheet.locator('[data-action=raise-STR]');
      await expect(sheet.locator('.allocation-actions')).toBeHidden();
      await strength.click();
      await expect(sheet.locator('[data-preview=STR]')).toHaveText('+1');
      await sheet.locator('[data-action=raise-VIT]').click();
      await expect(sheet.locator('[data-points]')).toHaveText('3');
      await expect(sheet.locator('[data-battle=physical]')).toHaveText('6');
      await expect(sheet.locator('[data-battle-preview=physical]')).toHaveText('→ 8');
      await sheet.locator('[data-action=raise-AGI]').click();
      await expect(sheet.locator('[data-battle-preview=attackSpeed]')).toHaveText('→ 1.14');
      await expect(sheet.locator('[data-battle-preview=dodgeChance]')).toHaveText('→ 0.1%');
      await expect(sheet.locator('.allocation-actions button').first()).toHaveText(/ตกลง|OK/);
      await sheet.locator('[data-action=cancel-stats]').click();
      await expect(sheet.locator('[data-points]')).toHaveText('5');
      await expect(sheet.locator('[data-preview=VIT]')).toBeEmpty();
      await expect(sheet.locator('.allocation-actions')).toBeHidden();
      await expect(sheet.locator('[data-battle-preview=attackSpeed]')).toBeEmpty();
      await strength.hover();await page.mouse.down();
      try{await expect(strength).toBeDisabled();}finally{await page.mouse.up();}
      await expect(sheet.locator('[data-preview=STR]')).toHaveText('+5');
      await expect(sheet.locator('[data-battle=physical]')).toHaveText('6');
      await expect(sheet.locator('[data-battle-preview=physical]')).toHaveText('→ 16');
      await sheet.locator('[data-action=confirm-stats]').click();
      await expect(sheet.locator('[data-preview=STR]')).toBeEmpty();
      await expect(sheet.locator('[data-points]')).toHaveText('0');
      await expect(sheet.locator('.allocation-actions')).toBeHidden();
      await expect(sheet.locator('dd').first()).toHaveText('16');
      await expect.poll(ownWeapon).toEqual(equipped);
      await page.reload();
      await chooseCharacter(page,'novice-male-02');
      await expect.poll(ownWeapon,{timeout:60000}).toEqual(equipped);
      await page.locator('#settings-toggle').click();
      await page.locator('.journal-launch [data-toggle=sheet]').click();
      await expect(sheet.locator('.paper-doll canvas')).toHaveAttribute('data-appearance','novice-male-02/dagger');
      await expect(sheet.locator('dd').first()).toHaveText('6');
      await page.keyboard.press('i');
    }
    if(job==='warrior')await sheet.locator('[data-weapon-slot]').dragTo(bag.locator('.bag-grid'));
    else await sheet.locator('[data-weapon-slot]').click({button:'right'});
    await expect.poll(ownWeapon).toEqual(['','']);
    await expect(bag.locator('.bag-item')).toHaveCount(1);
    if(job==='warrior')await sheet.locator('header').click();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(bag).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bag).toBeHidden();
    if(!legacy && job!=='archer')await page.reload();
  }
  expect(errors).toEqual([]);
});

test('second bag page holds actual items and a full bag keeps its equipped weapon',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');
  await page.locator('#guest').click();
  await chooseCharacter(page,'warrior-male-01');
  const bag=page.locator('#journal-bag'),sheet=page.locator('#journal-sheet');
  await page.locator('#settings-toggle').click();
  await page.locator('[data-toggle=bag]').click();
  await bag.locator('[data-action=equip-longsword]').click();
  await expect(bag.locator('.bag-item')).toHaveCount(0);
  // Simulate an existing save with a full bag and a separately equipped sword.
  await page.evaluate(()=>{
    const key=Object.keys(localStorage).find(k=>k.startsWith('mr.character.v1.') && k.endsWith('.warrior'))!;
    const saved=JSON.parse(localStorage.getItem(key)!);
    saved.bag=Array(100).fill('bow');
    saved.bag[99]='dagger';
    localStorage.setItem(key,JSON.stringify(saved));
    window.dispatchEvent(new StorageEvent('storage',{key}));
  });
  await page.keyboard.press('c');
  await expect(sheet.locator('[data-weapon-slot]')).toBeDisabled();
  await expect(bag.locator('.bag-count')).toHaveText('100 / 100');
  await bag.locator('[data-page="1"]').click();
  await expect(bag.locator('.bag-item')).toHaveCount(50);
  await page.setViewportSize({width:390,height:680});
  await page.keyboard.press('c');
  await bag.locator('.bag-scroll').hover();
  await page.mouse.wheel(0,270);
  await expect.poll(()=>bag.locator('.bag-scroll').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await bag.locator('[data-index="99"]').click({button:'right'});
  await expect(bag.locator('[data-index="98"]')).toHaveAttribute('data-item','bow');
  await expect(bag.locator('[data-index="99"]')).toHaveAttribute('data-item','longsword');
  await expect(bag.locator('.bag-count')).toHaveText('100 / 100');
});

