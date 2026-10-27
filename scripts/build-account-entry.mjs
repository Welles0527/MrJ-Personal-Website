import { build } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({ root, configFile: false, publicDir: false, build: {
  emptyOutDir: false, outDir: 'public', sourcemap: false, minify: 'esbuild',
  lib: { entry: fileURLToPath(new URL('../src/scripts/account-entry.ts', import.meta.url)), name: 'MagicJAccountBundle', formats: ['iife'], fileName: () => 'account-entry.js' }
} });
