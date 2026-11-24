// Render the registered weapon models in their authored bind pose.
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import catalog from '../shared/character-master.json' with {type:'json'};

const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
let browser;
try {
  browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage();
  await page.route('**/icon-stage',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Item icons</title>'}));
  await page.goto(server.resolvedUrls.local[0]+'icon-stage');
  for(const [id,item] of Object.entries(catalog.items)){
    const png=await page.evaluate(async({id,url})=>{
      const THREE=await import('/node_modules/three/build/three.module.js');
      const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const asset=await new GLTFLoader().loadAsync(url);
      const scene=new THREE.Scene(),model=new THREE.Group();
      asset.scene.updateMatrixWorld(true);
      asset.scene.traverse(source=>{
        if(!source.isMesh)return;
        const mesh=new THREE.Mesh(source.geometry,source.material);
        mesh.applyMatrix4(source.matrixWorld);model.add(mesh);
      });
      scene.add(model);
      const box=new THREE.Box3().setFromObject(model);
      const center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()*.55;
      const camera=new THREE.OrthographicCamera(-radius,radius,radius,-radius,.001,100);
      const direction=id==='bow'?new THREE.Vector3(1,.1,.18):new THREE.Vector3(.16,1,.12);
      camera.up.set(0,id==='bow'?1:0,id==='bow'?0:1);
      camera.position.copy(center).addScaledVector(direction,radius*4);camera.lookAt(center);camera.rotateZ(.65);
      scene.add(new THREE.HemisphereLight(0xfff5df,0x9eaaad,1.6));
      const key=new THREE.DirectionalLight(0xffecd5,2);key.position.set(-1,3,2);scene.add(key);
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
      renderer.setSize(512,512);renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.render(scene,camera);
      const data=renderer.domElement.toDataURL('image/png').split(',')[1];
      renderer.dispose();renderer.forceContextLoss();return data;
    },{id,url:item.model});
    const trimmed=await sharp(Buffer.from(png,'base64')).trim({background:'#00000000',threshold:3}).png().toBuffer();
    const sprite=await sharp(trimmed).resize(76,76,{fit:'contain',background:'#00000000'}).extend({top:10,bottom:10,left:10,right:10,background:'#00000000'}).png().toBuffer();
    const path='public'+item.icon;
    await mkdir(dirname(path),{recursive:true});await writeFile(path,sprite);
  }
}finally{await browser?.close();await server.close();}

