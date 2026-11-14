import { TERRAIN, type TerrainData } from './terrain-data';
import type { TerrainPlayer } from '../network/terrain-client';
import { RIVERSIDE_OAK } from '../../shared/terrain-props.mjs';

const SVG = 'http://www.w3.org/2000/svg';
const SIZE = 256;
const mapCoordinate = (value: number) => (value / TERRAIN.size + .5) * SIZE;

/** Code-native map of the same heightfield; no second renderer or image asset. */
export function createTerrainMinimap(host: HTMLElement, data: TerrainData, thai: boolean) {
  const panel = document.createElement('aside'); panel.className = 'terrain-minimap';
  panel.setAttribute('aria-label', thai ? 'มินิแมพเมือง' : 'City minimap');
  const title = document.createElement('span'); title.className = 'terrain-minimap-city';
  title.textContent = thai ? 'เมืองหลัก' : 'Main city';
  const compass = document.createElement('div'); compass.className = 'terrain-minimap-compass';
  compass.setAttribute('role', 'img');
  compass.setAttribute('aria-label', thai ? 'ทิศเหนือ ใต้ ตะวันออก ตะวันตก' : 'North, south, east and west');
  compass.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23"/><path d="M24 12 28 24 24 36 20 24Z"/><path class="north" d="M24 12 28 24 20 24Z"/><text x="24" y="10">N</text><text x="24" y="45">S</text><text x="43" y="27">E</text><text x="5" y="27">W</text></svg>';
  const svg = document.createElementNS(SVG, 'svg'); svg.setAttribute('viewBox', '0 0 256 256');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', thai ? 'แผนที่พื้นดิน ร่องน้ำ และตำแหน่งผู้เล่น' : 'Terrain, river and player locations');
  const base = document.createElementNS(SVG, 'rect');
  base.setAttribute('width', '256'); base.setAttribute('height', '256'); base.setAttribute('fill', '#73adb7'); svg.append(base);
  // Merge horizontal runs into two SVG paths; detail is fixed regardless of HUD size.
  const paths = ['', ''];
  for (let row = 0; row < SIZE; row++) {
    let start = 0, previous = -1;
    for (let col = 0; col <= SIZE; col++) {
      let kind = -1;
      if (col < SIZE) {
        const x = Math.round((col + .5) / SIZE * (data.side - 1));
        const z = Math.round((row + .5) / SIZE * (data.side - 1));
        const i = z * data.side + x;
        kind = data.heights[i] <= TERRAIN.waterLevel ? -1 : data.shoreDistance[i] < 8 ? 0 : 1;
      }
      if (kind !== previous) {
        if (previous >= 0) paths[previous] += `M${start} ${row}h${col - start}v1h-${col - start}z`;
        start = col; previous = kind;
      }
    }
  }
  paths.forEach((d, index) => {
    const path = document.createElementNS(SVG, 'path'); path.setAttribute('d', d);
    path.setAttribute('fill', index ? '#94af6b' : '#d0b984'); svg.append(path);
  });
  const footprint = document.createElementNS(SVG, 'rect'); footprint.classList.add('minimap-camera');
  const tree = document.createElementNS(SVG, 'circle'); tree.classList.add('terrain-minimap-tree');
  tree.setAttribute('cx',String(mapCoordinate(RIVERSIDE_OAK.x))); tree.setAttribute('cy',String(mapCoordinate(RIVERSIDE_OAK.z)));
  tree.setAttribute('r','2.5'); tree.setAttribute('fill','#395e2a'); tree.setAttribute('stroke','#b3c880'); tree.setAttribute('stroke-width','.6');
  const treeTitle=document.createElementNS(SVG,'title'); treeTitle.textContent=thai?'ต้นโอ๊กริมคลอง':'Riverside oak'; tree.append(treeTitle); svg.append(tree);
  footprint.setAttribute('fill', '#fff4cc'); footprint.setAttribute('fill-opacity', '.1');
  footprint.setAttribute('stroke', '#fff2ca'); footprint.setAttribute('stroke-width', '1'); footprint.style.display = 'none';
  svg.append(footprint);
  const dots = document.createElementNS(SVG, 'g'); svg.append(dots);
  panel.append(svg, title, compass); host.append(panel);
  const markers = new Map<string, SVGCircleElement>();
  return {
    update(players: ReadonlyMap<string, TerrainPlayer>, ownId: string | undefined,
      view: { x: number; z: number; width: number; depth: number }) {
      for (const [id, dot] of markers) if (!players.has(id)) { dot.remove(); markers.delete(id); }
      for (const [id, player] of players) {
        let dot = markers.get(id);
        if (!dot) {
          dot = document.createElementNS(SVG, 'circle'); dot.classList.add('terrain-minimap-player'); dot.dataset.playerId = id;
          dot.setAttribute('stroke', '#20372f'); dot.setAttribute('stroke-width', '1.2');
          const name = document.createElementNS(SVG, 'title'); name.textContent = player.name; dot.append(name);
          markers.set(id, dot); dots.append(dot);
        }
        const mine = id === ownId;
        dot.dataset.mine = String(mine); dot.setAttribute('r', mine ? '3.5' : '2.5');
        dot.setAttribute('fill', mine ? '#ffe49a' : '#d4efff');
        dot.setAttribute('cx', String(mapCoordinate(player.x))); dot.setAttribute('cy', String(mapCoordinate(player.z)));
      }
      const own = ownId ? markers.get(ownId) : undefined;
      if (own) dots.append(own); // Local marker stays readable in a group.
      footprint.style.display = own ? '' : 'none';
      footprint.setAttribute('x', String(mapCoordinate(view.x - view.width / 2)));
      footprint.setAttribute('y', String(mapCoordinate(view.z - view.depth / 2)));
      footprint.setAttribute('width', String(view.width / TERRAIN.size * SIZE));
      footprint.setAttribute('height', String(view.depth / TERRAIN.size * SIZE));
    },
    destroy() { panel.remove(); markers.clear(); },
  };
}
