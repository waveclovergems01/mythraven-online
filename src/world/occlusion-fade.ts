import Phaser from 'phaser';

type PlayerPoint={x:number;y:number};
type FadePart={alpha:number;setAlpha:(value:number)=>unknown};
type AlphaMask={width:number;height:number;data:Uint8ClampedArray};
const masks=new WeakMap<Phaser.Textures.Texture,AlphaMask>();

/** Cache source alpha once; transparent padding must not trigger a fade. */
function sourceMask(image:Phaser.GameObjects.Image):AlphaMask {
 const texture=image.texture,existing=masks.get(texture);if(existing)return existing;
 const source=texture.getSourceImage() as HTMLImageElement;
 const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(source,0,0);
 const mask={width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
 masks.set(texture,mask);return mask;
}

/** Static, unrotated world props. Actor body samples use the rendered feet
 * position, while each castle section retains its own ground sorting depth. */
export function attachOcclusionFade(scene:Phaser.Scene,occluders:Phaser.GameObjects.Image[],parts:FadePart[],getPlayer:()=>PlayerPoint|undefined):void {
 const samples=occluders.map(image=>({image,mask:sourceMask(image)}));
 const originalAlpha=parts.map(part=>part.alpha);let opacity=1;
 const obscures=({image,mask}:typeof samples[number],player:PlayerPoint)=>{
  if(!image.visible||image.depth<=player.y)return false;
  const frame=image.frame;
  const left=image.x-image.displayOriginX*image.scaleX,top=image.y-image.displayOriginY*image.scaleY;
  if(player.x+24<left||player.x-24>left+frame.cutWidth*image.scaleX||player.y-8<top||player.y-145>top+frame.cutHeight*image.scaleY)return false;
  // The novice is about 158 world pixels tall. Sample body area, not its label
  // or the prop's transparent bounding box, to avoid fading beside empty roofs.
  for(const dy of [-145,-110,-75,-40,-8])for(const dx of [-24,0,24]){
   const x=Math.floor((player.x+dx-image.x)/image.scaleX+image.displayOriginX);
   const y=Math.floor((player.y+dy-image.y)/image.scaleY+image.displayOriginY);
   if(x>=0&&y>=0&&x<frame.cutWidth&&y<frame.cutHeight){
    const sourceX=frame.cutX+x,sourceY=frame.cutY+y;
    if(sourceX<mask.width&&sourceY<mask.height&&mask.data[(sourceY*mask.width+sourceX)*4+3]>32)return true;
   }
  }
  return false;
 };
 const update=(_time:number,delta:number)=>{
  const player=getPlayer(),target=player&&samples.some(sample=>obscures(sample,player)) ? .48 : 1;
  if(opacity===target)return;
  opacity=Phaser.Math.Linear(opacity,target,1-Math.exp(-Math.min(delta,100)/90));
  if(Math.abs(opacity-target)<.001)opacity=target;
  parts.forEach((part,i)=>part.setAlpha(originalAlpha[i]*opacity));
 };
 // Scene.update has already placed the local actor before this visibility test.
 scene.events.on(Phaser.Scenes.Events.POST_UPDATE,update);
 scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off(Phaser.Scenes.Events.POST_UPDATE,update));
}
