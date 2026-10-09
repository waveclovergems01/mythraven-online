import { AuthError, getSession, guest, login, logout, register, type Session } from './auth/local-auth';
import { locale, locales, setLocale, t, type Locale, type MessageKey } from './i18n';
import { mountGoogle, googleLogin, googleSession, googleLogout, GoogleAuthError } from './auth/google-auth';
import './style.css';
import { fitAuthViewport } from './auth/fit-viewport';
import { restrictInput, usernameCharacters, passwordCharacters, validUsername, validPasswordCharacters, MAX_PASSWORD_LENGTH } from './auth/input-policy';

const app = document.querySelector<HTMLDivElement>('#app')!;
let mode: 'login' | 'register' = 'login';
let errorKey: MessageKey | null = null;
let game: import('phaser').Game | null = null;
let viewVersion = 0;
let authenticating = false;
let stopFittingAuth: (() => void) | undefined;
setLocale(locale());
const brand = '<img class="brand-logo" src="/assets/ui/mythraven-logo-v001.webp" width="640" height="320" alt="Mythraven Online" fetchpriority="high">';

function renderAuth(): void {
  stopFittingAuth?.();
  viewVersion++;
  app.innerHTML = `<main class="auth-page">
    <div class="ambient" aria-hidden="true"></div>
    <div class="auth-wrap">
      <div class="topline"><span class="tiny-star">✦</span> ${t('tagline')} <span class="tiny-star">✦</span></div>
      <section class="auth-card" aria-labelledby="welcome">
        <header class="brand">${brand}</header>
        <div class="welcome"><h1 id="welcome">${t('welcome')}</h1><p>${t('subtitle')}</p></div>
        <div class="mode-switch" role="group" aria-label="${t('login')} / ${t('register')}">
          <button type="button" data-mode="login" aria-pressed="${mode==='login'}">${t('login')}</button>
          <button type="button" data-mode="register" aria-pressed="${mode==='register'}">${t('register')}</button>
        </div>
        <form id="auth-form" novalidate>
          <div class="field"><label for="username">${t('username')}</label>
          <input id="username" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="text" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" required aria-describedby="username-hint form-error">
          <small id="username-hint">${t('usernameHint')}</small></div>
          <div class="field"><label for="password">${t('password')}</label><div class="password-wrap">
          <input id="password" name="password" type="password" maxlength="${MAX_PASSWORD_LENGTH}" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="${mode==='register'?'new-password':'current-password'}" required aria-describedby="password-hint form-error">
          <button type="button" class="reveal" aria-controls="password" aria-pressed="false">${t('show')}</button></div>
          <small id="password-hint">${t('passwordHint')}</small></div>
          <div class="field confirm-slot" ${mode==='login'?'inert aria-hidden="true"':''}><label for="confirm">${t('confirm')}</label><input id="confirm" name="confirm" type="password" maxlength="${MAX_PASSWORD_LENGTH}" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="new-password" ${mode==='login'?'disabled':'required'} aria-describedby="password-hint form-error"></div>
          <p id="form-error" class="error" role="alert">${errorKey?t(errorKey):''}</p>
          <button class="primary" type="submit"><span>${t(mode==='login'?'enter':'create')}</span><span aria-hidden="true">→</span></button>
        </form>
        <div class="divider"><span></span>${t('or')}<span></span></div>
        <div class="providers"><div id="google-signin" aria-label="${t('google')}"></div>
        <button type="button" disabled aria-describedby="provider-note"><span aria-hidden="true">✉</span>${t('email')}</button></div>
        <p id="provider-note" class="provider-note">${t('providerNote')}</p><p id="google-status" class="provider-note" role="status"></p>
        <button type="button" class="guest" id="guest">${t('guest')} <span aria-hidden="true">↗</span></button>
        <p class="guest-hint">${t('guestHint')}</p>
        <div class="card-bottom"><span class="local-badge"><i></i>${t('local')}</span><label class="language"><span class="sr-only">${t('language')}</span><select id="language">${locales.map(l=>`<option value="${l.code}" ${l.code===locale()?'selected':''}>${l.label}</option>`).join('')}</select></label></div>
      </section>
      <p class="local-note">${t('localNote')}</p>
      <p class="page-footer">${t('footer')}</p>
    </div></main>`;
  stopFittingAuth = fitAuthViewport(app.querySelector('.auth-page')!, app.querySelector('.auth-wrap')!);
  for (const id of ['username', 'password', 'confirm']) {
    const input = app.querySelector<HTMLInputElement>('#'+id);
    if (input) restrictInput(input, id==='username'?usernameCharacters:passwordCharacters,
      () => showError(id==='username'?'invalidUsername':'invalidPasswordCharacters', id),
      () => showError(id==='username'?'invalidUsername':'longPassword', id));
  }
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click',()=>{
    mode = button.dataset.mode as typeof mode; errorKey = null; renderAuth(); app.querySelector<HTMLInputElement>('#username')!.focus();
  }));
  app.querySelector<HTMLSelectElement>('#language')!.addEventListener('change',event=>{
    const form = new FormData(app.querySelector<HTMLFormElement>('form')!);
    setLocale((event.target as HTMLSelectElement).value as Locale); renderAuth();
    for (const [key,value] of form) { const input=app.querySelector<HTMLInputElement>(`[name="${key}"]`); if(input) { input.value=String(value); input.dispatchEvent(new Event('change')); } }
    app.querySelector<HTMLSelectElement>('#language')!.focus();
  });
  app.querySelector<HTMLButtonElement>('.reveal')!.addEventListener('click',event=>{
    const input=app.querySelector<HTMLInputElement>('#password')!;
    const show=input.type==='password'; input.type=show?'text':'password';
    const button=event.currentTarget as HTMLButtonElement; button.textContent=t(show?'hide':'show'); button.setAttribute('aria-pressed',String(show));
  });
  app.querySelector<HTMLFormElement>('form')!.addEventListener('submit',async event=>{
    event.preventDefault();
    const form=event.currentTarget as HTMLFormElement;
    const data=new FormData(form), username=String(data.get('username')??''), password=String(data.get('password')??'');
    if(!validUsername(username)) return showError('invalidUsername','username');
    if(!validPasswordCharacters(password)) return showError('invalidPasswordCharacters','password');
    if(password.length<8) return showError('shortPassword','password');
    if(password.length>MAX_PASSWORD_LENGTH) return showError('longPassword','password');
    if(mode==='register' && String(data.get('confirm')??'').length>MAX_PASSWORD_LENGTH) return showError('longPassword','confirm');
    if(mode==='register' && !validPasswordCharacters(String(data.get('confirm')??''))) return showError('invalidPasswordCharacters','confirm');
    if(mode==='register' && password!==data.get('confirm')) return showError('mismatch','confirm');
    await runAuth(()=>mode==='register'?register(username,password):login(username,password));
  });
  app.querySelector('#guest')!.addEventListener('click',()=>void runAuth(async()=>guest()));
  void mountGoogle(app.querySelector('#google-signin')!,app.querySelector('#google-status')!,credential=>{
    void runAuth(async()=>{const session=await googleLogin(credential); try { logout(); } catch { /* Server session takes priority. */ } return session;});
  });
}
function showError(key: MessageKey, field?: string): void {
  errorKey=key;
  const error=app.querySelector('#form-error'); if(error) error.textContent=t(key);
  app.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  if(field){ const input=app.querySelector<HTMLInputElement>('#'+field); input?.setAttribute('aria-invalid','true'); input?.focus(); }
}
async function runAuth(action:()=>Promise<Session>): Promise<void> {
  if(authenticating) return;
  authenticating = true;
  const googleHost = app.querySelector<HTMLElement>('#google-signin');
  if(googleHost) googleHost.inert = true;
  const controls=Array.from(app.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement>('input,button,select'));
  const originallyDisabled=controls.map(c=>c.disabled);
  controls.forEach(c=>c.disabled=true);
  const label=app.querySelector('.primary span'); if(label) label.textContent=t('busy');
  try { const session=await action(); await showGame(session); }
  catch(error) {
    if(!app.querySelector('#auth-form')) renderAuth();
    showError(error instanceof AuthError || error instanceof GoogleAuthError?error.code:'generic');
  } finally {
    authenticating = false;
    if(googleHost) googleHost.inert = false;
    controls.forEach((c,i)=>c.disabled=originallyDisabled[i]);
    if(label) label.textContent=t(mode==='login'?'enter':'create');
  }
}
async function showGame(session: Session): Promise<void> {
  stopFittingAuth?.();
  stopFittingAuth = undefined;
  const version=++viewVersion;
  app.innerHTML=`<main class="game-page"><header class="game-header"><div><div class="mini-brand">MYTHRAVEN <span>ONLINE</span></div><p>${t('training')} · <span id="player-name"></span></p></div><button class="leave" id="logout">${t('logout')}</button></header><div id="game" aria-label="${t('training')}"><p class="loading">${t('loading')}</p></div><footer class="game-footer"><span>${t('controls')}</span><span>${t('placeholder')}</span></footer><p id="game-error" class="error" role="alert"></p></main>`;
  app.querySelector('#player-name')!.textContent=session.username;
  app.querySelector('#logout')!.addEventListener('click',async()=>{
    const button=app.querySelector<HTMLButtonElement>('#logout')!; button.disabled=true;
    try {
      if(session.kind==='google') await googleLogout();
      try { logout(); } catch(error) { if(session.kind!=='google') throw error; }
      game?.destroy(true); game=null; errorKey=null;
      if(session.kind==='google') { window.location.reload(); return; }
      renderAuth();
    } catch(error) {
      button.disabled=false;
      app.querySelector('#game-error')!.textContent=t(error instanceof GoogleAuthError?error.code:'storage');
    }
  });
  const [{default:Phaser},{WorldScene}]=await Promise.all([import('phaser'),import('./scenes/WorldScene')]);
  if(version!==viewVersion) return;
  app.querySelector('.loading')?.remove();
  game=new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#243b36',
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:1120,height:680},
    scene:[WorldScene],render:{antialias:true}});
}
async function start():Promise<void> {
  // Verify the server cookie before considering any untrusted demo-browser session.
  let verified:Session|null=null;
  try { verified=await googleSession(); } catch { /* Local demo remains available while server is offline. */ }
  const session=verified ?? getSession();
  if(session) await showGame(session);
  else renderAuth();
}
void start().catch(()=>{renderAuth();showError('generic');});
