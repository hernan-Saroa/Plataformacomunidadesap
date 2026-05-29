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

  const schemas = ['control_disciplinario', 'internal_disciplinary_control'];

  for (const schema of schemas) {
    console.log(`\n=== Checking Schema: ${schema} ===`);
    try {
      const newsCount = await client.query(`SELECT COUNT(*) FROM ${schema}.disciplinary_news`);
      console.log(`disciplinary_news count:`, newsCount.rows[0].count);
    } catch (e) {
      console.log(`disciplinary_news check failed:`, e.message);
    }

    try {
      const procCount = await client.query(`SELECT COUNT(*) FROM ${schema}.disciplinary_processes`);
      console.log(`disciplinary_processes count:`, procCount.rows[0].count);
    } catch (e) {
      console.log(`disciplinary_processes check failed:`, e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
