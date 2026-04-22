const { Client } = require('pg');

async function check() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  const res = await c.query("SELECT * FROM auth.role WHERE name ILIKE '%aprobador%'");
  console.table(res.rows);
  await c.end();
}
check();
