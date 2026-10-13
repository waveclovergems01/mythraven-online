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
  MAP_COLUMNS = Math.max(40, Math.ceil(viewportWidth * 2 / 32));
  MAP_ROWS = Math.max(40, Math.ceil(viewportHeight * 3 / 28));
  MAP_WIDTH = TILE_WIDTH * MAP_COLUMNS;
  MAP_HEIGHT = TILE_HEIGHT * MAP_ROWS;
  SPAWN = { x: Math.floor(MAP_COLUMNS / 2), y: Math.floor(MAP_ROWS * 0.475) };
}
export const cellAt = (x: number, y: number): Cell => ({ x: Math.floor(x / TILE_WIDTH), y: Math.floor(y / TILE_HEIGHT) });
export const centerOf = (c: Cell): Cell => ({ x: (c.x + 0.5) * TILE_WIDTH, y: (c.y + 0.5) * TILE_HEIGHT });
// Vertices traced inside the generated current riverbanks, clockwise (normalized).
export const island = [[0.19,0.12],[0.81,0.12],[0.89,0.20],[0.905,0.31],
  [0.905,0.70],[0.86,0.80],[0.80,0.87],[0.20,0.87],[0.12,0.80],
  [0.095,0.70],[0.095,0.30],[0.13,0.19]];
function onLand(x: number, y: number): boolean {
  let inside = false;
  for (let i=0,j=island.length-1;i<island.length;j=i++) {
    const [ax,ay]=island[i], [bx,by]=island[j];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
}
export function walkable(c: Cell): boolean {
  if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || c.x < 0 || c.y < 0 || c.x >= MAP_COLUMNS || c.y >= MAP_ROWS) return false;
  const left = c.x / MAP_COLUMNS, right = (c.x + 1) / MAP_COLUMNS;
  const top = c.y / MAP_ROWS, bottom = (c.y + 1) / MAP_ROWS;
  const land = [[left,top],[right,top],[left,bottom],[right,bottom]].every(([x,y])=>onLand(x,y));
  const bridge = bridgeBounds();
  const northSouthBridge = c.x*TILE_WIDTH >= bridge.left && (c.x+1)*TILE_WIDTH <= bridge.right;
  const eastWestBridge = c.y*TILE_HEIGHT >= bridge.top && (c.y+1)*TILE_HEIGHT <= bridge.bottom;
  return land || northSouthBridge || eastWestBridge;
}
// Three movement cells wide, independent of viewport and total map size.
export function bridgeBounds() {
  const left = (Math.floor(MAP_COLUMNS * 0.4975)-1)*TILE_WIDTH;
  const top = (Math.floor(MAP_ROWS * 0.4725)-1)*TILE_HEIGHT;
  return {left, right:left+3*TILE_WIDTH, top, bottom:top+3*TILE_HEIGHT};
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
