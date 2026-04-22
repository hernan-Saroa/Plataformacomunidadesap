async function testCreate() {
  const payload = {
    first_name: 'Juan',
    last_name: 'Perez',
    identification_number: '123456789',
    identification_type: 'CC',
    email: 'juan.perez48@esap.edu.co',
    phone: '3001234567',
    gender: 'M',
    roleIds: []
  };

  console.log('Sending request to auth-service...');
  try {
    const res = await fetch('http://localhost:3001/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

testCreate();
