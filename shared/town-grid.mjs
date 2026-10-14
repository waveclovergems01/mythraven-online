import {shortestPath,canStep as legalStep} from './pathfinding.mjs';
import { FOUNTAIN } from './town-layout.mjs';
export const TILE_WIDTH=64, TILE_HEIGHT=56;
export const MAP_COLUMNS=120, MAP_ROWS=103;
export const MAP_WIDTH=TILE_WIDTH*MAP_COLUMNS, MAP_HEIGHT=TILE_HEIGHT*MAP_ROWS;
export const SPAWN={x:60,y:60};
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
}
export function walkable(c) {
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
