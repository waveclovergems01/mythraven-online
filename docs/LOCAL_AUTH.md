# Local login prototype

หน้าแรกมี login / register, Guest และตัวเลือกภาษาไทย/อังกฤษ ภาพตกแต่งเป็น CSS และตัวอักษร ไม่มีภาพ raster ความละเอียดสูงหรือ third-party font โหลดเข้ามา

## Features
- สมัครด้วย username 3–16 ตัว a-z/0-9/_ (normalize lowercase), password อย่างน้อย 8 ตัว และ confirmation
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
