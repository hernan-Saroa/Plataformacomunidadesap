import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';
import fs from 'fs';
import { cspNonceBootstrap, getBuildBase, getBuildOutDir, stripBundleComments } from '../../scripts/mfe.config.mjs';

const appDir = 'mfe-gestion-infraestructura';

// ---------------------------------------------------------------------------
// Middleware CORS + Dev fallback remoto (configureServer y configurePreviewServer).
//
// MOTIVACIÓN:
//   1) CORS: @originjs/vite-plugin-federation NO inyecta Access-Control-Allow-Origin
//      ni en vite dev ni en vite preview. Enviamos ACAO=* + preflight 204 en OPTIONS
//      para que shell localhost:3000 no reciba "CORS request did not succeed".
//
//   2) Build path vs dev path: El shell SIEMPRE carga /remotes/<appDir>/assets/remoteEntry.js
//      (build path, ver getRemoteEntryPath en scripts/mfe.config.mjs).
//      En vite preview eso existe físicamente en build/. En vite dev NO existe porque
//      @originjs/federation no monta el remote entry HTTP con base customizada
//      (/remotes/<appDir>/) — es un bug conocido del plugin. Workaround confiable
//      y alineado con el diseño del repo: EN VITE DEV, cuando llegue GET a
//      /assets/remoteEntry.js, servimos el file real de build/remotes/<appDir>/assets/
//      si existe (requiere `npm run build` del MFE al menos una vez).
// ---------------------------------------------------------------------------
const corsAndRemoteEntryBridge = () => ({
  name: 'esap-infra-cors-bridge',
  configureServer(server: { middlewares: { use: (h: any) => void } }) {
    server.middlewares.use(buildMiddleware());
  },
  configurePreviewServer(server: { middlewares: { use: (h: any) => void } }) {
    server.middlewares.use(buildMiddleware(true));
  },
});

function buildMiddleware(isPreview = false) {
  const base = getBuildBase(appDir);                 // /remotes/mfe-gestion-infraestructura/
  const buildDir = getBuildOutDir(appDir);           // .../build/remotes/mfe-gestion-infraestructura
  const remoteEntryBuildPath = path.join(buildDir, 'assets', 'remoteEntry.js');
  const buildRemoteEntryHref = `${base}assets/remoteEntry.js`;

  return (req: any, res: any, next: any) => {
    // 1) CORS headers para TODA respuesta
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization,Content-Type,Accept,Origin,X-Requested-With',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length,Content-Type');

    // 2) Preflight OPTIONS -> 204 inmediato
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const rawUrl = req.url || '';
    const requestPath = String(rawUrl.split('?')[0]); // quitar querystring (?v=...)

    // 3) VITE DEV SOLAMENTE: bridge build-path → al file de build/ si existe.
    //    En preview mode no hace falta: vite preview ya sirve los files desde outDir.
    if (!isPreview && requestPath === buildRemoteEntryHref) {
      if (fs.existsSync(remoteEntryBuildPath)) {
        const content = fs.readFileSync(remoteEntryBuildPath, 'utf8');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(content);
        return;
      }

      // Si no hay build, 404 con mensaje explícito para que el usuario no pierda tiempo
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(
        `[esap-mfe ${appDir}] Falta el remoteEntry.js compilado.\n` +
          `Correr primero:  cd apps/${appDir} && npm run build\n` +
          `Luego dejar o (a) npm run preview o (b) npm run dev corriendo en el MFE.\n` +
          `Se esperaba file en disco: ${remoteEntryBuildPath}`,
      );
      return;
    }

    next();
  };
}

export default defineConfig({
  base: getBuildBase(appDir),
  root: __dirname,
  plugins: [
    react(),
    cspNonceBootstrap(appDir),
    stripBundleComments(),
    corsAndRemoteEntryBridge(),
    federation({
      name: 'gestion_infraestructura',
      filename: 'remoteEntry.js',
      exposes: {
        './Module': path.resolve(__dirname, './src/components/GestionInfraestructuraModule.tsx'),
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
    port: 3117,
    strictPort: true,
  },
  preview: {
    port: 3117,
    strictPort: true,
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
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
});
