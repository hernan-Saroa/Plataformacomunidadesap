const { Client } = require('pg');

async function fix() {
  const c = new Client({host:'localhost', port:5432, user:'postgres', password:'postgres', database:'esap_db'});
  await c.connect();
  
  const r = await c.query("SELECT permissions FROM auth.users u JOIN auth.personas p ON u.person_id = p.id_person WHERE p.email = 'subdirector.administrativo@esap.edu.co'");
  console.log(JSON.stringify(r.rows, null, 2));
  
  await c.end();
}
fix();
