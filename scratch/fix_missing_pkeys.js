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
    console.log('Connected to Docker DB.');

    // Query tables in control_interno that do not have a primary key
    const tablesWithoutPk = await client.query(`
      SELECT t.table_name 
      FROM information_schema.tables t 
      WHERE t.table_schema = 'control_interno' 
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
          SELECT 1 
          FROM information_schema.table_constraints tc 
          WHERE tc.table_schema = t.table_schema 
            AND tc.table_name = t.table_name 
            AND tc.constraint_type = 'PRIMARY KEY'
        );
    `);

    console.log('Tables in control_interno without a Primary Key:', tablesWithoutPk.rows.map(r => r.table_name));

    for (const row of tablesWithoutPk.rows) {
      const tableName = row.table_name;
      // We assume the PK column is named 'id' (which is the standard in this project)
      try {
        console.log(`Adding primary key constraint to control_interno.${tableName}(id)...`);
        await client.query(`
          ALTER TABLE control_interno."${tableName}" 
          ADD CONSTRAINT "${tableName}_pkey" PRIMARY KEY (id);
        `);
        console.log(`  ✓ Success`);
      } catch (err) {
        console.error(`  ✗ Failed to add PK to ${tableName}:`, err.message);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
