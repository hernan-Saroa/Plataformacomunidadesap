const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  const r1 = await c.query("SELECT * FROM auth.role");
  console.log('Roles:', r1.rows);
  
  await c.end();
}
fix();
