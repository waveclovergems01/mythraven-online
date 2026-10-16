import Phaser from 'phaser';
import {t} from '../i18n';
import {attachFountain,FOUNTAIN_JET} from '../world/fountain';
import {buildTownGround,TOWN_ASSETS} from '../world/town-ground';
import {attachMinimap} from '../world/minimap';
import {createPlayerView,NOVICE_IDLE,NOVICE_WALK} from '../world/player-view';
import {TownClient} from '../network/town-client';
import {TILE_WIDTH,TILE_HEIGHT,MAP_WIDTH,MAP_HEIGHT,configureMap,SPAWN,cellAt,centerOf,walkable} from '../world/daflak-grid';
export class WorldScene extends Phaser.Scene {
 private player!:Phaser.GameObjects.Container;
 private hover!:Phaser.GameObjects.Rectangle;
 private marker!:Phaser.GameObjects.Rectangle;
 private cursors!:Phaser.Types.Input.Keyboard.CursorKeys;
 private keys!:Record<string,Phaser.Input.Keyboard.Key>;
 private network!:TownClient;
 private views=new Map<string,ReturnType<typeof createPlayerView>>();
 private lastDirection='0,0';private lastSent=0;private following=false;
 constructor(){super('world');}
 preload(){
  this.load.spritesheet(NOVICE_IDLE.key,NOVICE_IDLE.path,{frameWidth:NOVICE_IDLE.frameWidth,frameHeight:NOVICE_IDLE.frameHeight});
  this.load.spritesheet(NOVICE_WALK.key,NOVICE_WALK.path,{frameWidth:NOVICE_WALK.frameWidth,frameHeight:NOVICE_WALK.frameHeight});
  this.load.spritesheet(FOUNTAIN_JET.key,FOUNTAIN_JET.path,{frameWidth:256,frameHeight:256});
  for(const [key,path] of Object.entries(TOWN_ASSETS))this.load.image(key,path);
 }
 create(){
  configureMap();this.views.clear();this.following=false;this.lastDirection='0,0';this.lastSent=0;
  if(Object.keys(TOWN_ASSETS).some(key=>!this.textures.exists(key))){this.add.text(40,40,t('mapLoadError'));return;}
  const minimapUrl=buildTownGround(this);attachFountain(this);
  this.hover=this.add.rectangle(0,0,TILE_WIDTH,TILE_HEIGHT,0x9dedbe,.14).setOrigin(0).setStrokeStyle(2,0xc7ffe1).setDepth(10).setVisible(false);
  this.marker=this.add.rectangle(0,0,TILE_WIDTH,TILE_HEIGHT).setOrigin(0).setStrokeStyle(3,0xf3d48e).setDepth(11).setVisible(false);
  const spawn=centerOf(SPAWN);this.player=this.add.container(spawn.x,spawn.y);
  this.cameras.main.setBounds(0,0,MAP_WIDTH,MAP_HEIGHT).setZoom(.5).startFollow(this.player,true,.12,.12).centerOn(spawn.x,spawn.y);
  attachMinimap(this,()=>Array.from(this.views,([id,view])=>({id,x:view.container.x,y:view.container.y,mine:id===this.network?.room?.sessionId})),minimapUrl);
  this.cursors=this.input.keyboard!.createCursorKeys();this.keys=this.input.keyboard!.addKeys('W,A,S,D') as Record<string,Phaser.Input.Keyboard.Key>;
  const panel=document.createElement('div');panel.id='network-status';
  panel.style.cssText='position:absolute;left:16px;top:112px;background:#182b27e8;color:#efe7cf;padding:9px 12px;border-radius:5px;font:12px Tahoma;z-index:20';
  const label=document.createElement('span'),retry=document.createElement('button');retry.textContent='เชื่อมต่อใหม่';retry.style.marginLeft='10px';retry.hidden=true;
  retry.onclick=()=>location.reload();panel.append(label,retry);document.querySelector('.game-page')!.append(panel);
  this.network=new TownClient((message,canRetry)=>{label.textContent=message;retry.hidden=!canRetry;panel.dataset.connected=String(!canRetry&&message.startsWith('ออนไลน์'));});
  void this.network.connect();
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
   if((!pointer.leftButtonDown()&&!pointer.wasTouch)||!this.network.connected)return;
   const p=this.cameras.main.getWorldPoint(pointer.x,pointer.y),end=cellAt(p.x,p.y);
   if(walkable(end)){this.network.move(end.x,end.y);this.marker.setPosition(end.x*TILE_WIDTH,end.y*TILE_HEIGHT).setVisible(true);}
  });
  const blur=()=>{this.network.direction(0,0);this.lastDirection='0,0';};
  window.addEventListener('blur',blur);
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;window.removeEventListener('blur',blur);window.removeEventListener('mythraven:leave',cleanup);window.removeEventListener('pagehide',cleanup);this.network.dispose();panel.remove();this.views.clear();};
  window.addEventListener('mythraven:leave',cleanup);window.addEventListener('pagehide',cleanup);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,cleanup);this.events.once(Phaser.Scenes.Events.DESTROY,cleanup);
 }
 update(time:number,delta:number){
  if(!this.network)return;
  const pointer=this.input.activePointer,p=this.cameras.main.getWorldPoint(pointer.x,pointer.y),cell=cellAt(p.x,p.y),allowed=walkable(cell);
  this.hover.setPosition(cell.x*TILE_WIDTH,cell.y*TILE_HEIGHT).setVisible(this.input.isOver&&this.network.connected).setFillStyle(allowed?0x9dedbe:0xef7878,.14);
  const dx=Number(this.cursors.right.isDown||this.keys.D.isDown)-Number(this.cursors.left.isDown||this.keys.A.isDown);
  const dy=Number(this.cursors.down.isDown||this.keys.S.isDown)-Number(this.cursors.up.isDown||this.keys.W.isDown),key=`${dx},${dy}`;
  if(key!==this.lastDirection||((dx||dy)&&time-this.lastSent>150)){
   this.network.direction(dx,dy);this.lastDirection=key;this.lastSent=time;if(dx||dy)this.marker.setVisible(false);
  }
  for(const [id,state] of this.network.players){
   const mine=id===this.network.room?.sessionId;let view=this.views.get(id);
   if(!view){view=createPlayerView(this,state.name+(mine?' · คุณ':''),mine);view.container.setPosition(state.x,state.y);this.views.set(id,view);}
   // Smooth received authoritative positions; no browser-owned movement simulation.
   const alpha=1-Math.exp(-Math.min(delta,100)/45);
   view.container.x+= (state.x-view.container.x)*alpha;view.container.y+=(state.y-view.container.y)*alpha;
   view.container.setDepth(view.container.y);view.updatePose(state.x,state.y,state.moving);
   if(mine){
    this.player.setPosition(view.container.x,view.container.y);
    if(!this.following){this.cameras.main.centerOn(state.x,state.y);this.following=true;}
    if(!state.moving&&Math.hypot(state.x-(this.marker.x+TILE_WIDTH/2),state.y-(this.marker.y+TILE_HEIGHT/2))<4)this.marker.setVisible(false);
   }
  }
  for(const [id,view] of this.views)if(!this.network.players.has(id)){view.container.destroy();this.views.delete(id);}
 }
}

