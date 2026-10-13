# ART_STYLE.md — Asset Style Guide & Generation Template

> Codex: READ THIS FILE FIRST before generating ANY image for this project.
> Every image must follow the GLOBAL STYLE section so all assets look like they
> belong to the same game. Only the ASSET entry (section 4) changes per image.
> Do not invent new styles. If something is missing, ask or add a new entry
> following the template in section 3.

---

## 1. PROJECT CONTEXT

- Game type: web game (HTML + CSS + JavaScript), 2D, top-down world map
- Visual reference: classic Ragnarok Online 2D feel (soft painterly shading,
  warm friendly colors). Do NOT copy any real RO assets, characters, or logos.
- Image tool: GPT Image 2.5
- Layering: ground tiles (clean, uniform) -> scattered object sprites
  (transparent PNG) -> characters/UI. Ground must never contain objects.

---

## 2. GLOBAL STYLE (applies to EVERY image — never override)

### 2.1 Fixed style tokens
```
STYLE_NAME      = "Soft Painted Fantasy 2D"
CAMERA          = top-down, flat view (ground) / slight 3/4 top-down (objects)
LIGHT_DIRECTION = from top-left, soft, low contrast
SHADOW          = soft, short, to the bottom-right (objects only; none on ground)
OUTLINE         = faint, slightly darker than the fill color (objects only; none on ground)
SHADING         = 2-3 tone soft painterly shading, no hard cel bands, no gradients that look 3D-rendered
SATURATION      = medium-low, warm, friendly (not neon, not gritty)
DETAIL_LEVEL    = low-medium, readable at small size
FORBIDDEN       = text, watermark, UI, logos, photorealism, 3D render look,
                  heavy black outlines, vignette, borders, copyrighted characters
```

### 2.2 Shared color palette (use these families; tweak only within ±10% lightness)
```
GRASS_LIGHT   = #7fb55a
GRASS_DARK    = #72a850
DIRT_LIGHT    = #c9a56b
DIRT_DARK     = #b8935a
SAND_LIGHT    = #e6d3a0
SAND_DARK     = #d9c48c
STONE_LIGHT   = #a9aeb3
STONE_DARK    = #8f959b
WATER_LIGHT   = #6ab7d9
WATER_DARK    = #5aa5c9
SNOW_LIGHT    = #f2f6fa
SNOW_DARK     = #e1e9f0
ACCENT_FLOWER = #f4c542 (yellow), #f08aa8 (pink), #ffffff (white)
```

### 2.3 Shared prompt blocks
Every image prompt = `PROMPT_PREFIX` + asset-specific text + `PROMPT_SUFFIX`.

```
PROMPT_PREFIX:
"2D hand-painted fantasy MMORPG game asset, soft painted style similar to
classic Ragnarok Online, warm friendly medium-low saturation colors, soft
top-left lighting, "

PROMPT_SUFFIX (ground tiles):
", perfectly uniform lighting, flat even surface, no objects, no shadows, no
highlights, no text, no watermark, no vignette, no border, edges match
perfectly for seamless tiling."

PROMPT_SUFFIX (object sprites):
", single isolated object, centered, fully transparent background, faint
darker outline, short soft shadow to the bottom-right, no text, no watermark,
no background."
```

### 2.4 Technical rules
- Ground tiles: square PNG, power of two (default 512x512), must tile seamlessly.
- Object sprites: PNG with real alpha transparency, default 256x256 canvas,
  object centered, ~10% padding.
- Save under `assets/` using the naming scheme in section 5.
- Generate `VARIANTS` versions (default 3) so the owner can pick one.
- Never overwrite an approved asset. New attempts get a new version suffix.

---

## 3. ASSET ENTRY TEMPLATE (copy this to add a new asset)

```
### <ID> — <Short name>
TYPE            = ground | object | decal | edge
FILE_NAME       = <id>_<name>_v1.png
SIZE_PX         = 512
PATTERN         = <e.g. checkerboard 2x2 / solid / scatter-friendly>
COLOR_A         = <hex from palette>
COLOR_B         = <hex from palette>
CONTRAST        = very low | low | medium
TEXTURE_DETAIL  = none | subtle | medium
OUTLINE         = none | faint
VARIANTS        = 3
MUST_HAVE       = <list>
MUST_NOT_HAVE   = <list>
EXTRA_PROMPT    = "<asset-specific words inserted between PREFIX and SUFFIX>"
NOTES           = <anything the owner wants to tweak later>
```

---

## 4. ASSET REGISTRY

### BG-01 — Continuous grass (updated by owner 2026-10-13)
```
TYPE = ground
FILE_NAME = daflak-grass.png
SIZE_PX = 512
PATTERN = single continuous seamless surface; NO checkerboard or quadrants
COLOR_A = GRASS_LIGHT
COLOR_B = GRASS_DARK (subtle intermixed strokes only, never square regions)
CONTRAST = very low
TEXTURE_DETAIL = subtle
VARIANTS = 1 (current replacement only; owner requests no abandoned versions)
MUST_HAVE = smooth soft olive-green lawn, broad calm areas, restrained larger blade marks, matching the two supplied isometric reference sheets; no dense fine noise. Calm blended grass matching the supplied lower-right meadow preview
MUST_NOT_HAVE = grid, alternating squares, flowers, clover, objects, stripes, swirls
EXTRA_PROMPT = "one continuous seamless painted grass surface, evenly mixed greens, fine soft blades, no checkerboard or quadrants"
NOTES = Flower and ground-cover patches are separate decals. Owner correction supersedes the former checker design.
```

### DEC-01 — Low ground cover
```
TYPE = decal
FILE_NAME = dec01_groundcover_<type>_v1.png
SIZE_PX = 256
VARIANTS = 3 (clover, small rounded leaves, short grass)
CONTRAST = low
TEXTURE_DETAIL = subtle
MUST_HAVE = irregular loose low mat, transparent gaps between leaves, sparse outer fringe, no soil base, slight elevated view
MUST_NOT_HAVE = tall shrubs, flower bushes, pedestal, opaque background, rectangular edges
EXTRA_PROMPT = "small ground-hugging foliage patch, soft painted fantasy style, isolated transparent decal"
NOTES = Walkable decoration, scattered in denser and lighter patches with flowers.
```

### BG-02 — Dirt Checker (path / town ground)
```
TYPE            = ground
FILE_NAME       = bg02_dirt_checker_v1.png
SIZE_PX         = 512
PATTERN         = checkerboard 2x2
COLOR_A         = DIRT_LIGHT
COLOR_B         = DIRT_DARK
CONTRAST        = very low
TEXTURE_DETAIL  = subtle
OUTLINE         = none
VARIANTS        = 3
MUST_HAVE       = same checker size and same painterly feel as BG-01
MUST_NOT_HAVE   = pebbles, footprints, cracks, shadows, focal points
EXTRA_PROMPT    = "seamless tileable top-down packed dirt ground texture,
                  checkerboard pattern of two very similar warm brown tones,
                  2x2 squares, subtle painterly speckles"
NOTES           = Must match BG-01 in scale so tiles can sit side by side.
```

### BG-03 — Sand Checker
```
TYPE            = ground
FILE_NAME       = bg03_sand_checker_v1.png
SIZE_PX         = 512
PATTERN         = checkerboard 2x2
COLOR_A         = SAND_LIGHT
COLOR_B         = SAND_DARK
CONTRAST        = very low
TEXTURE_DETAIL  = subtle
OUTLINE         = none
VARIANTS        = 3
MUST_HAVE       = same checker size and painterly feel as BG-01
MUST_NOT_HAVE   = shells, rocks, ripples, shadows, focal points
EXTRA_PROMPT    = "seamless tileable top-down sand ground texture,
                  checkerboard pattern of two very similar pale sand tones,
                  2x2 squares, subtle painterly grain"
NOTES           =
```

### OBJ-01 — Flower Cluster (scatter sprite)
```
TYPE            = object
FILE_NAME       = obj01_flower_cluster_v1.png
SIZE_PX         = 256
PATTERN         = scatter-friendly
COLOR_A         = ACCENT_FLOWER (yellow)
COLOR_B         = GRASS_DARK (leaves)
CONTRAST        = medium
TEXTURE_DETAIL  = subtle
OUTLINE         = faint
VARIANTS        = 3
MUST_HAVE       = 3-5 small flowers with a few leaves, readable at ~32px
MUST_NOT_HAVE   = background, ground patch, text
EXTRA_PROMPT    = "small cluster of 3-5 tiny wildflowers with green leaves,
                  top-down slight 3/4 view"
NOTES           = Make color variants (yellow / pink / white) as separate files:
                  obj01_flower_cluster_yellow_v1.png etc.
```

### (add new assets below using the template in section 3)

---

## 5. NAMING & FOLDER RULES
```
assets/
  ground/    bgXX_<name>_vN.png        <- approved + candidate ground tiles
  objects/   objXX_<name>_vN.png       <- transparent sprites
  _tests/    _tile_test_<id>_vN.png    <- 3x3 seam tests (not for production)
  approved/  copy of the final chosen file, no version suffix
```
- IDs: `BG-` ground, `OBJ-` object, `DEC-` decal, `EDG-` edge/transition tile.
- When the owner approves a variant, copy it to `assets/approved/<id>_<name>.png`.

---

## 6. WORKFLOW CODEX MUST FOLLOW FOR EVERY NEW IMAGE
1. Read this file. Find the asset entry by ID (or create one from section 3).
2. Build the prompt: PROMPT_PREFIX + EXTRA_PROMPT + matching PROMPT_SUFFIX.
3. Generate `VARIANTS` images with GPT Image 2.5. Save with version suffixes.
4. Ground tiles: build a 3x3 tile test image and check for visible seams.
   Fix (offset-blend edges) or regenerate if seams show.
5. Object sprites: verify real transparency (no white/checker background baked in).
6. Run the consistency checklist (section 7). Regenerate anything that fails.
7. Report: list files created, which checklist items passed, and which entry
   fields the owner can edit to change the result.

---

## 7. CONSISTENCY CHECKLIST (every image must pass)
- [ ] Same painterly Ragnarok-like feel as the other approved assets
- [ ] Colors come from the shared palette (±10% lightness)
- [ ] Light comes from top-left; shadows (objects only) go bottom-right
- [ ] Outline rule respected (none on ground, faint on objects)
- [ ] No text, watermark, UI, logo, or copyrighted character
- [ ] Ground tiles: seamless in 3x3 test, uniform, no focal point
- [ ] Ground tiles of different biomes share the same checker scale
- [ ] Objects: transparent background, centered, readable at small size

---

## 8. HOW THE OWNER TWEAKS THINGS
- Change color: edit COLOR_A / COLOR_B in the asset entry (or palette in 2.2
  to change it everywhere).
- Change contrast of the checkerboard: edit CONTRAST.
- Change grass/texture amount: edit TEXTURE_DETAIL.
- Change overall look of ALL assets: edit section 2.1 and 2.3 only.
- Change tile size: edit SIZE_PX (keep power of two, keep all grounds equal).
## Owner correction — 2026-10-13, smooth meadow replacement
The two latest reference sheets establish the softer meadow surface and grass-to-earth transition. Their diamond previews show projection, not borders to bake into the runtime material. Keep the existing game camera and movement grid. BG-01 is one continuous surface with broad quiet areas and sparse soft blades, not an all-over dense leaf carpet. Add DEC-02 worn earth patches with grass-fringed alpha edges. Keep denser flowers in isolated patches but reduce overall cover clutter. Scope: BG-01, DEC-02, scatter density and export pipeline; other materials retained.
Current source originals and prompt records remain under art/source, stable runtime exports under public/assets. Remove superseded grass candidates, old previews and obsolete exporters after checking references. This owner instruction overrides version-retention rules above for this replacement. Do not label the new candidate owner-approved.

### DEC-02 — Worn earth transition
TYPE = decal
FILE_NAME = daflak-earth.png
SIZE_PX = 512
VARIANTS = 1
COLOR_A = DIRT_LIGHT
COLOR_B = GRASS_DARK
CONTRAST = low
TEXTURE_DETAIL = subtle
MUST_HAVE = irregular softly worn earth clearing, sparse tiny grass at fringes, transparent outer edge, low contrast painterly soil, top-down ground plane
MUST_NOT_HAVE = raised island, hard border, tile lines, dense rocks, shadow, flowers
EXTRA_PROMPT = "irregular worn earth clearing with sparse soft grass fringe, isolated transparent ground decal"

## PROP-CASTLE — Owner-supplied stone wall sheet
Import the provided stone castle sheet as authored; no regeneration or new style is requested. Chroma-key magenta (#ff00ff), not blue (blue is used by banners/roofs). Preserve original under art/source/props/castle-walls. Export one transparent atlas with 29 named frames for towers, wall segments, corners and gates/junctions. The AI-style source is not an exact repeatable tileset: frame sizes vary and joins, anchors and collision need placement-specific validation before building a perimeter. Default bottom-center pivots are provisional. This import leaves terrain and gameplay placement unchanged.
