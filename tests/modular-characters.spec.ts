import {test,expect} from '@playwright/test';
import {selectAppearance} from './helpers/character-selection';

test('preview shares two hairstyles across the three rigs and equips class weapons',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[],requests:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/PropertyBinding|WebGLProgram: Shader Error/.test(m.text()))errors.push(m.text());});
  page.on('request',r=>{if(r.url().includes('/characters/hair/'))requests.push(r.url());});
  await page.route('**/src/terrain/skinned-player.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+
      '\nconst original=loadSkinnedPlayers;loadSkinnedPlayers=async(...args)=>{const f=await original(...args),create=f.create;f.create=(...args)=>window.currentAvatar=create(...args);return f;};'});
  });
  await page.goto('/');await page.locator('#guest').click();
  await page.locator('[data-hair-color="#d4dbe8"]').click();
  const state=()=>page.evaluate(()=>(window as any).currentAvatar?.inspect());
  const preview = page.locator('#character-preview');
  await expect(preview).toHaveAttribute('data-ready', 'true');
  const yaw = () => page.evaluate(() => (window as any).currentAvatar?.group.rotation.y);
  const bounds = (await preview.boundingBox())!;
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 180, y, { steps: 4 });
  await page.mouse.up();
  expect(await yaw()).toBeCloseTo(Math.PI);
  await preview.press('ArrowRight');
  expect(await yaw()).toBeCloseTo(Math.PI + Math.PI / 12);
  await page.locator('#preview-weapon').selectOption('dagger');
  await expect(page.locator('#preview-motion')).toBeEnabled();
  expect(await yaw()).toBeCloseTo(Math.PI + Math.PI / 12);
  await preview.press('ArrowLeft');
  await page.mouse.move(x + 180, y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
  expect(await yaw()).toBeCloseTo(0);
  for(const [job,weapon,attack] of [['novice','dagger','n_dagger_attack1'],['warrior','longsword','n_sword_attack1'],['archer','bow','n_bow_attack']]){
    if(job!=='novice'){
      await page.locator(`input[name="character-class"][value="${job}"]`).check();
      await expect(page.locator('input[name="character-hair"]:checked')).toHaveValue('2');
      await expect(preview).toHaveAttribute('data-character-id',job+'-male-02');
    }
    for(const style of [1,2]){
      const id=job+'-male-0'+style;
      await selectAppearance(page,id);
      await expect(page.locator('#character-preview')).toHaveAttribute('data-character-id',id);
      await page.locator('#preview-weapon').selectOption(weapon);
      await expect(page.locator('#preview-motion')).toBeEnabled();
      for(const [motion,clip] of [['idle','n_idle_hold'],['slow','n_run_hold'],['run','n_run_hold'],['attack',attack]]){
        await page.locator('#preview-motion').selectOption(motion);
        await expect.poll(state).toMatchObject({state:motion,clip,hairStyle:style,model:job,hairColor:'#d4dbe8'});
      }
      await page.locator('#preview-motion').selectOption('idle');
      await expect.poll(state).toMatchObject({clip:'n_idle_hold'});
      await page.locator('#character-preview').screenshot({path:'test-results/character-kit/'+id+'.png'});
    }
    if(job==='warrior'){
      await page.locator('#preview-weapon').selectOption('dagger');
      await expect(page.locator('#preview-motion')).toBeEnabled();
      await expect(page.locator('#preview-motion option[value=attack]')).toHaveJSProperty('disabled',true);
    }
  }
  await page.locator('#enter-city').click();
  await expect(page.locator('#walk-speed')).toBeEnabled({timeout:60000});
  await expect.poll(state).toMatchObject({model:'archer',hairStyle:2,clip:'n_idle',hairColor:'#d4dbe8'});
  expect(requests).toHaveLength(2);
  expect(errors).toEqual([]);
});
