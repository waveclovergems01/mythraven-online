import * as THREE from 'three';
import {terrainHeight,type TerrainMovement} from './terrain-movement';

export function createRouteLights(movement:TerrainMovement){
  const geometry=new THREE.BufferGeometry();
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{time:{value:0},pixelRatio:{value:1}},
    vertexShader:`
      uniform float time;
      uniform float pixelRatio;
      attribute float distanceAlong;
      varying float strength;
      void main(){
        strength=.68+.32*cos(distanceAlong*1.4-time*4.);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        gl_PointSize=(6.+2.*strength)*pixelRatio;
      }`,
    fragmentShader:`
      varying float strength;
      void main(){
        float radius=length(gl_PointCoord-.5)*2.;
        float glow=1.-smoothstep(.08,1.,radius);
        gl_FragColor=vec4(mix(vec3(.48,.83,1.),vec3(.96,1.,.9),glow),glow*strength);
      }`
  });
  const lights=new THREE.Points(geometry,material);
  lights.frustumCulled=false;lights.renderOrder=1;lights.visible=false;
  const spacing=1.1;
  function allocate(capacity:number){
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('distanceAlong',new THREE.BufferAttribute(Float32Array.from({length:capacity},(_,i)=>(i+1)*spacing),1));
  }
  allocate(64);
  let oldPath='',ends:number[]=[],count=0;
  function rebuild(){
    ends=[];let start=movement.position,length=0;
    for(let i=0;i<movement.route.length;i++){
      const end=movement.route[i];
      // Acknowledged routes can arrive with earlier waypoints already passed.
      if(i>=movement.next){
        const segment=Math.hypot(end.x-start.x,end.z-start.z);
        length+=segment;start=end;
      }
      ends.push(length);
    }
    count=Math.floor(length/spacing);
    if(count>geometry.getAttribute('position').count){
      geometry.dispose();allocate(2**Math.ceil(Math.log2(count)));
    }
    const positions=geometry.getAttribute('position') as THREE.BufferAttribute;
    let index=0;
    start=movement.position;
    for(let i=movement.next;i<movement.route.length;i++){
      const end=movement.route[i],begin=ends[i-1]??0;
      while(index<count && (index+1)*spacing<=ends[i]){
        const t=((index+1)*spacing-begin)/(ends[i]-begin);
        const x=start.x+t*(end.x-start.x),z=start.z+t*(end.z-start.z);
        positions.setXYZ(index++,x,terrainHeight(movement.data,x,z)+.22,z);
      }
      start=end;
    }
    if(count){positions.clearUpdateRanges();positions.addUpdateRange(0,count*3);positions.needsUpdate=true;}
  }
  return {lights,update(time:number,pixelRatio:number){
    lights.visible=movement.moving;
    if(!lights.visible){oldPath='';return;}
    if(oldPath!==movement.path){rebuild();oldPath=movement.path;}
    const next=movement.route[movement.next],p=movement.position;
    const progress=ends[movement.next]-Math.hypot(next.x-p.x,next.z-p.z);
    const first=Math.max(0,Math.floor((progress+.45)/spacing));
    geometry.setDrawRange(first,Math.max(0,count-first));
    material.uniforms.time.value=time;material.uniforms.pixelRatio.value=pixelRatio;
  },dispose(){lights.removeFromParent();geometry.dispose();material.dispose();}};
}
