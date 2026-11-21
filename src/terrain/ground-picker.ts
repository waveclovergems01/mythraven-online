import * as THREE from 'three';

/** Pick the original heightfield triangles, using tile bounds to skip distant faces. */
export function createGroundPicker(geometry: THREE.BufferGeometry, segments: number) {
  const vertices = geometry.getAttribute('position');
  const stride = segments + 1;
  const tileSize = 16;
  const tiles: {x: number; z: number; xmax: number; zmax: number; bounds: THREE.Box3}[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  for (let z = 0; z < segments; z += tileSize) {
    for (let x = 0; x < segments; x += tileSize) {
      const xmax = Math.min(x + tileSize, segments), zmax = Math.min(z + tileSize, segments);
      const bounds = new THREE.Box3();
      for (let row = z; row <= zmax; row++)
        for (let col = x; col <= xmax; col++) bounds.expandByPoint(a.fromBufferAttribute(vertices, row * stride + col));
      tiles.push({x, z, xmax, zmax, bounds});
    }
  }
  const hit = new THREE.Vector3(), nearest = new THREE.Vector3(), normal = new THREE.Vector3();
  return (ray: THREE.Ray) => {
    let best = Infinity;
    const consider = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => {
      if (!ray.intersectTriangle(p, q, r, true, hit)) return;
      const distance = ray.origin.distanceToSquared(hit);
      if (distance < best) {
        best = distance; nearest.copy(hit);
        THREE.Triangle.getNormal(p, q, r, normal);
      }
    };
    for (const tile of tiles) {
      if (!ray.intersectsBox(tile.bounds)) continue;
      for (let z = tile.z; z < tile.zmax; z++) {
        for (let x = tile.x; x < tile.xmax; x++) {
          const i = z * stride + x;
          a.fromBufferAttribute(vertices, i); b.fromBufferAttribute(vertices, i + stride);
          c.fromBufferAttribute(vertices, i + stride + 1); d.fromBufferAttribute(vertices, i + 1);
          consider(a,b,d); consider(b,c,d);
        }
      }
    }
    return best < Infinity ? {point: nearest.clone(), normal: normal.clone()} : undefined;
  };
}
