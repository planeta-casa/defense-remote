import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base './' — сайт работает из любой подпапки GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        screen: resolve(__dirname, 'index.html'),
        remote: resolve(__dirname, 'remote.html'),
      },
    },
  },
});
