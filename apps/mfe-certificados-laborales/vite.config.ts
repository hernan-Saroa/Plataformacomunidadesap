import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
import { getBuildBase, getBuildOutDir } from '../../scripts/mfe.config.mjs';

const appDir = 'mfe-certificados-laborales';

const stripPrivateIpLikeDependencyComments = () => ({
  name: 'strip-private-ip-like-dependency-comments',
  generateBundle(_: unknown, bundle: Record<string, { type: string; code?: string }>) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'chunk' && chunk.code) {
        chunk.code = chunk.code.replace(/ \/\/ 10\.4\.6\.2 <draw:object>/g, '');
      }
    }
  },
});

export default defineConfig({
  base: getBuildBase(appDir),
  root: __dirname,
  plugins: [
    react(),
    stripPrivateIpLikeDependencyComments(),
    federation({
      name: 'certificados_laborales',
      filename: 'remoteEntry.js',
      exposes: {
        './Router': path.resolve(__dirname, './src/components/CertificadosLaboralesRouter.tsx'),
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
    port: 3108,
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
