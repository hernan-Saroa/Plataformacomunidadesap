// PostgreSQL real + archivos sintéticos; tablas TEMP y directorio aislado.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { root, serviceRoot, clientForLocal, reportError } = require('./rund-documental/local-context.cjs');
const { within } = require('./rund-documental/inventory.cjs');
require(path.join(serviceRoot, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(serviceRoot, 'tsconfig.json') });
const { RundDocumentStorageService } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-document-storage.service.ts'));
const { RundDocumentosService } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-documentos.service.ts'));
const { RUND_STANDARD_FOLDERS } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-expediente.ts'));
const { migrateRundDocument } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-document-migration.ts'));

(async () => {
  if (process.argv.length !== 2) throw new Error('NO_OPTIONS_SUPPORTED');
  const client = clientForLocal();
  const originalCwd = process.cwd();
  const originalUrl = process.env.OPENKM_BASE_URL;
  const originalLocal = process.env.RUND_DOCUMENT_ALLOW_LOCAL;
  const isolatedKeys = ['RUND_DOCUMENTAL_ENABLED', 'RUND_DOCUMENT_PROVIDER', 'RUND_DOCUMENT_LOCAL_ROOT', 'RUND_TRD_POLICY_FILE'];
  const originalSettings = Object.fromEntries(isolatedKeys.map(key => [key, process.env[key]]));
  const temporaryRoot = path.join(root, 'tmp/rund-documental-tests');
  await fs.mkdir(temporaryRoot, { recursive: true });
  const temporary = await fs.mkdtemp(path.join(temporaryRoot, 'postgres-'));
  let connected = false;
  const checks = [];
  try {
    await client.connect(); connected = true;
    await client.query('BEGIN');
    const fingerprint = async () => (await client.query(`SELECT count(*)::int AS total,
      md5(COALESCE(string_agg(md5(row_to_json(d)::text), '' ORDER BY id), '')) AS fingerprint
      FROM academic_work_plan."RundDocumentoPerfil" d`)).rows[0];
    const realBefore = await fingerprint();
    for (const table of ['Docente', 'RundDocumentoCategoria', 'RundDocumentoPerfil', 'RundSoporteCampo', 'RundAprobacionLog', 'RundAccesoDatosLog']) {
      await client.query(`CREATE TEMP TABLE "${table}" (LIKE academic_work_plan."${table}" INCLUDING ALL) ON COMMIT DROP`);
    }
    await client.query('CREATE TEMP TABLE personas (id_person uuid PRIMARY KEY, num_identificacion text) ON COMMIT DROP');
    await client.query('INSERT INTO pg_temp."RundDocumentoCategoria" SELECT * FROM academic_work_plan."RundDocumentoCategoria"');
    const persona = randomUUID();
    const docente = randomUUID();
    const columns = (await client.query(`SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'academic_work_plan' AND table_name = 'Docente' AND is_nullable = 'NO' AND column_default IS NULL`)).rows;
    const values = { id: docente, personaId: persona, periodoCarga: '2026-1', correoInstitucional: 'synthetic@example.invalid' };
    for (const col of columns) if (!(col.column_name in values)) {
      values[col.column_name] = col.data_type === 'uuid' ? randomUUID()
        : ['integer', 'bigint', 'numeric', 'double precision'].includes(col.data_type) ? 0
        : col.data_type === 'boolean' ? false : col.data_type.includes('timestamp') ? new Date()
        : col.data_type === 'jsonb' ? {} : 'SYNTHETIC';
    }
    await client.query(`INSERT INTO pg_temp."Docente" (${Object.keys(values).map(key => `"${key}"`).join(',')})
      VALUES (${Object.keys(values).map((_, i) => `$${i + 1}`).join(',')})`, Object.values(values));
    await client.query('INSERT INTO pg_temp.personas VALUES ($1, $2)', [persona, 'SYNTHETIC-DOCUMENT']);
    const query = async (sql, params) => {
      const isolated = sql.replaceAll('academic_work_plan.', 'pg_temp.').replaceAll('auth.personas', 'pg_temp.personas');
      assert(!/\b(auth|academic_work_plan)\./.test(isolated));
      return (await client.query(isolated, params)).rows;
    };
    const db = { query, createQueryRunner: () => {
      let active = false;
      return { query, connect: async () => {}, release: async () => {},
        get isTransactionActive() { return active; },
        startTransaction: async () => { await client.query('SAVEPOINT document_operation'); active = true; },
        commitTransaction: async () => { await client.query('RELEASE SAVEPOINT document_operation'); active = false; },
        rollbackTransaction: async () => { await client.query('ROLLBACK TO SAVEPOINT document_operation'); await client.query('RELEASE SAVEPOINT document_operation'); active = false; },
      };
    } };
    // Solo el proceso de prueba usa estos valores. Nunca edita el .env del servicio.
    delete process.env.OPENKM_BASE_URL;
    for (const key of isolatedKeys) delete process.env[key];
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'true';
    process.env.RUND_DOCUMENTAL_ENABLED = 'true';
    process.chdir(temporary);
    const storage = new RundDocumentStorageService();
    const documents = new RundDocumentosService(db, storage);
    const actor = { actorId: 'TEST_ACTOR', fullAccess: true, roles: ['GESTION_PROFESORAL'] };
    await documents.ensureExpediente(docente, actor.actorId, '127.0.0.1');
    await documents.ensureExpediente(docente, actor.actorId, '127.0.0.1');
    const expediente = path.join(temporary, 'uploads/rund-documentos/expedientes', persona);
    assert.deepEqual((await fs.readdir(expediente)).sort(), [...RUND_STANDARD_FOLDERS].sort());
    checks.push('Cinco carpetas vacías, repetibles y vinculadas a persona');

    const makePdf = text => { const buffer = Buffer.from(`%PDF-1.7\n${text}\n%%EOF`); return { buffer, size: buffer.length, originalname: 'synthetic.pdf', mimetype: 'application/pdf' }; };
    const firstFile = makePdf('version 1');
    const secondFile = makePdf('version 2');
    const first = await documents.create(docente, { categoria: 'TITULOS' }, firstFile, actor.actorId);
    const second = await documents.replace(docente, first.id, secondFile, actor.actorId);
    assert.equal(first.version, 1); assert.equal(second.version, 2);
    assert.deepEqual((await documents.content(docente, first.id, actor)).buffer, firstFile.buffer);
    assert.deepEqual((await documents.content(docente, second.id, actor)).buffer, secondFile.buffer);
    assert.equal((await documents.list(docente, undefined, true)).length, 2);
    await documents.remove(docente, second.id, actor.actorId);
    await assert.rejects(documents.content(docente, second.id, actor), /eliminado/);
    assert.equal((await documents.list(docente)).length, 0);
    const saved = (await query('SELECT * FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1', [second.id]))[0];
    assert.deepEqual(await storage.read(saved.proveedor_almacenamiento, saved.almacenamiento_ruta), secondFile.buffer);
    checks.push('Versiones conservadas, lectura exacta y retirada lógica sin borrar archivo');

    const png = { buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), size: 8, mimetype: 'image/png', originalname: 'synthetic.png' };
    const administrative = { categoria: 'OTROS', bloque: 'TRANSVERSAL', tipoSoporte: 'soporte_edicion_perfil' };
    const support1 = await documents.create(docente, administrative, png, actor.actorId);
    const support2 = await documents.create(docente, administrative, firstFile, actor.actorId);
    assert.notEqual(support1.rundSoporteId, support2.rundSoporteId);
    const content = await documents.content(docente, support1.id, actor);
    assert.equal(content.mimeType, 'image/png'); assert.deepEqual(content.buffer, png.buffer);
    for (const support of [support1, support2]) {
      await assert.rejects(documents.remove(docente, support.id, actor.actorId), /se conserva/);
      await assert.rejects(documents.replace(docente, support.id, secondFile, actor.actorId), /se conserva/);
      assert.equal((await query('SELECT documento_perfil_id FROM academic_work_plan."RundSoporteCampo" WHERE id = $1', [support.rundSoporteId]))[0].documento_perfil_id, support.id);
    }
    checks.push('Evidencias administrativas independientes, PNG correcto e inmutabilidad');

    const filesBefore = (await fs.readdir(path.join(expediente, 'FORMACION'), { recursive: true })).sort();
    const rowsBefore = await documents.list(docente, undefined, true);
    // Provoca un error real de PostgreSQL, no una excepción simulada del driver.
    await client.query(`ALTER TABLE pg_temp."RundAprobacionLog" ADD CONSTRAINT test_fail_audit CHECK (actor_id <> 'FAIL_AUDIT')`);
    await assert.rejects(documents.create(docente, { categoria: 'TITULOS' }, firstFile, 'FAIL_AUDIT'));
    assert.deepEqual(await documents.list(docente, undefined, true), rowsBefore);
    const filesAfter = (await fs.readdir(path.join(expediente, 'FORMACION'), { recursive: true })).sort();
    assert.deepEqual(filesAfter.filter(name => name.endsWith('.pdf')), filesBefore.filter(name => name.endsWith('.pdf')));
    assert.deepEqual(await fingerprint(), realBefore);
    checks.push('Fallo real de auditoría revierte SQL y archivo nuevo; registros reales intactos');

    // Políticas ficticias solo en el directorio temporal; nunca se usan en documentos reales.
    const policyFile = path.join(temporary, 'fixture-trd.json');
    await fs.writeFile(policyFile, JSON.stringify({ version: 'PRUEBA-v1', aprobacion: 'SOLO FIXTURE', reglas: [{
      id: 'prueba', categoria: 'TITULOS', serie: 'fixture', subserie: 'fixture', eventoInicio: 'CIERRE_PRUEBA',
      mesesGestion: 1, mesesCentral: 1, disposicion: 'CONSERVACION_TOTAL', fundamentoTratamiento: 'fixture', finalidad: 'fixture',
    }] }));
    process.env.RUND_TRD_POLICY_FILE = policyFile;
    assert.equal((await documents.getRetention(docente, first.id)).estado, 'PENDIENTE_TRD');
    await documents.manageRetention(docente, first.id, { accion: 'ASIGNAR_TRD', motivo: 'prueba aislada' }, actor.actorId);
    const retention = await documents.manageRetention(docente, first.id, { accion: 'REGISTRAR_EVENTO_TRD', motivo: 'cierre fixture',
      evento: 'CIERRE_PRUEBA', fechaEvento: '2020-01-31T00:00:00.000Z' }, actor.actorId);
    assert.equal(retention.estado, 'REQUIERE_REVISION_ARCHIVISTICA');
    assert.equal(retention.eliminacionFisicaPermitida, false);
    await documents.manageRetention(docente, first.id, { accion: 'SUSPENDER_RETENCION', motivo: 'prueba' }, actor.actorId);
    assert.equal((await documents.getRetention(docente, first.id)).suspension, true);
    assert.equal((await documents.getRetention(docente, second.id)).suspension, true);
    await documents.manageRetention(docente, second.id, { accion: 'LEVANTAR_SUSPENSION', motivo: 'prueba' }, actor.actorId);
    assert.equal((await documents.getRetention(docente, first.id)).suspension, false);
    await assert.rejects(documents.manageRetention(docente, first.id, { accion: 'SUSPENDER_RETENCION', motivo: 'prueba' }, 'FAIL_AUDIT'));
    assert.equal((await documents.getRetention(docente, first.id)).suspension, false);
    checks.push('TRD histórica, evento, suspensión entre versiones y rollback de auditoría en PostgreSQL');

    const beforeMigration = (await query('SELECT * FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1', [first.id]))[0];
    let copies = 0;
    const simulatedRemoteStorage = {
      readVerifiedLocal: (...args) => storage.readVerifiedLocal(...args),
      copyVerifiedToOpenKm: async input => {
        assert.deepEqual(input.content, firstFile.buffer); copies++;
        return { provider: 'OPENKM', storageId: 'fixture-openkm', storagePath: '/okm:root/RUND/fixture.pdf' };
      },
    };
    await migrateRundDocument(db, simulatedRemoteStorage, first.id, { apply: false, actor: '', includeRetired: false });
    assert.equal(copies, 0);
    await assert.rejects(migrateRundDocument(db, simulatedRemoteStorage, first.id, { apply: true, actor: 'FAIL_AUDIT', includeRetired: false }));
    assert.deepEqual((await query('SELECT * FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1', [first.id]))[0], beforeMigration);
    await migrateRundDocument(db, simulatedRemoteStorage, first.id, { apply: true, actor: actor.actorId, includeRetired: false });
    const migrated = (await query('SELECT * FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1', [first.id]))[0];
    assert.equal(migrated.proveedor_almacenamiento, 'OPENKM');
    assert.equal(migrated.estado, beforeMigration.estado);
    assert.equal(migrated.checksum_sha256, beforeMigration.checksum_sha256);
    assert.deepEqual(await storage.read('LOCAL', beforeMigration.almacenamiento_ruta), firstFile.buffer);
    assert.equal((await migrateRundDocument(db, simulatedRemoteStorage, first.id, { apply: true, actor: actor.actorId, includeRetired: false })).estado, 'YA_EN_OPENKM');
    assert.equal(copies, 2);
    assert.deepEqual(await fingerprint(), realBefore);
    checks.push('Migración con destino simulado: referencia transaccional, rollback real, reanudación y original conservado');
    // Revisión de despliegue aplazado con SQL y disco reales, siempre temporales.
    delete process.env.RUND_DOCUMENTAL_ENABLED;
    process.env.RUND_DOCUMENT_PROVIDER = 'OPENKM';
    process.env.RUND_TRD_POLICY_FILE = path.join(temporary, 'politica-aun-inexistente.json');
    const deferred = new RundDocumentosService(db, new RundDocumentStorageService());
    assert.deepEqual(deferred.configurationStatus(), { habilitado: false, disposicionAutomatica: false });
    await assert.rejects(deferred.ensureExpediente(docente, actor.actorId), /no está habilitada/);
    const oldFlow = await deferred.create(docente, { categoria: 'TITULOS' }, firstFile, actor.actorId);
    const oldFlowVersion = await deferred.replace(docente, oldFlow.id, secondFile, actor.actorId);
    const oldFlowStored = (await query('SELECT * FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1', [oldFlowVersion.id]))[0];
    assert.equal(oldFlowStored.proveedor_almacenamiento, 'LOCAL');
    assert(oldFlowStored.almacenamiento_ruta.startsWith('rund-documentos/SYNTHETIC-DOCUMENT/TITULOS/'));
    assert.deepEqual((await deferred.content(docente, oldFlow.id, actor)).buffer, firstFile.buffer);
    assert.deepEqual((await deferred.content(docente, oldFlowVersion.id, actor)).buffer, secondFile.buffer);
    assert.deepEqual((await deferred.content(docente, support1.id, actor)).buffer, png.buffer);
    await deferred.remove(docente, oldFlowVersion.id, actor.actorId);
    assert.deepEqual(await storage.read('LOCAL', oldFlowStored.almacenamiento_ruta), secondFile.buffer);
    assert.deepEqual(await fingerprint(), realBefore);
    checks.push('Modo apagado: CRUD y rutas anteriores, políticas ignoradas, históricos legibles y retiro sin borrado físico');
    console.log(JSON.stringify({ ok: true, isolatedTemporaryTables: true, syntheticFilesOnly: true,
      realDocumentMetadataUnchanged: true, checks }, null, 2));
  } finally {
    process.chdir(originalCwd);
    if (originalUrl === undefined) delete process.env.OPENKM_BASE_URL; else process.env.OPENKM_BASE_URL = originalUrl;
    if (originalLocal === undefined) delete process.env.RUND_DOCUMENT_ALLOW_LOCAL; else process.env.RUND_DOCUMENT_ALLOW_LOCAL = originalLocal;
    for (const key of isolatedKeys) {
      if (originalSettings[key] === undefined) delete process.env[key]; else process.env[key] = originalSettings[key];
    }
    try { if (connected) await client.query('ROLLBACK'); }
    finally {
      await client.end();
      assert(within(temporaryRoot, temporary));
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }
})().catch(reportError);
