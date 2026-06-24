import { defineConfig } from 'astro/config';

export default defineConfig(({ command }) => ({
  output: 'static',
  base: command === 'build' ? '/officialwebsite' : '/',
  server: {
    host: '127.0.0.1'
  }
}));
