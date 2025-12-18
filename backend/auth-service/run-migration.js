const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'esap_db',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sqlFile = path.join(__dirname, 'migrations', '001-create-estructura-organizacional.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running migration: 001-create-estructura-organizacional.sql');
    await client.query(sql);

    console.log('✓ Migration completed successfully');
    console.log('✓ Tables created:');
    console.log('  - auth.unidades_organizacionales');
    console.log('  - auth.asignaciones_usuario_estructura');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
