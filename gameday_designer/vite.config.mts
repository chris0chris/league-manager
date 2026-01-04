import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'static/gameday_designer/js',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'gameday_designer.js',
        chunkFileNames: 'gameday_designer.js',
        assetFileNames: 'gameday_designer.[ext]',
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
