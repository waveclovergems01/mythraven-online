# Mythraven Online — project instructions

## Scope
- Phaser + TypeScript game. Keep work within the user's requested scope.
- Local setup is established. Do not infer authorization to publish, push, deploy, or add cloud services.
- Current procedural WorldScene art is a technical placeholder, not the visual style reference.

## Mandatory art workflow
Before creating, editing, selecting, or integrating any game image, read:
1. docs/art/ART_BIBLE.md
2. docs/art/ASSET_SPEC.md
3. docs/art/PROMPT_TEMPLATES.md

All character, monster, map, prop, equipment, item, skill, VFX and UI art must follow style ID MR-ART-v1. Do not improvise a separate style for a new asset.
Use the shared prompt block plus the relevant asset template, and attach actual available reference images. Never claim a reference was used if it was not attached.
The user-provided screenshots establish direction, not approved Mythraven character designs. See docs/art/references/README.md.
Until an approved project master exists, produce a clearly labelled candidate from the documented defaults; do not invent an approval or a completed reference file.
A concept sheet or AI-generated grid is not automatically a production sprite sheet. Validate dimensions, alpha, frame order, feet alignment, identity and animation in-game before marking runtime-ready.
Keep original generated outputs and prompt/metadata records under art/source; copy only validated exports to public/assets. Never point game code at temp files.
Never silently overwrite an existing asset. Use a new revision. A user-requested style change must update the shared specifications and identify affected assets.
Use the available image-generation skill/tool for raster generation/editing. Exact export dimensions below describe finished assets, not guaranteed generation-tool output sizes.
Do not generate art merely because the rules are being edited. Rules alone do not authorize generating a complete asset library.
