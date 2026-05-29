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

  const res1 = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'internal_disciplinary_control';
  `);
  console.log('--- Tables in internal_disciplinary_control ---');
  console.log(res1.rows.map(r => r.table_name).sort());

  const res2 = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'control_disciplinario';
  `);
  console.log('--- Tables in control_disciplinario ---');
  console.log(res2.rows.map(r => r.table_name).sort());

  await client.end();
}

run().catch(console.error);
