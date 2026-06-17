const { Client } = require('pg');
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'esap_db',
  password: 'postgres',
  port: 5432
});

client.connect().then(async () => {
  try {
    let res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'academic_work_plan' AND table_name = 'asignatura'`);
    console.log('asignatura columns:', res.rows.map(r => r.column_name).join(', '));
    res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'academic_work_plan' AND table_name = 'programa'`);
    console.log('programa columns:', res.rows.map(r => r.column_name).join(', '));
  } finally {
    client.end();
  }
});
