const http = require('http');

const services = [
  // API Gateway
  { name: 'api-gateway', host: '127.0.0.1', port: 3000, paths: ['/health', '/'] },

  // Microservicios Backend
  { name: 'auth-service', host: '127.0.0.1', port: 3001, paths: ['/health', '/'] },
  { name: 'academic-registration-service', host: '127.0.0.1', port: 3002, paths: ['/health', '/'] },
  { name: 'academic-work-plan-service', host: '127.0.0.1', port: 3003, paths: ['/health', '/'] },
  { name: 'certification-service', host: '127.0.0.1', port: 3004, paths: ['/health', '/'] },
  { name: 'internal-disciplinary-control-service', host: '127.0.0.1', port: 3005, paths: ['/health', '/'] },
  { name: 'interoperability-service', host: '127.0.0.1', port: 3006, paths: ['/health', '/'] },
  { name: 'internal-institutional-control-service', host: '127.0.0.1', port: 3007, paths: ['/health', '/'] },
  { name: 'legal-management-service', host: '127.0.0.1', port: 3008, paths: ['/health', '/'] },
  { name: 'notifications-service', host: '127.0.0.1', port: 3009, paths: ['/health', '/'] },
  { name: 'travel-expenses-service', host: '127.0.0.1', port: 3010, paths: ['/health', '/'] },
  { name: 'audit-service', host: '127.0.0.1', port: 3011, paths: ['/health', '/'] },

  // Frontend Host
  { name: 'frontend-shell (Host)', host: 'localhost', port: 5173, paths: ['/'] },

  // Microfrontends (MFEs) Remotos
  { name: 'mfe-estructura-org', host: '127.0.0.1', port: 3101, paths: ['/remotes/mfe-estructura-org/'] },
  { name: 'mfe-gestion-profesoral', host: '127.0.0.1', port: 3102, paths: ['/remotes/mfe-gestion-profesoral/'] },
  { name: 'mfe-programas-academicos', host: '127.0.0.1', port: 3103, paths: ['/remotes/mfe-programas-academicos/'] },
  { name: 'mfe-gestion-personas', host: '127.0.0.1', port: 3104, paths: ['/remotes/mfe-gestion-personas/'] },
  { name: 'mfe-auditoria', host: '127.0.0.1', port: 3105, paths: ['/remotes/mfe-auditoria/'] },
  { name: 'mfe-reportes', host: '127.0.0.1', port: 3106, paths: ['/remotes/mfe-reportes/'] },
  { name: 'mfe-registro-academico', host: '127.0.0.1', port: 3107, paths: ['/remotes/mfe-registro-academico/'] },
  { name: 'mfe-certificados-laborales', host: '127.0.0.1', port: 3108, paths: ['/remotes/mfe-certificados-laborales/'] },
  { name: 'mfe-firma-electronica', host: '127.0.0.1', port: 3109, paths: ['/remotes/mfe-firma-electronica/'] },
  { name: 'mfe-control-interno', host: '127.0.0.1', port: 3110, paths: ['/remotes/mfe-control-interno/'] },
  { name: 'mfe-control-disciplinario', host: '127.0.0.1', port: 3111, paths: ['/remotes/mfe-control-disciplinario/'] },
  { name: 'mfe-gestion-legal', host: '127.0.0.1', port: 3112, paths: ['/remotes/mfe-gestion-legal/'] },
  { name: 'mfe-pta', host: '127.0.0.1', port: 3113, paths: ['/remotes/mfe-pta/'] }
];

function checkPath(host, port, path) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: host,
      port: port,
      path: path,
      timeout: 2000
    }, (res) => {
      resolve({ status: res.statusCode, error: null });
    });

    req.on('error', (err) => {
      resolve({ status: null, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: null, error: 'TIMEOUT' });
    });
  });
}

async function verifyAll() {
  console.log('======================================================================');
  console.log('      CONTROL DE ESTADO DE SERVICIOS (BACKEND Y FRONTEND MFE)        ');
  console.log('======================================================================\n');

  let activeCount = 0;
  let inactiveCount = 0;

  for (const service of services) {
    let success = false;
    let detail = '';

    for (const path of service.paths) {
      const res = await checkPath(service.host, service.port, path);
      if (res.status !== null) {
        success = true;
        detail = `OK (HTTP ${res.status}) en '${path}'`;
        break;
      } else {
        detail = `Error: ${res.error} en '${path}'`;
      }
    }

    if (success) {
      activeCount++;
      console.log(`[🟢 ACTIVO] ${service.name.padEnd(42)} | Puerto: ${String(service.port).padEnd(4)} | Info: ${detail}`);
    } else {
      inactiveCount++;
      console.log(`[🔴 CAÍDO ] ${service.name.padEnd(42)} | Puerto: ${String(service.port).padEnd(4)} | Info: ${detail}`);
    }
  }

  console.log('\n======================================================================');
  console.log(` RESUMEN: ${activeCount} activos, ${inactiveCount} caídos de ${services.length} en total.`);
  console.log('======================================================================');
}

verifyAll();
