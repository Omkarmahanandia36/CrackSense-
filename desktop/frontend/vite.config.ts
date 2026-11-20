import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Read single source of truth version from desktop/package.json
const desktopPkgPath = path.resolve(__dirname, '../package.json');
let appVersion = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf-8'));
  if (pkg.version) appVersion = pkg.version;
} catch (e) {
  console.warn('Could not read version from desktop/package.json, using fallback 1.0.0:', e);
}

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    '__APP_VERSION__': JSON.stringify(appVersion),
    'import.meta.env.APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/inspections': 'http://127.0.0.1:8000',
      '/storage': 'http://127.0.0.1:8000',
    },
  },
});
