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
  
  const queries = [
    `ALTER TABLE academic_work_plan."AprobacionJefatura" DROP CONSTRAINT IF EXISTS "AprobacionJefatura_ptaId_fkey";`,
    `ALTER TABLE academic_work_plan."Concertacion" DROP CONSTRAINT IF EXISTS "Concertacion_ptaId_fkey";`,
    `ALTER TABLE academic_work_plan."DetallesPta" DROP CONSTRAINT IF EXISTS "DetallesPta_ptaId_fkey";`,
    `ALTER TABLE academic_work_plan."HistorialEstadoPTA" DROP CONSTRAINT IF EXISTS "HistorialEstadoPTA_ptaId_fkey";`,
    `ALTER TABLE academic_work_plan."PtaEvidencia" DROP CONSTRAINT IF EXISTS "PtaEvidencia_ptaId_fkey";`,
    `ALTER TABLE academic_work_plan."PtaEvento" DROP CONSTRAINT IF EXISTS "PtaEvento_ptaId_fkey";`
  ];
  
  for (const q of queries) {
    try {
      console.log('Executing:', q);
      await client.query(q);
      console.log('Success');
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  
  await client.end();
}

run().catch(console.error);
