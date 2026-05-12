const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function test() {
  const token = jwt.sign({
    sub: '123',
    username: 'test',
    roles: ['SUPER_ADMIN']
  }, 'esap-super-secret-jwt-key-2024', { expiresIn: '1h' });

  console.log('Generated token:', token);
  
  // Hit gateway
  const gwRes = await fetch('http://localhost:4000/internal-institutional-control/api/v1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Gateway res:', gwRes.status, await gwRes.text());

  // Hit microservice
  const msRes = await fetch('http://localhost:3007/api/v1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Microservice res:', msRes.status, await msRes.text());
}

test();
