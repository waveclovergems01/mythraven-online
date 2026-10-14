import Phaser from 'phaser';
export function createPlayerView(scene:Phaser.Scene,name:string,mine:boolean){
 const container=scene.add.container(0,0);
    const shadow = scene.add.ellipse(0,0,42,16,0x101f20,0.45);
    const ring = scene.add.ellipse(0,0,52,24).setStrokeStyle(2,mine?0xc9d99a:0x89ceef,0.8);
    const character = scene.add.graphics();
    character.fillStyle(0x293641).fillRoundedRect(-10,-19,8,19,3).fillRoundedRect(3,-19,8,19,3);
    character.fillStyle(0x78969b).fillTriangle(-17,-17,0,-49,17,-17);
    character.fillStyle(0xc8b58b).fillRoundedRect(-10,-37,20,21,4);
    character.fillStyle(0x735540).fillRect(-10,-23,20,4);
    character.fillStyle(0xe3bf97).fillCircle(0,-48,11);
    character.fillStyle(0x594436).fillRoundedRect(-12,-61,24,11,5).fillRect(-12,-53,5,10);
    character.fillStyle(0x303d3d).fillCircle(4,-48,1.5);
    const body = scene.add.container(0,0,[character]).setScale(1.6);
    const label = scene.add.text(0,-114,name,{fontFamily:'Tahoma',fontSize:'18px',color:'#f4ecd0',stroke:'#20332e',strokeThickness:4}).setOrigin(0.5);
    container.add([shadow,ring,body,label]);
    return {container,body,label};
}
