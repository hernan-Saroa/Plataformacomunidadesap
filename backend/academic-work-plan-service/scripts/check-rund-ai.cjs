// Diagnostico de solo lectura. No cargar Nest/AppModule: iniciaria el worker OCR.
const { Client } = require('pg');

async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error('Motor RUND no disponible.');
  return response.json();
}
async function check(env = process.env, dependencies = {}) {
  if (env.RUND_OCR_ENABLED !== 'true' || env.RUND_OCR_PROVIDER !== 'RUND' || env.RUND_OLLAMA_MODEL !== 'gemma4:e4b')
    throw new Error('Se requiere RUND habilitado con proveedor RUND y Gemma gemma4:e4b.');
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME || (env.DB_PORT && (!/^\d+$/.test(env.DB_PORT) || +env.DB_PORT < 1 || +env.DB_PORT > 65535)))
    throw new Error('Falta configuracion valida de BD para el diagnostico RUND.');
  const { localExtractionUrl } = require('../dist/pta/banco-docentes/rund-extraccion.service.js');
  const ocr = localExtractionUrl(env.RUND_OCR_URL);
  const ollama = localExtractionUrl(env.RUND_OLLAMA_URL);
  const [health, tags] = await Promise.all([json(`${ocr}/health`), json(`${ollama}/api/tags`)]);
  if (health.status !== 'healthy' || health.service !== 'rund-ocr') throw new Error('El motor no coincide con el contrato RUND esperado.');
  if (!tags.models?.some(model => model.name === env.RUND_OLLAMA_MODEL)) throw new Error('Gemma no esta instalado en el Ollama de RUND.');
  const DatabaseClient = dependencies.Client || Client;
  const db = new DatabaseClient({ host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER,
    password: env.DB_PASS, database: env.DB_NAME, connectionTimeoutMillis: 10000, query_timeout: 10000 });
  try {
    await db.connect();
    await db.query('BEGIN READ ONLY');
    const { rows } = await db.query(`SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema='academic_work_plan' AND table_name=ANY($1::text[])`,
    [['RundDocumentoPerfil', 'RundExtraccionTrabajo', 'RundExtraccionSugerencia']]);
    const required = {
      RundDocumentoPerfil: ['id', 'docente_id', 'estado'],
      RundExtraccionTrabajo: ['id', 'etapa', 'etapa_desde', 'iniciado_en', 'notificacion_id', 'notificado_en', 'notificacion_proxima', 'lease_id', 'lease_hasta'],
      RundExtraccionSugerencia: ['id', 'trabajo_id', 'campo', 'valor', 'estado'],
    };
    for (const [table, columns] of Object.entries(required)) for (const column of columns) {
      if (!rows.some(row => row.table_name === table && row.column_name === column))
        throw new Error('Faltan tablas o columnas RUND. Revise las migraciones RUND 422, 656 y 657 por nombre completo.');
    }
    await db.query('ROLLBACK');
  } finally { await db.end().catch(() => {}); }
  console.log('RUND OK: contrato OCR, Gemma instalado, red desde PTA y esquema de extraccion. Sin procesar documentos.');
}
if (require.main === module) check().catch(error => {
  // No imprimir cuerpos de servicios, credenciales, documentos ni cadenas de conexion.
  const known = /^(Se requiere|El motor|Gemma no|Faltan tablas|Falta configuracion|Motor RUND)/.test(error.message || '');
  console.error(known ? error.message : 'RUND: fallo de conexion o configuracion. Revise red, BD y motores.');
  process.exitCode = 1;
});
module.exports = { check };
