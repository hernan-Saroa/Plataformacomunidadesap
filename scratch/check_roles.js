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
    const res = await client.query('SELECT id, code, name FROM auth.role;');
    console.log('Roles in auth.role:');
    res.rows.forEach(r => console.log(`- ${r.code}: ${r.name}`));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
