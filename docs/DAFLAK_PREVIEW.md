# Daflak local preview

The viewport fills the browser. Movement cells display at 32 x 28 CSS pixels; the camera follows the player at zoom 0.5. World bounds are approximately two entry viewport widths by three heights and stay fixed until leaving the scene. Resize changes the visible area, not world size. The minimap shows the same terrain, player position and actual camera rectangle.

Grass is the base layer. Small cobblestones form roads and diagonal approaches; larger flagstones form a vertically compressed central patio (352 x 231 CSS pixels). Grass detail now caps the oversized flowers; 512px exports preserve source detail. The lawn uses plain fixed-orientation tiling without rotated or blended patches. Irregular grass patches overlap exposed paving edges, while junction interiors stay clear. Decorative overlap does not block movement.

All land is walkable; water is blocked except the four aligned bridge corridors. Bridge facades are procedural placeholders. Buildings, fountain and other depth-sorted props are not part of the ground artwork. Current materials are local preview candidates, not an approved art master.

Terrain sources and provenance: `art/source/tiles/daflak-ground` and `art/source/tiles/daflak-water-bank`. Runtime materials: `public/assets/tiles/daflak-*.png`. Re-export using `node scripts/export-daflak-materials.mjs`. Textures repeat instead of stretching; cached chunks render at native screen resolution.

Favicon source: `art/source/ui/favicon`; re-export using `node scripts/export-favicon.mjs`. UI and cursor originals remain under `art/source/ui/login` and `art/source/ui/cursors`.

Per user request, active images use stable filenames, and superseded map concepts/material images have been removed. Current source atlases and their attached generation references remain for reproducible exports; unused quadrants of the water/bank atlas are not exported.

Northern castle reservation: rectangular flagstone court centered on the north approach, joined to the ring road. Paving only, fully walkable until separate castle props/collision are authored. Grass uses a single fixed-orientation pattern at 460.8 x 403.2 CSS pixels. No rotated, feathered, mixed-scale lawn overlays.

Water is a separate two-layer animated TileSprite beneath transparent ground chunks. Mirrored edge pixels remove hard repeat seams; layers use different scales, offsets and slow drift to soften repetition. Existing water art is reused, not a generated sprite sheet. Ground, bridges and collision stay static; minimap remains a still overview. Runtime water textures/listeners are released on scene shutdown.

Current grass uses a standalone regenerated source in art/source/tiles/daflak-grass: plain grass blades only, no baked flowers or clover. Export stays 512 x 512 and world scale is unchanged. The older atlas now supplies only paving and plaza.

Grass/detail separation: current grass is flower-free, with blades displayed 50% larger. Three transparent 128px flower exports (yellow wildflowers, clover, tulips) from art/source/props/daflak-flowers are drawn as seeded decorative clusters, 22-36 CSS px wide. Whole footprints exclude roads, court and water. They remain walkable low ground decals, not collision props; positions persist across reentry at the same world size. Export with node scripts/export-daflak-flowers.mjs.
