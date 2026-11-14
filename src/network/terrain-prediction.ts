import { TerrainMovement } from '../../shared/terrain-movement.mjs';
import type { TerrainData } from '../../shared/terrain-data.mjs';
import type { TerrainPlayer } from './terrain-client';

type Command = { seq: number; at: number; target?: { x: number; z: number } };

/** Local input prediction with ordered acknowledgements and replay of unacknowledged inputs. */
export class TerrainPrediction {
  readonly movement: TerrainMovement;
  ready = false;
  private pending: Command[] = [];
  private correction = { x: 0, z: 0 };
  private signature = '';
  private roundTrip = 80;
  constructor(data: TerrainData) { this.movement = new TerrainMovement(data); }
  get position() { return { x: this.movement.position.x + this.correction.x, z: this.movement.position.z + this.correction.z }; }
  move(seq: number, x: number, z: number) {
    if (!this.ready || !this.movement.moveTo({ x, z })) return false;
    this.pending.push({ seq, at: performance.now(), target: { x, z } }); return true;
  }
  stop(seq: number) {
    this.movement.stop(); this.correction = { x: 0, z: 0 };
    if (this.ready) this.pending.push({ seq, at: performance.now() });
  }
  reset() { this.ready = false; this.pending = []; this.signature = ''; this.movement.stop(); this.correction = { x: 0, z: 0 }; }
  accept(player: TerrainPlayer) {
    const signature = [player.inputSeq, player.x, player.z, player.heading, player.moving, player.turning, player.targetX, player.targetZ, player.speedLevel].join(',');
    if (signature === this.signature) return;
    this.signature = signature;
    const now = performance.now(), before = this.position;
    const acknowledged = this.pending.find(command => command.seq === player.inputSeq);
    if (acknowledged) this.roundTrip = Math.max(0, Math.min(400, now - acknowledged.at));
    this.pending = this.pending.filter(command => command.seq > player.inputSeq);
    this.movement.stop(); Object.assign(this.movement.position, { x: player.x, z: player.z });
    this.movement.heading = player.heading;
    this.movement.setSpeedLevel(player.speedLevel);
    if (player.moving) this.movement.moveTo({ x: player.targetX, z: player.targetZ });
    // Estimate snapshot travel time, then replay newer clicks in their original order.
    let cursor = this.ready ? now - Math.min(125, this.roundTrip / 2) : now;
    for (const command of this.pending) {
      const at = Math.max(cursor, Math.min(now, command.at));
      this.advance((at - cursor) / 1000); cursor = at;
      if (command.target) this.movement.moveTo(command.target); else this.movement.stop();
    }
    this.advance((now - cursor) / 1000);
    const distance = Math.hypot(before.x - this.movement.position.x, before.z - this.movement.position.z);
    if (this.ready && distance < 6 && this.movement.moving && this.movement.clearLine(before, this.movement.position))
      this.correction = { x: before.x - this.movement.position.x, z: before.z - this.movement.position.z };
    else this.correction = { x: 0, z: 0 };
    this.ready = true;
  }
  private advance(seconds: number) {
    while (seconds > 0) { const dt = Math.min(.05, seconds); this.movement.update(dt); seconds -= dt; }
  }
  update(seconds: number) {
    if (!this.ready) return;
    const dt = Math.min(.1, Math.max(0, seconds)); this.advance(dt);
    const decay = Math.exp(-dt / .065);
    this.correction.x *= decay; this.correction.z *= decay;
    if (!this.movement.moving) this.correction = { x: 0, z: 0 };
  }
}
