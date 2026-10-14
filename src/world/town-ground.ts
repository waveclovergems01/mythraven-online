import { TERRAIN_MATERIALS, blendTerrainBoundary } from './terrain-materials';
import Phaser from 'phaser';
import { attachWater } from './water';
import { createTownPaving } from './town-paving';
import { MAP_WIDTH, MAP_HEIGHT, configureNavigation } from './daflak-grid';

export const TOWN_ASSETS = {
  'town-granite': '/assets/tiles/mythraven-granite.png',
  'town-fountain': '/assets/props/fountain/mythraven-fountain.png',
  'town-water': '/assets/tiles/mythraven-water.png',
  'town-paving': '/assets/tiles/mythraven-paving.png',
  'town-base': '/assets/maps/mythraven-dirt.png',
  'town-grass': '/assets/tiles/mythraven-grass.png',
  'town-coverage': '/assets/maps/mythraven-grass-mask.png',
  'town-navigation': '/assets/maps/mythraven-navigation.png',
} as const;

/** Fixed-scale grass through a shared coverage mask; scene and minimap share cached pixels. */
export function buildTownGround(scene: Phaser.Scene): string {
  const source=(key:string)=>scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const base=source('town-base'),grass=source('town-grass'),mask=source('town-coverage');
  const nav=source('town-navigation'),navCanvas=document.createElement('canvas');
  navCanvas.width=nav.width;navCanvas.height=nav.height;
  const nc=navCanvas.getContext('2d',{willReadFrequently:true})!;nc.drawImage(nav,0,0);
  const navigationPixels=nc.getImageData(0,0,nav.width,nav.height);
  configureNavigation(navigationPixels);
  for(let i=0;i<navigationPixels.data.length;i+=4)navigationPixels.data[i+3]=navigationPixels.data[i];
  nc.putImageData(navigationPixels,0,0);
  const width=MAP_WIDTH/2,height=MAP_HEIGHT/2,keys:string[]=[];
  const mini=document.createElement('canvas'),miniScale=512/Math.max(width,height);
  mini.width=Math.round(width*miniScale);mini.height=Math.round(height*miniScale);
  const mc=mini.getContext('2d')!;
  const miniWater=mc.createPattern(source('town-water'),'repeat')!;
  miniWater.setTransform(new DOMMatrix().scale(.5*miniScale,.4375*miniScale));
  mc.fillStyle=miniWater;mc.fillRect(0,0,mini.width,mini.height);
  attachWater(scene);
  const paving=createTownPaving(width,height,mask);
  const pavingMask=blendTerrainBoundary(paving.canvas);
  for(let y=0;y<height;y+=512)for(let x=0;x<width;x+=512){
    const canvas=document.createElement('canvas');
    canvas.width=Math.min(513,width-x);canvas.height=Math.min(513,height-y);
    const ctx=canvas.getContext('2d')!;
    ctx.drawImage(base,-x,-y,width,height);
    const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;
    const lc=layer.getContext('2d')!,pattern=lc.createPattern(grass,'repeat')!;
    // 256 CSS-pixel texture repeat, stable across chunks and map sizes.
    pattern.setTransform(new DOMMatrix().translate(-x,-y).scale(TERRAIN_MATERIALS.grass.repeatX/512,TERRAIN_MATERIALS.grass.repeatY/512));
    lc.fillStyle=pattern;lc.fillRect(0,0,layer.width,layer.height);
    lc.globalCompositeOperation='destination-in';lc.drawImage(mask,-x,-y,width,height);
    ctx.drawImage(layer,0,0);
    lc.globalCompositeOperation='source-over';lc.clearRect(0,0,layer.width,layer.height);
    const stonePattern=lc.createPattern(source('town-paving'),'repeat')!;
    stonePattern.setTransform(new DOMMatrix().translate(-x,-y).scale(TERRAIN_MATERIALS.paving.repeatX/512,TERRAIN_MATERIALS.paving.repeatY/512));
    lc.fillStyle=stonePattern;lc.fillRect(0,0,layer.width,layer.height);
    lc.save();lc.translate(-x,-y);lc.clip(paving.courts);
    const granite=lc.createPattern(source('town-granite'),'repeat')!;
    granite.setTransform(new DOMMatrix().scale(.75,.65625));
    lc.fillStyle=granite;lc.fillRect(x,y,layer.width,layer.height);lc.restore();
    lc.globalCompositeOperation='destination-in';lc.drawImage(pavingMask,-x,-y);
    // Apply a hard land mask so road ends never project over the removed crossings.
    lc.globalCompositeOperation='destination-in';
    lc.drawImage(navCanvas,-x,-y,width,height);
    ctx.drawImage(layer,0,0);
    // Cut only the water pixels out; banks, paths and collision remain stationary.
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(navCanvas,-x,-y,width,height);
    ctx.globalCompositeOperation='source-over';
    const key=`town-ground-${x}-${y}`;keys.push(key);
    scene.textures.addCanvas(key,canvas);
    scene.add.image(x*2,y*2,key).setOrigin(0).setScale(2).setDepth(0);
    // Non-overlapping source bounds prevent double compositing at chunk edges.
    const w=Math.min(512,width-x),h=Math.min(512,height-y);
    mc.drawImage(canvas,0,0,w,h,x*miniScale,y*miniScale,w*miniScale,h*miniScale);
  }
  const url=mini.toDataURL('image/png');
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>keys.forEach(key=>scene.textures.remove(key)));
  return url;
}



