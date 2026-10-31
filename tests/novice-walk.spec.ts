import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('horizontal and both diagonal walks animate both clients, mirror and restore idle',async({page,context})=>{
 test.setTimeout(60000);const errors:string[]=[],missing:string[]=[];
 async function enter(p:Page){p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)missing.push(r.url());});await p.route('**/src/scenes/WorldScene.ts*',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:await res.text()+'\nconst originalWalkCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){originalWalkCreate.apply(this,args);window.testScene=this;};'});});await p.goto('/');await p.locator('#guest').click();await expect(p.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:20000});await p.waitForFunction(()=>{const s=(window as any).testScene;return s?.views.has(s.network.room?.sessionId)});}
 const nwHash=createHash('sha256').update(await readFile('public/assets/characters/novice-male-walk-nw.png')).digest('hex');
 const loadedNw:Promise<{url:string;hash:string}>[]=[];
 function watchNw(p:Page){p.on('response',r=>{if(new URL(r.url()).pathname==='/assets/characters/novice-male-walk-nw.png')loadedNw.push(r.body().then(body=>({url:r.url(),hash:createHash('sha256').update(body).digest('hex')})));});}
 watchNw(page);await page.setViewportSize({width:1280,height:720});await enter(page);const other=await context.newPage();watchNw(other);await enter(other);
 const id=await page.evaluate(()=>(window as any).testScene.network.room.sessionId);
 const pose=(p:Page)=>p.evaluate(id=>{const v=(window as any).testScene.views.get(id),b=v?.body;return b?{texture:b.texture.key,anim:b.anims.currentAnim?.key,playing:b.anims.isPlaying,flip:b.flipX,frame:Number(b.frame.name),fps:b.anims.currentAnim?.frameRate,anchor:[b.originX,b.originY],scale:b.scaleX}:null;},id);
 await expect.poll(()=>pose(other)).not.toBeNull();
 for(const [keys,flip,dir,texture,fps] of [[['d'],true,'e','novice-male-walk-w',10],[['a'],false,'w','novice-male-walk-w',10],[['s','a'],false,'sw','novice-male-walk-sw',12],[['s','d'],true,'se','novice-male-walk-sw',12],[['w','a'],false,'nw','novice-male-walk-nw',12],[['w','d'],true,'ne','novice-male-walk-nw',12]] as const){
  await page.bringToFront();for(const key of keys)await page.keyboard.down(key);
  for(const p of [page,other])await expect.poll(async()=>{const b=await pose(p);return b?.texture===texture&&b.playing&&b.flip===flip&&b.fps===fps;}).toBe(true);
  const seen=new Set<number>(),remoteSeen=new Set<number>();for(let i=0;i<24;i++){const [local,remote]=await Promise.all([pose(page),pose(other)]);seen.add(local!.frame);remoteSeen.add(remote!.frame);await page.waitForTimeout(60)}expect(seen.size).toBe(8);expect(remoteSeen.size).toBe(8);
  expect((await pose(page))!.anchor).toEqual([.5,.9]);expect((await pose(page))!.scale).toBe(1.1);
  await page.screenshot({path:'test-results/novice-walk-'+dir+'.png'});
  // Release diagonal keys in one browser task so a transient single-axis step cannot change the final facing.
  if(keys.length>1)await page.evaluate(keys=>{for(const key of keys){const code=key.toUpperCase().charCodeAt(0);window.dispatchEvent(new KeyboardEvent('keyup',{key,code:'Key'+key.toUpperCase(),keyCode:code,which:code,bubbles:true}));}},[...keys]);
  for(const key of keys)await page.keyboard.up(key);
  for(const p of [page,other])await expect.poll(async()=>{const b=await pose(p);return b?.texture==='novice-male-idle'&&b.anim==='novice-idle-'+dir&&b.flip===false;}).toBe(true);
 }
 await page.keyboard.down('s');await expect.poll(async()=>{const b=await pose(page);return b?.texture==='novice-male-idle'&&!b.flip&&!b.playing;}).toBe(true);await page.keyboard.up('s');
 await expect.poll(async()=>(await pose(page))?.anim).toBe('novice-idle-s');
 const loaded=await Promise.all(loadedNw);expect(loaded).toHaveLength(2);
 for(const asset of loaded){expect(asset.hash).toBe(nwHash);expect(new URL(asset.url).searchParams.get('v')).toBe(nwHash.slice(0,12));}
 expect(errors).toEqual([]);expect(missing).toEqual([]);await other.close();
});

