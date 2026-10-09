# Image generation templates — MR-ART-v1
ใช้ shared block + template ประเภทภาพ + reference จริง + asset brief เสมอ
แทนที่ทุก {placeholder} ก่อนส่ง ห้ามส่ง path เฉย ๆ แล้วถือว่าแนบ reference แล้ว
เอกสารนี้เป็นกติกา ไม่ได้ร้องขอให้ generate ทุก template ตอนอ่าน

## Shared block (required)
```text
Project: Mythraven Online
Style ID: MR-ART-v1
Use case: stylized-concept
Style/medium: cohesive hand-painted 2D fantasy RPG game art, softly shaded volumes,
crisp anti-aliased silhouettes, restrained material detail readable at gameplay size.
Palette: muted moss greens, earthy browns, warm ivory, aged gold, subdued steel;
small controlled arcane-blue accents. Match the attached project style master.
Lighting: soft light from screen upper-left, consistent material shading.
World camera: fixed elevated orthographic-like view, approximately 35 degrees
down from horizontal; match the actual reference projection above the numeric hint.
Avoid: photorealism, glossy 3D render, strict pixel art, flat vector, thick sticker
outlines, uncontrolled neon colors, watermark, logo, lettering, baked UI.
Input images: {list actual attached images and role: style / identity / pose}.
Preserve: shared palette, rendering method, scale relationships and character identity.
Deliverable stage: {concept candidate / animation frame candidate / export preparation}.
```
สำหรับ inventory/skill/UI ให้ใช้ camera override ที่ระบุด้านล่าง แทน world camera; ห้ามใช้แสงหรือวัสดุคนละสไตล์
No approved master yet: ระบุว่าใช้ user visual reference + documented baseline และเป็น candidate; ห้ามสมมติว่า master ถูกอนุมัติแล้ว

## A. Character master candidate
```text
Asset type: character identity reference, not a runtime sprite sheet.
Subject: {class}, {male/female}, {appearance ID}; original Mythraven design.
Body: about 3.5 heads tall, consistent stature with the paired character.
Outfit/materials: {outfit}, {cloth/leather/metal}, {limited accent colors}.
Hair/face: {locked details}. Weapon hand/accessories: {explicit side or none}.
Pose: neutral standing, full body, facing screen south.
Composition: one character only, centered, uncropped feet/hair/equipment.
Backdrop: actual transparent alpha, no ground plane or cast shadow.
Constraints: no labels, no character variants, no scenery; this is a master candidate.
```
ชาย/หญิงทำเป็นคนละ asset ใช้ shared style master และ scale เดียวกัน ไม่ขอให้ AI เปลี่ยนชุดแบบสุ่มทุกครั้ง

## B. Animation frames
```text
Asset type: 2D game character animation frame candidate.
Identity: exactly the attached {appearance ID} master; preserve face, hair,
outfit seams, colors, proportions, accessories and weapon hand.
Action: {action}; direction: {S/SW/W/NW/N/NE/E/SE}.
Frame: {index} of {count}; pose description: {specific animation phase}.
Motion: in-place animation; fixed camera and scale, no whole-character drift.
Final frame contract after export: 240x240, feet anchor (120,216);
neutral standing body height around 144px; keep all extremities inside safe margins.
Backdrop: actual transparent alpha; no baked ground shadow, text or scene.
Change only the animation pose. Keep identity and lighting unchanged.
```
สร้าง pose sequence แบบมี reference ต่อเนื่อง หรือ contact sheet สำหรับ review ได้ แต่ต้องแยก/จัดแนว/pack ตรวจจริงก่อนใช้
หากขอทั้ง sheet ให้เพิ่ม action/direction/frame order/grid ตาม ASSET_SPEC และยังให้สถานะ candidate
ห้ามถือว่า generator ทำ exact grid/pivot/temporal consistency ได้แน่นอน
ใช้ image tool สำหรับการแก้ภาพ; deterministic packing/export เป็นขั้นตอนแยกที่ไม่ใช่การวาดเฟรมใหม่

## C. Ground tile
```text
Asset type: seamless ground tile candidate, {biome}, {grass/dirt/stone/...}.
Camera: ground-plane texture for the project's 2D map; no horizon or perspective convergence.
Materials: {material}; muted contrast beneath characters.
Composition: surface only, no trees, buildings, large stones, items, shadows or UI.
Final export target: 128x128, opaque, repeating at 64x64 gameplay pixels.
Edges: tileable on all four sides; avoid a distinctive central motif.
Variation/transition: {variant ID and required neighbor material if applicable}.
```
ต้องตรวจ repeat จริง ไม่เอาภาพ map concept มาตัดเป็น tile โดยไม่มีการแก้ seams

## D. Map concept / layout
```text
Asset type: environment concept, not a collision-ready map.
Area: {name/biome}; purpose: {town/field/dungeon}.
Layout: {entrances, paths, clearings, landmarks}; keep traversal readable.
Rendering: MR-ART-v1 elevated world view, ground subordinate to characters.
Separate later into: ground tiles, decals, props, overhead layers.
Avoid: HUD, text labels, embedded characters, baked gameplay markers.
```
ถ้าขอ playable map ต้องสร้าง tilemap/collision/spawn data ต่อ ไม่ส่ง concept แล้วระบุว่าสำเร็จ

## E. Prop / building
```text
Asset type: isolated {tree/rock/chest/building}, variant {ID}.
Size: {height/width relative to the Novice}; final profile {profile and export size}.
Camera and lighting: exactly match the attached world master.
Composition: complete object, centered around ground contact, safe margins.
Backdrop: actual transparent alpha, no ground plane, no baked cast shadow.
For building: {roof/wall separation requirements}; no baked labels.
```
ระบุ pivot และ footprint ใน metadata หลัง export; silhouette ไม่ใช่ collision

## F. Item / equipment icon
```text
Asset type: inventory icon of {single item}.
Camera override: consistent three-quarter product view; not world camera.
Materials/palette/lighting: match MR-ART-v1 and attached icon master.
Composition: one centered item; strong silhouette readable at 48px.
Final export: 96x96, object within central 76x76 safe area.
Backdrop: actual transparent alpha.
Avoid: rarity border, slot frame, count, lettering, pedestal, scenery.
```
world pickup ต้องใช้ profile แยก แม้เป็นไอเทมชนิดเดียวกัน

## G. Skill icon / VFX / UI
- Skill icon: shared block + 96x96, central 76x76 readable motif, {skill symbol},
  subdued background inside icon, no label/rarity border, reference icon master.
- VFX: shared block + {effect/action/direction}, {frame count/grid/fps/pivot},
  transparent alpha, {normal/additive intended blend}, no character or background;
  อ่านพื้นที่ผลได้และไม่กลบตัวละคร ทดสอบ blend ใน engine.
- UI: shared block + camera override front-facing flat UI surface,
  {panel/button/border}, {size/nine-slice insets}, muted aged-metal/wood,
  no text, no baked interactive state unless requested; each state same dimensions.

## Example short request expansion
คำขอ: "สร้าง Novice ชายและหญิง"
1. อ่านกติกาสามไฟล์และค้น project master ที่มีอยู่
2. ถ้าไม่มี master ให้ใช้ template A สร้าง candidate ชาย/หญิงทิศ S แยกกัน
3. ถ้ามี master ให้ยึด identity/style ของ master และ scope ของคำขอ
4. ไม่ตีความเป็นทุก action × ทุกทิศทันที
5. บันทึก prompt/reference/source/revision; แสดง candidate ให้เลือกก่อนยึดเป็นต้นแบบชุดใหญ่

## Production sequence
Brief → attach available references → generate candidate → inspect style/identity →
revise with references → export/align/pack → validate per ASSET_SPEC →
preview in game → record QA and status → integrate runtime export.
การปรับขนาด/จัด grid ไม่แก้ anatomy หรือสไตล์ที่ผิด ต้องแก้ภาพต้นทางก่อน
