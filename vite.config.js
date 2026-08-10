import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
