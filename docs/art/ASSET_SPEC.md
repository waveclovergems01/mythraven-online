# Asset and sprite contract — MR-ART-v1



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
