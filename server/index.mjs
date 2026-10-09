import 'dotenv/config';
import { createAuthApp } from './auth-app.mjs';

const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
if(clientId && !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
  throw new Error('GOOGLE_CLIENT_ID must be a Google Web application Client ID.');
}
const port=Number(process.env.AUTH_PORT || 3001);
const origins=(process.env.AUTH_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim());
const app=createAuthApp({clientId,origins,secureCookies:process.env.AUTH_SECURE_COOKIES==='true'});
app.listen(port,'127.0.0.1',(error)=>{
  if (error) {
    console.error(error.code === 'EADDRINUSE'
      ? 'Auth port '+port+' is already in use. Stop the existing project server before running npm run dev.'
      : 'Auth server failed to start: '+error.message);
    process.exitCode = 1;
    return;
  }
  console.log('Auth server: http://127.0.0.1:'+port);
  console.log(clientId?'Google sign-in configured.':'Google sign-in awaits GOOGLE_CLIENT_ID in .env. See docs/GOOGLE_AUTH_SETUP.md');
});
