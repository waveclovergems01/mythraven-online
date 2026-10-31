import Phaser from 'phaser';
import {getFortifications} from '../../shared/fortifications.mjs';
import {MAP_WIDTH,MAP_HEIGHT} from './daflak-grid';

export const CITY_DEFENSES=getFortifications(MAP_WIDTH,MAP_HEIGHT);
export const FORTIFICATION_ASSETS={
 'city-wall-horizontal':'/assets/props/fortifications/mythraven-wall-horizontal.png?v=20261031',
 'city-wall-vertical':'/assets/props/fortifications/mythraven-wall-vertical.png?v=20261031',
 'city-watchtower':'/assets/props/fortifications/mythraven-watchtower.png?v=20261031',
} as const;
type Piece={key:string;x:number;y:number;width:number;height:number;depth:number;name:string;cap?:boolean};
// Every raised section has a ground-foot depth. Vertical runs are sliced so
// walking alongside a long wall does not sort against the entire wall at once.
function pieces():Piece[]{
 const result:Piece[]=[];let index=0;
 const horizontal=(x1:number,x2:number,y:number,height:number,prefix:string)=>{
  const length=x2-x1,count=Math.ceil(length/512),width=length/count;
  for(let i=0;i<count;i++)result.push({key:'city-wall-horizontal',x:x1+i*width,y:y-height,width:width+1,height,depth:y+12,name:`${prefix}-${index++}`});
 };
 const vertical=(x:number,y1:number,y2:number,width:number,lift:number,prefix:string)=>{
  const length=y2-y1,count=Math.ceil(length/100),height=length/count;
  for(let i=0;i<count;i++)result.push({key:'city-wall-vertical',x:x-width/2,y:y1+i*height-lift,width,height:height+1,depth:y1+(i+1)*height,name:`${prefix}-${index++}`});
 };
 for(const w of CITY_DEFENSES.walls){
  if(w.axis==='x')horizontal(Math.min(w.x1,w.x2),Math.max(w.x1,w.x2),w.y1+35,390,'city-wall');
  else{
   const end=Math.max(w.y1,w.y2);
   vertical(w.x1,Math.min(w.y1,w.y2),end,150,320,'city-wall');
   // Close the elevated south end with an upright stone face. Without this
   // cap the shifted wall-walk would leave a visible gap at an untowered turn.
   result.push({key:'city-wall-horizontal',x:w.x1-75,y:end+35-390,width:150,height:390,depth:end+47,name:`city-wall-cap-${index++}`,cap:true});
  }
 }
 for(const r of CITY_DEFENSES.rails){
  if(r.axis==='x')horizontal(r.left,r.right,(r.top+r.bottom)/2+12,85,'bridge-rail');
  else vertical((r.left+r.right)/2,r.top,r.bottom,38,45,'bridge-rail');
 }
 for(const t of CITY_DEFENSES.towers){
  const width=t.gate?470:410,height=width*814/424;
  result.push({key:'city-watchtower',x:t.x-width/2,y:t.y+90-height,width,height,depth:t.y+90,name:`city-${t.gate?'gate':'tower'}-${index++}`});
 }
 return result;
}
const CITY_PIECES=pieces();
export function attachFortifications(scene:Phaser.Scene,getPlayer:()=>{x:number;y:number}|undefined){
 const wallTexture=scene.textures.get('city-wall-horizontal');
 if(!wallTexture.has('end-cap'))wallTexture.add('end-cap',0,128,0,128,388);
 // Decks are deliberately below actors; rails and towers occlude by ground Y.
 for(const b of CITY_DEFENSES.bridges){
  scene.add.tileSprite(b.left,b.top,b.right-b.left,b.bottom-b.top,'town-granite')
   .setOrigin(0).setTileScale(.5,.4375).setDepth(2).setName(`bridge-deck-${b.id}`);
 }
 const raised=CITY_PIECES.map(p=>({p,image:scene.add.image(p.x,p.y,p.key,p.cap?'end-cap':'__BASE').setOrigin(0)
  .setDisplaySize(p.width,p.height).setDepth(p.depth).setName(p.name)}));
 // Tall foreground masonry becomes translucent only while it hides the local
 // actor, especially the south tower of an east/west gateway.
 const update=()=>{
  const player=getPlayer();if(!player)return;
  for(const {p,image} of raised){
   const obscures=p.name.startsWith('city-')&&player.y<p.depth&&player.x>p.x-24&&player.x<p.x+p.width+24&&player.y>p.y+40&&player.y<p.y+p.height+100;
   const target=obscures?.48:1;image.setAlpha(Phaser.Math.Linear(image.alpha,target,.2));
  }
 };
 scene.events.on(Phaser.Scenes.Events.UPDATE,update);
 scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off(Phaser.Scenes.Events.UPDATE,update));
}
/** Same placements and painter order as the world, scaled only at draw time. */
export function drawFortificationsOnMinimap(ctx:CanvasRenderingContext2D,source:(key:string)=>HTMLImageElement,scale:number){
 const stone=source('town-granite'),pattern=ctx.createPattern(stone,'repeat')!;
 pattern.setTransform(new DOMMatrix().scale(.5*scale,.4375*scale));ctx.fillStyle=pattern;
 for(const b of CITY_DEFENSES.bridges)ctx.fillRect(b.left*scale,b.top*scale,(b.right-b.left)*scale,(b.bottom-b.top)*scale);
 for(const p of [...CITY_PIECES].sort((a,b)=>a.depth-b.depth)){
  if(p.cap)ctx.drawImage(source(p.key),128,0,128,388,p.x*scale,p.y*scale,p.width*scale,p.height*scale);
  else ctx.drawImage(source(p.key),p.x*scale,p.y*scale,p.width*scale,p.height*scale);
 }
}
