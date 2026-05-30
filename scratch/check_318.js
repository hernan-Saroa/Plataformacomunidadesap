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
    
    // Check columns of control_interno.rol_plan_anual_5
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'rol_plan_anual_5';
    `);
    console.log('Columns of control_interno.rol_plan_anual_5:');
    columns.rows.forEach(r => console.log(`- ${r.column_name}`));
    
    // Check if es_otro_delito_penal exists in legal_management.expedientes
    const columnsExp = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'legal_management' AND table_name = 'expedientes' AND column_name = 'es_otro_delito_penal';
    `);
    console.log('es_otro_delito_penal exists:', columnsExp.rows.length > 0);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
