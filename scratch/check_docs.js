const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });
  
  try {
    await client.connect();
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'legal_management' AND table_name = 'documentos_consulta';
    `);
    console.log('Columns:');
    console.log(cols.rows.map(c => `${c.column_name}: ${c.data_type}`).join('\n'));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
