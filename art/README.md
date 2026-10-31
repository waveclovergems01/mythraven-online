# Artwork kept in this repository

The game loads finished images from public/assets. The character masters are the shipped idle, W/E walk, SW/SE walk and NW/NE walk atlases in public/assets/characters; no separate character source archive is retained.

The following originals remain under source because maintained exporters need them:

| Sources | Exporter |
| --- | --- |
| maps/capital-layout.png | export-capital-map.mjs (coverage/shoreline masks, not stretched surface art) |
| tiles/mythraven-granite/original-v001.png | export-mythraven-fountain.mjs |
| tiles/mythraven-water/original-v001.png | export-mythraven-water.mjs |
| props/mythraven-fountain/round-v003/original.png and fx/fountain-tiered/original-v001.png | export-tiered-fountain.mjs |
| ui/cursors/cursor-{default,pointer}.png | export-cursors.mjs |
| ui/favicon/original.png | export-favicon.mjs |
| ui/login/{login-background,login-frame,mythraven-logo}.png | export-login-art.mjs |

New generation drafts may live temporarily in ignored art/.scratch. After review and integration, delete them, including intermediate PNGs, GIFs, HTML previews, proof images, metadata and one-off scripts. Browser-test output goes to ignored test-results. Do not copy runtime atlases back here or keep historical revisions by default. See docs/art/cleanup-2026-10-19.json for this cleanup record.

Re-audit 2026-10-31: the previous town background and grass/paving source originals and their two exporters are superseded. The capital layout is the maintained input for map masks; the finished repeating dirt, grass and brick PNGs are the reusable material masters. No full-resolution bitmap of the whole world is retained. See docs/art/cleanup-capital-2026-10-31.json. Unrelated unintegrated character handoffs in scratch remain outside this cleanup's scope. The permanent character motion reference below remains intentional.

## Permanent character motion reference

[Novice male sprite control reference](references/novice-male-sprite-control-reference.png) is intentionally retained at the owner's request (2026-10-19). It is not temporary output and must survive routine cleanup. Use it for anatomical left/right and gait, together with the actual runtime idle/walk atlases for appearance.

Pose B correction: the forward leg (screen-left) is the character's RIGHT, with red label/arrow/bones; the rear leg (screen-right) is the character's LEFT, with blue label/arrow/bones. Only this annotation region was edited; it is not a runtime sprite. The original is in the owner's Downloads; only the corrected reference is stored here.

Pose A arm correction: the annotated figure now matches its clean view: RIGHT arm forward (screen-left, red); LEFT arm back (screen-right, blue). Arm callouts and bone chains match those positions. Pose A's LEFT leg remains forward and RIGHT leg back. The same permanent reference file is updated in place; no extra image copies are kept.

Pose A artwork follow-up: the earlier annotation-only edit was insufficient. The current figure uses the clean-view arm silhouette: near left sleeve/glove trails behind the torso, far right forearm emerges beneath the chest. No exposed red upper-arm chain is drawn over the chest. The chart remains a visual reference, not a pixel-identical duplicate of the inset.

Castle integration2026-10-31: public/assets/props/castle/mythraven-castle.png and mythraven-castle-flag.png are the maintained runtime originals. No duplicate source or permanent castle exporter is retained. Superseded castle previews, placement-reference copy, generation records and temporary export script removed after in-game validation; see docs/art/cleanup-castle-2026-10-31.json. Other character handoffs and permanent anatomical reference remain untouched.

Fortification integration2026-10-31: the three PNGs in public/assets/props/fortifications are maintained runtime masters. Granite decking reuses the active terrain tile; shared/fortifications.mjs supplies layout/collision to rendering and the maintained map-mask exporter. No separate original archive or one-off sprite exporter is retained after validation. See docs/art/cleanup-fortifications-2026-10-31.json. Historical island-only navigation notes are superseded by the three walkable river crossings.
