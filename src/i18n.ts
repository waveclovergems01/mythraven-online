export const messages = {
  th: {
    googleSetup: 'ต้องตั้งค่า Google Client ID ก่อน ดูคู่มือ GOOGLE_AUTH_SETUP.md',
    googleOffline: 'ติดต่อเซิร์ฟเวอร์บัญชีไม่ได้ กรุณาเปิดด้วย npm run dev',
    googleScript: 'โหลด Google ไม่สำเร็จ ตรวจอินเทอร์เน็ตหรือตัวบล็อกเนื้อหา',
    googleFailed: 'ยืนยันบัญชี Google ไม่สำเร็จ กรุณารีเฟรชแล้วลองใหม่',
    googleExpired: 'คำขอเข้าสู่ระบบหมดอายุ กรุณารีเฟรชหน้าแล้วลองใหม่',
    googleLoading: 'กำลังเตรียม Google Sign-in…', googleReady: 'เลือกบัญชี Google ของคุณเพื่อเข้าเกม',
    googleRetry: 'ตรวจการเชื่อมต่อ Google อีกครั้ง', rateLimited: 'ลองหลายครั้งเกินไป กรุณารอสักครู่',
    tagline: 'ทุกตำนาน เริ่มต้นจากก้าวแรก', welcome: 'ยินดีต้อนรับ นักผจญภัย', subtitle: 'โลกแห่ง Mythraven กำลังรอคุณอยู่',
    login: 'เข้าสู่ระบบ', register: 'สร้างบัญชี', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', confirm: 'ยืนยันรหัสผ่าน',
    usernameHint: '3–16 ตัว ใช้ A–Z, a–z, 0–9 และ _', passwordHint: '8–64 ตัว ใช้อังกฤษ ตัวเลข หรือสัญลักษณ์ ไม่เว้นวรรค',
    longPassword: 'รหัสผ่านต้องไม่เกิน 64 ตัวอักษร',
    invalidPasswordCharacters: 'รหัสผ่านรับเฉพาะอังกฤษ ตัวเลข และสัญลักษณ์ เช่น !@#$% ไม่รับภาษาไทยหรือช่องว่าง',
    enter: 'เข้าเกม', create: 'สมัครและเข้าเกม', or: 'หรือเดินทางต่อด้วย', google: 'ดำเนินการต่อด้วย Google',
    email: 'เข้าสู่ระบบด้วยอีเมล', providerNote: 'การเข้าใช้งานด้วยอีเมลอื่นจะเพิ่มภายหลัง',
    guest: 'เล่นเป็น Guest', guestHint: 'ไม่ต้องสมัคร · จำ Guest บนเบราว์เซอร์นี้',
    local: 'เวอร์ชันทดลองบนเครื่อง', localNote: 'ชื่อผู้ใช้/รหัสผ่านยังเป็นบัญชีทดลอง ส่วน Google ยืนยันผ่านเซิร์ฟเวอร์',
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
    googleSetup: 'Set your Google Client ID first. See GOOGLE_AUTH_SETUP.md.',
    googleOffline: 'Auth server unavailable. Start the app with npm run dev.',
    googleScript: 'Could not load Google. Check your connection or content blocker.',
    googleFailed: 'Google verification failed. Refresh this page and try again.',
    googleExpired: 'Sign-in request expired. Refresh this page and try again.',
    googleLoading: 'Preparing Google Sign-in…', googleReady: 'Choose your Google account to enter the game',
    googleRetry: 'Check Google connection again', rateLimited: 'Too many attempts. Please wait a moment.',
    tagline: 'Every legend begins with a first step', welcome: 'Welcome, adventurer', subtitle: 'The world of Mythraven awaits you',
    login: 'Sign in', register: 'Create account', username: 'Username', password: 'Password', confirm: 'Confirm password',
    usernameHint: '3–16 characters: A–Z, a–z, 0–9 and _', passwordHint: '8–64 characters: English letters, numbers or symbols. No spaces.',
    longPassword: 'Password must not exceed 64 characters',
    invalidPasswordCharacters: 'Use English letters, numbers and ASCII symbols such as !@#$%. No Thai or spaces.',
    enter: 'Enter the world', create: 'Create account & play', or: 'Or continue your journey with', google: 'Continue with Google',
    email: 'Sign in with email', providerNote: 'Other email sign-in will be added later',
    guest: 'Play as Guest', guestHint: 'No registration · Guest remembered in this browser',
    local: 'Local preview', localNote: 'Username/password accounts are local demos. Google sign-in is server-verified.',
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
