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
    
    // Delete entries starting with '3'
    const res = await client.query(`
      DELETE FROM auth.migrations_db_log WHERE filename LIKE '3%';
    `);
    console.log(`Deleted ${res.rowCount} log entries starting with '3' from Docker DB.`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
