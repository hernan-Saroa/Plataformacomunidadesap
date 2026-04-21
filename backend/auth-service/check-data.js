const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  const r = await c.query("SELECT id, estado, equipo_aprobacion FROM control_interno.plan_anual_5_roles ORDER BY created_at DESC LIMIT 1");
  console.log(JSON.stringify(r.rows, null, 2));
  
  await c.end();
}
fix();
