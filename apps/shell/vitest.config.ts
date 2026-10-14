/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react(), {
    // Los remotes no existen como paquetes locales; cada prueba los sustituye por su fixture.
    name: 'federation-unit-test-resolver',
    resolveId(id: string) {
      if (/^(estructura_org|gestion_profesoral|programas_academicos|gestion_personas|auditoria|reportes|registro_academico|certificados_laborales|firma_electronica|control_interno|control_disciplinario|gestion_legal|pta|contratacion|viaticos|rund|programacion_academica|gestion_infraestructura|chatbot)\//.test(id)) {
        return '\0test-federation:' + id;
      }
    },
    load(id: string) {
      if (id.startsWith('\0test-federation:')) return 'export default function RemoteFixture() { return null; }';
    },
  }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}', 'services/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/test/**'],
    },
  },
});
