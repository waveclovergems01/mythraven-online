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

## CHAR-NOVICE-MALE — three concept candidates (2026-10-14)
TYPE = character concept; template A. STYLE = Soft Painted Fantasy 2D.
VARIANTS = 3: cream/leather, moss travelwear, dusty blue/light steel.
MUST_HAVE = original male Novice, 3.5-head proportions, elevated south-facing neutral pose, light shoulder/knee guards and gloves, clear hair/outfit boundaries, real alpha.
SOURCE = art/source/characters/novice-male-v001. STATUS = candidate preview only, no approved master or runtime export.
Tool = image_gen.imagegen; model version not exposed. Attached sprite-front-reference.png is direction only, not copied identity.
Future female/hair/wardrobe variants require shared anchors and separate authored animation layers; these combined concepts do not implement wardrobe support.

### Novice brown frontal correction — 2026-10-14
Owner selects the attached lean blue-tunic candidate as direction, requests warm brown tunic and balanced frontal arms/hands/legs/boots, hairstyle deferred. Preserve selected reference proportions instead of forcing previous chibi revisions. Source: art/source/characters/novice-male-brown-v001. Preview candidate only, not approved/runtime-ready; alpha cleanup remains required before sprite export. No game integration.

## Four-frame raster idle preview — 2026-10-15
Latest owner request narrows scope to idle only: eight directions, four actual generated breathing images per direction (32 frames total). Supersedes the CSS breathing approach; walking is deferred. Candidate sources, prompts, RGBA exports and QA are in art/source/characters/novice-eight-directions-v001/idle-breathing-v001. Preview switches image frames with no scale/deformation animation. Export 240x240, anchor (120,216), neutral height approximately144px, shared scale within each direction. Built-in image_gen.imagegen; model is not exposed. Brown character design is accepted as direction, animation candidates still require owner review. No game integration or public/assets replacement.

## Approved Novice idle integrated — 2026-10-15
Owner approves all eight idle directions and selects the preview's fast timing: 400ms/frame, 2.5fps, 1.6s loop. Active runtime atlas public/assets/characters/novice-male-idle.png is RGBA 960x1920 (four columns, eight rows S/SW/W/NW/N/NE/E/SE), cell240x240, origin(120,216). Source: art/source/characters/novice-eight-directions-v001/idle-breathing-v001. Phaser view uses scale2/3 to retain existing world stature and separate shadow/ring/name. Local and remote views use the same idle animations, retaining direction from received motion; while moving they hold the first standing frame pending approved walk art. No walking animation integrated. Build, eight-direction pose check, actual idle cycling/pause-on-motion, two-guest movement/resize/leave tests passed. Screenshot test-results/novice-idle-integrated.png. Replaced procedural character drawing; no superseded runtime character image existed to delete. Source references and exports remain active dependencies of the approved idle.

## Novice gameplay size correction — 2026-10-15
Owner's red-outline reference supersedes initial integration scale: uniform scale1.1, approximately80px visible stature at zoom0.5, for local and remote characters. Artwork and proportions unchanged; name and foot shadow/ring adjusted to fit.

## Shared player size and west walk request — 2026-10-15
Owner accepts the current ~80 screen-pixel character stature at zoom0.5 as the common male/female player size. All future player designs use neutral body height144px in240x240 frame with anchor(120,216), uniform runtime scale1.1; maintain natural proportions. New scope: WEST side-profile walk only, eight distinct chronological frames, 4 columns by2 rows. The supplied diagonal walk sheet is gait reference only, not character identity or facing. Preserve approved brown Novice identity. Preview candidate before integration; other directions remain deferred.

## Walk projection correction — 2026-10-15
Owner requests right-facing walk with approximately10degrees rotation toward screen to expose both leg tracks. Same identity, clothing, proportions and approved gameplay stature. Latest near-left-leg phase sequence supersedes earlier prompt phase names. Preview remains unapproved until left/right gait visually matches requested poses. Preserve transparent final PNGs.

## CHAR-NOVICE-MALE-WALK-SW — attached gait preview (2026-10-15)
TYPE = character animation candidate; template B. STYLE = Soft Painted Fantasy 2D.
SOURCE = art/source/characters/novice-male-walk-sw-v001.
VARIANTS = 1 requested eight-frame preview, generated as a complete sheet.
IDENTITY = public/assets/characters/novice-male-idle.png; approved SW idle seed extracted from existing source frames.
MOTION_REFERENCE = gait-reference.png copied from the current owner attachment; direction and motion only, not its character design.
LAYOUT = eight chronological frames, 4 columns by 2 rows, 240x240 cells, 960x480 export, feet anchor (120,216), shared normalization scale.
FACING = SW/front-left chosen to match the current attachment. This preview is separate from the earlier east-facing correction work.
STATUS = candidate for review; not approved or runtime-integrated. See its qa.json and prompts.json for actual results and limitations.
TOOL = built-in image_gen.imagegen; actual model version not exposed.
QA = 960x480 RGBA export, eight nonempty frames and consistent GIF timing passed. Full gait FAILED: repeated leading leg in contacts1/5, repeated roles4/8 and excessive knee lift2/6. Candidate shown for review only. See manifest.json for limitations and removal record; no runtime replacement.

## CHAR-NOVICE-MALE-WALK-SW v002 — gait correction (2026-10-16)
Owner identified incorrect left-leg continuation from frame3 onward. Corrected preview source: art/source/characters/novice-male-walk-sw-v002. Left supports3 and trails4-5; right leads4-5 and supports6-7; left recovers6-7 and returns forward8. Generated one full eight-frame diagnostic with left/magenta and right/blue, then used image_gen.imagegen to restore original brown costume colors while preserving poses. Actual model not exposed. Diagnostic colors are QA only, not a costume/style change.
Export: RGBA960x480,4x2 frames of240x240, shared scale, feet anchor(120,216),10fps. PNG, individual frames, GIF and frame-step preview remain under art/source. Alpha reviewed on white/black/green; eight-frame playback, pause and stepping passed in local Edge. Colored-source position checks recorded separately from visual review. Still a candidate pending owner review; not production-game validated or integrated.
v001 retains its rejected raw sheet as an intentional before/after gait reference, original attached reference dependencies and historical metadata. Obsolete v001 frame exports, atlas, previews and exporter were removed after a reference audit; see v002/cleanup.json. Existing runtime idle unchanged.

## CHAR-NOVICE-MALE-WALK-W — separate frames1-4 (2026-10-16)
Current owner request explicitly changes facing to strict WEST/left side profile, not SW/diagonal, and limits this review to FOUR SEPARATE images (frames1-4 of a future8-frame cycle). Generate each requested frame separately with image_gen and reuse preceding frames as continuity references; this explicit request supersedes the default whole-sheet workflow. Do not make frames5-8 or a combined sheet/loop for this request.
Anatomical L/R means the CHARACTER'S own left/right. Current supplied character-control-reference.png defines blue=left and red=right for explanatory labels only. Final costume remains brown. In this W view the left limb is camera-near and remains the foreground limb where silhouettes overlap; a right-leg forward step means farther left on screen, not changing the right leg into the camera-near limb.
Phase1 left leg forward/right back; phase2 left still leads and bears weight while right begins recovery; phase3 left supports beneath the body while right lifts/passes; phase4 right advances forward while left trails. Identity and proportions from approved W idle frame. Source art/source/characters/novice-male-walk-w-v001. Status candidate, owner review pending. Tool image_gen.imagegen, actual model not exposed. No runtime integration.
W first-four deliverables: frame-01.png through frame-04.png are individual240x240 RGBA candidates, with separate480x480 review copies. Shared scale and fixed anchor(120,216); no combined sheet, GIF or remaining frames generated. All four poses and real alpha inspected; owner review and in-game validation pending. Source images are retained as actual sequential edit dependencies. See manifest.json, prompts.json and qa.json.

Frame3 correction (2026-10-16): owner requests hidden far right arm and a lifted bent right knee with tucked, downward-pointing toe. Active candidate: art/source/characters/novice-male-walk-w-v001/frame-03-v002.png; review frame-03-preview-v002.png; source frame-03-source-v002.png; exact edit prompt frame-03-v002-prompt.json. Original frame3 source retained as edit/continuity dependency; superseded240/480 exports removed. Frames1,2,4 unchanged. Generation framing compensated in export; owner review pending, not runtime-ready.

Sequential W preview (2026-10-16): owner requests playing existing frames1,2,3-v002,4 together. Added preview.html with pause/step/speed and four-frame GIF,250ms per frame with750ms frame4 restart hold. No raster regeneration or runtime integration.

W continuation frames5-8 (2026-10-16): owner requests four separate images continuing accepted first-four poses. Frame5 retains far right lead/near left trail from4; frame6 right supports while left lifts behind; frame7 bent near left knee passes forward with downward toe; frame8 left reaches forward to connect to1. Source and separate240/480 RGBA candidates: art/source/characters/novice-male-walk-w-v001/frames-05-08-v001. Shared source scale0.16842105263157894 and feetanchor120,216. Exact prompts/references and QA retained. Tool image_gen.imagegen; model not exposed. New frames pending review; no combined sheet or runtime integration.

W eight-frame assembly (2026-10-16): owner requests combining1-8 and rendering playback. Active transparent sheet novice-male-walk-w-v001.png is960x480 (4x2,240px cells, anchor120,216), packed pixel-exact from current separate exports including corrected3. Preview.html now plays1-8 continuously at10fps with pause/step/speed. GIF walk-frames-01-08-v001.gif supersedes partial1-4 GIF. Sources/individual exports remain active. No redraw, runtime integration or new animation-approval claim. Assembly QA records packing, alpha, dimensions and timing.

W identity consistency correction (2026-10-16): owner accepts the8-frame gait and explicitly locks poses, anatomical left/right ordering and arm/leg motion. Correct identity, costume construction, material colors and body proportions to approved W idle. Frames8/1 must depict the same character and costume at matching scale; preserve their authored joint poses. Candidate revision art/source/characters/novice-male-walk-w-v002 uses v001 pose guide plus actual idle source. All8 appearances must be treated together; no new gait or auto-mirrored limb swapping. Preview before runtime.

W identity-correction v002 preview: two whole-sheet image_gen edits using actual approved idle W source and accepted pose guide. All8 exports share scale0.36 and fixed feetbaseline216; visible heights143-144px, head horizontal widths41.76-42.84px. Preview compares idle and old/new walk; candidates still require owner visual review, no runtime integration. Exact pose pixels are not guaranteed by generated appearance edits. v001 individual frames are retained as accepted-pose comparison inputs; pass01 is an actual pass02 edit dependency.

W torso stabilization v003 (2026-10-16): owner accepts v002 identity/style and limb poses, requests removing abdomen/waist pumping especially3/6 and seam8/1. image_gen local torso retouch supplies a neutral patch; export applies it only through abdomen/belt masks with explicit foreground-arm exclusion. Original v002 RGBA remains exact outside masks (including limbs, head, boots); no registration/scale/timing changes. Constant torso core replaces inconsistent belly volume. Source/prompts/masks/QA and before-after review in art/source/characters/novice-male-walk-w-v003. v002 frame assets remain active comparison and compositing dependencies. Not runtime integrated.
v003 QA: arms/legs outside local edit masks remain byte-exact; arm-occluded frames4/5 remain wholly unchanged. Shared visible torso core in1/2/3/6/7/8 stabilized; not a claim that whole silhouettes match. Discarded edit-cell extracts1/2/4/5/6/7/8 and temporary torso inspection composites removed; edit-cells/3.png retained as active patch dependency. Eight-frame playback,8-to1 step and comparison checked in Edge.

## Approved horizontal novice walk and unused-art cleanup — 2026-10-16
Owner approved the v004 west walk for project integration and explicitly allows code mirroring for east. Runtime uses public/assets/characters/novice-male-walk-w.png, 960x480 RGBA, 4x2 row-major, eight 240x240 frames at 10fps, repeat -1, origin(0.5,0.9), worldScale1.1. West uses flipX=false, east flipX=true. Only W/E movement uses this walk; other directions retain their directional static idle fallback. Stopping restores the directional four-frame idle and clears mirroring. Shared player view applies to local and remote players.
Current walk source is self-contained in art/source/characters/novice-male-walk-w-v004; idle sources and original generation references remain in novice-eight-directions-v001/idle-breathing-v001. Earlier walk/character candidates, unused castle wall assets/preview/exporter, obsolete terrain/decorations, old single-jet records and obsolete exporters were removed after runtime/export dependency audit. Historical entries above do not imply the old assets remain available. Exact removals are in docs/art/cleanup-2026-10-16.json. Active fountain VFX, terrain, UI, icons and intentional current art references remain.
Validation: typecheck/build, actual W/E keyboard movement including eight distinct frames, mirroring, idle restoration, non-horizontal fallback and both networked clients; existing idle/multiplayer/icon-loading tests passed. Screenshots test-results/novice-walk-w.png and novice-walk-e.png inspected. No deployment.


## Walk identity correction — 2026-10-16
Owner reports walk head/hair and material colors differ from shipped side-facing idle. v005 replaces the runtime walk at the same path and keeps 8 poses, 10fps, W/E mirroring, anchors and world scale. Head region y0..110 is copied without scaling from the actual first W idle frame: width38px versus former41-42px. All eight walking heads share exact source pixels. East mirrors this W head with the body; it is not claimed pixel-identical to independently authored E idle. Below y111, original walk alpha/geometry remains exact; a single pooled per-material RGB adjustment across all frames matches idle color distributions for cloth/leather/metal/gold, retaining pose shading. No new gait or shoulder motion.
Source/export/comparison are self-contained under art/source/characters/novice-male-walk-w-v005. Whole-sheet imagegen correction was evaluated but not selected because it drifted from the exact idle head; prompt retained. Superseded v004 derivatives removed after copying the accepted pose atlas to walk-before.png and preserving prompt provenance. See cleanup-identity-v005.json. New appearance integrated under owner's correction request, visual approval pending; movement and idle tests passed.



## Approved southwest / southeast novice walk — 2026-10-19
Owner approved the SW v005 eight-frame HTML preview for project integration and authorizes horizontal mirroring for SE. Runtime public/assets/characters/novice-male-walk-sw.png is 960x480 RGBA, 4x2 row-major, 240x240 frames at12fps, origin(.5,.9), scale1.1. SW uses flipX=false; SE uses flipX=true. Local and remote players share the same view logic. Stopping clears flip and restores the actual directional four-frame idle. W/E retains its existing atlas and10fps; S/N/NW/NE retain the current static movement fallback. Source, references, export and integration audit: art/source/characters/novice-male-walk-sw-v005. Existing reviewed appearance is integrated unchanged, not regenerated. Build, idle-direction regression and real two-client movement tests passed. No deployment.


## Source cleanup policy — owner instruction 2026-10-19
After approval and integration, discard temporary generation sources, references, individual frames, PNG/GIF/HTML previews, QA JSON and obsolete scripts. Approved runtime character atlases in public/assets/characters are the source of truth for future character work. art/source now retains only13 original images required by maintained non-character exporters; see art/README.md. Browser QA writes to test-results. Earlier source paths and prompt-retention statements above are historical and superseded; do not recreate deleted archives. Active generation may use ignored art/.scratch temporarily and must clean it on completion. Removal audit: docs/art/cleanup-2026-10-19.json.

## NW / NE novice walk integration — 2026-10-20

Owner approved the v015 gait for integration after appearance optimization. Runtime asset: `public/assets/characters/novice-male-walk-nw.png`, eight frames, 4×2, 960×480 RGBA. NW uses the original; NE uses horizontal mirroring. Both run at 12 fps with the existing player scale and feet anchor.

The NW atlas alone was corrected toward the shipped idle/W/SW material palette with `image_gen.imagegen` (the tool does not expose a model name). For the final export, the actual NW idle frame 12 head region (local y0–109) is reused without scaling in every walking frame, with integer vertical translation following each pose. Hair silhouette, size, palette and highlights therefore share the same source pixels across the cycle. The retouched walking pixels below the neck remain unchanged by this export step. Mirrored NE uses the mirrored NW head; independently authored NE idle is not claimed to be pixel-identical.

Idle, W and SW runtime atlases remain unchanged. Their historical metadata is unchanged; this correction does not redefine the global style. Completed NW generation drafts, previews and obsolete exporters were removed after validation under the cleanup policy above. See `docs/art/cleanup-nw-2026-10-21.json`.

## NW / NE leg and boot proportions — 2026-10-21

Owner reports oversized NW calves and boots compared with the shipped SW diagonal walk; the existing head is accepted and must stay unchanged. Replaced only `public/assets/characters/novice-male-walk-nw.png` using the built-in `image_gen.imagegen` tool with actual NW edit target, SW and idle appearance references, and the permanent bone chart attached. Prompt brief: reduce swollen boots/cuffs/calves toward SW proportions in all eight existing NW poses, preserve leg identity, NW camera, outfit colors and upper body, transparent 4×2 sheet. No model name was exposed by the tool.

The export preserves the previous atlas's upper-body rows 0–154 exactly, plus per-frame tunic/hand protection regions. All eight head/hair regions therefore remain pixel-identical to the previous runtime. Foot baselines are normalized to y216. The opaque lower-leg band (rows 185–219, alpha >128; a volume proxy rather than isolated shoe area) averages 1106.875 pixels, down from 1430.25 and close to SW's 1119.125. The gait phases, frame count, timing, mirroring and world scale retain their existing contracts. Idle/W/SW and the permanent reference hashes remain unchanged. Build and both two-client idle/walk tests passed; NW/NE game screenshots and the eight-frame comparison were inspected. This is the requested correction, not a new owner approval of the final appearance. Cleanup record: `docs/art/cleanup-nw-leg-proportions-2026-10-21.json`.

## NW material color match to idle — 2026-10-21

Owner requests NW-only color correction, principally the overly dark/red boots, using the actual front idle as authority. `image_gen.imagegen` received the current NW atlas, actual front/NW idle crops and permanent motion reference. Prompt brief: lighter, muted idle-matched brown leather boots and a subtle tunic brown correction; preserve all eight poses, head, boot proportions and transparency. Export transfers the generated material grade onto the original RGB pixels using pooled material curves constrained by actual idle swatches (75% idle / 25% generated palette). One curve per material is shared across all frames; the generated geometry is not substituted.

Every alpha pixel and head rows 0–114 remain exact; only 18,009 RGB pixels change. Selected boot-leather median RGB moves from (130,67,39) to (153,85,61), versus idle (157,88,64); this describes sampled leather midtones rather than whole-image equality. NW runtime is replaced at the existing path, so mirrored NE inherits the correction. Idle/W/SW remain unchanged. Validation and temporary-file cleanup: `docs/art/cleanup-nw-color-2026-10-21.json`.

## CHAR-NOVICE-FRONT-MODULAR — editor prototypes (2026-10-21)

Owner requests front-facing male and female Novice prototypes for further animation authoring in an external sprite editor, with reusable bodies and independently changeable hair. Two candidates, one per gender; no animation or runtime replacement requested. Template A plus shared Soft Painted Fantasy 2D block; actual runtime `public/assets/characters/novice-male-idle.png` attached as appearance reference, with the newly generated male candidate also attached for female pair consistency. The female identity and both new high-resolution interpretations remain candidates, not approved or pixel-identical replacements.

Deliverables in ignored `art/.scratch/novice-front-modular-v001`: separate transparent 1280x1280 base and aligned hair PNGs plus assembled previews for each gender; feet reference (640,1152). No scalp hair is baked into the base; clothing remains baked. One front pose only. Future directions/actions need corresponding hair layers and shared frame timing/anchors; long hair may need separate back/front layers. These editor prototypes are not the 240px runtime character profile. Exact prompts/references are in candidate manifest.json; generator `image_gen.imagegen`, model not exposed. QA outputs belong to `test-results/novice-front-modular-v001`. Existing runtime images remain unchanged.

### PixelLab handoff correction — 2026-10-21
Owner identifies PixelLab AI as the target and requests bald single-character concept inputs, deferring hair and eight-direction generation. Male design is reused; female is revised with a softer face, cream puffed sleeves, small moss ribbon, fitted brown waistcoat, pleated tunic skirt over opaque leggings, smaller shoulder guards and slimmer boots. New current candidates: `art/.scratch/novice-pixellab-front-v002/novice-male-bald-front-pixellab-v002.png` and `novice-female-bald-front-pixellab-v002.png`, each 1024x1024 RGBA with matched 875px solid height and feet reference (512,922). Previous female outfit is superseded as a candidate; no owner approval or runtime replacement is implied. Image generation received both actual previous bald candidates and the current runtime idle atlas. Tool: built-in image_gen.imagegen; model not exposed. Exact prompts and references are in candidate manifest.json. The handoff includes verified PixelLab concept-import instructions and distinguishes hair-layer authoring from automatic rotation. PixelLab generation is not executed; no global change from Soft Painted Fantasy 2D is authorized by choosing that destination. QA: true alpha, dimensions and paired preview checked; outputs in test-results/novice-pixellab-front-v002. No temporary export scripts created in this revision.

## CHAR-NOVICE-HAIR-CATALOG — 16 male and 16 female designs (2026-10-21)
Owner requests two separate hairstyle images,16male and16female. Current concept candidates: `art/.scratch/novice-hairstyles-16-v001/novice-male-hairstyles-16-front-v001.png` and `novice-female-hairstyles-16-front-v001.png`, each1254x1254 RGBA,4x4 visual layout, front view only, shared warm chestnut palette. Uses the shared Soft Painted Fantasy2D block plus character-master template adapted to the explicitly requested hair-only catalog. Actual bald male/female PixelLab concepts are head-fit references; runtime idle is a secondary male rendering reference. A built-in image_gen edit removes ears from the initial male sheet; that corrected sheet also supplies female layout/material reference. Actual model not exposed. Prompts, attached paths, numbered style index and limitations are recorded beside the candidates. Both selected sheets pass real-alpha checks and visual16-style counts on a light background. They are unapproved design catalogs, not normalized head attachments,8-direction sheets or runtime-ready layers; long styles still need front/back separation. Only selected outputs copied into workspace; no obsolete exporter or temporary individual-frame files created. QA files are in test-results/novice-hairstyles-16-v001; no runtime asset replaced.

## CHAR-NOVICE-MALE-HAIR-ROTATIONS — editor candidates (2026-10-22)
Owner explicitly requests all 16 male catalog hairstyles in eight directions (128 views), deferring female rotations. Built-in image_gen.imagegen generated one 4x2 sheet per hairstyle using its actual isolated frontal catalog reference plus public/assets/characters/novice-male-idle.png for camera guidance. The actual model name is not exposed. Hairstyle 14 received a targeted NW-facing correction with its generated sheet and original frontal hair attached; one anatomical-left ponytail retained.

Current candidate folder: art/.scratch/novice-male-hairstyles-eight-directions-v001. Deliverables: 128 transparent 256x256 PNGs and 16 transparent 1024x512 sheets, row-major S,SW,W,NW / N,NE,E,SE. Mechanical export segments silhouettes, calibrates generated front width to original catalog front width (global catalog scale 0.68), and uses one shared scale throughout each hairstyle's eight views. No independent per-view autofit, mirroring or palette replacement. Warm chestnut palette is visually coordinated; exact per-pixel material/geometry equality is not claimed.

QA: all 128 frames contain true transparent and opaque pixels with clear canvas edges; exported dimensions checked; 16-style contact sheet and corrected asymmetric ponytail inspected. QA under test-results/novice-male-hairstyles-eight-directions-v001. Alignment is provisional silhouette-center, not a validated skull attachment anchor; front/back layers and walking animation remain unimplemented. Candidates are not approved or runtime-ready and no game code/runtime art was replaced. Exact prompts and manifest accompany the handoff ZIP. Completed temporary preparation/export scripts removed; review candidates remain in ignored scratch pending selection.


## Male hair handoff accepted; female rotations candidate — 2026-10-22
Owner accepts the male 16-style eight-direction handoff visually ("ดูดีเลย ใช้ได้เลย") and requests the equivalent female set. Acceptance applies to the male editor handoff, not untested runtime attachment/integration; its existing files remain available.

Female candidate: art/.scratch/novice-female-hairstyles-eight-directions-v001. Built-in image_gen.imagegen (model not exposed) used the actual isolated female catalog hairstyle for identity and the accepted male hair-06 rotation sheet for camera/rendering. Sixteen separate generation calls produced eight views each. Targeted edits to05,11,14 removed ear artifacts and improved far-side tail/braid occlusion; a final small AI-generated hair patch removes the remaining ear on14 while preserving source alpha and pixels outside the local patch.

Exports: 128 true-alpha 256x256 frames; 16 1024x512 sheets, S,SW,W,NW / N,NE,E,SE. One scale per hairstyle across all eight views, calibrated to original female catalog front width; shared catalog multiplier0.6512007778 to fit longest styles with margin. No per-frame autofit or mirroring. Provisional silhouette-center alignment still requires bald-base skull anchors; long hair front/back layers and animation are not implemented. Visual contact sheet reviewed and all frames have opaque content, transparent background and clear outer borders. QA under test-results/novice-female-hairstyles-eight-directions-v001. Exact prompts, references and manifest are included with handoff. No runtime code/art replacement. Temporary preparation/patch/export scripts removed; unintegrated review candidates remain in ignored scratch.


## CHAR-NOVICE-BALD-IDLE-S — paired eight-frame candidate (2026-10-24)
Owner narrows the initial eight-direction request to FRONT S idle only, eight breathing frames each for the existing bald male and female concepts. Hair selection preview and other directions/actions are deferred. Used actual novice-pixellab-front-v002 male/female bald references plus respective 4x2 layout canvases with built-in image_gen.imagegen, actual model not exposed. Shared Soft Painted Fantasy 2D plus template B; two whole-cycle calls, preserving costume family and bald heads.

Deliverables in ignored art/.scratch/novice-bald-front-idle-eight-v001: sixteen transparent256x256 frames, two1024x512 4x2 sheets, paired/individual looping GIF previews (8frames,330ms per frame), prompts, README and manifest. Export uses one shared scale per character and feetbaseline232. Generated frame01 head copied rigidly across its cycle with vertical offsets[0,0,-1,-1,-1,-1,-1,0]; lower rows152..255 male/156..255 female copied fromframe01 to remove leg/foot shimmer. Chest/shoulder/arm frames retain generated motion. This is not exact pixel preservation of the original high-resolution concept.

Per-frame hairSocket values recorded at x128 and base y34 male/y38 female plus head offsets; rotation0,scale1. This is a provisional attachment contract, not a completed hair fitting system. Future turns/tilts require matching hair art; long hair may require back/front layers and secondary motion. All16 frames are distinct, true alpha and clear edges verified; head translation and lower-region equality validated, contact sheet inspected. QA in test-results/novice-bald-front-idle-eight-v001. No runtime integration or approval claimed. Completed temporary preparation/normalization/export scripts removed; candidates remain pending review.


## CHAR-NOVICE-IDLE-HAIR-PREVIEW — interactive front review (2026-10-24)
Owner requests selectable hair during Idle with playback adjustable from 4 to 16 FPS. Self-contained offline preview: art/.scratch/novice-idle-hair-preview-v001/idle-hair-preview.html. Composites the existing bald male/female eight-frame front cycles with sixteen existing S-facing hair frames per character; no new raster generation or runtime replacement. Per-style scale and offsets recorded in hair-fittings.json, combined with per-frame head sockets. Includes bald choice, pause/scrub/step, anchor display, per-style fitting controls and local browser persistence. Eight distinct source frames remain eight at every playback rate.

Validated in Edge with Playwright: all32 choices, independent selection, one-pixel hair-follow displacement, frame wrap, bald mode,4/8/16 FPS timing, persistence and responsive width. Desktop/mobile screenshots inspected; QA in test-results/novice-idle-hair-preview-v001. Front review only; long hair remains a single overlay with no secondary motion or back/front split. Temporary assembly data, HTML template and preparation/test scripts removed after validation; portable HTML, fit data, README and ZIP retained as the requested handoff in ignored scratch. No runtime approval implied.

## CHAR-NOVICE-FEMALE-BALD-WALK-W — eight-frame review candidate (2026-10-24)
Owner requests the existing bald female model walking west (screen-left), one complete eight-frame cycle using the permanent anatomical L/R control reference. Current handoff: art/.scratch/novice-female-bald-walk-w-v001. Built-in image_gen.imagegen (actual model not exposed) received the actual female PixelLab front concept and female front idle frame as appearance authority, permanent novice-male-sprite-control-reference.png for anatomical motion, and actual runtime male W walk/idle for camera/rendering. Shared Soft Painted Fantasy 2D block plus animation template B adapted to the existing256px editor handoff. Two targeted follow-ups removed male kneepad contamination, adjusted head proportion, and corrected near-arm phase in4/8.

Exports: eight distinct transparent256x256 PNGs,1024x512 4x2 row-major sheet, default8fps offline HTML with original female idle comparison and4–16fps control, GIF, manifest and exact prompts. One shared scale0.5208845208845209 across the cycle; skull x128 and contact-foot baseline around232. No per-frame auto-fit, mirroring, palette adjustment or head replacement. W profile is generated from frontal identity and remains a review candidate, not pixel-identical appearance or approved runtime art. Body/face dimensions vary slightly through generated motion.

QA: dimensions, true alpha, clear margins and8 unique hashes checked; contact sheet and identity/size comparison inspected. Edge browser verifies eight frame selections, wrap, playback, FPS controls and responsive width; outputs in test-results/novice-female-bald-walk-w-v001. Temporary exporter, preview template and browser-check script removed after validation; review handoff retained in ignored scratch. Runtime assets/code untouched; permanent anatomical reference retained.

## CHAR-NOVICE-FEMALE-BALD-WALK-SW — eight-frame review candidate (2026-10-24)
Owner requests the same bald female walking diagonally down-left (SW), eight frames, continuing the W handoff. Current outputs: art/.scratch/novice-female-bald-walk-sw-v001. Built-in image_gen.imagegen (model not exposed) received actual female front concept and existing female W atlas for appearance, permanent anatomical control reference plus actual runtime male SW walk and idle for motion/camera. Female appearance takes priority. Initial six-reference request was rejected before generation; successful generation attached exactly the five references recorded in manifest. One full-sheet correction targeted opposite strides, passing poses, near-arm swing and head proportions. Exact prompts accompany handoff.

Exports: eight256x256 transparent PNGs,1024x512 4x2 row-major sheet, GIF, offline HTML with female front-idle comparison and4–16 FPS, manifest and ZIP. One shared scale0.5215252152521526; skull x128 and lowest opaque foot around232; no per-frame auto-fit, palette correction, mirroring or head lock. SW is a generated interpretation with slight pose/shape variations; visual review candidate, no runtime approval/integration implied.

QA: dimensions, transparent/opaque pixels, clear outer edges,8 unique hashes; contact sheet and Idle/SW/W size comparison inspected. Edge browser checks8 selectable frames, wrap, playback, FPS controls and mobile width; QA in test-results/novice-female-bald-walk-sw-v001. Temporary export and test scripts removed after validation; handoff retained in ignored scratch. Existing assets and game code unchanged; permanent motion reference retained.

## CHAR-NOVICE-FEMALE-BALD-WALK-NW — eight-frame review candidate (2026-10-24)
Owner requests the same bald female walking diagonally up-left (NW), eight frames. Current handoff: art/.scratch/novice-female-bald-walk-nw-v001. Built-in image_gen.imagegen (model not exposed) attached actual female front concept and female W atlas as appearance references, permanent anatomical chart plus actual male runtime NW walk/idle for camera and motion only. Shared Soft Painted Fantasy 2D and animation template B,256px editor profile. A targeted full-sheet follow-up improves passing poses and alternating support. Exact prompts and attached references recorded. Back garment rendering is inferred from the existing female outfit; no new accessories.

Exports: eight transparent256x256 PNGs,1024x512 4x2 sheet, GIF, offline HTML with original female idle and4–16fps controls, manifest and ZIP. One shared scale0.5047619047619047 sets max figure height212px. Skull x128, top20 with phase bob[0,2,0,-1,0,2,0,-1]; root reference(128,232). NW fore/aft foot travel is preserved rather than forcing every foot to the same image row. No per-frame auto-fit, mirroring, palette correction or head pixel replacement. Generated rear interpretation remains review candidate with slight shape variation, not approved runtime art.

QA: eight unique hashes, true alpha, transparent edges, dimensions, contact sheet and Idle/NW/W size comparison inspected. Edge tests eight-frame selection/wrap, playback,4–16fps controls and responsive width; desktop screenshot inspected. QA in test-results/novice-female-bald-walk-nw-v001. Temporary exporter/test scripts removed; handoff retained in ignored scratch. Existing game code/runtime assets unchanged; permanent motion reference retained.

## CHAR-NOVICE-FEMALE-BALD-WALK-S — new eight-frame review candidate (2026-10-24)
Owner requests frontal SOUTH walk,8 frames, same female style/colors/boots, explicitly leaving old handoffs untouched. New output folder: art/.scratch/novice-female-bald-walk-s-v001. Built-in image_gen.imagegen (model not exposed) attached actual female high-resolution front concept, a mechanical contact board of actual female Idle/W/SW/NW first frames, permanent anatomical control chart, actual male runtime idle and W walk. Female references control appearance and boot design; male images only motion/camera. Shared Soft Painted Fantasy 2D plus animation template B adapted to256px editor profile. Two AI follow-ups address support-leg/arm order and boot details; final source order1,3,2,4,5,6,7,8 places modest foot lift before passing lift. Actual prompts retained with handoff.

Deliverables: eight transparent256x256 frames,1024x512 4x2 row-major sheet, GIF, offline HTML with female front-idle comparison and4–16fps control, manifest and ZIP. Shared scale0.4964871194379391, max figureheight212px; skull x128, top20 plus phasebob[0,2,0,-1,0,2,0,-1], rootreference(128,232). No per-frame autofit, mirroring, material recoloring or head replacement. Generated face/costume/boot geometry retains slight differences from references; review candidate, not pixel-identical or runtime-approved.

QA:8 distinct hashes, dimensions, truealpha, transparentedges; contact sheet and front-idle/boot comparison inspected. Edge verifies all8 selections, wrap, playback,FPS and responsivewidth; desktop screenshot inspected. All52 existing files across W/SW/NW handoff folders SHA256-verified unchanged. Evidence in test-results/novice-female-bald-walk-s-v001. Temporary export/test scripts removed; requested new handoff retained in ignored scratch. No existing art/runtime/code replacement; permanent motion reference retained.

## CHAR-NOVICE-FEMALE-BALD-WALK-N — handoff completed (2026-10-25)
Owner requests the same bald female walking north, direct rear view, eight frames. New handoff: art/.scratch/novice-female-bald-walk-n-v001. Built-in image_gen.imagegen (model not exposed) attached actual female front concept and female NW atlas for identity/boots/rear garment, permanent anatomical chart and actual male runtime NW walk/idle for motion/camera only. Shared Soft Painted Fantasy 2D plus animation template B, adapted to the 256px editor profile. Two corrections address opposite contact, arms and support-leg placement. Source order 1,2,7,4,5,3,6,8 aligns alternating support and passing phases. Exact prompts and metadata accompany the handoff.

Deliverables: eight transparent 256x256 PNGs, 1024x512 4x2 sheet, GIF, offline HTML with original female idle comparison and 4–16 FPS controls, manifest and verified ZIP. One shared scale 0.5353535353535354, maximum figure height 212px; skull x128/top20 with phase bob [0,2,0,-1,0,2,0,-1], nominal root (128,232). Fore/aft foot motion retained; no per-frame auto-fit, mirroring, palette replacement or head replacement. Generated rear interpretation remains a review candidate with slight geometry variation, not pixel-identical or runtime-approved.

QA completed before packaging: eight unique hashes, true alpha, safe edges, dimensions; contact sheet and Idle/N/NW comparison inspected. Edge verifies all eight selections, wrapping, playback, FPS and responsive width; desktop screenshot inspected. All 71 previous W/SW/NW/S handoff files verified unchanged. Evidence in test-results/novice-female-bald-walk-n-v001. Packaging resumed after an approval-service quota interruption; ZIP contains all eight frames and preview files. Temporary exporter/check script removed after validation. Existing runtime/game code and permanent motion reference unchanged.

## CHAR-NOVICE-FEMALE-WALK-HAIR01 — static sprite review (2026-10-25)
Owner requests one existing female hairstyle attached to the old walking frames, head-only changes, all eight directions and eight frames per direction. Owner selects ordinary style 01 and asks for static sprite images without an interactive preview. New handoff: art/.scratch/novice-female-walk-hair01-eight-directions-v001. Existing female hair-01 directional PNGs are composited onto existing S/SW/W/NW/N body PNGs with explicit RGBA source-over; no new generative drawing, recoloring or body rescaling. Three missing body directions NE/E/SE derive from horizontal reflections of NW/W/SW, disclosed in the review and manifest; reflected body lighting is retained. Their hair uses its existing authored directional image. One shared hair scale 79/256 throughout all views/frames; measured scalp sockets provide translation only.

Deliverables: 64 transparent 256x256 frames, eight 1024x512 direction sheets, one transparent 2048x2048 sheet (rows S,SW,W,NW,N,NE,E,SE; columns frames 01–08), labelled static contact image, manifest, README and ZIP. No HTML/GIF preview. All 64 frames visually inspected as a contact sheet; first frame of each direction inspected at full export scale. Machine checks confirm 64 unique frames, clear outer edges, RGBA dimensions, every pixel outside hair alpha unchanged versus its source/derived body, and all 48 source PNG hashes unchanged. QA: test-results/female-walk-hair01. Review candidate only, no in-game approval/integration or secondary hair simulation. Completed temporary assembly/check scripts removed; original assets and permanent motion reference retained.

## MAP-CAPITAL — expanded playable ground, 2026-10-31
Owner requests replacing the entry city with the new river-ringed capital preview and doubling both world axes. This authorizes local integration for walking review, not visual approval or deployment. Shared world is now 240x206 cells of64x56 =15360x11536 units at unchanged zoom0.5. At1920x960 viewport this is4 horizontal by approximately6 vertical camera spans; other viewport sizes see a different fraction of the same multiplayer world.

The selected concept is retained only as art/source/maps/capital-layout.png, an active input to scripts/export-capital-map.mjs. Runtime stretches layout masks, never the concept's surface pixels. Ground uses repeating512px materials: new packed dirt, short painted grass and warm brick (image_gen.imagegen; actual model not exposed), with the actual new capital preview attached as palette reference. Shared style prefix/suffix and ground template C were used. Existing granite and water materials remain; they are not relabelled as newly approved. Finished dirt/grass/brick tiles have reflected-edge packing after a shared crop/resize and identical opposite edge pixels. Repeats at zoom0.5: dirt/grass256x224px, brick192x168px (roughly24x9px per brick), granite128x112px (32x28px per slab); player remains about80px high. New raster exports at existing grass/paving filenames and tiles/mythraven-dirt.png.

Layer order: tiled dirt, masked grass, narrow bank lip, traced brick road mask, separate granite courts, land alpha over animated water. Scene streams512px chunks around camera; minimap uses the same compositor. Castle and district floors remain open for later props. Existing fountain is relocated to the new central court at(750/1448,496/1086), preserving its sprite size/animation/collision footprint. Spawn cell(122,112) is on the central south avenue. Navigation PNG is white only on the safely inset connected capital island, black on all water and outer mainland. No bridges or causeways; decorative coverage never grants walkability. Client/server share the same mask and grid. New code never loads scratch paths.

This is an integrated ground review, not completed building/city content. Full-scale material and traversal screenshots and repeat checks are in test-results/capital-map. Superseded source/export cleanup is recorded in docs/art/cleanup-capital-2026-10-31.json.

## OBJ-CASTLE — northern court integration, 2026-10-31
Owner supplies the circled northern court and requests a wider castle with slowly fluttering flags. Local integration is authorized; no deployment. Built-in image_gen.imagegen (actual model not exposed) edits the actual castle-v002 candidate, attaching the owner's marked screenshot for placement/proportion only. Extended low side wings add window/roof bays without stretching the door or towers. A follow-up restores side framing; final export adds transparent padding only. A separate blue/gold swallowtail cloth image is generated with the actual widened castle attached. Shared Soft Painted Fantasy 2D prefix/suffix and building template E used. These runtime exports are the maintained originals; temporary art and exporter removed after validation.

Runtime public/assets/props/castle/mythraven-castle.png is1800x1068 RGBA; source anchor(899,985), worldWidth3600, uniformScale2, normalized placement(740/1448,200/1086) on the northern stone court. Actual visible building is about1670 screen pixels across at zoom0.5. Ground footprint fits the broad upper court and narrower front apron; map/camera/player scale unchanged. Existing entrance spawn remains unchanged. Castle is exterior only; no interior/door transition is implemented.

Five adjacent, non-overlapping source columns use individually authored ground depths, so players sort correctly in front of recessed wings and behind the projecting gatehouse. Shared collision uses three stepped ground rectangles, not roof alpha or whole image bounds. Client and authoritative server reject any movement cell touching those rectangles. Minimap includes the placed building.

Separate cloth PNG320x126 RGBA is used twice at source roots(168,173),(1632,173). Each flag uses40 narrow raster strips; hoist position is fixed, free edge varies by about6 screen pixels, primary wave period5.5s, second flag phase offset0.55rad. No frame sheet or claim of generated animation frames: cloth deformation is runtime animation; masonry and poles remain stationary. Events are removed on scene shutdown.

QA: true alpha/dimensions/padding verified; city and close-up flag screenshots visually reviewed. Build/typecheck and17 server tests passed. Three Edge tests passed: castle placement/actual approach/collision/wing depth/visible cloth movement/fixed hoists/reentry, capital terrain, multiplayer. All28,801 remaining walkable cells are reachable from the original spawn. Cleanup recorded in docs/art/cleanup-castle-2026-10-31.json. Integrated for owner walking review; no claim of final visual approval.

## OBJ-CITY-FORTIFICATIONS — placed perimeter and three bridges (2026-10-31)
Owner requests a fortified wall around the island, using the supplied red minimap outline as approximate placement, plus west, east and south gateways with walkable river crossings. Integrated for review; no separate global art-master approval is inferred.

Built-in image_gen (model version not exposed) generated three candidates using the actual runtime mythraven-castle.png as attached stone/material/camera reference. Prompt set: shared Soft Painted Fantasy 2D block and prop template E; isolated warm-ivory crenellated horizontal curtain wall, screen-north/south curtain wall, and round open-battlement watchtower with blue/gold banner. Soft upper-left light, subdued painterly tones, true alpha, no ground, scenery, text or baked cast shadow. Image alpha was verified against grass before deterministic crop/resize/export.

Runtime originals: public/assets/props/fortifications/mythraven-wall-horizontal.png (512x388), mythraven-wall-vertical.png (250x140), mythraven-watchtower.png (424x814). Existing granite supplies bridge decking; the wall materials also supply low bridge parapets. New shared/fortifications.mjs owns stepped shoreline placement, three gate gaps, tower bases, bridge deck rectangles and rail collision. World and minimap use identical placements. Horizontal walls and sliced vertical walls use ground-foot depths; foreground masonry fades only while obscuring the local actor. No north bridge or castle-interior interaction added.

The navigation mask now includes inset outer land connected by the three bridge decks; water elsewhere remains blocked. This supersedes the earlier island-only navigation and no-bridge notes. The fixed 15360x11536 world and 4x6 reference camera spans remain current. Temporary export/QA records are removed after validation; runtime PNGs are the reusable masters, with no extra maintained art exporter required.
