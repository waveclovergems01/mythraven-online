# Mythraven Online

ต้นแบบเกมเว็บ Phaser + TypeScript + Vite สำหรับรันบนเครื่อง หน้า login ใช้ภาพแฟนตาซีที่สร้างด้วย AI ส่วนฉากเกมยังใช้ภาพ placeholder ที่วาดจากโค้ด

## เริ่มเล่นบน local

ต้องมี Node.js 22.12 ขึ้นไปพร้อม npm เปิด PowerShell ในโฟลเดอร์โปรเจกต์:

```powershell
cd 'E:\Web Project\Git\game-design\mythraven-online'
npm.cmd install
npm.cmd run dev
```

เปิด http://localhost:5173 สำหรับ Google sign-in พอร์ต 5173 เป็น strictPort เพื่อให้ตรงกับ OAuth origins หากไม่ว่างต้องปิด dev server เดิมก่อน เปิด terminal ค้างไว้ระหว่างเล่น หยุดด้วย Ctrl+C ครั้งต่อไปใช้ npm.cmd run dev ได้เลย

ใช้ npm.cmd เพื่อหลีกเลี่ยงปัญหา PowerShell บล็อก npm.ps1 โดยไม่ต้องเปลี่ยน execution policy

## การควบคุม

- WASD / ลูกศรเพื่อเดิน หรือคลิก/แตะพื้นเพื่อเดินไปจุดนั้น
- กดคีย์เพื่อยกเลิกจุดหมายจากการคลิก
- เดินหน้า/หลังต้นไม้เพื่อดูการเรียงภาพตามตำแหน่งเท้า
- ต้นไม้เป็นของตกแต่ง ยังไม่มี collision หรือ pathfinding
- รีเฟรชแล้วกลับจุดเริ่มต้น ยังไม่มีระบบบันทึกหรือ multiplayer
- ภาพนี้เป็นฉากทดสอบ ไม่ใช่คุณภาพภาพเป้าหมายหรือ sprite animation ชุดจริง

## ตรวจสอบและ build

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

build ตรวจ TypeScript แล้วสร้างไฟล์ dist ส่วน preview เปิด build บนเครื่อง ไม่ใช่ production server
หลังมี package-lock.json ใช้ npm.cmd ci เมื่อต้องการติดตั้งใหม่ตาม lockfile

## เปิดจากมือถือใน Wi-Fi เดียวกัน (ทางเลือก)

```powershell
npm.cmd run dev -- --host 0.0.0.0
```

เปิด Network URL ที่ Vite แสดงจากมือถือ หากเข้าไม่ได้ตรวจ Windows Firewall สำหรับเครือข่าย Private ใช้เฉพาะเครือข่ายที่ไว้ใจ โหมดปกติรับการเชื่อมต่อเฉพาะเครื่องนี้

## โครงสร้าง

- src/main.ts — ตั้งค่าเกมและ canvas
- src/scenes/WorldScene.ts — ฉากทดลอง ตัวละคร input และ depth sorting
- src/style.css — หน้าจอรอบเกม
- index.html — ข้อความ UI ภาษาไทย
- public/assets/ — ที่เก็บภาพและเสียงภายหลัง อ้าง URL ด้วย /assets/...

เลือก Phaser 3.90 แบบระบุเวอร์ชันเพื่อให้ฐาน API คงที่ ไม่ใช่ Phaser รุ่นล่าสุด
มีบัญชีทดลองและ Guest ที่เก็บบนเบราว์เซอร์แล้ว ยังไม่รวมบัญชีบนเซิร์ฟเวอร์ multiplayer ฐานข้อมูล gem skill tree Electron หรือ deploy
เก็บ package-lock.json ใน Git เมื่อต้องการนำโปรเจกต์ขึ้น repository

## กติกาการสร้างภาพเกม

ก่อน generate หรือเพิ่มภาพในเกม ให้อ่าน [Art Bible](docs/art/ART_BIBLE.md), [Asset / Sprite Spec](docs/art/ASSET_SPEC.md) และ [Prompt Templates](docs/art/PROMPT_TEMPLATES.md)
ทุกประเภทใช้ style ID MR-ART-v1 เดียวกัน คำแนะนำอัตโนมัติของโปรเจกต์อยู่ใน [AGENTS.md](AGENTS.md)
ภาพต้นแบบที่ผู้ใช้ส่งเก็บไว้ใน [visual references](docs/art/references/README.md) ยังไม่มี approved master ของ Mythraven และภาพ procedural ในฉากทดลองไม่ใช่มาตรฐานภาพจริง
## หน้าเข้าสู่ระบบ

เมาส์ใช้ภาพ PNG แฟนตาซี 40×40: ลูกศรปกติและมือเกราะเมื่อชี้ปุ่ม รองรับเมาส์บนหน้าเว็บและ canvas เกม ช่องข้อความคง text cursor และปุ่ม disabled คง not-allowed; ปุ่ม Google ใน iframe และหน้าต่างเลือกบัญชีใช้ cursor ของ Google
ไฟล์อยู่ใน public/assets/ui/cursors กติกา CSS อยู่ใน src/cursors.css ต้นฉบับและ prompt อยู่ใน [Cursor artwork](art/source/ui/cursors-v001/PROMPTS.md) สร้าง export ซ้ำด้วย `node scripts/export-cursors.mjs`

เปิดหน้าเว็บแล้วเลือกเข้าสู่ระบบ สมัครบัญชีทดลอง หรือ Guest ได้ สลับไทย/อังกฤษจากเมนูภาษา
ชื่อผู้ใช้รับ A–Z/a–z/0–9/_ จำนวน 3–16 ตัว รหัสผ่านรับอักษรอังกฤษ ตัวเลข และสัญลักษณ์ ASCII อย่างน้อย 8 ตัว ไม่รับภาษาไทยหรือช่องว่าง
ภาพโลโก้ ฉากหลัง และกรอบอยู่ใน public/assets/ui ต้นฉบับและ prompt อยู่ใน [Login artwork](art/source/ui/login-v001/PROMPTS.md) สร้าง WebP ซ้ำด้วย `node scripts/export-login-art.mjs`
Guest และ session จำเฉพาะ browser/origin นี้; ออกจากเกมเพื่อกลับหน้าบัญชี
Google เชื่อมผ่าน GIS และ server verification แล้ว แต่ต้องตั้ง Client ID ของคุณก่อน ตาม [Google Auth Setup](docs/GOOGLE_AUTH_SETUP.md) ส่วนอีเมลอื่นยังไม่เปิดใช้ รายละเอียดบัญชีทดลองอยู่ใน [Local Auth](docs/LOCAL_AUTH.md)
ทดสอบ flow ด้วย `npm.cmd run test:e2e` (ต้องมี Microsoft Edge)
## Google sign-in จริง

อ่าน [คู่มือตั้งค่า Google](docs/GOOGLE_AUTH_SETUP.md) เพื่อสร้าง Web Client ID และใส่ใน .env
`npm.cmd run dev` เปิดทั้งเว็บ :5173 และ auth server :3001 ให้ใช้ http://localhost:5173 สำหรับ Google
ตั้งค่าพอร์ตแบบ strict เพื่อให้ตรง Google Authorized JavaScript origins
`npm.cmd run test:server` ทดสอบ token/session contract; `npm.cmd run test:e2e` ทดสอบหน้าเว็บ
ยังไม่ได้ทดสอบบัญชี Google จริงจนกว่าจะมี Client ID และผู้ใช้เลือกบัญชีผ่าน Google สำเร็จ
