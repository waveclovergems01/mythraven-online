import type { TerrainData } from './terrain-data.mjs';
export interface GroundPoint { x: number; z: number }
export const WALK_SPEED: number, PLAYER_RADIUS: number;
export const TURN_SPEED: number;
export function angleDifference(from: number, to: number): number;
export function turnTowards(from: number, to: number, seconds: number): number;
export const MAX_SPEED_LEVEL: number;
export const DEFAULT_SPEED_LEVEL: number;
export function speedMultiplier(level: number): number;
export function terrainHeight(data: TerrainData, x: number, z: number): number;
export class TerrainMovement {
  constructor(data: TerrainData);
  readonly speedLevel: number;
  setSpeedLevel(level: number): boolean;
  readonly data: TerrainData; readonly position: GroundPoint; readonly spawn: GroundPoint;
  heading: number; readonly moving: boolean; readonly turning: boolean; readonly height: number; readonly destination: GroundPoint | undefined;
  readonly path: string; readonly next: number;
  readonly route: readonly GroundPoint[];
  planRoute(target: GroundPoint): GroundPoint[] | undefined;
  restorePath(path: string, next: number, turning: boolean): void;
  canStand(point: GroundPoint): boolean;
  clearLine(a: GroundPoint, b: GroundPoint): boolean;
  moveTo(target: GroundPoint): boolean;
  stop(): void;
  update(seconds: number): void;
}
