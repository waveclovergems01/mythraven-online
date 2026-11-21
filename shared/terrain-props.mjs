import { isFortificationPlantingClear } from './terrain-fortifications.mjs';
import {isCityPlantingClear} from './city-layout.mjs';
import {FIELD_LIMIT,FIELD_PORTAL,trailZ} from './west-march.mjs';
export const TREE_MODELS = [
  { id: 'oak', url: '/assets/models/trees/tree-oak-green.glb', height: 9, radius: 1.05, scaleMin: 1.3, scaleMax: 1.95 },
  { id: 'pine', url: '/assets/models/trees/tree-pine-green.glb', height: 11, radius: .85, scaleMin: 1.25, scaleMax: 1.85 },
  { id: 'palm', url: '/assets/models/trees/tree-coconut-palm.glb', height: 10, radius: .9, scaleMin: 1.6, scaleMax: 2.3 },
];
const MAX_TRUNK_RADIUS = Math.max(...TREE_MODELS.map(model => model.radius * model.scaleMax));
const placementsCache = new WeakMap(), collisionCache = new WeakMap();
/** Seeded, irregular groves along the marked inner ring and outer river land. */
export function createTreePlacements(data) {
  if (placementsCache.has(data)) return placementsCache.get(data);
  const side = data.side, cell = 500 / (side - 1);
  if (data.area === 'west-march') {
    const trees = [];
    let seed = 91387;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 3900; i++) {
      const x = random() * 494 - 247, z = random() * 494 - 247;
      const shore = data.shoreDistance[Math.round((z+250)/cell)*side + Math.round((x+250)/cell)];
      const edge=Math.max(Math.abs(x),Math.abs(z));
      if (shore < 7 || (edge < FIELD_LIMIT && Math.abs(z-trailZ(x)) < 9) ||
        Math.hypot(x-FIELD_PORTAL.x,z-FIELD_PORTAL.z)<13 || !isFortificationPlantingClear(data,x,z,2)) continue;
      const wooded = Math.sin(x/29) + Math.cos(z/23) > .65 || edge > FIELD_LIMIT-4;
      if (!wooded && random() < .91 || trees.some(p => Math.hypot(p.x-x,p.z-z) < 9)) continue;
      const model = random() < .63 ? 0 : 1, scale = 1 + random() * .7;
      trees.push({id:'march-tree-'+i,x,z,model,scale,yaw:random()*Math.PI*2,
        radius:TREE_MODELS[model].radius*scale,region:'west-march'});
    }
    placementsCache.set(data, trees); return trees;
  }
  // The central land component stays open inside the perimeter grove.
  const city = new Uint8Array(side * side), queue = new Int32Array(city.length);
  const seed = Math.floor(side / 2) * side + Math.floor(side / 2);
  let head = 0, tail = 1; queue[0] = seed; city[seed] = 1;
  while (head < tail) {
    const i = queue[head++], x = i % side, z = Math.floor(i / side);
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, nz = z + dz, ni = nz * side + nx;
      if (nx < 0 || nz < 0 || nx >= side || nz >= side || city[ni] || data.shoreDistance[ni] < 6) continue;
      city[ni] = 1; queue[tail++] = ni;
    }
  }
  let randomState = 0x4d595448;
  const random = () => { randomState |= 0; randomState = randomState + 0x6d2b79f5 | 0;
    let t = Math.imul(randomState ^ randomState >>> 15, 1 | randomState);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const result = [], counts = [0, 0], limits = [450, 200];
  for (let attempt = 0; attempt < 50000 && result.length < 650; attempt++) {
    const x = random() * 484 - 242, z = random() * 484 - 242;
    const i = Math.round((z + 250) / cell) * side + Math.round((x + 250) / cell);
    const inner = city[i] ? 1 : 0, d = data.shoreDistance[i];
    if (counts[inner] >= limits[inner] || d < (inner ? 14 : 7.5) || (inner && d > 50)) continue;
    // Dense outer woodland, closer inner groves, with a small safe arrival clearing.
    if (Math.hypot(x, z - 126) < 12) continue;
    if (!isFortificationPlantingClear(data,x,z,MAX_TRUNK_RADIUS)) continue;
    if (!isCityPlantingClear(data,x,z,MAX_TRUNK_RADIUS)) continue;
    const spacing = (inner ? 7.5 : 6) + random() * 2.5;
    if (result.some(p => Math.hypot(x - p.x, z - p.z) < spacing)) continue;
    const model = Math.floor(random() * TREE_MODELS.length), species = TREE_MODELS[model];
    // One seeded size draw preserves the existing locations/yaws across this size change.
    // Uniform scaling keeps trunks and crowns proportional; palms stand especially tall.
    const scale = species.scaleMin + random() * (species.scaleMax - species.scaleMin);
    result.push({ id: `grove-${result.length}`, x, z, model, scale, yaw: random() * Math.PI * 2,
      radius: TREE_MODELS[model].radius * scale, region: inner ? 'city-ring' : 'outer-bank' });
    counts[inner]++;
  }
  placementsCache.set(data, result); return result;
}

/** Same trunk proxies on server and client; canopies never block walking. */
export function isTreeCellClear(data, x, z, size, padding) {
  let buckets = collisionCache.get(data);
  if (!buckets) {
    buckets = new Map();
    for (const tree of createTreePlacements(data)) {
      const key = `${Math.floor(tree.x / 16)},${Math.floor(tree.z / 16)}`;
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(tree);
    }
    collisionCache.set(data, buckets);
  }
  const margin = padding + MAX_TRUNK_RADIUS;
  for (let row = Math.floor((z - margin) / 16); row <= Math.floor((z + size + margin) / 16); row++)
    for (let col = Math.floor((x - margin) / 16); col <= Math.floor((x + size + margin) / 16); col++)
      for (const tree of buckets.get(`${col},${row}`) ?? []) {
        const nearX = Math.max(x, Math.min(x + size, tree.x)), nearZ = Math.max(z, Math.min(z + size, tree.z));
        if (Math.hypot(nearX - tree.x, nearZ - tree.z) <= tree.radius + padding) return false;
      }
  return true;
}
