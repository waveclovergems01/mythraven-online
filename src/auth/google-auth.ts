import { locale, t, type MessageKey } from '../i18n';
import type { Session } from './local-auth';

interface GoogleId {
  initialize(options: {client_id:string;callback:(response:{credential:string})=>void;nonce:string;auto_select:boolean;ux_mode:'popup'}):void;
  renderButton(element:HTMLElement,options:{theme:string;size:string;type:string;text:string;width:number;locale:string}):void;
  disableAutoSelect():void;
}
declare global { interface Window { google?: { accounts: { id: GoogleId } }; } }
export class GoogleAuthError extends Error {
  constructor(public code: MessageKey) { super(code); }
}
async function request(path:string, body?:object):Promise<any> {
  let response:Response;
  try {
    response=await fetch('/api/auth/'+path,{method:body?'POST':'GET',credentials:'same-origin',
      headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,
      signal:AbortSignal.timeout(8000)});
  } catch { throw new GoogleAuthError('googleOffline'); }
  if(!response.ok) {
    let error='googleFailed';
    try { error=(await response.json()).error; } catch { /* No JSON on proxy failure. */ }
    throw new GoogleAuthError(error==='googleSetup'?'googleSetup':error==='googleExpired'?'googleExpired':error==='rateLimited'?'rateLimited':'googleFailed');
  }
  if(response.status===204) return null;
  try { return await response.json(); } catch { throw new GoogleAuthError('googleOffline'); }
}
let scriptPromise:Promise<void>|null=null;
function loadScript():Promise<void> {
  if(window.google?.accounts.id) return Promise.resolve();
  if(scriptPromise) return scriptPromise;
  scriptPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';
    script.async=true;
    const timeout=setTimeout(()=>{script.remove();scriptPromise=null;reject(new GoogleAuthError('googleScript'));},12000);
    script.onload=()=>{clearTimeout(timeout);resolve();};
    script.onerror=()=>{clearTimeout(timeout);script.remove();scriptPromise=null;reject(new GoogleAuthError('googleScript'));};
    document.head.append(script);
  });
  return scriptPromise;
}
let ready:Promise<void>|null=null;
let onCredential:((credential:string)=>void)|null=null;
function initialize():Promise<void> {
  if(!ready) ready=(async()=>{
    const config=await request('config');
    if(!config.enabled) throw new GoogleAuthError('googleSetup');
    await loadScript();
    const {nonce}=await request('challenge',{});
    window.google!.accounts.id.initialize({
      client_id:config.clientId,nonce,auto_select:false,ux_mode:'popup',
      callback:response=>onCredential?.(response.credential),
    });
  })().catch(error=>{ready=null;throw error;});
  return ready;
}
export async function mountGoogle(host:HTMLElement,status:HTMLElement,callback:(credential:string)=>void):Promise<void> {
  status.textContent=t('googleLoading');
  try {
    await initialize();
    if(!host.isConnected) return;
    onCredential=credential=>{if(host.isConnected) callback(credential);};
    host.replaceChildren();
    window.google!.accounts.id.renderButton(host,{theme:'outline',size:'large',type:'standard',text:'continue_with',width:Math.min(350,host.clientWidth),locale:locale()});
    status.textContent=t('googleReady');
  } catch(error) {
    if(!host.isConnected) return;
    status.textContent=t(error instanceof GoogleAuthError?error.code:'googleFailed');
    const retry=document.createElement('button');
    retry.type='button'; retry.className='google-retry'; retry.textContent=t('googleRetry');
    retry.onclick=()=>{void mountGoogle(host,status,callback);};
    host.replaceChildren(retry);
  }
}
export async function googleLogin(credential:string):Promise<Session> {
  return (await request('google',{credential})).user;
}
export async function googleSession():Promise<Session|null> {
  return (await request('session')).user;
}
export async function googleLogout():Promise<void> {
  await request('logout',{});
  window.google?.accounts.id.disableAutoSelect();
}
