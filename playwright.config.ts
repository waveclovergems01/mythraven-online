import { defineConfig } from '@playwright/test';
import 'dotenv/config';
import {localPorts} from './server/local-ports.mjs';
const baseURL='http://127.0.0.1:'+localPorts(process.env).web;
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: { baseURL, channel:'msedge', headless:true },
  webServer: { command:'npm run dev', url:baseURL, reuseExistingServer:!process.env.CI },
});
