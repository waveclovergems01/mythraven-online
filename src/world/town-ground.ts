import Phaser from 'phaser';
import {TERRAIN_MATERIALS} from './terrain-materials';
import {attachWater} from './water';
import {CASTLE} from './town-layout';
import {FORTIFICATION_ASSETS,drawFortificationsOnMinimap} from './fortifications';
import {MAP_WIDTH,MAP_HEIGHT,configureNavigation} from './daflak-grid';

const revision='?v=fortified-capital-20261031';
export const TOWN_ASSETS = {
 ...FORTIFICATION_ASSETS,
 'town-castle':'/assets/props/castle/mythraven-castle.png?v=wide-20261031',
 'town-castle-flag':'/assets/props/castle/mythraven-castle-flag.png?v=20261031',
 'town-granite':'/assets/tiles/mythraven-granite.png',
 'town-fountain':'/assets/props/fountain/mythraven-fountain.png',
 'town-water':'/assets/tiles/mythraven-water.png',
 'town-paving':'/assets/tiles/mythraven-paving.png'+revision,
 'town-dirt':'/assets/tiles/mythraven-dirt.png'+revision,
 'town-grass':'/assets/tiles/mythraven-grass.png'+revision,
 'town-coverage':'/assets/maps/mythraven-grass-mask.png'+revision,
 'town-navigation':'/assets/maps/mythraven-navigation.png'+revision,
 'town-land':'/assets/maps/mythraven-land.png'+revision,
 'town-banks':'/assets/maps/mythraven-banks.png'+revision,
 'town-roads':'/assets/maps/mythraven-roads.png'+revision,
 'town-courts':'/assets/maps/mythraven-courts.png'+revision,
} as const;

/** Fixed-scale materials with layout masks; bounded ground chunks around the
 * camera avoid allocating several full-world 44-megapixel canvases at login.
 * The minimap uses the identical compositor at a reduced scale.
 */
export function buildTownGround(scene:Phaser.Scene):string {
 const source=(key:string)=>scene.textures.get(key).getSourceImage() as HTMLImageElement;
 const nav=source('town-navigation'),navCanvas=document.createElement('canvas');
 navCanvas.width=nav.width;navCanvas.height=nav.height;
 const nc=navCanvas.getContext('2d',{willReadFrequently:true})!;
 nc.drawImage(nav,0,0);configureNavigation(nc.getImageData(0,0,nav.width,nav.height));
 const width=MAP_WIDTH/2,height=MAP_HEIGHT/2,chunkSize=512;
 const render=(x:number,y:number,w:number,h:number,scale=1)=>{
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d')!;
  const layer=document.createElement('canvas');layer.width=w;layer.height=h;
  const lc=layer.getContext('2d')!;
  const mask=(key:string)=>lc.drawImage(source(key),-x*scale,-y*scale,width*scale,height*scale);
  const material=(key:keyof typeof TERRAIN_MATERIALS,coverage?:string)=>{
   lc.globalCompositeOperation='source-over';lc.clearRect(0,0,w,h);
   const m=TERRAIN_MATERIALS[key],img=source(m.key),pattern=lc.createPattern(img,'repeat')!;
   pattern.setTransform(new DOMMatrix().translate(-x*scale,-y*scale).scale(m.repeatX/img.width*scale,m.repeatY/img.height*scale));
   lc.fillStyle=pattern;lc.fillRect(0,0,w,h);
   if(coverage){lc.globalCompositeOperation='destination-in';mask(coverage);}
   ctx.drawImage(layer,0,0);
  };
  material('dirt');material('grass','town-coverage');
  lc.globalCompositeOperation='source-over';lc.clearRect(0,0,w,h);
  lc.fillStyle='#796044';lc.fillRect(0,0,w,h);
  lc.globalCompositeOperation='destination-in';mask('town-banks');ctx.drawImage(layer,0,0);
  material('paving','town-roads');material('granite','town-courts');
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(source('town-land'),-x*scale,-y*scale,width*scale,height*scale);
  ctx.globalCompositeOperation='source-over';return canvas;
 };
 const miniScale=768/width,mini=render(0,0,768,Math.round(height*miniScale),miniScale);
 const mc=mini.getContext('2d')!,water=mc.createPattern(source('town-water'),'repeat')!;
 water.setTransform(new DOMMatrix().scale(.5*miniScale,.4375*miniScale));
 mc.globalCompositeOperation='destination-over';mc.fillStyle=water;mc.fillRect(0,0,mini.width,mini.height);
 // Include the same placed building in the minimap; the cloth alone animates in-world.
 const castleScale=CASTLE.width/CASTLE.sourceWidth/2*miniScale;
 mc.globalCompositeOperation='source-over';
 drawFortificationsOnMinimap(mc,source,miniScale/2);
 mc.drawImage(source('town-castle'),width*CASTLE.x*miniScale-CASTLE.anchorX*castleScale,
  height*CASTLE.y*miniScale-CASTLE.anchorY*castleScale,CASTLE.sourceWidth*castleScale,CASTLE.sourceHeight*castleScale);
 attachWater(scene);
 const chunks=new Map<string,Phaser.GameObjects.Image>();let region='';
 const sync=()=>{
  const view=scene.cameras.main.worldView;
  const left=Math.max(0,Math.floor(view.x/2/chunkSize)-1),top=Math.max(0,Math.floor(view.y/2/chunkSize)-1);
  const right=Math.min(Math.ceil(width/chunkSize)-1,Math.floor(view.right/2/chunkSize)+1);
  const bottom=Math.min(Math.ceil(height/chunkSize)-1,Math.floor(view.bottom/2/chunkSize)+1);
  const nextRegion=`${left},${top},${right},${bottom}`;if(nextRegion===region)return;region=nextRegion;
  const needed=new Set<string>();
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++)needed.add(`town-ground-${col}-${row}`);
  for(const [key,img] of chunks)if(!needed.has(key)){img.destroy();scene.textures.remove(key);chunks.delete(key);}
  for(let row=top;row<=bottom;row++)for(let col=left;col<=right;col++){
   const key=`town-ground-${col}-${row}`;if(chunks.has(key))continue;
   const x=col*chunkSize,y=row*chunkSize;
   // One-pixel overlap prevents hairline seams with subpixel camera scrolling.
   const canvas=render(x,y,Math.min(chunkSize+1,width-x),Math.min(chunkSize+1,height-y));
   scene.textures.addCanvas(key,canvas);
   chunks.set(key,scene.add.image(x*2,y*2,key).setOrigin(0).setScale(2).setDepth(0));
  }
  // PRE_RENDER follows Phaser's normal depth sort; sort new chunks immediately.
  scene.children.depthSort();
 };
 scene.events.on(Phaser.Scenes.Events.PRE_RENDER,sync);
 scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
  scene.events.off(Phaser.Scenes.Events.PRE_RENDER,sync);
  for(const [key,img] of chunks){img.destroy();scene.textures.remove(key);}chunks.clear();
 });
 return mini.toDataURL('image/png');
}
