import Phaser from 'phaser';
import {getTownProperties} from '../../shared/town-properties.mjs';
import {MAP_WIDTH, MAP_HEIGHT} from './daflak-grid';
import {attachOcclusionFade} from './occlusion-fade';
import {frontEdgeY} from '../../shared/ground-polygon.mjs';

const properties = getTownProperties(MAP_WIDTH, MAP_HEIGHT);
const designs = {
  cottage: 'cottage-v004', 'cottage-dormer': 'cottage-v003',
  townhouse: 'townhouse-v004', 'townhouse-bay': 'townhouse-v003',
  guildhall: 'guildhall-v004', stall: 'stall-v002', handcart: 'handcart-v002',
};
export const PROPERTY_ASSETS = Object.fromEntries(Object.entries(designs).map(([type, design]) => [
  'trade-' + type, `/assets/props/town/mythraven-${design}.png`,
]));

// A character beside the receding wall can be south of the wall at their X
// while still north of the building's closest corner. Lift only such actors.
function depthAtFront(property: typeof properties[number], x:number, y:number) {
  if (y >= property.y || y < property.footprint.top || Math.abs(x-property.x) > property.width/2+24) return y;
  const column = Phaser.Math.Clamp(x,property.footprint.left,property.footprint.right);
  return y >= frontEdgeY(property.points,column) ? property.y+0.01+(y-property.footprint.top)*0.00001 : y;
}

export function townActorDepth(x:number, y:number) {
  let depth = y;
  for (const property of properties) depth=Math.max(depth,depthAtFront(property,x,y));
  return depth;
}

export function attachTownProperties(scene: Phaser.Scene, getPlayer: () => {x:number; y:number} | undefined) {
  for (const property of properties) {
    const image = scene.add.image(property.x,property.y,'trade-'+property.type);
    image.setOrigin(.5,property.originY).setScale(property.width/image.width);
    image.setDepth(property.y).setName('property-'+property.id);
    attachOcclusionFade(scene,[image],[image],()=>{
      const player=getPlayer();
      return player && depthAtFront(property,player.x,player.y)<property.y ? player : undefined;
    });
  }
}

export function propertyMinimapLayers(ctx: CanvasRenderingContext2D, source: (key:string) => HTMLImageElement, scale: number) {
  return properties.map(property => ({
    depth: property.y,
    draw() {
      const sprite = source('trade-' + property.type);
      const width = property.width * scale;
      const height = width * sprite.height / sprite.width;
      ctx.drawImage(sprite, property.x * scale - width / 2, property.y * scale - height * property.originY, width, height);
    },
  }));
}
