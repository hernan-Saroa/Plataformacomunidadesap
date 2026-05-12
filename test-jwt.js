const fetch = require('node-fetch');

async function test() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@esap.edu.co', password: 'admin' }) // Use a known valid login if possible, or we will see if it fails
    });
    
    if (!loginRes.ok) {
      console.log('Login failed:', loginRes.status, await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // 2. Fetch from control-interno
    console.log('Fetching from control-interno...');
    const ciRes = await fetch('http://localhost:3007/api/v1/health', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Control interno response status:', ciRes.status);
    console.log('Control interno response body:', await ciRes.text());
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
