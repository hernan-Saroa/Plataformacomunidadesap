const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function test() {
  const token = jwt.sign({
    sub: '123',
    username: 'test',
    roles: ['SUPER_ADMIN']
  }, 'esap-super-secret-jwt-key-2024', { expiresIn: '1h' });

  console.log('Hitting /api/v1/plan-anual-5-roles');
  const msRes = await fetch('http://localhost:3007/api/v1/plan-anual-5-roles', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', msRes.status, await msRes.text());
}

test();
