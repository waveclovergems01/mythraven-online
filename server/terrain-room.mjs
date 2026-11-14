import { Room, ServerError } from '@colyseus/core';
import { schema, t } from '@colyseus/schema';
import { TerrainMovement, DEFAULT_SPEED_LEVEL } from '../shared/terrain-movement.mjs';
import { characterById } from '../shared/character-catalog.mjs';

export const TERRAIN_ROOM_CAPACITY = 64;
let worldTerrain;
export function configureTerrainWorld(data) { worldTerrain = data; }
const Player = schema({ name: t.string().default(''), x: t.float32().default(0), y: t.float32().default(0),
  z: t.float32().default(0), heading: t.float32().default(0), moving: t.boolean().default(false), turning: t.boolean().default(false),
  targetX: t.float32().default(0), targetZ: t.float32().default(0), speedLevel: t.uint8().default(DEFAULT_SPEED_LEVEL),
  inputSeq: t.uint32().default(0), hairStyle: t.uint8().default(1), characterId: t.string().default('') });
const World = schema({ players: t.map(Player) });

/** Browsers request destinations and bounded speed levels; the server owns simulation. */
export class TerrainRoom extends Room {
  onCreate() {
    if (!worldTerrain) throw new Error('Terrain world is not configured');
    this.terrainData = worldTerrain;
    this.maxClients = TERRAIN_ROOM_CAPACITY;
    this.setState(new World()); this.movers = new Map(); this.pendingCommands = new Map();
    this.setPatchRate(50); this.setSimulationInterval(dt => this.tick(dt), 50);
    this.onMessage('move', (client, message) => {
      const mover = this.movers.get(client.sessionId); if (!mover) return;
      const player = this.state.players.get(client.sessionId);
      const latest = this.pendingCommands.get(client.sessionId)?.seq ?? player.inputSeq;
      const seq = message?.seq ?? latest + 1;
      if (!Number.isInteger(seq) || seq <= latest || seq > 0xffffffff) return;
      if (!message || typeof message.x !== 'number' || typeof message.z !== 'number'
        || !Number.isFinite(message.x) || !Number.isFinite(message.z)) {
        client.send('move-rejected', { seq }); return;
      }
      // Keep the newest click, never discard it because an earlier click was recent.
      // Expensive pathfinding runs at most once per player per simulation tick.
      this.pendingCommands.set(client.sessionId, { x: message.x, z: message.z, seq, client });
    });
    this.onMessage('stop', (client, message) => {
      const player = this.state.players.get(client.sessionId); if (!player) return;
      const latest = this.pendingCommands.get(client.sessionId)?.seq ?? player.inputSeq;
      const seq = message?.seq ?? latest + 1;
      if (!Number.isInteger(seq) || seq <= latest || seq > 0xffffffff) return;
      this.pendingCommands.delete(client.sessionId); player.inputSeq = seq;
      this.movers.get(client.sessionId)?.stop(); this.sync(client.sessionId);
    });
    this.onMessage('speed-level', (client, message) => {
      if (this.movers.get(client.sessionId)?.setSpeedLevel(message?.level)) this.sync(client.sessionId);
    });
  }
  onJoin(client, options) {
    const character = characterById(options?.characterId);
    if (!character) throw new ServerError(400, 'Choose a valid character before entering the city');
    const mover = new TerrainMovement(this.terrainData);
    // Separated spawn points keep new arrivals visible instead of stacking capsules.
    search: for (let radius = 0; radius < 15; radius++) for (let z = -radius; z <= radius; z++) for (let x = -radius; x <= radius; x++) {
      const candidate = { x: mover.spawn.x + x * 2.6, z: mover.spawn.z + z * 2.6 };
      if (mover.canStand(candidate) && [...this.movers.values()].every(other =>
        Math.hypot(other.position.x - candidate.x, other.position.z - candidate.z) > 2)) {
        Object.assign(mover.position, candidate); break search;
      }
    }
    const player = new Player();
    player.characterId = character.id; player.hairStyle = character.hairStyle;
    // A display label is cosmetic; it grants no account identity or privileges.
    const label = typeof options?.displayName === 'string' ? options.displayName.replace(/[<>\p{C}]/gu, '').trim().slice(0, 24) : '';
    player.name = label || 'Guest-' + client.sessionId.slice(0, 6);
    this.movers.set(client.sessionId, mover); this.state.players.set(client.sessionId, player); this.sync(client.sessionId);
  }
  sync(id) {
    const mover = this.movers.get(id), player = this.state.players.get(id); if (!mover || !player) return;
    player.x = mover.position.x; player.z = mover.position.z; player.y = mover.height;
    player.heading = mover.heading; player.moving = mover.moving; player.turning = mover.turning;
    player.speedLevel = mover.speedLevel;
    player.targetX = mover.destination?.x ?? mover.position.x; player.targetZ = mover.destination?.z ?? mover.position.z;
  }
  tick(milliseconds) {
    for (const [id, command] of this.pendingCommands) {
      const mover = this.movers.get(id), player = this.state.players.get(id);
      if (!mover || !player) continue;
      if (!mover.moveTo({ x: command.x, z: command.z })) command.client.send('move-rejected', { seq: command.seq });
      player.inputSeq = command.seq;
    }
    this.pendingCommands.clear();
    for (const [id, mover] of this.movers) { mover.update(Math.min(50, Math.max(0, milliseconds)) / 1000); this.sync(id); }
  }
  onLeave(client) { this.state.players.delete(client.sessionId); this.movers.delete(client.sessionId); this.pendingCommands.delete(client.sessionId); }
  onDrop(client) { this.onLeave(client); }
  onDispose() { this.movers.clear(); this.pendingCommands.clear(); }
}
