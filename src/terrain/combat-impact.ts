import * as THREE from 'three';
import type {CombatHit} from '../network/terrain-client';
import sounds from '../../shared/combat-effects.json';
import behavior from '../../shared/monster-behavior.json';

export function combatVolume(distance:number){
  return .28*Math.max(0,1-Math.max(0,distance-3)/15)**2;
}

export function createCombatImpact(scene:THREE.Scene){
  const geometry=new THREE.PlaneGeometry(1,1);
  const group=new THREE.Group();group.name='combat-impacts';scene.add(group);
  const anchors=new WeakMap<THREE.Object3D,THREE.Object3D|undefined>();
  const pool=Array.from({length:48},()=>{
    const material=new THREE.ShaderMaterial({
      // Screen-facing flashes are an overlay: skin, scenery and transparent water cannot hide them.
      transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{age:{value:0},tint:{value:new THREE.Color()},seed:{value:0},variant:{value:0},critical:{value:0},incoming:{value:0}},
      vertexShader:`varying vec2 hitUV;
        void main(){hitUV=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 hitUV;uniform float age,seed,variant,critical,incoming;uniform vec3 tint;
        void main(){
          float radius=length(hitUV),angle=atan(hitUV.y,hitUV.x)+seed;
          float streak=0.,facets=0.,shards=0.,aura=0.,outerReach=0.;
          // Light cones are widest at the impact core and taper continuously to their tips.
          for(int i=0;i<8;i++){
            float index=float(i),small=mod(index,2.);
            float random=fract(sin(index*19.37+seed*31.1)*43758.5);
            float theta=index*.785398+(random-.5)*.18;
            float reach=mix(.82+random*.13,.43+random*.16,small);
            reach*=mix(1.,.72+.28*abs(cos(theta)),step(.5,variant));
            reach*=mix(1.,.72+.28*random,step(1.5,variant));
            outerReach=max(outerReach,reach);
            vec2 p=radius*vec2(cos(angle-theta),sin(angle-theta));
            float t=clamp(p.x/reach,0.,1.);
            float width=mix(.15,.085,small)*(1.-t);
            float blade=(1.-smoothstep(width*.75,width+.004,abs(p.y)))*step(0.,p.x)*(1.-smoothstep(reach-.02,reach,p.x));
            float facet=blade;
            streak=max(streak,blade);facets=max(facets,facet);
            aura=max(aura,exp(-pow(p.y/(width+.04),2.))*.23*step(0.,p.x)*(1.-smoothstep(reach*.45,reach,p.x)));
            // A bright needle continues from the impact core to the spear tip.
            streak=max(streak,exp(-abs(p.y)*260.)*(1.-smoothstep(.1,reach,p.x))*step(0.,p.x));
            float center=.30+random*.2+age*.32;
            float shardLength=.035+random*.045,shardWidth=.012+random*.015;
            vec2 q=radius*vec2(cos(angle-theta-.28),sin(angle-theta-.28));
            float diamond=abs(q.x-center)/shardLength+abs(q.y)/shardWidth;
            shards=max(shards,(1.-smoothstep(.8,1.,diamond))*smoothstep(.015,.12,age));
          }
          // Reference rhythm: pinpoint -> full star -> trailing shell/sparks.
          float starFade=1.-smoothstep(.46,.76,age);
          float core=exp(-radius*radius*mix(95.,42.,smoothstep(.1,.42,age)))*starFade;
          float halo=exp(-radius*radius*9.)*.28*starFade;
          // Shell and cones expand on the same billboard, reaching nearly the same edge.
          float ringRadius=outerReach*mix(.78,.98,smoothstep(.30,.95,age));
          float rings=exp(-pow((radius-ringRadius)*65.,2.))*.8+
            exp(-pow((radius-ringRadius)*18.,2.))*.28+
            exp(-pow((radius-ringRadius*.94)*90.,2.))*.24;
          float ringPhase=smoothstep(.26,.48,age)*(1.-smoothstep(.65,1.,age));
          // Broken bright arcs become more apparent as the central flash clears.
          rings*=ringPhase*(.38+.62*pow(.5+.5*sin(angle*3.+seed),2.));
          float shell=(1.-smoothstep(ringRadius*.65,ringRadius,radius))*.1*ringPhase;
          float needles=pow(max(0.,cos(angle*19.+seed)),32.)*(1.-smoothstep(.15,.45,radius))*.3*starFade;
          vec3 tips=mix(vec3(.93,.97,1.),vec3(1.,.63,.16),critical);
          tips=mix(tips,vec3(1.,.04,.08),incoming);
          vec3 color=mix(tint,tips,smoothstep(.24,.8,radius)*.65);
          color=mix(color,vec3(1.),max(core*.85,facets*.32*starFade));
          float sparkFade=1.-smoothstep(.55,1.,age);
          float alpha=min(1.,core*1.5+halo+(aura+streak*.9)*starFade+shards*.9*sparkFade+rings+shell+needles);
          gl_FragColor=vec4(color,alpha*(1.-smoothstep(.86,1.,radius)));
        }`
    });
    const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;mesh.frustumCulled=false;
    group.add(mesh);return {mesh,start:-Infinity,position:new THREE.Vector3(),height:0,size:1,duration:.4,
      anchor:undefined as THREE.Object3D|undefined,model:undefined as THREE.Object3D|undefined,
      parent:undefined as THREE.Object3D|null|undefined};
  });
  let cursor=0,context:AudioContext|undefined,master:DynamicsCompressorNode|undefined,disposed=false;
  const listenerPosition=new THREE.Vector3();
  const buffers=new Map<string,AudioBuffer>(),voices=new Map<AudioBufferSourceNode,{gain:GainNode;position:THREE.Vector3;volumeScale:number;step:boolean}>();
  let loading:Promise<void>|undefined,stepVariant=0;
  function unlock(){
    if(disposed)return;
    context??=new AudioContext();
    if(!master){master=context.createDynamicsCompressor();master.threshold.value=-12;master.ratio.value=8;master.connect(context.destination);}
    void context.resume().catch(()=>{});
    loading??=Promise.all([...Object.values(sounds.dagger),...Object.values(sounds.bow),sounds.critical,sounds.monster,...Object.values(behavior.footsteps).flat()].map(async path=>{
      const response=await fetch(path);
      if(!response.ok)throw new Error('Could not load combat sound '+path);
      const buffer=await context!.decodeAudioData(await response.arrayBuffer());
      if(!disposed)buffers.set(path,buffer);
    })).then(()=>{}).catch(error=>{loading=undefined;console.warn(error);});
  }
  document.addEventListener('pointerdown',unlock,{capture:true});
  document.addEventListener('keydown',unlock,{capture:true});
  function silence(){
    if(!document.hidden)return;
    for(const voice of voices.keys())voice.stop();voices.clear();
    for(const hit of pool){hit.start=-Infinity;hit.mesh.visible=false;}
  }
  document.addEventListener('visibilitychange',silence);
  function play(path:string,position:THREE.Vector3,step=false){
    const volumeScale=step?.45:1;
    if(step && [...voices.values()].filter(voice=>voice.step).length>=6)return;
    const buffer=buffers.get(path);
    const volume=volumeScale*combatVolume(position.distanceTo(listenerPosition));
    if(document.hidden || volume<=0 || !context || context.state!=='running' || !buffer || !master)return;
    if(voices.size>=24){
      const oldest=voices.keys().next().value!;
      oldest.stop();voices.delete(oldest);
    }
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(master);
    voices.set(source,{gain,position:position.clone(),volumeScale,step});source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
    source.start();
  }
  return {
    step(kind:'rabbit'|'wolf',position:THREE.Vector3,listener:THREE.Vector3){
      listenerPosition.copy(listener);
      const variants=behavior.footsteps[kind];
      play(variants[kind==='rabbit'?stepVariant++%variants.length:0],position,true);
    },
    show(event:CombatHit,position:THREE.Vector3,height:number,listener:THREE.Vector3,model?:THREE.Object3D){
      if(document.hidden || event.dodged || event.damage<=0 || position.distanceToSquared(listener)>45**2)return;
      listenerPosition.copy(listener);
      const hit=pool[cursor++%pool.length],incoming=event.to==='player';
      hit.start=performance.now();hit.position=position;hit.height=height*.7;
      if(model && !anchors.has(model)){
        // GLTFLoader removes dots from bone names. Use the posed chest, not the rig origin.
        anchors.set(model,model.getObjectByName('DEF-spine003')??model.getObjectByName('DEF-spine.003'));
      }
      hit.model=model;hit.parent=model?.parent;hit.anchor=model && anchors.get(model);
      // Small creatures share the player's torso flash; larger monsters use 40% of their height.
      // Match the 2.8-unit normalized player height used by skinned-player.ts.
      hit.size=(incoming?height*.55:height<=2.8?2.8*.55:height*.4)*(.8+Math.random()*.2);
      hit.duration=event.critical?.32:incoming?.26:.28;
      hit.mesh.renderOrder=event.critical?10002:10001;
      const tint=hit.mesh.material.uniforms.tint.value;
      if(incoming)tint.setRGB(1.,.10,.14);
      else if(event.critical)tint.setRGB(1.,.79,.38);
      else tint.setRGB(.97,.99,1.);
      hit.mesh.material.uniforms.incoming.value=incoming?1:0;
      hit.mesh.material.uniforms.critical.value=event.critical?1:0;
      hit.mesh.material.uniforms.seed.value=Math.random()*6.28;
      hit.mesh.material.uniforms.variant.value=Math.floor(Math.random()*3);
      const path=event.critical?sounds.critical:incoming?sounds.monster:event.weapon==='dagger'?sounds.dagger.normal:event.weapon==='bow'?sounds.bow.normal:undefined;
      if(path)play(path,position);
    },
    update(camera:THREE.Camera,listener?:THREE.Vector3){
      if(listener)listenerPosition.copy(listener);
      for(const {gain,position,volumeScale} of voices.values())gain.gain.value=document.hidden?0:volumeScale*combatVolume(position.distanceTo(listenerPosition));
      const now=performance.now();
      for(const hit of pool){
        const age=(now-hit.start)/(hit.duration*1000);hit.mesh.visible=age>=0 && age<1;
        if(!hit.mesh.visible)continue;
        if(hit.anchor && hit.model?.parent===hit.parent)hit.anchor.getWorldPosition(hit.mesh.position);
        else {hit.mesh.position.copy(hit.position);hit.mesh.position.y+=hit.height;}
        camera.getWorldQuaternion(hit.mesh.quaternion);
        hit.mesh.scale.setScalar(hit.size*(.02+1.20*(1-Math.pow(1-Math.min(1,age/.5),3))));
        hit.mesh.material.uniforms.age.value=age;
      }
    },
    destroy(){
      disposed=true;document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);
      document.removeEventListener('visibilitychange',silence);
      for(const voice of voices.keys())voice.stop();if(context)void context.close().catch(()=>{});
      group.removeFromParent();for(const hit of pool)hit.mesh.material.dispose();geometry.dispose();buffers.clear();
    }
  };
}
