import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
import { getBuildBase, getBuildOutDir } from '../../scripts/mfe.config.mjs';

const appDir = 'mfe-firma-electronica';

export default defineConfig({
  base: getBuildBase(appDir),
  plugins: [
    react(),
    federation({
      name: 'firma_electronica',
      filename: 'remoteEntry.js',
      exposes: {
        './Module': './src/components/ModuloFirmaElectronicaWorldClass.tsx',
      },
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@esap-mfe/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@esap-mfe/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
    },
  },
  server: {
    port: 3109,
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
