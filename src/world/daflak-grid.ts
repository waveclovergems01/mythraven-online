// Keep the 40 × 40 terrain layout, subdividing each block into 2 × 2 movement cells.
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 56;
export const MAP_TILES = 80;
export const MAP_WIDTH = TILE_WIDTH * MAP_TILES;
export const MAP_HEIGHT = TILE_HEIGHT * MAP_TILES;
export interface Cell { x: number; y: number }
export const SPAWN: Cell = { x: 40, y: 36 };
export const cellAt = (x: number, y: number): Cell => ({ x: Math.floor(x / TILE_WIDTH), y: Math.floor(y / TILE_HEIGHT) });
export const centerOf = (c: Cell): Cell => ({ x: (c.x + 0.5) * TILE_WIDTH, y: (c.y + 0.5) * TILE_HEIGHT });
export function walkable(c: Cell): boolean {
  if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || c.x < 0 || c.y < 0 || c.x >= MAP_TILES || c.y >= MAP_TILES) return false;
  // Conservative first-pass mask: main avenues, bridges and central plaza only.
  // The painted districts remain blocked until their object footprints are authored.
  const x = Math.floor(c.x / 2), y = Math.floor(c.y / 2);
  return x === 19 || x === 20 || y === 17 || y === 18 ||
    ((x - 19.5) ** 2 + (y - 18) ** 2 <= 6.25);
}
export function findPath(start: Cell, end: Cell): Cell[] {
  if (!walkable(start) || !walkable(end)) return [];
  const id = (c: Cell) => c.y * MAP_TILES + c.x;
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
