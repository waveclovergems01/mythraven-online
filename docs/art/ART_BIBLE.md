# Mythraven Art Bible

> 2026-11-14 grass follow-up: authorized replacement fine-blade grass reduces the repeated dark/light clumps visible as a checkerboard. Keep the painted green palette, low ground contrast, fixed orientation and 32-unit repetition span. This is a scoped ground candidate integration, not a new project-wide master.

> 2026-11-14 ground correction: the owner requests ordinary straight texture tiling instead of randomly rotated overlapping patches. Preserve the supplied paintings and soft grass/soil region transitions; use one fixed orientation across the terrain. No new artwork or image edits.

> 2026-11-13 Warrior extension: two owner-supplied male Warrior variants join the pre-entry character picker. Preserve their original armor/materials and Warrior-specific Idle/Run. Share verified compatible hair within Warrior; no Novice retargeting or general style replacement. See ART_STYLE.md, CHAR-WARRIOR-3D.

> 2026-11-13 hairstyle extension: owner `m1-novice2.glb` supplies a second hairstyle for the same novice. Preserve that hair's supplied geometry/material, attach it to the existing avatar skin, and keep the original body and animations. Selection now takes place on a separate post-login screen with a live preview and gender categories, before city entry. This extends the scoped character exception to selectable hair, not a new general character style.

> 2026-11-13 scoped character exception: the owner-supplied `m1-novice.glb` now replaces capsules in the 3D city with its own materials and Idle/Run clips. Its supplied appearance is the authority for this import. Preserve active 2D characters and their historical style status. This explicit request supersedes the earlier terrain-only scope for this one character; see ART_STYLE.md, CHAR-NOVICE-3D.

> 2026-11-13 scoped terrain update: the four supplied green grass, dry grass, earth and grass/earth PNGs now define the 3D ground's painted surface direction. Preserve their source pixels; blend irregularly in-world without checker tiling or circular repeated patches. This supersedes reuse of the old grass/dirt tiles for the 3D surface only. See ART_STYLE.md, BG-TERRAIN-PAINTED.

> Owner extension 2026-11-12: one green 3D oak candidate is authorized beside the canal. Preserve the existing painted oak's palette and foliage language while modeling roots, trunk, branching and spatial leaf sprays. This is a scoped prop exception for review, not a replacement or approval of the existing 2D tree library. See the current ART_STYLE.md entry and ASSET_SPEC.md.

> Owner exception, 2026-11-11: the city ground/water now uses real 3D geometry with a 2.5D orthographic camera. Retain the warm muted palette and soft lighting. This terrain-only transition supersedes 2D-only requirements for that surface, not for existing characters, props or login art. See [terrain contract](../TERRAIN_3D.md) and the current ART_STYLE.md entry.

> Current guide (2026-10-12): [ART_STYLE.md](../../ART_STYLE.md) is authoritative for new images. Its visual tokens, palette, ground/object rules, registry, naming and variant workflow override conflicting defaults below. This document retains legacy guidance and technical contracts; see [STYLE_MIGRATION.md](STYLE_MIGRATION.md). Existing assets are not automatically approved under the new guide.

Style ID: **MR-ART-v1**  
Status: working baseline; visual master not yet established.

## 1. Purpose and references
ทุกภาพในเกมต้องดูเหมือนผลิตโดยทีมศิลป์เดียวกัน กติกานี้ครอบคลุมตัวละคร มอนสเตอร์ พื้นแผนที่ อาคาร ต้นไม้ ไอเทม อุปกรณ์ ไอคอน สกิล เอฟเฟกต์และ UI

ภาพอ้างอิงที่ผู้ใช้ให้แสดงทิศทาง fantasy RPG มุมมองเฉียงจากด้านบน ตัวละคร 2D และ sprite sheets บนพื้นโปร่งใส ใช้อ้างอิงความรู้สึก สัดส่วนโดยรวม และการอ่านภาพ ไม่ยกตัวละคร ชุด ไอคอน หรือฉากของเกมนั้นมาเป็น asset ของเรา ภาพไม่ได้ยืนยัน engine หรือเทคนิคสร้างภาพของต้นฉบับ

ตัวเลขด้านล่างเป็นข้อเสนอเริ่มต้นของ Mythraven ไม่ใช่ค่าที่พิสูจน์แล้วจากเกมอ้างอิง หากภาพทดลองแสดงว่าต้องปรับ ให้แก้เอกสารส่วนกลางก่อนทำภาพชุดใหญ่

## 2. Shared visual language
- 2D hand-painted fantasy RPG sprite art: รายละเอียดแบบวาดด้วยมือ มีรูปทรงชัด ขอบคมแต่มี anti-aliasing
- Stylized สัดส่วนตัวละครประมาณ 3.5 หัวสูง; ใบหน้าและมือเรียบง่าย อ่าน silhouette ได้ตอนย่อ
- ไม่ใช้ strict pixel art, ภาพถ่าย, ภาพ render 3D ผิวพลาสติก, flat vector หรือภาพ anime portrait มาปะปนเป็น asset ในโลก
- ผ้า หนัง ไม้ หิน เหล็ก และทองเก่าเป็นวัสดุหลัก ใช้ texture ใหญ่พออ่านได้ ไม่ใส่รายละเอียดจิ๋วจนกลายเป็น noise
- ขอบเงาเป็นสีน้ำตาลเข้มหรือเขียวเข้ม ไม่ตีเส้นดำหนาเหมือน sticker
- ฉากมี contrast ต่ำกว่าตัวละคร ตัวละครต่ำกว่าสัญญาณโจมตีสำคัญ UI ต้องอ่านได้บนฉาก
- ความสวยของ concept ขนาดใหญ่ไม่ชดเชยความอ่านยากที่ขนาดเล่นจริง

## 3. Camera and lighting
- กล้องเกมคงที่ โลกวางบนระนาบ 2D ใช้ Y-depth จากจุดเท้า ไม่ได้บังคับฉาก 3D หรือ tile รูปข้าวหลามตัด
- ภาพสิ่งของมีมุมมองเฉียงจากด้านบนแบบ orthographic-like ไม่มี vanishing point เด่น
- ค่าเริ่มต้นสำหรับ prompt: มองลงประมาณ 35 องศาจากแนวระดับ ต้องเทียบกับภาพ master เดียวกัน เพราะตัวเลขใน prompt ไม่รับประกัน projection ที่ตรงกัน
- แสงนุ่มจากซ้ายบนของหน้าจอ เงาในวัสดุค่อนไปทางเขียวเทา ไม่เปลี่ยนแสงตามทิศที่ตัวละครหัน
- ไม่วาดเงาทอดบนพื้นติดกับ character/prop cutout ให้ runtime จัดการแยก เงาบนร่างกายและ ambient shading ยังมีได้
- อุปกรณ์เรืองแสง/VFX เป็นข้อยกเว้นที่ระบุใน brief เท่านั้น ไม่เพิ่ม bloom ให้ทุกภาพ

## 4. Palette
เป็น anchor สำหรับเทียบสี ไม่ใช่ข้อบังคับว่าทุก pixel ต้องมีเฉพาะสีเหล่านี้

| Role | Color |
|---|---|
| Dark outline / deep shadow | #26352F |
| Forest shade | #385342 |
| Moss | #68794D |
| Earth / wood | #80634B |
| Warm stone | #ADA181 |
| Cloth / ivory | #D9CCAB |
| Leather | #705143 |
| Steel | #899A9C |
| Aged gold | #B79A58 |
| Arcane blue accent | #74B4C2 |
| Danger accent | #BA6254 |

สีผิว ผม และประจำอาชีพปรับได้แต่รักษาระดับ saturation/material rendering เดียวกัน biome ใหม่เปลี่ยนสีเด่นได้ใน palette ย่อยที่บันทึกไว้ ไม่เปลี่ยนวิธีวาด แสง หรือมุมมอง สีสดใช้เป็นจุดเน้นเล็ก ๆ ไม่ปูทั้งภาพ
UI rarity border และตัวเลขให้ runtime วาด แยกจากรูปไอเทม

## 5. Characters and monsters
- Novice ชาย/หญิงใช้ระดับรายละเอียด มุมกล้อง ความสูงมาตรฐาน และ palette เดียวกัน ไม่เปลี่ยนเพศแล้วเปลี่ยนสไตล์
- ล็อก face/hair/outfit/materials/accessories/มือที่ถืออาวุธด้วย character master ก่อนทำ animation
- แต่ละทิศต้องเป็นคนเดิมและชุดเดิม ไม่กลับเข็มขัด ตราหรือมืออาวุธตามสะดวก
- ท่า idle/walk/attack/cast/hurt/death เป็นคนละ animation ไม่ใช่คนละดีไซน์
- มอนสเตอร์ใช้สไตล์เดียวกัน กำหนด relative size ต่อ Novice ใน brief; ตัวใหญ่ใช้ frame profile ใหม่ ไม่ย่อมอนสเตอร์ทุกตัวให้สูงเท่ามนุษย์
- ขั้นแรกเป็นตัวละครรวมชุดแบบ baked sprite ยังไม่รับประกันเปลี่ยนเสื้อผ้าแยกชิ้น ต้องวาง layer/attachment contract ก่อนทำ wardrobe จำนวนมาก

## 6. Maps, props, items and UI
- แยกพื้นเดินออกจากต้นไม้ อาคาร และวัตถุสูง เพื่อให้วาดทับตัวละครและกำหนด collision ได้
- ภาพ map concept ไม่ใช่ playable map; การเดิน collision spawn และทางออกเป็นข้อมูลแยก
- Ground tiles ต้องต่อขอบได้จริงโดยทดสอบวางซ้ำและ transitions ไม่ใช่แค่ใส่คำว่า seamless
- Prop มองจากกล้องเดียวกับตัวละคร ขนาดเปรียบเทียบกับ Novice; จุดยึดเป็นตำแหน่งสัมผัสพื้น ไม่ใช่กลางภาพ
- Inventory icon แสดงวัตถุเดี่ยว อ่านรูปทรงได้ ไม่มีตัวเลข ชื่อ กรอบ rarity หรือพื้นหลังฉาก; มุมสินค้า 3/4 ใช้ได้แต่แสง/วัสดุ/สีต้องตรงกับโลก
- World pickup เป็นภาพอีก profile ไม่เอา icon กรอบสี่เหลี่ยมมาวางบนพื้นตรง ๆ
- UI ใช้ไม้/โลหะเก่า/พื้นมืดและขอบบาง เรียบกว่าภาพโลก ข้อความภาษาไทยต้องเป็น text จริงของ UI
- Skill icons อาจมีพื้นสีภายในขอบเขตไอคอน; ใช้ composition และค่าความสว่างเดียวกัน ไม่ใส่ชื่อสกิล
- VFX ต้องอ่านทิศ/พื้นที่ผลชัด รูป telegraph ที่ส่งผลต่อ gameplay ให้ engine วาดตรงกับพื้นที่จริง

## 7. Establishing the master
เริ่มจาก candidate เล็ก ๆ: Novice ชาย/หญิงท่ายืนทิศ S, หญ้า, ต้นไม้, potion icon แล้ววางร่วมกันในฉากที่ scale จริง
จนกว่าผู้ใช้เลือกต้นแบบ ให้สถานะ candidate ห้ามระบุ approved
เมื่อเลือกแล้ว เก็บภาพ reference ของโปรเจกต์และรายชื่อใน art/references/ พร้อม revision; ครั้งต่อไปแนบทั้ง style master และ identity master ที่เกี่ยวข้อง
ห้ามใช้ prompt อย่างเดียวแล้วอ้างว่าจะคงสไตล์ได้ 100% ต้องมี reference และการตรวจงาน

## 8. Acceptance gate
- [ ] ตรง MR-ART-v1 และใช้ master ที่ระบุจริง
- [ ] มุมกล้อง แสง palette และความละเอียดเข้าชุดกับ asset ข้างกัน
- [ ] ขนาดตอนเล่นอ่านได้ ชาย/หญิง/มอนสเตอร์อยู่ในโลกเดียวกัน
- [ ] ภาพโปร่งใสไม่มี checkerboard, ขอบขาว, matte หรือข้อความติดภาพ
- [ ] frame/pivot/animation ผ่าน ASSET_SPEC และเล่นจริงแล้วไม่กระตุกจากภาพ
- [ ] ชื่อไฟล์ manifest prompt references และ revision ครบ
- [ ] ไม่มีการใช้ concept หรือ candidate เป็น runtime-ready โดยไม่ตรวจ


## Source cleanup policy — owner instruction 2026-10-19
After approval and integration, discard temporary generation sources, references, individual frames, PNG/GIF/HTML previews, QA JSON and obsolete scripts. Approved runtime character atlases in public/assets/characters are the source of truth for future character work. art/source now retains only13 original images required by maintained non-character exporters; see art/README.md. Browser QA writes to test-results. Earlier source paths and prompt-retention statements above are historical and superseded; do not recreate deleted archives. Active generation may use ignored art/.scratch temporarily and must clean it on completion. Removal audit: docs/art/cleanup-2026-10-19.json.
