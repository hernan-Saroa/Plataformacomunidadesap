const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 8080,
  user: 'postgres',
  password: 'password',
  database: 'esap_db',
});

async function run() {
  try {
    await client.connect();
    const { rows } = await client.query('SELECT filename FROM auth.migrations_db_log;');
    console.log('Count of rows:', rows.length);
    console.log('Rows:', rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
