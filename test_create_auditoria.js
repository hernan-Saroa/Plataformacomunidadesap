const jwt = require('./backend/internal-institutional-control-service/node_modules/jsonwebtoken');
const fetch = require('node-fetch');

async function main() {
  const secret = 'esap-super-secret-jwt-key-2024';
  const token = jwt.sign(
    {
      sub: '22222222-2222-2222-2222-222222222222',
      username: 'superuser@esap.edu.co',
      roles: ['SUPER_ADMIN'],
      email: 'superuser@esap.edu.co'
    },
    secret,
    { expiresIn: '1h' }
  );

  const payload = {
    nombre: "Auditoría de Prueba con Auditor",
    tipo: "Regular",
    territorial: "Sede Central",
    sede: "Sede Central",
    responsable: "Por asignar",
    fechaInicio: "2026-06-18",
    fechaFin: "2026-06-30",
    auditorLiderId: "f0ee731b-1d81-46fe-b4d3-ddc91bf73338"
  };

  try {
    const res = await fetch('http://localhost:3007/auditorias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
