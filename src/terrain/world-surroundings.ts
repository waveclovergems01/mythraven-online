import * as THREE from 'three';
import {TERRAIN,type TerrainData,groundVariation,smoothstep} from './terrain-data';
import {trailZ} from '../../shared/west-march.mjs';
import type {TreePlacement} from '../../shared/terrain-props.mjs';
import {createGroundMaterial,type TerrainTiles} from './terrain-materials';

export const SCENERY_EXTENSION=500;
const half=TERRAIN.size/2;
/** Clamp to the real boundary: river mouths and roads continue without a vertical seam. */
export function boundarySample(data:TerrainData,values:ArrayLike<number>,x:number,z:number){
  const u=THREE.MathUtils.clamp((x+half)/TERRAIN.size,0,1)*(data.side-1);
  const v=THREE.MathUtils.clamp((z+half)/TERRAIN.size,0,1)*(data.side-1);
  const a=Math.min(data.side-2,Math.floor(u)),b=Math.min(data.side-2,Math.floor(v));
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(values[b*data.side+a],values[b*data.side+a+1],u-a),
    THREE.MathUtils.lerp(values[(b+1)*data.side+a],values[(b+1)*data.side+a+1],u-a),v-b);
}
export function sceneryHeight(data:TerrainData,x:number,z:number){
  const cx=THREE.MathUtils.clamp(x,-half,half),cz=THREE.MathUtils.clamp(z,-half,half);
  const h=boundarySample(data,data.heights,x,z),distance=Math.hypot(x-cx,z-cz);
  // Keep continuing channels underwater; dry land rolls gently into the distance.
  const land=smoothstep(0,4,h),blend=smoothstep(0,65,distance);
  return h+land*blend*(groundVariation(x,z)-groundVariation(cx,cz)+3*Math.sin(distance*.012)**2);
}
export function sceneryTrees(data:TerrainData):TreePlacement[]{
  let seed=48131;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const result:TreePlacement[]=[];
  const extent=half+SCENERY_EXTENSION;
  for(let z=-extent;z<extent;z+=28)for(let x=-extent;x<extent;x+=28){
    const px=x+5+random()*18,pz=z+5+random()*18;
    if(Math.max(Math.abs(px),Math.abs(pz))>extent-4)continue;
    if(Math.max(Math.abs(px),Math.abs(pz))<half+7 || sceneryHeight(data,px,pz)<3 || boundarySample(data,data.shoreDistance,px,pz)<8)continue;
    // Leave the extension of the field trail open, as well as the cardinal city approaches.
    if(data.area==='west-march' && Math.abs(pz-trailZ(THREE.MathUtils.clamp(px,-half,half)))<9)continue;
    if(Math.abs(pz)<8 || Math.abs(px)<8)continue;
    if(random()<.22)continue;
    result.push({id:'scenery-'+result.length,x:px,z:pz,model:random()<.6?0:1,scale:1.2+random()*.6,yaw:random()*Math.PI*2,radius:0,region:'scenery'});
  }
  return result;
}

/** Render-only ring. The navigation data, terrain picker and minimap never receive these vertices. */
export function createWorldSurroundings(data:TerrainData,tiles:TerrainTiles,source:THREE.BufferGeometry){
  const group=new THREE.Group();group.name='world-surroundings';
  const coordinates:number[]=[];
  for(let i=0;i<32;i++)coordinates.push(-half-SCENERY_EXTENSION+i*SCENERY_EXTENSION/32);
  for(let i=0;i<data.side;i++)coordinates.push(-half+i*TERRAIN.size/(data.side-1));
  for(let i=1;i<=32;i++)coordinates.push(half+i*SCENERY_EXTENSION/32);
  const grass=source.getAttribute('grassWeight').array,paving=source.getAttribute('cityPaving');
  const road=Float32Array.from({length:paving.count},(_,i)=>paving.getX(i));
  const material=createGroundMaterial(tiles);
  for(let iz=0;iz<coordinates.length-1;iz+=16)for(let ix=0;ix<coordinates.length-1;ix+=16){
    if(ix>=32 && ix<32+data.side-1 && iz>=32 && iz<32+data.side-1)continue;
    const nx=Math.min(16,coordinates.length-1-ix),nz=Math.min(16,coordinates.length-1-iz);
    const positions:number[]=[],weights:number[]=[],shores:number[]=[],paved:number[]=[],indices:number[]=[];
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const x=coordinates[ix+i],z=coordinates[iz+j],h=sceneryHeight(data,x,z);
      positions.push(x,h,z);weights.push(boundarySample(data,grass,x,z));
      shores.push(boundarySample(data,data.shoreDistance,x,z));paved.push(boundarySample(data,road,x,z),0);
      if(i<nx && j<nz){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('grassWeight',new THREE.Float32BufferAttribute(weights,1));
    geometry.setAttribute('shoreDistance',new THREE.Float32BufferAttribute(shores,1));
    geometry.setAttribute('cityPaving',new THREE.Float32BufferAttribute(paved,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.name='scenery-ground-patch';mesh.receiveShadow=true;group.add(mesh);
  }
  return group;
}
