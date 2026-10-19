import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('shared multiplayer map stays fixed after resize',async({page,context},testInfo)=>{
 const out=testInfo.outputPath('ground-preview');
 test.setTimeout(60000);await fs.mkdir(out,{recursive:true});
 await page.route('**/src/scenes/WorldScene.ts*',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nconst originalPreviewCreate=WorldScene.prototype.create;WorldScene.prototype.create=function(data){originalPreviewCreate.call(this,data);window.previewScene=this;};'});
 });
 await page.setViewportSize({width:1056,height:960});await page.goto('/');await page.locator('#guest').click();
 await expect(page.locator('#network-status')).toHaveAttribute('data-connected','true',{timeout:20000});
 await page.waitForFunction(()=>Boolean((window as any).previewScene?.player));
 await page.setViewportSize({width:1920,height:960});
 await expect.poll(()=>page.evaluate(()=>(window as any).previewScene.cameras.main.width)).toBe(1920);
 const measure=()=>page.evaluate(()=>{const s=(window as any).previewScene,c=s.cameras.main,b=c.getBounds();return {map:[b.width,b.height],camera:[c.width/c.zoom,c.height/c.zoom],visible:[c.width/c.zoom/b.width,c.height/c.zoom/b.height]};});
 await expect.poll(async()=>(await measure()).map[0]).toBe(7680);
 const before=await measure();expect(before.visible[0]).toBe(.5);
 // Preview-only re-entry rebuild: no production source or asset replacement.
 await page.evaluate(()=>{/* shared world must not rebuild when a viewport changes */});
 await expect.poll(async()=>(await measure()).map[0]).toBe(7680);
 await page.waitForTimeout(1200);
 await page.evaluate(()=>{const s=(window as any).previewScene,b=s.cameras.main.getBounds();s.cameras.main.stopFollow().centerOn(b.width*.5,b.height*.488);});
 await page.waitForTimeout(300);
 const after=await measure();expect(after.visible[0]).toBe(.5);expect(after.visible[1]).toBeCloseTo(1/3,2);
 await page.screenshot({path:out+'/camera-preview.png'});
 const ground=await page.locator('.minimap-image img').getAttribute('src');
 await fs.writeFile(out+'/camera-measurements.json',JSON.stringify({beforeResizeRebuild:before,previewAfterReentry:after,runtimeChanged:true},null,2));
 const diagram=await context.newPage();await diagram.setViewportSize({width:1200,height:1030});
 await diagram.setContent(`<html lang="th"><meta charset="utf-8"><style>body{margin:0;background:#192b29;color:#efe5cb;font:22px Tahoma;padding:32px}h1{font-size:30px;margin:0 0 10px}p{margin:0 0 22px;color:#c1d4c3}.map{position:relative;width:1100px;height:${1100*after.map[1]/after.map[0]}px;background:#253930}.map img{width:100%;height:100%}.grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr)}.cell{border:2px solid #fff1b8;box-sizing:border-box;display:flex;justify-content:center;align-items:flex-start;padding-top:12px}.cell b{background:#18352be0;padding:7px 20px;border-radius:8px;font-size:20px}footer{margin-top:20px;font-size:18px}</style><h1>Mythraven — พรีวิวขนาดแมป 2 × 3 ช่วงกล้อง</h1><p>แต่ละช่อง = ภาพที่กล้องเห็นหนึ่งจอ • เห็นแมปครั้งละ 50% แนวนอน × 33% แนวตั้ง</p><div class="map"><img src="${ground}"><div class="grid">${[1,2,3,4,5,6].map(i=>'<div class="cell"><b>ช่วงกล้อง '+i+'</b></div>').join('')}</div></div><footer>ภาพนี้ตรวจเฉพาะขนาดแมป • ใช้ไทล์ชุดใหม่ • ปูซ้ำด้วยไทล์แยกจากผังเมือง</footer></html>`);
 await diagram.screenshot({path:out+'/map-2x3-preview.png'});await diagram.close();
});
