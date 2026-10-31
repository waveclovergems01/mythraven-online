/** Repeats in screen pixels at zoom 0.5, independent of the world's extent. */
export const TERRAIN_MATERIALS = {
 dirt: {key:'town-dirt',repeatX:256,repeatY:224},
 grass: {key:'town-grass',repeatX:256,repeatY:224},
 paving: {key:'town-paving',repeatX:192,repeatY:168},
 granite: {key:'town-granite',repeatX:128,repeatY:112},
} as const;
