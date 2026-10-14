# Multiplayer local — Mythraven Online

## ทดลองสองจอ

ใช้ `npm run dev` เพื่อเปิด Vite (5173), auth (3001) และ Colyseus (2567) พร้อมกัน หากมี dev เดิมอยู่ ให้หยุดชุดเดิมก่อนเริ่มใหม่ ห้ามเปิดเซิร์ฟเวอร์พอร์ตเดียวกันซ้ำ

1. เปิด http://127.0.0.1:5173/ สองแท็บหรือสองหน้าต่าง Chrome/Edge
2. กด Guest ในแต่ละหน้าต่าง แต่ละ connection จะได้ sessionId ของตัวเองจากเซิร์ฟเวอร์
3. ดูแถบออนไลน์: ทั้งสองจอต้องอยู่ห้องเดียวกันและเห็น 2 คน
4. เดินด้วย WASD/ลูกศร หรือคลิกพื้น แล้วดูตัวละครขยับในอีกหน้าต่าง
5. กดออกจากเกม ตัวละครนั้นจะถูกลบจากห้องและอีกหน้าต่าง

เครื่องนี้เป็นทั้งเครื่องเล่นและเครื่องรัน game server; VS Code เป็นเครื่องมือเปิด process ไม่ใช่ตัวเซิร์ฟเวอร์ โปรเจกต์ผูกพอร์ตไว้กับ loopback สำหรับทดลองในเครื่องเดียวกัน ยังไม่เปิด LAN/Internet

## ขั้นตอน sync ที่ทำแล้ว

- Phaser แสดงผลและอ่าน input; ไม่เป็นผู้ตัดสินตำแหน่งจริง
- SDK ติดต่อ matchmaking ผ่าน HTTP แล้วเชื่อมห้องผ่าน WebSocket บน TCP (local ใช้ ws; production ต้อง wss/TLS) ไม่ได้ใช้ UDP ในชุดนี้
- Colyseus สร้าง guest ชั่วคราวเอง ไม่เชื่อ id/สิทธิ์/พิกัดที่เบราว์เซอร์อ้าง
- ไคลเอนต์ส่งปลายทางเป็นช่องกริด หรือทิศทางคีย์บอร์ด
- เซิร์ฟเวอร์ตรวจชนแม่น้ำ/ฐานน้ำพุและขอบแมป คำนวณเส้นทาง A* แปดทิศบนกริดร่วม (คิดระยะจริงของช่อง 64×56 และห้ามตัดมุมสิ่งกีดขวาง) จำกัดความถี่คำสั่ง และเดินด้วยความเร็ว 420 world px/s
- Simulation ทุก 50 ms และ state patch ทุก 50 ms (20 ครั้ง/วินาที) ส่ง delta เฉพาะสถานะที่เปลี่ยน
- แต่ละจอ interpolate ตำแหน่งที่รับมาให้เคลื่อนนุ่มขึ้น แยกภาพ/เงา/ชื่อ/depth ของแต่ละคน
- ออกจากเกมหรือปิดหน้าแล้ว leave; การหลุดเครือข่ายหยุดส่ง input แสดงปุ่มเชื่อมต่อใหม่ รอบนี้กลับมาเป็น guest ใหม่ ยังไม่มี resume ตัวละครเดิม

## โลกเดียวกัน

กริดกลาง 120 × 103 ช่อง, ช่องละ 64 × 56 world px; แมป 7680 × 5768 world px. ทุกจอใช้แมป/พื้นที่ชนชุดเดียวกันจาก shared/town-grid.mjs และ shared/town-layout.mjs. กล้อง zoom 0.5: จอเล่น 1920 × 960 เห็นแมป 50% × ประมาณ 33%. จอเล็กเห็นส่วนน้อยลง การ resize ไม่เปลี่ยนพิกัดโลกและไม่สร้าง connection ใหม่

นี่แทนที่พฤติกรรม local เก่าที่ขยายแมปตามหน้าต่าง ซึ่งใช้ไม่ได้เมื่อหลายคนอยู่โลกเดียวกัน

## Session และสิ่งที่ยังไม่ใช่ระบบบัญชีจริง

ข้อมูล guest/login demo ย้ายจาก localStorage ไป sessionStorage เพื่อแยกแท็บ (ข้อมูลบัญชี demo เดิมยังเก็บใน localStorage). เซิร์ฟเวอร์ไม่ใช้ข้อมูลเหล่านี้เป็นหลักฐานยืนยันบัญชี ทุกการเข้า room รอบนี้เป็น guest ชั่วคราวที่เซิร์ฟเวอร์สร้าง แม้เข้าเว็บผ่านบัญชี demo หรือ Google ก็ยังไม่ได้โหลดตัวละครถาวรจากบัญชีนั้น ชื่อในหัวเว็บเป็นชื่อการเข้าเว็บ ส่วนชื่อเหนือหัวในโลกเป็น guest ของ connection

ห้องทดลองจำกัด 32 connections ต่อห้อง; ยังไม่ใช่การทดสอบรองรับ MMORPG ขนาดใหญ่. ยังไม่บันทึกตำแหน่ง/เลเวล/ไอเทม; ปิดเซิร์ฟเวอร์ข้อมูลห้องหาย การเปิดแท็บซ้ำอาจคัดลอก sessionStorage จาก browser แต่ Colyseus sessionId ยังสร้างใหม่จึงไม่ควบคุมตัวเดียวกัน

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

- server/game.mjs: เริ่ม Colyseus และอ่าน navigation mask
- server/town-room.mjs: room, schema, movement simulation, join/leave
- shared/: กริด พิกัด และพื้นที่ชนร่วม
- src/network/town-client.ts: connection และ snapshots
- src/world/player-view.ts: ภาพผู้เล่น
- src/scenes/WorldScene.ts: แสดงสถานะเซิร์ฟเวอร์และรับ input
- npm run test:server / npm run build / npx playwright test

แหล่งข้อมูลทางการ ตรวจ 2026-10-14:
- https://docs.colyseus.io/server
- https://docs.colyseus.io/state/schema
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- https://developers.cloudflare.com/containers/
- https://developers.cloudflare.com/d1/
- https://developers.cloudflare.com/hyperdrive/
- https://www.postgresql.org/docs/current/transaction-iso.html
