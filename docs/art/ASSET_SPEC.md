# Asset and sprite contract — MR-ART-v1

> The 2D runtime was retired on 2026-11-25. References in earlier entries to the Phaser scene, sprite atlases and its map layers are historical. See the repository art inventory for active sources.

## Loading-screen illustrations — 2026-11-23

Owner-supplied backgrounds live in `public/assets/loading/*.png`. `shared/loading-art.json` is the runtime registry of seven original filenames, normalized runtime paths and exact dimensions (1671/1672 × 941). Copies are hash-verified against the supplied Downloads files with no pixel changes. All seven are used by the loading-screen rotation; none supersedes existing login or character imagery. Desktop/mobile CSS uses centered cover cropping and a dark lower gradient for readable real text and progress. QA screenshots belong in `test-results/loading`. No generated candidates, extra source copies or exporters are retained, and no obsolete image was replaced.

Plaza paving uses continuous cobblestone up to the fountain base and through road junctions. The circle and diamond line overlays are retired. Local cloth masks in flag-panels.json identify free pennants and hanging banners on the city architecture. Their moving vertices and shadow pass share one wind phase per world location. Poles and attachment edges stay fixed.

Current plaza fountain revision: place the 9-unit source model at 2.5 uniform scale (22.5 high, about 38.4 across). Its circular collision and plaza inlay follow the enlarged footprint. Clear sea-blue water shows the stone beneath. Shallow traveling waves and ripples from the urn impact deform the surface, replacing the earlier bright caustic spots and separate ripple rings.

## Central angel fountain and basin water — 2026-11-15

Tenth source: asset2/c4c8b10a-2411-46b7-9b6d-07671fa66356/base_basic_pbr.glb plus its own texture_emissive.png, retained under assets/pending/buildings/building-10-c4c8b10a as maintained importer inputs. Runtime plaza-angel-fountain.glb is uniformly normalized to height 9, width 15.314893, depth 15.373090. One instance occupies (0,4.9,0), bringing the layout to 38 instances / 10 models. A shared circular collider of radius 7.686545 blocks its base; the surrounding plaza stays walkable. Minimap renders the fountain as a circle. The former empty reserve is now occupied.

GLB source SHA256: 12211de25cb14cac61ac296be6ec05cbc6bac5d5999f7fcadde52981328dc1c4. Emissive SHA256: c03cca75499388ef675fc2eba3a644246431d2aa031c8d03b7c4510ec1c64781. All 15 importer input files and 35 original/paired texture maps across the 10 models were hash-verified; no source texture edits.

fountain-water.ts samples 128 horizontal rays through the actual normalized GLB at local Y=1.65 (world Y=6.55). The first two distinct crossings define pedestal and inner basin wall; an annular mesh overlaps stone by .035 units and remains below the approximately 2.35-high rim. A 48-segment tube of radius .085 follows a quadratic curve from measured urn lip (1.27,6.59,1.49), through (2.12,6.69,2.59), to basin impact (2.35,1.65,2.9). Lit transparent materials animate subtle caustics, flowing highlights and three fading impact rings. Day/night lighting applies normally; reduced-motion freezes time. Placement yaw/scale are inherited from the fountain instance; geometry/materials are disposed on world teardown. No raster source/exporter needed for the water.

Validation: build/typecheck, all 37 server tests and live-town browser test pass. QA verifies basin confinement, side-view stream placement, changing animation frames, night response, walking around the fountain, castle crossing, and no page/shader errors. QA PNGs remain under ignored test-results; temporary model inspection pages/scripts were removed. Original intake files remain active importer dependencies.

## Northern castle, residential city and street surface — 2026-11-15

The owner activates the nine stored GLBs. `scripts/import-city-buildings.mjs` consumes the retained, hash-verified intake files and normalizes each uniformly to ground-pivot metres, preserving original embedded PBR maps. Runtime exports are in `public/assets/models/buildings`; `shared/building-assets.json` records source IDs and dimensions. Source order maps to: house-red-gable (15 high), house-banner (17), house-blue-awning (16), house-red-cottage (14), castle-red-spires (56), market-produce-cart (6), tavern-red-awning (17), market-produce-stall (7), shop-red-awning (16). Each last-four model uses ONLY its own submitted emissive PNG, embedded by the importer. Day/night emissive intensity ranges .25–.898; no bloom or unrelated light map is introduced.

`shared/city-layout.mjs` defines 37 placements: castle at (0,-220), 24 houses in four residential rows, two taverns, two shops, four stalls and four carts. Castle footprint is approximately 58.13 × 54.32 and height 56; all instances use uniform scale. A north gate (1.35 uniform) and one complete uniform bridge arch connect the marked dry northern plot. Castle forecourt and building pads level dry ground only, leaving water channels unchanged. Shared navigation blocks building rectangles; fronts remain reachable and tree/grass placement excludes buildings/streets. The minimap derives streets and footprints from the same layout. Central diamond has radius 32 on its cardinal axes and a reserved radius-9 fountain circle, with no fountain object or collider yet.

Street candidate: `painted-city-stone-v001.png`, 1254 × 1254 opaque RGB, built-in `image_gen.imagegen` (model not exposed). Actual rendered nine-model contact sheet was inspected and attached as palette/style reference. Requested 1024; retain actual output size. Prompt: full-bleed seamless top-down warm grey limestone cobblestone, narrow taupe mortar, staggered rows, softly painted low contrast, no perspective, objects, baked directional light, borders or text. It repeats every 8 world units on terrain roads and approaches; plaza edge and future-fountain ring are shader markings. Complete bridge materials remain original. Terrain road masks follow shared street segments and the diamond, with subtle feathered edges. No original street asset existed to supersede; obsolete bridge-deck clipping/UV reuse code was removed. QA PNGs belong in test-results; temporary preview HTML/scripts are removed after visual checks. Retained intake originals are active dependencies of the maintained importer, not unused drafts.

## Soft toon, wind and enlarged gates — 2026-11-15

Latest owner revision supersedes the gate scale below: 1.85 uniformly on XYZ (about 37% larger than 1.35), height 44.4 units, measured passage width 7.03 units. Gate-wing joins, collision and tree clearances derive from the same layout. Bridges/walls retain their prior uniform scales.

Runtime `painted-lighting.ts` blends diffuse illumination into broad soft bands for trees, fortifications and painted terrain, retaining actual shadow and night response. Specular contribution is 25%; tree/architecture normal strength is 55%/65% of source. ACES exposure is 1.0 instead of 1.15. Source texture bytes and character baked emission remain unchanged.

`tree-wind.ts` deforms upper tree vertices in both visible and shadow passes. Roots below 32% height stay anchored, crown displacement is under 0.2 native units, with world-position phase and slow gusts; instance matrices and collision never move. Reduced motion freezes wind time. Expand bounds by 0.6 world units to include movement. Three shared depth materials are disposed with the grove. No raster edits, replacement assets or temporary art outputs were created.

## Owner city fortifications — 2026-11-14

**Current proportion/joint correction, 2026-11-15 (supersedes the unequal scales and counts below):** every complete instance now has identical X/Y/Z scale. Gates use 1.35 (height 32.4, measured clear passage about 5.13), walls 1.4 (height 16.8), towers 1. Each crossing is two complete bridge arches at uniform scale about 1.35–1.47, six bridge instances total, instead of one lengthened/flattened model. Bridge centres repeat at 76% of model width so the end piers/rail posts meet beneath overlapping deck ends. The shared deck stays at 4.9 by changing placement height, not model proportions; a 0.006 placement offset prevents coplanar deck flicker. Rails/collision/vegetation clearings follow the new widths. Stone paving repeats/clips the source deck in equal X/Z units rather than stretching its stone pattern along the approach.

The wall ring now uses 68 complete overlapping modules and nine towers. Straight collars connect to the measured side-wing plane behind the gate origin (local Z=-2.8 before scale) and extend into the wings by 2.5 base units. Wall bases share one foundation height; model length determines module count instead of changing X scale. Browser ray probes check the actual masonry at both sides of all three gates at several heights. No GLB or texture bytes change, and no new temporary asset/exporter is created.

Maintained importer: `node scripts/import-city-fortifications.mjs E:/Blender/Environment/asset`. External originals remain untouched. Five single-mesh static PBR exports are normalized to a ground-centred pivot and metres, renamed, pruned/deduplicated and validated for identical embedded texture bytes. The metadata in `shared/fortification-assets.json` records exact source SHA256s, dimensions, triangle counts and measured deck height samples.

| Owner source under asset directory | Runtime under public/assets/models/fortifications | Base height | Triangles |
| --- | --- | --- | --- |
| `2e4ab540-7366-40a4-a93a-517d1d1655b9/base_basic_pbr.glb` | `city-gate.glb` | 24 | 7,221 |
| `4d51879d-1743-4688-831b-bdaefc1037f7/base_basic_pbr.glb` | `city-wall-banner.glb` | 12 | 7,268 |
| `8f34be8b-b817-4d66-8803-6756a4fbf5a1/base_basic_pbr.glb` | `city-stone-bridge.glb` | 10 | 6,378 |
| `base_basic_pbr(2).glb` | `city-watchtower.glb` | 21 | 6,792 |
| `base_basic_pbr(3).glb` | `city-wall.glb` | 12 | 6,795 |

The current enclosure follows a shoreline setback of roughly 26 units, with 81 wall sections, nine towers, three gates and three bridges. Gate X scale 1.6 widens the ray-measured clear opening from 3.8 to about 6.08 units; Y remains 24 and Z scale is .75. Walls adapt length to close the perimeter. Bridges span the actual channels west/east/south, with fitted X length, Y scale .7 and Z scale 1.7. Their 7.2-unit navigable central lane excludes rails; shared server/client surface height is 4.9, matching the measured nearly flat deck. Stone approach ramps meet the outer-bank height; small raised terrain patches are cut below the approach paving. Approach tops reuse the owner's deck triangles, original UVs and PBR material. Wall/tower/gate/rail collision and tree/grass clearings use the same layout. Minimap displays the enclosure and crossings.

Resources are shared through five instanced model batches; approach geometry reuses the bridge material. All structures cast/receive shadows, with local-player silhouette fading restricted above foot level so the floor never disappears beneath the avatar. Temporary inspection GLBs/HTML/scripts are removed after validation; screenshot QA stays under ignored test-results. No prior live asset is superseded by this addition.

Validation completed 2026-11-15: build/typecheck, 36 server checks, and browser traversal through every gate in both directions passed. Actual mouse clicks on all three bridge decks reach the clicked point. Final screenshots verify continuous stone paving, ground contact, bank joins, silhouette fade and minimap placement without page/shader errors. Existing bundle-size warnings remain; no geometry/texture compression was added to these faithful owner imports. Cleanup removes five temporary source copies, inspection HTML/script and source-only preview images; active game screenshots remain in test-results/fortifications.

## Owner grove trees — 2026-11-14

**Owner size follow-up:** keep the normalized GLBs unchanged and apply fixed seeded uniform scale per instance: oak 1.30–1.95 (height 11.7–17.55), pine 1.25–1.85 (13.75–20.35), coconut palm 1.60–2.30 (16–23). Against the 2.8-unit character these are about 4.2–8.2 character heights. Each species mixes smaller and larger mature trees. Existing 650 positions, model choices and yaw angles remain unchanged; both server/client trunk radii scale with the visible model, and collision bucket search uses the largest possible trunk radius. No new assets, texture edits, source copies or cleanup are needed.

**Current PBR replacement (supersedes shaded sizes/materials and density below):** same descriptive runtime filenames and normalized heights, now sourced from `base_basic_pbr(4).glb` (oak, 8,101,328 bytes), `base_basic_pbr.glb` (pine, 9,513,808 bytes), `base_basic_pbr(1).glb` (palm, 8,840,660 bytes). Each has three original embedded PNG maps: base color, tangent normal, packed metallic/roughness. Their texture bytes survive export unchanged. Material names end `_PBR`; no emissive map, brightness multiplier or custom emissive-shadow shader remains. Three.js StandardMaterial handles lighting and received shadows; only player-occlusion fade is customized.

PBR source SHA256s respectively: `9a23ad40769e5d3a7546ffc62343dac1b3d1db29e57ecaf4c37d82005c6f3c9a`, `672c8656c158b6bc7a512859df9b257a98f88a38cadbceb22101cf8b70e070e8`, `fbaa974086a996a3c687bd279f1905677e9273514427f0928c35745a1a8a0c53`.

Current placements total 650: 450 outer trees (three times the former 150), 200 inner trees. Irregular minimum spacing is 6–8.5 outside and 7.5–10 inside. Inner shore setback is 14–50 units; outer roots stay at least 7.5 units from water. A 12-unit spawn clearing and the central foundation stay open. Rotations remain fixed and seeded. The earlier generated oak is fully removed: `riverside-oak-v001.glb`, `riverside-oak.ts`, its minimap marker/collider, `build-riverside-oak.mjs`, and its sole source `riverside-oak-leaves-v001.png`. The obsolete one-oak browser test is replaced by current grove lifecycle coverage. Old shaded runtime bytes are overwritten in-place; external owner originals remain untouched. The descriptions below record historical exports only.

External originals in `E:/Blender/Environment/asset` remain untouched. Maintained importer: `node scripts/import-environment-trees.mjs <source-directory>`, using glTF Transform to normalize root pivot and height, rename nodes/meshes/materials, deduplicate and prune. Runtime destination: `public/assets/models/trees`. All models are single static mesh/material, no skeleton or clips, one original 2048-square PNG each. Embedded image bytes are verified unchanged after export; no geometry simplification or raster regeneration.

| External source | Runtime filename | Node / mesh | Height | Triangles | Bytes |
| --- | --- | --- | --- | --- | --- |
| `base_basic_shaded(4).glb` | `tree-oak-green.glb` | `Tree_Oak_Green` | 9 | 3,091 | 3,820,284 |
| `base_basic_shaded.glb` | `tree-pine-green.glb` | `Tree_Pine_Green` | 11 | 5,123 | 4,258,588 |
| `base_basic_shaded(1).glb` | `tree-coconut-palm.glb` | `Tree_Coconut_Palm` | 10 | 5,008 | 4,362,444 |

Source SHA256s respectively: `2566bfcb599db4390e4f76c18c487bc906d18513bd213c3a424360aebc1b8165`, `cec53daab266243389b4737f090dff6124b024f070475726541e9984e424a794`, `80a73bd24198afd2c5bcd1a6a103616c005e7a0c5c6038d3802cea05daddd001`.

`shared/terrain-props.mjs` generates 270 deterministic non-grid placements: 120 on the inner-city belt (shore distance 22–48) and 150 on outer land, set back at least 11 units from water. Centre/future building ground stays open; the existing spawn/oak approach has an 18-unit clearing. Yaw is chosen once, scale 0.86–1.11. Three immutable geometries/materials and textures are shared by spatial InstancedMesh batches; no per-tree animation or duplicate downloads. Original emission is dimmed with world time and received shadows; tree pixels in front of the local player fade around their silhouette. Trunks use shared spatial collision buckets on server/client; crowns permit walking underneath. Minimap uses the same placement list.

Validation: import image-byte checks, deterministic placement/dry-root/trunk-detour server test and browser checks for one load per species, instancing, fixed matrices through orbit/time changes, traversal and reentry. In-game desktop/wide/low-orbit/night/mobile images are under ignored `test-results/terrain-groves`. Temporary source GLB copies and preview HTML are removed after validation. All three new runtime models are active; the earlier riverside oak and legacy 2D assets remain intentionally active, so none are superseded by this addition.

## Dynamic city shadows — 2026-11-14

One centered directional sun uses target-relative world offset (0,80,160), so shadows fall north/-Z and upward behind actors in the fixed south-facing view. The 2048-square PCF shadow map updates every frame. Its orthographic bounds fit camera span/zoom plus caster padding, and its ground target follows the player with texel-snapped X/Z coordinates; near/far 1/400, bias -0.00004, normalBias 0.025. This replaces the frozen 22-unit oak-only shadow region. It covers the visible city while traversing the 500-unit map, not a 500-unit low-resolution shadow map.

Original and modular hair meshes plus local/remote Novice/Warrior surfaces cast/receive shadows through their animated skeletons. The obsolete circular blob shadow beneath each player is removed; selection rings/outline shells do not cast. The source models' baked emissive colors remain intact, with a runtime shadow-mask factor (0.72–1.0) on emission so received shadows are visible without rewriting materials or textures. Terrain casts/receives; water receives; instanced bank grass and the oak cast/receive. Custom depth shaders use exactly the visible grass/leaf wind deformation; oak depth retains leaf alpha cutouts. Camera-occlusion fading remains a visibility aid and does not remove physical shadows. Depth materials and the sun shadow map are disposed on exit.

Validation: production build/typecheck passed. Dedicated browser shadow test verifies front light direction, both classes' mesh shadow participation, actual darkened pixels behind the avatar, live Run, shadows after moving away from the old oak region, follow-target position, wider zoom bounds, and mobile rendering with no shader/page errors. The oak fade/reentry test also passed. Final lower-angle lighting passed the shadow test again; screenshots inspected at `test-results/terrain-shadows`. Existing large-chunk build warnings remain. No art files replaced; no scratch assets/exporters added.

## Fine-blade terrain grass — 2026-11-14

Later soil-scale correction: user accepts grass but identifies oversized earth features. `dirtTile` now uses `groundPoint.xz / 8.0`; green/dry/worn grass stay at `/32.0`. Soil details are one quarter their former linear size, including on banks, without changing clearing boundaries or material colors. No image regeneration/replacement or cleanup needed. Build/typecheck passed; walked Warrior to an actual clearing and inspected 100%/200% screenshots (`test-results/terrain-earth-scale`). No shader/page errors observed; the console check encountered an unrelated HTTP 403 from the configured Google GSI button, confirmed separately.

User screenshot identifies repeated dark/light clumps as a checkerboard and authorizes larger tiling or new art. Runtime candidate `public/assets/tiles/terrain/painted-grass-v002.png` is a 1254 × 1254 RGB opaque PNG from built-in `image_gen.imagegen` (model not exposed). The actual previous runtime `painted-grass-v001.png` was inspected and attached for palette/paint-style reference. Prompt asks to replace its repetitive composition with a quiet continuous fine-blade meadow, irregular placement, low contrast, top-down full-bleed albedo, uniform lighting, seamless edges; excludes clumps/rosettes/rows/diamond grids/swirl motifs/text. Requested 2048 but tool returned 1254; kept actual size unchanged. No project-wide style approval is inferred.

Fixed `groundPoint.xz / 32.0` UV doubles the tile span from 16. Shader dry-grass tint uses the same new painting with linear RGB multiplier (1.55, 1.06, 0.72), removing the former dry image's clump grid. The original grass/earth image now contributes only near worn margins, not throughout fully grassy interiors. Three active textures remain: new grass, original earth and original grass/earth. No UV rotation, mirror, jitter or overlapping copies. Terrain shape, navigation, shoreline and grass blades remain unchanged.

Validation: build/typecheck passed, PNG square RGB dimensions checked; five browser views (50/100/200% zoom and two interior locations) inspected without shader/browser errors. Large-scale checker-like clumps are substantially reduced; ordinary texture repetition remains by design. QA under ignored `test-results/terrain-grass-v002`. Updated material-request expectation to the three active files; full historical material suite was not rerun in this pass.

Cleanup: audited src/shared/scripts/tests for old references, removed superseded runtime `painted-grass-v001.png` and `painted-dry-grass-v001.png`, and removed the temporary project scratch candidate. Owner Downloads originals remain untouched; no new exporter or duplicate source is required. Earlier four-texture descriptions below are historical.

## Owner Warrior variants — 2026-11-13

External owner sources are preserved at `E:/Web Project/Git/my-3d-studio/my-drawing/for3d/blender/`. `m1-warrior1.glb` is copied byte-for-byte to `public/assets/models/characters/m1-warrior1.glb`: 36,986,364 bytes, SHA256 `0a2f9e34d599f0134a3df7cb184e4f7df80df22edb2eb3db4061e74fbc826db3`, 56,509 triangles / seven primitives, seven materials, nine embedded images, 160 skin joints. Clips: `n_war_idle` 2.5 seconds and `n_war_run` 0.583333 seconds, each 480 TRS channels. The source also contains a zero-duration `A_POSE`, preserved in the byte-identical file but never selected for gameplay.

Second source `m1-warrior2.glb`: 30,598,580 bytes, SHA256 `cafe8b5ce149944d50ebce97285258fcf5bab11964520f9f0fb09a86c362f6d5`. Ordered rest hierarchy, inverse binds and all animation channel targets/paths/interpolation/times/values match the Warrior base. Body vertex positions and textures match, but some non-hair weights differ in the second export; those unrelated differences are not imported. The new hair is material `model.014` in mesh `model.041`; the base hair is `model.020`.

Maintained `scripts/import-warrior.mjs <base-source> <second-source>` validates both bindings and animation sets before extracting `Warrior_Hair_02`. Runtime `public/assets/models/characters/warrior-hair-02.glb`: 5,716,572 bytes, SHA256 `3e6ef7e98ee3a7b772f03e82408b3e9ecd7212cef1f2527356cd47d30ca46a99`, 8,998 triangles, one original material/embedded texture, compatible 160-joint skin and zero clips. Exact geometry attributes, indices, inverse binds and image bytes are checked after writing; near-identity serialized rest TRS uses a 1e-5 tolerance. No raster generation, recoloring or lossy reduction.

Runtime: shared `skinned-player.ts` maps each class to its own explicit clip names and normalizes that class's Idle standing pose to 2.8 units. `character-assets.ts` caches loaded factories by model for the preview and city; concurrent requests share one load. Each avatar has independent bones/mixer and shares immutable geometry/materials within its class. The second Warrior hair binds only to the Warrior skeleton. Selecting a different class uses a generation counter so stale downloads cannot overwrite the preview or enable entry for the wrong model. Remote classes load on demand with an error/retry state; pending loads dispose their resources if the screen exits.

Validation: production build/typecheck and all 31 server checks passed. Five browser cases passed covering selection lifecycle, both Warrior previews, mixed Novice/Warrior clients, both hairstyles, class-specific Idle/Run, animated outlines, independent poses/shared resources, stale-load switching and failed-download retry, plus existing Novice behavior. Base/hair requests occur once per class across preview-to-city entry and new peers. Desktop previews and mixed-city screenshots inspected in `test-results/terrain-warrior`. Existing large bundle warnings remain; this faithful import is not a final MMO asset budget/LOD optimization.

Cleanup: the full second Warrior is not copied into runtime; only its required hair module is retained. No obsolete raster assets or scratch source copies were created. Both Novice assets remain active. The importer remains maintained for repeat imports of these external owner sources; test screenshots stay in ignored `test-results`.

## Modular novice hair — 2026-11-13

Owner source `E:/Web Project/Git/my-3d-studio/my-drawing/for3d/blender/m1-novice2.glb`: 45,511,936 bytes, SHA256 `f548dde3f892de375585212b909b63d0ef30c5c879d7a91eb9a4148904fd1078`. Compared with the active novice: identical ordered 160-bone rest hierarchy and inverse-bind matrices, matching Idle/Run animation data; extra `n_idle.001` duplicates Idle. The changed hair is primitive material `model.021` in mesh `model.040`. Other body primitives retain their original positions but some exported normals/weights differ; those unrelated export changes are not imported.

Maintained `scripts/import-novice-hair.mjs` uses glTF Transform to isolate that primitive and prune unused body geometry, materials, textures and every animation. Runtime `public/assets/models/characters/novice-hair-02.glb`: 5,581,456 bytes, SHA256 `80edac0577967e860821f998d0376c614afdfeaec9c53775ee536fa12a4381cf`, 8,998 triangles, one material, one original embedded texture, compatible 160-joint skin and zero clips. Geometry attributes/indices, inverse binds and image bytes are checked against the supplied file. Near-identity TRS omission during serialization is checked within 1e-5. No texture generation, repaint, recolor or lossy simplification. The supplied emissive material is preserved.

Runtime loads the base GLB and hair module in the selection preview, then transfers the shared factory into the city without another download. Each avatar owns one animated skeleton palette and mixer; its existing hair mesh and the new hair mesh share that palette. Visibility chooses exactly one hairstyle without restarting the pose or replacing the avatar. The original base sets normalization for both styles. Hidden hair is excluded from picking and its child outline is hidden with it. The shared character catalog defines stable IDs, model, class, gender and hairstyle. Entry requires an explicit known `characterId`; the server derives `hairStyle` from that entry, ignoring client-supplied cosmetic values. The old `hair-style` message and in-game choice are removed. The choice is visible to other clients/late joins and survives transport reconnect in the same page. Login and refresh return to selection with no automatic choice. No account persistence is claimed.

Earlier modular-hair validation: build/typecheck, 31 server checks and three browser checks passed, including two-browser hairstyle synchronization, late join, repeated swaps without asset reload or skeleton recreation, new-hair idle/run/outline, remote change during a run, reconnect and logout/reentry. Desktop/mobile settings and style/run screenshots inspected in `test-results/terrain-hair`. Existing hover/approach and novice animation suites passed.

Cleanup: no full duplicate `m1-novice2.glb` is copied into the project. Only the extracted runtime hair module is added; the active original model remains required for body, first hair and clips. The parameterized importer is maintained for updating this supplied hairstyle and requires the external owner source path; no duplicate source copy, scratch candidates or obsolete exporters are retained. Existing art references/2D atlases are untouched.

## Owner novice GLB — 2026-11-13

Source: owner file `E:/Web Project/Git/my-3d-studio/my-drawing/for3d/blender/m1-novice.glb`. Runtime: `public/assets/models/characters/m1-novice.glb`, byte-identical, 51,855,528 bytes; SHA256 `8c6b93b135840cbe7c2e42a41df6af803ec3bc7ffc6168ef690ed0b026fae074`. Exporter: Khronos glTF Blender I/O v5.2.40. Two mesh definitions/six rendered primitives, 48,203 triangles, six materials, sixteen embedded 2048-square PNG textures, one 160-joint skin. Clips: `n_idle` 2.5 seconds and `n_run` 0.75 seconds, each containing 480 translation/rotation/scale channels. No geometry/texture compression extension or external decoder required. This faithful first integration is not an MMO asset-budget approval; texture/memory reduction and LODs remain a separate optimization pass.

`src/terrain/novice-player.ts` loads once per mounted world and shares geometry, materials, textures and clips across avatars. Each avatar owns its cloned bones and mixer; its primitives share a compatible skeleton palette. A parent display transform normalizes the measured idle pose to 2.8 world units with feet at zero, without rewriting the source animation. Local motion uses predicted state; remote motion uses received moving state. Idle/run crossfade takes 0.15 seconds; run cadence is 1x at default speed level 5 and bounded to 0.65–1.6x across exploration speeds. Simulation still owns world translation/heading. Rings retain local/remote colors; mesh colors preserve the supplied materials. Outline shells use the same skin and animated normals, and their geometry remains shared. Each avatar releases only its own mixer, skin palettes and outline material; world shutdown releases shared GLB resources once.

Animation reuse contract: a self-contained GLB is supported per character archetype. It is loaded once and does not download separately for each player. New classes with changed rest-bone placements/proportions require verified retargeting/baking before sharing clips; humanoid shape or matching names alone is insufficient, especially with absolute translation/scale channels. No automatic wardrobe or retargeting system is introduced here.

Cleanup: removed the obsolete code-only `placeholder-player.ts`; no raster assets were superseded, and active legacy 2D atlases remain. The external owner source is untouched. No scratch source copies, conversion scripts or generated textures are retained. QA output belongs in `test-results/terrain-novice`.

Validation: production build/typecheck passed. Seven browser checks across terrain entry/navigation/loading lifecycle, hover/selection/approach, 5x direction changes including simulated 300ms acknowledgement delay, and independent novice Idle/Run passed after updating two timing/float-sensitive input assertions. Inspected idle, run and skinned-outline screenshots. Model request count stays one when another player joins; geometry/materials are shared and bones are independent. Remote departure leaves the local avatar functional; logout/reentry creates one working canvas. No shader/animation-binding errors were reported. Existing build chunk-size warnings remain.

## Owner-supplied painted terrain — 2026-11-13

2026-11-14 validation: build/typecheck passed. In-game screenshots at 50%, 100% and 200% zoom plus the riverbank were inspected; no browser/shader errors. Removed the obsolete rotated patch shader; all four runtime paintings remain in use, so no image or exporter was removed. QA: `test-results/terrain-straight-tiles`.

Four 1254×1254 opaque sRGB PNGs are integrated for the 3D city only, copied byte-for-byte from the owner attachments. Runtime directory: `public/assets/tiles/terrain/`. Source names start with `ChatGPT Image Nov 13, 2026, `; the suffix mapping is:

| Supplied suffix | Runtime filename | Role |
|---|---|---|
| `11_05_27 AM-1.png` | `painted-grass-v001.png` | Dominant green grass |
| `11_05_28 AM-2.png` | `painted-dry-grass-v001.png` | Localized dry/yellow grass |
| `11_05_29 AM-3.png` | `painted-earth-v001.png` | Bare earth and riverbank soil |
| `11_05_30 AM-4.png` | `painted-grass-earth-v001.png` | Worn grassy transitions |

No image generation tool/model was used; no prompt or reference attachment was fabricated. Dimensions and exact source equality were checked with Sharp and byte comparison before/after import. These user-supplied images supersede the old grass/dirt tile source for 3D rendering, with a scoped exception to default export dimensions. Owner correction 2026-11-14 replaces the triangular random-orientation/interior-patch sampler with ordinary repeated full images. All four textures use RepeatWrapping and the same world-space UV `groundPoint.xz / 16.0`, with mip filtering and anisotropy 4. No per-tile rotation, mirroring, jitter, domain warp or overlapping copies of the same painting remain. The input images are unchanged and are not claimed to be newly authored seamless tiles; their repetition is intentional. The region paint mask still blends grass, dry grass, worn ground and earth softly, independently of the fixed texture coordinates.

The painted mask uses rotated, domain-warped noise and broad transitions, calibrated to 80% blended grass weight over dry terrain (not a claim about exact leaf-pixel coverage inside the supplied mixed image). Green is dominant, dry grass is localized and the grass/earth image softens worn margins. The supplied earth continues down banks with a gradual wetness darkening. Removed the former procedural pebble overlay and reduced normal relief to preserve the source brushwork. Water, standing bank grass, heightfield and navigation are unchanged.

Validation: build/typecheck and four terrain/material browser checks passed. The extended material check also passed with actual dry clearings and grass/earth transitions. Screenshots at 50%/100%/200% zoom, clearing/transition, shoreline and mobile were inspected; the material suite checks all four runtime requests, 80% mask weight, no grass underwater, animated/reduced-motion water and player-occlusion fading. QA images stay in `test-results/terrain-materials`.

Cleanup audit: all four imported images are loaded by `loadTerrainTiles`; no scratch candidates, raster derivatives, duplicate sources or exporters were created. Old `public/assets/tiles/mythraven-grass.png` and `mythraven-dirt.png` remain required by the active legacy `src/world/town-ground.ts` route and are intentionally retained. User Downloads originals are untouched. This is the requested local integration, not a new project-wide visual-master approval.

## Riverside oak 3D candidate — 2026-11-12

One green oak is integrated for local review at world X=-6, Z=133, beside the southern canal near the initial spawn. `public/assets/models/trees/riverside-oak-v001.glb` is self-contained: 954,944 bytes, 16,800 triangles, two meshes/materials, 480 fixed spatial curved leaf sprays, modeled tapered branches and eight spreading roots. The 512×512 embedded foliage PNG has genuine alpha (0–255), transparent gaps and padding. No camera-facing whole-tree billboard or solid primitive crown is used. Runtime tint retains a green canopy under the existing warm lights. Static tree shadows use a localized 2048px directional shadow map; subtle leaf motion stops under reduced motion.

Image generation: built-in `image_gen`, model version not exposed. Actual attached reference: `public/assets/props/trees/mythraven-tree-oak-v001.png`. Shared painted-fantasy prefix and object suffix plus template E were adapted for one foliage card. Maintained brief: an airy irregular oak twig spray with individually readable lobed leaves, moss/olive greens, pale tips, muted underside, soft painted shading, actual transparent gaps, no trunk/ground/UI. The generated leaf image is a texture, not the 3D tree model. The model is authored by `scripts/build-riverside-oak.mjs` using deterministic curved branch geometry and layered leaf sprays, then exported to GLB with the validated texture embedded.

The PNG at `art/source/trees/riverside-oak-leaves-v001.png` is the active input required by that maintained model builder; it is not a spare candidate. Regenerate with `node scripts/build-riverside-oak.mjs`. The earlier separate public texture export was moved to this active source location when the GLB became self-contained. No old 2D tree was replaced or relabelled; no scratch candidates, preview exporters or duplicated runtime textures remain in the project. QA screenshots belong under `test-results/terrain-tree`.

Collision is a shared 0.9-unit trunk radius plus character clearance; the canopy remains walkable. The projected crown fades to 8% opacity when it hides the local player, with a softer trunk fade; opacity restores when the player clears it. Resources and the shadow map are disposed on logout. This is one review tree; a forest-scale LOD/performance pass is required before multiplying this model across the whole map. No final visual approval is inferred.

## City terrain 3D — 2026-11-11

2026-11-12 bank/water correction: water highlight dots were a shader effect, not texture seams. Replace their isolated emissive peaks with soft continuous wave bands, small normal ripples and shoreline wash. Banks use a low-contrast elevation blend between dry and wet earth; reduce sand-patch contrast and high-frequency bank bump detail. Existing tile PNGs remain unchanged, as do bank grass and navigation geometry.

2026-11-12 material/vegetation extension: existing 512px mythraven-grass.png and mythraven-dirt.png remain unchanged runtime sources, shared with the legacy town. World-space sampling, procedural sand/grain and calibrated blended grass coverage (80% over exposed land) replace flat colors. Owner accepted upper ground, removed bank gravel and requested separate upright grass at the upper lip. Clumps contain nine tapered ribbon blades, instanced in 24-unit spatial batches, with approximately 0.5–1.75-unit heights. Placement follows dry shoreline distances 3.7–7.6 and excludes the lower submerged bank. Grass adds no navigation blockers. Projected local-player silhouette and interpolated view depth reduce occluding blade opacity to 8%; other grass retains normal opacity. Water stays at Y=0 with depth-dependent transparency and moving ripple normals. Reduced motion freezes water and wind. Logout disposes textures, instancing buffers and materials. No new raster asset or exporter; no superseded image removal applies.

Follow-up: a temporary code-native capsule (radius 0.65, total height 2.8, feet at local Y=0) appears on entry and follows terrain height while walking. South-facing orthographic follow camera, left-click movement, no orbit/pan. No image export or final model approval; sprite contracts remain unchanged.

The default city ground is a code-native 500 × 500 unit heightfield (X/Z, Y up), with 384 × 384 segments, plateau near Y=3.5, water Y=0 and riverbed near Y=−6. The existing land-mask alpha drives the old shoreline at 500 × 375 units, with 62.5-unit extensions north/south. No raster asset is replaced or generated. This is a terrain-only review candidate with a 2.5D camera; current sprite specifications remain historical/active for the explicit `?view=2d` comparison. Runtime, scope, lifecycle checks and retention audit: [3D terrain contract](../TERRAIN_3D.md).

## Fountain parterres and residential mix — 2026-11-06

In the 1448×1086 plan, round the outer corners of the four formal fountain beds and cut each inner edge to the basin's radius-82 arc, projected at 0.55 depth. The straight shoulders flank the four streets with a 24-unit half-gap. At the castle, reflect the elongated chamfered beds and their shallow curved fronts across the stair axis at x=740, with inner ends at x=710 and x=770. All six flower surfaces sit 52 world units above the ground with a 38-unit stone coping. Shared outlines drive blocking, depth and minimap composition.

The west cottage uses cottage-v003 (800×759) and the southeast townhouse uses townhouse-v003 (588×800), restored from the original paintings with their matching foundation profiles. The remaining house lots use v004. Both restored PNGs are active world and minimap assets.

## Capital buildings and vendors

The three v004 buildings and v002 castle show two pitches of the main roof from above the south facade. Built-in ImageGen redrew each previous sprite with object template E. Crop and proportionally scale the cottage, townhouse and guildhall to 800×745, 580×800 and 784×800. The castle uses its padded 1800×1068 registration and separate animated cloth attached to the new pole coordinates. Foundation outlines in `shared/town-properties.mjs` follow the painted masonry and steps. World and minimap use the same art. The v002 stall and handcart use an oblique vendor view. This set replaces the three v003 buildings and the original wide castle sprite.

## Garden geometry and wall-overlapping crowns — 2026-11-04 correction

Supersedes the original flowerbed outline, flower-repeat and row-sorting contract below. Four fountain beds share an exact square-minus-circle construction centred at plan(750,496): outer half-size132, inner radius84 and cardinal half-gap24. Reflect one corner across both axes; keep the original painted lighting fixed. The beds extend over the outer tiled court corners and retain all four approach routes. Castle beds retain their mirrored stepped outlines.

Flowers repeat at672x576world units (60% larger blossoms), with the same512px runtime PNG. Stone repeat remains256x224, coping32 and elevation36. Each transparent garden canvas is split into8-canvas-pixel vertical columns. Each column sorts at its furthest actual ground-outline intersection plus coping half-width, including adjacent rim coverage. This removes the previous double elevation allowance on front faces/shadows. Fade additionally requires the actor's feet to be behind the local front outline, so a shoulder near a curved edge cannot fade the entire bed while standing in front; actual covered-body alpha checks remain enabled. World and minimap use identical column depths. Collision follows the same new polygons.

Tree roots and all1914 placements remain unchanged. Each tree's drawing depth clears every intersecting raised wall section, preventing vertical wall strips from cutting through its crown. Towers retain their existing depth ordering. The same corrected tree depth is used on the minimap; local-character occlusion fading remains enabled. No game PNG has been replaced or superseded and no new generation tool was invoked.

Validation: production build and23 server tests passed. Edge tree regression checked883 overlapping wall/tree pairs, actual movement under a canopy, root collision and reentry; landmark regression preserved fountain/castle fade and minimap rendering. Final garden regression checked18 front-edge probes across all six beds at alpha1, six covered-body probes at0.48, a real walk in front of the NE curved edge at alpha1, four fountain approaches, castle access, collision rejection, unchanged minimap and reentry with six textures/480 columns/1922 fade listeners. Final screenshots inspected in test-results/flowerbeds and test-results/exterior-trees. Removed the two temporary garden-corrections test helpers; all temporary5183/3101/2667 services are stopped. Seven active tree/flower material PNGs remain referenced; no obsolete raster or exporter was introduced.

## Six formal flowerbeds and bridge-bank infill — 2026-11-04
Owner's annotated map requests four curved corner beds around the fountain and two stepped beds flanking the castle forecourt, plus trees in seven remaining riverbank pockets near the bridges. Implemented for local review; no new global art-master approval is inferred.

Two active painted material files: public/assets/props/flowerbeds/mythraven-flowers-v001.png and mythraven-stone-v001.png, each512x512 opaque PNG. Built-in image_gen.imagegen (model version not exposed) generated each independently with the actual runtime mythraven-fountain.png attached as palette/stone reference. Shared Soft Painted Fantasy2D prefix, template-C overhead material brief and seamless suffix used; floral planting fill is an explicit exception to the ordinary terrain template's no-objects rule. Subject prompts: dense low dusty-pink rosettes, pale-yellow daisies and ivory blossoms nested in moss-green foliage with tiny earth gaps; separate warm-ivory dressed limestone blocks with subtle beige joints and chisel grain. Uniform flat overhead lighting, soft painterly shading, faint outlines, no text, watermark, scenery or glossy3D appearance. Export uniformly downsamples each whole candidate into a256px quadrant and mirror-packs four quadrants into512px for exact opposite-edge continuity. No recoloring or manually painted flower replacement. Three-by-three repeats, game scale and assembled silhouettes inspected. Runtime materials are the maintained originals; no source/exporter archive is required.

shared/flowerbeds.mjs defines six rounded concave outlines in the1448x1086 plan: fountain NW/NE/SW/SE and castle west/east. The curved arms are mirrored as geometry only; lighting/material imagery is not rotated. Castle beds preserve the broad central gate approach. src/world/flowerbeds.ts uses the two reusable materials to compose six transparent canvases at the game's reference half-world resolution. Coping rim32world units, low elevation36world units, short lower-right contact shadow; flower repeat420x360world units, stone repeat256x224.166 rows, each16canvas pixels high, sort by projected ground depth so actors in concave openings are not hidden by distant parts of the same planter. Existing alpha-based occlusion fading applies per bed. Minimap uses the same canvas rows in the landmark depth queue. Shutdown deletes the six transient textures and cached canvases; no scratch path is referenced at runtime.

Server/client movement uses shared polygon-versus-cell contact with the rim margin. Concave openings stay walkable, while narrow arm crossings are solid even when no polygon vertex falls in the movement cell. The fountain's four cardinal approaches, original spawn and castle entrance remain reachable. Existing dirt/grass coverage, paving masks and85% natural grass target remain unchanged by this task.

Tree infill:114 additional roots,1914 total. Seven marked pockets received21/27/16/2/19/14/15 trees; smaller310–680world-height instances fit beside the landings. The previous overly broad clearing rectangles are superseded by west[0,448,270,532], east[1210,448,1448,532], south-approach[708,880,772,935] and south-span[682,935,798,1086]. All complete crowns avoid these retained bridge/warp openings. Roots also avoid water, paving and masonry. Original1800 tree roots and all five tree PNGs are retained.

Validation: build/typecheck passed;23 server tests passed, including concave collision, thin-arm contact, six approach routes, grass fraction and all bridge connections. Three Edge suites passed: six flowerbeds/actual four-axis fountain walks/castle entry/server rejection at planting/minimap/reentry; all three bridge return trips; fountain/castle opacity regression. Reentry maintains6 garden textures,166 row images and1922 POST_UPDATE listeners; no browser errors. Evidence: test-results/flowerbeds, test-results/fortifications and test-results/landmark-visibility. Temporary export/infill/test helpers removed; temporary5183/3101/2667 services stopped. Existing unrelated5173 server left untouched.

## Exterior mainland trees — integrated 2026-11-04

Latest owner extension:1800 trees, including outside-wall island gardens and132 near the castle, supersedes the260-tree scope below. Counts530oak/275birch/496pine/258golden/241blossom. Existing roots retained; new heights470–890world units. New spacing7+(combined heights)/400 plan pixels with Y weighted1.2 gives heavily overlapping canopies. Roots sample safe land over12x10 plan pixels; building/tower footprints use world geometry converted to plan units. Keep crown exclusions at all three bridge/warp areas. Side/rear castle gardens extend into the nominated northern area with narrow service access preserved; ordinary city districts remain clear. Edge crowns may be cropped by map bounds, intentionally hiding the edge with forest. Five runtime PNGs reused unchanged; no additional raster export or image tool call.

Static tree ellipses are precomputed into a shared movement-grid bitmap so pathfinding no longer scans1800 roots for every cell query. It preserves the same ellipse-versus-cell contact test, including boundary contact. Fade checks reject distant sprite bounds before reading cached alpha and skip unchanged opacity. Trees, wall pieces, castle columns and fountain now share a single depth-sorted minimap draw queue, matching in-game foot depths where forest crowns meet masonry.

Grass target is85% of natural dirt/grass area, explicitly selected by the owner, excluding water, roads and courts. scripts/export-capital-map.mjs combines original coverage with65/19-plan-pixel smooth noise, then binary-searches a soft threshold weighted by unpaved land. Existing material textures and all paving shapes remain; only mythraven-grass-mask.png changes, with cache revision grass85-20261104. Final weighted alpha coverage is85.023% of natural land (67.536% of all land because paving occupies20.568%). Existing painted patches expand into formerly bare soil while preserving organic dirt gaps. No new image-generation call.

Final validation for1800-tree/85%-grass revision: build passed;22 server tests passed, including measured grass fraction, dense castle/outside-wall placement, trunk blocking, all three gate routes and connectivity of every walkable destination. Three Edge suites passed: trees (actual walk, fade, rejected root command, minimap, reentry with1800 images/1802 listeners); all three bridge return trips; fountain/castle visibility and fountain minimap regression. City overview, castle rear forest and outside-wall garden screenshots inspected. Temporary placement/isolated-service helpers removed; test ports5183/3101/2667 shut down. Existing unrelated5173 service was not altered. See cleanup-dense-gardens-2026-11-04.json.

Current density revision:260 trees, up from74; original roots retained and186 new roots added. Counts:84oak,35birch,65pine,43golden,33blossom. Additional heights380–820world units; root separation reduced to12+(combined canvas heights)/190 layout pixels, with Y distance weighted1.2, so canopies overlap as forest groves. Same outer-mainland/water/road/court checks and unchanged full-crown bridge clearings. No raster regeneration or asset replacement. Build and21 server tests passed; browser check passed actual walk under canopy, server rejection at root, full-opacity minimap and reentry with260 images/262 fade listeners. Screenshot evidence remains in test-results/exterior-trees. Speed test now starts at the clear town SPAWN instead of the former outer-bank fixture, which is now occupied by tree roots. Removed the three temporary density-placement/test helpers and stopped5183/3101/2667 after validation.
Owner requests five tree types around the river's outer mainland, mixed sizes and colors, with bridge approaches reserved for future exits/warps. Five separate candidates were generated on2026-11-01 with built-in image_gen.imagegen (actual model version not exposed), using the actual runtime castle as rendering/camera reference and the actual runtime grass as palette reference. Original generation candidates are not an approved global style master. Integrated for local review under Soft Painted Fantasy 2D.

Runtime files: public/assets/props/trees/mythraven-tree-{oak,birch,pine,golden,blossom}-v001.png. Each is512x768 RGBA, uniformly downsampled from1024x1536 without recoloring or painted alterations. True transparent backgrounds and clear outermost edges verified; fully transparent RGB zeroed. Source-space root pivots after downsampling: oak(256,652), birch(272,702), pine(256,704), golden(256,638), blossom(256,638). Each runtime PNG is the maintained original; no extra source/exporter is needed.

shared/exterior-trees.mjs owns the five texture specifications and74 fixed roots in the1448x1086 layout:21 oak,9 birch,19 pine,14 golden and11 blossom. Full canvas world heights430–790 give mixed visible heights relative to the approximately80-screen-pixel player. Positions were selected from land connected to the image border, excluding the central island, water, road/court roots and roots within12x9 layout pixels of unsafe terrain. Crown bounds avoid three explicit bridge/warp clearings: west[0,420,270,570], east[1210,420,1448,570], south[650,880,830,1086]. Future warps are reserved space only; no portal mechanic is added.

Separate Phaser images sort at the measured root Y. Each tree uses existing source-alpha occlusion fading to0.48 while hiding the local player, then restores opacity. Five source masks are shared by texture; shutdown removes per-tree listeners. The minimap draws the same full-opacity tree art at identical placement/scale. Client and game server share elliptical trunk collision, radii36x24 multiplied by sprite scale; canopy overhang is walkable. No navigation bitmap or terrain material is replaced by this tree task.

Generation prompt set: shared ART_STYLE prefix, shared template-E camera/composition/lighting constraints and object suffix, one separate call per type. Subjects: broad lobed moss-green oak with sturdy brown branches; slender airy lime-green birch with ivory bark; tapered irregular evergreen pine in muted green/sage; broad golden-yellow maple with warm ochre shading; spreading dusty-pink flowering cherry. Common brief: original isolated2D painted fantasy MMORPG prop, elevated orthographic-like slight3/4 view, soft top-left lighting,2–3 painterly tones, faint outline, grouped readable leaves, complete visible trunk/root and10% transparent padding; short soft bottom-right shadow, no ground patch, scenery, text, watermark, glossy3D look or copied designs. Actual generated alpha is preserved. Full temporary prompt/candidate/export records are discarded after validation under the owner's cleanup policy.

Validation: npm run build passed;21 server tests passed, including root collision, crown exclusion from all three clearings, bridge connectivity and reachable navigation. Edge browser tests passed tree rendering/fade/server-root rejection/minimap/reentry and real return trips through all three bridges.74 images and76 POST_UPDATE listeners persist exactly once after reentry; no browser errors. Inspected world screenshots and full minimap in test-results/exterior-trees. Port5173 belongs to a separate character-design-studio project, so verification used temporary5183/3101/2667 services; those services were shut down afterward and the unrelated server was left untouched.



> Current guide (2026-10-12): [ART_STYLE.md](../../ART_STYLE.md) is authoritative for new images. Its visual tokens, palette, ground/object rules, registry, naming and variant workflow override conflicting defaults below. This document retains legacy guidance and technical contracts; see [STYLE_MIGRATION.md](STYLE_MIGRATION.md). Existing assets are not automatically approved under the new guide.



ข้อกำหนด export ขั้นต้น ยังไม่ได้เพิ่ม loader หรือ asset pipeline ในโค้ดเกม



## Terms

- **Sprite**: ภาพ 2D ที่เกมนำไปแสดงเป็นวัตถุ/ตัวละคร

- **Animation frame**: ภาพหนึ่งจังหวะของการเคลื่อนไหว

- **Sprite sheet**: รวมเฟรมขนาดคงที่เป็นตาราง พร้อมข้อมูลว่าช่องไหนคือเฟรมอะไร

- **Texture atlas**: แพ็กภาพหลายขนาดพร้อม metadata ตำแหน่งและขนาดแต่ละภาพ ไม่ใช่ uniform grid

- **Tileset**: ชุดชิ้นภาพสำหรับประกอบพื้น/แผนที่

- **Tilemap**: ข้อมูลการวาง tile/layer/collision ไม่ใช่ภาพเพียงไฟล์เดียว

คำว่า image mapping กว้างเกินไป งานตัวละครนี้ให้ระบุ sprite sheet + animation metadata



## Coordinate and export rules

- ทุกพิกัดเป็น pixel จากซ้ายบน; X ไปขวา Y ลงล่าง

- PNG RGBA เป็น source/export มาตรฐาน sRGB; alpha จริง ไม่มีลายตารางวาดติด

- WebP lossless RGBA ใช้สำหรับ runtime ได้หลังตรวจ alpha/สี; ห้าม JPEG สำหรับ cutout

- ขนาดที่ระบุเป็น final export หลังจัดภาพ ไม่อ้างว่า generator จะออกมาขนาดตรงทันที

- การ crop/resize/pack ต้องคง aspect ratio และ transform เดียวกันตลอด animation ไม่ auto-fit ทีละเฟรม

- ไม่ trim เฟรมใน uniform sprite sheet; padding ภายในเฟรมและช่องว่างระหว่างเฟรมเป็นคนละเรื่อง

- ออกแบบที่ source 2x ของขนาดเล่น; default runtimeScale=0.5 ต้องทดลองที่ scale นี้จริง



## Character profile: humanoid-v1

| Field | Value |

|---|---|

| Frame | 240 × 240 px |

| Anchor in every frame | (120, 216) |

| Phaser origin | (0.5, 0.9) |

| Standing body height | ประมาณ 144 px จากยอดศีรษะถึงพื้น ไม่รวมอาวุธ/ผมส่วนยื่น |

| Runtime standing height | ประมาณ 72 px ที่ scale 0.5 |

| Safe outer margin | อย่างน้อย 12 px; อาวุธ/เอฟเฟกต์ห้ามตัดขอบ |

| Directions | S, SW, W, NW, N, NE, E, SE |

| Sheet unit | หนึ่ง character + appearance + action + direction + revision |



S คือหันลงหน้าจอ, N หันขึ้น, E ขวา, W ซ้าย ไม่ใช่ทิศที่ตีความจากใบหน้าผู้ดู

8 ทิศไม่เท่ากับ 8 เฟรม: walk 8 เฟรม × 8 ทิศ = 64 ภาพต่อ appearance

แยกไฟล์ตามทิศ ห้าม auto-mirror เมื่อลายชุดหรืออาวุธไม่สมมาตร



| Action | Frames | Columns × rows | Sheet px | fps | Repeat |

|---|---:|---|---|---:|---:|

| idle | 4 | 2 × 2 | 480 × 480 | 4 | -1 |

| walk | 8 | 4 × 2 | 960 × 480 | 10 | -1 |

| attack | 6 | 3 × 2 | 720 × 480 | 10 | 0 |

| cast | 6 | 3 × 2 | 720 × 480 | 8 | 0 |

| hurt | 2 | 2 × 1 | 480 × 240 | 8 | 0 |

| death | 6 | 3 × 2 | 720 × 480 | 8 | 0 |



Repeat -1 หมายถึงวนต่อเนื่อง; 0 เล่นครั้งเดียว; death ค้างเฟรมสุดท้ายโดย state ของเกม

ลำดับเฟรม row-major: ซ้ายไปขวาแล้วลงแถวถัดไป เริ่ม index 0; margin=0 spacing=0

ตัวอย่าง walk: แถวแรก 0,1,2,3 / แถวสอง 4,5,6,7

ภาพอ้างอิง 3×3 มี 8 ภาพ แต่เราเลือก grid ที่ไม่มีช่องว่างเพื่อเลี่ยงเล่นเฟรมเปล่า

ไม่บังคับผลิตทุก action ในครั้งแรก เริ่ม idle S และ walk S ก่อน แล้วขยายตามคำขอ



### Animation invariants

Identity และปริมาตรตัวคงที่; ตำแหน่ง anchor คงที่ แม้ pose ย่อตัวหรือกระโดด

Walk เป็น in-place cycle ไม่มีการเลื่อนทั้งตัวในเฟรม; runtime ขยับตำแหน่งโลก

การขยับมือ ผ้า และตัวขึ้นลงเป็น motion ที่ตั้งใจได้ แต่ต้องไม่เกิด drift ของฐานเฟรม

Attack/hurt/death อาจต้อง profile ใหญ่กว่า: ขยายครบทั้งชุด action แล้วระบุ frame/pivot ใหม่ ห้ามบีบตัวให้พอดี 240

แยก VFX ของสกิลออกจากร่างกาย; hit timing เป็นข้อมูล gameplay ไม่อนุมานจากภาพ

เกราะ/อาวุธแยก layer ในอนาคตต้องแชร์ frame dimensions, anchor, frame count, fps, direction และ animation phase เดียวกัน พร้อม attachment points



## Other profiles

| Type | Default export | Runtime scale | Anchor / note |

|---|---|---|---|

| Ground tile | 128 × 128 | 0.5 | top-left; 64 × 64 screen px |

| Prop small | 240 × 240 | 0.5 | ground contact บันทึก pixel pivot |

| Tree | 480 × 720 | 0.5 | default pivot (240,648), ปรับใน metadata หากจำเป็น |

| Building | ขนาดตาม brief เป็นจำนวนเท่าของ 128 | 0.5 | pivot/footprint/roof layer ระบุแยก |

| Inventory/equipment icon | 96 × 96 | 1 | object ในกรอบกลาง 76 × 76; UI ย่อได้ |

| World pickup | 64 × 64 | 0.5 | pivot (32,48), alpha |

| Skill icon | 96 × 96 | 1 | subject ใน safe area 76 × 76 |

| UI panel parts | ตาม UI brief | 1 | nine-slice insets ต้องระบุ; ไม่ bake text |

| VFX | ตาม effect brief | ระบุ | frame grid, pivot, blendMode, fps ต้องระบุ |

| Monster | ตาม relative size | 0.5 | frame/anchor มี profile เฉพาะ; ใช้กติกาทิศและเฟรมเดียวกัน |



Props ใช้ depth จาก world ground Y ไม่ใช่ขอบภาพด้านล่าง; collision footprint ต้องระบุแยกจาก silhouette ไม่สร้าง collision ตามใบไม้ทั้งต้น

Atlas ที่ trim ต้องบันทึก sourceSize/spriteSourceSize และชดเชย pivot; MVP ใช้ untrimmed เพื่อลดความผิดพลาด

แผนที่ต้นแบบเสนอ 32×24 logical cells = 2048×1536 screen px; เป็นข้อเสนอสำหรับ map จริงในอนาคต ไม่ใช่ขนาด WorldScene ปัจจุบัน

Tiles ต้องมี variant/transition และทดสอบวางซ้ำ 4×4; ห้าม bake ต้นไม้ NPC เงาตัวละคร HUD หรือชื่อพื้นที่บน ground tile

แยก ground / decals / props / overhead; collision/spawn/portals เป็นข้อมูล ไม่ใช่ภาพ generate



## Naming and storage

Use stable lowercase kebab-case names without revision suffixes (user request, 2026-10-12), e.g. daflak-grass.png and mythraven-logo.webp.

- art/source/<category>/<asset-id>/ keeps the current original, prompt and metadata.

- public/assets/ contains only current runtime exports.

- docs/art/references/ contains visual references, not runtime assets.

Remove superseded images after checking code, exporters and metadata. Update all paths together. Do not keep abandoned image variants. Metadata may retain historical generation details; MR-ART-v1 remains the shared style identifier.



## Example metadata (illustrative, not a shipped asset)

```json

{

  "styleId": "MR-ART-v1",

  "assetId": "novice-male-base-walk-s",

  "revision": "v001",

  "status": "candidate",

  "image": "novice-male-base-walk-s-v001.png",

  "profile": "humanoid-v1",

  "direction": "S",

  "action": "walk",

  "frameWidth": 240,

  "frameHeight": 240,

  "columns": 4,

  "rows": 2,

  "frameCount": 8,

  "margin": 0,

  "spacing": 0,

  "anchorPx": [120, 216],

  "origin": [0.5, 0.9],

  "runtimeScale": 0.5,

  "frameRate": 10,

  "repeat": -1,

  "references": [],

  "promptPath": null,

  "sourcePath": null

}

```

references/promptPath/sourcePath ว่างได้ในตัวอย่างเท่านั้น ต้องเติมค่าจริงก่อนใช้เป็น asset record



## Export validation

1. ตรวจ dimension: width=columns×frameWidth, height=rows×frameHeight

2. frameCount ไม่เกินจำนวนช่อง; frame range ต้องตรง action และไม่มี blank slot ถูกเล่น

3. ตรวจ alpha บนพื้นขาว ดำ และพื้นเกม ไม่ใช่ดู checkerboard อย่างเดียว

4. เทียบ anchor และ identity ทุกเฟรม ทั้งภาพนิ่งและ playback

5. ตรวจ loop seam, เท้าไถล, อาวุธสลับมือ, pixel/สีสั่น และขอบถูกตัด

6. วางคู่ master ในเกมที่ runtimeScale; ตรวจ depth, blending, collision และความอ่านง่าย

7. บันทึกผล QA ก่อนย้ายเป็น runtime-ready; manifest นี้ยังไม่มี automated validator



## Daflak ground composition

Movement cells are 64 x 56 world pixels, displayed at 32 x 28 CSS pixels with camera zoom 0.5. Map dimensions are frozen at entry, approximately two viewport widths by three viewport heights. Production multiplayer will require shared map dimensions.

Grass repeats at 460.8 x 403.2 CSS pixels, paving at 128 x 112, plaza at 128 x 89.6. The central patio is 352 x 231 CSS pixels. This ground-only foreshortening leaves character proportions unchanged.

Grass overlays form irregular visible encroachment along exposed paving edges; intersections remain connected. These decorative edges do not alter collision. Ground chunks and minimap share the same composition. Current bridge facades remain technical placeholders, not final directional sprite art.

Sources: art/source/tiles/daflak-ground and art/source/tiles/daflak-water-bank. Export with node scripts/export-daflak-materials.mjs.



Northern castle reservation: rectangular flagstone court centered on the north approach, joined to the ring road. Paving only, fully walkable until separate castle props/collision are authored. Grass uses a single fixed-orientation pattern at 460.8 x 403.2 CSS pixels. No rotated, feathered, mixed-scale lawn overlays.



Water is a separate two-layer animated TileSprite beneath transparent ground chunks. Mirrored edge pixels remove hard repeat seams; layers use different scales, offsets and slow drift to soften repetition. Existing water art is reused, not a generated sprite sheet. Ground, bridges and collision stay static; minimap remains a still overview. Runtime water textures/listeners are released on scene shutdown.



Current grass uses a standalone regenerated source in art/source/tiles/smooth-meadow/grass: plain grass blades only, no baked flowers or clover. Export stays 512 x 512 and world scale is unchanged. The older atlas now supplies only paving and plaza.



Grass/detail separation: current grass is flower-free, with blades displayed 50% larger. Three transparent 128px flower exports (yellow wildflowers, clover, tulips) from art/source/props/daflak-flowers are drawn as seeded decorative clusters, 22-36 CSS px wide. Whole footprints exclude roads, court and water. They remain walkable low ground decals, not collision props; positions persist across reentry at the same world size. Export with node scripts/export-daflak-flowers.mjs.



Latest 2026-10-13: smooth grass and separate transparent earth transitions replace dense grass. Current repeat preview: assets/_tests/grass-repeat.png. Re-export grass, earth and current low-cover sprites with scripts/export-meadow.mjs.



Earth placement: seeded full 360-degree ground-plane rotation, varied width/aspect/opacity, 70% partial circular feathered source crops and 30% complete decals. Crop canvases are built once per scene, shared by cached chunks and minimap. Circumscribed placement footprints exclude paving, castle court and water. Source artwork is unchanged.


## Mythraven painted ground integration — 2026-10-13
Owner approved dirt v003 plus grass BG-04 v001 and requested local integration. The ground renderer now composes public/assets/maps/mythraven-dirt.png with a fixed-scale repeating public/assets/tiles/mythraven-grass.png using mythraven-grass-mask.png. Mask has bare soil, partial coverage including 50%, and full grass; narrow paving mortar is excluded by a soil-neighborhood filter. Deterministic export: node scripts/export-mythraven-town.mjs. Objects and flowers are not baked/added. West/east/south crossings are removed; north crossing remains. Navigation uses mythraven-navigation.png, rejecting any movement cell overlapping water. Minimap uses exactly the same composited chunks. Entry-viewport dimensions and fixed zoom 0.5 remain unchanged. Base image includes static water; previous animated water renderer is not active in this revision. Ground art uses the approved image composition, not a fully editable terrain tilemap yet; grass is independently masked and tiled.
QA: npm run build passed; Playwright tests/daflak.spec.ts passed (2 tests), including click walking, northern route, blocked removed crossings, coverage levels, camera/minimap alignment, resize and scene reentry. Visual screenshot: test-results/mythraven-grass.png. Corrected grass leaking into stone mortar found during screenshot review.


## Separate repeating paving — 2026-10-13
Owner requested sharp tiled stone and grass fringe. Base is now source mythraven-town-sand-v004.png (no baked roads). Export with scripts/export-mythraven-town.mjs; BG-05 paving export uses scripts/export-mythraven-paving.mjs. src/world/town-paving.ts defines the connected path/court/plaza coverage independently from textures and collision. Render order: sand/water base, grass through coverage mask, fixed-scale paving (512px texture repeated at 256x224 CSS pixels), sparse irregular grass tips overlapping the road, especially south edges. Paving is clipped to the navigation land mask. All chunk pattern origins align globally. Minimap reuses composited pixels. This is a repeating material layer with a path mask, not a Phaser Tilemap data format. Ground/shoreline remain a scaled image; this request fixes paving sharpness. Original grass density preserved except coverage now extends beneath the independent roads. No flower/object generation.
Validation: 3x3 paving repeat inspected, npm run build passed, city Playwright test passed. Screenshots test-results/mythraven-grass.png and test-results/mythraven-paving-bank.png reviewed. Reduced initially excessive uniformly spaced fringe to sparse clumps. Source candidates are integrated for review, not falsely marked owner-approved.


## Curved paths, animated canal and fountain courts — 2026-10-13
Supersedes static-water note above. BG-06 repeats at fixed world scale in two Phaser TileSprite layers beneath alpha-cut land chunks; horizontal sinusoidal drift reverses naturally while vertical drift continues. Shoreline, collision and land stay static. No generated animation sheet. Texture origins are anchored to world coordinates; scene shutdown removes listeners and water layers. Minimap water remains a static overview. Curved connected paths are Catmull-Rom-derived cubic curves through authored normalized points matching the owner's red-line intent, with paired left/right branches. Outer west/east/south stone approaches now extend to map edges and are clipped at the canal, leaving bridge gaps.
BG-07 is a separate 4x4 large granite slab texture, 96x84 CSS pixels per slab. Northern court and wider central court are chamfered octagons; central court has grass garden inset around the separate fountain. Fountain runtime RGBA 640x389, displayed 260 CSS px wide. Origin center, normalized position (.5,.488), ground depth center Y+152 world px; player depth follows feet Y. Elliptical collision radii 254x152 world px reject intersecting grid cells. Spawn is at 59% map height, south of basin. Jet, droplets and restrained ripples are code-animated separately.
Validation: build passed; city Playwright test passed in 25.6s, including water image movement with identical stone pixels, both UV direction signs, fountain jet movement, blocked basin and detour, camera/minimap, resize and scene reentry. No page errors. Screenshots: test-results/mythraven-grass.png, mythraven-north-court.png, mythraven-water-curves.png. Video: test-results/mythraven-water-preview.webm. Fixed an old screenshot test that requested a camera center outside the clamped viewport bounds. Installed Playwright FFmpeg solely for local video capture.


## Fountain jet sprite replacement — 2026-10-13
Supersedes the previous graphics jet/droplets. public/assets/fx/fountain-jet.png is 768x192 RGBA: four 192x192 frames, row-major 0..3, origin (0.5,0.875), 8fps looping, world scale 1. Source, prompts and normalization in art/source/fx/fountain-jet; deterministic export script scripts/export-fountain-jet.mjs. Shared normalization scale preserves relative frame size. Emitter aligns with (309,153) in the 640x389 basin image, transformed through basin scale. FOUNTAIN_JET in src/world/fountain.ts centralizes size, speed and attachment point. Visible jet approximately 66 CSS pixels high at camera zoom 0.5. Faint graphics basin ripples retained. RGBA and colored-sheet preview inspected; actual screenshot shows emitter aligned. Build and Playwright city viewport test passed, including all four animation frames, nozzle alignment, collision detour, restart cleanup and no page errors. Candidate integrated for review, not owner-approved.


## Tiered deity fountain integration
Supersedes old single jet contract. Static prop 640x629 RGBA, origin (320,462), world width 640 / screen width 320 at zoom 0.5, position (.5,.488), ellipse collision radii (320,138). Two bowls and tall statue extend above ground anchor. Depth ground Y+138; player depth uses feet Y. Water sheet 1024x512, 4 columns x2 rows of 256x256; frames 0..3 arcing jets root (48,112), 4..7 falls root (128,32), 7fps looping. Shared source scale 0.5 and root-normalized packing; runtime independent scales/mirroring match nozzle-to-landing geometry. Six lower outlets and four upper streams; separate ripple graphics and soft ground shadow. Export with node scripts/export-tiered-fountain.mjs; old exporter retained for historical outputs only. Current runtime filenames remain unversioned. Sources/prompts/metadata in art/source/props/mythraven-fountain/tiered-v002 and art/source/fx/fountain-tiered. Gameplay test: stable stone, active four frames, world nozzle alignment, blocked basin and real click detour, front/back depth, map camera/minimap/resize/restart, no page errors. Initial detour test endpoints were inside expanded blocked cells; moved them outside new footprint. Screenshot test-results/mythraven-tiered-fountain.png; video test-results/mythraven-tiered-fountain-preview.webm.


## Fountain ground-anchor correction — 2026-10-14
The former anchor (320,462) was on elevated pool water, causing the lower footing to protrude below collision and the front-edge depth to hide a player walking outside the basin. Correct 640x629 prop ground-plane anchor to (320,545), shared TOWN_CENTER (.5,.488) with plaza/garden, and solid ellipse (320,92) world radii. Static prop depth equals ground Y, with water layers +1..3. Player feet Y now sorts side/front correctly. All water roots use the same anchor transform; shadow follows corrected ground plane. No raster changes. Regression checks cover centered ground anchor, southern footprint contacts, actual detour and player visibly in front at the southwest exterior.


## Current round fountain v003 - 2026-10-14
Supersedes all preceding fountain contracts. RGBA 768x796, anchor (367,584), width 846 world px, physical base 400 CSS px wide at zoom 0.5. Collision ellipse radii (400,220), shared TOWN_CENTER (.5,.488), depth ground Y, VFX +1..3. Four arcs and four falls remapped to new measured nozzles, existing eight-frame atlas at 7fps. Central court paved underneath. Build and city Playwright test passed: four animation phases, stable base, nozzle alignment, click detour, front/back depth, camera/minimap/resize/reentry, no page errors. Screenshot test-results/mythraven-tiered-fountain.png.

## Ground direction preview - 2026-10-14
Owner requests mixed-size painterly paving stones with shallow bevel/contact relief and organic grass overhang/moss transitions rather than hard cut edges. This is a terrain-material exception allowing subtle local relief shading while overall tile lighting remains uniform. Affects paving and grass-edge materials, not fountain or login. Candidate only: art/source/previews/ground-v004/terrain-style-v001.png; not a tile export or approved master. Existing runtime remains unchanged pending preview review. Camera extent preview is 2 horizontal by 3 vertical viewports, validated separately using existing terrain.

## Painted reusable materials integrated - 2026-10-14
Owner approved ground preview and integration. Square 512x512 grass and paving tiles replace existing runtime paths; source/prompts in art/source/tiles/painted-town-v004. Material repeats and reusable irregular feather mask in src/world/terrain-materials.ts, retaining original town paths and separate granite courts. Grass repeats 512 CSS px, paving 256x224 CSS px. No flattened concept used as the town backdrop. Resize debounces a scene rebuild and preserves normalized player position, snapping to nearby walkable ground; desktop map remains approximately two viewports wide and three tall. Existing 40-cell minimum remains for small screens.

## Novice idle/walk preview — 2026-10-15
The owner accepts the brown frontal character design as the direction and requests preview only of idle and walk in eight directions, not game integration. Use S, SW, W, NW, N, NE, E, SE. Initial requested lightweight scope takes precedence over legacy tables: idle 1 static frame/direction and walk 4 frames/direction. Source and exports remain under art/source/characters/novice-eight-directions-v001. Preview frames 240x240, bottom-center feet anchor (120,216), approximately 144px character height. No claim of approved in-game seed: only concept design is approved. Each walking direction is generated as one complete strip, not independently generated frames. Chroma-key intermediate is an export workaround for persistent generator background haze. Final PNG previews must have real alpha. Animation candidates require visual timing/identity review and later in-game validation before runtime integration.

## Idle breathing / six-frame walk audit — 2026-10-15
Current preview now renders continuous three-second idle breathing around the fixed feet anchor (120,216), y-scale amplitude 1.2%, x-scale amplitude 0.4%; no new idle raster frames or runtime integration. Pause freezes breathing; frame stepping added for review. Owner requests walk six distinct chronological frames in all eight directions with true left/right gait alternation. Six-frame generated sheets were inspected in every direction and FAILED the complete-gait gate; SW/NE targeted sheet repairs, SW pose-guide attempt, and a single-frame correction also repeated the leading leg. Do not claim gait fixed, runtime-ready, or owner-approved. The main preview retains clearly-labelled old four-frame walking pending a valid replacement; six-frame diagnostic source candidates are in six-frame-v002 with per-direction findings. No public/assets or game code changed.

## Four-frame raster idle preview — 2026-10-15
Latest request: idle only, 4 real PNG frames × 8 directions. 240x240 RGBA, feet anchor (120,216); fixed scale per strip, 700ms per frame. No CSS scale breathing. Sources and metadata in art/source/characters/novice-eight-directions-v001/idle-breathing-v001. Preview-only candidate pending owner review; walk deferred and runtime unchanged.

## Approved runtime idle — 2026-10-15
Owner-approved fast timing supersedes 700ms preview default: 400ms/frame (2.5fps), repeat four frames. Atlas public/assets/characters/novice-male-idle.png 960x1920 RGBA; row order S SW W NW N NE E SE, frame240x240, origin(.5,.9), scale2/3 in world. Both local/remote player views. Movement temporarily holds direction's first idle frame; no walk approval implied. Build and idle/multiplayer browser tests passed.

## Novice size correction — 2026-10-15
Owner requests larger character matching the red outline. Uniform world scale is now 1.1 (was 2/3): approximately79-82 screen pixels tall at zoom0.5, 65% larger with unchanged body proportions and feet anchor. Label lifted to y=-180, shadow68x26 and selection ring82x36 world pixels. Applies to all player views. Atlas and 400ms idle timing unchanged; no new image or superseded asset.

## Common player size / west walk candidate — 2026-10-15
Male and female player sprites share the approved visible stature (~80px at zoom0.5): 240px frame, nominal standing height144px, feet(120,216), uniform world scale1.1. West walk preview has8 frames,4x2 sheet, full left/right stride cycle, same identity as approved idle. No other walking direction requested.

## Walk correction brief — 2026-10-15
Latest owner correction explicitly requests RIGHT-facing side view, near leg=left and far leg=right, eight unique phases contact/down/pass/up/opposite-contact/down/pass/up, opposite arm swing. Frame1 is identity/pose master after facing change. Latest background amendment overrides earlier green request: transparent RGBA only. Preview before runtime. Source folder art/source/characters/novice-walk-east-v001.

## Walk angle / leg phase correction — 2026-10-15
Owner requests right facing rotated about10degrees toward viewer from pure side profile to separate legs. Latest phase instruction supersedes previous: swap lifted leg in3/7; near left leg advances/leads4/5/6, opposite arms. Eight frames4x2, transparent exports, same approved stature. Candidate art/source/characters/novice-walk-east-v002, preview before integration.

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

## Runtime northwest / northeast novice walk — 2026-10-20

Owner authorized v015 gait integration with hair/style correction first. The finished `public/assets/characters/novice-male-walk-nw.png` is 960×480 RGBA, eight 240×240 cells in 4×2 row-major order. Animation `novice-walk-diagonal-up` uses frames 0–7 at 12 fps, repeat -1, origin (.5,.9), world scale 1.1. Feet baseline is y216. NW direction index 3 uses flipX=false; NE index 5 uses flipX=true. The shared player view handles both local and remote players. Stopping clears flip and restores the actual directional idle animation. W/E and SW/SE retain their existing animation contracts; only S/N movement retains the static idle fallback.

Appearance correction uses `image_gen.imagegen` with the actual runtime references and permanent control chart. Export locks the NW idle frame 12 head pixels (240×110 region beginning at atlas x0,y720) into all eight walking cells, without rescaling; only integer Y translation follows the pose. Full-body gait frames remain distinct, and this head lock does not alter pixels below the per-frame neck cut. Exported atlas dimensions, alpha, frame uniqueness, feet baseline and head identity are checked before integration. The runtime atlas becomes the maintained source; no temporary exporter or source archive is retained.

Validation completed: build/typecheck and both Playwright idle/walk tests passed, including six walking directions, all eight frames on both clients, mirroring and idle restoration. Final NW/NE screenshots were visually inspected. Cleanup completed 2026-10-21: 300 temporary files removed; permanent control reference retained. See `cleanup-nw-2026-10-21.json`.

### NW lower-body correction — 2026-10-21

The NW runtime atlas now uses slimmer calves, cuffs and boots matched against the shipped SW walk. Size remains 960×480 RGBA, eight distinct 240×240 cells, feet baseline y216, 12 fps, original NW/mirrored NE, scale1.1. The previous head and upper-body rows 0–154 are copied exactly; per-frame hand/tunic masks preserve the approved arm poses below that boundary. Idle/W/SW assets are unchanged. Build and the existing idle/walk Playwright tests passed (2 tests), including all eight frames on both clients, six walking directions and stop-to-idle restoration. Updated runtime SHA256: `fc0648725be3ad5f3db0ea848a3792f5fef6014dee3a9f035867aedc762c08be`. Temporary export and comparison files are removed after validation; see `cleanup-nw-leg-proportions-2026-10-21.json`.

### NW idle palette match — 2026-10-21

Subsequent owner-requested color correction lightens/desaturates the boot leather and slightly adjusts tunic brown toward actual front/NW idle. RGB-only material grading preserves every original alpha pixel, all head pixels in rows 0–114 and the existing frame/anchor/scale/timing contract. NW atlas SHA256 is now `48366e04cab15afbb5764c13d26279feb0b18395111111cee8c02f9b0db35b65`. The shared palette correction applies to all eight frames; NE mirrors the same atlas. Idle/W/SW are unchanged. See `cleanup-nw-color-2026-10-21.json` for validation and cleanup.

NW is requested as `/assets/characters/novice-male-walk-nw.png?v=48366e04cab1` to invalidate previously cached image URLs while keeping the physical filename unchanged. The `v` value is the first 12 characters of the approved file SHA256 and must be updated when replacing the atlas. The walk regression test verifies both clients received bytes matching the current runtime file and its revision URL.

## Expanded capital ground contract — 2026-10-31
Supersedes earlier2x3 viewport sizing, northern crossing and enlarged baked-background notes. Fixed240x206 shared cells,64x56 world units,15360x11536 bounds; zoom0.5; spawn(122,112). Reference1920x960 camera covers25% width and16.64% height (~4x6 spans). Resize never rescales the world or textures. Player worldScale1.1 remains unchanged (~80px visible height).

Ground compositor uses separate masks (land2896x2172, banks2896x2172, grass/roads/courts1448x1086), repeated512px materials and streamed512px screen-scale chunks with1px overlap. Visible chunks plus one margin are created on demand and evicted outside the range; textures/listeners removed on scene shutdown. Minimap reuses this compositor at reduced resolution. No full-world44MP canvases are allocated. Surface detail remains fixed regardless of map extent. Brick repeat192x168, slab repeat128x112 (4x4 slabs), dirt/grass256x224 screen px at zoom0.5.

The navigation PNG1448x1086 is binary; only the central island's connected land component, inset3 source pixels for shoreline clearance, is white. Each movement cell is rejected if ANY covered navigation pixel is black. Water, outer mainland, map exterior and the independently calculated fountain ellipse are blocked on both client and server. No north crossing remains. Land rendering has a smoothed higher-resolution edge, while conservative navigation remains inside the bank. All courts and terrain are traversable until future props add footprints. Source concept is an active mask-export dependency, not a runtime background; material PNGs are reusable final masters. Integrated for local walking review; visual approval pending.

Capital validation completed: build/typecheck passed;16 server tests and4 Edge browser tests passed (terrain extent/click/blocked river/chunk eviction/resize/reentry, two-client movement, idle, six-direction walking). All29,357 walkable grid cells are reachable from spawn. Measured standing alpha height144 source pixels x1.1 x0.5 =79.2 screen pixels. Opposite edges of all three new512px material tiles match exactly;3x3 repeats and six world locations inspected visually. Removed8 obsolete files plus8 temporary candidate/export/prompt files; retained only the active map-layout source, runtime materials and intentional references. No deployment.

## Northern castle and slow cloth animation — 2026-10-31
Shared CASTLE in shared/town-layout.mjs owns normalized location(740/1448,200/1086), world width3600, source1800x1068 and anchor(899,985). Uniform source-to-world scale2 at game zoom0.5. Source-space footprint union: [80,640,1720,858], [560,790,1245,960], [760,940,1045,986] (left/top/right/bottom). Cell-vs-rectangle overlap is blocked in shared/town-grid.mjs on client/server. Remaining28,801 walkable cells form one reachable component. The northern court is no longer wholly walkable; open apron and perimeter remain accessible. No interior, gate interaction or spawn relocation.

Castle source columns [0,560], [560,760], [760,1045], [1045,1245], [1245,1800] have source footing depths858,960,986,960,858. They share exact source pixels and transform, avoiding silhouette-based whole-building depth errors. Minimap draws the same building with the same transform. Castle and flag load only from public/assets/props/castle.

Flag cloth320x126 RGBA,40 columns8px each with1px overlapping sample, world scale0.75; two stationary attachment points in castle-source coordinates(168,173),(1632,173). Continuous travelling sine waves, primary period5.5seconds, up to12world-pixel vertical excursion at free tip, phase offset0.55; hoist displacement and stretch exactly zero. Only cloth translates/deforms. Update callback is released on shutdown. Not a sprite-sheet animation; transparent pixels and actual rendered movement checked. Existing camera/player scale, fountain and ground preserved.

Validation: npm run build;17 server tests; tests/castle.spec.ts, ground-preview.spec.ts and multiplayer.spec.ts all passed. Browser test walks authoritatively from spawn to stairs and in front of left wing, rejects a wall destination, checks static castle transforms/fixed hoists/changing rendered flag pixels, and verifies reentry creates exactly two flags. Screenshots and measurements: test-results/castle. Runtime originals retained, scratch candidates and one-off exporter deleted; see cleanup-castle-2026-10-31.json.

## Fortified perimeter and river crossings — 2026-10-31
shared/fortifications.mjs uses the active capital-layout source coordinate system,1448x1086, transformed to the fixed15360x11536 world. Three gates: west(180,490), east(1300,490), south(740,905). Open gateways have paired watchtowers. Deck rectangles in source coordinates: west[35,467,240,513], east[1250,467,1435,513], south[717,870,763,1055]. Navigation unions deck footprints with meaningful land components, then applies3source-pixel erosion. Client/server reject any movement-cell overlap with wall footprints, tower bases and narrow bridge rail rectangles. Non-bridge water remains solid; outer mainland is now reachable. Earlier single-island walkable-cell counts are historical.

Wall collision is a10source-pixel-wide strip along each axis-aligned run; gate gaps are split explicitly. Tower bases are380x180world pixels (ordinary) or440x180 (gate). Rendering is independent of these footprints: horizontal sprites390world pixels tall, vertical runs sliced into sections at most100world pixels long, and tower bases anchored90world pixels below their centers. Terrain decks render below actors; raised masonry sorts by ground Y. Occluding foreground pieces ease toward alpha0.48 while covering the local actor, then restore full opacity. Their update listener is removed on scene shutdown. Miniature view uses the identical full-opacity layout. No rotated facade textures, whole-map enlarged bitmap, or generated collision from visible sprite alpha.

Runtime prop PNGs: horizontal512x388 RGBA repeat section; vertical250x140 RGBA repeat section; tower424x814 RGBA with12px clear padding. Generation tool: built-in image_gen, actual model version not exposed. Actual attached reference: existing runtime castle. Prop prompt summary and asset status are recorded in ART_STYLE.md. Reuse finished PNGs directly; the maintained capital ground exporter remains responsible for navigation and approach-road masks.

Reachability refinement: after raster-mask sampling and all building/wall/rail tests, shared configureNavigation retains only the movement-cell component containing SPAWN. All27,628 currently green destinations are reachable. Detached outer islands and shoreline pockets stay blocked instead of accepting clicks without a path. This is computed identically on client and server. North-south wall runs also use an upright south-end cap sampled from the horizontal wall texture, closing exposed corners; full repeat sprites explicitly use the __BASE frame.

## Arched stone crossings — 2026-11-01
Supersedes the flat-granite-deck rendering and October31 bridge rectangles. Current source-plan footprints: west[35,478,175,502], east[1315,478,1435,502], south[726,935,754,1055]. Existing gate centers and main approach roads remain. scripts/export-capital-map.mjs consumes these footprints to rebuild navigation; shared fortifications defines rails plus measured pier-base rectangles, used on client and server. The reachability filter still removes isolated destinations.

shared/bridge-surface.mjs defines the measured artwork anchors. EW1796x876: longitudinal landing centers x55..1740, endpoint source center y475, transverse reference width290, center crest y355; Hermite-interpolated center and width samples. NS1024x1536: center x512, longitudinal endpoints y145..1450, reference transverse width264; monotone source Y=145+1305t-130sin(pi*t)^2, with measured transverse-width samples. Landing positions and slopes join the terrain continuously. Rendering transforms are calculated once from fixed world dimensions. Shared pure forward/inverse projection is tested at multiple longitudinal and lateral fractions, including exact endpoints. Inverse NS projection uses bounded binary search; clicks on the lower arch facade are not treated as deck clicks.

Actors retain logical network/interpolation containers and Y-sort depth; a child surface container offsets the body, name, ring and contact shadow together. The camera and minimap follow the rendered surface position. Hover/target outlines project all four cell corners. Curved bridge floor/base images draw at depth2; separately selected front rails/piers sort at the front foundation depth. Full sprites are used on the minimap. No full-map bitmap, new physics elevation, extra network messages, or animated bridge sway introduced.

Four active PNGs reside only in public/assets/props/bridges; foreground alpha is selected from the actual generated full sprites using measured masks. Source/version/prompt files are temporary. The existing wall and granite materials remain active for walls and courts, so they are intentionally retained. See cleanup-arched-bridges-2026-11-01.json for final validation and cleanup.

## Fountain/castle occlusion and fountain minimap landmark — 2026-11-01
src/world/occlusion-fade.ts caches original texture alpha and samples the local novice body at screen-world offsets x[-24,0,24], y[-145,-110,-75,-40,-8]. For each static unrotated occluder, samples are transformed through its scale, display origin and atlas cut offsets; alpha above32 counts only if that object's existing depth is ahead of the actor's feet. Castle section foot-depth ordering is preserved. One group multiplier eases toward0.48 or1 with a90ms time constant, applied after Scene.update; original per-part alpha is preserved. Fountain water animation and castle cloth motion continue normally. POST_UPDATE subscriptions are removed on shutdown; texture masks are weakly cached and reused on reentry.

Minimap fountain placement uses FOUNTAIN.x/y, width846, source768x796 and anchor(367,584) at the same world-to-minimap scale as other landmarks. It draws the original source image, independent of world object alpha, and creates no additional runtime bitmap file. No navigation, bridge projection or server movement changes.

Visibility validation: npm run build passed. Playwright castle regression passed; landmark-visibility test passed real server walks behind/in front of both props, synchronized water/flag opacity, opacity restoration, animated fountain water, transparent-padding rejection and reentry with exactly two POST_UPDATE subscriptions. The fountain thumbnail matched source color averages within0.9 RGB levels and its blue-basin centroid within0.34 minimap pixels. Screenshots and measurements are in test-results/landmark-visibility. Existing user dev processes were reused and left running unchanged; no extra server or image files were introduced.


### Combat impact revision — 2026-11-24
Owner reference: `Animated Cyan Starburst Explosion.gif` (309×309, 16 frames, 1120 ms), reviewed as animation direction only. Runtime remains a chest-anchored, camera-facing depth-independent GPU shader: pinpoint expands into four long/four short tapered rays, then rays fade ahead of the trailing circular shell and sparks. Ordinary hits are white, critical hits pale gold, incoming player hits red. Preserve 0.28/0.32/0.26-second normal/critical/incoming durations. Multiply the existing victim-based size by one random 0.8–1.0 factor per hit; no critical enlargement. No new raster export or GIF texture is shipped. All weapon/class critical impacts use the byte-identical owner `critical_01_deep_heavy.mp3`, registered at `shared/combat-effects.json`; ordinary dagger and monster audio remain unchanged.


### Archer bow arrow — 2026-11-24
Code-native `energy-arrow.ts`: two double-sided crossed planes, red glow/white shaft, alpha blending, no depth write/test, no shadow casting. Normalized arrow points along +X; the draw arrow stretches from the weighted string nock to 18% past the bow grip. Nock vertices are selected once on equipment attachment by maximum `DEF-hold-tweak.L` weight (0.5 in the current bow) and evaluated through skinning as the bow draws. This preserves the actual 50/50 deformation rather than anchoring to the control bone origin. Runtime GLBs remain byte-identical. `shared/bow-projectile.json` defines draw frames 2–6, ten total frames, projectile speed 85 units/s and 0.045–0.16-second flight bounds. Existing character-relative hit effect sizes/colors remain separate. No production raster, source copy or exporter is added.
