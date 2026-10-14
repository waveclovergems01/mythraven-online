import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from './daflak-grid';
import { FOUNTAIN } from './town-layout';

export const FOUNTAIN_JET = {
  key:'fountain-tiered-water',path:'/assets/fx/fountain-tiered-water.png',
  frameWidth:256,frameHeight:256,frameRate:7,
  originX:48/256,originY:112/256,
} as const;
// Nozzle and impact points in the normalized 768 x 796 prop.
export const FOUNTAIN_STREAMS = [{"root": [209, 339], "land": [106, 507]}, {"root": [232, 385], "land": [169, 556]}, {"root": [500, 385], "land": [560, 556]}, {"root": [524, 339], "land": [630, 507]}] as const;
const FALLS = [{"root": [281, 269], "land": [271, 360]}, {"root": [452, 269], "land": [462, 360]}, {"root": [288, 423], "land": [284, 500]}, {"root": [441, 423], "land": [446, 500]}] as const;

export function attachFountain(scene:Phaser.Scene):void {
  const x=MAP_WIDTH*FOUNTAIN.x,y=MAP_HEIGHT*FOUNTAIN.y;
  scene.add.ellipse(x+12,y+14,800,440,0x203322,.18).setDepth(y-FOUNTAIN.radiusY-1).setName('fountain-shadow');
  const basin=scene.add.image(x,y,'town-fountain').setName('town-fountain')
    .setOrigin(FOUNTAIN.anchorX/FOUNTAIN.sourceWidth,FOUNTAIN.originY).setScale(FOUNTAIN.width/FOUNTAIN.sourceWidth).setDepth(y);
  const scale=basin.scaleX;
  const world=(p:readonly number[])=>({x:x+(p[0]-FOUNTAIN.anchorX)*scale,y:y+(p[1]-FOUNTAIN.anchorY)*scale});
  const config=FOUNTAIN_JET;
  for(const [key,start,end] of [[config.key,0,3],['fountain-fall',4,7]] as const){
    if(!scene.anims.exists(key))scene.anims.create({key,frames:scene.anims.generateFrameNumbers(config.key,{start,end}),frameRate:config.frameRate,repeat:-1});
  }
  FOUNTAIN_STREAMS.forEach(({root,land},i)=>{
    const p=world(root),dx=land[0]-root[0],dy=land[1]-root[1],left=dx<0;
    // Mirror only the water; roots stay fixed on the original asymmetric nozzle art.
    const sprite=scene.add.sprite(p.x,p.y,config.key)
      .setOrigin(left?1-config.originX:config.originX,config.originY)
      .setFlipX(left).setScale(Math.abs(dx)/152*scale,dy/96*scale)
      .setDepth(basin.depth+2).setName(i===0?'fountain-water':`fountain-water-${i}`);
    sprite.play({key:config.key,startFrame:i%4});
  });
  FALLS.forEach(({root,land},i)=>{
    const p=world(root);
    scene.add.sprite(p.x,p.y,config.key).setOrigin(.5,32/256)
      .setScale(.38*scale,(land[1]-root[1])/158*scale)
      .setRotation(-Math.atan2(land[0]-root[0],land[1]-root[1]))
      .setDepth(basin.depth+1).setName(`fountain-fall-${i}`).play({key:'fountain-fall',startFrame:i});
  });
  const fx=scene.add.graphics().setDepth(basin.depth+3).setName('fountain-ripples');
  const tick=(time:number)=>{
    fx.clear();
    FOUNTAIN_STREAMS.forEach(({land},i)=>{
      const p=world(land),phase=(time/1800+i/FOUNTAIN_STREAMS.length)%1;
      fx.lineStyle(1.3*scale,0xc1e9ef,(1-phase)*.4);
      fx.strokeEllipse(p.x,p.y,(14+phase*28)*scale,(5+phase*10)*scale);
    });
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE,tick);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>scene.events.off(Phaser.Scenes.Events.UPDATE,tick));
}
