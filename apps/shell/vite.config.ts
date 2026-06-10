import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
import { cspNonceBootstrap, getBuildOutDir, getRemoteDefinitions, shellApp, stripBundleComments } from '../../scripts/mfe.config.mjs';

const devExternalRedirects: Record<string, string> = {
  '/externos/correo-institucional': 'https://outlook.office.com',
  '/externos/humano-soft': 'https://humanosoft.esap.edu.co',
  '/externos/arca': 'https://arca.esap.edu.co',
};

const buildDateSource = process.env.ESAP_BUILD_DATE
  ? new Date(process.env.ESAP_BUILD_DATE)
  : new Date();
const buildDateValue = Number.isNaN(buildDateSource.getTime()) ? new Date() : buildDateSource;
const buildDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(buildDateValue);

const externalRedirectPlugin = () => ({
  name: 'esap-dev-external-redirects',
  configureServer(server: { middlewares: { use: (handler: (req: { url?: string }, res: { statusCode: number; setHeader: (name: string, value: string) => void; end: () => void }, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const requestPath = req.url ? req.url.split('?')[0] : '';
      const redirectTarget = requestPath ? devExternalRedirects[requestPath] : undefined;

      if (!redirectTarget) {
        next();
        return;
      }

      res.statusCode = 302;
      res.setHeader('Location', redirectTarget);
      res.end();
    });
  },
});

export default defineConfig(({ command }) => ({
  root: __dirname,
  define: {
    __ESAP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    cspNonceBootstrap(shellApp.appDir),
    stripBundleComments(),
    externalRedirectPlugin(),
    federation({
      name: shellApp.federationName,
      remotes: getRemoteDefinitions(command === 'serve' ? 'serve' : 'build'),
      shared: ['react', 'react-dom', 'react-router-dom'],
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      'vaul@1.1.2': 'vaul',
      'sonner': 'sonner',
      'recharts@2.15.2': 'recharts',
      'react-resizable-panels@2.1.7': 'react-resizable-panels',
      'react-hook-form@7.55.0': 'react-hook-form',
      'react-day-picker@8.10.1': 'react-day-picker',
      'lucide-react@0.487.0': 'lucide-react',
      'input-otp@1.4.2': 'input-otp',
      'embla-carousel-react@8.6.0': 'embla-carousel-react',
      'cmdk@1.1.1': 'cmdk',
      'class-variance-authority@0.7.1': 'class-variance-authority',
      '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
      '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
      '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
      '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
      '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
      '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
      '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
      '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
      '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
      '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
      '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
      '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
      '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
      '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
      '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
      '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
      '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
      '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
      '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
      '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
      '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
      '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
      '@esap-mfe/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      '@esap-mfe/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
      '@esap-mfe/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: getBuildOutDir(shellApp.appDir),
    emptyOutDir: false,
  },
  server: {
    port: 3000,
    open: true,
  },
}));
