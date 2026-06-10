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
  const q = "SELECT column_name FROM information_schema.columns WHERE table_schema = 'legal_management' AND table_name = 'terminos_procesales';";
  try {
    const res = await client.query(q);
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.log('Error:', e.message);
  }
  await client.end();
}

run().catch(console.error);
