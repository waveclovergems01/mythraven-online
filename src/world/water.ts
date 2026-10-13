import Phaser from 'phaser';

/** Continuous water layers beneath the cached, transparent terrain chunks. */
export function attachWater(scene: Phaser.Scene, source: HTMLImageElement): void {
  const key='town-water-loop';
  // Mirrored repeats meet at identical edge pixels, including the wrap seam.
  // This is a runtime texture composition, not a generated animation sheet.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  for(let y=0;y<2;y++)for(let x=0;x<2;x++){
    ctx.save();ctx.translate(x?512:0,y?512:0);ctx.scale(x?-1:1,y?-1:1);
    ctx.drawImage(source,0,0,256,256);ctx.restore();
  }
  scene.textures.addCanvas(key,canvas);
  const base=scene.add.tileSprite(0,0,1,1,key).setOrigin(0).setDepth(-3)
    .setTileScale(1.6,1.4).setTint(0x79b4bd).setName('water-current');
  const ripples=scene.add.tileSprite(0,0,1,1,key).setOrigin(0).setDepth(-2)
    .setTileScale(2.37,1.93).setAlpha(.24).setName('water-ripples');
  let elapsed=0;
  const tick=(_time:number,delta:number)=>{elapsed+=Math.min(delta,100)/1000;};
  const render=()=>{
    const v=scene.cameras.main.worldView;
    for(const layer of [base,ripples]){
      layer.setPosition(v.x-4,v.y-4);
      layer.setSize(Math.ceil(v.width)+8,Math.ceil(v.height)+8);
    }
    // World anchored UVs prevent swimming with the camera; about 2 screen px/s.
    base.tilePositionX=(v.x-4)/1.6+elapsed*2.5;
    base.tilePositionY=(v.y-4)/1.4+elapsed*.8;
    ripples.tilePositionX=(v.x-4)/2.37-elapsed*1.1+173;
    ripples.tilePositionY=(v.y-4)/1.93+elapsed*1.3+91;
    ripples.alpha=.24+Math.sin(elapsed*.45)*.035;
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE,tick);
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER,render);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
    scene.events.off(Phaser.Scenes.Events.UPDATE,tick);
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER,render);
    base.destroy();ripples.destroy();scene.textures.remove(key);
  });
}
