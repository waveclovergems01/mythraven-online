import {FOUNTAIN_COURT} from './town-layout.mjs';
import {frontEdgeY, containsPoint, touchesCell} from './ground-polygon.mjs';
const {x:cx,y:cy,innerRadius,passageHalfWidth:gap,depthRatio}=FOUNTAIN_COURT;
function quadratic([ax,ay],[bx,by],[cx,cy]) {
 return Array.from({length:17},(_,i)=>{
  const t=i/16,s=1-t;
  return [s*s*ax+2*s*t*bx+t*t*cx,s*s*ay+2*s*t*by+t*t*cy];
 });
}
// Straight shoulders line the two streets. The inner reveal follows the basin
// and the larger outside corner stays inside the elliptical paving.
const sideGap=gap/depthRatio;
const first=Math.asin(sideGap/innerRadius)+.07;
const last=Math.acos(gap/innerRadius)-.07;
const inside=Array.from({length:25},(_,i)=>{
 const a=first+(last-first)*i/24;
 return [innerRadius*Math.cos(a),innerRadius*Math.sin(a)];
});
const nw=[
 ...quadratic([gap,96],[gap,108],[gap+12,108]),
 ...quadratic([83,108],[110,108],[110,81]),
 ...quadratic([110,sideGap+10],[110,sideGap],[100,sideGap]),
 ...quadratic([78,sideGap],[72,sideGap],inside[0]),
 ...inside.slice(1,-1),
 ...quadratic(inside.at(-1),[gap,79],[gap,86]),
].map(([x,y])=>[cx-x,cy-y*depthRatio]);
// Stone wings have clipped outer ends and a shallow bow in the front rail.
// The squared inner return frames the gate when reflected across the stairs.
const castleLeft=[
 [593,219],[703,219],...quadratic([706,222],[710,226],[710,230]),
 ...quadratic([710,240],[710,247],[703,247]),[687,247],
 ...quadratic([681,247],[675,247],[668,250]),
 ...quadratic([668,250],[647,258],[626,250]).slice(1),
 ...quadratic([626,250],[619,247],[613,247]).slice(1),
 [594,247],[584,239],[584,227],
];
export const FLOWERBED_LAYOUT=[
 ['fountain-nw',nw],['fountain-ne',nw.map(([x,y])=>[2*cx-x,y])],
 ['fountain-sw',nw.map(([x,y])=>[x,2*cy-y])],['fountain-se',nw.map(([x,y])=>[2*cx-x,2*cy-y])],
 ['castle-west',castleLeft],['castle-east',castleLeft.map(([x,y])=>[1480-x,y])],
].map(([id,points])=>({id,points}));
export function getFlowerbeds(width,height){return FLOWERBED_LAYOUT.map(bed=>({
 id:bed.id,points:bed.points.map(([x,y])=>[x/1448*width,y/1086*height]),rim:38,elevation:52,
}));}
export const pointInFlowerbed=containsPoint;
export function flowerbedFrontY(bed,left,right=left){return frontEdgeY(bed.points,left,right);}
export function flowerbedTouchesCell(bed,left,top,width,height){return touchesCell(bed.points,left,top,width,height,bed.rim/2);}
