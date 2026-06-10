const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const http = require('http');

async function run() {
  const pgClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });

  await pgClient.connect();
  console.log('Connected to DB.');

  const actuacionId = 'db21e86f-5f1a-4e0b-a6b6-1c4b1697c8f0';
  const expedienteId = '19dfafaf-3c82-4ff9-8db3-7e3dae28f7f9';

  // Recreate
  await pgClient.query(`DELETE FROM legal_management.actuaciones WHERE id = $1;`, [actuacionId]);
  await pgClient.query(`
    INSERT INTO legal_management.actuaciones (id, expediente_id, descripcion, tipo_actuacion, usuario_responsable, origen, metadata, created_at, fecha_actuacion)
    VALUES ($1, $2, 'Cambio de etapa: NOTIFICADA -> CONTESTACIÓN', 'CAMBIO_ETAPA', 'Sistema', 'MANUAL', '{}', NOW(), NOW());
  `, [actuacionId, expedienteId]);
  console.log('Actuacion recreated.');
  await pgClient.end();

  // Generate token
  const payload = {
    sub: '770e8400-e29b-41d4-a716-446655440001',
    username: 'superadmin',
    email: 'superadmin@esap.edu.co',
    name: 'Super Admin',
    roles: ['SUPER_ADMIN']
  };
  const token = jwt.sign(payload, 'esap_jwt_secret_change_in_production', { expiresIn: '1h' });

  // Send DELETE to gateway
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/legal/api/v1/expedientes/${expedienteId}/actuaciones/${actuacionId}`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  console.log(`Sending DELETE to gateway at http://${options.hostname}:${options.port}${options.path}...`);

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

run().catch(console.error);
