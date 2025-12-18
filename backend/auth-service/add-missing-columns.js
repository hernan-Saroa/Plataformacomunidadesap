const { Client } = require('pg');
require('dotenv').config();

async function addMissingColumns() {
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

    const columns = [
      'ALTER TABLE auth.unidades_organizacionales ADD COLUMN IF NOT EXISTS permite_inscripciones BOOLEAN DEFAULT true;',
      'ALTER TABLE auth.unidades_organizacionales ADD COLUMN IF NOT EXISTS permite_matriculas BOOLEAN DEFAULT true;',
      'ALTER TABLE auth.unidades_organizacionales ADD COLUMN IF NOT EXISTS visible_portal BOOLEAN DEFAULT true;',
      'ALTER TABLE auth.unidades_organizacionales ADD COLUMN IF NOT EXISTS capacidad_docentes INTEGER;',
      'ALTER TABLE auth.unidades_organizacionales ADD COLUMN IF NOT EXISTS observaciones TEXT;',
    ];

    for (const sql of columns) {
      await client.query(sql);
      console.log('✓ Executed:', sql.substring(0, 80) + '...');
    }

    console.log('✓ All missing columns added successfully');
  } catch (error) {
    console.error('✗ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addMissingColumns();
