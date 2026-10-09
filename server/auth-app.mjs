import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

const SESSION_COOKIE = 'mr_google_session';
const BINDING_COOKIE = 'mr_google_browser';
const SESSION_MS = 8 * 60 * 60 * 1000;
const NONCE_MS = 15 * 60 * 1000;
const random = () => randomBytes(32).toString('hex');
function cookie(req, name) {
  return (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);
}

/** The verifier injection is only for isolated tests; the executable always uses Google's verifier. */
export function createAuthApp({
  clientId = '',
  origins = ['http://localhost:5173','http://127.0.0.1:5173'],
  secureCookies = false,
  now = Date.now,
  verifyToken,
} = {}) {
  const app = express();
  const oauth = new OAuth2Client(clientId);
  const verify = verifyToken ?? (async credential => {
    const ticket = await oauth.verifyIdToken({idToken:credential,audience:clientId});
    return ticket.getPayload();
  });
  const sessions = new Map(), nonces = new Map();
  const cookieOptions = {httpOnly:true,sameSite:'lax',secure:secureCookies,path:'/api/auth'};
  const prune = () => {
    for (const [key,value] of sessions) if(value.expiresAt <= now()) sessions.delete(key);
    for (const [key,value] of nonces) if(value.expiresAt <= now()) nonces.delete(key);
  };
  app.disable('x-powered-by');
  app.use('/api/auth', (_req,res,next)=> {
    prune(); res.set('Cache-Control','no-store'); res.set('X-Content-Type-Options','nosniff'); next();
  });
  app.use('/api/auth',rateLimit({windowMs:60_000,limit:60,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'rateLimited'}}));
  app.use('/api/auth',(req,res,next)=>{
    if(req.method !== 'GET' && (!origins.includes(req.get('origin')) || req.get('sec-fetch-site')==='cross-site')) {
      return res.status(403).json({error:'invalidOrigin'});
    }
    next();
  });
  app.use(express.json({limit:'16kb'}));
  app.get('/api/auth/config',(_req,res)=>res.json({enabled:Boolean(clientId),clientId}));
  app.post('/api/auth/challenge',(req,res)=>{
    if(!clientId) return res.status(503).json({error:'googleSetup'});
    const existing = cookie(req,BINDING_COOKIE);
    const binding = /^[a-f0-9]{64}$/.test(existing || '') ? existing : random();
    const nonce = random();
    nonces.set(nonce,{binding,expiresAt:now()+NONCE_MS});
    res.cookie(BINDING_COOKIE,binding,{...cookieOptions,maxAge:NONCE_MS});
    res.json({nonce});
  });
  app.post('/api/auth/google',async (req,res)=>{
    if(!clientId) return res.status(503).json({error:'googleSetup'});
    const credential=req.body?.credential;
    if(typeof credential !== 'string' || credential.length > 12000) return res.status(400).json({error:'googleFailed'});
    try {
      // Signature, issuer, audience and expiry are checked by the official Google library.
      const payload=await verify(credential);
      // Explicit claim checks also make this endpoint's contract clear and testable.
      if(!payload || payload.aud!==clientId ||
        !['accounts.google.com','https://accounts.google.com'].includes(payload.iss) ||
        typeof payload.exp!=='number' || payload.exp*1000<=now() ||
        typeof payload.sub!=='string' || !payload.sub || payload.email_verified!==true) {
        return res.status(401).json({error:'googleFailed'});
      }
      const challenge=nonces.get(payload.nonce);
      if(!challenge || challenge.expiresAt<=now() || challenge.binding!==cookie(req,BINDING_COOKIE)) {
        return res.status(401).json({error:'googleExpired'});
      }
      nonces.delete(payload.nonce); // Single-use, browser-bound login to prevent replay/login CSRF.
      const old=cookie(req,SESSION_COOKIE);
      if(old) sessions.delete(old);
      const sessionId=random();
      // Google sub, not email/name, is the stable identity. Never merge a local demo account by name.
      const user={id:'google:'+payload.sub,username:typeof payload.name==='string'?payload.name:'Google player',kind:'google'};
      sessions.set(sessionId,{user,expiresAt:now()+SESSION_MS});
      res.cookie(SESSION_COOKIE,sessionId,{...cookieOptions,maxAge:SESSION_MS});
      res.json({user});
    } catch {
      // Do not log credentials or Google's user payload.
      res.status(401).json({error:'googleFailed'});
    }
  });
  app.get('/api/auth/session',(req,res)=>{
    const session=sessions.get(cookie(req,SESSION_COOKIE));
    res.json({user:session && session.expiresAt>now()?session.user:null});
  });
  app.post('/api/auth/logout',(req,res)=>{
    sessions.delete(cookie(req,SESSION_COOKIE));
    res.clearCookie(SESSION_COOKIE,cookieOptions);
    res.status(204).end();
  });
  app.use((error,_req,res,_next)=>{
    res.status(error.status === 413 ? 413 : 400).json({error:'googleFailed'});
  });
  return app;
}
