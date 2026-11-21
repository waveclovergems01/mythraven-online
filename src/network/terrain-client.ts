import { Client, type Room } from '@colyseus/sdk';
import { MAX_SPEED_LEVEL, DEFAULT_SPEED_LEVEL } from '../../shared/terrain-movement.mjs';
import { DEFAULT_CHARACTER_ID } from '../../shared/character-catalog.mjs';
import type {Area} from '../../shared/west-march.mjs';

export interface TerrainPlayer { name: string; x: number; y: number; z: number; heading: number;
  moving: boolean; turning: boolean; path: string; pathIndex: number; targetX: number; targetZ: number; speedLevel: number; inputSeq: number; hairStyle: number; characterId: string }
interface TerrainState { players: Map<string, TerrainPlayer> }

export class TerrainClient {
  room?: Room<any, TerrainState>;
  readonly players = new Map<string, TerrainPlayer>();
  connected = false;
  speedLevel = DEFAULT_SPEED_LEVEL;
  private disposed = false;
  private generation = 0;
  private inputSeq = 0;
  get nextInputSeq() { return this.inputSeq + 1; }
  constructor(private displayName: string, private status: (state: 'connecting' | 'online' | 'offline') => void,
    private rejected: () => void, private snapshot?: (player: TerrainPlayer) => void,
    private characterId = DEFAULT_CHARACTER_ID, private area: Area = 'city', private fromWest = false) {}
  async connect(): Promise<void> {
    if (this.disposed) return;
    const generation = ++this.generation;
    this.inputSeq = 0;
    const previous = this.room; this.room = undefined; this.connected = false; this.players.clear();
    if (previous) void previous.leave().catch(() => {});
    this.status('connecting');
    try {
      const env = (import.meta as any).env;
      const endpoint = env.VITE_GAME_SERVER_URL || ((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.hostname + ':' + env.VITE_LOCAL_GAME_PORT);
      const roomName = this.area === 'city' ? 'mythraven-world' : 'mythraven-west-march';
      const room = await new Client(endpoint).joinOrCreate<TerrainState>(roomName, { displayName: this.displayName,
        characterId: this.characterId, fromWest: this.fromWest });
      if (this.disposed || generation !== this.generation) { void room.leave().catch(() => {}); return; }
      this.room = room; room.reconnection.enabled = false;
      if (this.speedLevel !== DEFAULT_SPEED_LEVEL) room.send('speed-level', { level: this.speedLevel });
      const current = () => !this.disposed && generation === this.generation;
      const sync = (state: TerrainState) => {
        if (!current()) return;
        this.players.clear();
        state.players?.forEach((p, id) => this.players.set(id, { name: p.name, x: p.x, y: p.y, z: p.z,
          heading: p.heading, moving: p.moving, turning: p.turning, path: p.path, pathIndex: p.pathIndex, targetX: p.targetX, targetZ: p.targetZ, speedLevel: p.speedLevel, inputSeq: p.inputSeq, hairStyle: p.hairStyle, characterId: p.characterId }));
        this.connected = this.players.has(room.sessionId);
        if (this.connected) {
          const mine = this.players.get(room.sessionId)!;
          this.inputSeq = Math.max(this.inputSeq, mine.inputSeq);
          this.snapshot?.(mine); this.status('online');
        }
      };
      const lost = () => { if (current()) { this.connected = false; this.players.clear(); this.status('offline'); } };
      room.onStateChange(sync); room.onMessage('move-rejected', (message: {seq?: number}) => {
        if (current() && (message?.seq ?? -1) >= this.inputSeq) this.rejected();
      });
      room.onDrop(lost); room.onLeave(lost); room.onError(lost);
      if (room.state?.players) sync(room.state);
    } catch { if (!this.disposed && generation === this.generation) this.status('offline'); }
  }
  move(x: number, z: number): void {
    if (!this.connected) return;
    this.room?.send('move', { x, z, seq: ++this.inputSeq });
  }
  setSpeedLevel(level: number): void {
    if (!Number.isInteger(level) || level < 1 || level > MAX_SPEED_LEVEL) return;
    this.speedLevel = level;
    if (this.connected) this.room?.send('speed-level', { level });
  }
  stop(): void { if (this.connected) this.room?.send('stop', {seq: ++this.inputSeq}); }
  dispose(): void {
    this.disposed = true; ++this.generation; this.connected = false; this.players.clear();
    void this.room?.leave().catch(() => {}); this.room = undefined;
  }
}
