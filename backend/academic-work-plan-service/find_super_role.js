const { Client } = require('pg');

async function findSuperRole() {
  const client = new Client({
    connectionString: 'postgres://postgres:postgres@localhost:5432/esap_db'
  });
  await client.connect();
  
  try {
    const res = await client.query(`SELECT id, code, name FROM auth.role WHERE code LIKE '%ADMIN%'`);
    console.log('Admin roles:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

findSuperRole();
