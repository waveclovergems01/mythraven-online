import Phaser from 'phaser';
import { t } from '../i18n';

/** Local movement sandbox. Artwork is procedural placeholder art. */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private bodyArt!: Phaser.GameObjects.Container;
  private marker!: Phaser.GameObjects.Arc;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private readonly speed = 190;

  constructor() { super('world'); }

  create(): void {
    this.target = null;
    const ground = this.add.graphics();
    ground.fillStyle(0x2b443b).fillRect(0, 0, 1120, 680);
    const random = new Phaser.Math.RandomDataGenerator(['mythraven-first-map']);
    for (let i = 0; i < 1700; i++) {
      ground.fillStyle(random.pick([0x355043, 0x405942, 0x263e36]), 0.7);
      ground.fillEllipse(random.between(0, 1120), random.between(0, 680), random.between(2, 8), 3);
    }
    ground.lineStyle(92, 0x756f50).beginPath().moveTo(0, 390).lineTo(450, 350).lineTo(760, 400).lineTo(1120, 290).strokePath();
    ground.lineStyle(70, 0x928261).beginPath().moveTo(0, 390).lineTo(450, 350).lineTo(760, 400).lineTo(1120, 290).strokePath();
    ground.fillStyle(0x7b7e64).fillEllipse(560, 355, 300, 178);
    ground.lineStyle(2, 0xb5ae83, 0.4).strokeEllipse(560, 355, 270, 150);
    ground.lineStyle(1, 0xb5ae83, 0.3).strokeEllipse(560, 355, 235, 128);
    for (let i = 0; i < 80; i++) {
      ground.fillStyle(0xc6b88e, 0.18).fillCircle(random.between(40, 1080), random.between(330, 395), 2);
    }
    for (const [x,y,size] of [[110,210,1.1],[270,230,0.9],[840,205,1.1],[1010,210,1.25],[155,570,1.3],[340,635,1],[900,580,1.2],[1070,600,0.85]]) {
      this.tree(x,y,size);
    }
    const sign = this.add.container(740,270).setDepth(270);
    const board = this.add.graphics().fillStyle(0x4a352b).fillRect(-4,-20,8,40)
      .fillStyle(0x443c30).fillRoundedRect(-65,-49,130,33,4)
      .lineStyle(1,0xa7996a).strokeRoundedRect(-65,-49,130,33,4);
    sign.add([board,this.add.text(0,-33,"RAVEN'S REST",{fontFamily:'Georgia',fontSize:'12px',color:'#e3d5a9'}).setOrigin(0.5)]);

    this.marker = this.add.circle(0,0,11,0xdacb96,0.08).setStrokeStyle(2,0xdacb96,0.65).setVisible(false).setDepth(0.5);
    this.player = this.add.container(560,355);
    const shadow = this.add.ellipse(0,0,33,13,0x101f20,0.45);
    const ring = this.add.ellipse(0,0,43,20).setStrokeStyle(1,0xc9d99a,0.8);
    const character = this.add.graphics();
    character.fillStyle(0x293641).fillRoundedRect(-10,-19,8,19,3).fillRoundedRect(3,-19,8,19,3);
    character.fillStyle(0x78969b).fillTriangle(-17,-17,0,-49,17,-17);
    character.fillStyle(0xc8b58b).fillRoundedRect(-10,-37,20,21,4);
    character.fillStyle(0x735540).fillRect(-10,-23,20,4);
    character.fillStyle(0xe3bf97).fillCircle(0,-48,11);
    character.fillStyle(0x594436).fillRoundedRect(-12,-61,24,11,5).fillRect(-12,-53,5,10);
    character.fillStyle(0x303d3d).fillCircle(4,-48,1.5);
    this.bodyArt = this.add.container(0,0,[character]);
    const label = this.add.text(0,-80,'Novice · Lv.1',{fontFamily:'Tahoma',fontSize:'12px',color:'#f4ecd0',stroke:'#20332e',strokeThickness:4}).setOrigin(0.5);
    this.player.add([shadow,ring,this.bodyArt,label]).setDepth(355);
    this.add.text(24,22,t('worldTitle'),{fontFamily:'Georgia',fontSize:'14px',color:'#eee1b7',backgroundColor:'#21372d',padding:{x:14,y:10}}).setDepth(2000);
    this.add.text(24,642,t('session'),{fontFamily:'monospace',fontSize:'11px',color:'#c1d3ba'}).setDepth(2000);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(Phaser.Math.Clamp(pointer.worldX,30,1090),Phaser.Math.Clamp(pointer.worldY,100,630));
      this.marker.setPosition(this.target.x,this.target.y).setVisible(true);
    });
  }

  update(time: number,delta: number): void {
    const direction = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.D.isDown)-Number(this.cursors.left.isDown || this.keys.A.isDown),
      Number(this.cursors.down.isDown || this.keys.S.isDown)-Number(this.cursors.up.isDown || this.keys.W.isDown),
    );
    const step = this.speed * Math.min(delta,50)/1000;
    if (direction.lengthSq()>0) {
      this.target = null;
      this.marker.setVisible(false);
    } else if (this.target) {
      direction.set(this.target.x-this.player.x,this.target.y-this.player.y);
      if (direction.length()<=step) {
        this.player.setPosition(this.target.x,this.target.y);
        this.target = null;
        this.marker.setVisible(false);
        direction.set(0,0);
      }
    }
    const moving = direction.lengthSq()>0;
    if (moving) {
      direction.normalize().scale(step);
      this.player.x = Phaser.Math.Clamp(this.player.x+direction.x,30,1090);
      this.player.y = Phaser.Math.Clamp(this.player.y+direction.y,100,630);
      if (direction.x!==0) this.bodyArt.setScale(direction.x<0?-1:1,1);
    }
    this.bodyArt.y = moving?Math.sin(time/85)*2:0;
    this.player.setDepth(this.player.y);
  }

  private tree(x: number,y: number,scale: number): void {
    const art = this.add.graphics();
    art.fillStyle(0x172c28,0.35).fillEllipse(9,3,100,28);
    art.fillStyle(0x655341).fillRoundedRect(-9,-77,18,80,5);
    art.fillStyle(0x1e3930).fillCircle(0,-85,50);
    art.fillStyle(0x345540).fillCircle(-15,-105,36).fillCircle(23,-95,34);
    art.fillStyle(0x496749).fillCircle(-10,-123,27);
    art.fillStyle(0x63794f,0.6).fillEllipse(-17,-134,22,10);
    this.add.container(x,y,[art]).setScale(scale).setDepth(y);
  }
}
