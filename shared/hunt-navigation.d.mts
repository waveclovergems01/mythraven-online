import type {GroundPoint,TerrainMovement} from './terrain-movement.mjs';
export const PLAYER_APPROACH_DISTANCE:number;
export function playerApproachPoint(movement:TerrainMovement,target:GroundPoint,distance?:number):GroundPoint|undefined;
export function nearestHuntTarget(movement:TerrainMovement,candidates:{id:string;goal:GroundPoint}[],standOff:number,
  withinHunt:(point:GroundPoint)=>boolean,current?:string):string|undefined;
