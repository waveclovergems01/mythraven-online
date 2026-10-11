import Phaser from 'phaser';
import { t } from '../i18n';
import { MAP_WIDTH, MAP_HEIGHT } from './daflak-grid';

/** Reuse the backdrop at full extent, with the actual rendered camera footprint. */
export function attachMinimap(scene: Phaser.Scene, player: Phaser.GameObjects.Container): void {
  const panel = document.createElement('aside');
  panel.className = 'minimap';
  panel.setAttribute('aria-label', t('minimap'));
  panel.innerHTML = `<strong>${t('city')}</strong>
    <div class="minimap-image" style="aspect-ratio: ${MAP_WIDTH} / ${MAP_HEIGHT}">
      <img src="/assets/maps/daflak-city-v001.webp" alt="${t('minimap')}" draggable="false">
      <svg viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" aria-hidden="true">
        <rect class="minimap-view" fill="#fff3" stroke="#fff1b8" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
        <circle class="minimap-player" r="60" fill="#ffe18a" stroke="#172824" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
      </svg>
    </div>
    <div class="minimap-legend">${t('minimapLegend')}</div>
    <div class="minimap-stats"></div>`;
  document.querySelector('.game-page')!.append(panel);
  const rect = panel.querySelector('rect')!;
  const dot = panel.querySelector('circle')!;
  const stats = panel.querySelector('.minimap-stats')!;
  const sync = () => {
    const view = scene.cameras.main.worldView;
    const left = Phaser.Math.Clamp(view.x, 0, MAP_WIDTH);
    const top = Phaser.Math.Clamp(view.y, 0, MAP_HEIGHT);
    const width = Math.max(0, Math.min(view.right, MAP_WIDTH) - left);
    const height = Math.max(0, Math.min(view.bottom, MAP_HEIGHT) - top);
    for (const [key, value] of Object.entries({ x: left, y: top, width, height })) rect.setAttribute(key, String(value));
    dot.setAttribute('cx', String(player.x)); dot.setAttribute('cy', String(player.y));
    const summary = `${t('minimapVisible')}: ${(width / MAP_WIDTH * 100).toFixed(0)}% × ${(height / MAP_HEIGHT * 100).toFixed(0)}%`;
    if (stats.textContent !== summary) stats.textContent = summary;
  };
  // Camera follow and worldView update during rendering, after Scene.update.
  scene.game.events.on(Phaser.Core.Events.POST_RENDER, sync);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.game.events.off(Phaser.Core.Events.POST_RENDER, sync);
    panel.remove();
  });
}
