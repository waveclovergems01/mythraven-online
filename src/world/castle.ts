import Phaser from 'phaser';
import {CASTLE} from './town-layout';
import {MAP_WIDTH,MAP_HEIGHT} from './daflak-grid';

/** Stationary masonry with independent, slowly waving raster cloth. */
export function attachCastle(scene:Phaser.Scene):void {
 const scale=CASTLE.width/CASTLE.sourceWidth,x=MAP_WIDTH*CASTLE.x,y=MAP_HEIGHT*CASTLE.y;
 const texture=scene.textures.get('town-castle');
 CASTLE.sections.forEach(([left,right,foot],i)=>{
  const frame=`castle-section-${i}`;
  if(!texture.has(frame))texture.add(frame,0,left,0,right-left,CASTLE.sourceHeight);
  scene.add.image(x+(left-CASTLE.anchorX)*scale,y-CASTLE.anchorY*scale,'town-castle',frame)
   .setOrigin(0).setScale(scale).setDepth(y+(foot-CASTLE.anchorY)*scale).setName(`castle-section-${i}`);
 });
 const flag=scene.textures.get('town-castle-flag'),image=flag.getSourceImage() as HTMLImageElement;
 const columns=40,stripWidth=image.width/columns,clothScale=.75;
 const roots=CASTLE.flagRoots.map(([sx,sy])=>({x:x+(sx-CASTLE.anchorX)*scale,y:y+(sy-CASTLE.anchorY)*scale}));
 const strips=roots.map((root,flagIndex)=>Array.from({length:columns},(_,i)=>{
  const frame=`cloth-strip-${i}`,left=Math.round(i*stripWidth),right=Math.min(image.width,Math.round((i+1)*stripWidth)+1);
  // One source-pixel overlap prevents cracks during subpixel deformation.
  if(!flag.has(frame))flag.add(frame,0,left,0,right-left,image.height);
  return scene.add.image(root.x+i*stripWidth*clothScale,root.y,'town-castle-flag',frame)
   .setOrigin(0).setScale(clothScale).setDepth(y+3).setName(`castle-flag-${flagIndex}-${i}`);
 }));
 let elapsed=0;
 const tick=(_time:number,delta:number)=>{
  elapsed+=Math.min(delta,100)/1000;
  strips.forEach((pieces,flagIndex)=>pieces.forEach((piece,i)=>{
   const u=i/(columns-1),phase=elapsed*Math.PI*2/5.5-flagIndex*.55;
   // Hoist is exactly fixed; free edge has a gentle travelling cloth wave.
   const wave=u*(Math.sin(u*Math.PI*2-phase)*10+Math.sin(u*Math.PI*4-phase*.8)*2);
   piece.y=roots[flagIndex].y+wave;
   piece.scaleY=clothScale*(1+Math.sin(u*Math.PI*2-phase)*.025*u);
  }));
 };
 scene.events.on(Phaser.Scenes.Events.UPDATE,tick);
 scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off(Phaser.Scenes.Events.UPDATE,tick));
}
