import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  base: '/officialwebsite',
  integrations: [react()],
  server: {
    host: '127.0.0.1'
  }
});
