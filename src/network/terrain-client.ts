import {WorldClock} from '../../shared/world-time.mjs';
import { Client, type Room } from '@colyseus/sdk';
import { MAX_SPEED_LEVEL, DEFAULT_SPEED_LEVEL } from '../../shared/terrain-movement.mjs';
import { DEFAULT_CHARACTER_ID } from '../../shared/character-catalog.mjs';
import type {Area} from '../../shared/west-march.mjs';

import type {Profile} from '../terrain/character-profile';
type Build=Pick<Profile,'level'|'stats'>;
export interface BowShot {id:number;player:string;mob:string;releaseAt:number;impactAt:number;from:{x:number;y:number;z:number}}
export interface CombatHit {shotId?:number;mob:string;player:string;to:'monster'|'player';weapon?:string;damage:number;dodged?:boolean;missed?:boolean;critical:boolean;lethal:boolean}
export interface MonsterState {hp:number;engaged:boolean;x:number;z:number;heading:number;moving:boolean}
export interface TerrainPlayer { name: string; x: number; y: number; z: number; heading: number;
  moving: boolean; turning: boolean; path: string; pathIndex: number; targetX: number; targetZ: number; speedLevel: number; inputSeq: number; hairStyle: number; hairColor?: string; characterId: string; weapon:string; sceneReady?:boolean;protectedUntil?:number;autoHunt?:boolean;huntTarget?:string;hp?:number;maxHp?:number;mp?:number;maxMp?:number;swing?:number;hitTarget?:string;attackInterval?:number;swingStartedAt?:number }
interface TerrainState { players: Map<string, TerrainPlayer>; monsters?:Map<string,MonsterState> }

export class TerrainClient {
  room?: Room<any, TerrainState>;
  readonly players = new Map<string, TerrainPlayer>();
  connected = false;
  speedLevel = DEFAULT_SPEED_LEVEL;
  private disposed = false;
  private generation = 0;
  private inputSeq = 0;
  bowShot?:(shot:BowShot)=>void;
  monsterSwing?:(id:string)=>void;
  combatBlocked?:(id:string)=>void;
  sceneAccepted?:()=>void;
  readyForScene(){if(this.connected)this.room?.send('scene-ready');}
  private weapon='';
  private sentWeapon='';
  setWeapon(id:string){this.weapon=id;this.syncWeapon();}
  private syncWeapon(){
    const room=this.room;
    // Earlier rooms disconnect clients on unknown messages. The replicated
    // field advertises equipment support once the first snapshot is decoded.
    if(room?.connection.isOpen && this.weapon!==this.sentWeapon &&
      typeof room.state?.players?.get(room.sessionId)?.weapon==='string'){
      room.send('weapon',this.weapon);this.sentWeapon=this.weapon;
    }
  }
  private build?:Build;
  clockOffset=0;
  private clockRequested=false;
  private worldClock=new WorldClock();
  private clockTimer?:ReturnType<typeof setInterval>;
  private clockRequest?:{sent:number;monotonic:number};
  get serverNow(){return this.worldClock.now();}
  get clockReady(){return this.worldClock.ready;}
  private requestClock=()=>{
    if(!this.room?.connection.isOpen)return;
    const sent=Date.now();this.clockRequest={sent,monotonic:performance.now()};
    this.room.send('combat-clock',sent);
  };
  private resumeClock=()=>{if(!document.hidden)this.requestClock();};
  get monsters(){return this.room?.state?.monsters;}
  setBuild(build:Build){
    const next={level:build.level,stats:build.stats};
    if(JSON.stringify(next)===JSON.stringify(this.build))return;
    this.build=next;
    if(this.connected && this.monsters)this.room?.send('build',next);
  }
  fight(id:string){
    if(this.connected && this.monsters)this.room?.send('fight',id);
  }
  hunt(enabled:boolean,radius:number,kinds:string[]){
    if(this.connected && this.monsters)this.room?.send('auto-hunt',{enabled,radius:Number.isFinite(radius)?radius:null,kinds});
  }
  get nextInputSeq() { return this.inputSeq + 1; }
  constructor(private displayName: string, private status: (state: 'connecting' | 'online' | 'offline') => void,
    private rejected: () => void, private snapshot?: (player: TerrainPlayer) => void,
    private characterId = DEFAULT_CHARACTER_ID, private area: Area = 'city', private fromWest = false,private reward?:(kind:string,amount:number)=>void,private hit?:(event:CombatHit)=>void, private hairColor = '') {document.addEventListener('visibilitychange',this.resumeClock);}
  async connect(): Promise<void> {
    if (this.disposed) return;
    clearInterval(this.clockTimer);this.clockRequest=undefined;
    const generation = ++this.generation;
    this.inputSeq = 0;this.clockRequested=false;
    const previous = this.room; this.room = undefined; this.connected = false; this.players.clear();
    if (previous) void previous.leave().catch(() => {});
    this.status('connecting');
    try {
      const env = (import.meta as any).env;
      const endpoint = env.VITE_GAME_SERVER_URL || ((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.hostname + ':' + env.VITE_LOCAL_GAME_PORT);
      const roomName = this.area === 'city' ? 'mythraven-world' : 'mythraven-west-march';
      const initialWeapon=this.weapon;
      const room = await new Client(endpoint).joinOrCreate<TerrainState>(roomName, { displayName: this.displayName,
        characterId: this.characterId, hairColor: this.hairColor, fromWest: this.fromWest,weapon:initialWeapon,build:this.build });
      if (this.disposed || generation !== this.generation) { void room.leave().catch(() => {}); return; }
      this.room = room; room.reconnection.enabled = false;
      this.sentWeapon=initialWeapon;
      if (this.speedLevel !== DEFAULT_SPEED_LEVEL) room.send('speed-level', { level: this.speedLevel });
      const current = () => !this.disposed && generation === this.generation;
      const sync = (state: TerrainState) => {
        if (!current()) return;
        this.players.clear();
        state.players?.forEach((p, id) => this.players.set(id, { name: p.name, x: p.x, y: p.y, z: p.z,sceneReady:p.sceneReady,protectedUntil:p.protectedUntil,
          heading: p.heading, moving: p.moving, turning: p.turning, path: p.path, pathIndex: p.pathIndex, targetX: p.targetX, targetZ: p.targetZ, speedLevel: p.speedLevel, inputSeq: p.inputSeq, hairStyle: p.hairStyle, hairColor: p.hairColor, characterId: p.characterId,weapon:p.weapon??'',autoHunt:p.autoHunt,huntTarget:p.huntTarget,hp:p.hp,maxHp:p.maxHp,mp:p.mp,maxMp:p.maxMp,swing:p.swing,hitTarget:p.hitTarget,attackInterval:p.attackInterval,swingStartedAt:p.swingStartedAt }));
        this.connected = this.players.has(room.sessionId);
        if (this.connected) {
          const mine = this.players.get(room.sessionId)!;
          this.syncWeapon();
          if(!this.clockRequested){
            this.clockRequested=true;this.requestClock();
            if(this.build)room.send('build',this.build);
          }
          this.inputSeq = Math.max(this.inputSeq, mine.inputSeq);
          this.snapshot?.(mine); this.status('online');
        }
      };
      const lost = () => { if (current()) { this.connected = false; this.players.clear(); this.status('offline'); } };
      room.onMessage('bow-shot',(shot:BowShot)=>{if(current())this.bowShot?.(shot);});
      room.onMessage('monster-swing',(id:string)=>{if(current())this.monsterSwing?.(id);});
      room.onMessage('scene-ready',()=>{if(current())this.sceneAccepted?.();});
      room.onMessage('combat-hit',(event:CombatHit)=>{if(current())this.hit?.(event);});
      room.onMessage('combat-blocked',message=>{if(current())this.combatBlocked?.(message?.mob);});
      room.onMessage('combat-reward',message=>{
        if(current() && Number.isSafeInteger(message?.amount) && message.amount>0)this.reward?.(message.kind,message.amount);
      });
      room.onMessage('combat-clock',message=>{
        if(!current() || !this.clockRequest || message.sent!==this.clockRequest.sent)return;
        if(this.worldClock.sample(message.server,this.clockRequest.monotonic))this.clockOffset=(this.serverNow-Date.now())/1000;
        this.clockRequest=undefined;
      });
      room.onStateChange(sync); room.onMessage('move-rejected', (message: {seq?: number}) => {
        if (current() && (message?.seq ?? -1) >= this.inputSeq) this.rejected();
      });
      room.onDrop(lost); room.onLeave(lost); room.onError(lost);
      this.clockTimer=setInterval(()=>{if(current())this.requestClock();},60000);
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
    clearInterval(this.clockTimer);document.removeEventListener('visibilitychange',this.resumeClock);
    this.disposed = true; ++this.generation; this.connected = false; this.players.clear();
    void this.room?.leave().catch(() => {}); this.room = undefined;
  }
}
