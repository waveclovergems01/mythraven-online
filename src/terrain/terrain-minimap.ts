import { TERRAIN, type TerrainData } from './terrain-data';
import type { TerrainPlayer } from '../network/terrain-client';
import { createTreePlacements } from '../../shared/terrain-props.mjs';
import { createFortifications } from '../../shared/terrain-fortifications.mjs';
import {createCityLayout} from '../../shared/city-layout.mjs';
import {FIELD_LIMIT,FIELD_PORTAL,mapPortal,trailZ} from '../../shared/west-march.mjs';
import type {WildlifeTarget} from './frontier-wildlife';

const SVG = 'http://www.w3.org/2000/svg';
const SIZE = 256;
const mapCoordinate = (value: number) => (value / TERRAIN.size + .5) * SIZE;

/** Code-native map of the same heightfield; no second renderer or image asset. */
export function createTerrainMinimap(host: HTMLElement, data: TerrainData, thai: boolean) {
  const panel = document.createElement('aside'); panel.className = 'terrain-minimap';
  panel.setAttribute('aria-label', thai ? 'มินิแมพเมือง' : 'City minimap');
  const title = document.createElement('span'); title.className = 'terrain-minimap-city';
  const field = data.area === 'west-march';
  title.textContent = field ? (thai ? 'ทุ่งชายแดนตะวันตก' : 'West March') : (thai ? 'เมืองหลัก' : 'Main city');
  panel.setAttribute('aria-label',title.textContent);
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
  const footprint = document.createElementNS(SVG, 'polygon'); footprint.classList.add('minimap-camera');
  if (field) {
    const trail = document.createElementNS(SVG,'polyline');
    const points = [];
    for (let x=-FIELD_LIMIT;x<=FIELD_PORTAL.x;x+=4) points.push(mapCoordinate(x)+','+mapCoordinate(trailZ(x)));
    trail.setAttribute('points',points.join(' ')); trail.setAttribute('fill','none');
    trail.setAttribute('stroke','#c6a676'); trail.setAttribute('stroke-width','3'); svg.append(trail);
  } else {
  const city=createCityLayout(data),streets=document.createElementNS(SVG,'g');streets.classList.add('terrain-minimap-streets');
  const square=document.createElementNS(SVG,'polygon');square.setAttribute('points',[[0,-32],[32,0],[0,32],[-32,0]].map(([x,z])=>`${mapCoordinate(x)},${mapCoordinate(z)}`).join(' '));square.setAttribute('fill','#cfbfa3');streets.append(square);
  for(const r of city.roads){const p=document.createElementNS(SVG,'line');p.setAttribute('x1',String(mapCoordinate(r.ax)));p.setAttribute('y1',String(mapCoordinate(r.az)));p.setAttribute('x2',String(mapCoordinate(r.bx)));p.setAttribute('y2',String(mapCoordinate(r.bz)));p.setAttribute('stroke','#cfbfa3');p.setAttribute('stroke-width',String(r.width/500*SIZE));streets.append(p);}
  const reserve=document.createElementNS(SVG,'circle');reserve.setAttribute('cx','128');reserve.setAttribute('cy','128');reserve.setAttribute('r',String(city.plaza.fountainRadius/500*SIZE));reserve.setAttribute('fill','none');reserve.setAttribute('stroke','#9f8b6b');reserve.setAttribute('stroke-width','.7');streets.append(reserve);
  svg.append(streets);
  const buildingMarkers=document.createElementNS(SVG,'g');buildingMarkers.classList.add('terrain-minimap-buildings');
  for(const b of city.buildings){
    if(b.radius!==undefined){const p=document.createElementNS(SVG,'circle');p.setAttribute('cx',String(mapCoordinate(b.x)));p.setAttribute('cy',String(mapCoordinate(b.z)));p.setAttribute('r',String(b.radius/500*SIZE));p.setAttribute('fill','#e4d8b8');p.setAttribute('stroke','#867a61');p.setAttribute('stroke-width','.6');buildingMarkers.append(p);continue;}
    const p=document.createElementNS(SVG,'rect'),x=mapCoordinate(b.x),z=mapCoordinate(b.z),w=b.halfWidth*2/500*SIZE,h=b.halfDepth*2/500*SIZE;
    p.setAttribute('x',String(x-w/2));p.setAttribute('y',String(z-h/2));p.setAttribute('width',String(w));p.setAttribute('height',String(h));p.setAttribute('transform',`rotate(${-b.yaw*180/Math.PI} ${x} ${z})`);p.setAttribute('fill',b.model==='castle-red-spires'?'#a44b39':b.model.includes('blue')?'#4b6582':'#a96e49');
    const title=document.createElementNS(SVG,'title');title.textContent=b.model;p.append(title);buildingMarkers.append(p);}
  svg.append(buildingMarkers);
  }
  const groveMarkers = document.createElementNS(SVG, 'g'); groveMarkers.classList.add('terrain-minimap-groves');
  groveMarkers.setAttribute('fill', '#476932'); groveMarkers.setAttribute('fill-opacity', '.8');
  for (const placement of createTreePlacements(data)) {
    const dot = document.createElementNS(SVG, 'circle');
    dot.setAttribute('cx', String(mapCoordinate(placement.x))); dot.setAttribute('cy', String(mapCoordinate(placement.z)));
    dot.setAttribute('r', placement.model === 1 ? '1.5' : '2'); groveMarkers.append(dot);
  }
  svg.append(groveMarkers);
  const fortifications=createFortifications(data),fortMarkers=document.createElementNS(SVG,'g');
  fortMarkers.classList.add('terrain-minimap-fortifications');
  const line=(a:{x:number;z:number},b:{x:number;z:number},color:string,width:number)=>{
    const segment=document.createElementNS(SVG,'line');
    segment.setAttribute('x1',String(mapCoordinate(a.x)));segment.setAttribute('y1',String(mapCoordinate(a.z)));
    segment.setAttribute('x2',String(mapCoordinate(b.x)));segment.setAttribute('y2',String(mapCoordinate(b.z)));
    segment.setAttribute('stroke',color);segment.setAttribute('stroke-width',String(width));fortMarkers.append(segment);
  };
  for(const b of fortifications.bridges){
    const end=(d:number)=>({x:b.outward.x*d+b.tangent.x*(b.lateral??0),z:b.outward.z*d+b.tangent.z*(b.lateral??0)});
    line(end(b.from),end(b.to),'#d2bc90',3.7);
  }
  for(const w of fortifications.walls){const dx=Math.cos(w.yaw)*w.half,dz=-Math.sin(w.yaw)*w.half;line({x:w.x-dx,z:w.z-dz},{x:w.x+dx,z:w.z+dz},'#726653',2.1);}
  for(const g of fortifications.gates)for(const sign of [-1,1])line({x:g.x+g.tangent.x*g.passage*sign,z:g.z+g.tangent.z*g.passage*sign},{x:g.x+g.tangent.x*g.half*sign,z:g.z+g.tangent.z*g.half*sign},'#9e7250',3);
  for(const t of fortifications.towers){const dot=document.createElementNS(SVG,'circle');dot.setAttribute('cx',String(mapCoordinate(t.x)));dot.setAttribute('cy',String(mapCoordinate(t.z)));dot.setAttribute('r','3');dot.setAttribute('fill','#934b34');fortMarkers.append(dot);}
  svg.append(fortMarkers);
  const destination = mapPortal(data), warp = document.createElementNS(SVG,'circle');
  warp.setAttribute('cx',String(mapCoordinate(destination.x))); warp.setAttribute('cy',String(mapCoordinate(destination.z)));
  warp.setAttribute('r','3.5'); warp.setAttribute('fill','#94efe2'); warp.setAttribute('stroke','#24565a');
  const warpTitle = document.createElementNS(SVG,'title');
  warpTitle.textContent = field ? (thai ? 'กลับเมือง' : 'To the city') : (thai ? 'ไปทุ่งชายแดนตะวันตก' : 'To West March');
  warp.append(warpTitle); svg.append(warp);
  footprint.setAttribute('fill', '#fff4cc'); footprint.setAttribute('fill-opacity', '.1');
  footprint.setAttribute('stroke', '#fff2ca'); footprint.setAttribute('stroke-width', '1'); footprint.style.display = 'none';
  svg.append(footprint);
  const wildlifeDots = document.createElementNS(SVG,'g'); svg.append(wildlifeDots);
  const animalMarkers=new Map<string,SVGCircleElement>();
  const dots = document.createElementNS(SVG, 'g'); svg.append(dots);
  panel.append(svg, title, compass); host.append(panel);
  const markers = new Map<string, SVGCircleElement>();
  return {
    update(players: ReadonlyMap<string, TerrainPlayer>, ownId: string | undefined,
      view: { x: number; z: number }[], animals?:ReadonlyMap<string,WildlifeTarget>, selected?:string) {
      if(animals) for(const [id,animal] of animals) {
        let dot=animalMarkers.get(id);
        if(!dot){
          dot=document.createElementNS(SVG,'circle'); dot.dataset.monster=id;
          dot.setAttribute('fill',animal.kind==='rabbit'?'#fff0c8':'#d88664');
          dot.setAttribute('stroke','#5b4637'); dot.setAttribute('stroke-width','.8');
          const tooltip=document.createElementNS(SVG,'title');tooltip.textContent=thai?animal.th:animal.en;
          dot.append(tooltip);wildlifeDots.append(dot);animalMarkers.set(id,dot);
        }
        dot.setAttribute('r',selected===id?'3.3':'1.9');
        dot.setAttribute('cx',String(mapCoordinate(animal.position.x)));dot.setAttribute('cy',String(mapCoordinate(animal.position.z)));
      }
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
      footprint.setAttribute('points', view.map(point => `${mapCoordinate(point.x)},${mapCoordinate(point.z)}`).join(' '));
    },
    destroy() { panel.remove(); markers.clear(); },
  };
}
