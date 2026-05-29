const http = require('http');

async function testDelete() {
  const expedienteId = '19dfafaf-3c82-4ff9-8db3-7e3dae28f7f9';
  const actuacionId = 'db21e86f-5f1a-4e0b-a6b6-1c4b1697c8f0';
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/legal/api/v1/expedientes/${expedienteId}/actuaciones/${actuacionId}`,
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
