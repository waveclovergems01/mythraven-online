import * as THREE from 'three';
import { TERRAIN, type TerrainData } from './terrain-data';
import { createGroundMaterial, createRiverMaterial, terrainGrassCoverage, type TerrainTiles } from './terrain-materials';

export function createTerrain(data: TerrainData, tiles: TerrainTiles): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(TERRAIN.size, TERRAIN.size, TERRAIN.segments, TERRAIN.segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, data.heights[i]);
  }
  const grass = terrainGrassCoverage(data);
  geometry.setAttribute('grassWeight', new THREE.BufferAttribute(grass.weights, 1));
  geometry.setAttribute('shoreDistance', new THREE.BufferAttribute(data.shoreDistance, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material = createGroundMaterial(tiles);
  const land = new THREE.Mesh(geometry, material);
  land.name = 'continuous-terrain';
  land.userData.grassCoverage = grass.coverage;
  group.add(land);

  // A cut earth edge makes the relief legible when inspecting the whole terrain.
  const edge: number[] = [], n = data.side;
  for (let x = 0; x < n; x++) edge.push(x);
  for (let z = 1; z < n; z++) edge.push(z * n + n - 1);
  for (let x = n - 2; x >= 0; x--) edge.push((n - 1) * n + x);
  for (let z = n - 2; z > 0; z--) edge.push(z * n);
  const skirtVertices: number[] = [], skirtColors: number[] = [], indices: number[] = [];
  const earth = new THREE.Color('#8d795c'), bottom = new THREE.Color('#635b48');
  edge.forEach((index, i) => {
    const x = positions.getX(index), z = positions.getZ(index);
    skirtVertices.push(x, data.heights[index], z, x, TERRAIN.baseLevel, z);
    earth.toArray(skirtColors, i * 6); bottom.toArray(skirtColors, i * 6 + 3);
    const a = i * 2, b = ((i + 1) % edge.length) * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  });
  const skirt = new THREE.BufferGeometry();
  skirt.setAttribute('position', new THREE.Float32BufferAttribute(skirtVertices, 3));
  skirt.setAttribute('color', new THREE.Float32BufferAttribute(skirtColors, 3));
  skirt.setIndex(indices); skirt.computeVertexNormals();
  group.add(new THREE.Mesh(skirt, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, side: THREE.DoubleSide,
  })));
  return group;
}

export function createWater(data: TerrainData): { mesh: THREE.Mesh; update: (time: number) => void } {
  const geometry = new THREE.PlaneGeometry(TERRAIN.size, TERRAIN.size);
  geometry.rotateX(-Math.PI / 2);
  const water = createRiverMaterial(data);
  const mesh = new THREE.Mesh(geometry, water.material);
  mesh.name = 'river-water'; mesh.position.y = TERRAIN.waterLevel;
  return { mesh, update: water.update };
}
