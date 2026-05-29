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

  const res = await client.query(`
    SELECT filename, executed_at 
    FROM auth.migrations_db_log 
    WHERE filename = '324_add_created_at_disciplinary_news.sql';
  `);
  console.log('--- Migration in auth.migrations_db_log ---');
  console.log(res.rows);

  const res2 = await client.query(`
    SELECT filename, executed_at 
    FROM control_disciplinario.migrations_db_log 
    WHERE filename = '324_add_created_at_disciplinary_news.sql';
  `);
  console.log('--- Migration in control_disciplinario.migrations_db_log ---');
  console.log(res2.rows);

  await client.end();
}

run().catch(console.error);
