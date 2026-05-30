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
  
  const query = `
    INSERT INTO legal_management.expedientes (
      id, radicado, tipo_proceso, jurisdiccion, etapa_procesal, demandante, demandado, 
      estado_archivo, created_at, updated_at
    ) VALUES 
    ('e1b07384-d113-4a15-bb8a-1a8b10111111', 'JD-2026-0001', 'Ordinario', 'DISCIPLINARIO', 'E1_AVOCAMIENTO', 'Control Interno', 'ESAP', 'ACTIVO', NOW(), NOW()),
    ('e2b07384-d113-4a15-bb8a-1a8b10111112', 'JD-2026-0002', 'Ordinario', 'DISCIPLINARIO', 'E2_DESCARGOS', 'Control Interno', 'ESAP', 'ACTIVO', NOW(), NOW()),
    ('e3b07384-d113-4a15-bb8a-1a8b10111113', 'JD-2026-0003', 'Ordinario', 'DISCIPLINARIO', 'E3_PRUEBAS', 'Control Interno', 'ESAP', 'ACTIVO', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `;
  
  const res = await client.query(query);
  console.log('Inserted rows for Juzgamiento:', res.rowCount);
  await client.end();
}

run().catch(console.error);
