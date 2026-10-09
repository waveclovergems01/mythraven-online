import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#243b36',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1120, height: 680 },
  scene: [WorldScene],
  render: { antialias: true },
});
