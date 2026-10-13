// Local preview dimensions are snapped to whole 32 × 28 screen-pixel cells.
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 56;
export let MAP_COLUMNS = 80;
export let MAP_ROWS = 78;
export let MAP_WIDTH = TILE_WIDTH * MAP_COLUMNS;
export let MAP_HEIGHT = TILE_HEIGHT * MAP_ROWS;
export interface Cell { x: number; y: number }
export let SPAWN: Cell = { x: 40, y: 39 };
export function configureMap(viewportWidth: number, viewportHeight: number): void {
  navigation = undefined;
  MAP_COLUMNS = Math.max(40, Math.ceil(viewportWidth * 2 / 32));
  MAP_ROWS = Math.max(40, Math.ceil(viewportHeight * 3 / 28));
  MAP_WIDTH = TILE_WIDTH * MAP_COLUMNS;
  MAP_HEIGHT = TILE_HEIGHT * MAP_ROWS;
  SPAWN = { x: Math.floor(MAP_COLUMNS / 2), y: Math.floor(MAP_ROWS * 0.475) };
}
export const cellAt = (x: number, y: number): Cell => ({ x: Math.floor(x / TILE_WIDTH), y: Math.floor(y / TILE_HEIGHT) });
export const centerOf = (c: Cell): Cell => ({ x: (c.x + 0.5) * TILE_WIDTH, y: (c.y + 0.5) * TILE_HEIGHT });
let navigation: Uint8Array | undefined;
/** Reject any cell overlapping water, not just its center, using a summed-area table. */
export function configureNavigation(image: ImageData): void {
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
export function walkable(c: Cell): boolean {
  return Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.y>=0&&c.x<MAP_COLUMNS&&c.y<MAP_ROWS&&navigation?.[c.y*MAP_COLUMNS+c.x]===1;
}
export function findPath(start: Cell, end: Cell): Cell[] {
  if (!walkable(start) || !walkable(end)) return [];
  const id = (c: Cell) => c.y * MAP_COLUMNS + c.x;
  const queue: Cell[] = [start], parents = new Map<number, Cell | null>([[id(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (id(current) === id(end)) {
      const path: Cell[] = [];
      let node: Cell | null = current;
      while (node && id(node) !== id(start)) { path.push(node); node = parents.get(id(node)) ?? null; }
      return path.reverse();
    }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (walkable(next) && !parents.has(id(next))) { parents.set(id(next), current); queue.push(next); }
    }
  }
  return [];
}

