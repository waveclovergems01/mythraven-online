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



## MAP-01 — Mythraven town concept (2026-10-13)

TYPE = map-concept (layout review only; template D in PROMPT_TEMPLATES.md)

FILE_NAME = mythraven-town-v001.png

VARIANTS = 1 (quota-conscious first review)

STYLE = Soft Painted Fantasy 2D

MUST_HAVE = organic canals, outer land, connected bridges and roads, central plaza, calm grass, soft object shadows

MUST_NOT_HAVE = square moat, floating island, copied game assets, text, UI

SOURCE = art/source/maps/mythraven-town

STATUS = candidate; owner review pending; not runtime-ready

TOOL = built-in image_gen; model version not exposed

NOTES = Scene composition preview; individual ground/object suffixes apply when separate runtime assets are produced. Existing runtime exports and login remain unchanged.



## MAP-01 correction — ground-only walking map (2026-10-13)

The owner rejected v001 as a distant town overview. v002 must show only base terrain: grass, connected paving, empty plaza/court, low earth banks and peripheral water. No buildings, trees, flowers, furniture, characters, walls or other props. Use the latest gameplay screenshot for projection and scale only, not copied designs. Roads align to screen horizontal/vertical, not a rotated diamond diorama. Keep existing runtime map sizing: approximately two viewport widths by three viewport heights, snapped to cells; exact size depends on entry viewport. Objects and collision will be authored separately after review. One candidate only. Source and actual attached reference are in art/source/maps/mythraven-town. v001 is rejected, v002 pending review; neither is runtime-ready.



## MAP-01 / BG-04 correction — dirt base and painted grass (2026-10-13)

Owner requests a dirt base map and ONE separate repeating grass texture. MAP-01 v003 replaces grass with bare earth and removes west/east/south stone crossings; preserve streets/plazas and northern crossing. Separate bridge objects come later. BG-04 is an opaque 512x512 seamless grass candidate, palette #7fb55a/#72a850, low contrast, flat top-down, no objects or baked dirt/edge/shadow. Code will eventually control grass coverage through an independent soft opacity mask, with optional separate tint variation. No runtime integration until owner approval. Sources: art/source/maps/mythraven-town and art/source/tiles/mythraven-grass-overlay. One variant each, image_gen built-in tool; actual model version not exposed. Ground candidates require repeat inspection. Existing runtime assets unchanged.



## MAP-01 / BG-04 integration approval — 2026-10-13

Owner approved local use of dirt v003 and grass v001 with blended coverage. Exported runtime files are under public/assets/maps and public/assets/tiles. Coverage varies continuously from exposed earth through 50% to full grass. Source and prompt records retained. See ASSET_SPEC.md for navigation and validation details. This approval does not apply to rejected overview v001.



### Central grass density adjustment — 2026-10-13

Owner requested stronger, broader green coverage around the central plaza and branching roads while preserving the outer grounds. The coverage exporter now raises eligible central soil to 92-100% grass and gently removes this boost toward the perimeter. Paving/water exclusions, texture scale and navigation remain unchanged. This adjusts the procedural coverage mask only; no new raster art generated.



## BG-05 — Separate paving tile (2026-10-13)

Owner requests crisp repeating paving instead of enlarged baked roads. One 512x512 opaque seamless soft-painted warm stone candidate, low-medium detail, uniform lighting and no embedded grass/props. MAP-01 v004 removes paved pixels from the sand base; retain shoreline and northern land crossing. Runtime draws connected paths/plaza above grass at fixed texture scale, then irregular textured grass fringe above selected path edges, especially south-facing edges. Preserve central grass density, camera, navigation and outer coverage. Use built-in image_gen, actual model not exposed. No additional objects.



BG-05 integration: one stone texture at 256x224 CSS-pixel repeat; independent path coverage in src/world/town-paving.ts. Sand v004 beneath grass and paving; irregular sparse grass fringe above paving. Local build and game-playtest passed; visual approval pending. No camera change.



## BG-06 — Animated repeating canal water (2026-10-13)

Owner requests one blue water tile matching the existing canal, animated drifting and reversing left/right, with unchanged shoreline/collision. Generate one 512x512 opaque seamless top-down material, Soft Painted Fantasy 2D, no shore/objects/UI. Built-in image_gen, model version not exposed. Water renders below transparent land chunks in two moving texture layers. Red-line path reference in art/source/maps/mythraven-town/curved-path-reference.png represents intentional bends: replace rigid ring/diagonal branches with smoothly meandering connected paths on both sides, retain main crossing connections and paving scale. No new environment objects.



## BG-07 / OBJ-FOUNTAIN — courts and fountain (2026-10-13)

Owner authorizes large square granite paving for northern chamfered court and wider octagonal central plaza, separate from road pavers; one 512px 4x4 square slab tile. Add stone approach pads on outer west/east/south banks without spanning water. Center gets an original low fountain with pale stone rim, subtle code-animated jet/ripples, actual alpha, no baked floor. Fountain has elliptical blocked footprint; spawn outside it. Latest annotated references are under art/source/maps/mythraven-town. Outer plaza granite, inner grass garden and fountain rim are separate layers. Tool image_gen, model unspecified.



BG-06/BG-07/OBJ-FOUNTAIN integrated for review: animated water, curved paths, outer bank pads, large-slab chamfered courts and low fountain. Generated assets retain candidate approval status; technical validation completed. Source prompt and QA metadata accompany each asset. See ASSET_SPEC.md for runtime contracts and test evidence.



## FX-FOUNTAIN-JET — sprite animation (2026-10-13)

Owner requests replacing the small misaligned line effect with a controllable sprite animation. One candidate 2x2 four-phase water-jet sheet, true alpha, fixed root anchor, soft painted cyan water. Normalize to common frame scale and nozzle origin; target 192x192 frames at 8fps. Use existing basin as actual style reference, not an approved VFX seed. Keep basin/ripples unchanged. Measure nozzle in final 640x389 basin export, approximately (309,154), rather than assuming image center. Tool image_gen; model unspecified. Validate alpha, frame order, anchor and in-game playback before runtime status.



FX-FOUNTAIN-JET v002 integrated for review: true-alpha four-frame sprite, shared-scale export and fixed root (96,168), 8fps. Basin nozzle measured at (309,153). Actual game screenshot and animation playback checked; build and city viewport playtest pass. Owner visual approval remains pending. Old graphics jet replaced; faint basin ripples remain.



## OBJ-FOUNTAIN tiered-v002 / FX-FOUNTAIN-TIERED-WATER — approved design integration

Owner approved the tall deity atop two fountain bowls, raised two-course elliptical basin with sloped tile foot, visible outlets, pool shadows and moving water, and authorized town-center placement. Retained approved preview in art/source/props/mythraven-fountain/tiered-v002/approved-design-sheet.png. Static prop and independently generated water FX exported with actual alpha. Six arcing jets, four upper streams and restrained landing ripples; no moving statue/base. Tool image_gen.imagegen, actual model not exposed. Design approval applies to preview; technical separation exports validated locally, no invented owner approval of derivative images. Previous small basin/jet are superseded; historical source metadata preserved.



OBJ-FOUNTAIN placement correction (2026-10-14): ground-contact origin (320,545) in 640x629 export, ellipse footprint (320,92), shared plaza/garden center. Corrected placement and depth only; art identity and approved design unchanged.



## Active fountain and cleanup — 2026-10-14

Round v003 replaces all earlier fountain shapes. Owner approved new goddess design and placement. Current sources: art/source/props/mythraven-fountain/round-v003 (design, placement, static derivative, prompt, metadata). Static derivative preserves design and removes baked jets; moving water is a separate sprite layer. Runtime /assets/props/fountain/mythraven-fountain.png, 768x796. Footprint centered on TOWN_CENTER; central court paved underneath, no grass inset. Four arcing jets and four falls, 7fps.

After every asset replacement remove unused/superseded images after reference audit and runtime validation, as explicitly requested by owner. Keep active source dependencies and intentional references. Earlier retention statements apply only to active sources; retired images listed in docs/art/asset-cleanup-2026-10-14.json have been removed. Historical metadata is retained as history, not current asset references.


## Active fountain and cleanup - 2026-10-14
Round v003 supersedes earlier fountain shapes. Owner approved new goddess design and placement. Active source: art/source/props/mythraven-fountain/round-v003. Static derivative removes baked jets; separate sprite water runs at 7fps. Centered on plaza axes, no central grass inset. After every replacement audit references and remove superseded/unused images, retaining active source dependencies and intentional references only. This owner instruction supersedes blanket retention. Historical records are not active dependencies. Removals: docs/art/asset-cleanup-2026-10-14.json.

## Ground direction preview - 2026-10-14
Owner requests mixed-size painterly paving stones with shallow bevel/contact relief and organic grass overhang/moss transitions rather than hard cut edges. This is a terrain-material exception allowing subtle local relief shading while overall tile lighting remains uniform. Affects paving and grass-edge materials, not fountain or login. Candidate only: art/source/previews/ground-v004/terrain-style-v001.png; not a tile export or approved master. Existing runtime remains unchanged pending preview review. Camera extent preview is 2 horizontal by 3 vertical viewports, validated separately using existing terrain.

## Painted reusable materials integrated - 2026-10-14
Owner approved ground preview and integration. Square 512x512 grass and paving tiles replace existing runtime paths; source/prompts in art/source/tiles/painted-town-v004. Material repeats and reusable irregular feather mask in src/world/terrain-materials.ts, retaining original town paths and separate granite courts. Grass repeats 512 CSS px, paving 256x224 CSS px. No flattened concept used as the town backdrop. Resize debounces a scene rebuild and preserves normalized player position, snapping to nearby walkable ground; desktop map remains approximately two viewports wide and three tall. Existing 40-cell minimum remains for small screens.
