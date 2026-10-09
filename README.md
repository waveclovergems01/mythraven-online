# Mythraven Online

ต้นแบบเกมเว็บ Phaser + TypeScript + Vite สำหรับรันบนเครื่อง ใช้ภาพ placeholder ที่วาดจากโค้ด

## เริ่มเล่นบน local

ต้องมี Node.js 22.12 ขึ้นไปพร้อม npm เปิด PowerShell ในโฟลเดอร์โปรเจกต์:

```powershell
cd 'E:\Web Project\Git\game-design\mythraven-online'
npm.cmd install
npm.cmd run dev
```

เปิด URL ที่ terminal แสดง ปกติคือ http://127.0.0.1:5173 ถ้าพอร์ตไม่ว่าง Vite จะเลือกพอร์ตถัดไป เปิด terminal ค้างไว้ระหว่างเล่น หยุดด้วย Ctrl+C ครั้งต่อไปใช้ npm.cmd run dev ได้เลย

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

เปิดหน้าเว็บแล้วเลือกเข้าสู่ระบบ สมัครบัญชีทดลอง หรือ Guest ได้ สลับไทย/อังกฤษจากเมนูภาษา
Guest และ session จำเฉพาะ browser/origin นี้; ออกจากเกมเพื่อกลับหน้าบัญชี
Google และอีเมลยังไม่เชื่อม provider จริง รายละเอียดและข้อจำกัดอยู่ใน [Local Auth](docs/LOCAL_AUTH.md)
ทดสอบ flow ด้วย `npm.cmd run test:e2e` (ต้องมี Microsoft Edge)