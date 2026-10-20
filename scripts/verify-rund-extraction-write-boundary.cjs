/* Se invoca exclusivamente desde el clúster temporal de integración. Auth y RUND
 * tienen bases distintas; el rol de RUND solo accede a su esquema. Sin .env o SMTP. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyExtractionWriteBoundary(pgConfig, runtime, check, ctx) {
  assert.equal(pgConfig.host, '127.0.0.1'); assert.equal(pgConfig.database, 'rund_integration');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { admin, ds, banco, client, database, execution, recovery, trigger } = ctx;
  const root = path.join(__dirname, '../backend/rund-service');
  const compiled = name => require(path.join(root, 'dist', name));
  const { AuthIdentityClient } = compiled('common/auth-identity.client');
  const { BancoDocenteEntity } = compiled('entities/banco-docente.entity');
  const { RundExtraccionService } = compiled('modules/banco-docentes/rund-extraccion.service');
  const saved = { repo: banco.docenteRepo, identities: banco.identities, territoriales: banco.getTerritoriales, apply: client.aplicar };
  const createdItem = ctx.data({ DOCUMENTO_IDENTIDAD: String(Date.now()) + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
    CORREO_INSTITUCIONAL: 'boundary-' + randomUUID() + '@esap.edu.co', VINCULACION: 'Ocasional', DEDICACION: 'TC' });
  const actorId = createdItem.command.actorId;
  Object.assign(createdItem.input.rawPayload, { canal_origen: 'MASIVO', cargadoPor: actorId });
  let created;
  const profile = async () => (await admin.query('SELECT * FROM rund."Docente" WHERE id=$1', [created.docenteId])).rows[0];
  const person = async () => (await database.query(`SELECT id_person::text AS "personaId",num_identificacion,tip_identificacion,
    nom_largo,gen_tercero,fec_nacimiento::text AS fec_nacimiento FROM auth.personas WHERE id_person=$1`, [created.personaId])).rows[0];
  const suggestions = async ids => (await admin.query('SELECT id,estado,valor_confirmado FROM rund."RundExtraccionSugerencia" WHERE id=ANY($1::uuid[]) ORDER BY id', [ids])).rows;
  const journals = async () => (await admin.query('SELECT intencion_id FROM rund.identidad_contexto_nativo ORDER BY preparada_en')).rows.map(row => row.intencion_id);
  const newJournal = async previous => { const added = (await journals()).filter(id => !previous.includes(id)); assert.equal(added.length, 1); return added[0]; };
  async function fixture(fields) {
    const d = await profile(), p = await person(), documentId = randomUUID();
    await admin.query(`INSERT INTO rund."RundDocumentoPerfil" (id,documento_logico_id,docente_id,categoria_codigo,nombre_archivo,
      mime_type,tamano_bytes,checksum_sha256,proveedor_almacenamiento,almacenamiento_ruta,creado_por)
      VALUES ($1,$2,$3,'IDENTIDAD','fixture.pdf','application/pdf',1,$4,'LOCAL','fixture.pdf',$5)`,
      [documentId, randomUUID(), d.id, '0'.repeat(64), actorId]);
    const [job] = (await admin.query(`INSERT INTO rund."RundExtraccionTrabajo" (documento_id,docente_id,creado_por,estado)
      VALUES ($1,$2,$3,'COMPLETADO') RETURNING id`, [documentId, d.id, actorId])).rows;
    const ids = [];
    for (const [field, value] of Object.entries(fields)) {
      const previous = field === 'nombreCompleto' ? p.nom_largo : d[field];
      const [row] = (await admin.query(`INSERT INTO rund."RundExtraccionSugerencia"
        (trabajo_id,campo,valor,valor_previo,pagina,evidencia,confianza,baja_confianza)
        VALUES ($1,$2,$3,$4,1,'Evidencia ficticia',0.95,false) RETURNING id`, [job.id, field, value, previous])).rows;
      ids.push(row.id);
    }
    const support = randomUUID();
    await admin.query(`INSERT INTO rund."RundSoporteCampo" (id,docente_id,bloque,tipo_soporte,documento_carpeta_id,estado)
      VALUES ($1,$2,'GENERAL','soporte_edicion_perfil',$3,'Pendiente')`, [support, d.id, randomUUID()]);
    const body = { ...createdItem.input.rawPayload, canal_origen: 'MODAL', cargadoPor: actorId, actorId,
      NOMBRE_COMPLETO: fields.nombreCompleto || p.nom_largo, nombreCompleto: fields.nombreCompleto || p.nom_largo,
      TITULO_PREGRADO: fields.pregrado || d.pregrado, pregrado: fields.pregrado || d.pregrado,
      territorialNombre: d.territorialReportada, estado: d.estado, periodoCarga: d.periodoCarga,
      soporteEdicionId: support, justificacionEdicion: 'Revisión de originales ficticios', rundSuggestionIds: ids,
      rundSensitiveAccess: { actorId, roles: ['SUPER_ADMIN'], fullAccess: true, endpoint: 'EDICION_FIXTURE' } };
    return { d, p, ids, documentId, body };
  }
  async function aroundApply(hook, work) {
    const real = client.aplicar;
    client.aplicar = async (...args) => hook(() => real.apply(client, args));
    try { return await work(); } finally { client.aplicar = real; }
  }
  const assertPending = async ids => (await suggestions(ids)).forEach(s => assert.equal(s.estado, 'PENDIENTE'));
  try {
    created = await banco.upsertDocente(createdItem.input.rawPayload, { bulkImport: true, preserveTerritorial: true, territoriales: [],
      audit: { actorId, canalOrigen: 'MASIVO' } });
    banco.docenteRepo = ds.getRepository(BancoDocenteEntity); banco.identities = new AuthIdentityClient(); banco.getTerritoriales = async () => [];

    await check('Frontera SQL: confirmar pregrado con RUND sin esquema auth mantiene valor, sugerencia y auditoría', async () => {
      const f = await fixture({ pregrado: 'Ingeniería de Sistemas' });
      const service = new RundExtraccionService(ds, {}, {});
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS owner"))[0].owner, null);
      await service.confirm(created.docenteId, f.ids[0], { actorId, roles: ['SUPER_ADMIN'], fullAccess: true });
      assert.equal((await profile()).pregrado, 'Ingeniería de Sistemas'); assert.equal((await suggestions(f.ids))[0].estado, 'APROBADA');
      assert.deepEqual(await person(), f.p);
    });

    await check('Frontera SQL: edición con sugerencias de nombre y pregrado usa Auth por HTTP y confirma todo en RUND', async () => {
      const f = await fixture({ nombreCompleto: 'ANA NOMBRE REVISADO', pregrado: 'Derecho Administrativo' }), before = await journals();
      await banco.updateDocente(created.docenteId, f.body);
      assert.equal((await person()).nom_largo, f.body.nombreCompleto); assert.equal((await profile()).pregrado, f.body.pregrado);
      (await suggestions(f.ids)).forEach(s => assert.equal(s.estado, 'APROBADA'));
      const current = await execution.consultar(await newJournal(before)); assert.equal(current.estadoNativo, 'CONFIRMADA');
    });

    await check('Frontera SQL: cambio concurrente en Auth rechaza la edición sin sobrescribirlo ni aprobar sugerencias', async () => {
      const f = await fixture({ nombreCompleto: 'ANA PROPUESTA OBSOLETA' }), before = await journals();
      await aroundApply(async apply => { await database.query('UPDATE auth.personas SET nom_largo=$2 WHERE id_person=$1', [created.personaId, 'CAMBIO CONCURRENTE AUTH']); return apply(); }, async () => {
        await assert.rejects(banco.updateDocente(created.docenteId, f.body), e => e.getStatus?.() === 409);
      });
      assert.equal((await person()).nom_largo, 'CAMBIO CONCURRENTE AUTH'); assert.deepEqual(await profile(), f.d); await assertPending(f.ids);
      const current = await execution.consultar(await newJournal(before)); assert.equal(current.decisionNativa, 'ABORTADA'); assert.equal(current.estadoAuth, 'CANCELADA');
    });

    await check('Frontera SQL: PDF reemplazado tras aplicar Auth aborta y compensa la identidad sin aprobar sugerencias', async () => {
      const f = await fixture({ nombreCompleto: 'ANA PDF YA REEMPLAZADO' }), before = await journals();
      await aroundApply(async apply => { const receipt = await apply(); await admin.query(`UPDATE rund."RundDocumentoPerfil" SET estado='REEMPLAZADO' WHERE id=$1`, [f.documentId]); return receipt; }, async () => {
        await assert.rejects(banco.updateDocente(created.docenteId, f.body), e => e.getStatus?.() === 409);
      });
      assert.deepEqual(await person(), f.p); assert.deepEqual(await profile(), f.d); await assertPending(f.ids);
      assert.equal((await execution.consultar(await newJournal(before))).resolucionAuth.estado, 'COMPENSADA');
    });

    await check('Frontera SQL: cambio nativo posterior se conserva y provoca compensación Auth de la edición obsoleta', async () => {
      const f = await fixture({ nombreCompleto: 'ANA CAMBIO QUE SE REVIERTE', pregrado: 'Título propuesto' }), before = await journals();
      await aroundApply(async apply => { const receipt = await apply(); await admin.query('UPDATE rund."Docente" SET pregrado=$2 WHERE id=$1', [created.docenteId, 'Título concurrente']); return receipt; }, async () => {
        await assert.rejects(banco.updateDocente(created.docenteId, f.body), e => e.getStatus?.() === 409);
      });
      assert.deepEqual(await person(), f.p); assert.equal((await profile()).pregrado, 'Título concurrente'); await assertPending(f.ids);
      assert.equal((await execution.consultar(await newJournal(before))).resolucionAuth.estado, 'COMPENSADA');
    });

    await check('Frontera SQL: fallo técnico nativo revierte perfil y sugerencias; recuperador confirma una sola vez con contexto congelado', async () => {
      const f = await fixture({ nombreCompleto: 'ANA EDICION RECUPERADA', pregrado: 'Título recuperado' }), before = await journals();
      await trigger('RundAprobacionLog', 'INSERT', async () => {
        await assert.rejects(banco.updateDocente(created.docenteId, f.body), /FALLO FICTICIO NATIVO/);
      });
      const intent = await newJournal(before); assert.deepEqual(await profile(), f.d); await assertPending(f.ids);
      assert.equal((await execution.consultar(intent)).estadoAuth, 'AUTH_APLICADA');
      await recovery.recover(500, 0);
      assert.equal((await execution.consultar(intent)).estadoNativo, 'CONFIRMADA');
      (await suggestions(f.ids)).forEach(s => assert.equal(s.estado, 'APROBADA'));
      const count = (await admin.query(`SELECT count(*)::int AS n FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND soporte_id=$2`, [created.docenteId, f.body.soporteEdicionId])).rows[0].n;
      assert.equal(count, 1); await recovery.recover(500, 0);
      assert.equal((await admin.query(`SELECT count(*)::int AS n FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND soporte_id=$2`, [created.docenteId, f.body.soporteEdicionId])).rows[0].n, 1);
    });

    await check('Frontera SQL: revisiones simultáneas de las mismas sugerencias producen una única edición confirmada', async () => {
      const f = await fixture({ nombreCompleto: 'ANA REVISION UNICA', pregrado: 'Título de revisión única' });
      const results = await Promise.allSettled([banco.updateDocente(created.docenteId, f.body), banco.updateDocente(created.docenteId, f.body)]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      (await suggestions(f.ids)).forEach(s => assert.equal(s.estado, 'APROBADA'));
      assert.equal((await admin.query(`SELECT count(*)::int AS n FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND soporte_id=$2`, [created.docenteId, f.body.soporteEdicionId])).rows[0].n, 1);
      assert.equal((await person()).nom_largo, f.body.nombreCompleto);
    });

    await check('Frontera SQL: lote definitivo usa el actor servidor aunque la fila declare otro canal o cargador', async () => {
      const documentNumber = String(Date.now()) + '88';
      const result = await banco.bulkUpsert([{ ...createdItem.input.rawPayload, DOCUMENTO_IDENTIDAD: documentNumber,
        CORREO_INSTITUCIONAL: 'bulk-' + randomUUID() + '@example.test', cargadoPor: 'NO_CONFIAR', canal_origen: 'OTRO' }],
        { actorId, support: { fileName: 'fixture.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          content: Buffer.from('Archivo ficticio del test'), justificacion: 'Lote de prueba' } });
      assert.equal(result.errors, 0); assert.equal(result.created, 1);
      const rows = (await admin.query(`SELECT actor_id,canal_origen FROM rund."RundAprobacionLog" WHERE docente_id=$1`, [result.results[0].docenteId])).rows;
      assert.equal(rows.length, 1); assert.equal(rows[0].actor_id, actorId); assert.equal(rows[0].canal_origen, 'MASIVO');
    });

    await check('Frontera SQL: autogestión parcial sin período conserva el contrato anterior y usa el coordinador, sin SQL Auth', async () => {
      const actor = 'AUTOGESTION:' + randomUUID(), marker = randomUUID();
      const result = await banco.upsertDocente({ documentNumber: String(Date.now()) + '99', nombreCompleto: 'DOCENTE AUTOGESTION PARCIAL',
        correoInstitucional: 'partial-' + marker + '@example.test', canal_origen: 'AUTOGESTION', cargadoPor: actor, periodoCarga: '' },
        { relaxValidation: true, preserveTerritorial: true, territoriales: [], audit: { actorId: actor, canalOrigen: 'AUTOGESTION' } });
      assert.equal(result.action, 'insert');
      const row = (await admin.query('SELECT "periodoCarga" FROM rund."Docente" WHERE id=$1', [result.docenteId])).rows[0];
      assert.equal(row.periodoCarga, null);
      assert.equal((await database.query('SELECT count(*)::int AS n FROM auth.personas WHERE id_person=$1', [result.personaId])).rows[0].n, 1);
    });

    await check('Frontera SQL: autogestión sin período actualiza el perfil existente y conserva su período, sin duplicarlo', async () => {
      const previous = await profile(), actor = 'AUTOGESTION:' + randomUUID();
      const result = await banco.upsertDocente({ documentNumber: createdItem.command.payload.documentNumber, nombreCompleto: 'DOCENTE AUTOGESTION EXISTENTE',
        correoInstitucional: createdItem.command.emailFinal, canal_origen: 'AUTOGESTION', cargadoPor: actor, periodoCarga: '' },
        { relaxValidation: true, preserveTerritorial: true, territoriales: [], audit: { actorId: actor, canalOrigen: 'AUTOGESTION' } });
      assert.equal(result.docenteId, created.docenteId); assert.equal((await profile()).periodoCarga, previous.periodoCarga);
      assert.equal((await admin.query('SELECT count(*)::int AS n FROM rund."Docente" WHERE "personaId"=$1', [created.personaId])).rows[0].n, 1);
    });
  } finally {
    banco.docenteRepo = saved.repo; banco.identities = saved.identities; banco.getTerritoriales = saved.territoriales; client.aplicar = saved.apply;
  }
};
