import { PLAYER_RADIUS, type TerrainMovement } from '../../shared/terrain-movement.mjs';

// Two radii for the bodies, plus one body-width of space between them.
export const PLAYER_APPROACH_DISTANCE = PLAYER_RADIUS * 4;
type Point = { x: number; z: number };

/** Prefer the near side; try other dry sides if a bank or root blocks that spot. */
export function playerApproachPoint(movement: TerrainMovement, target: Point): Point | undefined {
  const from = movement.position;
  if (Math.hypot(from.x - target.x, from.z - target.z) <= PLAYER_APPROACH_DISTANCE) return { ...from };
  const angle = Math.atan2(from.z - target.z, from.x - target.x);
  for (let step = 0; step <= 16; step++) {
    for (const sign of step === 0 ? [1] : [1, -1]) {
      const theta = angle + sign * step * Math.PI / 16;
      const point = { x: target.x + Math.cos(theta) * PLAYER_APPROACH_DISTANCE,
        z: target.z + Math.sin(theta) * PLAYER_APPROACH_DISTANCE };
      if (movement.canStand(point) && movement.clearLine(point, target)) return point;
    }
  }
}
