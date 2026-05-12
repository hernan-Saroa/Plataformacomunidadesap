const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function test() {
  const token = jwt.sign({
    sub: '123',
    username: 'test',
    roles: ['SUPER_ADMIN']
  }, 'esap-super-secret-jwt-key-2024', { expiresIn: '1h' });

  // Hit a known protected endpoint. Let's try /api/v1/plan-anual
  const msRes = await fetch('http://localhost:3007/api/v1/plan-anual', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Control interno plan-anual:', msRes.status, await msRes.text());
}

test();
