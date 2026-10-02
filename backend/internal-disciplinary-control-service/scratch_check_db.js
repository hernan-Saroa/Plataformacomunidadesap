const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'plataforma_comunidades',
});

async function run() {
  await client.connect();
  const idToCheck = '069031d5-1081-4553-a99d-d3bb37aa009c';
  const procId = '78820359-3157-43a5-8cc6-74f870bfcd71';

  const resAuto = await client.query('SELECT id, estado, tipo, numero, "documentName", "documentUrl" FROM internal_disciplinary_control.legal_autos WHERE id = $1', [idToCheck]);
  console.log('ID match in legal_autos:', resAuto.rows);

  const resEvid = await client.query('SELECT id, "tipoDocumento", filename, "nombreDocumento" FROM internal_disciplinary_control.evidence WHERE id = $1', [idToCheck]);
  console.log('ID match in evidence:', resEvid.rows);

  const resProc = await client.query('SELECT id, estado, tipo, numero, "documentName", "documentUrl" FROM internal_disciplinary_control.legal_autos WHERE "processId" = $1', [procId]);
  console.log('Autos in process:', resProc.rows);

  const resProcEvid = await client.query('SELECT id, "tipoDocumento", filename, "nombreDocumento" FROM internal_disciplinary_control.evidence WHERE "processId" = $1', [procId]);
  console.log('Evidence in process:', resProcEvid.rows);

  await client.end();
}

run().catch(console.error);
