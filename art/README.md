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
