import Phaser from 'phaser';

/** World-anchored repeating water beneath the transparent, static land chunks. */
export function attachWater(scene: Phaser.Scene): void {
  const base=scene.add.tileSprite(0,0,1,1,'town-water').setOrigin(0).setDepth(-3)
    .setTileScale(1,.875).setName('water-current');
  const ripples=scene.add.tileSprite(0,0,1,1,'town-water').setOrigin(0).setDepth(-2)
    .setTileScale(1.47,1.13).setAlpha(.20).setName('water-ripples');
  let elapsed=0;
  const tick=(_time:number,delta:number)=>{elapsed+=Math.min(delta,100)/1000;};
  const render=()=>{
    const v=scene.cameras.main.worldView;
    for(const layer of [base,ripples]){
      layer.setPosition(v.x-4,v.y-4);
      layer.setSize(Math.ceil(v.width)+8,Math.ceil(v.height)+8);
    }
    // Smooth reversals every ~5s horizontally plus a gentle continuous downstream drift.
    base.tilePositionX=v.x-4+Math.sin(elapsed*.62)*38;
    base.tilePositionY=(v.y-4)/.875+elapsed*3+Math.sin(elapsed*.33)*6;
    ripples.tilePositionX=(v.x-4)/1.47-Math.sin(elapsed*.53+.8)*27+173;
    ripples.tilePositionY=(v.y-4)/1.13-elapsed*1.7+91;
    ripples.alpha=.20+Math.sin(elapsed*.45)*.025;
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE,tick);
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER,render);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
    scene.events.off(Phaser.Scenes.Events.UPDATE,tick);
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER,render);
    base.destroy();ripples.destroy();
  });
}
