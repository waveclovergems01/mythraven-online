import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { chooseCharacter } from './helpers/character-selection';

test('a real level gain plays the level-up layers and local chime once',async({page},testInfo)=>{
  test.setTimeout(60000);
  const shaderErrors:string[]=[];
  page.on('console',message=>{
    if(message.type()==='error' && /shader|WebGLProgram/i.test(message.text()))shaderErrors.push(message.text());
  });
  await page.addInitScript(()=>{
    const fetchAsset=window.fetch;
    const chimeBytes=new WeakSet<ArrayBuffer>();
    window.fetch=async(...args)=>{
      const response=await fetchAsset(...args);
      if(response.url.endsWith('/levelup_aura_chime.mp3')){
        const arrayBuffer=response.arrayBuffer.bind(response);
        response.arrayBuffer=async()=>{
          const bytes=await arrayBuffer();
          chimeBytes.add(bytes);
          return bytes;
        };
      }
      return response;
    };
    const decode=AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData=function(...args:Parameters<typeof decode>){
      const result=decode.apply(this,args);
      if(chimeBytes.has(args[0]))void result.then(()=>{(window as any).auraSoundReady=()=>this.state==='running';});
      return result;
    };
    const original=AudioBufferSourceNode.prototype.start;
    (window as any).auraSounds=[];
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){
      (window as any).auraSounds.push(this.buffer?.duration);
      return original.apply(this,args);
    };
  });
  await page.route('**/src/terrain/TerrainWorld.ts*',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace('renderer.render(scene, camera);',`
      window.grantAuraExperience=(amount=100)=>profile.change({kind:'experience',amount});
      renderer.render(scene, camera);
      const aura=scene.getObjectByName('level-up-aura');
      window.auraNow={
        visible:aura.visible,
        layers:aura.children.map(mesh=>mesh.name),
        strands:aura.getObjectByName('gold-spiral').geometry.instanceCount,
        foliageRadius:['green-leaves','pink-petals'].map(name=>aura.getObjectByName(name).material.uniforms.emission.value.x)
      };
      window.auraSamples=()=>{
        const data=(name,attribute)=>Array.from(aura.getObjectByName(name).geometry.getAttribute(attribute).array);
        const ribbons=data('gold-spiral','ribbon').slice(0,window.auraNow.strands*4);
        return {
          leaves:data('green-leaves','burst'),
          leafLifetimes:data('green-leaves','motion').filter((_,i)=>i%4===0),
          edgeRadii:data('edge-beams','column').filter((_,i)=>i%4===1),
          edgeWidths:data('edge-beams','column').filter((_,i)=>i%4===3),
          ribbonLifetimes:ribbons.filter((_,i)=>i%4===1),
          ribbonSweeps:ribbons.filter((_,i)=>i%4===3).map(radians=>Math.abs(radians)*180/Math.PI)
        };
      };
      if(aura.visible){
        const age=aura.children[0].material.uniforms.age.value;
        if(age>.41 && age<.78 && !window.auraFrame)window.auraFrame=canvas.toDataURL();
        window.auraAge=age;
      }`);
    await route.fulfill({response,body});
  });
  await page.goto('/');
  await page.locator('#guest').click();
  await chooseCharacter(page);
  await page.keyboard.press('c');
  await page.waitForFunction(()=>(window as any).auraSoundReady?.());
  await page.keyboard.press('c');
  await page.evaluate(()=>{(window as any).auraSounds=[];return (window as any).grantAuraExperience();});
  await expect(page.locator('.vital-level')).toHaveText('Lv. 2');
  await expect.poll(()=>page.evaluate(()=>(window as any).auraSounds.length)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>(window as any).auraNow.layers)).toEqual([
    'ground-rings','base-glow','light-column','gold-spiral','edge-beams','gold-sparks','rising-dust','green-leaves','pink-petals',
  ]);
  expect([3,4]).toContain(await page.evaluate(()=>(window as any).auraNow.strands));
  expect(await page.evaluate(()=>(window as any).auraNow.foliageRadius)).toEqual([2.31,2.59]);
  await page.waitForFunction(()=>Boolean((window as any).auraFrame));
  await page.waitForFunction(()=>(window as any).auraNow?.visible===false);
  expect(await page.evaluate(()=>(window as any).auraAge)).toBeGreaterThan(.7);
  const frame=await page.evaluate(()=>(window as any).auraFrame.split(',')[1]);
  await mkdir(testInfo.outputDir,{recursive:true});
  await writeFile(testInfo.outputPath('level-up-burst.png'),Buffer.from(frame,'base64'));
  expect(shaderErrors).toEqual([]);
  expect(await page.evaluate(()=>(window as any).auraSounds.length)).toBe(1);
  const first=await page.evaluate(()=>(window as any).auraSamples());
  expect(Math.max(...first.edgeRadii)).toBeGreaterThan(2.8);
  expect(first.edgeWidths.every((n:number)=>n>=.579 && n<=.981)).toBe(true);
  expect(Math.max(...first.edgeWidths)).toBeGreaterThan(.75);
  expect(first.leafLifetimes.every((n:number)=>n>=.699 && n<=1)).toBe(true);
  expect(first.ribbonLifetimes.every((n:number)=>n>=.799 && n<=1)).toBe(true);
  expect(first.ribbonSweeps.every((n:number)=>n>=39.99 && n<=50.01)).toBe(true);
  await page.evaluate(()=>(window as any).grantAuraExperience(160));
  await expect(page.locator('.vital-level')).toHaveText('Lv. 3');
  const second=await page.evaluate(()=>(window as any).auraSamples());
  expect(second.leaves).not.toEqual(first.leaves);
  expect(second.leafLifetimes).not.toEqual(first.leafLifetimes);
  expect(second.ribbonLifetimes).not.toEqual(first.ribbonLifetimes);
  await expect.poll(()=>page.evaluate(()=>(window as any).auraSounds.length)).toBe(2);
});
