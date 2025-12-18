const { Client } = require('pg');
require('dotenv').config();

async function addColumn() {
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

    await client.query('ALTER TABLE auth.unidades_organizacionales ADD COLUMN IF NOT EXISTS nombre_corto VARCHAR(100);');
    console.log('✓ Column nombre_corto added successfully');
  } catch (error) {
    console.error('✗ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addColumn();
