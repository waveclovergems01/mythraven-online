import type {TerrainData} from './terrain-data.mjs';
export const BUILDING_ASSETS:Record<string,{url:string;width:number;height:number;depth:number;sourceId:string;emissive:boolean}>;
export const PLAZA_RADIUS:number;
export const FOUNTAIN_RESERVE_RADIUS:number;
export interface CityBuilding {id:string;model:string;x:number;z:number;y:number;yaw:number;scale:number;halfWidth:number;halfDepth:number;height:number;radius?:number}
export interface CityRoad {ax:number;az:number;bx:number;bz:number;width:number}
export function createCityLayout(data:TerrainData):{buildings:CityBuilding[];roads:CityRoad[];plaza:{x:number;z:number;radius:number;fountainRadius:number}};
export function roadDistance(r:CityRoad,x:number,z:number):number;
export function isBuildingClear(data:TerrainData,x:number,z:number,padding?:number):boolean;
export function isCityPlantingClear(data:TerrainData,x:number,z:number,padding?:number):boolean;
export function fitCityFoundations(data:TerrainData):void;
