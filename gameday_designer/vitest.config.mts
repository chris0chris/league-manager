import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text', 'cobertura'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/setupTests.ts',
        'src/reportWebVitals.ts',
        'src/index.tsx',
      ],
    },
  },
});
