export interface PathCell { x: number; y: number }
export function canStep(from: PathCell, to: PathCell, isWalkable: (cell: PathCell) => boolean): boolean;
export function shortestPath(start: PathCell, end: PathCell, options: {
  columns: number; rows: number; width: number; height: number;
  walkable: (cell: PathCell) => boolean;
}): PathCell[];
