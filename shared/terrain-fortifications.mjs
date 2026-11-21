import assets from './fortification-assets.json' with { type: 'json' };
import {FIELD_CROSSINGS} from './west-march.mjs';
export const FORTIFICATION_ASSETS = assets;
export const CITY_DECK_HEIGHT = 4.9;
const cache = new WeakMap();
const point = (angle, radius) => ({ x: Math.sin(angle) * radius, z: Math.cos(angle) * radius });
const dot = (p, axis) => p.x * axis.x + p.z * axis.z;
const sample = (data, x, z, field = 'shoreDistance') => {
  const col = Math.max(0, Math.min(data.side - 1, Math.round((x + 250) / 500 * (data.side - 1))));
  const row = Math.max(0, Math.min(data.side - 1, Math.round((z + 250) / 500 * (data.side - 1))));
  return data[field][row * data.side + col];
};
const radialBoundary = (data, angle, setback) => {
  for (let r = 20; r < 245; r += .5) { const p = point(angle, r); if (sample(data, p.x, p.z) < setback) return r - .5; }
  throw new Error('City shoreline not found');
};

/** One deterministic layout for rendering, server collision, trees and the minimap. */
export function createFortifications(data) {
  if (cache.has(data)) return cache.get(data);
  const instances = [], walls = [], towers = [], gates = [], bridges = [];
  if (data.area === 'west-march') {
    const model=assets['city-stone-bridge'], scale=1.65, half=model.width*.49*scale;
    for(const crossing of FIELD_CROSSINGS){
      const horizontal=crossing.axis==='x';
      const outward=horizontal?{x:1,z:0}:{x:0,z:1},tangent={x:outward.z,z:-outward.x};
      const center=dot(crossing,outward);
      bridges.push({id:crossing.id,outward,tangent,lateral:dot(crossing,tangent),from:center-half-4,
        start:center-half,end:center+half,to:center+half+4,deck:CITY_DECK_HEIGHT,endHeight:CITY_DECK_HEIGHT,
        halfWidth:2.1*scale,visualHalfWidth:model.depth*scale/2,scale,spans:1});
      instances.push({model:'city-stone-bridge',x:crossing.x,z:crossing.z,y:CITY_DECK_HEIGHT-model.deck[32][1]*scale,
        yaw:horizontal?0:-Math.PI/2,sx:scale,sy:scale,sz:scale});
    }
    const layout = {instances, walls, towers, gates, bridges};
    cache.set(data, layout); return layout;
  }
  for (const [id, angle] of [['south', 0], ['east', Math.PI / 2+.12], ['west', -Math.PI / 2-.12], ['north',Math.PI]]) {
    const r = radialBoundary(data, angle, 26), center = point(angle, r);
    const outward = point(angle, 1), tangent = { x: outward.z, z: -outward.x };
    const scale = id==='north'?1.35:1.85, half = assets['city-gate'].width * scale / 2;
    // Door leaves define the bounding depth, but the side-wing masonry sits behind
    // that centre. Join to the measured wall face, with overlap inside each wing.
    const gate = { id, ...center, angle, r, outward, tangent, half, passage: assets['city-gate'].passageHalfWidth * scale,
      depth: assets['city-gate'].depth * scale / 2, joinDepth: -2.8*scale, joinHalf: half-2.5*scale };
    gates.push(gate);
    instances.push({ model: 'city-gate', ...center, y: CITY_DECK_HEIGHT-.1, yaw: angle, sx:scale, sy:scale, sz:scale });
    const inner = radialBoundary(data, angle, 12);
    let water = false, outer = 0, end = 0;
    const limit=247/Math.max(Math.abs(outward.x),Math.abs(outward.z));
    for (let radius = inner; radius < limit; radius += .5) {
      const p = point(angle, radius), d = sample(data, p.x, p.z);
      if (d < 0) water = true;
      if (water && d >= 10 && !outer) outer = radius;
      if (outer && d >= 32) { end = radius; break; }
    }
    if (!outer) throw new Error('Bridge landing not found: '+id);
    if (!end) end=limit;
    if(id==='north')end=outer+4;
    const landing=point(angle,end);
    const bridgeAsset = assets['city-stone-bridge'];
    // Two complete arches retain the supplied proportions. Fit the total crossing
    // using one uniform scale, rather than stretching a single arch along X.
    // The deck overhangs the end piers. Align the piers/rail posts at 76% of the
    // full width, instead of joining only the outermost deck bounding boxes.
    const spans=id==='north'?1:2, bridgeScale=Math.max(1.35,(outer-inner)/(bridgeAsset.width*(.98+(spans-1)*.76)));
    const spanLength=bridgeAsset.width*.76*bridgeScale,totalLength=bridgeAsset.width*.98*bridgeScale+(spans-1)*spanLength;
    const start=(inner+outer-totalLength)/2,finish=start+totalLength;
    const bridge = { id, outward, tangent, from: r-12, start, end:finish, to: end,
      halfWidth: 2.1*bridgeScale, visualHalfWidth: bridgeAsset.depth*bridgeScale/2, deck: CITY_DECK_HEIGHT,scale:bridgeScale,spans,
      endHeight:id==='north'?CITY_DECK_HEIGHT:sample(data,landing.x,landing.z,'heights') };
    bridges.push(bridge);
    for(let span=0;span<spans;span++){
      const p=point(angle,start+bridgeAsset.width*.49*bridgeScale+span*spanLength);
      instances.push({ model:'city-stone-bridge', ...p, y:CITY_DECK_HEIGHT-bridgeAsset.deck[32][1]*bridgeScale+span*.006,
        yaw:angle-Math.PI/2, sx:bridgeScale, sy:bridgeScale, sz:bridgeScale });
    }
  }
  const outline = [];
  const normalizedAngle = p => (Math.atan2(p.x,p.z)+Math.PI*2)%(Math.PI*2);
  for (let i=0;i<64;i++) {
    const angle=i*Math.PI*2/64, p=point(angle,radialBoundary(data,angle,26));
    if (gates.some(g=>Math.abs(dot({x:p.x-g.x,z:p.z-g.z},g.tangent)) < g.half+18
      && Math.abs(dot({x:p.x-g.x,z:p.z-g.z},g.outward))<24)) continue;
    outline.push({...p, angle});
  }
  for (const g of gates) for (const sign of [-1,1]) {
    for(const [distance,gate]of [[g.joinHalf,g.id],[g.half+12,undefined]]){
      const p={x:g.x+g.tangent.x*distance*sign+g.outward.x*g.joinDepth,z:g.z+g.tangent.z*distance*sign+g.outward.z*g.joinDepth};
      outline.push({...p,angle:normalizedAngle(p),gate,gateJoin:true});
    }
  }
  outline.sort((a,b)=>a.angle-b.angle);
  for (let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    if(a.gate&&a.gate===b.gate)continue;
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),model=i%4===0?'city-wall-banner':'city-wall';
    const scale=1.4,width=assets[model].width*scale,depth=assets[model].depth*scale;
    const count=Math.max(1,Math.ceil(length/(width-3.5)));
    for(let j=0;j<count;j++){
      const t=(j+.5)/count,x=a.x+dx*t,z=a.z+dz*t;
      const yaw=Math.atan2(-dz,dx);
      instances.push({model,x,z,y:CITY_DECK_HEIGHT-.5,yaw,sx:scale,sy:scale,sz:scale});
      walls.push({x,z,yaw,half:width/2,depth:depth/2});
    }
    if(i%5===0&&!a.gateJoin&&!gates.some(g=>Math.hypot(a.x-g.x,a.z-g.z)<g.half+12)){
      towers.push({x:a.x,z:a.z,radius:5.7});
      instances.push({model:'city-watchtower',x:a.x,z:a.z,y:sample(data,a.x,a.z,'heights')-.4,yaw:a.angle,sx:1,sy:1,sz:1});
    }
  }
  const layout={instances,walls,towers,gates,bridges};cache.set(data,layout);return layout;
}

export function fortificationSurface(data,x,z,margin=0) {
  for(const b of createFortifications(data).bridges){
    const p={x,z},along=dot(p,b.outward),across=dot(p,b.tangent)-(b.lateral??0);
    if(along>=b.from&&along<=b.to&&Math.abs(across)<=b.halfWidth-margin)
      return along>b.end?CITY_DECK_HEIGHT+(b.endHeight-CITY_DECK_HEIGHT)*(along-b.end)/(b.to-b.end):CITY_DECK_HEIGHT;
  }
  return undefined;
}
export function isFortificationClear(data,x,z,padding=0){
  const f=createFortifications(data);
  for(const w of f.walls){
    const dx=x-w.x,dz=z-w.z,c=Math.cos(w.yaw),s=Math.sin(w.yaw);
    if(Math.abs(dx*c-dz*s)<=w.half+padding&&Math.abs(dx*s+dz*c)<=w.depth+padding)return false;
  }
  for(const t of f.towers)if(Math.hypot(x-t.x,z-t.z)<=t.radius+padding)return false;
  for(const g of f.gates){
    const p={x:x-g.x,z:z-g.z},across=Math.abs(dot(p,g.tangent)),along=Math.abs(dot(p,g.outward));
    if(along<=g.depth+padding&&across<=g.half+padding&&across>=g.passage-padding)return false;
  }
  // Bridge rails and their bases are solid; only the central deck is walkable.
  for(const b of f.bridges){
    const p={x,z},along=dot(p,b.outward),across=Math.abs(dot(p,b.tangent)-(b.lateral??0));
    if(along>=b.start-padding&&along<=b.end+padding&&across>=b.halfWidth-padding&&across<=b.visualHalfWidth+padding)return false;
  }
  return true;
}
export function isFortificationPlantingClear(data,x,z,padding=0){
  if(!isFortificationClear(data,x,z,padding+3))return false;
  for(const b of createFortifications(data).bridges){
    const p={x,z},along=dot(p,b.outward);
    if(along>b.from-12&&along<b.to+12&&Math.abs(dot(p,b.tangent)-(b.lateral??0))<12+padding)return false;
  }
  return true;
}

/** Cut small raised bank patches below the stone approaches; leave the river intact. */
export function fitFortificationApproaches(data){
  const layout=createFortifications(data),step=500/(data.side-1);
  for(let row=0;row<data.side;row++)for(let col=0;col<data.side;col++){
    const i=row*data.side+col;if(data.shoreDistance[i]<0)continue;
    const p={x:col*step-250,z:row*step-250};
    for(const b of layout.bridges){
      const along=dot(p,b.outward),across=Math.abs(dot(p,b.tangent)-(b.lateral??0));
      if(along<b.from||along>b.to||(along>b.start&&along<b.end)||across>b.halfWidth+1)continue;
      const surface=along>b.end?b.deck+(b.endHeight-b.deck)*(along-b.end)/(b.to-b.end):b.deck;
      const weight=Math.min(1,Math.max(0,(b.halfWidth+1-across)/.6));
      data.heights[i]-=Math.max(0,data.heights[i]-surface-.01)*weight;
    }
  }
}
