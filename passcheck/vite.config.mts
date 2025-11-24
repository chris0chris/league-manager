import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'static/passcheck/js',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'passcheck.js',
        chunkFileNames: 'passcheck.js',
        assetFileNames: 'passcheck.[ext]',
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
