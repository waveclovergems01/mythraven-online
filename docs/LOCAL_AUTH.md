# Local login prototype

หน้าแรกมี login / register, Guest และตัวเลือกภาษาไทย/อังกฤษ ใช้ภาพ WebP จริงสำหรับโลโก้ ฉากหลัง และกรอบจาก public/assets/ui ส่วน input และปุ่มเป็น HTML กรอบใช้ภาพเต็มสัดส่วนเดิม 2:3 บน panel 560×840 แล้วปรับขนาดทั้งชุดตาม viewport โดยไม่ยืดขอบแยกส่วน ขนาดกรอบคงที่ระหว่างสลับโหมด ช่องยืนยันซ่อนโดยไม่จองช่องว่างในหน้า login และข้อความผิดพลาดแสดงใต้กรอบ

ต้นฉบับ PNG, prompt และ metadata อยู่ใน art/source/ui/login-v001 สร้างไฟล์ WebP ซ้ำได้ด้วย `node scripts/export-login-art.mjs`

## Features
- สมัครด้วย username 3–16 ตัว A–Z/a–z/0–9/_ (normalize lowercase), password อย่างน้อย 8 ตัว และ confirmation
- Password รับเฉพาะ visible ASCII: อักษรอังกฤษ ตัวเลข และสัญลักษณ์ ไม่รับภาษาไทยหรือช่องว่าง ทั้งการพิมพ์ วาง และ IME; เมื่อกรอกไม่ถูกต้องจะคืนค่าก่อนหน้าและแจ้งข้อผิดพลาด ไม่ตัดบางส่วนของ password ทิ้งเงียบ ๆ
- เข้าเกมหลังสมัคร/ล็อกอินสำเร็จ และกลับหน้า login เมื่อออกจากเกม
- Guest จำ identity บน browser เดิม รวมทั้งหลัง logout; active session กลับเข้าเกมเมื่อ reload
- Session/บัญชีแยกตาม origin; 127.0.0.1 กับ localhost และพอร์ตต่างกันเป็น storage คนละชุด
- TH/EN dictionaries ใน src/i18n.ts; เพิ่ม dictionary และ entry ใน locales เมื่อต้องการภาษาใหม่
- ทุกข้อความหน้า auth รวม validation/hints และ game shell แปลสองภาษา
- Phaser โหลดแบบ dynamic หลังเข้าเกม จึงไม่โหลด engine หนักบนหน้าล็อกอิน
- Google ใช้ GIS และ server verification เมื่อกำหนด Client ID; ดู GOOGLE_AUTH_SETUP.md ส่วน email อื่นยัง disabled

## Limits
บัญชี username/password ในเอกสารนี้เป็น demo ใน browser ไม่ใช่ server authentication ส่วน Google เป็นเส้นทางแยกที่ตรวจ token จริงบน backend ตาม GOOGLE_AUTH_SETUP.md
localStorage เก็บ salted PBKDF2 SHA-256 password verifier (600,000 iterations), ไม่เก็บ plaintext password แต่ผู้ใช้ยังแก้ข้อมูลและ session ใน browser ได้ จึงห้ามใช้เป็นหลักฐานสิทธิ์สำหรับ multiplayer/ไอเทม/ข้อมูลจริง
ใช้ password สำหรับทดสอบเท่านั้น ไม่มี password recovery หรือ account sync ข้ามเครื่อง
Guest identity จำได้เท่านั้น ไม่ได้บันทึก progress/ตำแหน่งในเกม; การล้าง site data ทำให้บัญชีและ Guest หาย
crypto ต้องเป็น secure context เช่น localhost/HTTPS; เปิด LAN ผ่าน HTTP อาจใช้บัญชีไม่ได้
ก่อนใช้จริงเปลี่ยน src/auth/local-auth.ts เป็น server auth adapter, ใช้ session ที่ server ตรวจสอบ, ต่อ provider จริง และออกแบบ link Guest → account กับข้อมูลเกม

## Validation
npm run build
npm run test:e2e

Browser tests ใช้ Microsoft Edge ที่ติดตั้งบน Windows ผ่าน Playwright; ถ้าเครื่องไม่มี Edge ให้ติดตั้ง browser หรือปรับ channel ใน playwright.config.ts
ทดสอบ registration/mismatch/duplicate/login failure/login success, session restore, guest identity, locale persistence และ mobile overflow
