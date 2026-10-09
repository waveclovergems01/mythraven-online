# Asset and sprite contract — MR-ART-v1
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
ใช้ lowercase kebab-case:
novice-male-base-walk-s-v001.png
novice-male-base-walk-s-v001.json
forest-grass-a-v001.png
forest-oak-a-v001.png
potion-health-small-icon-v001.png

- art/source/<category>/<asset-id>/<revision>/ : original outputs, prompt.txt, metadata.json, raw frames
- art/references/ : project masters ที่มีสถานะชัดเจน
- docs/art/references/ : screenshots อ้างอิงจากผู้ใช้ ไม่ใช่ assets พร้อมใช้
- public/assets/characters|monsters|tiles|props|items|ui|vfx/ : validated runtime files

ไม่เพิ่ม raw candidates จำนวนมากใน public; ไม่ลบ source หลัง export; ไม่ overwrite revision เดิม
metadata ทุกชิ้นบันทึก styleId, assetId, revision, status (candidate/reviewed/runtime-ready), references, prompt path, source path, export dimensions, scale และ pivot ที่เกี่ยวข้อง
status เป็นการบันทึกผลการตรวจจริง ไม่ใช่คำสั่งให้ผู้ใช้อนุมัติซ้ำทุกภาพ

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
