import {Client,type Room} from '@colyseus/sdk';
export interface NetworkPlayer {name:string;x:number;y:number;moving:boolean;facing:number}
interface TownState {players:Map<string,NetworkPlayer>;width:number;height:number}
export class TownClient {
  room?:Room<any,TownState>;
  players=new Map<string,NetworkPlayer>();
  connected=false;
  private disposed=false;
  constructor(private status:(text:string,retry:boolean)=>void){}
  async connect(){
    this.status('กำลังเชื่อมต่อเมือง…',false);
    try {
      const endpoint=(import.meta as any).env.VITE_GAME_SERVER_URL||`${location.protocol==='https:'?'wss':'ws'}://${location.hostname}:2567`;
      const room=await new Client(endpoint).joinOrCreate<TownState>('mythraven-town');
      if(this.disposed){void room.leave();return;}
      this.room=room;room.reconnection.enabled=false;this.connected=true;
      const sync=(state:TownState)=>{
        this.players.clear();state.players?.forEach((p,id)=>this.players.set(id,{name:p.name,x:p.x,y:p.y,moving:p.moving,facing:p.facing}));
        this.status(`ออนไลน์ · ${this.players.size} คน · ห้อง ${room.roomId}`,false);
      };
      room.onStateChange(sync);if(room.state?.players)sync(room.state);
      const lost=()=>{if(!this.disposed){this.connected=false;this.players.clear();this.status('ขาดการเชื่อมต่อ — กดเชื่อมต่อใหม่',true);}};
      room.onDrop(lost);room.onLeave(lost);room.onError(lost);
    }catch{if(!this.disposed)this.status('เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้ — ตรวจว่า npm run dev ทำงานอยู่',true);}
  }
  move(x:number,y:number){if(this.connected)this.room?.send('move',{x,y});}
  direction(x:number,y:number){if(this.connected)this.room?.send('direction',{x,y});}
  dispose(){this.disposed=true;this.connected=false;this.players.clear();void this.room?.leave();}
}
