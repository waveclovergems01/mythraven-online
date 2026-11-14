import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('fountain and castle fade behind the local player, restore in front, and fountain is painted on minimap',async({page})=>{
 test.setTimeout(120000);const out='test-results/landmark-visibility';await fs.mkdir(out,{recursive:true});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+
   '\nimport {CASTLE as testCastle,FOUNTAIN as testFountain} from "/shared/town-layout.mjs";import {walkable as testWalkable,cellAt as testCellAt} from "/shared/town-grid.mjs";const landmarkCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(...args){landmarkCreate.apply(this,args);window.landmarkTest={scene:this,castle:testCastle,fountain:testFountain,walkable:testWalkable,cellAt:testCellAt};};'});
 });
 await page.setViewportSize({width:1920,height:1080});await page.goto('/?view=2d');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:30000});
 await page.waitForFunction(()=>{const s=(window as any).landmarkTest?.scene;return s?.views.has(s.network.room?.sessionId);});
 const positions=await page.evaluate(()=>{
  const t=(window as any).landmarkTest,b=t.scene.cameras.main.getBounds(),f=t.fountain,k=t.castle;
  const castlePoint=(sx:number,sy:number)=>t.cellAt(b.width*k.x+(sx-k.anchorX)*k.width/k.sourceWidth,b.height*k.y+(sy-k.anchorY)*k.width/k.sourceWidth);
  return {fountainBack:t.cellAt(b.width*f.x,b.height*f.y-330),fountainFront:t.cellAt(b.width*f.x,b.height*f.y+360),castleBack:castlePoint(900,580),castleWingFront:castlePoint(300,920),listeners:t.scene.events.listenerCount('postupdate')};
 });
 const move=async(cell:{x:number;y:number})=>{
  expect(await page.evaluate(c=>(window as any).landmarkTest.walkable(c),cell)).toBe(true);
  await page.evaluate(c=>(window as any).landmarkTest.scene.network.move(c.x,c.y),cell);
  await expect.poll(()=>page.evaluate(c=>{const s=(window as any).landmarkTest.scene,p=s.network.players.get(s.network.room.sessionId);return Math.hypot(p.x-(c.x+.5)*64,p.y-(c.y+.5)*56);},cell),{timeout:40000}).toBeLessThan(1);
 };
 const alpha=async(prefix:string)=>page.evaluate(prefix=>(window as any).landmarkTest.scene.children.list.filter((o:any)=>o.name===prefix||o.name.startsWith(prefix+'-')).map((o:any)=>o.alpha),prefix);
 const faded=async(prefix:string)=>expect.poll(async()=>Math.max(...await alpha(prefix))).toBeLessThan(.5);
 const opaque=async(prefix:string)=>expect.poll(async()=>Math.min(...await alpha(prefix))).toBeGreaterThan(.99);
 const initialMini=await page.locator('.minimap-image img').getAttribute('src');
 // Check the scaled art's color distribution and blue basin location. Canvas
 // CPU/GPU downsampling can differ per pixel at this small size.
 const miniProof=await page.evaluate(async()=>{
  const t=(window as any).landmarkTest,s=t.scene,f=t.fountain,img=document.querySelector('.minimap-image img') as HTMLImageElement;await img.decode();
  const actual=document.createElement('canvas');actual.width=img.naturalWidth;actual.height=img.naturalHeight;const ac=actual.getContext('2d')!;ac.drawImage(img,0,0);
  const expected=document.createElement('canvas');expected.width=actual.width;expected.height=actual.height;const ec=expected.getContext('2d')!;
  const worldScale=actual.width/15360,scale=f.width/f.sourceWidth*worldScale;
  ec.drawImage(s.textures.get('town-fountain').getSourceImage(),15360*f.x*worldScale-f.anchorX*scale,11536*f.y*worldScale-f.anchorY*scale,f.sourceWidth*scale,f.sourceHeight*scale);
  const a=ac.getImageData(0,0,actual.width,actual.height).data,e=ec.getImageData(0,0,actual.width,actual.height).data;
  let checked=0,blue=0,expectedBlue=0,blueX=0,blueY=0,expectedX=0,expectedY=0;const color=[0,0,0],expectedColor=[0,0,0];
  for(let i=0;i<e.length;i+=4)if(e[i+3]>250){
   checked++;for(let c=0;c<3;c++){color[c]+=a[i+c];expectedColor[c]+=e[i+c];}
   const x=(i/4)%actual.width,y=Math.floor(i/4/actual.width);
   if(a[i+2]>a[i]+20&&a[i+1]>a[i]+15){blue++;blueX+=x;blueY+=y;}
   if(e[i+2]>e[i]+20&&e[i+1]>e[i]+15){expectedBlue++;expectedX+=x;expectedY+=y;}
  }
  return {checked,blue,colorError:Math.max(...color.map((sum,i)=>Math.abs(sum-expectedColor[i])/checked)),blueCenterError:Math.hypot(blueX/blue-expectedX/expectedBlue,blueY/blue-expectedY/expectedBlue),expected:expected.toDataURL('image/png')};
 });
 await fs.writeFile(out+'/city-with-fountain.png',Buffer.from(initialMini!.split(',')[1],'base64'));
 await fs.writeFile(out+'/expected-fountain.png',Buffer.from(miniProof.expected.split(',')[1],'base64'));
 expect(miniProof.checked).toBeGreaterThan(250);expect(miniProof.blue).toBeGreaterThan(100);expect(miniProof.colorError).toBeLessThan(8);expect(miniProof.blueCenterError).toBeLessThan(2);
 await move(positions.fountainBack);await faded('town-fountain');await faded('fountain-water');await faded('fountain-fall');await faded('fountain-ripples');
 expect(await page.evaluate(()=>{const s=(window as any).landmarkTest.scene;return s.children.getByName('fountain-water').anims.isPlaying;})).toBe(true);
 await page.screenshot({path:out+'/fountain-behind.png'});
 expect(await page.locator('.minimap-image img').getAttribute('src')).toBe(initialMini);
 await move(positions.fountainFront);await opaque('town-fountain');await opaque('fountain-water');await opaque('fountain-fall');
 await page.screenshot({path:out+'/fountain-front.png'});
 await move(positions.castleBack);await faded('castle-section');await faded('castle-flag');
 await page.screenshot({path:out+'/castle-behind.png'});
 await move(positions.castleWingFront);await opaque('castle-section');await opaque('castle-flag');
 await page.screenshot({path:out+'/castle-wing-front.png'});
 // A point in the castle's large transparent top-left padding must not fade it.
 const emptyPadding=await page.evaluate(()=>{
  const t=(window as any).landmarkTest,s=t.scene,k=t.castle,b=s.cameras.main.getBounds();
  s.scene.pause();s.player.setPosition(b.width*k.x+(30-k.anchorX)*2,b.height*k.y+(500-k.anchorY)*2);
  for(let i=0;i<20;i++)s.events.emit('postupdate',0,100);
  const opacity=s.children.getByName('castle-section-0').alpha;s.scene.resume();return opacity;
 });
 expect(emptyPadding).toBe(1);
 await page.locator('#logout').click();await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true');
 await page.waitForFunction(()=>{const s=(window as any).landmarkTest.scene;return s.views.has(s.network.room?.sessionId);});
 expect(await page.evaluate(()=>(window as any).landmarkTest.scene.events.listenerCount('postupdate'))).toBe(positions.listeners);
 await move(positions.fountainBack);await faded('town-fountain');
 expect(errors).toEqual([]);
 await fs.writeFile(out+'/validation.json',JSON.stringify({positions,miniProof,emptyPadding,errors},null,2));
 await page.locator('#logout').click();
});
