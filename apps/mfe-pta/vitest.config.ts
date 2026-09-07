import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^(.+)@\d+\.\d+\.\d+$/, replacement: '$1' },
      { find: '@esap-mfe/shared-hooks', replacement: path.resolve(__dirname, '../../packages/shared-hooks/src') },
      { find: '@esap-mfe/shared-ui', replacement: path.resolve(__dirname, '../../packages/shared-ui/src') },
      { find: '@esap-mfe/shared-types', replacement: path.resolve(__dirname, '../../packages/shared-types/src') },
    ],
  },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
