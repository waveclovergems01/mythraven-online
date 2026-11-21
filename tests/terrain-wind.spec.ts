import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { chooseCharacter } from './helpers/character-selection';

test('real tree color and shadow passes animate while a frozen wind frame is stable', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type()==='error' && /shader|THREE|GL_INVALID/.test(m.text())) errors.push(m.text()); });
  await page.route('**/src/terrain/TerrainWorld.ts*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('renderer.render(scene, camera);', `
      if (!window.windScene) {
        const review = new THREE.Scene(); review.background = new THREE.Color('#b9c9c5');
        const source = groves.group.children.find(m=>m.name==='grove-oak');
        const tree = new THREE.InstancedMesh(source.geometry,source.material,1);
        tree.setMatrixAt(0,new THREE.Matrix4()); tree.customDepthMaterial=source.customDepthMaterial;
        tree.castShadow=tree.receiveShadow=true;review.add(tree);
        const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#a6b493'}));
        ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;review.add(ground);
        review.add(new THREE.HemisphereLight('#f2f5e6','#718478',2.15));
        const light=new THREE.DirectionalLight('#fff0d0',2.5);light.position.set(8,16,12);light.castShadow=true;
        light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-15,right:15,top:15,bottom:-15});review.add(light);
        const cam=new THREE.PerspectiveCamera(40,camera.aspect,.1,100);cam.position.set(15,10,20);cam.lookAt(0,4.5,0);cam.updateMatrixWorld();
        window.windScene={review,cam};window.windFrame=0;
      }
      groves.update(camera,undefined,window.windFrame);
      renderer.render(window.windScene.review,window.windScene.cam);`);
    await route.fulfill({response,body});
  });
  await page.setViewportSize({width:1000,height:800});
  await page.goto('/');await page.locator('#guest').click();await chooseCharacter(page);
  await page.waitForFunction(()=>!!(window as any).windScene);
  // Screenshot the rendered tree only: live minimap, connection text and player
  // name overlays are DOM siblings that otherwise contaminate pixel comparison.
  await page.addStyleTag({content:'body * { visibility:hidden !important; } #game canvas { visibility:visible !important; }'});
  const frame = async (time: number, name: string) => {
    await page.evaluate(t=>{(window as any).windFrame=t;},time);
    await page.waitForTimeout(250);
    return page.locator('#game canvas').screenshot({path:`test-results/terrain-wind/${name}.png`});
  };
  const first=await frame(0,'calm'), gust=await frame(3,'gust'), repeat=await frame(0,'calm-repeat');
  const raw=async(buffer:Buffer)=>sharp(buffer).removeAlpha().raw().toBuffer();
  const a=await raw(first), b=await raw(gust), c=await raw(repeat);
  let changed=0, unstable=0;
  for(let i=0;i<a.length;i+=3){
    if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)changed++;
    if(Math.abs(a[i]-c[i])+Math.abs(a[i+1]-c[i+1])+Math.abs(a[i+2]-c[i+2])>12)unstable++;
  }
  expect(changed).toBeGreaterThan(100);expect(unstable).toBe(0);
  expect(errors).toEqual([]);
});
