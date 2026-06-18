const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  try {
    await client.connect();
    console.log('Connected.');

    const tables = [
      'Docente',
      'Persona',
      'RundCampoEstado',
      'RundSoporteCampo',
      'RundAprobacionLog',
      'Usuario',
      'PTAUserData',
      'PlanTrabajoAcademico'
    ];

    for (const t of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM academic_work_plan."${t}"`).catch(e => ({ error: e.message }));
      console.log(`Table ${t} count:`, res.rows ? res.rows[0].count : res.error);
    }

    // Print all columns in Persona
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'academic_work_plan' AND table_name = 'Persona'
    `);
    console.log('\n--- Persona Columns ---');
    console.log(cols.rows.map(c => `${c.column_name}: ${c.data_type}`));

    // Print some Docente records with their fields
    const docentes = await client.query(`
      SELECT * FROM academic_work_plan."Docente" LIMIT 2
    `);
    console.log('\n--- Sample Docentes ---');
    console.log(docentes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
