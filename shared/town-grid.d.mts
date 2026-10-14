export interface Cell {x:number;y:number}
export const TILE_WIDTH:number,TILE_HEIGHT:number,MAP_COLUMNS:number,MAP_ROWS:number,MAP_WIDTH:number,MAP_HEIGHT:number;
export const SPAWN:Cell;
export function configureMap(...args:number[]):void;
export function cellAt(x:number,y:number):Cell;
export function centerOf(c:Cell):Cell;
export function configureNavigation(image:{width:number;height:number;data:Uint8ClampedArray|Uint8Array}):void;
export function walkable(c:Cell):boolean;
export function findPath(start:Cell,end:Cell):Cell[];
export function canStep(from:Cell,to:Cell):boolean;
