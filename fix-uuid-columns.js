const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load env vars
const envPath = path.join(__dirname, 'backend', 'auth-service', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  });
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || 'postgres';
const DB_NAME = process.env.DB_NAME || 'esap_db';

const client = new Client({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to DB...');

    // Drop geopolitica and seccional FK constraints on auth.sedes
    await client.query(`
      ALTER TABLE auth.sedes DROP CONSTRAINT IF EXISTS fk_sedes_geopolitica;
    `);
    await client.query(`
      ALTER TABLE auth.sedes DROP CONSTRAINT IF EXISTS fk_sedes_seccional;
    `);
    console.log('Dropped constraints on auth.sedes.');

    // Alter column types to prevent value too long error
    await client.query(`
      ALTER TABLE auth.seccionales ALTER COLUMN cod_seccional TYPE varchar(20);
    `);
    await client.query(`
      ALTER TABLE auth.sedes ALTER COLUMN cod_sede TYPE varchar(20);
    `);
    console.log('Altered auth columns to varchar(20) successfully.');

    // Skip obsolete seed files
    await client.query(`
      INSERT INTO auth.migrations_db_log (filename) 
      VALUES ('216_seed_programas_asignaturas_esap.sql') 
      ON CONFLICT (filename) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO auth.migrations_db_log (filename) 
      VALUES ('217_seed_docentes_reales_auth.sql') 
      ON CONFLICT (filename) DO NOTHING;
    `);
    console.log('Marked 216 and 217 seed migrations as applied.');

    console.log('Querying constraints involving Territorial or Sede...');
    const constraintQuery = `
      SELECT 
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (ccu.table_name IN ('Territorial', 'Sede') OR tc.table_name IN ('Territorial', 'Sede'));
    `;

    const { rows: constraints } = await client.query(constraintQuery);
    console.log(`Found ${constraints.length} constraints to drop temporarily.`);

    // Drop all constraints
    for (const c of constraints) {
      console.log(`Dropping constraint ${c.constraint_name} on table ${c.table_schema}."${c.table_name}"...`);
      await client.query(`
        ALTER TABLE "${c.table_schema}"."${c.table_name}" 
        DROP CONSTRAINT IF EXISTS "${c.constraint_name}";
      `);
    }

    // Alter column types in Territorial and Sede
    console.log('Altering primary key and foreign key columns to type text...');
    await client.query(`
      ALTER TABLE academic_work_plan."Territorial" ALTER COLUMN "id" TYPE text;
    `);
    await client.query(`
      ALTER TABLE academic_work_plan."Sede" ALTER COLUMN "id" TYPE text;
    `);
    await client.query(`
      ALTER TABLE academic_work_plan."Sede" ALTER COLUMN "territorialId" TYPE text;
    `);

    // Alter columns in other tables that referenced Territorial or Sede
    const columnsToAlter = new Set();
    for (const c of constraints) {
      if (c.table_name !== 'Territorial' && c.table_name !== 'Sede') {
        columnsToAlter.add(JSON.stringify({ schema: c.table_schema, table: c.table_name, column: c.column_name }));
      }
    }

    for (const entryStr of columnsToAlter) {
      const entry = JSON.parse(entryStr);
      console.log(`Altering referencing column ${entry.schema}."${entry.table}"."${entry.column}" to type text...`);
      await client.query(`
        ALTER TABLE "${entry.schema}"."${entry.table}" ALTER COLUMN "${entry.column}" TYPE text;
      `);
    }

    // Recreate constraints
    console.log('Recreating constraints...');
    for (const c of constraints) {
      console.log(`Recreating constraint ${c.constraint_name} on table ${c.table_schema}."${c.table_name}"...`);
      await client.query(`
        ALTER TABLE "${c.table_schema}"."${c.table_name}"
        ADD CONSTRAINT "${c.constraint_name}"
        FOREIGN KEY ("${c.column_name}")
        REFERENCES "${c.foreign_table_schema}"."${c.foreign_table_name}" ("${c.foreign_column_name}");
      `);
    }

    console.log('Successfully resolved schema type, size and geopolitica/seccional mismatches!');
  } catch (err) {
    console.error('Error during repair:', err.message);
  } finally {
    await client.end();
  }
}

main();
