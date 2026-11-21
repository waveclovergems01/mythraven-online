import { TERRAIN, groundVariation, smoothstep } from './terrain-data.mjs';
import { createFortifications } from './terrain-fortifications.mjs';

export const FIELD_LIMIT = 216;
export const FIELD_PORTAL = { x: 211, z: 28 };
export const FIELD_ARRIVAL = { x: 202, z: 28 };
export const PORTAL_RADIUS = 3;
export const trailZ = x => 28 + 8 * Math.sin(Math.max(0, 140-x) / 34);
// Coordinates traced from the marked minimap, north up. Tributaries share
// vertices with the main channel so their beds meet without dry seams.
const channels = [
  [[69,-260],[66,-183],[78,-144],[105,-102],[132,-69],[151,-15],[159,28],[157,66],[143,95],[114,138],[84,194],[74,260]],
  [[132,-69],[168,-59],[198,-49],[258,-17]],
  [[143,95],[147,137],[165,162],[190,185],[211,219],[222,260]],
];
export const FIELD_CROSSINGS = [
  {id:'march-road',x:159,z:28,axis:'x'},
  {id:'north-fork',x:198,z:-49,axis:'z'},
  {id:'south-fork',x:165,z:162,axis:'x'},
];
const segments=channels.flatMap(points=>points.slice(1).map(([bx,bz],i)=>{
  const [ax,az]=points[i],dx=bx-ax,dz=bz-az;
  return {ax,az,dx,dz,lengthSq:dx*dx+dz*dz};
}));

export function mapPortal(data) {
  if (data.area === 'west-march') return FIELD_PORTAL;
  const west = createFortifications(data).bridges.find(bridge => bridge.id === 'west');
  const distance = Math.min(west.to - 3, 244 / Math.abs(west.outward.x));
  return { x: west.outward.x * distance, z: west.outward.z * distance };
}

export function cityArrival(data) {
  const p = mapPortal(data), length = Math.hypot(p.x, p.z);
  return { x: p.x * (1 - 9 / length), z: p.z * (1 - 9 / length) };
}

export function buildWestMarch() {
  const side = TERRAIN.segments + 1, step = TERRAIN.size / TERRAIN.segments;
  const heights = new Float32Array(side * side), shoreDistance = new Float32Array(heights.length);
  for (let row = 0; row < side; row++) for (let col = 0; col < side; col++) {
    const x = col * step - TERRAIN.size / 2, z = row * step - TERRAIN.size / 2;
    let distanceSq=Infinity;
    for(const s of segments){
      const px=x-s.ax,pz=z-s.az,t=Math.min(1,Math.max(0,(px*s.dx+pz*s.dz)/s.lengthSq));
      distanceSq=Math.min(distanceSq,(px-t*s.dx)**2+(pz-t*s.dz)**2);
    }
    const shore=Math.sqrt(distanceSq)-5.8;
    const i = row * side + col;
    shoreDistance[i] = shore;
    const border=smoothstep(FIELD_LIMIT,244,Math.max(Math.abs(x),Math.abs(z)));
    const apron=Math.min(...FIELD_CROSSINGS.map(c=>Math.hypot(x-c.x,z-c.z)));
    const relief=groundVariation(x,z)*1.7*smoothstep(22,32,apron)+border*(10+2*Math.cos(z/14+x/18));
    heights[i]=-3+smoothstep(-4,6,shore)*(7.9+relief);
  }
  return { area: 'west-march', side, heights, shoreDistance };
}
