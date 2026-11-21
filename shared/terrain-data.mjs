import { fitFortificationApproaches } from './terrain-fortifications.mjs';
import {fitCityFoundations} from './city-layout.mjs';
/** Terrain units are metres by convention; legacy pixel coordinates stay separate. */
export const TERRAIN = {
    size: 500,
    segments: 384,
    layoutWidth: 1448,
    layoutHeight: 1086,
    layoutDepth: 375,
    waterLevel: 0,
    bedLevel: -6,
    landLevel: 3.5,
    plateauRise: 1.4,
    plateauStart: 12,
    plateauFull: 32,
    baseLevel: -13,
    shoreline: '/assets/maps/mythraven-land.png',
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function smoothstep(a, b, value) {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
}
/** The old 4:3 ground plan fits without stretching inside the square terrain. */
export function layoutToWorld(x, y) {
    return { x: (x / TERRAIN.layoutWidth - .5) * TERRAIN.size,
        z: (y / TERRAIN.layoutHeight - .5) * TERRAIN.layoutDepth };
}
export function groundVariation(x, z) {
    return Math.sin(x * .037 + Math.sin(z * .023) * 1.7) * .45
        + Math.cos(z * .049 - x * .021) * .3 + Math.sin(x * .14 + z * .11) * .07;
}
/** Two chamfer passes give smooth banks on both sides of the actual old shoreline. */
function distanceTo(mask, side, target) {
    const d = Float32Array.from(mask, value => value === target ? 0 : 1e6);
    const diagonal = Math.SQRT2;
    for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++) {
            const i = y * side + x;
            if (x)
                d[i] = Math.min(d[i], d[i - 1] + 1);
            if (y)
                d[i] = Math.min(d[i], d[i - side] + 1);
            if (x && y)
                d[i] = Math.min(d[i], d[i - side - 1] + diagonal);
            if (x < side - 1 && y)
                d[i] = Math.min(d[i], d[i - side + 1] + diagonal);
        }
    for (let y = side - 1; y >= 0; y--)
        for (let x = side - 1; x >= 0; x--) {
            const i = y * side + x;
            if (x < side - 1)
                d[i] = Math.min(d[i], d[i + 1] + 1);
            if (y < side - 1)
                d[i] = Math.min(d[i], d[i + side] + 1);
            if (x < side - 1 && y < side - 1)
                d[i] = Math.min(d[i], d[i + side + 1] + diagonal);
            if (x && y < side - 1)
                d[i] = Math.min(d[i], d[i + side - 1] + diagonal);
        }
    return d;
}
export function buildTerrainData(image) {
    const side = TERRAIN.segments + 1, step = TERRAIN.size / TERRAIN.segments;
    const mask = new Uint8Array(side * side);
    for (let row = 0; row < side; row++)
        for (let col = 0; col < side; col++) {
            const x = clamp(Math.round(col / TERRAIN.segments * (image.width - 1)), 0, image.width - 1);
            // Extend boundary terrain into the 62.5 m margins, including river exits.
            const v = ((row / TERRAIN.segments - .5) * TERRAIN.size) / TERRAIN.layoutDepth + .5;
            const y = clamp(Math.round(v * (image.height - 1)), 0, image.height - 1);
            mask[row * side + col] = Number(image.data[(y * image.width + x) * 4 + 3] >= 128);
        }
    const toWater = distanceTo(mask, side, 0), toLand = distanceTo(mask, side, 1);
    const heights = new Float32Array(mask.length), shoreDistance = new Float32Array(mask.length);
    for (let row = 0; row < side; row++)
        for (let col = 0; col < side; col++) {
            const i = row * side + col, x = col * step - 250, z = row * step - 250;
            const distance = (mask[i] ? toWater[i] - .5 : .5 - toLand[i]) * step;
            shoreDistance[i] = distance;
            const land = smoothstep(-5.5, 4.5, distance);
            // Central ground stays gently graded; outskirts have slightly more relief.
            const outskirts = smoothstep(150, 235, Math.max(Math.abs(x), Math.abs(z)));
            const original = TERRAIN.bedLevel + (TERRAIN.landLevel - TERRAIN.bedLevel) * land
                + groundVariation(x, z) * (1 + outskirts * 2.2) * smoothstep(4, 15, distance);
            // Set back from both riverbanks: a gentle shoulder rises to one level
            // foundation across the city and outer land, ready for future walls.
            // Keep the channel and immediate bank untouched; remove inland bumps.
            const raised = smoothstep(TERRAIN.plateauStart, TERRAIN.plateauFull, distance);
            heights[i] = original * (1 - raised) + (TERRAIN.landLevel + TERRAIN.plateauRise) * raised;
        }
    const data={ heights, shoreDistance, side };
    fitFortificationApproaches(data);
    fitCityFoundations(data);
    return data;
}
