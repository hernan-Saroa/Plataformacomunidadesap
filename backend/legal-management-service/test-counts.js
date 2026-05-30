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
    'SELECT count(*) FROM legal_management.decisiones_disciplinarias',
    'SELECT count(*) FROM legal_management.consultas_juridicas',
    'SELECT count(*) FROM legal_management.requerimientos_oc',
    'SELECT count(*) FROM legal_management.documentos',
  ];
  for (const q of queries) {
    try {
      const res = await client.query(q);
      console.log(q, '->', res.rows[0].count);
    } catch (e) {
      console.log(q, '->', e.message);
    }
  }
  await client.end();
}

run().catch(console.error);
