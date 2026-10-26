import { build } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await build({ root, configFile: false, publicDir: false, build: {
  emptyOutDir: false, outDir: 'public', sourcemap: false, minify: 'esbuild',
  lib: { entry: fileURLToPath(new URL('../src/scripts/family-health-auth.ts', import.meta.url)), name: 'FamilyHealthAuthBundle', formats: ['iife'], fileName: () => 'family-health-auth.js' }
} });
