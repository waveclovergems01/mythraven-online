# Multiplayer local — Mythraven Online

สถานะ 2026-11-12: ฉาก 3D เริ่มเป็นโลกออนไลน์ร่วมกันแล้ว เป็นฐานสำหรับต่อระบบ MMO ต่อไป เมืองใช้ room `mythraven-world` และทุ่งชายแดนใช้ `mythraven-west-march`.

## ทดลองสองจอ

ใช้ `npm run dev` เพื่อเปิด Vite (5273), auth (5274) และ Colyseus (5275) พร้อมกัน หากมี dev เดิมอยู่ ให้หยุดชุดเดิมก่อนเริ่มใหม่ ห้ามเปิดเซิร์ฟเวอร์พอร์ตเดียวกันซ้ำ

1. เปิด http://127.0.0.1:5273/ สองแท็บหรือสองหน้าต่าง Chrome/Edge
2. กด Guest แล้วเลือกตัวละครในแต่ละหน้าต่าง แต่ละ connection จะได้ sessionId ของตัวเองจากเซิร์ฟเวอร์
3. ดูแถบออนไลน์: ทั้งสองจอต้องอยู่ห้องเดียวกันและเห็น 2 คน
4. คลิกซ้ายบนพื้นเพื่อเดิน แล้วดูตัวละครขยับในอีกหน้าต่าง กล้องมุมเฉียงตามตัวเอง ปิดแพน/หมุน/คลิกขวา
5. กดออกจากเกม ตัวละครนั้นจะถูกลบจากห้องและอีกหน้าต่าง

เครื่องนี้เป็นทั้งเครื่องเล่นและเครื่องรัน game server; VS Code เป็นเครื่องมือเปิด process ไม่ใช่ตัวเซิร์ฟเวอร์ โปรเจกต์ผูกพอร์ตไว้กับ loopback สำหรับทดลองในเครื่องเดียวกัน ยังไม่เปิด LAN/Internet

## ขั้นตอน sync ที่ทำแล้ว

- Three.js แสดงผลและอ่าน input; เซิร์ฟเวอร์เป็นผู้ตัดสินตำแหน่งจริง ตัวเองสีฟ้า คนอื่นสีน้ำตาล พร้อมป้ายชื่อ
- SDK ติดต่อ matchmaking ผ่าน HTTP แล้วเชื่อมห้องผ่าน WebSocket บน TCP (local ใช้ ws; production ต้อง wss/TLS) ไม่ได้ใช้ UDP ในชุดนี้
- Colyseus สร้าง guest ชั่วคราวเอง ไม่เชื่อ id/สิทธิ์/พิกัดที่เบราว์เซอร์อ้าง
- ไคลเอนต์ส่งปลายทาง X/Z พร้อมเลขลำดับทันที ไม่ส่งตำแหน่งปัจจุบันหรือค่าความเร็วอิสระ ไม่มีเวลารอส่ง 150 ms แล้ว
- สไลเดอร์ในฟันเฟืองมุมขวาล่าง → ตั้งค่าเลือกระดับความเร็ว 1–10 ได้ ระดับ 1 คือ 7 หน่วย/วินาที และระดับ 10 คือ 35 หน่วย/วินาที (5 เท่า) ไล่ระดับเท่ากัน เซิร์ฟเวอร์รับเฉพาะระดับจำนวนเต็มที่อยู่ในช่วงและปรับเฉพาะผู้ส่ง ปรับระหว่างเดินได้; reconnect จำค่าภายในฉากเดิม แต่เข้าเกมใหม่เริ่มระดับ 5 (ประมาณ 2.78 เท่า)
- เซิร์ฟเวอร์ตรวจค่าตัวเลข ขอบแมป ร่องน้ำและพื้นที่ที่เข้าถึงได้ ใช้กฎ terrain และ A* ร่วมจาก shared/terrain-movement.mjs เก็บคำสั่งล่าสุดและคำนวณเส้นทางไม่เกินหนึ่งครั้งต่อผู้เล่นต่อ tick 50 ms โดยไม่ทิ้งคลิกล่าสุด คำสั่งหยุดล้างเป้าหมายที่รอประมวลผล
- Simulation ทุก 50 ms และ state patch ทุก 50 ms (20 ครั้ง/วินาที) ส่ง delta เฉพาะสถานะที่เปลี่ยน
- ตัวเราใช้ client prediction เพื่อเดินและเปลี่ยนเป้าหมายทันที แล้ว reconcile กับตำแหน่งและเลขคำสั่งที่เซิร์ฟเวอร์ยืนยัน พร้อม replay คำสั่งใหม่ที่ยังไม่ตอบกลับ; ผู้เล่นอื่น interpolate ตำแหน่งจากเซิร์ฟเวอร์ แยกภาพ/เงา/ชื่อ/depth ของแต่ละคน
- ออกจากเกมหรือปิดหน้าแล้ว leave; การหลุดเครือข่ายหยุดส่ง input แสดงปุ่มเชื่อมต่อใหม่ รอบนี้กลับมาเป็น guest ใหม่ ยังไม่มี resume ตัวละครเดิม

## โลกเดียวกัน

terrain กลางขนาด 500 × 500 หน่วย ใช้กริด 384 × 384 ช่องและแนวฝั่งจาก mask เดียวกันทั้ง browser/server ความสูงพื้นและกฎการเดินอยู่ใน shared/terrain-data.mjs และ shared/terrain-movement.mjs ทุกคนใน room เห็นสถานะร่วมกัน การ resize ไม่เปลี่ยนพิกัดโลกหรือสร้าง connection ใหม่ รายละเอียดสเกลอยู่ใน TERRAIN_3D.md

นี่แทนที่พฤติกรรม local เก่าที่ขยายแมปตามหน้าต่าง ซึ่งใช้ไม่ได้เมื่อหลายคนอยู่โลกเดียวกัน

## Session และสิ่งที่ยังไม่ใช่ระบบบัญชีจริง

ข้อมูล guest/login demo ใช้ sessionStorage เพื่อแยกแท็บ (บัญชี demo ยังเก็บใน localStorage). เซิร์ฟเวอร์ไม่ใช้ข้อมูลเหล่านี้เป็นหลักฐานยืนยันบัญชี ทุก connection มี sessionId ชั่วคราวจากเซิร์ฟเวอร์ แม้เข้าเว็บผ่าน Google ก็ยังไม่ได้โหลดตัวละครถาวร ชื่อที่ส่งมาถูกจำกัดความยาวและแสดงเป็นข้อความเท่านั้น เป็น display label ที่ไม่ให้สิทธิ์หรือยืนยันเจ้าของบัญชี

เมือง 3D จำกัด 64 connections ต่อ room; เมื่อเต็ม matchmaking เปิด instance แยก ผู้เล่นข้าม instance ยังไม่เห็นกัน ทดสอบ 64 connections พร้อมการเดินและคนที่ 65 แยกห้องผ่านแล้ว เป็น capacity smoke test ไม่ใช่ benchmark MMO ขนาดใหญ่ ยังไม่บันทึกตำแหน่ง/เลเวล/ไอเทม; reconnect กลับเป็น session ใหม่ และปิดเซิร์ฟเวอร์ข้อมูลห้องหาย

## แนะนำฐานข้อมูล

| ทางเลือก | เหมาะกับ | คำแนะนำสำหรับเกมนี้ |
|---|---|---|
| Memory ใน game server | ตำแหน่ง/การเคลื่อนไหวสด | ใช้ตอนนี้ ไม่เขียน DB ทุก tick |
| PostgreSQL | บัญชี ตัวละคร ไอเทม ธุรกรรมซื้อขาย | แนะนำเป็นฐานหลักเมื่อเริ่มบันทึกถาวร ต้องออกแบบ transactions/constraints/backup |
| Cloudflare D1 (SQLite semantics) | ข้อมูลเว็บ/ตั้งค่า/ระบบข้อมูลขนาดเล็กที่อยู่กับ Workers | ใช้ได้ตามรูปแบบงาน แต่ต้องประเมินข้อจำกัดและ throughput ก่อนเลือกเป็นฐานหลัก MMO |
| Redis | presence/cache และประสาน Colyseus หลาย process | ค่อยเพิ่มเมื่อแยกหลาย game servers ไม่แทน DB ถาวร |

## GitHub + Cloudflare ในอนาคต

แนวทางแนะนำ: GitHub → Cloudflare Workers Static Assets หรือ Pages สำหรับ Vite build; game server Colyseus เป็น Node.js service บน VM/container/Colyseus hosting แยก endpoint WSS; PostgreSQL อยู่ใกล้ game server เพื่อลด latency

Cloudflare Git integration สามารถ build/deploy จาก GitHub ได้ แต่การ deploy หน้าเว็บไม่ได้ทำให้ process Colyseus บนเครื่องเราขึ้นไปด้วย ต้องมี pipeline ของ game server แยกต่างหาก

ถ้าต้องการอยู่ Cloudflare ทั้งหมด ให้ประเมิน Containers สำหรับ Node.js Colyseus รวม routing ไป room, lifecycle, scaling และการคงข้อมูลเมื่อ container หยุด; ไม่ใช่ย้าย server.listen ลง Worker ปกติแล้วใช้ได้ทันที. Durable Objects เป็นอีกแนวทาง stateful realtime แต่เป็นสถาปัตยกรรมอีกแบบ ไม่ใช่ Colyseus drop-in. Hyperdrive ช่วย Workers ต่อฐาน PostgreSQL ภายนอก ไม่ใช่ตัวฐานข้อมูล

ลำดับถัดไป: verified account → character creation/load/save → reconnect/resume → authoritative combat/inventory transactions → multiple maps/rooms → load tests → deploy เมื่ออนุมัติ. ยังไม่ได้สร้าง DB, cloud resources, GitHub workflow, push หรือ deploy ในรอบนี้

## โครงสร้างและการทดสอบ

ฉาก 3D ปัจจุบัน:
- `server/terrain-room.mjs`: room/schema, spawn แยกตำแหน่ง, validation/rate limit และ authoritative tick
- `shared/terrain-data.mjs`, `shared/terrain-movement.mjs`: ความสูง/เส้นทางร่วม และ cache navigation ที่อ่านอย่างเดียว
- `src/network/terrain-client.ts`: connection, snapshots, เลขลำดับคำสั่ง และ reconnect; `terrain-prediction.ts`: prediction/replay/reconciliation
- `src/terrain/TerrainWorld.ts`: ภาพผู้เล่นหลายคน ป้ายชื่อ กล้อง และ input
- `server/terrain-room.test.mjs`: ความเร็ว/เจ้าของตัวละคร/คำสั่งปลอม/ร่องน้ำ/การออกจากห้อง
- `tests/terrain-multiplayer.spec.ts`: สอง browser contexts, late join, disconnect/reconnect, 64 connections และ overflow

ผลตรวจ 2026-11-12: build/typecheck ผ่าน, server tests 26 ข้อผ่าน, auth 6 ข้อ, terrain/control 3 ข้อ และ multiplayer 2 ข้อผ่านในชุดทดสอบที่เลือก ภาพจากสองมุมมองอยู่ใน `test-results/terrain-online` ไม่มีการ deploy หรือเปิดพอร์ตออก LAN/Internet

แหล่งข้อมูลทางการ ตรวจ 2026-10-14:
- https://docs.colyseus.io/server
- https://docs.colyseus.io/state/schema
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/containers/
- https://developers.cloudflare.com/d1/
- https://developers.cloudflare.com/hyperdrive/
- https://www.postgresql.org/docs/current/transaction-iso.html
