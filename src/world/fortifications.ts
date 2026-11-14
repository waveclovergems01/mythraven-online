import Phaser from 'phaser';
import {getFortifications} from '../../shared/fortifications.mjs';
import {MAP_WIDTH,MAP_HEIGHT} from './daflak-grid';
import {BRIDGE_ASSETS,attachBridges,drawBridgesOnMinimap} from './bridges';

export const CITY_DEFENSES=getFortifications(MAP_WIDTH,MAP_HEIGHT);
export const FORTIFICATION_ASSETS={
 ...BRIDGE_ASSETS,
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
 for(const t of CITY_DEFENSES.towers){
  const width=t.gate?470:410,height=width*814/424;
  result.push({key:'city-watchtower',x:t.x-width/2,y:t.y+90-height,width,height,depth:t.y+90,name:`city-${t.gate?'gate':'tower'}-${index++}`});
 }
 return result;
}
const CITY_PIECES=pieces();
/** Crowns that intersect the raised wall-walk must stay whole. Sorting only by
 * roots lets successive vertical wall slices cut horizontal holes in a tree. */
export function treeWallDepth(left:number,top:number,right:number,bottom:number,rootY:number):number {
 let depth=rootY;
 for(const p of CITY_PIECES){
  if(p.key==='city-watchtower')continue;
  if(left<p.x+p.width&&right>p.x&&top<p.y+p.height&&bottom>p.y)depth=Math.max(depth,p.depth+.25);
 }
 return depth;
}
export function attachFortifications(scene:Phaser.Scene,getPlayer:()=>{x:number;y:number}|undefined){
 const wallTexture=scene.textures.get('city-wall-horizontal');
 if(!wallTexture.has('end-cap'))wallTexture.add('end-cap',0,128,0,128,388);
 attachBridges(scene);
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
export function drawFortificationsOnMinimap(ctx:CanvasRenderingContext2D,source:(key:string)=>HTMLImageElement,scale:number,landmarks:{depth:number;draw:()=>void}[]=[]){
 drawBridgesOnMinimap(ctx,source,scale);
 const layers=CITY_PIECES.map(p=>({depth:p.depth,draw:()=>{
  if(p.cap)ctx.drawImage(source(p.key),128,0,128,388,p.x*scale,p.y*scale,p.width*scale,p.height*scale);
  else ctx.drawImage(source(p.key),p.x*scale,p.y*scale,p.width*scale,p.height*scale);
 }}));
 for(const layer of [...layers,...landmarks].sort((a,b)=>a.depth-b.depth))layer.draw();
}
