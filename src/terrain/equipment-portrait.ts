import * as THREE from 'three';
import type {CharacterDefinition} from '../../shared/character-catalog.mjs';
import type {CharacterAssets,PlayerAvatar} from './character-assets';
import type {Weapon} from './character-profile';

// Keep one fixed, orthographic view. Only an appearance change needs a draw.
export function createEquipmentPortrait(character:CharacterDefinition,assets:CharacterAssets,thai:boolean){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=320;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',thai?'ตัวละครและอาวุธที่สวมใส่':'Character and equipped weapon');
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1.85,1.85,1.85,-1.85,.1,20);
  camera.position.set(2.1,2,8);
  camera.lookAt(0,1.38,0);
  scene.add(new THREE.HemisphereLight(0xfff4da,0x889f96,2));
  const light=new THREE.DirectionalLight(0xffedcd,2.3);
  light.position.set(-3,5,4);
  scene.add(light);
  let renderer:THREE.WebGLRenderer|undefined,avatar:PlayerAvatar|undefined;
  let requested:Weapon|null|undefined,version=0;
  async function update(weapon:Weapon|null){
    if(requested===weapon)return;
    requested=weapon;
    const revision=++version;
    try{
      const [factory,gear]=await Promise.all([assets.ensure(character),weapon?assets.loadWeapon(weapon):undefined]);
      if(revision!==version)return;
      if(!renderer){
        renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
        renderer.setSize(canvas.width,canvas.height,false);
        renderer.toneMapping=THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure=1.12;
        avatar=factory.create(true,character.hairStyle);
        scene.add(avatar.group);
      }
      avatar!.setWeapon(weapon??undefined,gear);
      // Settle the idle/hold crossfade before taking the still.
      avatar!.preview(.1,'idle');
      avatar!.preview(.1,'idle');
      renderer.render(scene,camera);
      const ctx=canvas.getContext('2d')!;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(renderer.domElement,0,0);
      canvas.dataset.appearance=character.id+'/'+(weapon??'unarmed');
    }catch{
      if(version===revision){
        requested=undefined;
        canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
        delete canvas.dataset.appearance;
        canvas.dispatchEvent(new Event('portraiterror'));
      }
    }
  }
  return {canvas,update,destroy(){
    ++version;
    avatar?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }};
}
