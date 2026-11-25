import {test,expect} from '@playwright/test';

test('chest flashes follow posed rigs, render through occluders, and retain their full lifetime',async({page})=>{
  const errors:string[]=[];
  await page.addInitScript(()=>{
    const original=AudioBufferSourceNode.prototype.start;
    const connect = AudioBufferSourceNode.prototype.connect;
    const gainNodes = new WeakMap<AudioBufferSourceNode, GainNode>();
    AudioBufferSourceNode.prototype.connect = function(destination: AudioNode | AudioParam, ...indices: number[]) {
      if (destination instanceof GainNode) gainNodes.set(this, destination);
      return Reflect.apply(connect, this, [destination, ...indices]);
    } as typeof connect;
    (window as any).soundStarts=0;
    (window as any).soundGains=[];
    const ids=new WeakMap<AudioBuffer,number>();let nextId=0;
    (window as any).soundBuffers=[];
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){
      (window as any).soundStarts++;
      (window as any).soundGains.push(gainNodes.get(this)?.gain.value);
      if(this.buffer){if(!ids.has(this.buffer))ids.set(this.buffer,++nextId);(window as any).soundBuffers.push(ids.get(this.buffer));}
      return original.apply(this,args);
    };
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.setViewportSize({width:1200,height:720});
  await page.route('**/__impact_qa',route=>route.fulfill({contentType:'text/html',body:`
    <meta charset="utf-8"><style>body{margin:0;background:#172529;color:#eee;font:18px sans-serif}header{position:absolute;top:20px;width:100%;text-align:center}canvas{display:block}</style>
    <header>Rabbit · white / Wolf · pale gold critical / Player · red</header>
    <script type="module">
      import * as THREE from '/node_modules/three/build/three.module.js';
      import {GLTFLoader} from '/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
      import {createCombatImpact} from '/src/terrain/combat-impact.ts';
      import {audioSettings} from '/src/audio-settings.ts';
      const scene=new THREE.Scene();scene.background=new THREE.Color('#172529');
      const camera=new THREE.PerspectiveCamera(40,1200/720,.1,100);
      const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
      renderer.setSize(1200,720);document.body.append(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xffffff,0x667788,2.5));
      const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(3,6,8);scene.add(sun);
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x364c36}));
      ground.rotation.x=-Math.PI/2;scene.add(ground);
      const loader=new GLTFLoader(),actors=[];
      for(const [file,height,x] of [['monsters/meadow-rabbit',1.12,-4],['monsters/wolf-cube',1.65,0],['characters/bodies/novice',2.8,4]]){
        const asset=await loader.loadAsync('/assets/models/'+file+'.glb');
        const model=asset.scene,root=new THREE.Group();root.add(model);scene.add(root);
        const mixer=new THREE.AnimationMixer(model);
        const idle=asset.animations.find(c=>/idle/i.test(c.name));if(idle)mixer.clipAction(idle).play();mixer.update(.05);
        model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model,true),center=box.getCenter(new THREE.Vector3());
        model.position.add(new THREE.Vector3(-center.x,-box.min.y,-center.z));root.scale.setScalar(height/(box.max.y-box.min.y));root.position.x=x;
        actors.push({model,root,height,bone:model.getObjectByName('DEF-spine003')});
      }
      let clock=1000;performance.now=()=>clock;
      const impacts=createCombatImpact(scene),focus=new THREE.Vector3();
      const wall=new THREE.Mesh(new THREE.PlaneGeometry(22,12),new THREE.MeshBasicMaterial({color:0x263648,side:THREE.DoubleSide}));
      wall.visible=false;scene.add(wall);
      function view(back=false){camera.position.set(0,6,back?-18:18);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);}
      function draw(){scene.updateMatrixWorld(true);impacts.update(camera);renderer.render(scene,camera);}
      function hit(){actors.forEach((a,i)=>impacts.show({to:i===2?'player':'monster',damage:6,critical:i===1},a.root.position,a.height,focus,a.model));}
      function pixelsAt(point){
        const p=point.clone().project(camera),gl=renderer.getContext(),pixels=new Uint8Array(21*21*4);
        gl.readPixels(Math.round((p.x+1)*600)-10,Math.round((p.y+1)*360)-10,21,21,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;
      }
      view();draw();
      window.impactQA={
        phase(ms){clock+=1000;draw();hit();clock+=ms;draw();},
        sizes(){
          const samples=[];const random=Math.random;
          try{for(const value of [0,.5,1]){
            clock+=1000;draw();Math.random=()=>value;
            impacts.show({to:'monster',damage:6,critical:false},focus,1.12,focus);
            clock+=140;draw();samples.push(scene.getObjectByName('combat-impacts').children.find(m=>m.visible).scale.x);
          }}finally{Math.random=random;}
          return samples;
        },
        palette(){clock+=1000;draw();hit();clock+=80;draw();return scene.getObjectByName('combat-impacts').children.filter(m=>m.visible).map(m=>m.material.uniforms.tint.value.toArray());},
        bowAudio(){
          impacts.show({to:'monster',weapon:'bow',damage:6,critical:false},focus,2.8,focus);
          return {starts:window.soundStarts,buffer:window.soundBuffers.at(-1)};
        },
        criticalAudio(){
          for(const weapon of ['dagger','longsword','bow'])impacts.show({to:'monster',weapon,damage:6,critical:true},focus,2.8,focus);
          return window.soundBuffers.slice(-3);
        },
        step(kind,distance){impacts.step(kind,new THREE.Vector3(),new THREE.Vector3(distance,0,0));return window.soundStarts;},
        audio(distance,incoming=false){
          const listener=new THREE.Vector3(distance,0,0),point=new THREE.Vector3();
          impacts.show({to:incoming?'player':'monster',weapon:'dagger',damage:6,critical:false},point,2.8,listener);
          return window.soundStarts;
        },
        mixedAudio(){
          audioSettings.setVolume('master', .1);
          audioSettings.setVolume('self', .5);
          audioSettings.setVolume('others', .2);
          const before=window.soundStarts;
          const event={to:'monster',weapon:'dagger',damage:6,critical:false};
          impacts.show(event,focus,2.8,focus,undefined,'self');
          impacts.show(event,focus,2.8,focus,undefined,'others');
          const gains=window.soundGains.slice(before);
          audioSettings.setEnabled('effectsEnabled',false);
          impacts.show(event,focus,2.8,focus,undefined,'self');
          impacts.show(event,focus,2.8,focus,undefined,'others');
          return {gains,count:window.soundStarts-before};
        },
        hidden(value){Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},
        sample(){hit();clock+=80;draw();return actors.map(a=>!!a.bone);},
        angles(back){view(back);draw();},
        occluded(){
          view();wall.position.copy(camera.position).multiplyScalar(.5);wall.quaternion.copy(camera.quaternion);wall.visible=true;
          clock=1600;draw();const centers=actors.map(a=>a.bone.getWorldPosition(new THREE.Vector3()));
          const before=centers.map(pixelsAt);hit();clock+=80;draw();
          return centers.map((center,i)=>{const after=pixelsAt(center);return after.reduce((sum,n,j)=>sum+Math.abs(n-before[i][j]),0);});
        },
        follow(){
          const a=actors[0];a.bone.position.x+=.15;draw();
          const meshes=scene.getObjectByName('combat-impacts').children.filter(m=>m.visible);
          return {error:meshes[0].position.distanceTo(a.bone.getWorldPosition(new THREE.Vector3())),
            facing:meshes.map(m=>Math.abs(m.quaternion.dot(camera.quaternion))),sizes:meshes.map(m=>m.scale.x)};
        },
        lifetime(){
          clock=2300;draw();hit();
          return [250,270,275,290,310,330].map(ms=>{clock=2300+ms;draw();return scene.getObjectByName('combat-impacts').children.filter(m=>m.visible).length;});
        }
      };
    </script>`}));
  await page.goto('/__impact_qa');
  await page.waitForFunction(()=>(window as any).impactQA);
  expect(await page.evaluate(()=>(window as any).impactQA.sample())).toEqual([true,true,true]);
  await page.screenshot({path:'test-results/combat/impact-chest-front.png'});
  await page.evaluate(()=>(window as any).impactQA.angles(true));
  await page.screenshot({path:'test-results/combat/impact-chest-back.png'});
  const differences=await page.evaluate(()=>(window as any).impactQA.occluded());
  expect(differences.every((delta:number)=>delta>10000)).toBe(true);
  await page.screenshot({path:'test-results/combat/impact-through-occluder.png'});
  const follow=await page.evaluate(()=>(window as any).impactQA.follow());
  expect(follow.error).toBeLessThan(.001);
  expect(follow.facing.every((dot:number)=>dot>.9999)).toBe(true);
  // Small creatures share the player's torso-sized flash, including critical hits.
  // Slight differences at the same wall-clock time reflect the different lifetimes.
  expect(follow.sizes[2]/2.8).toBeGreaterThan(.3);
  expect(follow.sizes[2]/2.8).toBeLessThan(.65);
  expect(follow.sizes[0]/follow.sizes[2]).toBeGreaterThan(.75);
  expect(follow.sizes[0]/follow.sizes[2]).toBeLessThan(1.3);
  expect(follow.sizes[1]/follow.sizes[2]).toBeGreaterThan(.75);
  expect(follow.sizes[1]/follow.sizes[2]).toBeLessThan(1.3);
  expect(await page.evaluate(()=>(window as any).impactQA.lifetime())).toEqual([3,2,2,1,1,0]);
  const sizes=await page.evaluate(()=>(window as any).impactQA.sizes());
  for(let i=0;i<3;i++)expect(sizes[i]).toBeCloseTo(1.54*1.22*(.8+i*.1),5);
  const palette=await page.evaluate(()=>(window as any).impactQA.palette());
  expect(palette).toEqual([[.97,.99,1],[1,.79,.38],[1,.10,.14]]);
  for(const ms of [20,140,240]){
    await page.evaluate(ms=>(window as any).impactQA.phase(ms),ms);
    await page.screenshot({path:`test-results/combat/impact-phase-${ms}.png`});
  }
  await page.mouse.click(20,20);
  await expect.poll(()=>page.evaluate(()=>(window as any).impactQA.audio(0))).toBeGreaterThan(0);
  const starts=await page.evaluate(()=>(window as any).soundStarts);
  expect(await page.evaluate(()=>(window as any).impactQA.audio(9,true))).toBe(starts+1);
  expect(await page.evaluate(()=>(window as any).impactQA.audio(18,true))).toBe(starts+1);
  expect(await page.evaluate(()=>(window as any).impactQA.audio(40))).toBe(starts+1);
  await page.evaluate(()=>(window as any).impactQA.hidden(true));
  expect(await page.evaluate(()=>(window as any).impactQA.audio(0))).toBe(starts+1);
  await page.evaluate(()=>(window as any).impactQA.hidden(false));
  expect(await page.evaluate(()=>(window as any).impactQA.audio(0))).toBe(starts+2);
  const criticalBuffers=await page.evaluate(()=>(window as any).impactQA.criticalAudio());
  expect(criticalBuffers).toHaveLength(3);expect(new Set(criticalBuffers).size).toBe(1);
  const beforeBow=await page.evaluate(()=>(window as any).soundStarts);
  const bowAudio=await page.evaluate(()=>(window as any).impactQA.bowAudio());
  expect(bowAudio.starts).toBe(beforeBow+1);
  expect(bowAudio.buffer).not.toBe(criticalBuffers[0]);
  const footstepStart=await page.evaluate(()=>(window as any).soundStarts);
  expect(await page.evaluate(()=>(window as any).impactQA.step('rabbit',0))).toBe(footstepStart+1);
  expect(await page.evaluate(()=>(window as any).impactQA.step('rabbit',5))).toBe(footstepStart+2);
  expect(await page.evaluate(()=>(window as any).impactQA.step('wolf',8))).toBe(footstepStart+3);
  expect(await page.evaluate(()=>(window as any).impactQA.step('wolf',18))).toBe(footstepStart+3);
  await page.evaluate(()=>(window as any).impactQA.hidden(true));
  expect(await page.evaluate(()=>(window as any).impactQA.step('rabbit',0))).toBe(footstepStart+3);
  await page.evaluate(()=>(window as any).impactQA.hidden(false));
  const mixed = await page.evaluate(()=>(window as any).impactQA.mixedAudio());
  expect(mixed.count).toBe(2);
  expect(mixed.gains[0]).toBeCloseTo(.28 * .05, 6);
  expect(mixed.gains[1]).toBeCloseTo(.28 * .02, 6);
  expect(errors).toEqual([]);
});
