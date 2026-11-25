import * as THREE from 'three';
import type {CharacterDefinition} from '../../shared/character-catalog.mjs';
import type {PlayerFactory} from './character-assets';

export function createStatusPortrait(character:CharacterDefinition,factory:PlayerFactory,hairColor:string,thai:boolean){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=192;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',thai?'ภาพหน้าตัวละคร':'Character portrait');
  const context=canvas.getContext('2d');
  if(!context)return canvas;

  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-.54,.54,.54,-.54,.1,10);
  const faceHeight=2.48;
  camera.position.set(0,faceHeight,4);
  camera.lookAt(0,faceHeight,0);
  const light=new THREE.DirectionalLight(0xffedcd,2.3);
  light.position.set(-3,5,4);
  scene.add(light,new THREE.HemisphereLight(0xfff4da,0x889f96,2));

  let renderer:THREE.WebGLRenderer|undefined;
  let avatar:ReturnType<PlayerFactory['create']>|undefined;
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    renderer.setSize(canvas.width,canvas.height,false);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    avatar=factory.create(true,character.hairStyle,hairColor);
    avatar.preview(.2,'idle');
    scene.add(avatar.group);
    renderer.render(scene,camera);
    context.drawImage(renderer.domElement,0,0);
  }catch(error){
    console.warn('Character portrait unavailable',error);
  }finally{
    avatar?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
  return canvas;
}
