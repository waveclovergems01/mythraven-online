# Artwork kept in this repository

The game loads finished assets from `public/assets`. Current character models live in `public/assets/models/characters`.

| Source | Maintained exporter and output |
| --- | --- |
| `source/ui/cursors/` | `scripts/export-cursors.mjs` exports the desktop cursor images |
| `source/ui/favicon/original.png` | `scripts/export-favicon.mjs` exports browser and manifest icons |
| `source/ui/login/` | `scripts/export-login-art.mjs` exports the login images and logo |
| `assets/pending/buildings/` from the repository root | `scripts/import-city-buildings.mjs` rebuilds the current city GLBs |

Use ignored `art/.scratch` for temporary art and `test-results` for QA. Remove completed drafts, previews and obsolete exports. The November 2026 cleanup removed the Phaser scene, legacy sprite assets and art drafts. The game loads `public/assets/maps/mythraven-land.png` directly. Its legacy layout source and exporter were retired separately along with the old sprite motion chart.
