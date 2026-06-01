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
    
    // Find all schemas
    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    console.log('Schemas in database:', schemas.rows.map(r => r.schema_name));

    // Find all tables named migrations_db_log
    const tables = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'migrations_db_log';
    `);
    console.log('\nTables named migrations_db_log:', tables.rows);

    for (const t of tables.rows) {
      const rows = await client.query(`
        SELECT filename, executed_at FROM ${t.table_schema}.${t.table_name};
      `);
      console.log(`\nContent of ${t.table_schema}.${t.table_name} (Count: ${rows.rows.length}):`);
      rows.rows.forEach(r => {
        if (r.filename.includes('319')) {
          console.log(`  - [MATCH] ${r.filename} executed at ${r.executed_at}`);
        }
      });
      // Print first 5 and last 5
      console.log('First 3:');
      console.log(rows.rows.slice(0, 3));
      console.log('Last 3:');
      console.log(rows.rows.slice(-3));
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
