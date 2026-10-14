// Catálogos, agregados e historial. Nunca devuelve filas de personas/documentos ni secretos.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const yaml = require('js-yaml');
const environments = ['local', 'dev', 'qa', 'pre', 'prod'];
const migrationFiles = [
  'db/migrations/158_add_id_person_to_personas_and_user.sql',
  'db/migrations/309_create_auth_carpeta_digital.sql',
  'db/migrations/339_create_documento_carpeta_digital.sql',
  ...['001_create_rund_schema', '002_seed_rund_auth_module', '003_legacy_rund_tables',
    '004_rund_docente_identificadores_text', '005_rund_tarjeta_numero_secuencia',
    '006_rund_catalogo_permisos_compatibles', '007_rund_carpeta_auth_proyeccion']
    .map(name => `backend/rund-service/db/migrations/${name}.sql`),
  'db/migrations/667_auth_carpeta_documento_versiones.sql',
  'db/migrations/668_auth_carpeta_revision_rund.sql',
];
const relations = [
  ['auth', 'personas'], ['auth', 'module'], ['auth', 'permission'],
  ['auth', 'carpeta_digital'], ['auth', 'tipo_documento'], ['auth', 'documento_carpeta_digital'],
  ['auth', 'documento_carpeta_version'], ['auth', 'carpeta_revision_rund'],
  ['rund', 'docente'], ['rund', 'Docente'], ['rund', 'RundCampoEstado'],
  ['rund', 'RundSoporteCampo'], ['rund', 'RundAprobacionLog'], ['rund', 'RundDocumentoPerfil'],
  ['rund', 'RundExtraccionTrabajo'], ['rund', 'RundAccesoDatosLog'],
  ['rund', 'carpeta_auth_sync'], ['rund', 'carpeta_auth_documento'], ['rund', 'carpeta_auth_sync_evento'],
];
// Columnas críticas de las migraciones nuevas; no es una comparación integral del DDL.
const columns = [
  ['auth', 'personas', 'id_person', 'uuid', true],
  ['auth', 'carpeta_digital', 'persona_id', 'uuid', true],
  ['auth', 'documento_carpeta_digital', 'id_documento', 'uuid', true],
  ['auth', 'documento_carpeta_digital', 'carpeta_digital_id', 'uuid', true],
  ['auth', 'documento_carpeta_digital', 'updated_at', 'timestamp without time zone', true],
  ['auth', 'documento_carpeta_version', 'id_version', 'uuid', true],
  ['auth', 'documento_carpeta_version', 'documento_id', 'uuid', true],
  ['auth', 'documento_carpeta_version', 'numero_version', 'integer', true],
  ['auth', 'documento_carpeta_version', 'tamano_bytes', 'bigint', true],
  ['auth', 'documento_carpeta_version', 'checksum_sha256', 'character varying(64)', true],
  ['auth', 'carpeta_revision_rund', 'persona_id', 'uuid', true],
  ['auth', 'carpeta_revision_rund', 'revision', 'bigint', true],
  ['rund', 'Docente', 'id', 'text', true], ['rund', 'Docente', 'personaId', 'uuid', true],
  ['rund', 'Docente', 'periodoCarga', 'text', false],
  ...['RundCampoEstado', 'RundSoporteCampo', 'RundAprobacionLog', 'RundDocumentoPerfil', 'RundExtraccionTrabajo']
    .map(table => ['rund', table, 'docente_id', 'text', table !== 'RundSoporteCampo']),
  ['rund', 'carpeta_auth_sync', 'persona_id', 'uuid', true],
  ['rund', 'carpeta_auth_sync', 'revision', 'bigint', false],
  ['rund', 'carpeta_auth_sync', 'deleted', 'boolean', true],
  ['rund', 'carpeta_auth_documento', 'persona_id', 'uuid', true],
  ['rund', 'carpeta_auth_documento', 'documento_id', 'uuid', true],
  ['rund', 'carpeta_auth_documento', 'metadata', 'jsonb', true],
  ['rund', 'carpeta_auth_sync_evento', 'revision', 'bigint', true],
  ['rund', 'carpeta_auth_sync_evento', 'fingerprint', 'character varying(64)', true],
];
const triggerContracts = [
  ['documento_revision_rund', 'documento_carpeta_digital', 'documento_revision_rund', 29],
  ['carpeta_revision_rund', 'carpeta_digital', 'contenedor_revision_rund', 27],
  ['persona_revision_rund', 'personas', 'contenedor_revision_rund', 15],
];
const permissionCodes = ['rund.view', 'rund.create', 'rund.edit', 'rund.validate', 'rund.admin', 'rund.export',
  ...['manage', 'view', 'edit', 'validate', 'import', 'export', 'invite', 'documents.manage'].map(suffix => `banco-docentes.rund.${suffix}`),
  'pta.macro_docente.consultar', 'pta.macro_docente.gestionar_accesos_externos'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function inventory(root) {
  function file(relative) {
    const full = path.join(root, relative);
    try {
      const stat = fs.lstatSync(full);
      if (!stat.isFile() || stat.isSymbolicLink()) return { file: relative, status: 'not_regular_file' };
      return { file: relative, status: stat.size ? 'present' : 'empty', bytes: stat.size, sha256: hash(fs.readFileSync(full)) };
    } catch (error) { if (error.code === 'ENOENT') return { file: relative, status: 'missing' }; throw error; }
  }
  return {
    artifactScope: 'local-files-only', sourceCorrelationVerified: false,
    limits: ['Presencia/hash no prueba compilación desde las fuentes actuales, exports/chunks completos ni publicación.',
      'Las imágenes son plantillas esperadas; no se consulta GHCR ni se identifica el digest desplegado.'],
    migrations: migrationFiles.map(file),
    localBuildArtifacts: [
      'backend/rund-service/dist/main.js',
      'backend/rund-service/dist/modules/banco-docentes/rund-carpeta-internal.controller.js',
      'backend/rund-service/dist/modules/banco-docentes/rund-auth-state-sync.worker.js',
      'backend/auth-service/dist/main.js',
      'backend/auth-service/dist/carpeta-digital/rund-state-snapshot.controller.js',
      'backend/auth-service/dist/carpeta-digital/carpeta-document-versions.service.js',
      'backend/api-gateway/dist/main.js', 'backend/api-gateway/dist/audit/rund-audit-redaction.js',
      'build/index.html', 'build/remotes/mfe-rund/assets/remoteEntry.js',
      'build/remotes/mfe-gestion-personas/assets/remoteEntry.js',
    ].map(file),
    environments: environments.map(environment => {
      const compose = environment === 'local' ? 'docker-compose.local.yml' : `docker-compose.${environment}.yml`;
      const overlay = environment === 'local' ? null : environment === 'dev' ? 'docker-compose.ghcr.yml' : `docker-compose.${environment}.ghcr.yml`;
      const workflow = environment === 'local' ? null : `.github/workflows/build-backend-${environment}.yml`;
      const image = overlay ? yaml.load(fs.readFileSync(path.join(root, overlay), 'utf8')).services?.['rund-service']?.image : null;
      return { environment, compose, overlay, workflow, expectedRundImageTemplate: image,
        configuredFiles: [compose, overlay, workflow].filter(Boolean).map(file),
        publishedImageDigest: null, publishedArtifactsVerified: false, installationChecked: false };
    }),
  };
}
async function inspectDatabase(client) {
  // Caller provides a dedicated connected client; no connection or .env discovery here.
  const checks = [];
  const add = (id, status, detail = {}) => checks.push({ id, status, ...detail });
  async function probe(id, work) {
    await client.query('SAVEPOINT rund_review_probe');
    try { await work(); }
    catch (error) {
      add(id, 'not_verified', { reason: 'query_failed', sqlState: /^[0-9A-Z]{5}$/.test(error.code || '') ? error.code : null });
      await client.query('ROLLBACK TO SAVEPOINT rund_review_probe');
    }
    await client.query('RELEASE SAVEPOINT rund_review_probe');
  }
  let opened = false;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); opened = true;
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    await client.query("SET LOCAL lock_timeout = '1000ms'");
    const mode = await client.query('SHOW transaction_read_only');
    if (mode.rows[0]?.transaction_read_only !== 'on') throw new Error('Read-only transaction required');
    for (const [schema, table] of relations) await probe(`relation:${schema}.${table}`, async () => {
      const result = await client.query(`SELECT c.relkind, has_schema_privilege(n.oid,'USAGE') AND has_table_privilege(c.oid,'SELECT') AS readable
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2`, [schema, table]);
      const row = result.rows[0];
      add(`relation:${schema}.${table}`, row && ['r', 'p'].includes(row.relkind) && row.readable ? 'pass' : 'fail',
        { exists: Boolean(row), readableByReviewRole: Boolean(row?.readable) });
    });
    for (const [schema, table, column, type, notNull] of columns) await probe(`column:${schema}.${table}.${column}`, async () => {
      const result = await client.query(`SELECT format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS required
        FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=$1 AND c.relname=$2 AND a.attname=$3 AND NOT a.attisdropped AND a.attnum>0`, [schema, table, column]);
      const row = result.rows[0];
      add(`column:${schema}.${table}.${column}`, row?.type === type && row?.required === notNull ? 'pass' : 'fail');
    });
    for (const [name, table, fn, events] of triggerContracts) await probe(`trigger:${name}`, async () => {
      const result = await client.query(`SELECT t.tgenabled, t.tgtype::int AS events, p.proname, pn.nspname,
        t.tgqual IS NULL AS no_condition, ARRAY(SELECT a.attname::text FROM unnest(t.tgattr::smallint[]) k
          JOIN pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=k) AS columns
        FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
        WHERE n.nspname='auth' AND c.relname=$1 AND t.tgname=$2 AND NOT t.tgisinternal`, [table, name]);
      const row = result.rows[0];
      const expectedColumns = name === 'carpeta_revision_rund' ? ['persona_id'] : [];
      add(`trigger:${name}`, row && ['O', 'A'].includes(row.tgenabled) && row.events === events && row.proname === fn &&
        row.nspname === 'auth' && row.no_condition && JSON.stringify(row.columns) === JSON.stringify(expectedColumns) ? 'pass' : 'fail');
    });
    await probe('constraints:version-identity', async () => {
      const result = await client.query(`SELECT conname, contype, convalidated, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint WHERE conrelid=to_regclass('auth.documento_carpeta_version')
        AND conname IN ('documento_version_numero_unique','documento_version_restaurada_check')`);
      const unique = result.rows.find(row => row.conname === 'documento_version_numero_unique');
      const check = result.rows.find(row => row.conname === 'documento_version_restaurada_check');
      add('constraints:version-identity', unique?.contype === 'u' && unique.convalidated &&
        unique.definition === 'UNIQUE (documento_id, numero_version)' && check?.contype === 'c' && check.convalidated ? 'pass' : 'fail');
    });
    await probe('catalog:rund-permissions', async () => {
      const result = await client.query(`SELECT p.code FROM auth.permission p JOIN auth.module m ON m.id_module=p.id_module
        WHERE m.code='rund' AND m.is_active=true AND p.is_active=true AND p.code=ANY($1::text[])`, [permissionCodes]);
      const found = new Set(result.rows.map(row => row.code));
      add('catalog:rund-permissions', permissionCodes.every(code => found.has(code)) ? 'pass' : 'fail',
        { missingCodes: permissionCodes.filter(code => !found.has(code)) });
    });
    await probe('history:migrations', async () => {
      const history = [];
      for (const schema of ['auth', 'rund']) {
        const found = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`${schema}.migrations_db_log`]);
        if (found.rows[0].exists) history.push(...(await client.query(`SELECT filename FROM ${schema}.migrations_db_log`)).rows.map(row => row.filename));
      }
      for (const file of migrationFiles) {
        const name = path.basename(file);
        const observed = history.some(value => typeof value === 'string' && value.replace(/\\/g, '/').split('/').pop() === name);
        add(`history:${name}`, observed ? 'pass' : 'not_verified', { recorded: observed, appliedSqlHashVerified: false });
      }
    });
    await probe('identity:canonical-person', async () => {
      const result = await client.query(`SELECT count(*) FILTER (WHERE p.id_person IS NULL)::text AS unlinked,
        count(*) FILTER (WHERE NULLIF(btrim(d."periodoCarga"),'') IS NULL)::text AS without_period
        FROM rund."Docente" d LEFT JOIN auth.personas p ON p.id_person=d."personaId"`);
      const row = result.rows[0];
      add('identity:canonical-person', row.unlinked !== '0' ? 'fail' : row.without_period !== '0' ? 'review_required' : 'pass',
        { unlinkedProfiles: row.unlinked, profilesWithoutPeriod: row.without_period });
    });
    await probe('identity:duplicate-periods', async () => {
      const result = await client.query(`SELECT count(*)::text AS groups FROM
        (SELECT 1 FROM rund."Docente" GROUP BY "personaId", NULLIF(btrim("periodoCarga"),'') HAVING count(*)>1) duplicates`);
      const count = result.rows[0].groups;
      add('identity:duplicate-periods', count === '0' ? 'pass' : 'review_required', { duplicateGroups: count });
    });
    await probe('sequence:base-card', async () => {
      const result = await client.query(`SELECT s.seqincrement=1 AND s.seqmin=1 AND s.seqcache=1 AND NOT s.seqcycle
        AND s.seqtypid='bigint'::regtype AS valid FROM pg_sequence s
        WHERE s.seqrelid=to_regclass('rund.numero_tarjeta_rund_seq')`);
      add('sequence:base-card', result.rows[0]?.valid ? 'pass' : 'fail');
    });
  } finally { if (opened) await client.query('ROLLBACK'); }
  return { transactionReadOnly: true, checks,
    status: checks.every(check => check.status === 'pass') ? 'checked_scope_passed' : 'requires_review',
    activationReadiness: 'not_verified',
    limits: ['Comprobación parcial de estructura; no compara todo el DDL ni ejecuta funciones/triggers.',
      'El historial no prueba el SQL aplicado ni corrige registros erróneos anteriores.',
      'Los permisos SELECT son del rol de revisión; no certifican los grants del rol de aplicación.',
      'No comprueba JWT, roles efectivos, conectividad interna, archivos, OpenKM ni imágenes desplegadas.'] };
}
module.exports = { environments, migrationFiles, relations, columns, permissionCodes, inventory, inspectDatabase };
