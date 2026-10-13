import Phaser from 'phaser';
import { t } from '../i18n';
import { buildTownGround, MATERIALS, FLOWERS, GROUND_COVER } from '../world/town-ground';
import { attachMinimap } from '../world/minimap';
import { TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT, configureMap, SPAWN, cellAt, centerOf, walkable, findPath, type Cell } from '../world/daflak-grid';

/** Town built from fixed-scale materials with a shared movement grid. */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private bodyArt!: Phaser.GameObjects.Container;
  private hover!: Phaser.GameObjects.Rectangle;
  private marker!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private path: Cell[] = [];
  private tile: Cell = { ...SPAWN };
  private stepTarget: Cell | null = null;
  private readonly speed = 420;
  constructor() { super('world'); }
  preload(): void {
    this.load.atlas('castle-walls','/assets/props/castle/castle-walls.png','/assets/props/castle/castle-walls.json');
    for(const name of GROUND_COVER)this.load.image(`groundcover-${name}`,`/assets/props/daflak-groundcover-${name}.png`);
    for(const name of FLOWERS)this.load.image(`flower-${name}`,`/assets/props/daflak-${name}.png`);
    for (const name of MATERIALS) this.load.image(`terrain-${name}`, `/assets/tiles/daflak-${name}.png`);
  }
  create(): void {
    configureMap(this.scale.width, this.scale.height);
    this.tile = { ...SPAWN }; this.path = []; this.stepTarget = null;
    if (GROUND_COVER.some(name=>!this.textures.exists(`groundcover-${name}`)) || MATERIALS.some(name=>!this.textures.exists(`terrain-${name}`)) || FLOWERS.some(name=>!this.textures.exists(`flower-${name}`))) {
      this.add.text(40,40,t('mapLoadError'),{fontSize:'20px',color:'#ffccaa'}); return;
    }
    const minimapUrl = buildTownGround(this);
    this.hover = this.add.rectangle(0,0,TILE_WIDTH,TILE_HEIGHT,0x9dedbe,0.14).setOrigin(0).setStrokeStyle(2,0xc7ffe1).setDepth(10).setVisible(false);
    this.marker = this.add.rectangle(0,0,TILE_WIDTH,TILE_HEIGHT).setOrigin(0).setStrokeStyle(3,0xf3d48e).setDepth(11).setVisible(false);
    const spawn = centerOf(this.tile);
    this.player = this.add.container(spawn.x,spawn.y);
    const shadow = this.add.ellipse(0,0,42,16,0x101f20,0.45);
    const ring = this.add.ellipse(0,0,52,24).setStrokeStyle(2,0xc9d99a,0.8);
    const character = this.add.graphics();
    character.fillStyle(0x293641).fillRoundedRect(-10,-19,8,19,3).fillRoundedRect(3,-19,8,19,3);
    character.fillStyle(0x78969b).fillTriangle(-17,-17,0,-49,17,-17);
    character.fillStyle(0xc8b58b).fillRoundedRect(-10,-37,20,21,4);
    character.fillStyle(0x735540).fillRect(-10,-23,20,4);
    character.fillStyle(0xe3bf97).fillCircle(0,-48,11);
    character.fillStyle(0x594436).fillRoundedRect(-12,-61,24,11,5).fillRect(-12,-53,5,10);
    character.fillStyle(0x303d3d).fillCircle(4,-48,1.5);
    this.bodyArt = this.add.container(0,0,[character]).setScale(1.6);
    const label = this.add.text(0,-114,'Novice · Lv.1',{fontFamily:'Tahoma',fontSize:'18px',color:'#f4ecd0',stroke:'#20332e',strokeThickness:4}).setOrigin(0.5);
    this.player.add([shadow,ring,this.bodyArt,label]).setDepth(20);
    // RESIZE keeps one canvas unit per CSS pixel: 64×56 world px × 0.5 = 32×28 screen px.
    this.cameras.main.setBounds(0,0,MAP_WIDTH,MAP_HEIGHT).setZoom(0.5).startFollow(this.player,true,0.12,0.12);
    this.cameras.main.centerOn(spawn.x,spawn.y);
    attachMinimap(this, this.player, minimapUrl);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown() && !pointer.wasTouch) return;
      const p = this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const end = cellAt(p.x,p.y);
      if (!walkable(end)) return;
      // Finish the current edge before changing route; never cut across blocked corners.
      const start = this.stepTarget ?? this.tile;
      this.path = findPath(start,end);
      this.marker.setPosition(end.x*TILE_WIDTH,end.y*TILE_HEIGHT).setVisible(true);
    });
    this.input.on('gameout',()=>this.hover.setVisible(false));
  }
  update(time: number,delta: number): void {
    if (!this.player) return;
    const pointer = this.input.activePointer;
    if (this.input.isOver && (!pointer.wasTouch || pointer.isDown)) {
      const p = this.cameras.main.getWorldPoint(pointer.x,pointer.y);
      const cell = cellAt(p.x,p.y);
      const inside = p.x>=0 && p.y>=0 && p.x<MAP_WIDTH && p.y<MAP_HEIGHT;
      const allowed = walkable(cell);
      this.hover.setPosition(cell.x*TILE_WIDTH,cell.y*TILE_HEIGHT).setVisible(inside)
        .setFillStyle(allowed?0x9dedbe:0xef7878,0.14).setStrokeStyle(2,allowed?0xc7ffe1:0xff9999);
    } else this.hover.setVisible(false);
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)-Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)-Number(this.cursors.up.isDown || this.keys.W.isDown);
    if (dx || dy) { this.path = []; this.marker.setVisible(false); }
    if (!this.stepTarget) {
      if (dx || dy) {
        const next = {x:this.tile.x+dx,y:this.tile.y+(dx?0:dy)};
        if(walkable(next)) this.stepTarget=next;
      } else this.stepTarget = this.path.shift() ?? null;
    }
    if (this.stepTarget) {
      const target = centerOf(this.stepTarget);
      const vector = new Phaser.Math.Vector2(target.x-this.player.x,target.y-this.player.y);
      const step = this.speed*Math.min(delta,50)/1000;
      if (vector.length()<=step) {
        this.player.setPosition(target.x,target.y); this.tile=this.stepTarget; this.stepTarget=null;
        if (!this.path.length) this.marker.setVisible(false);
      } else {
        vector.normalize().scale(step); this.player.x+=vector.x; this.player.y+=vector.y;
        if(vector.x) this.bodyArt.scaleX=vector.x<0?-1.6:1.6;
      }
    }
    this.bodyArt.y=this.stepTarget?Math.sin(time/85)*2:0;
  }
}
