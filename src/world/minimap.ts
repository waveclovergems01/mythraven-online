import Phaser from 'phaser';
import { t } from '../i18n';
import { MAP_WIDTH, MAP_HEIGHT } from './daflak-grid';

interface MinimapPlayer {id: string; x: number; y: number; mine: boolean}

/** Reuse the backdrop at full extent, with the actual rendered camera footprint. */
export function attachMinimap(scene: Phaser.Scene, players: () => Iterable<MinimapPlayer>, groundUrl: string): void {
  const panel = document.createElement('aside');
  panel.className = 'minimap';
  panel.setAttribute('aria-label', t('minimap'));
  panel.innerHTML = `<strong>${t('city')}</strong>
    <div class="minimap-image">
      <img style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${MAP_WIDTH/Math.max(MAP_WIDTH,MAP_HEIGHT)*100}%;height:${MAP_HEIGHT/Math.max(MAP_WIDTH,MAP_HEIGHT)*100}%;object-fit:fill" src="${groundUrl}" alt="${t('minimap')}" draggable="false">
      <svg viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" aria-hidden="true">
        <rect class="minimap-view" fill="#fff3" stroke="#fff1b8" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
        <g class="minimap-others"></g>
        <g class="minimap-self"></g>
      </svg>
    </div>
    <div class="minimap-legend">${t('minimapLegend')}</div>
    <div class="minimap-stats"></div>`;
  document.querySelector('.game-page')!.append(panel);
  const rect = panel.querySelector('rect')!;
  const others = panel.querySelector('.minimap-others')!;
  const self = panel.querySelector('.minimap-self')!;
  const dots = new Map<string, SVGCircleElement>();
  const stats = panel.querySelector('.minimap-stats')!;
  const sync = () => {
    const view = scene.cameras.main.worldView;
    const left = Phaser.Math.Clamp(view.x, 0, MAP_WIDTH);
    const top = Phaser.Math.Clamp(view.y, 0, MAP_HEIGHT);
    const width = Math.max(0, Math.min(view.right, MAP_WIDTH) - left);
    const height = Math.max(0, Math.min(view.bottom, MAP_HEIGHT) - top);
    for (const [key, value] of Object.entries({ x: left, y: top, width, height })) rect.setAttribute(key, String(value));
    const present = new Set<string>();
    for (const player of players()) {
      present.add(player.id);
      let dot = dots.get(player.id);
      if (!dot) {
        dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('class', 'minimap-player');
        dot.dataset.playerId = player.id;
        dot.setAttribute('stroke', '#172824');
        dot.setAttribute('stroke-width', '1.5');
        dot.setAttribute('vector-effect', 'non-scaling-stroke');
        dots.set(player.id, dot);
      }
      dot.dataset.mine = String(player.mine);
      dot.setAttribute('r', player.mine ? '100' : '85');
      dot.setAttribute('fill', player.mine ? '#ffe18a' : '#b8bec5');
      dot.setAttribute('cx', String(player.x));
      dot.setAttribute('cy', String(player.y));
      const layer = player.mine ? self : others;
      if (dot.parentNode !== layer) layer.append(dot);
    }
    for (const [id, dot] of dots) if (!present.has(id)) { dot.remove(); dots.delete(id); }
    const summary = `${t('minimapVisible')}: ${(width / MAP_WIDTH * 100).toFixed(0)}% × ${(height / MAP_HEIGHT * 100).toFixed(0)}%`;
    if (stats.textContent !== summary) stats.textContent = summary;
  };
  // Camera follow and worldView update during rendering, after Scene.update.
  scene.game.events.on(Phaser.Core.Events.POST_RENDER, sync);
  const cleanup = () => {
    scene.game.events.off(Phaser.Core.Events.POST_RENDER, sync);
    panel.remove();
    dots.clear();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
