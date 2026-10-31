import {shortestPath,canStep as legalStep} from './pathfinding.mjs';
import { FOUNTAIN, CASTLE } from './town-layout.mjs';
import {getFortifications} from './fortifications.mjs';
export const TILE_WIDTH=64, TILE_HEIGHT=56;
// Four by six camera spans at the reference 1920x960 viewport and zoom 0.5.
// Fixed for every multiplayer client; viewport resizing never changes the world.
export const MAP_COLUMNS=240, MAP_ROWS=206;
export const MAP_WIDTH=TILE_WIDTH*MAP_COLUMNS, MAP_HEIGHT=TILE_HEIGHT*MAP_ROWS;
export const SPAWN={x:122,y:112};
const citySolids=getFortifications(MAP_WIDTH,MAP_HEIGHT).solids;
const castleScale=CASTLE.width/CASTLE.sourceWidth;
const castleFootprints=CASTLE.footprints.map(([left,top,right,bottom])=>({
 left:MAP_WIDTH*CASTLE.x+(left-CASTLE.anchorX)*castleScale,
 right:MAP_WIDTH*CASTLE.x+(right-CASTLE.anchorX)*castleScale,
 top:MAP_HEIGHT*CASTLE.y+(top-CASTLE.anchorY)*castleScale,
 bottom:MAP_HEIGHT*CASTLE.y+(bottom-CASTLE.anchorY)*castleScale,
}));
export function configureMap(){ navigation=undefined; }
export const cellAt = (x, y) => ({ x: Math.floor(x / TILE_WIDTH), y: Math.floor(y / TILE_HEIGHT) });
export const centerOf = (c) => ({ x: (c.x + 0.5) * TILE_WIDTH, y: (c.y + 0.5) * TILE_HEIGHT });
let navigation;
/** Reject any cell overlapping water, not just its center, using a summed-area table. */
export function configureNavigation(image) {
  const {width,height,data}=image,stride=width+1;
  const sum=new Uint32Array(stride*(height+1));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y+1)*stride+x+1;
    sum[i]=(data[(y*width+x)*4]<128?1:0)+sum[i-1]+sum[i-stride]-sum[i-stride-1];
  }
  navigation=new Uint8Array(MAP_COLUMNS*MAP_ROWS);
  for(let y=0;y<MAP_ROWS;y++)for(let x=0;x<MAP_COLUMNS;x++){
    const l=Math.floor(x*width/MAP_COLUMNS),r=Math.min(width,Math.ceil((x+1)*width/MAP_COLUMNS));
    const t=Math.floor(y*height/MAP_ROWS),b=Math.min(height,Math.ceil((y+1)*height/MAP_ROWS));
    navigation[y*MAP_COLUMNS+x]=Number(sum[b*stride+r]-sum[t*stride+r]-sum[b*stride+l]+sum[t*stride+l]===0);
  }
  // Outer land has separate river-cut islands. A green destination must be
  // reachable from town, including the three bridges and all physical props.
  // Four-neighbor flood is sufficient: legal diagonals cannot cut corners.
  const seen=new Uint8Array(navigation.length),queue=new Int32Array(navigation.length);
  let head=0,tail=0;
  if(walkable(SPAWN)){const start=SPAWN.y*MAP_COLUMNS+SPAWN.x;seen[start]=1;queue[tail++]=start;}
  while(head<tail){
    const index=queue[head++],x=index%MAP_COLUMNS,y=Math.floor(index/MAP_COLUMNS);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const next={x:x+dx,y:y+dy},key=next.y*MAP_COLUMNS+next.x;
      if(!seen[key]&&walkable(next)){seen[key]=1;queue[tail++]=key;}
    }
  }
  for(let i=0;i<navigation.length;i++)if(!seen[i])navigation[i]=0;
}
export function walkable(c) {
  if(!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<0||c.y<0||c.x>=MAP_COLUMNS||c.y>=MAP_ROWS)return false;
  const left=c.x*TILE_WIDTH,top=c.y*TILE_HEIGHT;
  if(citySolids.some(r=>left<r.right&&left+TILE_WIDTH>r.left&&top<r.bottom&&top+TILE_HEIGHT>r.top))return false;
  if(castleFootprints.some(r=>left<r.right&&left+TILE_WIDTH>r.left&&top<r.bottom&&top+TILE_HEIGHT>r.top))return false;
  // Closest point of a movement cell to the ellipse makes the entire footprint solid.
  const fx=MAP_WIDTH*FOUNTAIN.x,fy=MAP_HEIGHT*FOUNTAIN.y;
  const nearX=Math.max(c.x*TILE_WIDTH,Math.min(fx,(c.x+1)*TILE_WIDTH));
  const nearY=Math.max(c.y*TILE_HEIGHT,Math.min(fy,(c.y+1)*TILE_HEIGHT));
  if(((nearX-fx)/FOUNTAIN.radiusX)**2+((nearY-fy)/FOUNTAIN.radiusY)**2<=1)return false;
  return Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.y>=0&&c.x<MAP_COLUMNS&&c.y<MAP_ROWS&&navigation?.[c.y*MAP_COLUMNS+c.x]===1;
}
export const canStep=(from,to)=>legalStep(from,to,walkable);
export function findPath(start,end){
 return shortestPath(start,end,{columns:MAP_COLUMNS,rows:MAP_ROWS,width:TILE_WIDTH,height:TILE_HEIGHT,walkable});
}
