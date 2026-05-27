const http = require('http');

const payload = JSON.stringify({
  radicado: 'NUEVO-DEMANDA-TEST-123',
  tipoProceso: 'Reparación Directa',
  jurisdiccion: 'Contencioso Administrativo',
  etapaProcesal: 'NOTIFICADA',
});

const req = http.request({
  hostname: 'localhost',
  port: 3008,
  path: '/expedientes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-user-id': 'test-user',
    'x-user-roles': 'JEFE_GESTION_LEGAL',
  },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', console.error);
req.write(payload);
req.end();
