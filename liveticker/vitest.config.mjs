import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
    // Enable JSX in .js files (including test files)
    include: [
      '/src\/.*\.(js|mjs|cjs|ts|jsx|tsx)$/',
      // Also include test files
      '/__tests__\/.*\.(js|mjs|cjs|ts|jsx|tsx)$/',
    ],
    exclude: [
      'node_modules',
    ],
  },

  test: {
    // Use jsdom environment for DOM testing
    environment: 'jsdom',

    // Setup files to run before each test file
    setupFiles: ['./src/__tests__/setup/jest.setup.js'],

    // Test file patterns
    include: ['**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules',
      'src/__tests__/setup/',
      'src/__tests__/testdata/',
      'src/__tests__/Utils.js',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text', 'cobertura'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        '**/__tests__/**',
        '**/urls.js',
      ],
    },

    // Globals (optional - enables Jest-like global APIs)
    globals: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
