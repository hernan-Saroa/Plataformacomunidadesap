const { Client } = require('pg');
async function run() {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'esap_db' });
  await client.connect();
  const res = await client.query('SELECT u.username, p.nom_largo, p.num_identificacion FROM auth.personas p JOIN auth.\"user\" u ON p.id_person = u.id_person LIMIT 20;');
  console.log(res.rows);
  await client.end();
}
run();
