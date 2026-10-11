import { test, expect } from '@playwright/test';

test('favicon assets decode and ICO has a valid container', async ({page,request}) => {
  await page.goto('/');
  const icons=await page.locator('link[rel="icon"]').evaluateAll(links=>links.map(x=>(x as HTMLLinkElement).href));
  expect(icons.length).toBe(3);
  for(const url of icons)expect((await request.get(url)).ok()).toBe(true);
  const ico=await (await request.get('/favicon.ico')).body();
  expect(ico.readUInt16LE(2)).toBe(1);expect(ico.readUInt16LE(4)).toBe(3);
  const size=await page.evaluate(async()=>{const img=new Image();img.src='/assets/icons/mythraven-32-v001.png';await img.decode();return img.naturalWidth;});
  expect(size).toBe(32);
  const manifest=await (await request.get('/manifest.webmanifest')).json();
  for(const icon of manifest.icons)expect((await request.get(icon.src)).ok()).toBe(true);
});

test('city grid hover, camera follow, movement and blocked cells', async ({page}) => {
  // Instrument the actual loaded module, including Vite's HMR query string.
  await page.route('**/src/scenes/WorldScene.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:await response.text()+'\nconst testCreate=WorldScene.prototype.create; WorldScene.prototype.create=function(){testCreate.call(this);window.testScene=this;};'});
  });
  await page.goto('/');
  await page.locator('#guest').click();
  await page.waitForFunction(()=>Boolean((window as any).testScene?.player));
  const canvas=page.locator('#game canvas');
  const box=(await canvas.boundingBox())!;
  const point=async(x:number,y:number)=>page.evaluate(({x,y})=>{
    const c=(window as any).testScene.cameras.main;
    return {x:c.width/2+(x-c.midPoint.x)*c.zoom,y:c.height/2+(y-c.midPoint.y)*c.zoom};
  },{x,y});
  const hover=await point(21*128+12,36*56+12);
  await page.mouse.move(box.x+hover.x,box.y+hover.y);
  await expect.poll(()=>page.evaluate(()=>{const h=(window as any).testScene.hover;return [h.visible,h.x,h.y];})).toEqual([true,21*128,36*56]);
  const originalScroll=await page.evaluate(()=>(window as any).testScene.cameras.main.scrollX);
  await page.mouse.click(box.x+hover.x,box.y+hover.y);
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).testScene;return [s.player.x,s.player.y];})).toEqual([42.5*64,36.5*56]);
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.cameras.main.scrollX)).toBeGreaterThan(originalScroll+50);
  const after=await point(22*128+20,36*56+20);
  await page.mouse.move(box.x+after.x,box.y+after.y);
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.hover.x)).toBe(22*128);
  const blocked=await point(24*128+64,33*56+28);
  await page.mouse.click(box.x+blocked.x,box.y+blocked.y);
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.hover.fillColor)).toBe(0xef7878);
  expect(await page.evaluate(()=>(window as any).testScene.path.length)).toBe(0);
  await page.keyboard.down('d');
  await page.waitForTimeout(400);
  await page.keyboard.up('d');
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.player.x)).toBeGreaterThan(21.5*128);
  await page.locator('#logout').hover();
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.hover.visible)).toBe(false);
  await page.screenshot({path:'test-results/daflak-city.png',fullPage:true});
  for (const [width,height] of [[1920,1080],[390,844],[844,390]]) {
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>{
      const s=(window as any).testScene, canvas=s.game.canvas;
      const r=canvas.getBoundingClientRect();
      return [r.x,r.y,r.width,r.height,s.cameras.main.width,s.cameras.main.height,
        s.hover.width*s.cameras.main.zoom*r.width/s.game.scale.gameSize.width,
        s.hover.height*s.cameras.main.zoom*r.height/s.game.scale.gameSize.height];
    })).toEqual([0,0,width,height,width,height,32,28]);
    await expect.poll(()=>page.evaluate(()=>{
      const s=(window as any).testScene, v=s.cameras.main.worldView;
      const r=document.querySelector('.minimap-view')!;
      const p=document.querySelector('.minimap-player')!;
      const expected=[Math.max(0,v.x),Math.max(0,v.y),Math.min(v.right,5120)-Math.max(0,v.x),Math.min(v.bottom,4480)-Math.max(0,v.y),s.player.x,s.player.y];
      const actual=['x','y','width','height'].map(k=>Number(r.getAttribute(k))).concat(['cx','cy'].map(k=>Number(p.getAttribute(k))));
      return actual.every((n,i)=>Math.abs(n-expected[i])<0.01);
    })).toBe(true);
    const mini=(await page.locator('.minimap').boundingBox())!;
    const logout=(await page.locator('#logout').boundingBox())!;
    expect(mini.y).toBeGreaterThanOrEqual(logout.y+logout.height);
    expect(mini.x+mini.width).toBeLessThanOrEqual(width);
    expect(mini.y+mini.height).toBeLessThanOrEqual(height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  }
  const position=await page.evaluate(()=>{const s=(window as any).testScene;return [s.player.x,s.player.y];});
  await page.locator('.minimap-image').click();
  expect(await page.evaluate(()=>{const s=(window as any).testScene;return [s.player.x,s.player.y,s.path.length];})).toEqual([...position,0]);
  await page.setViewportSize({width:1280,height:720});
  await page.screenshot({path:'test-results/minimap.png'});
  await page.locator('#logout').click();
  await expect(page.locator('.minimap')).toHaveCount(0);
});

test('grid boundaries and routes stay on walkable cardinal cells',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const source='/src/world/daflak-grid.ts';const g=await import(source);
    const invalid=[g.walkable({x:-1,y:36}),g.walkable({x:80,y:36}),g.walkable({x:0,y:0}),g.walkable({x:38.2,y:0})];
    const path=g.findPath({x:38,y:0},{x:79,y:36});
    const valid=path.every((c:any,i:number)=>{const p=i?path[i-1]:{x:38,y:0};return g.walkable(c)&&Math.abs(p.x-c.x)+Math.abs(p.y-c.y)===1;});
    return {invalid,valid,length:path.length,boundary:g.cellAt(64,55.9),blocked:g.findPath(g.SPAWN,{x:0,y:0})};
  });
  expect(result.invalid).toEqual([false,false,false,false]);expect(result.valid).toBe(true);
  expect(result.length).toBeGreaterThan(0);expect(result.boundary).toEqual({x:1,y:0});expect(result.blocked).toEqual([]);
});
