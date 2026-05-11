import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
import { getBuildBase, getBuildOutDir, stripBundleComments } from '../../scripts/mfe.config.mjs';

const appDir = 'mfe-estructura-org';

export default defineConfig({
  base: getBuildBase(appDir),
  root: __dirname,
  plugins: [
    react(),
    stripBundleComments(),
    federation({
      name: 'estructura_org',
      filename: 'remoteEntry.js',
      exposes: {
        './Module': path.resolve(__dirname, './src/components/estructura-organizacional/EstructuraOrganizacionalModule.tsx'),
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
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    emptyOutDir: false,
    outDir: getBuildOutDir(appDir),
  },
  server: {
    port: 3101,
  },
});
