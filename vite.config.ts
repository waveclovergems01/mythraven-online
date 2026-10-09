import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env=loadEnv(mode,process.cwd(),'');
  return {
    server:{
      host:'127.0.0.1',port:5173,strictPort:true,
      headers:{'Cross-Origin-Opener-Policy':'same-origin-allow-popups','Referrer-Policy':'strict-origin-when-cross-origin'},
      proxy:{'/api/auth':{target:'http://127.0.0.1:'+(env.AUTH_PORT || '3001')}},
    },
    preview:{
      host:'127.0.0.1',port:4173,strictPort:true,
      headers:{'Cross-Origin-Opener-Policy':'same-origin-allow-popups'},
      proxy:{'/api/auth':{target:'http://127.0.0.1:'+(env.AUTH_PORT || '3001')}},
    },
  };
});
