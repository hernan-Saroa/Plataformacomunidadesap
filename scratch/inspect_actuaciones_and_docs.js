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

  const radicado = '15454114545445214565621';

  // Find expediente
  const expRes = await client.query(`
    SELECT id, radicado, estado, etapa_procesal 
    FROM legal_management.expedientes 
    WHERE radicado = $1 OR id::text = $1;
  `, [radicado]);

  console.log('--- Expediente found ---');
  console.log(JSON.stringify(expRes.rows, null, 2));

  if (expRes.rows.length > 0) {
    const expId = expRes.rows[0].id;

    // Get all actuaciones
    const actRes = await client.query(`
      SELECT id, expediente_id, descripcion, tipo_actuacion, documento_nombre, usuario_responsable, origen, metadata 
      FROM legal_management.actuaciones 
      WHERE expediente_id = $1 OR expediente_id = $2;
    `, [expId, radicado]);

    console.log(`--- Actuaciones for ${radicado} (${actRes.rows.length}) ---`);
    console.log(JSON.stringify(actRes.rows, null, 2));

    // Get all documents
    const docRes = await client.query(`
      SELECT id, nombre, tipo, descripcion, subido_por, categoria, etapa 
      FROM legal_management.documentos 
      WHERE expediente_id = $1;
    `, [expId]);

    console.log(`--- Documents for ${radicado} (${docRes.rows.length}) ---`);
    console.log(JSON.stringify(docRes.rows, null, 2));
  } else {
    // If not found by radicado, query last 10 actuaciones
    const actRes = await client.query(`
      SELECT id, expediente_id, descripcion, tipo_actuacion, documento_nombre, usuario_responsable, origen, metadata 
      FROM legal_management.actuaciones 
      ORDER BY created_at DESC LIMIT 10;
    `);
    console.log('--- Last 10 Actuaciones ---');
    console.log(JSON.stringify(actRes.rows, null, 2));
  }

  await client.end();
}

run().catch(console.error);
