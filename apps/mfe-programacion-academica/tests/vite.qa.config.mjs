import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: dir, base: '/qa/', plugins: [react()],
  resolve: { alias: { '@esap-mfe/shared-ui': path.resolve(dir, '../../../packages/shared-ui/src'), '@esap-mfe/shared-types': path.resolve(dir, '../../../packages/shared-types/src') } },
  build: { target: 'esnext', outDir: path.resolve(dir, '../../../build/qa-programacion'), emptyOutDir: true, rollupOptions: { input: path.join(dir, 'qa-produccion.html') } },
});
