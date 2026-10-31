export type Rect={left:number;top:number;right:number;bottom:number};
export const PERIMETER:number[][];
export const GATES:{id:string;x:number;y:number;axis:string;bridge:number[];inside:number[];outside:number[]}[];
export function getFortifications(width:number,height:number):{
 walls:{x1:number;y1:number;x2:number;y2:number;axis:string;footprint:Rect}[];
 towers:{x:number;y:number;gate:boolean}[];
 bridges:({id:string;axis:string}&Rect)[];
 rails:({axis:string}&Rect)[];
 solids:Rect[];
};
