import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { 'chatbot/Module': path.resolve(__dirname, 'src/components/ChatbotModule.tsx') } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
});
