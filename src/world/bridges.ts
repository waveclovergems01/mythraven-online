import Phaser from 'phaser';
import {createBridgeSurface} from '../../shared/bridge-surface.mjs';
import {MAP_WIDTH,MAP_HEIGHT} from './daflak-grid';
export const BRIDGE_SURFACE=createBridgeSurface(MAP_WIDTH,MAP_HEIGHT);
export const BRIDGE_ASSETS={
 'bridge-ew':'/assets/props/bridges/mythraven-bridge-ew.png?v=arched-20261101',
 'bridge-ew-front':'/assets/props/bridges/mythraven-bridge-ew-front.png?v=arched-20261101',
 'bridge-ns':'/assets/props/bridges/mythraven-bridge-ns.png?v=arched-20261101',
 'bridge-ns-front':'/assets/props/bridges/mythraven-bridge-ns-front.png?v=arched-20261101',
} as const;
export function attachBridges(scene:Phaser.Scene){
 for(const b of BRIDGE_SURFACE.bridges){
  scene.add.image(b.x,b.y,b.texture).setOrigin(0).setScale(b.scaleX,b.scaleY)
   .setDepth(2).setName(`bridge-deck-${b.id}`);
  // Painted foreground parapets cover feet at the edge, while the open deck
  // stays behind all actors. Piers and arch holes remain genuinely transparent.
  scene.add.image(b.x,b.y,b.texture+'-front').setOrigin(0).setScale(b.scaleX,b.scaleY)
   .setDepth(b.axis==='x'?(b.top+b.bottom)/2+325*b.scaleY:b.bottom+50).setName(`bridge-front-${b.id}`);
 }
}
export function drawBridgesOnMinimap(ctx:CanvasRenderingContext2D,source:(key:string)=>HTMLImageElement,scale:number){
 for(const b of BRIDGE_SURFACE.bridges)ctx.drawImage(source(b.texture),b.x*scale,b.y*scale,b.sourceWidth*b.scaleX*scale,b.sourceHeight*b.scaleY*scale);
}
