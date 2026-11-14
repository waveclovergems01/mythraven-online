import Phaser from 'phaser';
import {getFlowerbeds,flowerbedFrontY,type Flowerbed} from '../../shared/flowerbeds.mjs';
import {MAP_WIDTH,MAP_HEIGHT} from './daflak-grid';
import {attachOcclusionFade} from './occlusion-fade';

export const FLOWERBED_ASSETS={
 'garden-flowers':'/assets/props/flowerbeds/mythraven-flowers-v001.png',
 'garden-stone':'/assets/props/flowerbeds/mythraven-stone-v001.png',
};
export const FLOWERBEDS=getFlowerbeds(MAP_WIDTH,MAP_HEIGHT);
type Artwork={bed:Flowerbed;canvas:HTMLCanvasElement;x:number;y:number;key:string;columns:{frame:string;left:number;width:number;depth:number}[]};
const cache=new WeakMap<Phaser.Scene,Artwork[]>();

function prepare(scene:Phaser.Scene):Artwork[]{
 const existing=cache.get(scene);if(existing)return existing;
 const artwork=FLOWERBEDS.map(bed=>{
  const minX=Math.min(...bed.points.map(p=>p[0])),maxX=Math.max(...bed.points.map(p=>p[0]));
  const minY=Math.min(...bed.points.map(p=>p[1])),maxY=Math.max(...bed.points.map(p=>p[1]));
  const pad=bed.rim/2+18,x=Math.floor(minX-pad),y=Math.floor(minY-pad-bed.elevation);
  const canvas=document.createElement('canvas');canvas.width=Math.ceil((maxX-x+pad)/2);canvas.height=Math.ceil((maxY-y+pad)/2);
  const ctx=canvas.getContext('2d')!;
  const material=(key:string,repeatX:number,repeatY:number)=>{
   const image=scene.textures.get(key).getSourceImage() as HTMLImageElement,p=ctx.createPattern(image,'repeat')!;
   p.setTransform(new DOMMatrix().translate(-x/2,-y/2).scale(repeatX/image.width/2,repeatY/image.height/2));return p;
  };
  const stone=material('garden-stone',256,224),flowers=material('garden-flowers',672,576);
  const outline=(lift:number,dx=0)=>{
   ctx.beginPath();bed.points.forEach(([px,py],i)=>{const cx=(px-x+dx)/2,cy=(py-y-lift)/2;if(i)ctx.lineTo(cx,cy);else ctx.moveTo(cx,cy);});ctx.closePath();
  };
  ctx.lineJoin='round';outline(-9,9);ctx.fillStyle='#29362035';ctx.strokeStyle='#29362035';ctx.lineWidth=bed.rim/2+7;ctx.fill();ctx.stroke();
  // A short stone face below the coping makes this a raised planted bed.
  ctx.fillStyle=stone;ctx.strokeStyle=stone;ctx.lineWidth=bed.rim/2;
  for(let lift=0;lift<bed.elevation;lift+=4){outline(lift);ctx.fill();ctx.stroke();}
  outline(bed.elevation-9);ctx.strokeStyle='#9b7954';ctx.lineWidth=bed.rim/2+2;ctx.stroke();
  outline(0);ctx.lineWidth=bed.rim/2;
  ctx.fillStyle='#79513255';ctx.strokeStyle='#79513255';ctx.fill();ctx.stroke();
  outline(bed.elevation);ctx.fillStyle=flowers;ctx.fill();
  ctx.strokeStyle='#8c795b';ctx.lineWidth=bed.rim/2+2;ctx.stroke();
  ctx.strokeStyle=stone;ctx.lineWidth=bed.rim/2;ctx.stroke();
  ctx.strokeStyle='#eed4a0';ctx.lineWidth=2;ctx.stroke();
  const key='flowerbed-'+bed.id,texture=scene.textures.addCanvas(key,canvas)!;
  const columns:Artwork['columns']=[];
  // Each column uses its actual front footprint. Shadows and the stone face
  // must not add a second elevation offset and sort over an actor in front.
  for(let left=0;left<canvas.width;left+=8){
   const width=Math.min(8,canvas.width-left),frame='column-'+left;
   const l=Phaser.Math.Clamp(x+left*2-bed.rim/2,minX,maxX);
   const r=Phaser.Math.Clamp(x+(left+width)*2+bed.rim/2,minX,maxX);
   texture.add(frame,0,left,0,width,canvas.height);
   columns.push({frame,left,width,depth:flowerbedFrontY(bed,l,r)+bed.rim/2});
  }
  return {bed,canvas,x,y,key,columns};
 });
 cache.set(scene,artwork);
 scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{for(const art of artwork)scene.textures.remove(art.key);cache.delete(scene);});
 return artwork;
}

export function attachFlowerbeds(scene:Phaser.Scene,getPlayer:()=>{x:number;y:number}|undefined):void {
 for(const art of prepare(scene)){
  const parts=art.columns.map(column=>scene.add.image(art.x+column.left*2,art.y,art.key,column.frame)
   .setOrigin(0).setScale(2).setDepth(column.depth).setName(art.key+'-'+column.frame));
  attachOcclusionFade(scene,parts,parts,()=>{
   const player=getPlayer();
   // At a sloping/concave edge a shoulder can overlap a neighbouring column
   // even though the feet are already in front. Do not fade the whole planter.
   return player&&player.y<flowerbedFrontY(art.bed,player.x)+art.bed.rim/2?player:undefined;
  });
 }
}

export function flowerbedMinimapLayers(scene:Phaser.Scene,ctx:CanvasRenderingContext2D,scale:number){
 return prepare(scene).flatMap(art=>art.columns.map(column=>({depth:column.depth,draw:()=>{
  ctx.drawImage(art.canvas,column.left,0,column.width,art.canvas.height,(art.x+column.left*2)*scale,art.y*scale,column.width*2*scale,art.canvas.height*2*scale);
 }})));
}
