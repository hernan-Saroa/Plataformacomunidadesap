import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Los .tsx del bundle no son pruebas; solo los archivos *.test.*
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
