import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'public/topics/space/investing/funds');

await build({
  root: projectRoot,
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    outDir: outputDir,
    minify: 'esbuild',
    sourcemap: false,
    lib: {
      entry: path.join(projectRoot, 'src/scripts/fund-dashboard-preferences.ts'),
      name: 'FundPreferenceCloudBundle',
      formats: ['iife'],
      fileName: () => 'fund-preferences-cloud.js'
    }
  }
});
