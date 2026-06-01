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
  console.log('Connected to DB.');

  // List all tables in legal_management schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'legal_management';
  `);
  console.log('--- Tables in legal_management ---');
  console.table(tablesRes.rows);

  // List all columns in legal_management.actuaciones
  const actCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'legal_management' AND table_name = 'actuaciones';
  `);
  console.log('--- Columns of actuaciones ---');
  console.table(actCols.rows);

  // List all columns in legal_management.documentos
  const docCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'legal_management' AND table_name = 'documentos';
  `);
  console.log('--- Columns of documentos ---');
  console.table(docCols.rows);

  await client.end();
}

run().catch(console.error);
