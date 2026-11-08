import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  base: '/officialwebsite',
  integrations: [react()],
  vite: {
    server: {
      strictPort: true,
      watch: {
        ignored: ['**/.private/**', '**/.git/**', '**/node_modules/**', '**/dist/**', '**/dist-test/**', '**/build/**', '**/output/**', '**/coverage/**', '**/test-results/**', '**/playwright-report/**']
      }
    }
  },
  server: {
    host: '127.0.0.1'
  }
});
