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
    
    // Check all indexes on control_interno.plan_anual_5_roles
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'control_interno' AND tablename = 'plan_anual_5_roles';
    `);
    console.log('Indexes on control_interno.plan_anual_5_roles:');
    indexes.rows.forEach(i => console.log(`- ${i.indexname}: ${i.indexdef}`));

    // Check all constraints from information_schema
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'control_interno' AND table_name = 'plan_anual_5_roles';
    `);
    console.log('\nTable constraints:');
    constraints.rows.forEach(c => console.log(`- ${c.constraint_name}: ${c.constraint_type}`));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
