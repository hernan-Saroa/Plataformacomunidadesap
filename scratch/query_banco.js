const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: 'postgres://postgres:postgres@host.docker.internal:5432/esap_db'
  });
  await c.connect();

  // 1. List all tables in academic_work_plan schema
  const tables = await c.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'academic_work_plan' 
    ORDER BY table_name
  `);
  console.log('=== Tablas en academic_work_plan ===');
  tables.rows.forEach(r => console.log('  -', r.table_name));

  // 2. Count docentes
  const count = await c.query('SELECT count(*) as total FROM academic_work_plan."Docente"');
  console.log('\nTotal docentes:', count.rows[0].total);

  // 3. Check for FK references to Docente
  const fks = await c.query(`
    SELECT 
      tc.table_schema, tc.table_name, kcu.column_name,
      ccu.table_schema AS fk_schema, ccu.table_name AS fk_table, ccu.column_name AS fk_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (ccu.table_name = 'Docente' OR kcu.table_name = 'Docente')
    AND ccu.table_schema = 'academic_work_plan'
  `);
  console.log('\n=== Foreign Keys relacionadas con Docente ===');
  fks.rows.forEach(r => console.log(`  ${r.table_schema}.${r.table_name}.${r.column_name} -> ${r.fk_schema}.${r.fk_table}.${r.fk_column}`));

  await c.end();
}

run().catch(e => console.error(e));
