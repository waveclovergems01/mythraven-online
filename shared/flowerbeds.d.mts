export interface Flowerbed {id:string;points:number[][];rim:number;elevation:number}
export const FLOWERBED_LAYOUT:{id:string;points:number[][]}[];
export function getFlowerbeds(width:number,height:number):Flowerbed[];
export function pointInFlowerbed(x:number,y:number,points:number[][]):boolean;
export function flowerbedFrontY(bed:Flowerbed,left:number,right?:number):number;
export function flowerbedTouchesCell(bed:Flowerbed,left:number,top:number,width:number,height:number):boolean;
