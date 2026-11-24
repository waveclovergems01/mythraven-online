import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {speedMultiplier, DEFAULT_SPEED_LEVEL} from '../../shared/terrain-movement.mjs';
import type {PlayerLibrary} from './player-library';

import master from '../../shared/character-master.json' with {type:'json'};
import bowTiming from '../../shared/bow-projectile.json';
import {createEnergyArrow} from './energy-arrow';
export type PlayerClass = keyof typeof master.classes;
export type Weapon = keyof typeof master.items;
export const equipment=master.classes;
export function weaponsFor(job:PlayerClass){return equipment[job].weapons as Weapon[];}
export type PreviewMotion = 'idle'|'slow'|'run'|'attack';
const attacks:Record<Weapon,string>={dagger:'n_dagger_attack1',longsword:'n_sword_attack1',bow:'n_bow_attack'};

export async function loadSkinnedPlayers(modelId:PlayerClass, library:PlayerLibrary) {
  const [body,...hairAssets]=await Promise.all([
    library.load('/assets/models/characters/bodies/'+modelId+'.glb'),
    library.load('/assets/models/characters/hair/male-01.glb'),library.load('/assets/models/characters/hair/male-02.glb'),
  ]);
  const clips=new Map(body.animations.map(clip=>[clip.name,clip]));
  const idle=clips.get('n_idle');
  if(!idle || !clips.has('n_run')) throw new Error('Missing locomotion for '+modelId);
  const referenceMixer=new THREE.AnimationMixer(body.scene);
  referenceMixer.clipAction(idle).play();referenceMixer.update(0);body.scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(body.scene,true),scale=2.8/(bounds.max.y-bounds.min.y);
  const center=bounds.getCenter(new THREE.Vector3());
  referenceMixer.stopAllAction();referenceMixer.uncacheRoot(body.scene);
  const ringGeometry=new THREE.RingGeometry(.85,.93,40);
  const ringMaterials=[0xe9d392,0xbcd3dd].map(color=>new THREE.MeshBasicMaterial({
    color,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,
  }));
  return {
    dispose(){ringGeometry.dispose();ringMaterials.forEach(m=>m.dispose());},
    create(mine:boolean,initialHairStyle=1){
      const group=new THREE.Group(),visual=new THREE.Group(),model=clone(body.scene);
      group.name=modelId+'-player';visual.name=modelId+'-visual';
      visual.scale.setScalar(scale);visual.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
      visual.add(model);group.add(visual);
      const bones=new Map<string,THREE.Bone>(), skeletons=new Set<THREE.Skeleton>();
      let bodyMesh:THREE.SkinnedMesh|undefined;
      model.traverse(object=>{
        if(object instanceof THREE.Bone) bones.set(object.name,object);
        if(object instanceof THREE.SkinnedMesh){
          bodyMesh=object;
          const shared=[...skeletons].find(s=>s.bones.length===object.skeleton.bones.length &&
            s.bones.every((bone,i)=>bone===object.skeleton.bones[i] && s.boneInverses[i].equals(object.skeleton.boneInverses[i])));
          if(shared) object.skeleton=shared;
          skeletons.add(object.skeleton);
          object.frustumCulled=false;
          object.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),4);
          object.boundingBox=new THREE.Box3(new THREE.Vector3(-4,-3,-4),new THREE.Vector3(4,5,4));
        }
      });
      if(!bodyMesh) throw new Error('Missing body mesh for '+modelId);
      const parent=bodyMesh.parent!;
      function attach(asset:GLTF) {
        const meshes:THREE.SkinnedMesh[]=[];
        asset.scene.traverse(source=>{
          if(!(source instanceof THREE.SkinnedMesh)) return;
          const palette=source.skeleton.bones.map(b=>{
            const target=bones.get(b.name);
            if(!target) throw new Error(modelId+' missing attachment bone '+b.name);
            return target;
          });
          const mesh=source.clone(false);
          mesh.skeleton=new THREE.Skeleton(palette,source.skeleton.boneInverses);
          mesh.boundingSphere=bodyMesh!.boundingSphere!.clone();mesh.boundingBox=bodyMesh!.boundingBox!.clone();
          mesh.frustumCulled=false;parent.add(mesh);meshes.push(mesh);
        });
        return meshes;
      }
      const hair=hairAssets.map(attach);
      let hairStyle=initialHairStyle;
      function setHairStyle(style:number) {
        hairStyle=style===2?2:1;
        hair.forEach((meshes,i)=>meshes.forEach(mesh=>{mesh.visible=i+1===hairStyle;mesh.userData.hairStyle=i+1;}));
      }
      setHairStyle(initialHairStyle);
      const ring=new THREE.Mesh(ringGeometry,ringMaterials[mine?0:1]);
      ring.rotation.x=-Math.PI/2;ring.position.y=.06;group.add(ring);
      const mixer=new THREE.AnimationMixer(model);
      let active=mixer.clipAction(idle!).play(),state:PreviewMotion='idle',weapon:Weapon|undefined;
      let gear:THREE.SkinnedMesh[]=[];
      mixer.update(0);
      const arrow=modelId==='archer'?createEnergyArrow():undefined;
      if(arrow){group.add(arrow.group);arrow.group.visible=false;arrow.group.name='nocked-arrow';}
      const grip=bones.get('DEF-holdL'),string=bones.get('DEF-hold-tweakL');
      const tail=new THREE.Vector3(),tip=new THREE.Vector3(),aim=new THREE.Vector3(),vertex=new THREE.Vector3();
      let nock:{mesh:THREE.SkinnedMesh;indices:number[]}[]=[];
      function bowPoints(){
        if(!grip || !string)return false;
        group.updateWorldMatrix(true,true);
        // The authored string uses a 50/50 bone blend: its nock is not the control bone origin.
        tail.set(0,0,0);let count=0;
        for(const anchor of nock)for(const index of anchor.indices){
          vertex.fromBufferAttribute(anchor.mesh.geometry.attributes.position,index);
          anchor.mesh.applyBoneTransform(index,vertex);anchor.mesh.localToWorld(vertex);tail.add(vertex);count++;
        }
        if(count)tail.divideScalar(count);else string.getWorldPosition(tail);
        grip.getWorldPosition(tip);
        aim.subVectors(tip,tail);tip.addScaledVector(aim,.18);
        return true;
      }
      function updateArrow(phase:number){
        if(!arrow)return;
        arrow.group.visible=weapon==='bow' && state==='attack' && phase>=bowTiming.drawStartFrame/bowTiming.totalFrames && phase<=bowTiming.releaseFrame/bowTiming.totalFrames;
        if(arrow.group.visible && bowPoints())arrow.place(group.worldToLocal(tail),group.worldToLocal(tip));
      }
      function detach(meshes:THREE.SkinnedMesh[]){for(const mesh of meshes){mesh.removeFromParent();mesh.skeleton.dispose();}}
      function play(delta:number,motion:PreviewMotion,rate:number){
        state=motion;
        const base=motion==='run'||motion==='slow'?'n_run':'n_idle';
        const clip=motion==='attack' && weapon ? clips.get(attacks[weapon]) : undefined;
        const next=mixer.clipAction(clip ?? (weapon && clips.get(base+'_hold')) ?? clips.get(base)!);
        if(next!==active){next.reset().play().crossFadeFrom(active,.15,false);active=next;}
        active.setEffectiveTimeScale(rate);mixer.update(Math.min(delta,.1));updateArrow(active.time/active.getClip().duration);
      }
      return {group,setHairStyle,
        setWeapon(next:Weapon|undefined,asset?:GLTF){
          if(next && (!asset || !weaponsFor(modelId).includes(next))) throw new Error('Invalid equipment');
          detach(gear);gear=asset?attach(asset):[];weapon=next;if(arrow)arrow.group.visible=false;
          nock=[];
          if(next==='bow')for(const mesh of gear){
            const joint=mesh.skeleton.bones.findIndex(b=>b.name==='DEF-hold-tweakL');
            if(joint<0)continue;
            const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
            const weight=(i:number)=>{let sum=0;for(let j=0;j<4;j++)if(indices.getComponent(i,j)===joint)sum+=weights.getComponent(i,j);return sum;};
            let max=0;for(let i=0;i<indices.count;i++)max=Math.max(max,weight(i));
            if(max<=0)continue;
            const selected=[];for(let i=0;i<indices.count;i++)if(weight(i)>=max-.0001)selected.push(i);
            nock.push({mesh,indices:selected});
          }
        },
        canPreviewAttack:(item:Weapon)=>clips.has(attacks[item]),
        preview(delta:number,motion:PreviewMotion){play(delta,motion,motion==='slow'?.55:1);},
        setLighting(value:number){library.brightness.value=value;},
        strike(phase:number){
          if(!weapon)return;
          const clip=clips.get(attacks[weapon]) ?? clips.get(attacks[master.classes[modelId].starter as Weapon]);
          if(!clip)return;
          const next=mixer.clipAction(clip);
          if(active!==next){
            mixer.stopAllAction();next.reset().setEffectiveWeight(1).play();active=next;
          }
          state='attack';active.time=phase*clip.duration;mixer.update(0);updateArrow(phase);
        },
        update(delta:number,moving:boolean,speedLevel:number){
          play(delta,moving?'run':'idle',moving?THREE.MathUtils.clamp(speedMultiplier(speedLevel)/speedMultiplier(DEFAULT_SPEED_LEVEL),.65,1.6):1);
        },
        bowRelease(){
          if(weapon!=='bow' || !grip || !string)return undefined;
          const time=active.time,clip=clips.get(attacks.bow)!;
          const shotAction=mixer.clipAction(clip),same=active===shotAction;
          // Capture the authored release pose even when a network patch skipped frame six.
          if(!same){active.enabled=false;shotAction.reset().setEffectiveWeight(1).play();}
          shotAction.time=clip.duration*bowTiming.releaseFrame/bowTiming.totalFrames;mixer.update(0);bowPoints();
          const result=tip.clone();
          if(!same){shotAction.stop();active.enabled=true;}else shotAction.time=time;
          mixer.update(0);updateArrow(state==='attack'?active.time/active.getClip().duration:0);
          return result;
        },
        inspect:()=>({state,clip:active.getClip().name,hairStyle,model:modelId,weapon}),
        dispose(){arrow?.dispose();mixer.stopAllAction();mixer.uncacheRoot(model);hair.forEach(detach);detach(gear);skeletons.forEach(s=>s.dispose());group.removeFromParent();},
      };
    },
  };
}
