const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 8080,
  user: 'postgres',
  password: 'password',
  database: 'esap_db',
});

const DB_SCHEMA = 'auth';

async function run() {
  try {
    await client.connect();
    console.log('Connected to Docker DB on port 8080.');

    // Ensure schema and log table exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA};`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${DB_SCHEMA}.migrations_db_log (
        filename TEXT PRIMARY KEY,
        executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
      );
    `);

    // Get applied migrations from Docker DB
    const { rows } = await client.query(`SELECT filename FROM ${DB_SCHEMA}.migrations_db_log;`);
    const applied = new Set(rows.map(r => r.filename));
    console.log(`Found ${applied.size} migrations recorded as applied in Docker DB.`);

    const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found at: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql'))
      .map(f => path.join(migrationsDir, f))
      .sort();

    console.log(`Found ${sqlFiles.length} migration files in db/migrations/.`);

    let executedCount = 0;
    let skippedCount = 0;
    let ignoredErrorsCount = 0;

    for (const file of sqlFiles) {
      const filename = path.basename(file);

      // If it is in the log, skip it
      if (applied.has(filename)) {
        skippedCount++;
        continue;
      }

      console.log(`Running migration: ${filename}...`);
      const sql = fs.readFileSync(file, 'utf8');

      try {
        // Run SQL
        await client.query(sql);
        
        // Log to migrations_db_log
        await client.query(
          `INSERT INTO ${DB_SCHEMA}.migrations_db_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING;`,
          [filename]
        );
        console.log(`  ✓ OK`);
        executedCount++;
      } catch (err) {
        try {
          await client.query('ROLLBACK;');
        } catch (rollbackErr) {
          // ignore rollback errors
        }

        // Check if error is due to duplicate/already existing structure
        const isDuplicate = 
          err.code === '42P07' || // duplicate_table / index
          err.code === '42701' || // duplicate_column
          err.code === '42710' || // duplicate_object (constraint, trigger, type, etc.)
          err.code === '42P16' || // invalid_table_definition (duplicate constraint)
          err.code === '23505' || // unique_violation (duplicate value)
          err.code === '42804' || // datatype_mismatch (already converted schema)
          err.message.includes('already exists') ||
          err.message.includes('duplicate');

        if (isDuplicate) {
          console.warn(`  ⚠️ Ignored duplicate error: "${err.message}" (marking migration as applied)`);
          await client.query(
            `INSERT INTO ${DB_SCHEMA}.migrations_db_log (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING;`,
            [filename]
          );
          ignoredErrorsCount++;
          executedCount++;
        } else {
          console.error(`  ✗ CRITICAL ERROR in ${filename}:`, err.message);
          throw err; // Stop on any other error
        }
      }
    }

    console.log('\n========================================');
    console.log(`Migrations run completed.`);
    console.log(`  Skipped (already recorded): ${skippedCount}`);
    console.log(`  Executed successfully: ${executedCount} (including ${ignoredErrorsCount} with duplicate warnings)`);
    console.log('========================================');

  } catch (err) {
    console.error('\n========================================');
    console.error('Critical failure running migrations:', err.message);
    console.error('========================================');
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
