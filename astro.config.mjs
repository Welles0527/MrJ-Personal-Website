import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: '/officialwebsite',
  server: {
    host: '127.0.0.1'
  }
});
