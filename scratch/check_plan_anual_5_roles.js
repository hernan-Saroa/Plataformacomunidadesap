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
    
    // Check columns of control_interno.plan_anual_5_roles
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'control_interno' AND table_name = 'plan_anual_5_roles';
    `);
    console.log('Columns of control_interno.plan_anual_5_roles:');
    columns.rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`));
    
    // Check constraints of control_interno.plan_anual_5_roles
    const constraints = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'control_interno.plan_anual_5_roles'::regclass;
    `);
    console.log('\nConstraints of control_interno.plan_anual_5_roles:');
    constraints.rows.forEach(c => console.log(`- ${c.conname}: ${c.contype}`));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
