import Phaser from 'phaser';
import {TREE_SPECS,getExteriorTrees} from '../../shared/exterior-trees.mjs';
import {MAP_WIDTH,MAP_HEIGHT} from './daflak-grid';
import {attachOcclusionFade} from './occlusion-fade';
import {treeWallDepth} from './fortifications';

export const TREE_ASSETS=Object.fromEntries(Object.values(TREE_SPECS).map(s=>[s.key,s.path]));
export const EXTERIOR_TREES=getExteriorTrees(MAP_WIDTH,MAP_HEIGHT).map(tree=>({
 ...tree,depth:treeWallDepth(tree.x-tree.spec.anchorX*tree.scale,tree.y-tree.spec.anchorY*tree.scale,
 tree.x+(tree.spec.width-tree.spec.anchorX)*tree.scale,tree.y+(tree.spec.height-tree.spec.anchorY)*tree.scale,tree.y),
}));

export function attachTrees(scene:Phaser.Scene,getPlayer:()=>{x:number;y:number}|undefined):void {
 for(const tree of EXTERIOR_TREES){
  const {spec}=tree;
  const image=scene.add.image(tree.x,tree.y,spec.key).setName(tree.id)
   .setOrigin(spec.anchorX/spec.width,spec.anchorY/spec.height).setScale(tree.scale).setDepth(tree.depth);
  attachOcclusionFade(scene,[image],[image],getPlayer);
 }
}

export function treeMinimapLayers(ctx:CanvasRenderingContext2D,source:(key:string)=>HTMLImageElement,worldScale:number){
 return EXTERIOR_TREES.map(tree=>({depth:tree.depth,draw:()=>{
  const {spec}=tree,scale=tree.scale*worldScale;
  ctx.drawImage(source(spec.key),tree.x*worldScale-spec.anchorX*scale,tree.y*worldScale-spec.anchorY*scale,spec.width*scale,spec.height*scale);
 }}));
}
