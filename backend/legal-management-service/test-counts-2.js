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
  const q = 'SELECT count(*) FROM legal_management.correos_juridicos';
  try {
    const res = await client.query(q);
    console.log(q, '->', res.rows[0].count);
  } catch (e) {
    console.log(q, '->', e.message);
  }
  await client.end();
}

run().catch(console.error);
