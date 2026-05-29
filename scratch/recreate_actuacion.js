const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });

  await client.connect();
  console.log('Connected to DB.');

  const actuacionId = 'db21e86f-5f1a-4e0b-a6b6-1c4b1697c8f0';
  const expedienteId = '19dfafaf-3c82-4ff9-8db3-7e3dae28f7f9';

  // Delete first in case it's there
  await client.query(`
    DELETE FROM legal_management.actuaciones WHERE id = $1;
  `, [actuacionId]);

  // Insert
  await client.query(`
    INSERT INTO legal_management.actuaciones (id, expediente_id, descripcion, tipo_actuacion, usuario_responsable, origen, metadata, created_at, fecha_actuacion)
    VALUES ($1, $2, 'Cambio de etapa: NOTIFICADA -> CONTESTACIÓN', 'CAMBIO_ETAPA', 'Sistema', 'MANUAL', '{}', NOW(), NOW());
  `, [actuacionId, expedienteId]);

  console.log('Actuacion recreated successfully.');

  await client.end();
}

run().catch(console.error);
