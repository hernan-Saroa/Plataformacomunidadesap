const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'esap_db',
});

async function run() {
  try {
    await client.connect();
    const { rows } = await client.query('SELECT filename FROM auth.migrations_db_log;');
    console.log('Count of rows on host:', rows.length);
  } catch (err) {
    console.error('Host connection failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
