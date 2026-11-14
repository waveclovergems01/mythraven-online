export * from '../../shared/terrain-data.mjs';
import { TERRAIN, buildTerrainData, type TerrainData } from '../../shared/terrain-data.mjs';

export async function loadTerrainData(): Promise<TerrainData> {
  const image = new Image();
  image.src = TERRAIN.shoreline;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Terrain shoreline could not be read');
  context.drawImage(image, 0, 0);
  return buildTerrainData(context.getImageData(0, 0, canvas.width, canvas.height));
}
