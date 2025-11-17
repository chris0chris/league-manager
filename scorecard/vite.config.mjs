import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Enable JSX in .js files
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // Build configuration
  build: {
    outDir: 'static/scorecard/js',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.js'),
      output: {
        // Single bundle output to match Django expectations
        entryFileNames: 'scorecard.js',
        chunkFileNames: 'scorecard-[name].js',
        assetFileNames: 'scorecard-[name].[ext]',
        // Disable code splitting for single bundle
        manualChunks: undefined,
      },
    },
    // Inline small assets
    assetsInlineLimit: 4096,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
