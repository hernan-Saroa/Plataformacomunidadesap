// Integration against PostgreSQL TEMP tables only. No application rows or files are modified.
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { clientForLocal } = require('./rund-documental/local-context.cjs');
const root = path.resolve(__dirname, '../backend/academic-work-plan-service');
require(path.join(root, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(root, 'tsconfig.json') });
const { RundDocumentosService } = require(path.join(root, 'src/pta/banco-docentes/rund-documentos.service.ts'));
const { BancoDocentesService } = require(path.join(root, 'src/pta/banco-docentes/banco-docentes.service.ts'));
const { RundExtraccionService } = require(path.join(root, 'src/pta/banco-docentes/rund-extraccion.service.ts'));
const { RundIncorporacion } = require(path.join(root, 'src/pta/banco-docentes/rund-incorporacion.ts'));
const { RundEvidenceWorkflow, requiredEvidence, invalidateEditedEvidence, evidenceFields } = require(path.join(root, 'src/pta/banco-docentes/rund-evidence-workflow.ts'));
const { withCurrentEvidenceDocuments } = require(path.join(root, 'src/pta/banco-docentes/rund-evidence-workflow.ts'));
const { dataReviewContext, loadDataReviewProfile, loadDataReviews } = require(path.join(root, 'src/pta/banco-docentes/rund-data-review.ts'));

(async () => {
  const client = clientForLocal();
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const table of ['Docente', 'RundCampoEstado', 'RundSoporteCampo', 'RundDocumentoPerfil', 'RundDocumentoCategoria', 'RundAprobacionLog', 'RundAccesoDatosLog', 'RundExtraccionTrabajo', 'RundExtraccionSugerencia']) {
      await client.query(`CREATE TEMP TABLE "${table}" (LIKE academic_work_plan."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    }
    await client.query(`ALTER TABLE pg_temp."RundSoporteCampo" ADD COLUMN IF NOT EXISTS revisiones_campos jsonb NOT NULL DEFAULT '{}'::jsonb`);
    await client.query(`CREATE UNIQUE INDEX ON pg_temp."RundExtraccionTrabajo" (documento_id) WHERE estado IN ('PENDIENTE','PROCESANDO')`);
    await client.query('CREATE TEMP TABLE personas (id_person uuid, num_identificacion text, nom_largo text, gen_tercero text, fec_nacimiento date, tip_identificacion text, tel_celular text) ON COMMIT DROP');
    const id = randomUUID();
    const persona = randomUUID();
    // Build a synthetic fixture compatible with current non-null columns; never copy personal data.
    const columns = (await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'academic_work_plan'
      AND table_name = 'Docente' AND is_nullable = 'NO' AND column_default IS NULL`)).rows;
    const values = { id, personaId: persona, territorialId: 'TEST', dedicacion: 'TC', tipoVinculacion: 'TEST', pregrado: 'Titulo de prueba', perfilAcademicoPro: 'Perfil de prueba', origenVinculacion: 'Convocatoria', actoAdministrativoVinculacion: 'Acto de prueba', fechaInicioVinculacion: '2026-01-01', situacionAdministrativa: 'Servicio activo', escalafon: 'Asociado', puntajeSalarial: 0, nucleoTematico: 'Administracion', ultimaEvaluacion: 'Satisfactoria' };
    for (const col of columns) if (!(col.column_name in values)) values[col.column_name] = col.data_type === 'uuid' ? randomUUID() : ['integer','numeric','double precision'].includes(col.data_type) ? 0 : col.data_type.includes('timestamp') ? new Date() : 'TEST';
    await client.query(`INSERT INTO pg_temp."Docente" (${Object.keys(values).map(k => `"${k}"`).join(',')}) VALUES (${Object.keys(values).map((_, i) => `$${i+1}`).join(',')})`, Object.values(values));
    await client.query('INSERT INTO pg_temp.personas VALUES ($1,$2,$3,$4,$5,$6,$7)', [persona, 'TEST-EVIDENCE', 'PERSONA DE PRUEBA', 'M', '1980-01-01', 'CC', null]);
    await client.query('UPDATE pg_temp."Docente" SET "horasAsignables"=900 WHERE id=$1',[id]);
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
      // The fixture has no real accounts: actor display names are tested separately.
      if (sql.includes('WITH actors AS')) return [];
      if (failAudit && sql.includes('INSERT INTO academic_work_plan."RundAprobacionLog"')) throw new Error('TEST_AUDIT_UNAVAILABLE');
      // SAVEPOINTs share the outer transaction's NOW(); emulate timestamps of separate API transactions.
      try { return (await client.query(sql.replaceAll('academic_work_plan.', 'pg_temp.').replaceAll('auth.personas', 'pg_temp.personas').replaceAll('NOW()', 'clock_timestamp()'), params)).rows; }
      catch (error) { throw new Error(`${error.message}\nSQL: ${sql}`); }
    };
    const db = { query, transaction: async work => {
      await client.query('SAVEPOINT extraction_operation');
      try { const result = await work(db); await client.query('RELEASE SAVEPOINT extraction_operation'); return result; }
      catch (error) { await client.query('ROLLBACK TO SAVEPOINT extraction_operation'); throw error; }
    }, createQueryRunner: () => ({
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
    const dataContext = async code => dataReviewContext(code, await loadDataReviewProfile(db,id),
      await withCurrentEvidenceDocuments(db,id,await query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id=$1 AND bloque=$2',[id,code])),await loadDataReviews(db,id));
    const decideData = async (code,campo,estado='Aprobado',observacion) => workflow.reviewData(id,code,campo,
      {estado,observacion,huella:(await dataContext(code))[campo].huella,blockVersion:Number((await block(code)).version)},'REVISOR_DATOS','127.0.0.1');
    const reviewBlockRaw=async(profileId,code,actor,observation)=>workflow.reviewBlock(profileId,code,actor,observation,undefined,Number((await block(code)).version));
    const reviewBlock = async (profileId, code, actor, observation) => {
      if(observation===undefined)for(const [campo,decision] of Object.entries(await dataContext(code))) {
        if(decision.requiereRevision&&decision.puedeValidar&&decision.estado!=='Aprobado')await decideData(code,campo);
      }
      return workflow.reviewBlock(profileId, code, actor, observation, undefined, Number((await block(code)).version));
    };
    const review = async (type, estado = 'Aprobado', observacion, actor = 'REVISOR') => {
      const s = await support(type);
      for (const campo of evidenceFields(type)) await workflow.reviewSupport(id, s.bloque, s.id, { estado, campo, observacion, documentoVersionId: s.documento_perfil_id, blockVersion: Number((await block(s.bloque)).version) }, actor, '127.0.0.1');
    };
    const verifyIndividualRows = async type => {
      const s = await support(type);
      const fields = evidenceFields(type);
      const decide = async (campo, estado, observacion) => workflow.reviewSupport(id, s.bloque, s.id,
        { campo, estado, observacion, documentoVersionId: s.documento_perfil_id, blockVersion: Number((await block(s.bloque)).version) }, 'REVISOR');
      await assert.rejects(decide(undefined, 'Aprobado'), /fila/);
      await assert.rejects(decide('CAMPO_INVALIDO', 'Aprobado'), /fila/);
      await decide(fields[fields.length - 1], 'Aprobado');
      let saved = await support(type);
      assert.equal(saved.estado, 'Pendiente');
      assert.deepEqual(Object.keys(saved.revisiones_campos), [fields[fields.length - 1]]);
      await decide(fields[0], 'Rechazado', 'Corrija solo la primera fila.');
      saved = await support(type);
      assert.equal(saved.revisiones_campos[fields[fields.length - 1]].estado, 'Aprobado');
      assert.equal(saved.revisiones_campos[fields[0]].estado, 'Rechazado');
      assert.equal(saved.estado, 'Rechazado');
      assert.equal((await block(s.bloque)).estado, 'Devuelto');
      checks.push(`Decisiones documentales independientes persistidas: ${type}`);
    };
    // Empty fields cannot create an attachment, even through the document-library API.
    await assert.rejects(documents.create(id, { categoria: 'TITULOS', bloque: 'FORMACION', tipoSoporte: 'diploma_doctorado' }, file, 'CARGADOR'), /Registre primero/);
    assert.equal(files.size, 0);
    assert.equal((await documents.list(id)).length, 0);
    await query('UPDATE auth.personas SET fec_nacimiento = NULL WHERE id_person = $1', [persona]);
    await assert.rejects(documents.create(id, { categoria: 'IDENTIDAD', bloque: 'IDENTIDAD', tipoSoporte: 'documento_identidad', campo: 'FECHA_NACIMIENTO' }, file, 'CARGADOR'), /Registre primero/);
    assert.equal(files.size, 0);
    await query('UPDATE auth.personas SET fec_nacimiento = $1 WHERE id_person = $2', ['1980-01-01', persona]);
    checks.push('Rechaza cargas sin datos y filas vacias que comparten soporte; no guarda archivos');
    const documentaryBlocks=['IDENTIDAD','FORMACION','VINCULACION','ACADEMICO','TRANSVERSAL'];
    for(const code of documentaryBlocks) await query(`INSERT INTO academic_work_plan."RundCampoEstado"
      (id,docente_id,bloque,estado,version,"createdAt","updatedAt") VALUES ($1,$2,$3,'Soporte faltante',1,NOW(),NOW())`,[randomUUID(),id,code]);
    for(const code of documentaryBlocks) await assert.rejects(reviewBlock(id,code,'REVISOR','Corrija el soporte.'),/Cargue al menos un soporte/);
    assert.equal((await query('SELECT COUNT(*)::int n FROM academic_work_plan."RundAprobacionLog" WHERE docente_id=$1',[id]))[0].n,0);
    checks.push('Impide devolver los cinco bloques sin soporte y no escribe decisiones ni auditorías falsas');
    // The final authority is the data reviewer, even when no document exists.
    await client.query('SAVEPOINT optional_evidence');
    await query(`INSERT INTO academic_work_plan."RundCampoEstado" (id,docente_id,bloque,estado,version,"createdAt","updatedAt") VALUES ($1,$2,'CONTACTO','Pendiente',1,NOW(),NOW())`,[randomUUID(),id]);
    for(const code of [...documentaryBlocks,'CONTACTO']) {
      await reviewBlock(id,code,'REVISOR');
      assert.equal((await block(code)).estado,'Aprobado');
    }
    assert.equal((await query('SELECT count(*)::int n FROM academic_work_plan."RundSoporteCampo"'))[0].n,0);
    assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id=$1',[id]))[0].estadoAprobacion,'ACTIVO_RUND');
    const manualReviews=await query(`SELECT metadata FROM academic_work_plan."RundAprobacionLog" WHERE accion='APROBAR_DATO'`);
    assert(manualReviews.length>0&&manualReviews.every(row=>row.metadata.sinSoporteAdmitido===true&&row.metadata.criterioRevision==='DECISION_REVISOR'));
    await decideData('IDENTIDAD','NOMBRE_COMPLETO','Rechazado','El nombre está incorrecto aunque no haya soportes.');
    await assert.rejects(reviewBlockRaw(id,'IDENTIDAD','REVISOR'),/datos devueltos/);
    await client.query('ROLLBACK TO SAVEPOINT optional_evidence');
    await client.query('RELEASE SAVEPOINT optional_evidence');
    checks.push('Las seis pestañas se aprueban sin archivos con validación de datos, actor y auditoría; devolver un dato sigue bloqueando el cierre');
    const first = await documents.create(id, { categoria: 'IDENTIDAD', bloque: 'IDENTIDAD', tipoSoporte: 'documento_identidad' }, file, 'CARGADOR');
    // A partial load can be returned; retired, deleted or foreign documents cannot.
    await client.query('SAVEPOINT return_eligibility');
    await reviewBlock(id,'IDENTIDAD','REVISOR','El documento debe corregirse.');
    for(const state of ['ELIMINADO','REEMPLAZADO']) {
      await query('UPDATE academic_work_plan."RundDocumentoPerfil" SET estado=$1 WHERE id=$2',[state,first.id]);
      await assert.rejects(reviewBlock(id,'IDENTIDAD','REVISOR','Corrija el soporte.'),/Cargue al menos un soporte/);
    }
    await query('UPDATE academic_work_plan."RundDocumentoPerfil" SET estado=\'ACTIVO\',docente_id=$1 WHERE id=$2',[randomUUID(),first.id]);
    await assert.rejects(reviewBlock(id,'IDENTIDAD','REVISOR','Corrija el soporte.'),/Cargue al menos un soporte/);
    await client.query('ROLLBACK TO SAVEPOINT return_eligibility');
    await client.query('RELEASE SAVEPOINT return_eligibility');
    checks.push('Permite devolver carga parcial; bloquea documentos retirados, reemplazados o de otro docente');
    assert.equal((await block('IDENTIDAD')).estado, 'En revisión');
    await assert.rejects(reviewBlockRaw(id, 'IDENTIDAD', 'REVISOR'), /Valide individualmente/);
    await verifyIndividualRows('documento_identidad');
    const s1 = await support('documento_identidad');
    await review('documento_identidad', 'Aprobado', undefined, 'CARGADOR');
    // One admitted identity document supports five separate decisions, never automatic approval.
    await assert.rejects(workflow.reviewBlock(id,'IDENTIDAD','REVISOR',undefined,undefined,Number((await block('IDENTIDAD')).version)),/Valide individualmente/);
    const admittedIdentity=await support('documento_identidad');
    await decideData('IDENTIDAD','DOCUMENTO_IDENTIDAD');
    assert.equal((await dataContext('IDENTIDAD')).NOMBRE_COMPLETO.estado,'Pendiente');
    await decideData('IDENTIDAD','NOMBRE_COMPLETO','Rechazado','El nombre registrado no coincide con la cédula.');
    assert.equal((await block('IDENTIDAD')).estado,'Devuelto');
    assert.deepEqual(await support('documento_identidad'),admittedIdentity);
    await assert.rejects(workflow.reviewBlock(id,'IDENTIDAD','REVISOR',undefined,undefined,Number((await block('IDENTIDAD')).version)),/datos devueltos/);
    const staleDecision=(await dataContext('IDENTIDAD')).NOMBRE_COMPLETO;
    await query('UPDATE auth.personas SET nom_largo=$1 WHERE id_person=$2',['PERSONA CORREGIDA DE PRUEBA',persona]);
    await assert.rejects(workflow.reviewData(id,'IDENTIDAD','NOMBRE_COMPLETO',{estado:'Aprobado',huella:staleDecision.huella,blockVersion:Number((await block('IDENTIDAD')).version)},'REVISOR'),/cambiaron/);
    await decideData('IDENTIDAD','NOMBRE_COMPLETO');
    failAudit=true;
    await assert.rejects(decideData('IDENTIDAD','GENERO'),/TEST_AUDIT_UNAVAILABLE/);
    failAudit=false;
    assert.equal((await dataContext('IDENTIDAD')).GENERO.estado,'Pendiente');
    checks.push('Datos independientes: cédula compartida, devolución con motivo, archivo intacto, huella obsoleta y rollback de auditoría');
    await reviewBlock(id, 'IDENTIDAD', 'CARGADOR');
    assert.equal((await block('IDENTIDAD')).cargado_por, 'CARGADOR');
    assert.equal((await block('IDENTIDAD')).revisado_por, 'CARGADOR');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    await assert.rejects(review('documento_identidad', 'Rechazado', '  ', 'CARGADOR'), /motivo/);
    await assert.rejects(reviewBlock(id, 'IDENTIDAD', 'CARGADOR', '  '), /motivo/);
    await reviewBlock(id, 'IDENTIDAD', 'CARGADOR', 'Corrija el documento cargado.');
    assert.equal((await block('IDENTIDAD')).estado, 'Devuelto');
    await review('documento_identidad', 'Rechazado', 'El documento no corresponde. Adjunte su identificación.', 'CARGADOR');
    checks.push('El mismo cargador aprueba y devuelve filas y bloques; conserva el motivo obligatorio');
    assert.equal((await block('IDENTIDAD')).estado, 'Devuelto');
    const filesBefore = files.size;
    const supportBefore = await support('documento_identidad');
    await query('UPDATE auth.personas SET fec_nacimiento = NULL WHERE id_person = $1', [persona]);
    await assert.rejects(documents.replace(id, first.id, file, 'CARGADOR', undefined, undefined, 'FECHA_NACIMIENTO'), /Registre primero/);
    assert.equal(files.size, filesBefore);
    assert.deepEqual(await support('documento_identidad'), supportBefore);
    assert.equal((await documents.list(id))[0].version, 1);
    await query('UPDATE auth.personas SET fec_nacimiento = $1 WHERE id_person = $2', ['1980-01-01', persona]);
    checks.push('Reemplazo sin dato rechazado; conserva version, archivo y decisiones anteriores');
    const second = await documents.replace(id, first.id, file, 'CARGADOR');
    assert.equal((await support('documento_identidad')).estado, 'Pendiente');
    assert.equal((await support('documento_identidad')).observacion, null);
    await assert.rejects(workflow.reviewSupport(id, 'IDENTIDAD', s1.id, { estado: 'Aprobado', documentoVersionId: first.id }, 'CARGADOR'), /cambió/);
    await review('documento_identidad');
    await reviewBlock(id, 'IDENTIDAD', 'REVISOR');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    assert.equal((await documents.list(id))[0].estadoRevision, 'Aprobado');
    await review('documento_identidad');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    checks.push('Devolución, reemplazo versionado, rechazo de revisión obsoleta y aprobación persistida');
    // OCR is optional: queued, running or failed jobs never block a human review.
    const processingJob = randomUUID();
    await query(`INSERT INTO academic_work_plan."RundExtraccionTrabajo"
      (id,documento_id,docente_id,estado,creado_por) VALUES ($1,$2,$3,'PENDIENTE','CARGADOR')`, [processingJob, second.id, id]);
    for (const estado of ['PENDIENTE', 'PROCESANDO', 'ERROR']) {
      await query('UPDATE academic_work_plan."RundExtraccionTrabajo" SET estado=$1 WHERE id=$2', [estado, processingJob]);
      await reviewBlock(id, 'IDENTIDAD', 'REVISOR');
      assert.equal((await block('IDENTIDAD')).estado,'Aprobado');
    }
    await query('UPDATE academic_work_plan."RundExtraccionTrabajo" SET estado=\'COMPLETADO\' WHERE id=$1', [processingJob]);
    await reviewBlock(id, 'IDENTIDAD', 'REVISOR');
    checks.push('Permite aprobar con OCR en cola, procesando o fallido, conservando la revisión de cada fila');
    const previousOcrEnabled = process.env.RUND_OCR_ENABLED;
    try {
      process.env.RUND_OCR_ENABLED = 'true';
      const extraction = new RundExtraccionService(db, {});
      const actor = { actorId: 'CARGADOR', roles: ['RUND_CARGADOR'], fullAccess: true };
      const analysisVersion = Number((await block('IDENTIDAD')).version);
      await extraction.enqueue(id, second.id, actor);
      assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
      assert.equal(Number((await block('IDENTIDAD')).version), analysisVersion);
      assert.equal((await support('documento_identidad')).estado, 'Aprobado');
      await extraction.enqueue(id, second.id, actor);
      assert.equal(Number((await block('IDENTIDAD')).version), analysisVersion);
      assert.equal((await query(`SELECT count(*)::int n FROM academic_work_plan."RundExtraccionTrabajo" WHERE estado='PENDIENTE'`))[0].n, 1);
      await reviewBlock(id, 'IDENTIDAD', 'REVISOR');
      const [pendingJob] = await query(`SELECT id FROM academic_work_plan."RundExtraccionTrabajo" WHERE estado='PENDIENTE'`);
      await query(`UPDATE academic_work_plan."RundExtraccionTrabajo" SET estado='COMPLETADO' WHERE id=$1`, [pendingJob.id]);
      await query(`INSERT INTO academic_work_plan."RundExtraccionSugerencia"
        (trabajo_id,campo,valor,pagina,evidencia,confianza,baja_confianza)
        VALUES ($1,'nombreCompleto','PERSONA DE PRUEBA',1,'NOMBRE PERSONA DE PRUEBA',1,false)`, [pendingJob.id]);
      await reviewBlock(id, 'IDENTIDAD', 'REVISOR');
      assert.equal((await query(`SELECT estado FROM academic_work_plan."RundExtraccionSugerencia" WHERE trabajo_id=$1`,[pendingJob.id]))[0].estado,'PENDIENTE');
      checks.push('Solicitar y repetir OCR conserva aprobaciones; las sugerencias pueden quedar pendientes sin aplicarse ni descartarse');
    } finally {
      if (previousOcrEnabled === undefined) delete process.env.RUND_OCR_ENABLED;
      else process.env.RUND_OCR_ENABLED = previousOcrEnabled;
    }
    let third = await documents.replace(id, second.id, file, 'CARGADOR');
    assert.equal((await block('IDENTIDAD')).estado, 'En revisión');
    assert.equal((await documents.list(id))[0].estadoRevision, 'Pendiente');
    await review('documento_identidad');
    await reviewBlock(id, 'IDENTIDAD', 'REVISOR');
    failAudit = true;
    await assert.rejects(review('documento_identidad', 'Rechazado', 'Prueba de rollback'), /TEST_AUDIT/);
    failAudit = false;
    assert.equal((await support('documento_identidad')).estado, 'Aprobado');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    checks.push('Reemplazo retira aprobación; fallo de auditoría revierte toda la decisión');
    await documents.create(id, { categoria: 'TITULOS', bloque: 'FORMACION', tipoSoporte: 'diploma_pregrado' }, file, 'CARGADOR');
    await review('diploma_pregrado');
    await assert.rejects(reviewBlockRaw(id, 'FORMACION', 'REVISOR'), /Valide individualmente/);
    await assert.rejects(documents.create(id, { categoria: 'IDENTIDAD', bloque: 'IDENTIDAD', tipoSoporte: 'contrato' }, file, 'CARGADOR'), /no corresponde/);
    await query('UPDATE academic_work_plan."Docente" SET maestria = $1 WHERE id = $2', ['Maestría de prueba', id]);
    for (const code of ['FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']) {
      for (const group of requiredEvidence(code, { maestria: 'Maestría de prueba' })) {
        if (await support(group[0])) continue;
        await documents.create(id, { categoria: code === 'FORMACION' ? 'TITULOS' : 'OTROS', bloque: code, tipoSoporte: group[0] }, file, 'CARGADOR');
        if (evidenceFields(group[0]).length > 1) await verifyIndividualRows(group[0]);
        await review(group[0]);
      }
      await reviewBlock(id, code, 'REVISOR');
    }
    assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id = $1', [id]))[0].estadoAprobacion, 'ACTIVO_RUND');
    assert.equal(await block('CONTACTO'), undefined);
    // Contact can be reviewed without files, but is excluded from the five required blocks.
    await query(`INSERT INTO academic_work_plan."RundCampoEstado"
      (id,docente_id,bloque,estado,version,"createdAt","updatedAt") VALUES ($1,$2,'CONTACTO','Pendiente',1,NOW(),NOW())`, [randomUUID(), id]);
    await reviewBlock(id, 'CONTACTO', 'REVISOR');
    const contactVersion = Number((await block('CONTACTO')).version);
    await assert.rejects(workflow.reviewBlock(id, 'CONTACTO', 'REVISOR', undefined, undefined, contactVersion - 1), /espacio cambió/);
    await assert.rejects(reviewBlock(id, 'CONTACTO', 'REVISOR', '  '), /motivo/);
    await reviewBlock(id, 'CONTACTO', 'REVISOR', 'Corrija el teléfono.');
    assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id = $1', [id]))[0].estadoAprobacion, 'DEVUELTO');
    await invalidateEditedEvidence(db, id, ['tel_celular'], 'EDITOR');
    await reviewBlock(id, 'CONTACTO', 'EDITOR');
    assert.equal((await block('CONTACTO')).estado, 'Aprobado');
    assert.equal((await block('CONTACTO')).cargado_por, 'EDITOR');
    assert.equal((await block('CONTACTO')).revisado_por, 'EDITOR');
    checks.push('Contacto sin archivos: revisión opcional, devolución con motivo, corrección y control de versión');

    // Repeat corrections on every documentary block. Decisions from previous PDFs must never carry forward.
    for (const code of ['IDENTIDAD', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']) {
      const type = requiredEvidence(code, { maestria: 'Maestría de prueba' })[0][0];
      for (let cycle = 0; cycle < 2; cycle++) {
        await reviewBlock(id, code, 'REVISOR', `Corrija el archivo, ciclo ${cycle + 1}.`);
        const previous = await support(type);
        await documents.replace(id, previous.documento_perfil_id, file, 'CARGADOR');
        assert.equal((await support(type)).estado, 'Pendiente');
        assert.equal((await block(code)).estado, 'En revisión');
        assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id = $1', [id]))[0].estadoAprobacion, 'PENDIENTE_APROBACION');
        await assert.rejects(reviewBlockRaw(id, code, 'REVISOR'), /Valide individualmente/);
        const actor = cycle === 0 ? 'REVISOR' : 'CARGADOR';
        await review(type, 'Aprobado', undefined, actor);
        await reviewBlock(id, code, actor);
        assert.equal((await block(code)).estado, 'Aprobado');
        assert.equal((await query('SELECT "estadoAprobacion" FROM academic_work_plan."Docente" WHERE id = $1', [id]))[0].estadoAprobacion, 'ACTIVO_RUND');
      }
    }
    checks.push('Dos ciclos por sección documental: aprobación por otro revisor y por el mismo cargador');
    third = (await documents.list(id)).find(document => document.tipoSoporte === 'documento_identidad');
    checks.push('Activación de cinco bloques con decisión humana de sus datos; soportes opcionales');
    const oldFormationVersion = Number((await block('FORMACION')).version);
    await invalidateEditedEvidence(db, id, ['maestria'], 'EDITOR', '127.0.0.1');
    const degree = await support('diploma_maestria');
    await assert.rejects(workflow.reviewSupport(id, 'FORMACION', degree.id, { estado: 'Aprobado', documentoVersionId: degree.documento_perfil_id, blockVersion: oldFormationVersion }, 'REVISOR'), /espacio cambió/);
    assert.equal((await support('diploma_maestria')).estado, 'Pendiente');
    assert.equal((await block('FORMACION')).estado, 'En revisión');
    assert.equal((await block('IDENTIDAD')).estado, 'Aprobado');
    await assert.rejects(reviewBlockRaw(id, 'FORMACION', 'REVISOR'), /Valide individualmente/);
    for (const type of ['diploma_pregrado', 'hoja_vida_pro', 'diploma_maestria']) await review(type);
    await reviewBlock(id, 'FORMACION', 'REVISOR');
    checks.push('Editar datos reabre únicamente los bloques afectados y exige nueva revisión de sus soportes');
    await review('contrato', 'Rechazado', 'Contrato de otra persona.');
    assert.equal((await support('resolucion_convocatoria')).estado, 'Aprobado');
    await reviewBlock(id, 'ACADEMICO', 'REVISOR');
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
    const incorporation = new RundIncorporacion(db);
    const contractSupport = await support('acto_administrativo_vinculacion');
    const incorporationData = { numeroContrato: 'CONTRATO FICTICIO 2026', fechaContratacion: '2026-02-01', fechaFin: '2026-12-31',
      soporteId: contractSupport.id, documentoVersionId: contractSupport.documento_perfil_id,
      blockVersion: Number((await block('VINCULACION')).version), justificacion: 'Registro de prueba con soporte vigente.' };
    await assert.rejects(incorporation.save(id, { ...incorporationData, escalafon: 'Titular' }, 'INCORPORADOR'), /solo permite/);
    await incorporation.save(id, incorporationData, 'INCORPORADOR');
    const [incorporated] = await query('SELECT * FROM academic_work_plan."Docente" WHERE id=$1', [id]);
    assert.equal(incorporated.actoAdministrativoVinculacion, incorporationData.numeroContrato);
    assert.equal(incorporated.escalafon, 'Asociado');
    assert.equal((await block('VINCULACION')).estado, 'En revisión');
    assert.equal((await block('FORMACION')).estado, 'Aprobado');
    await assert.rejects(incorporation.save(id, incorporationData, 'INCORPORADOR'), /vinculación cambió/);
    await assert.rejects(reviewBlockRaw(id, 'VINCULACION', 'INCORPORADOR'), /Valide individualmente/);
    checks.push('Incorporación acotada a contrato/fechas con soporte y versión; no cambia categoría y exige revisar las filas de nuevo');
    const identityHistoryCount = (await documents.list(id, 'IDENTIDAD', true)).length;
    await documents.remove(id, third.id, 'CARGADOR');
    assert.equal(await support('documento_identidad'), undefined);
    assert.equal((await block('IDENTIDAD')).estado, 'Soporte faltante');
    assert.equal((await documents.list(id, 'IDENTIDAD', true)).length, identityHistoryCount);
    assert(files.has(`${third.documentoLogicoId}/v${third.version}.pdf`));
    await assert.rejects(documents.content(id, third.id, { actorId: 'REVISOR', fullAccess: true, roles: [] }), /eliminado/);
    const logs = await query('SELECT * FROM academic_work_plan."RundAprobacionLog" WHERE docente_id = $1', [id]);
    assert(logs.some(l => l.accion === 'DEVOLVER_SOPORTE' && l.metadata.documentoVersionId === first.id));
    for (const action of ['APROBAR_SOPORTE', 'DEVOLVER_SOPORTE', 'APROBAR', 'DEVOLVER']) {
      assert(logs.some(l => l.accion === action && l.actor_id === 'CARGADOR'), `Missing uploader audit: ${action}`);
    }
    assert(logs.every(l => l.actor_id && l.createdAt));
    checks.push('Eliminación lógica, versiones conservadas y trazabilidad de actor/fecha/decisión');
    // An old document-wide approval cannot become approvals of every row.
    await query(`UPDATE academic_work_plan."RundSoporteCampo" SET estado = 'Aprobado', revisiones_campos = '{}'::jsonb WHERE docente_id = $1 AND tipo_soporte = 'contrato'`, [id]);
    await query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = 'Aprobado' WHERE docente_id::text = $1 AND bloque = 'VINCULACION'`, [id]);
    const beforeAcademic = await block('ACADEMICO');
    const migration = require('node:fs').readFileSync(path.resolve(__dirname, '../db/migrations/430_rund_individual_row_reviews.sql'), 'utf8').replaceAll('academic_work_plan.', 'pg_temp.');
    await client.query(migration);
    assert.equal((await support('contrato')).estado, 'Pendiente');
    assert.equal((await block('VINCULACION')).estado, 'En revisi\u00f3n');
    const [summary] = await query('SELECT completitud FROM academic_work_plan."Docente" WHERE id = $1', [id]);
    assert.equal(summary.completitud.VINCULACION, 'En revisi\u00f3n');
    assert.deepEqual(await block('ACADEMICO'), beforeAcademic);
    assert.equal((await client.query(migration))[1].rowCount, 0);
    checks.push('Migraci\u00f3n idempotente: reabre aprobaciones compartidas antiguas y conserva los otros bloques');
    console.log(JSON.stringify({ success: true, isolatedTemporaryTables: true, checks, auditEntries: logs.length }, null, 2));
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
