import type { TerrainData } from './terrain-data.mjs';
export const CITY_DECK_HEIGHT: number;
export const FORTIFICATION_ASSETS: Record<string,{url:string;width:number;height:number;depth:number;deck?:number[][]}>;
export interface FortificationInstance {model:string;x:number;z:number;y:number;yaw:number;sx:number;sy:number;sz:number}
export interface CityBridge {id:string;outward:{x:number;z:number};tangent:{x:number;z:number};lateral?:number;from:number;start:number;end:number;to:number;halfWidth:number;visualHalfWidth:number;deck:number;endHeight:number;scale:number;spans:number}
export interface CityGate {id:string;x:number;z:number;angle:number;r:number;outward:{x:number;z:number};tangent:{x:number;z:number};half:number;passage:number;depth:number;joinDepth:number;joinHalf:number}
export function createFortifications(data:TerrainData):{instances:FortificationInstance[];walls:{x:number;z:number;yaw:number;half:number;depth:number}[];towers:{x:number;z:number;radius:number}[];gates:CityGate[];bridges:CityBridge[]};
export function fortificationSurface(data:TerrainData,x:number,z:number,margin?:number):number|undefined;
export function isFortificationClear(data:TerrainData,x:number,z:number,padding?:number):boolean;
export function isFortificationPlantingClear(data:TerrainData,x:number,z:number,padding?:number):boolean;
export function fitFortificationApproaches(data:TerrainData):void;
