const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });

  await client.connect();

  try {
    const res = await client.query(`
      SELECT s.id, s.docente_id, s.bloque, s.tipo_soporte, s.documento_carpeta_id, s.nombre_archivo
      FROM academic_work_plan."RundSoporteCampo" s
      ORDER BY s."createdAt" DESC
    `);
    
    console.log('--- ALL SOPORTES IN DB ---');
    console.log(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
