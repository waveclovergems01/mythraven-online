import {Room} from '@colyseus/core';
import {schema,t} from '@colyseus/schema';
import {SPAWN,centerOf,walkable,canStep,findPath,MAP_WIDTH,MAP_HEIGHT} from '../shared/town-grid.mjs';
const Player=schema({name:t.string().default(''),x:t.float32().default(0),y:t.float32().default(0),moving:t.boolean().default(false),facing:t.int8().default(1)});
const TownState=schema({players:t.map(Player),width:t.uint32().default(MAP_WIDTH),height:t.uint32().default(MAP_HEIGHT)});
export class TownRoom extends Room {
 onCreate(){
  this.maxClients=32;this.setState(new TownState());this.movers=new Map();
  this.setPatchRate(50);this.setSimulationInterval(dt=>this.tick(Math.min(dt,100)),50);
  this.onMessage('move',(client,message)=>{
   const m=this.movers.get(client.sessionId);if(!m)return;
   const now=Date.now();if(now-m.lastCommand<75)return;m.lastCommand=now;
   if(!message||!Number.isInteger(message.x)||!Number.isInteger(message.y)||!walkable(message))return;
   // Complete the current cell edge before changing route; no corner cutting.
   m.path=findPath(m.target??m.cell,{x:message.x,y:message.y});m.direction=null;
  });
  this.onMessage('direction',(client,message)=>{
   const m=this.movers.get(client.sessionId);if(!m)return;
   if(!message||![-1,0,1].includes(message.x)||![-1,0,1].includes(message.y))return;
   const now=Date.now();if(now-m.lastDirection<40)return;m.lastDirection=now;
   m.direction={x:message.x,y:message.y};m.directionUntil=now+350;if(message.x||message.y)m.path=[];
  });
 }
 onJoin(client){
  const p=new Player();p.name='Guest-'+client.sessionId.slice(0,6);
  const occupied=new Set([...this.movers.values()].map(m=>`${m.cell.x},${m.cell.y}`));
  let cell={...SPAWN};
  search:for(let r=0;r<10;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
   const c={x:SPAWN.x+x,y:SPAWN.y+y};if(walkable(c)&&!occupied.has(`${c.x},${c.y}`)){cell=c;break search;}
  }
  Object.assign(p,centerOf(cell));this.state.players.set(client.sessionId,p);
  this.movers.set(client.sessionId,{cell,path:[],target:null,direction:null,directionUntil:0,lastCommand:0,lastDirection:0});
 }
 tick(dt){
  for(const [id,m] of this.movers){
   const p=this.state.players.get(id);if(!p)continue;
   let budget=420*Math.max(0,Math.min(dt,100))/1000,moved=false;
   while(budget>1e-6){
    if(!m.target){
     if(m.direction&&Date.now()<m.directionUntil&&(m.direction.x||m.direction.y)){
      const next={x:m.cell.x+m.direction.x,y:m.cell.y+m.direction.y};if(canStep(m.cell,next))m.target=next;
     }else m.target=m.path.shift()??null;
    }
    if(!m.target)break;
    const to=centerOf(m.target),dx=to.x-p.x,dy=to.y-p.y,distance=Math.hypot(dx,dy);
    if(dx)p.facing=dx<0?-1:1;
    if(distance<=budget){p.x=to.x;p.y=to.y;m.cell=m.target;m.target=null;budget-=distance;moved=true;}
    else{p.x+=dx/distance*budget;p.y+=dy/distance*budget;budget=0;moved=true;}
   }
   p.moving=moved;
  }
 }
 onLeave(client){this.state.players.delete(client.sessionId);this.movers.delete(client.sessionId);}
 onDrop(client){this.onLeave(client);}
}
