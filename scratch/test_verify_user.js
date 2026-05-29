const jwt = require('jsonwebtoken');
const http = require('http');

function run() {
  // Generate a mock token for SUPER_ADMIN
  const payload = {
    sub: '770e8400-e29b-41d4-a716-446655440001',
    username: 'superadmin',
    email: 'superadmin@esap.edu.co',
    name: 'Super Admin',
    roles: ['SUPER_ADMIN']
  };
  const token = jwt.sign(payload, 'esap_jwt_secret_change_in_production', { expiresIn: '1h' });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/api/v1/verify',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  console.log(`Sending GET to gateway at http://${options.hostname}:${options.port}${options.path}...`);

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

run();
