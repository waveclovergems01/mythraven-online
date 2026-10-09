# เปิดใช้ Google Sign-in จริงบน local

โค้ดใช้ Google Identity Services (GIS) popup + ตรวจ Google ID token บน Node server
ต้องสร้าง Google OAuth Client ID ของคุณก่อน Google จึงยอมแสดงบัญชีและส่ง token ให้ Mythraven
ไม่ต้องใช้ Client Secret และไม่ขอสิทธิ์อ่าน Gmail/Drive

## 1. สร้างโปรเจกต์และหน้าขออนุญาต
1. เปิด https://console.cloud.google.com/ ด้วยบัญชี Google ของคุณ
2. เลือกเมนูโปรเจกต์ด้านบน > New project ตั้งชื่อ Mythraven Online แล้วเลือกโปรเจกต์นั้น
3. ไป Google Auth Platform (ค้นในช่องค้นหาด้านบนได้) > Get started / Branding
4. ชื่อแอป Mythraven Online, support email และ developer contact ใช้อีเมลที่คุณดูแล
5. Audience เลือก External สำหรับบัญชี Google ทั่วไป
6. ถ้าโปรเจกต์อยู่ใน Testing ให้เพิ่มบัญชีที่จะทดลองใน Test users ตามที่ Console กำหนด
7. ใช้เฉพาะข้อมูล sign-in พื้นฐาน ไม่เพิ่ม Gmail/Drive scopes ไม่จำเป็นต้อง deploy เกมเพื่อทดสอบ localhost

## 2. สร้าง Client ID
Google Auth Platform > Clients > Create client:
- Application type: Web application
- Name: Mythraven Local
- Authorized JavaScript origins เพิ่ม:
  - http://localhost
  - http://localhost:5173
- ใช้ localhost เป็น URL หลักสำหรับ Google; หากจะใช้ 127.0.0.1 ให้เพิ่ม origin นั้นด้วยถ้า Console อนุญาต
- Authorized redirect URIs: เว้นว่างสำหรับ GIS popup ที่ส่ง credential เข้า JavaScript callback ชุดนี้
- กด Create แล้วคัดลอก Client ID ที่ลงท้าย .apps.googleusercontent.com

Client ID เป็น identifier ที่เปิดเผยต่อเว็บได้ ไม่ใช่ Client Secret หาก Console แสดง Secret ไม่ต้องนำมาใช้หรือส่งในแชต

## 3. ตั้งค่าในโปรเจกต์
เปิด PowerShell ที่ root:
```powershell
Copy-Item .env.example .env
```
หากมี .env อยู่แล้ว แก้ไฟล์เดิม ไม่คัดลอกทับ
ใส่ Client ID จริงใน .env:
```dotenv
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
AUTH_PORT=3001
AUTH_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
AUTH_SECURE_COOKIES=false
```
ค่า YOUR_WEB_CLIENT_ID เป็นตัวอย่าง ไม่สามารถใช้ล็อกอินจริง
.env ถูก gitignore ไว้แล้ว ห้ามใส่ client secret ใน VITE_* หรือ source code

หยุด dev เดิมด้วย Ctrl+C แล้วเปิดใหม่:
```powershell
npm.cmd run dev
```
คำสั่งเดียวเปิด Vite :5173 และ auth server :3001 จากนั้นเข้า http://localhost:5173
แก้ .env แล้วต้อง restart; พอร์ต 5173 ต้องว่าง (strictPort ป้องกัน origin เปลี่ยนเอง)

## 4. ลองเข้าใช้งาน
1. ปุ่ม Google จริงจะโหลดจาก accounts.google.com หลังตั้งค่า Client ID
2. คลิกปุ่ม เลือกบัญชีที่ลงชื่อเข้า Google อยู่ใน browser profile นี้ หรือเลือกใช้บัญชีอื่น
3. Google อาจขอ sign-in/consent ครั้งแรก รายชื่อและรูปแบบ popup/FedCM เป็นสิ่งที่ Google/เบราว์เซอร์ควบคุม
4. Backend ตรวจ token แล้วจึงออก session cookie และเข้าเกม
5. Refresh จะตรวจ session ที่ server; ออกจากเกมจะลบ session เกม แต่ไม่ logout บัญชี Google ทั้ง browser
6. การกลับเข้า Google ใหม่ใช้ subject ID เดิม ไม่สร้าง identity ใหม่จาก display name

Codex in-app browser อาจไม่ได้ใช้ Google session เดียวกับ Chrome ของคุณ ให้เปิด localhost ใน Chrome profile ที่มีบัญชีคุณ
ไม่ใช้สคริปต์อ่านบัญชีใน browser และไม่สร้างหน้ารหัสผ่าน Google จำลอง

## ระบบที่เพิ่ม
- GET /api/auth/config: client ID (public), availability
- POST /api/auth/challenge: nonce อายุ 15 นาที ผูก cookie ของ browser
- POST /api/auth/google: verify signature/aud/iss/exp ผ่าน google-auth-library, email_verified และ nonce
- GET /api/auth/session: restore server session
- POST /api/auth/logout: revoke server session
- Google subject (sub) เป็น user key ไม่ใช้ email หรือชื่อ และไม่ merge กับ Guest/local account อัตโนมัติ
- session ID สุ่ม 256-bit ใน HttpOnly/SameSite=Lax cookie อายุ 8 ชั่วโมง; production HTTPS ต้อง Secure=true
- ตรวจ Origin ของ POST, one-use nonce, body limit, request rate limit; ไม่เก็บ ID token ใน localStorage/log
- auth server bind 127.0.0.1; Vite proxy ส่ง /api/auth มาที่ server

## ข้อจำกัด local
นี่คือ Google identity verification จริง แต่ session store ยังเป็น memory ของ server ไม่มีฐานข้อมูล
restart server แล้วต้อง login ใหม่; ยังไม่มี progress/account-linking/persistent profile
username/password และ Guest เดิมยังเป็น demo browser-only ไม่ใช่ server authentication
npm run build สร้าง frontend อย่างเดียว ต้องมี auth server ตอนใช้งาน Google; ไม่ deploy backend ในงานนี้
preview ใช้ :4173 หากทดสอบ Google บน preview ต้องเพิ่ม origin :4173 ทั้ง Google Console และ AUTH_ORIGINS แล้วรัน server ด้วย
การนำไป Electron/Capacitor ต้องออกแบบ system-browser/native sign-in แยก ไม่ฝัง Google login ใน WebView โดยตรง

## แก้ปัญหา
- ต้องตั้งค่า Client ID: ใส่ GOOGLE_CLIENT_ID แล้ว restart npm run dev
- server ติดต่อไม่ได้: ดู terminal ทั้ง Vite และ auth; ตรวจ :3001 ไม่ถูกใช้
- origin_mismatch: เปิด localhost:5173 และตรวจ Authorized JavaScript origins ให้ตรง protocol/host/port
- popup ไม่เปิด: อนุญาต popup จาก localhost, ปิด extension ที่บล็อก Google ชั่วคราว
- หน้าเว็บเปิดทิ้งไว้เกิน 15 นาที/nonce หมดอายุ: refresh หน้าแล้วคลิก Google ใหม่
- ปิด popup โดยไม่เลือกบัญชี: ยังอยู่หน้า login คลิกปุ่มใหม่ได้
- changes ใน Google Console อาจต้องรอให้มีผลก่อนลองซ้ำ

## Tests and evidence
npm.cmd run test:server
npm.cmd run test:e2e
npm.cmd run build
server tests ใช้ verifier จำลองที่ฉีดเฉพาะใน test เพื่อทดสอบ security contract ไม่ใช่หลักฐานว่า Google login จริงผ่านแล้ว
ต้องมี Client ID และทดสอบเลือกบัญชีโดยผู้ใช้ก่อนจึงยืนยัน live end-to-end ได้

Official docs:
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/identity/gsi/web/reference/js-reference
