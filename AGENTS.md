# Mythraven Online — project instructions

## Scope
- Phaser + TypeScript game. Keep work within the user's requested scope.
- Local setup is established. Do not infer authorization to publish, push, deploy, or add cloud services.
- Current procedural WorldScene art is a technical placeholder, not the visual style reference.

## Mandatory art workflow
Before creating, editing, selecting, or integrating any game image, read:
1. ART_STYLE.md (current user-supplied visual guide and asset registry)
2. docs/art/ART_BIBLE.md
3. docs/art/ASSET_SPEC.md
4. docs/art/PROMPT_TEMPLATES.md

ART_STYLE.md is authoritative for new art: Soft Painted Fantasy 2D. It supersedes conflicting older MR-ART-v1 visual defaults. Existing images keep their historical metadata; do not relabel them as compliant or approved without review. See docs/art/STYLE_MIGRATION.md.
Use the shared prompt block plus the relevant asset template, and attach actual available reference images. Never claim a reference was used if it was not attached.
The user-provided screenshots establish direction, not approved Mythraven character designs. See docs/art/references/README.md.
Until an approved project master exists, produce a clearly labelled candidate from the documented defaults; do not invent an approval or a completed reference file.
A concept sheet or AI-generated grid is not automatically a production sprite sheet. Validate dimensions, alpha, frame order, feet alignment, identity and animation in-game before marking runtime-ready.
Keep the current source outputs and prompt/metadata records under art/source; copy only validated exports to public/assets. Never point game code at temp files.
After each asset replacement, audit references and remove superseded or unused game images and obsolete exporters after validation (explicit owner instruction, 2026-10-14). Keep only active source dependencies and intentional art references; record removals and do not delete assets solely because a dynamic reference was missed. This cleanup rule supersedes blanket retention of obsolete generated images.
For new work follow ART_STYLE.md versioned candidates and unversioned approved outputs. This latest user guide supersedes the earlier no-version rule. Existing runtime filenames remain unchanged until a requested replacement. A user-requested style change must update the shared specifications and identify affected assets.
Use the available image-generation skill/tool for raster generation/editing. Exact export dimensions below describe finished assets, not guaranteed generation-tool output sizes.
Do not generate art merely because the rules are being edited. Rules alone do not authorize generating a complete asset library.

The guide names GPT Image 2.5; use only a verified available image tool/model and record the actual tool used. Do not claim an unavailable model was selected.
