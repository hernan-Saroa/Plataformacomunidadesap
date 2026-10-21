// Inventario de solo lectura. No migra, elimina, reclasifica ni carga documentos.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { root, localConfig, clientForLocal, reportError } = require('./rund-documental/local-context.cjs');
const { inspectDocument, summarize } = require('./rund-documental/inventory.cjs');

(async () => {
  if (process.argv.length !== 2) throw new Error('NO_OPTIONS_SUPPORTED');
  const config = localConfig();
  const client = clientForLocal();
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const rows = (await client.query(`SELECT id, proveedor_almacenamiento, almacenamiento_ruta,
      checksum_sha256, tamano_bytes, estado, categoria_codigo
      FROM academic_work_plan."RundDocumentoPerfil" ORDER BY id`)).rows;
    const legacy = (await client.query(`SELECT count(*)::int AS supportsWithoutDocument
      FROM academic_work_plan."RundSoporteCampo"
      WHERE documento_carpeta_id IS NOT NULL AND documento_perfil_id IS NULL`)).rows[0];
    const hasFolder = (await client.query("SELECT to_regclass('auth.documento_carpeta_digital') IS NOT NULL AS present")).rows[0].present;
    const folder = hasFolder ? (await client.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE url_archivo LIKE '/auth/api/v1/uploads/%')::int AS authLocalReferences,
      count(*) FILTER (WHERE url_archivo LIKE '/pta/api/v1/%')::int AS ptaReferences
      FROM auth.documento_carpeta_digital WHERE rund_soporte_id IS NOT NULL OR LOWER(categoria) = 'rund'`)).rows[0] : { unavailable: true };
    await client.query('ROLLBACK');
    const documents = [];
    for (const row of rows) documents.push(await inspectDocument(row, {
      pta: path.join(root, 'backend/academic-work-plan-service/uploads'),
      auth: path.join(root, 'backend/auth-service/uploads'),
    }));
    const summary = { ...summarize(documents), legacy, folder,
      openKmConfigured: config.openKmConfigured, openKmCredentialsPresent: config.openKmCredentialsPresent,
      databaseReadOnly: true, filesModified: false };
    const reportDir = path.join(root, 'tmp/rund-documental');
    await fs.mkdir(reportDir, { recursive: true });
    const report = path.join(reportDir, `inventory-${randomUUID()}.json`);
    await fs.writeFile(report, JSON.stringify({ generatedAt: new Date().toISOString(), summary, documents }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ ...summary, report: path.relative(root, report).replaceAll('\\', '/') }, null, 2));
  } finally { await client.end(); }
})().catch(reportError);
