import Phaser from 'phaser';
export const NOVICE_IDLE={key:'novice-male-idle',path:'/assets/characters/novice-male-idle.png',frameWidth:240,frameHeight:240,frameRate:2.5,worldScale:1.1} as const;
export const NOVICE_WALK={key:'novice-male-walk-w',path:'/assets/characters/novice-male-walk-w.png',frameWidth:240,frameHeight:240,frameRate:10} as const;
export const NOVICE_WALK_SW={key:'novice-male-walk-sw',path:'/assets/characters/novice-male-walk-sw.png',frameWidth:240,frameHeight:240,frameRate:12} as const;
const directions=['s','sw','w','nw','n','ne','e','se'] as const;
export function createPlayerView(scene:Phaser.Scene,name:string,mine:boolean){
 for(const [row,d] of directions.entries()){
  const key=`novice-idle-${d}`;
  if(!scene.anims.exists(key))scene.anims.create({key,frames:scene.anims.generateFrameNumbers(NOVICE_IDLE.key,{start:row*4,end:row*4+3}),frameRate:NOVICE_IDLE.frameRate,repeat:-1});
 }
 if(!scene.anims.exists('novice-walk-horizontal'))scene.anims.create({key:'novice-walk-horizontal',frames:scene.anims.generateFrameNumbers(NOVICE_WALK.key,{start:0,end:7}),frameRate:NOVICE_WALK.frameRate,repeat:-1});
 if(!scene.anims.exists('novice-walk-diagonal-down'))scene.anims.create({key:'novice-walk-diagonal-down',frames:scene.anims.generateFrameNumbers(NOVICE_WALK_SW.key,{start:0,end:7}),frameRate:NOVICE_WALK_SW.frameRate,repeat:-1});
 const container=scene.add.container(0,0);
 const shadow=scene.add.ellipse(0,0,68,26,0x101f20,.45);
 const ring=scene.add.ellipse(0,0,82,36).setStrokeStyle(2,mine?0xc9d99a:0x89ceef,.8);
 // About 80 screen pixels tall at camera zoom 0.5; preserve proportions and feet anchor.
 const body=scene.add.sprite(0,0,NOVICE_IDLE.key).setOrigin(.5,.9).setScale(NOVICE_IDLE.worldScale);
 const label=scene.add.text(0,-180,name,{fontFamily:'Tahoma',fontSize:'18px',color:'#f4ecd0',stroke:'#20332e',strokeThickness:4}).setOrigin(.5);
 container.add([shadow,ring,body,label]);
 let direction=0;let previous:{x:number;y:number}|undefined;
 function updatePose(x:number,y:number,moving:boolean){
  if(previous){const dx=x-previous.x,dy=y-previous.y;
   if(Math.hypot(dx,dy)>.1){const angle=Math.atan2(dy,dx);direction=(Math.round(angle/(Math.PI/4))+6+8)%8;}
  }
  previous={x,y};const key=`novice-idle-${directions[direction]}`;
  if(moving&&(direction===2||direction===6)){
   body.setFlipX(direction===6);body.play('novice-walk-horizontal',true);
  }else if(moving&&(direction===1||direction===7)){
   body.setFlipX(direction===7);body.play('novice-walk-diagonal-down',true);
  }else{
   body.setFlipX(false);
   if(moving){body.anims.stop();body.setTexture(NOVICE_IDLE.key,direction*4);}
   else if(!body.anims.isPlaying||body.anims.currentAnim?.key!==key)body.play(key);
  }
 }
 body.play('novice-idle-s');
 return {container,body,label,updatePose};
}

