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

    const docenteId = 'd7bf55f7-bc45-4a67-b092-0104e4e28e7f';

    // 1. Query RundCampoEstado for Abel
    const camposRes = await client.query(`
      SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1
    `, [docenteId]);
    console.log('\n--- RUND CAMPO ESTADO FOR ABEL ---');
    console.log(camposRes.rows);

    // 2. Query RundSoporteCampo for Abel
    const soportesRes = await client.query(`
      SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1
    `, [docenteId]);
    console.log('\n--- RUND SOPORTE CAMPO FOR ABEL ---');
    console.log(soportesRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
