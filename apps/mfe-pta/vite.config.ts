import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { cspNonceBootstrap, getBuildBase, getBuildOutDir, stripBundleComments } from '../../scripts/mfe.config.mjs';

const appDir = 'mfe-pta';

export default defineConfig({
  base: getBuildBase(appDir),
  root: __dirname,
  plugins: [
    react(),
    cspNonceBootstrap(appDir),
    tailwindcss(),
    stripBundleComments(),
    federation({
      name: 'pta',
      filename: 'remoteEntry.js',
      exposes: {
        './Module': path.resolve(__dirname, './src/components/PTAModule.tsx'),
        './Portal': path.resolve(__dirname, './src/components/PTAPortalModule.tsx'),
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  resolve: {
    alias: [
      // Normaliza imports con sufijo de versión (ej. "lucide-react@0.487.0") a su paquete real.
      { find: /^(.+)@\d+\.\d+\.\d+$/, replacement: '$1' },
      // Compatibilidad: código legacy usa "@supabase/supabase-js" (repo previo).
      { find: '@supabase/supabase-js', replacement: '@jsr/supabase__supabase-js' },
      { find: 'leaflet', replacement: path.resolve(__dirname, './src/vendor/leaflet.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@esap-mfe/shared-hooks', replacement: path.resolve(__dirname, '../../packages/shared-hooks/src') },
      { find: '@esap-mfe/shared-ui', replacement: path.resolve(__dirname, '../../packages/shared-ui/src') },
      { find: '@esap-mfe/shared-types', replacement: path.resolve(__dirname, '../../packages/shared-types/src') },
    ],
  },
  server: {
    port: 3113,
  },
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    emptyOutDir: false,
    outDir: getBuildOutDir(appDir),
  },
});
