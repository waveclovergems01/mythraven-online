export const messages = {
  th: {
    tagline: 'ทุกตำนาน เริ่มต้นจากก้าวแรก', welcome: 'ยินดีต้อนรับ นักผจญภัย', subtitle: 'โลกแห่ง Mythraven กำลังรอคุณอยู่',
    login: 'เข้าสู่ระบบ', register: 'สร้างบัญชี', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', confirm: 'ยืนยันรหัสผ่าน',
    usernameHint: '3–16 ตัว ใช้ a–z, 0–9 และ _', passwordHint: 'อย่างน้อย 8 ตัวอักษร',
    enter: 'เข้าเกม', create: 'สมัครและเข้าเกม', or: 'หรือเดินทางต่อด้วย', google: 'ดำเนินการต่อด้วย Google',
    email: 'เข้าสู่ระบบด้วยอีเมล', providerNote: 'Google / อีเมล จะเปิดเมื่อเชื่อมบริการบัญชี',
    guest: 'เล่นเป็น Guest', guestHint: 'ไม่ต้องสมัคร · จำ Guest บนเบราว์เซอร์นี้',
    local: 'เวอร์ชันทดลองบนเครื่อง', localNote: 'บัญชีทดลองเก็บเฉพาะเบราว์เซอร์นี้ ใช้รหัสผ่านสำหรับทดสอบเท่านั้น',
    footer: 'เขียนเรื่องราวของคุณ ในโลกที่กำลังถือกำเนิด', language: 'ภาษา', show: 'แสดง', hide: 'ซ่อน',
    busy: 'กำลังดำเนินการ…', invalidUsername: 'ชื่อผู้ใช้ต้องมี 3–16 ตัว ใช้ a–z, 0–9 หรือ _',
    shortPassword: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', mismatch: 'รหัสผ่านยืนยันไม่ตรงกัน',
    duplicate: 'ชื่อผู้ใช้นี้มีแล้วบนเบราว์เซอร์นี้', credentials: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    storage: 'บันทึกข้อมูลไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บของเบราว์เซอร์',
    unavailable: 'เบราว์เซอร์นี้ไม่รองรับการเข้ารหัส กรุณาเปิดผ่าน localhost หรือ HTTPS',
    generic: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', logout: 'ออกจากเกม', training: 'ลานฝึกซ้อม',
    player: 'ผู้เล่น', controls: 'WASD / ลูกศร หรือคลิกและแตะพื้นเพื่อเดิน', placeholder: 'ฉากทดลอง · ภาพชั่วคราว',
    loading: 'กำลังเปิดโลก…', worldTitle: 'MYTHRAVEN / ลานฝึกซ้อม', session: 'เล่นบนเครื่อง · ผู้เล่นคนเดียว',
  },
  en: {
    tagline: 'Every legend begins with a first step', welcome: 'Welcome, adventurer', subtitle: 'The world of Mythraven awaits you',
    login: 'Sign in', register: 'Create account', username: 'Username', password: 'Password', confirm: 'Confirm password',
    usernameHint: '3–16 characters: a–z, 0–9 and _', passwordHint: 'At least 8 characters',
    enter: 'Enter the world', create: 'Create account & play', or: 'Or continue your journey with', google: 'Continue with Google',
    email: 'Sign in with email', providerNote: 'Google / email available after account service setup',
    guest: 'Play as Guest', guestHint: 'No registration · Guest remembered in this browser',
    local: 'Local preview', localNote: 'Demo accounts are stored only in this browser. Use a test password.',
    footer: 'Your story, in a world taking shape', language: 'Language', show: 'Show', hide: 'Hide',
    busy: 'Please wait…', invalidUsername: 'Use 3–16 characters: a–z, 0–9 or _',
    shortPassword: 'Password must have at least 8 characters', mismatch: 'Passwords do not match',
    duplicate: 'This username already exists in this browser', credentials: 'Incorrect username or password',
    storage: 'Unable to save data. Allow browser storage and try again.',
    unavailable: 'Encryption unavailable. Open this page on localhost or HTTPS.',
    generic: 'Something went wrong. Please try again.', logout: 'Leave game', training: 'Training grounds',
    player: 'Player', controls: 'WASD / arrows, or click and tap the ground to move', placeholder: 'Prototype scene · Placeholder art',
    loading: 'Opening the world…', worldTitle: 'MYTHRAVEN / TRAINING GROUNDS', session: 'LOCAL SESSION · SINGLE PLAYER',
  },
} as const;
export type Locale = keyof typeof messages;
export type MessageKey = keyof typeof messages.en;
export const locales: { code: Locale; label: string }[] = [{code:'th',label:'ไทย'}, {code:'en',label:'English'}];
let current: Locale = 'th';
try { if (localStorage.getItem('mr.locale') === 'en') current = 'en'; } catch { /* Language remains usable without storage. */ }
export function locale(): Locale { return current; }
export function setLocale(value: Locale): void {
  current = value;
  document.documentElement.lang = value;
  try { localStorage.setItem('mr.locale', value); } catch { /* Optional preference. */ }
}
export function t(key: MessageKey): string { return messages[current][key]; }
