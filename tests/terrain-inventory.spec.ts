import {test,expect,type Locator,type Page} from '@playwright/test';
import {chooseCharacter} from './helpers/character-selection';
import master from '../shared/character-master.json' with {type:'json'};

test.use({launchOptions:{ignoreDefaultArgs:['--hide-scrollbars']}});

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
    const jobBanner=page.locator('.combat-vitals .vital-job');
    await expect(jobBanner).toHaveText(job[0].toUpperCase()+job.slice(1));
    await expect(jobBanner).toHaveCSS('border-image-source',/job-banner\.webp/);
    await page.keyboard.press('i');
    await expect(bag).toBeVisible();
    await expect(sheet).toBeHidden();
    await page.keyboard.press('c');
    await expect(sheet).toBeVisible();
    const bagBox=(await bag.boundingBox())!, sheetBox=(await sheet.boundingBox())!;
    expect(bagBox.width).toBe(306);
    expect(sheetBox.x).toBeCloseTo(1440*.12,0);
    expect(1440-bagBox.x-bagBox.width).toBeCloseTo(1440*.14,0);
    expect(sheetBox.y).toBeCloseTo(900*.15,0);
    expect(bagBox.y).toBeCloseTo(sheetBox.y,0);
    expect(sheetBox.x+sheetBox.width).toBeLessThan(bagBox.x);
    await dragHeader(page,bag,-75,25);
    await dragHeader(page,sheet,45,20);
    await page.keyboard.press('i');
    await expect(bag).toBeHidden();
    await expect(sheet).toBeVisible();
    await page.keyboard.press('i');
    await expect(bag.locator('.bag-cell')).toHaveCount(100);
    await expect(bag).toHaveCSS('border-image-source',/inventory\/frame\.webp/);
    await expect(bag.locator('.bag-cell.vacant').first()).toHaveCSS('background-image',/slot-empty\.webp/);
    const slotWidth=(await bag.locator('.bag-cell').first().boundingBox())!.width;
    expect(slotWidth).toBeGreaterThanOrEqual(48);
    expect(slotWidth).toBeLessThanOrEqual(51);
    const layout=await bag.locator('.bag-grid').evaluate(grid=>({
      columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      scrolls:grid.parentElement!.scrollHeight>grid.parentElement!.clientHeight,
    }));
    expect(layout).toEqual({columns:5,scrolls:true});
    const tabs=(await bag.locator('.bag-pages').boundingBox())!;
    const expand=(await bag.locator('[data-bag-expand]').boundingBox())!;
    const count=(await bag.locator('.bag-count').boundingBox())!;
    const slots=(await bag.locator('.bag-scroll').boundingBox())!;
    expect(tabs.width).toBeGreaterThan(200);
    expect(expand.x).toBeGreaterThanOrEqual(tabs.x+tabs.width);
    expect(expand.y).toBeCloseTo(tabs.y,0);
    expect(count.y).toBeGreaterThanOrEqual(slots.y+slots.height);
    await expect(sheet.locator('.paper-doll canvas')).toHaveAttribute('data-appearance',job+'-male-01/unarmed');
    if(job==='novice'){
      await expect(sheet.locator('.gear-slots .gear-cell')).toHaveCount(11);
      await expect(sheet.locator('[data-gear=cloak] img')).toHaveJSProperty('naturalWidth',128);
      const box=(slot:string)=>sheet.locator(`[data-gear-position=${slot}]`).boundingBox();
      const head=(await box('head'))!;
      const rows=[['weapon','body'],['offhand','cloak'],['ring1','pants'],['ring2','feet'],['neck','arms']];
      const first=(await box(rows[0][0]))!;
      expect(first.y-head.y).toBeLessThan(15);
      const rowGap=(await box(rows[1][0]))!.y-first.y;
      expect(rowGap).toBeGreaterThan(first.height);
      for(const [index,[left,right]] of rows.entries()){
        const [leftBox,rightBox]=await Promise.all([box(left),box(right)]);
        expect(leftBox!.y).toBeCloseTo(first.y+index*rowGap,0);
        expect(leftBox!.y).toBeCloseTo(rightBox!.y,0);
        expect(head.x-leftBox!.x).toBeCloseTo(rightBox!.x-head.x,0);
      }
      await expect(sheet.locator('[data-gear=ring]')).toHaveCount(2);
      await expect(sheet.locator('[data-gear=neck]')).toHaveCount(1);
      await expect(sheet.locator('[data-gear=pants]')).toHaveCount(1);
      await expect(sheet.locator('[data-battle=hit]')).toHaveText('100');
      await expect(sheet.locator('[data-battle=flee]')).toHaveText('100');
      await expect(sheet.locator('[data-battle=magicDefense]')).toHaveText('1');
      await expect(sheet.locator('[data-battle=criticalDamage]')).toHaveText('150.0%');
      const portrait=sheet.locator('.paper-doll canvas');
      const front=await portrait.evaluate(canvas=>(canvas as HTMLCanvasElement).toDataURL());
      await sheet.locator('[data-sheet-turn=right]').click();
      expect(await portrait.evaluate(canvas=>(canvas as HTMLCanvasElement).toDataURL())).not.toBe(front);
      await sheet.locator('[data-sheet-turn=left]').click();
    }
    await bag.locator('[data-page="1"]').click();
    await expect(bag.locator('.bag-cell')).toHaveCount(100);
    await expect(bag.locator('.bag-item')).toHaveCount(0);
    await bag.locator('.bag-grid').hover();
    await page.mouse.wheel(0,-160);
    await expect(bag.locator('[data-page="1"]')).toHaveAttribute('aria-pressed','true');
    await bag.locator('[data-page="0"]').click();
    const gridScroll=bag.locator('.bag-scroll');
    await gridScroll.hover();
    await page.mouse.wheel(0,1200);
    await expect.poll(()=>gridScroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    await page.mouse.wheel(0,1200);
    await expect(bag.locator('[data-page="0"]')).toHaveAttribute('aria-pressed','true');
    await gridScroll.evaluate(el=>el.scrollTop=0);
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
    await expect(bag.locator('.bag-count')).toHaveText('0 / 200');
    await expect(sheet.locator('.worn-icon')).toHaveAttribute('src',master.items[item].icon);
    const equippedSlot=sheet.locator('.gear-cell[data-equipped]');
    await expect(equippedSlot.locator('.gear-equipped-check')).toBeVisible();
    await expect(equippedSlot).toHaveAccessibleName(/สวมใส่อยู่|Equipped/);
    await expect(equippedSlot).not.toHaveCSS('box-shadow','none');
    if(job==='novice'){
      const badge=equippedSlot.locator('.gear-equipped-check');
      expect(await badge.evaluate(icon=>{
        const badgeBounds=icon.getBoundingClientRect();
        const portrait=icon.closest('.equipment-stage')!.querySelector('.paper-doll')!.getBoundingClientRect();
        const left=Math.max(badgeBounds.left,portrait.left);
        const right=Math.min(badgeBounds.right,portrait.right);
        const top=Math.max(badgeBounds.top,portrait.top);
        const bottom=Math.min(badgeBounds.bottom,portrait.bottom);
        if(left>=right || top>=bottom)return false;
        const badgeElement=icon as HTMLElement;
        badgeElement.style.pointerEvents='auto';
        try{
          return document.elementFromPoint((left+right)/2,(top+bottom)/2)===icon;
        }finally{badgeElement.style.removeProperty('pointer-events');}
      })).toBe(true);
      await sheet.screenshot({path:'test-results/inventory/equipped-sheet.png'});
    }
    await sheet.locator('[data-weapon-slot]').click();
    await expect.poll(ownWeapon).toEqual(equipped);
    await expect(sheet.locator('.paper-doll canvas')).toHaveAttribute('data-appearance',job+'-male-01/'+item);
    await expect(sheet.locator('dd').first()).toHaveText(physical);
    await expect(sheet.locator('[data-points]')).toHaveText('10');
    if(job==='novice'){
      await sheet.locator('[data-wardrobe=costume]').click();
      await expect(sheet.locator('.gear-slots .gear-cell')).toHaveCount(11);
      await expect(sheet.locator('[data-gear=cloak]')).toBeVisible();
      await expect(sheet.locator('.worn-icon')).toHaveCount(0);
      await expect(equippedSlot).toHaveCount(0);
      await expect(sheet.locator('[data-battle=physical]')).toHaveText(physical);
      await sheet.locator('[data-wardrobe=equipment]').click();
      await expect(sheet.locator('.worn-icon')).toHaveCount(1);
      await expect(equippedSlot.locator('.gear-equipped-check')).toBeVisible();
      await sheet.locator('[data-action=max-DEX]').click();
      await expect(sheet.locator('[data-preview=DEX]')).toHaveText('+10');
      expect(await sheet.locator('[data-action=max-DEX]').evaluate(button=>{
        const range=document.createRange();
        range.selectNodeContents(button);
        return range.getBoundingClientRect().right<=button.getBoundingClientRect().right-2 &&
          button.getBoundingClientRect().right<=button.closest('.journal-stats')!.getBoundingClientRect().right-4;
      })).toBe(true);
      await expect(sheet.locator('[data-battle-preview=hit]')).toHaveText('→ 150');
      await sheet.locator('[data-action=cancel-stats]').click();
      await sheet.locator('[data-action=level]').click();
      await expect(sheet.locator('[data-points]')).toHaveText('15');
      const strength=sheet.locator('[data-action=raise-STR]');
      await expect(sheet.locator('.allocation-actions')).toBeHidden();
      const restingStrength=await strength.boundingBox();
      await strength.click();
      await expect(sheet.locator('[data-preview=STR]')).toHaveText('+1');
      expect(await strength.boundingBox()).toEqual(restingStrength);
      await sheet.locator('[data-action=raise-VIT]').click();
      await expect(sheet.locator('[data-points]')).toHaveText('13');
      await expect(sheet.locator('[data-battle=physical]')).toHaveText('6');
      await expect(sheet.locator('[data-battle-preview=physical]')).toHaveText('→ 8');
      await sheet.locator('[data-action=raise-AGI]').click();
      await expect(sheet.locator('[data-battle-preview=attackSpeed]')).toHaveText('→ 1.14');
      await expect(sheet.locator('[data-battle-preview=flee]')).toHaveText('→ 101');
      await expect(sheet.locator('.allocation-actions button').first()).toHaveText(/ตกลง|OK/);
      await expect(sheet.locator('[data-action=confirm-stats]')).toHaveCSS('border-image-source',/confirm\.webp/);
      await expect(sheet.locator('[data-action=cancel-stats]')).toHaveCSS('border-image-source',/reset\.webp/);
      await page.setViewportSize({width:1050,height:535});
      for(const panel of [sheet,bag]){
        await expect.poll(async()=>{
          const {x,y,width,height}=(await panel.boundingBox())!;
          return x>=0 && y>=0 && x+width<=1050 && y+height<=535;
        }).toBe(true);
        await expect(panel).toHaveCSS('overflow-y','visible');
      }
      await page.screenshot({path:'test-results/inventory/compact-windows.png'});
      const layout=()=>sheet.evaluate(async panel=>{
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        return ['', '[data-action=raise-AGI]', '[data-action=max-AGI]', '.sheet-balance'].map(selector=>{
          const {x,y,width,height}=(selector?panel.querySelector(selector)!:panel).getBoundingClientRect();
          return {x,y,width,height};
        });
      });
      const compact=await layout();
      const confirmBox=(await sheet.locator('[data-action=confirm-stats]').boundingBox())!;
      const cancelBox=(await sheet.locator('[data-action=cancel-stats]').boundingBox())!;
      expect(confirmBox.x).toBeLessThan(cancelBox.x);
      expect(cancelBox.x+cancelBox.width).toBeLessThan(compact[3].x);
      expect(confirmBox.y+confirmBox.height/2).toBeCloseTo(compact[3].y+compact[3].height/2,0);
      await sheet.locator('[data-action=cancel-stats]').click();
      expect(await layout()).toEqual(compact);
      await sheet.locator('[data-action=max-AGI]').click();
      await expect(sheet.locator('[data-preview=AGI]')).toHaveText('+15');
      expect(await layout()).toEqual(compact);
      await sheet.locator('[data-action=cancel-stats]').click();
      await sheet.locator('[data-action=raise-AGI]').hover();
      await page.mouse.down();
      try{
        await expect(sheet.locator('[data-preview=AGI]')).toHaveText(/\+[2-9]|\+1\d/);
        expect(await layout()).toEqual(compact);
      }finally{await page.mouse.up();}
      await page.setViewportSize({width:1440,height:900});
      await sheet.locator('[data-action=cancel-stats]').click();
      await expect(sheet.locator('[data-points]')).toHaveText('15');
      await expect(sheet.locator('[data-preview=VIT]')).toBeEmpty();
      await expect(sheet.locator('.allocation-actions')).toBeHidden();
      await expect(sheet.locator('[data-battle-preview=attackSpeed]')).toBeEmpty();
      await sheet.locator('[data-action=max-STR]').click();
      await expect(sheet.locator('[data-preview=STR]')).toHaveText('+15');
      await sheet.locator('[data-action=cancel-stats]').click();
      await strength.hover();await page.mouse.down();
      try{await expect(strength).toBeDisabled();}finally{await page.mouse.up();}
      await expect(sheet.locator('[data-preview=STR]')).toHaveText('+15');
      await expect(sheet.locator('[data-battle=physical]')).toHaveText('6');
      await expect(sheet.locator('[data-battle-preview=physical]')).toHaveText('→ 36');
      await sheet.locator('[data-action=confirm-stats]').click();
      await expect(sheet.locator('[data-preview=STR]')).toBeEmpty();
      await expect(sheet.locator('[data-points]')).toHaveText('0');
      await expect(sheet.locator('.allocation-actions')).toBeHidden();
      await expect(sheet.locator('dd').first()).toHaveText('36');
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
    await sheet.locator('[data-weapon-slot]').click({button:'right'});
    await expect(equippedSlot).toHaveCount(0);
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

test('inventory filters, expands for free, and preserves items beyond the second page',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');
  await page.locator('#guest').click();
  await chooseCharacter(page,'warrior-male-01');
  const bag=page.locator('#journal-bag'),sheet=page.locator('#journal-sheet');
  await page.locator('#settings-toggle').click();
  await page.locator('[data-toggle=bag]').click();
  const expand=bag.locator('[data-bag-expand]');
  await expect(bag.locator('.bag-count')).toHaveText('1 / 200');
  await expect(bag.locator('.bag-gold')).toHaveText('0');
  await expand.click();
  await expect(bag.locator('.bag-count')).toHaveText('1 / 300');
  await expect(bag.locator('[data-page="2"]')).toHaveText('201–300');
  await bag.locator('[data-item=longsword]').click({button:'right'});
  await expect(bag.locator('.bag-item')).toHaveCount(0);
  // Simulate an existing save with a full bag and a separately equipped sword.
  await page.evaluate(()=>{
    const key=Object.keys(localStorage).find(k=>k.startsWith('mr.character.v1.') && k.endsWith('.warrior'))!;
    const saved=JSON.parse(localStorage.getItem(key)!);
    saved.bag=Array(300).fill('bow');
    saved.bag[299]='dagger';
    localStorage.setItem(key,JSON.stringify(saved));
    window.dispatchEvent(new StorageEvent('storage',{key}));
  });
  await page.keyboard.press('c');
  await expect(sheet.locator('[data-weapon-slot]')).toBeDisabled();
  await expect(bag.locator('.bag-count')).toHaveText('300 / 300');
  await bag.locator('[data-page="2"]').click();
  await expect(bag.locator('.bag-item')).toHaveCount(100);
  await page.setViewportSize({width:390,height:680});
  await page.keyboard.press('c');
  await bag.locator('.bag-scroll').hover();
  await page.mouse.wheel(0,270);
  await expect.poll(()=>bag.locator('.bag-scroll').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await bag.locator('[data-index="299"]').click({button:'right'});
  await expect(bag.locator('[data-index="298"]')).toHaveAttribute('data-item','bow');
  await expect(bag.locator('[data-index="299"]')).toHaveAttribute('data-item','longsword');
  await expect(bag.locator('.bag-count')).toHaveText('300 / 300');
  const search=bag.locator('#bag-search');
  await search.pressSequentially('Longsword');
  await expect(bag.locator('.bag-item')).toHaveCount(1);
  await expect(bag.locator('[data-index="299"]')).toBeVisible();
  await bag.locator('[data-bag-category=materials]').click();
  await expect(bag.locator('.bag-item')).toHaveCount(0);
  await bag.locator('[data-bag-category=equipment]').click();
  await expect(bag.locator('.bag-item')).toHaveCount(1);
  await bag.locator('[data-bag-clear]').click();
  await bag.locator('[data-bag-category=all]').click();
  await expect(bag.locator('.bag-cell')).toHaveCount(100);
  for(let capacity=400;capacity<=1000;capacity+=100){
    await expand.click();
    await expect(bag.locator('.bag-count')).toHaveText('300 / '+capacity);
  }
  await expect(expand).toBeDisabled();
  await expect(bag.locator('.bag-pages button')).toHaveCount(10);
  await expect(bag.locator('.bag-gold')).toHaveText('0');
  const tabs=bag.locator('.bag-pages');
  const activeTab=tabs.locator('[aria-pressed=true]');
  await activeTab.scrollIntoViewIfNeeded();
  const tabBox=(await activeTab.boundingBox())!;
  const stripBox=(await tabs.boundingBox())!;
  await activeTab.hover();
  await page.mouse.down();
  try{
    expect(await activeTab.boundingBox()).toEqual(tabBox);
    expect(await tabs.boundingBox()).toEqual(stripBox);
    expect(await tabs.evaluate(el=>el.scrollHeight-el.clientHeight)).toBe(0);
  }finally{await page.mouse.up();}
  await tabs.hover();
  await page.mouse.wheel(0,2400);
  await expect.poll(()=>tabs.evaluate(el=>el.scrollLeft)).toBeGreaterThan(300);
  await expect(bag.locator('[data-page="2"]')).toHaveAttribute('aria-pressed','true');
  await bag.locator('[data-page="9"]').click();
  await expect(bag.locator('[data-page="9"]')).toHaveText('901–1000');
  await expect(bag.locator('[data-page="9"]')).toHaveAttribute('aria-pressed','true');
  await expect(bag.locator('.bag-cell')).toHaveCount(100);
  await page.reload();
  await chooseCharacter(page,'warrior-male-01');
  await page.keyboard.press('i');
  await expect(bag.locator('.bag-count')).toHaveText('300 / 1000');
});

test('manual slot moves survive reload and sorting packs items from every page',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/'); await page.locator('#guest').click(); await chooseCharacter(page,'warrior-male-01');
  await page.keyboard.press('i');
  const bag=page.locator('#journal-bag');
  const slot=(index:number)=>bag.locator(`.journal-content [data-slot="${index}"]`);
  const tab=(index:number)=>bag.locator(`.journal-content [data-page="${index}"]`);
  await slot(0).dragTo(slot(6));
  await expect(slot(6)).toHaveAttribute('data-item','longsword');
  await expect(slot(0)).toHaveClass(/vacant/);
  await expect(bag.locator('.bag-count')).toHaveText('1 / 200');
  await page.reload();
  await chooseCharacter(page,'warrior-male-01');
  await page.keyboard.press('i');
  await expect(slot(6)).toHaveAttribute('data-item','longsword');
  await page.evaluate(()=>{
    const key=Object.keys(localStorage).find(k=>k.startsWith('mr.character.v1.') && k.endsWith('.warrior'))!;
    const saved=JSON.parse(localStorage.getItem(key)!);
    saved.bag[7]='bow';
    saved.bag[50]='dagger';
    localStorage.setItem(key,JSON.stringify(saved));
    window.dispatchEvent(new StorageEvent('storage',{key}));
  });
  await slot(7).dragTo(slot(6));
  await expect(slot(6)).toHaveAttribute('data-item','bow');
  await expect(slot(7)).toHaveAttribute('data-item','longsword');

  const from=(await slot(7).boundingBox())!;
  const next=(await tab(1).boundingBox())!;
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);
  await page.mouse.down();
  try{
    await page.mouse.move(from.x+from.width/2+12,from.y+from.height/2);
    await page.mouse.move(next.x+next.width/2,next.y+next.height/2,{steps:10});
    await page.mouse.move(next.x+next.width/2+1,next.y+next.height/2);
    await expect(tab(1)).toHaveAttribute('aria-pressed','true');
    const to=(await slot(105).boundingBox())!;
    await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:8});
    await page.mouse.move(to.x+to.width/2+1,to.y+to.height/2);
  }finally{await page.mouse.up();}
  await expect(slot(105)).toHaveAttribute('data-item','longsword');
  await expect(bag.locator('.bag-count')).toHaveText('3 / 200');
  await bag.locator('#bag-search').fill('Longsword');
  await expect(bag.locator('.journal-content .bag-item')).toHaveCount(1);
  await bag.locator('[data-action=sort-bag]').click();
  await expect(bag.locator('.journal-content .bag-item')).toHaveCount(0);
  await bag.locator('[data-bag-clear]').click();
  await tab(0).click();
  await expect(slot(0)).toHaveAttribute('data-item','dagger');
  await expect(slot(1)).toHaveAttribute('data-item','longsword');
  await expect(slot(2)).toHaveAttribute('data-item','bow');
  await slot(1).click({button:'right'});
  await expect(slot(1)).toHaveClass(/vacant/);
  await expect(slot(2)).toHaveAttribute('data-item','bow');
  await expect(bag.locator('.bag-count')).toHaveText('2 / 200');
});
