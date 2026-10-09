/** LOCAL DEMO ONLY. Browser records are editable, not a trusted authentication boundary.
 * Replace this adapter with a server-backed service before multiplayer or deployment.
 */
import { validUsername, validPasswordCharacters, MAX_PASSWORD_LENGTH } from './input-policy';
export interface Session { id: string; username: string; kind: 'account' | 'guest' | 'google'; }
interface Account { username: string; salt: string; hash: string; }
export type AuthErrorCode = 'invalidUsername' | 'invalidPasswordCharacters' | 'shortPassword' | 'longPassword' | 'duplicate' | 'credentials' | 'storage' | 'unavailable';
export class AuthError extends Error { constructor(public code: AuthErrorCode) { super(code); } }
const ACCOUNTS = 'mr.demo.accounts.v1', SESSION = 'mr.demo.session.v1', GUEST = 'mr.demo.guest.v1';
function read(key: string): unknown {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { throw new AuthError('storage'); }
}
function validSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const s = value as Session;
  return typeof s.id === 'string' && typeof s.username === 'string' && (s.kind === 'guest' || s.kind === 'account');
}
function accounts(): Account[] {
  const data = read(ACCOUNTS);
  return Array.isArray(data) ? data.filter((a): a is Account => a && typeof a.username === 'string' && /^[a-f0-9]{32}$/.test(a.salt) && /^[a-f0-9]{64}$/.test(a.hash)) : [];
}
function hex(bytes: Uint8Array): string { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); }
async function derive(password: string, salt: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new AuthError('unavailable');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = Uint8Array.from(salt.match(/../g)!, b => parseInt(b,16));
  return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes,iterations:600000,hash:'SHA-256'},key,256)));
}
export function getSession(): Session | null {
  const session = read(SESSION);
  return validSession(session) ? session : null;
}
export function logout(): void {
  try { localStorage.removeItem(SESSION); } catch { throw new AuthError('storage'); }
}
export async function register(username: string, password: string): Promise<Session> {
  if (password.length > MAX_PASSWORD_LENGTH) throw new AuthError('longPassword');
  if (!validUsername(username)) throw new AuthError('invalidUsername');
  username = username.toLowerCase();
  if (!validPasswordCharacters(password)) throw new AuthError('invalidPasswordCharacters');
  if (password.length < 8) throw new AuthError('shortPassword');
  if (!globalThis.crypto?.subtle) throw new AuthError('unavailable');
  if (accounts().some(a => a.username === username)) throw new AuthError('duplicate');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derive(password, salt);
  // Re-read after async work so other local account additions are retained.
  const latest = accounts();
  if (latest.some(a => a.username === username)) throw new AuthError('duplicate');
  save(ACCOUNTS,[...latest,{username,salt,hash}]);
  const session: Session = {id:crypto.randomUUID(),username,kind:'account'};
  save(SESSION,session);
  return session;
}
export async function login(username: string,password: string): Promise<Session> {
  if (password.length > MAX_PASSWORD_LENGTH) throw new AuthError('longPassword');
  if (!validUsername(username)) throw new AuthError('invalidUsername');
  if (!validPasswordCharacters(password)) throw new AuthError('invalidPasswordCharacters');
  if (password.length < 8) throw new AuthError('shortPassword');
  const account = accounts().find(a => a.username === username.trim().toLowerCase());
  if (!account || await derive(password,account.salt) !== account.hash) throw new AuthError('credentials');
  const session: Session = {id:crypto.randomUUID(),username:account.username,kind:'account'};
  save(SESSION,session);
  return session;
}
export function guest(): Session {
  const previous = read(GUEST);
  if (!globalThis.crypto?.randomUUID) throw new AuthError('unavailable');
  const id = crypto.randomUUID();
  const session: Session = validSession(previous) && previous.kind === 'guest' ? previous :
    {id,username:'Guest-'+id.slice(0,6),kind:'guest'};
  save(GUEST,session);
  save(SESSION,session);
  return session;
}
