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
