import * as THREE from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {speedMultiplier, DEFAULT_SPEED_LEVEL} from '../../shared/terrain-movement.mjs';
import type {PlayerLibrary} from './player-library';

export const equipment = {
  novice: ['dagger'], warrior: ['longsword','dagger'], archer: ['bow'],
} as const;
export type PlayerClass = keyof typeof equipment;
export type Weapon = typeof equipment[PlayerClass][number];
export type PreviewMotion = 'idle'|'slow'|'run'|'attack';
const attacks:Record<Weapon,string>={dagger:'n_dagger_attack1',longsword:'n_sword_attack1',bow:'n_bow_attack'};

export async function loadSkinnedPlayers(modelId:PlayerClass, library:PlayerLibrary) {
  const [body,...hairAssets]=await Promise.all([
    library.load('bodies/'+modelId),library.load('hair/male-01'),library.load('hair/male-02'),
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
      function detach(meshes:THREE.SkinnedMesh[]){for(const mesh of meshes){mesh.removeFromParent();mesh.skeleton.dispose();}}
      function play(delta:number,motion:PreviewMotion,rate:number){
        state=motion;
        const base=motion==='run'||motion==='slow'?'n_run':'n_idle';
        const clip=motion==='attack' && weapon ? clips.get(attacks[weapon]) : undefined;
        const next=mixer.clipAction(clip ?? (weapon && clips.get(base+'_hold')) ?? clips.get(base)!);
        if(next!==active){next.reset().play().crossFadeFrom(active,.15,false);active=next;}
        active.setEffectiveTimeScale(rate);mixer.update(Math.min(delta,.1));
      }
      return {group,setHairStyle,
        setWeapon(next:Weapon|undefined,asset?:GLTF){
          if(next && (!asset || !(equipment[modelId] as readonly Weapon[]).includes(next))) throw new Error('Invalid equipment');
          detach(gear);gear=asset?attach(asset):[];weapon=next;
        },
        canPreviewAttack:(item:Weapon)=>clips.has(attacks[item]),
        preview(delta:number,motion:PreviewMotion){play(delta,motion,motion==='slow'?.55:1);},
        setLighting(value:number){library.brightness.value=value;},
        update(delta:number,moving:boolean,speedLevel:number){
          play(delta,moving?'run':'idle',moving?THREE.MathUtils.clamp(speedMultiplier(speedLevel)/speedMultiplier(DEFAULT_SPEED_LEVEL),.65,1.6):1);
        },
        inspect:()=>({state,clip:active.getClip().name,hairStyle,model:modelId}),
        dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);hair.forEach(detach);detach(gear);skeletons.forEach(s=>s.dispose());group.removeFromParent();},
      };
    },
  };
}
