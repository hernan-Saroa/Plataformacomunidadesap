const { Client } = require('../backend/academic-work-plan-service/node_modules/pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db',
  });

  await client.connect();
  try {
    // 1. Obtener el docente Abel
    const docenteRes = await client.query(`
      SELECT d.id, p.nom_largo, p.num_identificacion
      FROM academic_work_plan."Docente" d
      JOIN auth.personas p ON p.id_person::text = d."personaId"::text
      WHERE p.nom_largo ILIKE '%ABEL%'
      LIMIT 1
    `);
    
    console.log('--- DOCENTE ---');
    console.log(docenteRes.rows);
    if (docenteRes.rows.length === 0) {
      console.log('No se encontró al docente Abel.');
      return;
    }
    const docenteId = docenteRes.rows[0].id;

    // 2. Obtener soportes de Abel
    const soportesRes = await client.query(`
      SELECT id, bloque, tipo_soporte, documento_carpeta_id, nombre_archivo, estado, "createdAt"
      FROM academic_work_plan."RundSoporteCampo"
      WHERE docente_id = $1
      ORDER BY "createdAt" DESC
    `, [docenteId]);

    console.log('\n--- SOPORTES EN RundSoporteCampo ---');
    console.log(soportesRes.rows);

    // 3. Obtener estados de bloques
    const bloquesRes = await client.query(`
      SELECT id, bloque, estado, revisado_por, observacion
      FROM academic_work_plan."RundCampoEstado"
      WHERE docente_id = $1
    `, [docenteId]);

    console.log('\n--- ESTADOS DE BLOQUES ---');
    console.log(bloquesRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
