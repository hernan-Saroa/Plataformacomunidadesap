// Integration against PostgreSQL TEMP tables only. No application rows or files are modified.
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { config } = require('./audit-rund-excel.cjs');
const root = path.resolve(__dirname, '../backend/academic-work-plan-service');
require(path.join(root, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(root, 'tsconfig.json') });
const { RundDocumentosService } = require(path.join(root, 'src/pta/banco-docentes/rund-documentos.service.ts'));
const { BancoDocentesService } = require(path.join(root, 'src/pta/banco-docentes/banco-docentes.service.ts'));
const { RundEvidenceWorkflow, requiredEvidence, invalidateEditedEvidence } = require(path.join(root, 'src/pta/banco-docentes/rund-evidence-workflow.ts'));

(async () => {
  const client = new Client({ ...config, connectionTimeoutMillis: 8000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const table of ['Docente', 'RundCampoEstado', 'RundSoporteCampo', 'RundDocumentoPerfil', 'RundDocumentoCategoria', 'RundAprobacionLog']) {
      await client.query(`CREATE TEMP TABLE "${table}" (LIKE academic_work_plan."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    }
    await client.query('CREATE TEMP TABLE personas (id_person uuid, num_identificacion text) ON COMMIT DROP');
    const id = randomUUID();
    const persona = randomUUID();
    // Build a synthetic fixture compatible with current non-null columns; never copy personal data.
    const columns = (await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'academic_work_plan'
      AND table_name = 'Docente' AND is_nullable = 'NO' AND column_default IS NULL`)).rows;
    const values = { id, personaId: persona, territorialId: 'TEST', dedicacion: 'TC', tipoVinculacion: 'TEST' };
    for (const col of columns) if (!(col.column_name in values)) values[col.column_name] = col.data_type === 'uuid' ? randomUUID() : ['integer','numeric','double precision'].includes(col.data_type) ? 0 : col.data_type.includes('timestamp') ? new Date() : 'TEST';
    await client.query(`INSERT INTO pg_temp."Docente" (${Object.keys(values).map(k => `"${k}"`).join(',')}) VALUES (${Object.keys(values).map((_, i) => `$${i+1}`).join(',')})`, Object.values(values));
    await client.query('INSERT INTO pg_temp.personas VALUES ($1,$2)', [persona, 'TEST-EVIDENCE']);
    await client.query(`INSERT INTO pg_temp."RundDocumentoCategoria" SELECT * FROM academic_work_plan."RundDocumentoCategoria"`);
    const files = new Map();
    const storage = {
      store: async input => { const key = `${input.logicalId}/v${input.version}.pdf`; files.set(key, input.content); return { provider: 'TEST_MEMORY', storageId: key, storagePath: key }; },
      read: async (_, key) => files.get(key),
      remove: async (_, key) => { files.delete(key); },
    };
    let failAudit = false;
    const query = async (sql, params) => {
      assert(!/\b(DROP|TRUNCATE)\b/i.test(sql), 'Unexpected destructive query');
      if (failAudit && sql.includes('INSERT INTO academic_work_plan."RundAprobacionLog"')) throw new Error('TEST_AUDIT_UNAVAILABLE');
      try { return (await client.query(sql.replaceAll('academic_work_plan.', 'pg_temp.').replaceAll('auth.personas', 'pg_temp.personas'), params)).rows; }
      catch (error) { throw new Error(`${error.message}\nSQL: ${sql}`); }
    };
    const db = { query, createQueryRunner: () => ({
      connect: async () => {}, release: async () => {}, query,
      startTransaction: () => client.query('SAVEPOINT evidence_operation'),
      commitTransaction: () => client.query('RELEASE SAVEPOINT evidence_operation'),
      rollbackTransaction: () => client.query('ROLLBACK TO SAVEPOINT evidence_operation'),
    }) };
    const documents = new RundDocumentosService(db, storage);
    const workflow = new RundEvidenceWorkflow(db);
    const buffer = Buffer.from('%PDF-1.7\nfixture\n%%EOF');
    const file = { buffer, size: buffer.length, mimetype: 'application/pdf', originalname: 'soporte-prueba.pdf' };
    const checks = [];
    const support = async type => (await query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id = $1 AND tipo_soporte = $2', [id, type]))[0];
    const block = async code => (await query('SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 AND bloque = $2', [id, code]))[0];
    const review = async (type, estado = 'Aprobado', observacion) => {
      const s = await support(type);
      return workflow.reviewSupport(id, s.bloque, s.id, { estado, observacion, documentoVersionId: s.documento_perfil_id, blockVersion: Number((await block(s.bloque)).version) }, 'REVISOR', '127.0.0.1');
    };
    const first = await documents.create(id, { categoria: 'IDENTIDAD', bloque: 'IDENTIDAD', tipoSoporte: 'documento_identidad' }, file, 'CARGADOR');
    assert.equal((await block('IDENTIDAD')).estado, 'En revisión');
    await assert.rejects(workflow.reviewBlock(id, 'IDENTIDAD', 'REVISOR'), /Revise y apruebe/);
    const s1 = await support('documento_identidad');
    await assert.rejects(workflow.reviewSupport(id, 'IDENTIDAD', s1.id, { estado: 'Aprobado', documentoVersionId: first.id }, 'CARGADOR'), /distinta/);
    await assert.rejects(review('documento_identidad', 'Rechazado', '  '), /motivo/);
    checks.push('Carga pendiente, segregación de funciones y motivo obligatorio');
    await review('documento_identidad', 'Rechazado', 'El documento no corresponde. Adjunte su identificación.');
    assert.equal((await block('IDENTIDAD')).estado, 'Devuelto');
    const second = await documents.replace(id, first.id, file, 'CARGADOR');
    assert.equal((await support('documento_identidad')).estado, 'Pendiente');
    assert.equal((await support('documento_identidad')).observacion, null);
    await assert.rejects(workflow.reviewSupport(id, 'IDENTIDAD', s1.id, { estado: 'Aprobado', documentoVersionId: first.id }, 'REVISOR'), /cambió/);
    await review('documento_identidad');
    await workflow.reviewBlock(id, 'IDENTIDAD', 'REVISOR');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    assert.equal((await documents.list(id))[0].estadoRevision, 'Aprobado');
    await review('documento_identidad');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    checks.push('Devolución, reemplazo versionado, rechazo de revisión obsoleta y aprobación persistida');
    const third = await documents.replace(id, second.id, file, 'CARGADOR');
    assert.equal((await block('IDENTIDAD')).estado, 'En revisión');
    assert.equal((await documents.list(id))[0].estadoRevision, 'Pendiente');
    await review('documento_identidad');
    await workflow.reviewBlock(id, 'IDENTIDAD', 'REVISOR');
    failAudit = true;
    await assert.rejects(review('documento_identidad', 'Rechazado', 'Prueba de rollback'), /TEST_AUDIT/);
    failAudit = false;
    assert.equal((await support('documento_identidad')).estado, 'Aprobado');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    checks.push('Reemplazo retira aprobación; fallo de auditoría revierte toda la decisión');
    await documents.create(id, { categoria: 'TITULOS', bloque: 'FORMACION', tipoSoporte: 'diploma_pregrado' }, file, 'CARGADOR');
    await review('diploma_pregrado');
    await assert.rejects(workflow.reviewBlock(id, 'FORMACION', 'REVISOR'), /hoja_vida_pro/);
    await assert.rejects(documents.create(id, { categoria: 'IDENTIDAD', bloque: 'IDENTIDAD', tipoSoporte: 'contrato' }, file, 'CARGADOR'), /no corresponde/);
    await query('UPDATE academic_work_plan."Docente" SET maestria = $1 WHERE id = $2', ['Maestría de prueba', id]);
    for (const code of ['FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']) {
      for (const group of requiredEvidence(code, { maestria: 'Maestría de prueba' })) {
        if (await support(group[0])) continue;
        await documents.create(id, { categoria: code === 'FORMACION' ? 'TITULOS' : 'OTROS', bloque: code, tipoSoporte: group[0] }, file, 'CARGADOR');
        await review(group[0]);
      }
      await workflow.reviewBlock(id, code, 'REVISOR');
    }
    assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id = $1', [id]))[0].estadoAprobacion, 'ACTIVO_RUND');
    checks.push('Exige todos los soportes, incluidos títulos declarados; activación de cinco bloques obligatorios');
    const oldFormationVersion = Number((await block('FORMACION')).version);
    await invalidateEditedEvidence(db, id, ['maestria'], 'EDITOR', '127.0.0.1');
    const degree = await support('diploma_maestria');
    await assert.rejects(workflow.reviewSupport(id, 'FORMACION', degree.id, { estado: 'Aprobado', documentoVersionId: degree.documento_perfil_id, blockVersion: oldFormationVersion }, 'REVISOR'), /espacio cambió/);
    assert.equal((await support('diploma_maestria')).estado, 'Pendiente');
    assert.equal((await block('FORMACION')).estado, 'En revisión');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    await assert.rejects(workflow.reviewBlock(id, 'FORMACION', 'REVISOR'), /Revise y apruebe/);
    for (const type of ['diploma_pregrado', 'hoja_vida_pro', 'diploma_maestria']) await review(type);
    await workflow.reviewBlock(id, 'FORMACION', 'REVISOR');
    checks.push('Editar datos reabre únicamente los bloques afectados y exige nueva revisión de sus soportes');
    await review('contrato', 'Rechazado', 'Contrato de otra persona.');
    assert.equal((await support('resolucion_convocatoria')).estado, 'Aprobado');
    await workflow.reviewBlock(id, 'ACADEMICO', 'REVISOR');
    assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id = $1', [id]))[0].estadoAprobacion, 'DEVUELTO');
    checks.push('Devolución individual conserva otros soportes; aprobar otro bloque conserva DEVUELTO global');
    const recoveredDocuments = await new RundDocumentosService(db, storage).list(id);
    assert.equal(recoveredDocuments.find(d => d.id === third.id).estadoRevision, 'Aprobado');
    // A fresh service reads the persisted evidence; only OTP identity/list/audit plumbing is isolated here.
    const autogestion = Object.create(BancoDocentesService.prototype);
    Object.assign(autogestion, {
      dataSource: db,
      requireAutogestionSession: async () => ({ id: 'TEST-INVITATION', correoInstitucional: 'test@example.invalid' }),
      list: async () => ({ data: [{ docente_id: id, correo_institucional: 'test@example.invalid' }] }),
      logSensitiveDataAccess: async () => {},
    });
    const recovered = await autogestion.getAutogestionInfo('TEST-SESSION');
    assert.equal(recovered.evidencias.soportes.find(s => s.tipo_soporte === 'documento_identidad').estado, 'Aprobado');
    assert.equal(recovered.evidencias.soportes.find(s => s.tipo_soporte === 'contrato').correccion_requerida, 'Contrato de otra persona.');
    assert.equal(recovered.evidencias.bloques.find(b => b.bloque === 'IDENTIDAD').estado, 'Aprobado');
    checks.push('Instancias nuevas recuperan de PostgreSQL documentos, aprobaciones y motivos de devolución');
    await documents.remove(id, third.id, 'CARGADOR');
    assert.equal(await support('documento_identidad'), undefined);
    assert.equal((await block('IDENTIDAD')).estado, 'Soporte faltante');
    assert.equal((await documents.list(id, 'IDENTIDAD', true)).length, 3);
    assert(files.has(`${third.documentoLogicoId}/v3.pdf`));
    await assert.rejects(documents.content(id, third.id, { actorId: 'REVISOR', fullAccess: true, roles: [] }), /eliminado/);
    const logs = await query('SELECT * FROM academic_work_plan."RundAprobacionLog" WHERE docente_id = $1', [id]);
    assert(logs.some(l => l.accion === 'DEVOLVER_SOPORTE' && l.metadata.documentoVersionId === first.id));
    assert(logs.every(l => l.actor_id && l.createdAt));
    checks.push('Eliminación lógica, versiones conservadas y trazabilidad de actor/fecha/decisión');
    console.log(JSON.stringify({ success: true, isolatedTemporaryTables: true, checks, auditEntries: logs.length }, null, 2));
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
