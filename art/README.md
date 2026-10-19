# Artwork kept in this repository

The game loads finished images from public/assets. The character masters are the shipped idle, W/E walk and SW/SE walk atlases in public/assets/characters; no separate character source archive is retained.

Only 13 original images remain under source because maintained exporters still need them:

| Sources | Exporter |
| --- | --- |
| maps/mythraven-town/mythraven-town-sand-v004.png | export-mythraven-town.mjs |
| tiles/painted-town-v004/{grass,paving}-source.png | export-painted-town.mjs / export-mythraven-town.mjs |
| tiles/mythraven-granite/original-v001.png | export-mythraven-fountain.mjs |
| tiles/mythraven-water/original-v001.png | export-mythraven-water.mjs |
| props/mythraven-fountain/round-v003/original.png and fx/fountain-tiered/original-v001.png | export-tiered-fountain.mjs |
| ui/cursors/cursor-{default,pointer}.png | export-cursors.mjs |
| ui/favicon/original.png | export-favicon.mjs |
| ui/login/{login-background,login-frame,mythraven-logo}.png | export-login-art.mjs |

New generation drafts may live temporarily in ignored art/.scratch. After review and integration, delete them, including intermediate PNGs, GIFs, HTML previews, proof images, metadata and one-off scripts. Browser-test output goes to ignored test-results. Do not copy runtime atlases back here or keep historical revisions by default. See docs/art/cleanup-2026-10-19.json for this cleanup record.

## Permanent character motion reference

[Novice male sprite control reference](references/novice-male-sprite-control-reference.png) is intentionally retained at the owner's request (2026-10-19). It is not temporary output and must survive routine cleanup. Use it for anatomical left/right and gait, together with the actual runtime idle/walk atlases for appearance.

Pose B correction: the forward leg (screen-left) is the character's RIGHT, with red label/arrow/bones; the rear leg (screen-right) is the character's LEFT, with blue label/arrow/bones. Only this annotation region was edited; it is not a runtime sprite. The original is in the owner's Downloads; only the corrected reference is stored here.

Pose A arm correction: the annotated figure now matches its clean view: RIGHT arm forward (screen-left, red); LEFT arm back (screen-right, blue). Arm callouts and bone chains match those positions. Pose A's LEFT leg remains forward and RIGHT leg back. The same permanent reference file is updated in place; no extra image copies are kept.

Pose A artwork follow-up: the earlier annotation-only edit was insufficient. The current figure uses the clean-view arm silhouette: near left sleeve/glove trails behind the torso, far right forearm emerges beneath the chest. No exposed red upper-arm chain is drawn over the chest. The chart remains a visual reference, not a pixel-identical duplicate of the inset.
