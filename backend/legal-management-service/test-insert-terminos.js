const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'password', // Default docker config
  host: 'localhost',
  database: 'esap_db',
  port: 5432,
});

async function run() {
  await client.connect();
  
  // Insert into terminos_procesales
  const qTerminos = `
    INSERT INTO legal_management.terminos_procesales (
      id, origen_modulo, referencia_id, numero_radicado, nombre_actuacion, fecha_base, dias_termino, 
      tipo_dias, fecha_vencimiento, estado, prioridad
    ) VALUES 
    ('11b07384-d113-4a15-bb8a-1a8b10111111', 'DEFENSA_JUDICIAL', 'ref-1', 'T-2026-001', 'Contestación', NOW(), 10, 'HABILES', NOW() + INTERVAL '10 days', 'PENDIENTE', 'ALTA'),
    ('22b07384-d113-4a15-bb8a-1a8b10111112', 'JUZGAMIENTO', 'ref-2', 'T-2026-002', 'Alegatos', NOW(), 5, 'CALENDARIO', NOW() + INTERVAL '5 days', 'PENDIENTE', 'MEDIA')
    ON CONFLICT (id) DO NOTHING;
  `;
  
  try {
    const resTerminos = await client.query(qTerminos);
    console.log('Inserted terminos:', resTerminos.rowCount);
  } catch (e) {
    console.log('Error inserting:', e.message);
  }
  
  await client.end();
}

run().catch(console.error);
