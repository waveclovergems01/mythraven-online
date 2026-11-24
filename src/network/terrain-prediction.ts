import {TerrainMovement, WALK_SPEED, speedMultiplier} from '../../shared/terrain-movement.mjs';
import type {TerrainData} from '../../shared/terrain-data.mjs';
import type {TerrainPlayer} from './terrain-client';

/** Simulation follows server-authored corridors. Rendering catches up continuously, even after a stop. */
export class TerrainPrediction {
  readonly movement:TerrainMovement;
  private readonly display:TerrainMovement;
  ready=false;
  private pending?:{seq:number;at:number;detour?:{x:number;z:number}};
  get awaitingRoute(){return !!this.pending?.detour;}
  get destination(){return this.pending?.detour??this.movement.destination;}
  private lastAck=-1;
  private roundTrip=80;
  private lastHp?:number;
  private serverPosition={x:0,z:0};
  private signature='';
  private lastDetour=-Infinity;
  constructor(data:TerrainData){
    this.movement=new TerrainMovement(data);
    this.display=new TerrainMovement(data);
  }
  get position(){return {...this.display.position};}
  get settling(){
    const p=this.display.position;
    return Math.hypot(p.x-this.movement.position.x,p.z-this.movement.position.z)>.015;
  }
  move(seq:number,x:number,z:number,serverDetour=false){
    if(!this.ready)return false;
    const target={x,z};
    if(serverDetour && !this.movement.clearLine(this.movement.position,target)){
      if(!this.movement.canStand(target))return false;
      // The server already plans this detour. Leave the input frame available for rendering.
      this.movement.stop();this.pending={seq,at:performance.now(),detour:target};return true;
    }
    if(!this.movement.moveTo(target))return false;
    this.pending={seq,at:performance.now()};return true;
  }
  stop(seq:number){
    this.movement.stop();
    if(this.ready)this.pending={seq,at:performance.now()};
  }
  reset(){
    this.pending=undefined;this.ready=false;this.lastAck=-1;this.lastHp=undefined;
    this.signature='';this.roundTrip=80;this.lastDetour=-Infinity;
    this.display.stop();this.movement.stop();
  }
  accept(player:TerrainPlayer){
    if(player.inputSeq<this.lastAck)return;
    this.lastAck=player.inputSeq;
    const revived=this.lastHp===0 && (player.hp??0)>0;
    this.lastHp=player.hp;
    Object.assign(this.serverPosition,{x:player.x,z:player.z});
    // A superseded destination cannot acknowledge the most recent redirect.
    // Keep its position only as a bound on how far to predict while waiting.
    if(this.pending && player.inputSeq<this.pending.seq && !revived && player.hp!==0)return;
    if(this.pending && player.inputSeq===this.pending.seq)
      this.roundTrip=Math.min(400,Math.max(0,performance.now()-this.pending.at));
    this.pending=undefined;
    const signature=[player.inputSeq,player.x,player.z,player.heading,player.moving,player.turning,player.path,player.pathIndex,player.speedLevel,player.hp===0].join(',');
    if(signature===this.signature && !revived)return;
    this.signature=signature;
    Object.assign(this.movement.position,this.serverPosition);
    this.movement.heading=player.heading;
    this.movement.setSpeedLevel(player.speedLevel);
    this.movement.restorePath(player.path,player.pathIndex,player.turning);
    if(!this.ready || revived){
      Object.assign(this.display.position,this.serverPosition);this.display.stop();
    }else if(player.moving)this.advance(Math.min(.125,this.roundTrip/2000));
    this.ready=true;
  }
  private advance(seconds:number){
    while(seconds>0){const step=Math.min(.05,seconds);this.movement.update(step);seconds-=step;}
  }
  update(seconds:number){
    if(!this.ready)return;
    const dt=Math.min(.05,Math.max(0,seconds)),speed=WALK_SPEED*speedMultiplier(this.movement.speedLevel);
    const target=this.movement.position;
    if(!this.pending || (performance.now()-this.pending.at<300 &&
      Math.hypot(target.x-this.serverPosition.x,target.z-this.serverPosition.z)<speed*.22))
      this.advance(dt);
    const drawn=this.display.position,dx=target.x-drawn.x,dz=target.z-drawn.z,distance=Math.hypot(dx,dz);
    if(!distance)return;
    if(this.movement.clearLine(drawn,target)){
      if(this.display.moving)this.display.stop();
      const fraction=Math.min(1,dt*speed*1.3/distance);
      drawn.x+=dx*fraction;drawn.z+=dz*fraction;
    }else{
      // Corrections near a corner follow walkable ground at walking speed as well.
      const now=performance.now(),dest=this.display.destination;
      if(now-this.lastDetour>=120 && (!dest || Math.hypot(dest.x-target.x,dest.z-target.z)>1)){
        this.display.moveTo(target);this.lastDetour=now;
      }
      this.display.setSpeedLevel(this.movement.speedLevel);this.display.update(dt);
    }
  }
}
