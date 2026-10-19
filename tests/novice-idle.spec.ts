import {test,expect} from '@playwright/test';
test('approved idle plays fast for local and remote players with fixed feet',async({page,context})=>{
 test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const enter=async(p:any)=>{await p.route('**/src/scenes/WorldScene.ts*',async(r:any)=>{const res=await r.fetch();await r.fulfill({response:res,body:await res.text()+'\nconst original=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){original.apply(this,args);window.testScene=this;};'});});await p.goto('/');await p.locator('#guest').click();await expect(p.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:20000});await p.waitForFunction(()=>{const s=(window as any).testScene;return s?.views.size>0;});};
 await page.setViewportSize({width:1280,height:720});await enter(page);const other=await context.newPage();await enter(other);
 await expect.poll(()=>page.evaluate(()=>(window as any).testScene.views.size)).toBeGreaterThanOrEqual(2);
 await page.bringToFront();const seen=new Set<number>();await expect.poll(async()=>{seen.add(await page.evaluate(()=>{const s=(window as any).testScene;return Number(s.views.get(s.network.room.sessionId).body.frame.name);}));return seen.size;},{timeout:6000,intervals:[100]}).toBe(4);
 expect(await page.evaluate(()=>{const s=(window as any).testScene;return [...s.views.values()].every((v:any)=>v.body.texture.key==='novice-male-idle'&&v.body.anims.currentAnim.frameRate===2.5&&v.body.originY===.9&&v.body.y===0);})).toBe(true);
 // Inspect all eight directions through the same pose adapter used by server snapshots.
 const results=await page.evaluate(()=>{const s=(window as any).testScene;const v=s.views.get(s.network.room.sessionId);const out=[];for(const [dx,dy] of [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]]){v.updatePose(100,100,false);v.updatePose(100+dx*20,100+dy*20,true);const stopped=!v.body.anims.isPlaying;v.updatePose(100+dx*20,100+dy*20,false);out.push({key:v.body.anims.currentAnim.key,stopped});}return out;});
 expect(results.map(r=>r.key)).toEqual(['s','sw','w','nw','n','ne','e','se'].map(d=>'novice-idle-'+d));expect(results.map(r=>r.stopped)).toEqual([true,false,false,true,true,true,false,false]);
 await page.bringToFront();await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');await page.waitForTimeout(500);
 expect(await page.evaluate(()=>{const s=(window as any).testScene;return s.views.get(s.network.room.sessionId).body.anims.currentAnim.key;})).toBe('novice-idle-e');
 await page.screenshot({path:'test-results/novice-idle-integrated.png'});expect(errors).toEqual([]);await other.close();
});
