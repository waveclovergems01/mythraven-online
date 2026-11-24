import type {TerrainMovement,GroundPoint} from './terrain-movement.mjs';
interface Patrol {id:string;kind:'rabbit'|'wolf';index:number;spawn:GroundPoint}
export function createPatrols(nav:TerrainMovement):Patrol[];
