const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });

  await client.connect();
  console.log('Connected to database.');

  console.log('Altering internal_disciplinary_control.disciplinary_news...');
  await client.query(`
    ALTER TABLE internal_disciplinary_control.disciplinary_news
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);
  console.log('✓ Column created_at added/verified in internal_disciplinary_control.disciplinary_news');

  console.log('Updating existing records if any...');
  await client.query(`
    UPDATE internal_disciplinary_control.disciplinary_news
    SET created_at = updatedAt
    WHERE created_at IS NULL;
  `);
  console.log('✓ Updated existing records.');

  await client.end();
}

run().catch(console.error);
