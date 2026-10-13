# Current art integration

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
