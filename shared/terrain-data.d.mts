export const TERRAIN: { readonly size: number; readonly segments: number; readonly layoutWidth: number;
  readonly layoutHeight: number; readonly layoutDepth: number; readonly waterLevel: number;
  readonly bedLevel: number; readonly landLevel: number; readonly baseLevel: number; readonly shoreline: string;
  readonly plateauRise: number; readonly plateauStart: number; readonly plateauFull: number };
export interface TerrainData { area?: 'west-march'; heights: Float32Array; shoreDistance: Float32Array; side: number }
export function smoothstep(a: number, b: number, value: number): number;
export function layoutToWorld(x: number, y: number): { x: number; z: number };
export function groundVariation(x: number, z: number): number;
export function buildTerrainData(image: { width: number; height: number; data: Uint8Array | Uint8ClampedArray }): TerrainData;
