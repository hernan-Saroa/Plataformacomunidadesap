const { Client } = require('pg');

async function check() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'role_permissions'");
  console.log(r.rows);
  
  await c.end();
}
check();
