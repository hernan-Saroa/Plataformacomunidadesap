import http from 'node:http';

const frontendServices = [
  { name: 'Shell (Vite dev)', port: 3000, path: '/' },
  { name: 'mfe-estructura-org', port: 3101, path: '/remotes/mfe-estructura-org/assets/remoteEntry.js' },
  { name: 'mfe-gestion-profesoral', port: 3102, path: '/remotes/mfe-gestion-profesoral/assets/remoteEntry.js' },
  { name: 'mfe-programas-academicos', port: 3103, path: '/remotes/mfe-programas-academicos/assets/remoteEntry.js' },
  { name: 'mfe-gestion-personas', port: 3104, path: '/remotes/mfe-gestion-personas/assets/remoteEntry.js' },
  { name: 'mfe-auditoria', port: 3105, path: '/remotes/mfe-auditoria/assets/remoteEntry.js' },
  { name: 'mfe-reportes', port: 3106, path: '/remotes/mfe-reportes/assets/remoteEntry.js' },
  { name: 'mfe-registro-academico', port: 3107, path: '/remotes/mfe-registro-academico/assets/remoteEntry.js' },
  { name: 'mfe-certificados-laborales', port: 3108, path: '/remotes/mfe-certificados-laborales/assets/remoteEntry.js' },
  { name: 'mfe-firma-electronica', port: 3109, path: '/remotes/mfe-firma-electronica/assets/remoteEntry.js' },
  { name: 'mfe-control-interno', port: 3110, path: '/remotes/mfe-control-interno/assets/remoteEntry.js' },
  { name: 'mfe-control-disciplinario', port: 3111, path: '/remotes/mfe-control-disciplinario/assets/remoteEntry.js' },
  { name: 'mfe-gestion-legal', port: 3112, path: '/remotes/mfe-gestion-legal/assets/remoteEntry.js' },
  { name: 'mfe-pta', port: 3113, path: '/remotes/mfe-pta/assets/remoteEntry.js' },
  { name: 'mfe-contratacion', port: 3114, path: '/remotes/mfe-contratacion/assets/remoteEntry.js' },
  { name: 'mfe-viaticos', port: 3115, path: '/remotes/mfe-viaticos/assets/remoteEntry.js' },
  { name: 'mfe-programacion-academica', port: 3116, path: '/remotes/mfe-programacion-academica/assets/remoteEntry.js' },
];

const backendServices = [
  { name: 'api-gateway', port: 3000, path: '/api' },
  { name: 'auth-service', port: 3001, path: '/' },
  { name: 'academic-registration-service', port: 3002, path: '/' },
  { name: 'academic-work-plan-service', port: 3003, path: '/' },
  { name: 'certification-service', port: 3004, path: '/' },
  { name: 'internal-disciplinary-control-service', port: 3005, path: '/' },
  { name: 'interoperability-service', port: 3006, path: '/' },
  { name: 'internal-institutional-control-service', port: 3007, path: '/' },
  { name: 'legal-management-service', port: 3008, path: '/' },
  { name: 'notifications-service', port: 3009, path: '/' },
  { name: 'travel-expenses-service', port: 3010, path: '/' },
  { name: 'audit-service', port: 3011, path: '/' },
  { name: 'hiring-service', port: 3012, path: '/' },
  { name: 'academic-schedule-service', port: 3013, path: '/' },
];

function checkService(service) {
  return new Promise((resolve) => {
    function tryHost(host) {
      const req = http.get(
        { hostname: host, port: service.port, path: service.path, timeout: 1500 },
        (res) => {
          res.resume();
          resolve({ ...service, status: 'OK', httpCode: res.statusCode });
        }
      );
      req.on('error', (err) => {
        if (host === 'localhost') {
          tryHost('127.0.0.1');
        } else {
          resolve({ ...service, status: 'FAIL', error: err.code || err.message });
        }
      });
      req.on('timeout', () => {
        req.destroy();
        if (host === 'localhost') {
          tryHost('127.0.0.1');
        } else {
          resolve({ ...service, status: 'FAIL', error: 'TIMEOUT' });
        }
      });
    }
    tryHost('localhost');
  });
}

console.log('=== FRONTEND MICRO-FRONTENDS ===');
console.log('');
const frontResults = await Promise.all(frontendServices.map(checkService));
for (const r of frontResults) {
  const icon = r.status === 'OK' ? '✅' : '❌';
  const detail = r.status === 'OK' ? `HTTP ${r.httpCode}` : r.error;
  console.log(`${icon} :${r.port} ${r.name.padEnd(30)} ${detail}`);
}

console.log('');
console.log('=== BACKEND MICROSERVICES ===');
console.log('');
const backResults = await Promise.all(backendServices.map(checkService));
for (const r of backResults) {
  const icon = r.status === 'OK' ? '✅' : '❌';
  const detail = r.status === 'OK' ? `HTTP ${r.httpCode}` : r.error;
  console.log(`${icon} :${r.port} ${r.name.padEnd(42)} ${detail}`);
}

const frontOk = frontResults.filter(r => r.status === 'OK').length;
const backOk = backResults.filter(r => r.status === 'OK').length;
console.log('');
console.log(`=== RESUMEN ===`);
console.log(`Frontend: ${frontOk}/${frontResults.length} activos`);
console.log(`Backend:  ${backOk}/${backResults.length} activos`);

// Also check DB and Redis
const infra = [
  { name: 'PostgreSQL (Docker)', port: 8080, path: '/' },
  { name: 'Redis', port: 6379, path: '/' },
];
console.log('');
console.log('=== INFRAESTRUCTURA ===');
const infraResults = await Promise.all(infra.map(checkService));
for (const r of infraResults) {
  const icon = r.status === 'OK' ? '✅' : '❌';
  const detail = r.status === 'OK' ? `HTTP ${r.httpCode}` : r.error;
  console.log(`${icon} :${r.port} ${r.name.padEnd(30)} ${detail}`);
}
