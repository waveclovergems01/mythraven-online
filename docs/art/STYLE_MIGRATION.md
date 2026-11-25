# Current art integration

> The 2D runtime was retired on 2026-11-25. References in earlier entries to the Phaser scene, sprite atlases and its map layers are historical. See the repository art inventory for active sources.

## City ground moves to 3D — 2026-11-11

The owner requested a ground-only 3D version of the existing town, approximately 500 × 500 units, with river channels. The default scene now uses real heightfield geometry and water; the old plan is preserved without stretching. Warm muted materials and an elevated orthographic camera carry the visual direction forward. Character, prop and login assets keep their existing classifications. No raster approval or complete 3D asset library is implied. The former 2D comparison was retired in November 2026. See [terrain contract and cleanup audit](../TERRAIN_3D.md).

ART_STYLE.md is authoritative; the latest owner corrections override old checker and version-retention defaults.

## Current meadow (2026-10-13)
- Ground: one 512px continuous soft painted grass texture, no checker quadrants. Source and actual builtin imagegen prompts: art/source/tiles/smooth-meadow/grass.
- Earth: transparent 512px grass-fringed worn-earth decal, source in art/source/tiles/smooth-meadow/earth. Both latest user reference sheets are preserved alongside those sources.
- Low cover: clover, leaves and tufts remain in art/source/tiles/continuous-meadow; old grass candidates from that batch are removed.
- Flowers remain separate clustered decorations. Low-cover groups and flower-group frequency are reduced to preserve calm open areas; individual flower patches remain dense.
- Grass and earth export with node scripts/export-meadow.mjs. Other current terrain exports use node scripts/export-daflak-materials.mjs. Runtime filenames are stable under public/assets.
- Existing water, roads, castle court, camera and movement grid remain unchanged. Isometric reference diamonds indicate projection; no diamond border or comparison-sheet grid is baked into runtime grass.
- Candidate artwork has not been declared owner-approved. Actual generator: builtin image_gen.imagegen; no unsupported model label is claimed.
- Superseded checker and dense grass images, their test images and obsolete exporter were removed at the owner's request. Keep only current sources and the current repeat preview.
