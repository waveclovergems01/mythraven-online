import {SCENERY_EXTENSION} from './world-surroundings';
import * as THREE from 'three';
import { TERRAIN, type TerrainData } from './terrain-data';
import { createGroundMaterial, createRiverMaterial, terrainGrassCoverage, type TerrainTiles } from './terrain-materials';
import {createCityLayout,roadDistance} from '../../shared/city-layout.mjs';
import {trailZ} from '../../shared/west-march.mjs';

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
  const city=createCityLayout(data),paving=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i);
    if (data.area === 'west-march') {
      grass.weights[i] *= THREE.MathUtils.smoothstep(Math.abs(z-trailZ(x)), 2, 5);
      paving[i*2] = 10;
      continue;
    }
    const gap=Math.min((Math.abs(x)+Math.abs(z)-city.plaza.radius)/Math.SQRT2,...city.roads.map(r=>roadDistance(r,x,z)));
    // Interpolate signed distance, not already-clamped coverage; otherwise the
    // 1.3m terrain grid leaves saw teeth along diagonal streets and plaza edges.
    paving[i*2]=data.shoreDistance[i]>3?gap:10;
  }
  geometry.setAttribute('cityPaving',new THREE.BufferAttribute(paving,2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material = createGroundMaterial(tiles);
  const land = new THREE.Mesh(geometry, material);
  land.castShadow = true; land.receiveShadow = true;
  land.name = 'continuous-terrain';
  land.userData.grassCoverage = grass.coverage;
  // Keep the full grid only for exact ground picking; render spatial tiles instead.
  land.visible=false;group.add(land);
  for(let row=0;row<TERRAIN.segments;row+=32)for(let col=0;col<TERRAIN.segments;col+=32){
    const tile=new THREE.BufferGeometry(),indices:number[]=[],bounds=new THREE.Box3(),point=new THREE.Vector3();
    for(const [name,attribute] of Object.entries(geometry.attributes))tile.setAttribute(name,attribute);
    for(let z=row;z<=Math.min(row+32,TERRAIN.segments);z++)for(let x=col;x<=Math.min(col+32,TERRAIN.segments);x++){
      const a=z*data.side+x;point.fromBufferAttribute(positions,a);bounds.expandByPoint(point);
      if(x<Math.min(col+32,TERRAIN.segments) && z<Math.min(row+32,TERRAIN.segments)){
        const b=a+data.side;indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
    tile.setIndex(indices);tile.boundingBox=bounds;tile.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());
    const mesh=new THREE.Mesh(tile,material);mesh.name='terrain-patch';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }

  return group;
}

export function createWater(data: TerrainData): { mesh: THREE.Mesh; update: (time: number) => void } {
  const geometry = new THREE.PlaneGeometry(TERRAIN.size+2*SCENERY_EXTENSION, TERRAIN.size+2*SCENERY_EXTENSION);
  geometry.rotateX(-Math.PI / 2);
  const water = createRiverMaterial(data);
  const mesh = new THREE.Mesh(geometry, water.material);
  mesh.name = 'river-water'; mesh.position.y = TERRAIN.waterLevel;
  mesh.receiveShadow = true;
  return { mesh, update: water.update };
}
