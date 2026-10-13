import { test, expect } from '@playwright/test';
test.use({video: {mode:'on',size:{width:1280,height:720}}});

test('favicon assets decode and ICO has a valid container', async ({page,request}) => {
  await page.goto('/');
  const icons=await page.locator('link[rel="icon"]').evaluateAll(links=>links.map(x=>(x as HTMLLinkElement).href));
  expect(icons.length).toBe(3);
  for(const url of icons)expect((await request.get(url)).ok()).toBe(true);
  const ico=await (await request.get('/favicon.ico')).body();
  expect(ico.readUInt16LE(2)).toBe(1);expect(ico.readUInt16LE(4)).toBe(3);
  const size=await page.evaluate(async()=>{const img=new Image();img.src='/assets/icons/mythraven-32.png';await img.decode();return img.naturalWidth;});
  expect(size).toBe(32);
  const manifest=await (await request.get('/manifest.webmanifest')).json();
  for(const icon of manifest.icons)expect((await request.get(icon.src)).ok()).toBe(true);
});


test('city viewport proportions, painted grass, removed crossings, water and minimap', async ({page}) => {
  await page.route('**/src/scenes/WorldScene.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body: await response.text() + '\nconst oldCreate=WorldScene.prototype.create; WorldScene.prototype.create=function(){oldCreate.call(this);window.testScene=this;window.testGrid={MAP_COLUMNS:MAP_WIDTH/TILE_WIDTH,MAP_ROWS:MAP_HEIGHT/TILE_HEIGHT,SPAWN,findPath,walkable,cellAt};};'});
  });
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/'); await page.locator('#guest').click();
  await page.waitForFunction(()=>Boolean((window as any).testScene?.player));
  const size = await page.evaluate(()=>{const s=(window as any).testScene;const b=s.cameras.main.getBounds();return [b.width,b.height];});
  expect(size[0]*0.5).toBe(2560);
  expect(size[1]*0.5).toBeGreaterThanOrEqual(2160);
  expect(size[1]*0.5).toBeLessThan(2188);
  const start = await page.evaluate(()=>{const s=(window as any).testScene;return [s.tile.x,s.tile.y,s.cameras.main.scrollX];});
  // Diagonal destination in the lawn, away from the old restricted road mask.
  const dest=[start[0]+3,start[1]+3];
  const point=await page.evaluate(([x,y])=>{const c=(window as any).testScene.cameras.main;return [c.width/2+((x+.5)*64-c.midPoint.x)*c.zoom,c.height/2+((y+.5)*56-c.midPoint.y)*c.zoom];},dest);
  await page.mouse.click(point[0],point[1]);
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).testScene;return [s.tile.x,s.tile.y];})).toEqual(dest);
  await expect.poll(()=>page.evaluate(()=>(window as any).testScene.cameras.main.scrollX)).toBeGreaterThan(start[2]);
  const result=await page.evaluate(async()=>{
    const g=(window as any).testGrid;
    const n=g.MAP_COLUMNS,m=g.MAP_ROWS;
    const bridges=[{x:Math.floor(n*.49),y:0}];
    const routes=bridges.map(end=>g.findPath(g.SPAWN,end));
    const routeValid=routes.every(route=>route.length>0&&route.every((c:any,i:number)=>{const prev=i?route[i-1]:g.SPAWN;return g.walkable(c)&&Math.abs(c.x-prev.x)+Math.abs(c.y-prev.y)===1;}));
    const water=[{x:Math.floor(n*.06),y:Math.floor(m*.49)},{x:Math.floor(n*.94),y:Math.floor(m*.49)},{x:Math.floor(n*.50),y:Math.floor(m*.91)},{x:Math.floor(n*.25),y:Math.floor(m*.06)}];
    const lawns=[.25,.4,.6,.75].flatMap(x=>[.25,.4,.6,.75].map(y=>g.walkable({x:Math.floor(n*x),y:Math.floor(m*y)})));
    return {routeValid,water:water.map(c=>g.walkable(c)),lawns,boundary:g.cellAt(64,55.9)};
  });
  expect(result.routeValid).toBe(true); expect(result.water).toEqual([false,false,false,false]);
  expect(result.lawns.every(Boolean)).toBe(true); expect(result.boundary).toEqual({x:1,y:0});
  for(const [width,height] of [[1920,1080],[390,844],[844,390],[1280,720]]) {
    await page.setViewportSize({width,height});
    await expect.poll(()=>page.evaluate(()=>{const s=(window as any).testScene,c=s.cameras.main;return [s.game.canvas.getBoundingClientRect().width,c.height,s.hover.width*c.zoom,s.hover.height*c.zoom];})).toEqual([width,height,32,28]);
    await expect.poll(()=>page.evaluate(()=>{
      const s=(window as any).testScene,v=s.cameras.main.worldView,b=s.cameras.main.getBounds();
      const r=document.querySelector('.minimap-view')!;
      const expected=[Math.max(0,v.x),Math.max(0,v.y),Math.min(v.right,b.width)-Math.max(0,v.x),Math.min(v.bottom,b.height)-Math.max(0,v.y)];
      return ['x','y','width','height'].every((k,i)=>Math.abs(Number(r.getAttribute(k))-expected[i])<.01);
    })).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  }
  const terrain = await page.evaluate(()=>{
    const s=(window as any).testScene;
    const chunks=s.children.list.filter((o:any)=>o.texture?.key.startsWith('town-ground-'));
    return {count:chunks.length, native:chunks.every((o:any)=>o.scaleX*s.cameras.main.zoom===1&&o.texture.getSourceImage().width<=513),mini:document.querySelector<HTMLImageElement>('.minimap-image img')!.src.startsWith('data:image/png')};
  });
  expect(terrain.count).toBeGreaterThan(1); expect(terrain.native).toBe(true);expect(terrain.mini).toBe(true);
  await page.screenshot({path:'test-results/mythraven-grass.png'});
  await page.evaluate(()=>{const s=(window as any).testScene,b=s.cameras.main.getBounds();s.cameras.main.stopFollow().centerOn(b.width*.21,b.height*.49);});
  await page.waitForFunction(()=>{const s=(window as any).testScene,c=s.cameras.main;return Math.abs(c.midPoint.x-c.getBounds().width*.21)<5;});
  await page.screenshot({path:'test-results/mythraven-paving-bank.png'});
  const waterBefore=await page.screenshot({clip:{x:110,y:300,width:32,height:96}});
  const phases:number[]=[];
  for(let i=0;i<22;i++){
    phases.push(await page.evaluate(()=>{const s=(window as any).testScene;return s.children.getByName('water-current').tilePositionX;}));
    await page.waitForTimeout(500);
  }
  const waterAfter=await page.screenshot({clip:{x:110,y:300,width:32,height:96}});
  expect(waterBefore.equals(waterAfter)).toBe(false);
  const changes=phases.slice(1).map((x,i)=>x-phases[i]);
  expect(changes.some(x=>x>1)).toBe(true);expect(changes.some(x=>x< -1)).toBe(true);
  await page.screenshot({path:'test-results/mythraven-water-curves.png'});
  const coverage=await page.evaluate(()=>{
    const img=(window as any).testScene.textures.get('town-coverage').getSourceImage();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
    const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
    let bare=0,half=0,full=0;for(let i=3;i<d.length;i+=4){if(d[i]===0)bare++;if(d[i]>115&&d[i]<140)half++;if(d[i]>250)full++;}
    return {bare,half,full};
  });
  expect(coverage.bare).toBeGreaterThan(1000);expect(coverage.half).toBeGreaterThan(1000);expect(coverage.full).toBeGreaterThan(1000);
  await page.locator('#logout').click(); await expect(page.locator('.minimap')).toHaveCount(0);
  await page.locator('#guest').click();
  await expect(page.locator('.minimap')).toHaveCount(1);
  await page.waitForFunction(()=>Boolean((window as any).testScene?.player));
  expect(await page.evaluate(()=>(window as any).testScene.textures.exists('town-ground-0-0'))).toBe(true);
  expect(await page.evaluate(()=>(window as any).testScene.children.list.filter((o:any)=>o.name==='water-current'||o.name==='water-ripples').length)).toBe(2);
  const video=page.video();await page.close();await video?.saveAs('test-results/mythraven-water-preview.webm');
});



