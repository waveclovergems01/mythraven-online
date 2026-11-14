# Novice: เปลี่ยนทรงผมและเตรียมไฟล์จาก Blender

การเข้าเมือง: ล็อกอิน (Guest หรือบัญชีทั่วไป) → เลือกตัวละคร → เข้าสู่เมือง มีพรีวิว 3D ของ Novice และ Warrior ชาย อาชีพละสองทรงผม พร้อมหมวดทั้งหมด/ชาย/หญิง ขณะนี้ยังไม่มีโมเดลหญิง ต้องเลือกเองก่อนเข้าเมืองทุกครั้ง รวมถึงหลังรีเฟรช ไม่เลือกให้อัตโนมัติ เมนูทรงผมในตั้งค่าถูกย้ายออกแล้ว ผู้เล่นอื่นเห็นโมเดลที่เลือกตรงกัน และการเชื่อมต่อใหม่ในหน้าเดิมยังใช้ตัวเดิม ยังไม่ได้บันทึกตัวเลือกลงบัญชี

## สิ่งที่นำเข้าแล้ว

- ตัว/เสื้อผ้า/ผมเดิม/คลิป: `public/assets/models/characters/m1-novice.glb`
- ผมใหม่เท่านั้น พร้อมวัสดุและข้อมูล skin: `public/assets/models/characters/novice-hair-02.glb`
- ผมใหม่ใช้กระดูกชุดเดียวกับตัวละครและคลิป `n_idle` / `n_run` เดิม ไม่เล่นแอนิเมชันเป็นอิสระจากศีรษะ
- ไฟล์ใหม่เต็มตัว 45.51 MB ถูกแยกเหลือ 5.58 MB ไม่ได้คัดลอกตัวละครเต็มเข้ามาซ้ำ

สองไฟล์ต้นฉบับมี rest hierarchy และ inverse-bind matrices ตรงกัน การใช้ร่วมกันนี้ตรวจจากข้อมูลจริง ไม่ได้อาศัยคำว่า Humanoid อย่างเดียว ส่วนคลิป `n_idle.001` ในไฟล์ใหม่ซ้ำกับ `n_idle` จึงไม่เพิ่มเข้ามา

## ส่งออกทรงผมถัดไป

1. ทำผมเป็น Object แยก ถ้ารวมอยู่กับตัว ให้เลือกเฉพาะ faces ของผมใน Edit Mode แล้วใช้ Separate → Selection (`P`) ตรวจว่าไม่ได้แยกผิวศีรษะหรือชิ้นส่วนตัวออกมาด้วย
2. ทำผมให้พอดีกับศีรษะบนริก Novice มาตรฐานเดิม รักษาตำแหน่ง/ขนาด/แนวแกนและ rest pose อย่าย้าย mesh ผมไปจุดกำเนิดโลกหรือปรับกระดูกใน Edit Mode เพื่อส่งออกชิ้นนี้
3. คง Armature modifier ที่ชี้ไปยัง rig เดิม และ vertex groups/weights ไว้ ผมทรงแข็งที่ต้องตามหัวทั้งก้อนอาจให้น้ำหนักกับกระดูกหัว 100%; ผมยาวที่ต้องโค้งตามหลายกระดูกต้องมี weights และแอนิเมชัน/ฟิสิกส์ส่วนเพิ่มที่เข้ากัน ไฟล์ทรง 2 ปัจจุบันรักษา weights ของผู้ใช้ไว้ทั้งหมด
4. ใน Object Mode เลือกเฉพาะ Object ผมและ generated rig ที่ผูกมัน ไม่เลือกตัว เสื้อผ้า metarig หรือ widget meshes
5. File → Export → glTF 2.0, เลือก GLB และเปิด Selected Objects, +Y Up, UVs, Normals, Materials และ Skinning ใช้ตัวเลือก Armature/rest และกติกา Deform Bones แบบเดียวกับตัวมาตรฐาน เพื่อคงชื่อ/ลำดับ/ท่าพักที่ตรวจเทียบได้ ไม่ Apply Armature modifier จน skin หาย
6. ปิด Animations สำหรับไฟล์ผม ไม่ต้องแนบ Idle/Run/Attack ซ้ำทุกทรง เท็กเจอร์ของผมยังต้องติดมา
7. ตั้งชื่อไฟล์ให้สื่อถึงชิ้นส่วน เช่น `novice-hair-03.glb` แล้วทดสอบบนตัวมาตรฐานตอน Idle, Run และหมุน พร้อมตรวจเอาท์ไลน์ ผมไม่ลอย/ทะลุ และมีผมแสดงเพียงชุดเดียว

ข้อมูลกระดูกที่ติดกับ GLB ของผมมีไว้บอกการผูก skin เมื่อโหลด เกมจะจับคู่และใช้กระดูกของ avatar เดิม ไม่เพิ่มริกที่เล่นแอนิเมชันแยกสำหรับผมแต่ละชิ้น การส่งออก mesh ล้วนที่ไม่มี skin แล้วคาดว่าจะติดหัวเองยังต้องมีข้อตกลงจุดยึดและ transform เพิ่ม กรณีผม/หมวกแข็งสามารถทำระบบติดกระดูกหัวได้อีกทาง แต่รุ่นนี้ใช้ skinned attachment

ระบบปัจจุบันรู้จักสองชิ้นที่ลงทะเบียนไว้ การเพิ่มไฟล์ชื่อใหม่ต้องเพิ่ม mapping และตรวจ rig compatibility ก่อน ไม่ใช่การสแกน/จับคู่ไฟล์ใดก็ได้อัตโนมัติ ถ้าใช้ริกหรือ rest pose ต่างกัน ต้องปรับการผูกหรือ retarget ก่อน

## อัปเดตผมชุดที่สองจากไฟล์เต็ม

รันจาก root ของโปรเจกต์:

```powershell
node scripts/import-novice-hair.mjs 'E:/Web Project/Git/my-3d-studio/my-drawing/for3d/blender/m1-novice2.glb'
```

Importer นี้ตรวจริกกับ base และเลือก material `model.021` ตามไฟล์ที่ตรวจไว้ ถ้าเปลี่ยนชื่อ/โครงสร้างไฟล์ต้องทบทวน mapping ก่อน ไม่เดาจากตำแหน่ง primitive อย่างเดียว แยก geometry/texture โดยไม่วาดใหม่และตรวจข้อมูลหลังเขียน ไม่เก็บสำเนา source เต็มตัวในโปรเจกต์

อ้างอิง: [Blender glTF export](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html), [Three.js SkinnedMesh source](https://github.com/mrdoob/three.js/blob/master/src/objects/SkinnedMesh.js), [glTF Transform prune](https://gltf-transform.dev/modules/functions/functions/prune).

## เพิ่มตัวละครในภายหลัง

รายการกลางอยู่ที่ `shared/character-catalog.mjs` แต่ละรายการมี ID ถาวร, model, classId, gender, hairStyle และชื่อไทย/อังกฤษ ปัจจุบันใช้ `novice-male-01` กับ `novice-male-02` เซิร์ฟเวอร์ตรวจ ID ก่อนรับเข้าเมืองและกำหนดรูปลักษณ์จากรายการนี้

ถ้าเพิ่มแค่ผมบน Novice เดิม ต้องเพิ่มตัวเลือกและ mapping ของ hair mesh ที่ตรวจริกแล้ว หากเพิ่มโมเดลหญิงหรืออาชีพที่มีตัว/ริกต่างออกไป ต้องเพิ่ม loader/animation mapping ของโมเดลนั้นและทดสอบ preview, normalization, Idle/Run และ outline ด้วย การเพิ่มชื่อใน catalog อย่างเดียวยังไม่ทำให้โหลดโมเดลใหม่อัตโนมัติ

## Warrior ที่เพิ่มแล้ว

เลือก `warrior-male-01` หรือ `warrior-male-02` ได้ในหน้าเลือกก่อนเข้าเมือง Warrior ใช้ `n_war_idle` / `n_war_run` ของตัวเอง ส่วน Novice ยังคงใช้ `n_idle` / `n_run` ไม่ได้นำคลิปข้ามริกมาใช้ตรง ๆ

Warrior สองไฟล์มี rig/rest/bind และคลิปเหมือนกัน จึงเก็บตัวเต็มจากทรง 1 และแยกเฉพาะผมทรง 2 เป็น `warrior-hair-02.glb` ขนาด 5.72 MB เทียบกับไฟล์เต็ม 30.60 MB ตัวโหลดเลือกตาม `model` ใน `src/terrain/character-assets.ts` และใช้ตัวสร้าง avatar ร่วม `skinned-player.ts` แต่แต่ละตัวมี bones/mixer แยกกัน ผู้เล่น Novice และ Warrior เห็นกันได้ตามโมเดลที่เลือก

นำเข้าซ้ำหลังแก้โมเดลต้นฉบับ:

```powershell
node scripts/import-warrior.mjs 'E:/Web Project/Git/my-3d-studio/my-drawing/for3d/blender/m1-warrior1.glb' 'E:/Web Project/Git/my-3d-studio/my-drawing/for3d/blender/m1-warrior2.glb'
```

Importer ตรวจว่าคลิปทั้งสองทรงตรงกันก่อน หากภายหลังตั้งใจทำแอนิเมชันต่างกันระหว่างทรง จะหยุดให้ปรับการแยก asset แทนการทิ้งคลิปเงียบ ๆ
