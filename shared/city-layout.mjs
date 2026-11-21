import assets from './building-assets.json' with {type:'json'};
import {createFortifications} from './terrain-fortifications.mjs';
export const BUILDING_ASSETS=assets;
const cache=new WeakMap();
export const PLAZA_RADIUS=32;
const FOUNTAIN_SCALE=2.5;
export const FOUNTAIN_RESERVE_RADIUS=assets['plaza-angel-fountain'].depth*FOUNTAIN_SCALE/2+1;
const sample=(data,x,z)=>data.shoreDistance[Math.round((z+250)/500*(data.side-1))*data.side+Math.round((x+250)/500*(data.side-1))];
export function createCityLayout(data){
  if(cache.has(data))return cache.get(data);
  const buildings=[],roads=[];
  if (data.area === 'west-march') {
    const layout = { buildings, roads, plaza: {x:0,z:0,radius:0,fountainRadius:0} };
    cache.set(data, layout); return layout;
  }
  const add=(model,x,z,yaw=0,scale=1)=>{
    const a=assets[model];buildings.push({id:`${model}-${buildings.length}`,model,x,z,y:4.9,yaw,scale,
      halfWidth:a.width*scale/2,halfDepth:a.depth*scale/2,height:a.height*scale,
      radius:model==='plaza-angel-fountain'?Math.max(a.width,a.depth)*scale/2:undefined});
  };
  const road=(ax,az,bx,bz,width=10)=>roads.push({ax,az,bx,bz,width});
  // Uniform source proportions fill the northern plot's available depth, with
  // a clear forecourt between the castle stairs and the new river crossing.
  add('castle-red-spires',0,-220);
  add('plaza-angel-fountain',0,0,0,FOUNTAIN_SCALE);
  for(const g of createFortifications(data).gates)road(0,0,g.x,g.z,12);
  road(0,-190,0,-191.5,12);
  for(const z of [-70,70])road(-120,z,120,z,9);
  for(const x of [-120,120])road(x,-70,x,70,8);
  const houses=['house-red-gable','house-banner','house-blue-awning','house-red-cottage'];
  for(const [row,z]of [-88,-52,52,88].entries())for(const [col,x]of [-96,-65,-35,35,65,96].entries()){
    const yaw=z===-88||z===52?0:Math.PI;
    add(houses[(row+col)%houses.length],x,z,yaw,.94+((row*7+col*3)%5)*.025);
  }
  for(const sign of [-1,1]){
    add('tavern-red-awning',sign*63,-25,sign>0?-Math.PI/2:Math.PI/2);
    add('shop-red-awning',sign*63,25,sign>0?-Math.PI/2:Math.PI/2);
    for(const z of [-20,20]){
      add('market-produce-stall',sign*35,z,sign>0?-Math.PI/2:Math.PI/2);
      add('market-produce-cart',sign*47,z*1.7,sign>0?-Math.PI/2:Math.PI/2);
    }
    road(sign*24,0,sign*50,-25,7);road(sign*24,0,sign*50,25,7);
  }
  // Short stone thresholds connect every house front to its neighbourhood lane.
  for(const b of buildings)if(b.model.startsWith('house-')){
    const dz=Math.cos(b.yaw);road(b.x,b.z+dz*(b.halfDepth-.5),b.x,b.z+dz*18,4);
  }
  const layout={buildings,roads,plaza:{x:0,z:0,radius:PLAZA_RADIUS,fountainRadius:FOUNTAIN_RESERVE_RADIUS}};
  cache.set(data,layout);return layout;
}
export function roadDistance(r,x,z){
  const dx=r.bx-r.ax,dz=r.bz-r.az,t=Math.max(0,Math.min(1,((x-r.ax)*dx+(z-r.az)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-r.ax-dx*t,z-r.az-dz*t)-r.width/2;
}
export function isBuildingClear(data,x,z,padding=0){
  for(const b of createCityLayout(data).buildings){
    if(b.radius!==undefined){if(Math.hypot(x-b.x,z-b.z)<b.radius+padding)return false;continue;}
    const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);
    if(Math.abs(dx*c-dz*s)<b.halfWidth+padding&&Math.abs(dx*s+dz*c)<b.halfDepth+padding)return false;
  }return true;
}
export function isCityPlantingClear(data,x,z,padding=0){
  if(z< -182&&x> -50-padding&&x<65+padding)return false;
  if(!isBuildingClear(data,x,z,padding+5)||Math.abs(x)+Math.abs(z)<PLAZA_RADIUS+padding+8)return false;
  return createCityLayout(data).roads.every(r=>roadDistance(r,x,z)>padding+4);
}
export function fitCityFoundations(data){
  const {buildings}=createCityLayout(data),step=500/(data.side-1);
  // Flat dry-land pads and a short feather to existing terrain; never fill water.
  for(const b of buildings){
    const padDepth=b.halfDepth+(b.model==='castle-red-spires'?7:0);
    const extent=Math.hypot(b.halfWidth,padDepth)+4;
    for(let row=Math.max(0,Math.floor((b.z-extent+250)/step));row<=Math.min(data.side-1,Math.ceil((b.z+extent+250)/step));row++)
      for(let col=Math.max(0,Math.floor((b.x-extent+250)/step));col<=Math.min(data.side-1,Math.ceil((b.x+extent+250)/step));col++){
        const i=row*data.side+col,x=col*step-250,z=row*step-250;
        if(sample(data,x,z)<0)continue;
        const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);
        const gap=Math.max(Math.abs(dx*c-dz*s)-b.halfWidth,Math.abs(dx*s+dz*c)-padDepth);
        const w=Math.max(0,Math.min(1,1-gap/3));data.heights[i]+=(b.y-data.heights[i])*w;
      }
  }
}
