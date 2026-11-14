export type TownPropertyType = 'cottage' | 'townhouse' | 'cottage-dormer' | 'townhouse-bay' | 'guildhall' | 'stall' | 'handcart';
export interface TownProperty {
  id: string;
  type: TownPropertyType;
  x: number;
  y: number;
  width: number;
  points: number[][];
  originY: number;
  footprint: {left:number; right:number; top:number; bottom:number};
}
export function getTownProperties(mapWidth:number, mapHeight:number): TownProperty[];
