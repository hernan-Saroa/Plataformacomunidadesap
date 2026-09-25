import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../..', import.meta.url));
const server = await createServer({
  root, configFile: false, plugins: [react()],
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3117') },
  server: { host: 'localhost', port: 3117, strictPort: true, proxy: {
    '/viaticos/api/v1': { target: 'http://localhost:3111', rewrite: p => p.replace('/viaticos/api/v1', '') },
  } },
});
await server.listen();
console.log('MFE aislado: http://localhost:3117/src/components/paz-y-salvo/dev.html');
