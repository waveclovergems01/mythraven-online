import {test,expect,type Page} from '@playwright/test';
test('approved horizontal walk animates both clients, mirrors east and restores idle',async({page,context})=>{
 test.setTimeout(60000);const errors:string[]=[],missing:string[]=[];
 async function enter(p:Page){p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)missing.push(r.url());});await p.route('**/src/scenes/WorldScene.ts*',async r=>{const res=await r.fetch();await r.fulfill({response:res,body:await res.text()+'\nconst originalWalkCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){originalWalkCreate.apply(this,args);window.testScene=this;};'});});await p.goto('/');await p.locator('#guest').click();await expect(p.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:20000});await p.waitForFunction(()=>{const s=(window as any).testScene;return s?.views.has(s.network.room?.sessionId)});}
 await page.setViewportSize({width:1280,height:720});await enter(page);const other=await context.newPage();await enter(other);
 const id=await page.evaluate(()=>(window as any).testScene.network.room.sessionId);
 const pose=(p:Page)=>p.evaluate(id=>{const v=(window as any).testScene.views.get(id),b=v?.body;return b?{texture:b.texture.key,anim:b.anims.currentAnim?.key,playing:b.anims.isPlaying,flip:b.flipX,frame:Number(b.frame.name),anchor:[b.originX,b.originY],scale:b.scaleX}:null;},id);
 await expect.poll(()=>pose(other)).not.toBeNull();
 for(const [key,flip,dir] of [['d',true,'e'],['a',false,'w']] as const){
  await page.bringToFront();await page.keyboard.down(key);
  for(const p of [page,other])await expect.poll(async()=>{const b=await pose(p);return b?.texture==='novice-male-walk-w'&&b.playing&&b.flip===flip;}).toBe(true);
  const seen=new Set<number>();for(let i=0;i<18;i++){seen.add((await pose(page))!.frame);await page.waitForTimeout(60)}expect(seen.size).toBe(8);
  expect((await pose(page))!.anchor).toEqual([.5,.9]);expect((await pose(page))!.scale).toBe(1.1);
  await page.screenshot({path:'test-results/novice-walk-'+dir+'.png'});
  await page.keyboard.up(key);
  for(const p of [page,other])await expect.poll(async()=>{const b=await pose(p);return b?.texture==='novice-male-idle'&&b.anim==='novice-idle-'+dir&&b.flip===false;}).toBe(true);
 }
 await page.keyboard.down('s');await expect.poll(async()=>{const b=await pose(page);return b?.texture==='novice-male-idle'&&!b.flip&&!b.playing;}).toBe(true);await page.keyboard.up('s');
 await expect.poll(async()=>(await pose(page))?.anim).toBe('novice-idle-s');
 expect(errors).toEqual([]);expect(missing).toEqual([]);await other.close();
});

