const http = require('http');

async function testDelete() {
  const expedienteId = '19dfafaf-3c82-4ff9-8db3-7e3dae28f7f9';
  const actuacionId = '09079005-1e7e-4bc6-9fb6-c5453306318c';
  
  const options = {
    hostname: 'localhost',
    port: 3008,
    path: `/expedientes/${expedienteId}/actuaciones/${actuacionId}`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log(`Sending DELETE to http://${options.hostname}:${options.port}${options.path}...`);

  const req = http.request(options, (res) => {
    let data = '';
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Response Body:', data);
    });
  });

  req.on('error', (err) => {
    console.error('Request Error:', err);
  });

  req.end();
}

testDelete().catch(console.error);
