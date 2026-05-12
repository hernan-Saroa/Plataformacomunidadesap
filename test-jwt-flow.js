const fetch = require('node-fetch');

async function testFlow() {
  console.log('--- Step 1: Login ---');
  // I need to use the superadmin email, but what is the password?
  // Is it password?
  const loginRes = await fetch('http://localhost:3001/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@esap.edu.co', password: 'password' })
  });
  
  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.log('Login failed with status:', loginRes.status);
    console.log('Error:', err);
    
    console.log('--- Try generic admin ---');
    const loginRes2 = await fetch('http://localhost:3001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@esap.edu.co', password: 'admin' })
    });
    if (!loginRes2.ok) {
        console.log('Admin login failed too:', loginRes2.status, await loginRes2.text());
        return;
    }
    const data2 = await loginRes2.json();
    console.log('Login successful for admin!');
    return await verifyToken(data2.accessToken);
  }

  const data = await loginRes.json();
  console.log('Login successful! Access token obtained.');
  
  await verifyToken(data.accessToken);
}

async function verifyToken(token) {
  console.log('--- Step 2: Verify ---');
  const verifyRes = await fetch('http://localhost:3001/verify', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (verifyRes.ok) {
    const user = await verifyRes.json();
    console.log('Verify successful! User:', user.email || user.username);
  } else {
    console.log('Verify failed with status:', verifyRes.status);
    const text = await verifyRes.text();
    console.log('Response:', text);
  }
}

testFlow();
