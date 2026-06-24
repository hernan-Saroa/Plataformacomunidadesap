const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    const res = await client.query('SHOW data_directory;');
    console.log('Data Directory:', res.rows[0].data_directory);

    const logRes = await client.query(`
      SELECT name, setting FROM pg_settings WHERE name LIKE '%log%';
    `);
    console.log('--- LOG SETTINGS ---');
    console.log(JSON.stringify(logRes.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
