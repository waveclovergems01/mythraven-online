import { defineConfig, loadEnv } from 'vite';
import {localPorts} from './server/local-ports.mjs';

export default defineConfig(({ mode }) => {
  const env=loadEnv(mode,process.cwd(),'');
  const ports=localPorts({...env,...process.env});
  return {
    define:{'import.meta.env.VITE_LOCAL_GAME_PORT':JSON.stringify(ports.game)},
    server:{
      host:'127.0.0.1',port:ports.web,strictPort:true,
      headers:{'Cross-Origin-Opener-Policy':'same-origin-allow-popups','Referrer-Policy':'strict-origin-when-cross-origin'},
      proxy:{'/api/auth':{target:'http://127.0.0.1:'+ports.auth}},
    },
    preview:{
      host:'127.0.0.1',port:4173,strictPort:true,
      headers:{'Cross-Origin-Opener-Policy':'same-origin-allow-popups'},
      proxy:{'/api/auth':{target:'http://127.0.0.1:'+ports.auth}},
    },
  };
});
