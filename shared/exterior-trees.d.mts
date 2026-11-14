export interface TreeSpec {key:string;path:string;width:number;height:number;anchorX:number;anchorY:number}
export interface TreePlacement {type:string;x:number;y:number;height:number}
export interface ExteriorTree extends TreePlacement {id:string;spec:TreeSpec;scale:number;radiusX:number;radiusY:number}
export const TREE_SPECS:Record<string,TreeSpec>;
export const TREE_CLEARINGS:number[][];
export const TREE_PLACEMENTS:TreePlacement[];
export function getExteriorTrees(width:number,height:number):ExteriorTree[];
