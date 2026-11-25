# Artwork kept in this repository

The game loads finished assets from `public/assets`. Current character models live in `public/assets/models/characters`.

| Source | Maintained exporter and output |
| --- | --- |
| `source/maps/capital-layout.png` | `scripts/export-capital-map.mjs` creates the shoreline mask used by 3D terrain |
| `source/ui/cursors/` | `scripts/export-cursors.mjs` exports the desktop cursor images |
| `source/ui/favicon/original.png` | `scripts/export-favicon.mjs` exports browser and manifest icons |
| `source/ui/login/` | `scripts/export-login-art.mjs` exports the login images and logo |
| `assets/pending/buildings/` from the repository root | `scripts/import-city-buildings.mjs` rebuilds the current city GLBs |

Use ignored `art/.scratch` for temporary art and `test-results` for QA. Remove completed drafts, previews and obsolete exports. The November 2026 cleanup removed the Phaser scene, legacy sprite assets and art drafts. The shoreline and its source remain dependencies of the 3D world.

## Permanent character motion reference

[Novice male sprite control reference](references/novice-male-sprite-control-reference.png) is intentionally retained at the owner's request (2026-10-19). It is not temporary output and must survive routine cleanup. Use it for anatomical left/right and gait. Current appearance comes from the 3D character models.

Pose B correction: the forward leg (screen-left) is the character's RIGHT, with red label/arrow/bones; the rear leg (screen-right) is the character's LEFT, with blue label/arrow/bones. Only this annotation region was edited; it is not a runtime sprite. The original is in the owner's Downloads; only the corrected reference is stored here.

Pose A arm correction: the annotated figure now matches its clean view: RIGHT arm forward (screen-left, red); LEFT arm back (screen-right, blue). Arm callouts and bone chains match those positions. Pose A's LEFT leg remains forward and RIGHT leg back. The same permanent reference file is updated in place; no extra image copies are kept.

Pose A artwork follow-up: the earlier annotation-only edit was insufficient. The current figure uses the clean-view arm silhouette: near left sleeve/glove trails behind the torso, far right forearm emerges beneath the chest. No exposed red upper-arm chain is drawn over the chest. The chart remains a visual reference, not a pixel-identical duplicate of the inset.

