import type { TerrainData } from './terrain-data.mjs';
export const TREE_MODELS: { id: string; url: string; height: number; radius: number; scaleMin: number; scaleMax: number }[];
export interface TreePlacement { id: string; x: number; z: number; model: number; scale: number; yaw: number; radius: number; region: string }
export function createTreePlacements(data: TerrainData): TreePlacement[];
export function isTreeCellClear(data: TerrainData, x: number, z: number, size: number, padding: number): boolean;
