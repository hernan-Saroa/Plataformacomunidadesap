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
  const res = await client.query(`
    UPDATE legal_management.expedientes 
    SET tipo_proceso = 'Reparación Directa', jurisdiccion = 'Contencioso Administrativo'
    WHERE tipo_proceso = 'Ordinario'
  `);
  console.log('Updated rows:', res.rowCount);
  await client.end();
}

run().catch(console.error);
