const { Client } = require('pg');

async function checkData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'esap_db'
  });

  await client.connect();
  
  try {
    const sec = await client.query(`SELECT id_seccional, cod_seccional, nom_seccional FROM auth.seccionales LIMIT 5;`);
    console.log('auth.seccionales:', sec.rows);

    const dt = await client.query(`SELECT id, codigo, nombre FROM academic_work_plan.direccion_territorial LIMIT 5;`);
    console.log('academic_work_plan.direccion_territorial:', dt.rows);

    const sedes = await client.query(`SELECT id_sede, cod_sede, nom_sede, id_seccional, sede_act FROM auth.sedes LIMIT 5;`);
    console.log('auth.sedes:', sedes.rows);

    const cetaps = await client.query(`SELECT id, codigo, nombre, id_direccion_territorial, activo FROM academic_work_plan.cetap LIMIT 5;`);
    console.log('academic_work_plan.cetap:', cetaps.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkData();
