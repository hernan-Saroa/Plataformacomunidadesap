/* Escritor de identidad por API de Auth (upsertDocente real) dentro del clúster ficticio de la cadena de commit nativo.
 * RUND corre en una base SIN esquema auth: toda identidad pasa por la API de Auth real (compilada) y el diario durable.
 * Debe ejecutarse al final de la cadena: el recuperador también actúa sobre intenciones que dejaron otras comprobaciones.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyIdentityWriteViaAuth(pgConfig, runtime, check, ctx) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { admin, ds, coord, native, banco, client, authFixture, database, data, snapshot, identities, trigger } = ctx;
  const rund = path.join(__dirname, '../backend/rund-service');
  const dep = name => require(path.join(rund, 'node_modules', name));
  const compiled = name => require(path.join(rund, 'dist', name));
  const { AuthIdentityExecutionService, AuthIdentityAbortProofController } = compiled('common/auth-identity-execution.service');
  const { AuthIdentityCompensationService } = compiled('common/auth-identity-compensation.service');
  const { AuthIdentityCompensationClient } = compiled('common/auth-identity-compensation.client');
  const { RundIdentityWriteViaAuth, RundIdentityWriteRecovery } = compiled('common/rund-identity-write.module');
  const { InternalServiceGuard } = compiled('internal/internal-service.guard');
  const { ServiceUnavailableException, BadRequestException } = dep('@nestjs/common');

  const execution = new AuthIdentityExecutionService(ds, coord, native, client);
  const compensation = new AuthIdentityCompensationService(ds, new AuthIdentityCompensationClient());
  const writer = new RundIdentityWriteViaAuth(execution, compensation);
  const recovery = () => new RundIdentityWriteRecovery(ds, writer);
  const savedEnv = { flag: process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API, token: process.env.INTERNAL_SERVICE_TOKEN };
  const originalApply = client.aplicar.bind(client), originalMail = banco.sendWelcomeEmail, originalRef = banco.moduleRef;
  let applyCalls = 0, failApply = 0, failAfterApply = 0, mails = [], writes = 0, proof;
  const realWrite = writer.write.bind(writer);
  writer.write = async (...args) => { writes++; return realWrite(...args); };
  client.aplicar = async (...args) => {
    applyCalls++;
    if (failApply > 0) { failApply--; throw new ServiceUnavailableException('Auth no disponible (fixture)'); }
    const receipt = await originalApply(...args);
    if (failAfterApply > 0) { failAfterApply--; throw new ServiceUnavailableException('Respuesta de Auth perdida (fixture)'); }
    return receipt;
  };
  banco.sendWelcomeEmail = async (...args) => { mails.push(args); return { sent: false, fixture: true }; };
  banco.moduleRef = { get: () => writer };
  const optionsFor = (item, extra = {}) => ({ bulkImport: true, preserveTerritorial: true, territoriales: [],
    audit: { actorId: item.command.actorId, canalOrigen: 'MASIVO', metadata: { fuente: 'FICTICIA' } }, ...extra });
  const authPerson = async document => (await database.query('SELECT * FROM auth.personas WHERE num_identificacion=$1', [document])).rows;
  const profiles = async personaId => (await admin.query('SELECT * FROM rund."Docente" WHERE "personaId"=$1', [personaId])).rows;
  const intents = async () => (await admin.query(`SELECT e.intencion_id,e.decision,n.estado AS nativo,j.estado AS auth FROM rund.identidad_ejecucion e
    JOIN rund.identidad_contexto_nativo n USING (intencion_id) JOIN rund.identidad_operacion j USING (intencion_id) ORDER BY e.preparada_en`)).rows;
  const newIntents = async before => { const known = new Set(before.map(r => r.intencion_id)); return (await intents()).filter(r => !known.has(r.intencion_id)); };
  const business = async () => Object.fromEntries(Object.entries(await snapshot()).filter(([table]) => !table.startsWith('identidad_')));
  let created, createdItem;

  try {
    process.env.INTERNAL_SERVICE_TOKEN = process.env.AUTH_INTERNAL_SERVICE_TOKEN;
    const { Module } = dep('@nestjs/common'), { NestFactory } = dep('@nestjs/core');
    class ProofFixture {}
    Module({ controllers: [AuthIdentityAbortProofController], providers: [InternalServiceGuard, { provide: AuthIdentityExecutionService, useValue: execution }] })(ProofFixture);
    proof = await NestFactory.create(ProofFixture, { logger: false, abortOnError: false });
    await proof.listen(0, '127.0.0.1'); authFixture.setAbortProofUrl(await proof.getUrl()); authFixture.setCompensationEnabled(true);
    process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'true';

    await check('Escritura por Auth: un alta masiva crea identidad por API y perfil nativo en un commit, sin esquema auth en RUND', async () => {
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema, null);
      createdItem = data(); const before = await intents();
      created = await banco.upsertDocente(createdItem.input.rawPayload, optionsFor(createdItem));
      assert.equal(created.action, 'insert'); assert.equal(created.authUserCreated, true);
      const persons = await authPerson(createdItem.command.payload.documentNumber); assert.equal(persons.length, 1);
      const rows = await profiles(created.personaId); assert.equal(rows.length, 1); assert.equal(rows[0].personaId, persons[0].id_person);
      const [intent] = await newIntents(before); assert.deepEqual([intent.decision, intent.nativo, intent.auth], ['EN_CURSO', 'CONFIRMADA', 'AUTH_APLICADA']);
      assert.equal((await admin.query('SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1', [rows[0].id])).rows.length, 1);
      assert.equal(mails.length, 1, 'el correo de bienvenida sigue saliendo después del commit, como antes'); assert.equal(created.welcomeEmail.fixture, true);
    });

    await check('Escritura por Auth: editar un perfil existente actualiza sin duplicar persona, perfil ni correo de bienvenida', async () => {
      const item = data({ DOCUMENTO_IDENTIDAD: createdItem.command.payload.documentNumber, CORREO_INSTITUCIONAL: createdItem.command.emailFinal, OBSERVACIONES: 'OBSERVACION EDITADA POR AUTH' });
      mails = []; const result = await banco.upsertDocente(item.input.rawPayload, optionsFor(item));
      assert.equal(result.action, 'update'); assert.equal(mails.length, 0);
      assert.equal((await authPerson(createdItem.command.payload.documentNumber)).length, 1);
      const rows = await profiles(created.personaId); assert.equal(rows.length, 1); assert.match(rows[0].observaciones, /OBSERVACION EDITADA POR AUTH/);
    });

    await check('Escritura por Auth: rechazo de negocio (ya existe) conserva la atomicidad de antes: Auth restaura la identidad', async () => {
      const original = (await authPerson(createdItem.command.payload.documentNumber))[0], beforeIntents = await intents(), beforeBusiness = await business();
      const item = data({ DOCUMENTO_IDENTIDAD: createdItem.command.payload.documentNumber, CORREO_INSTITUCIONAL: createdItem.command.emailFinal, NOMBRE_COMPLETO: 'NOMBRE DISTINTO QUE DEBE REVERTIRSE' });
      await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item, { rejectExisting: true })), error => error instanceof BadRequestException);
      const after = (await authPerson(createdItem.command.payload.documentNumber))[0];
      assert.equal(after.nom_largo, original.nom_largo); assert.deepEqual(await business(), beforeBusiness);
      const [intent] = await newIntents(beforeIntents); assert.equal(intent.decision, 'ABORTADA'); assert.equal(intent.nativo, 'PREPARADA');
      assert.equal((await execution.consultar(intent.intencion_id)).resolucionAuth.estado, 'COMPENSADA');
    });

    await check('Escritura por Auth: si Auth no responde, la solicitud falla y la intención se CANCELA (no se cumple después con un comando viejo)', async () => {
      const item = data(), beforeIntents = await intents(); failApply = 1;
      await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item)), error => error.getStatus?.() === 503);
      assert.equal((await authPerson(item.command.payload.documentNumber)).length, 0);
      const [intent] = await newIntents(beforeIntents); assert.deepEqual([intent.decision, intent.nativo], ['EN_CURSO', 'PREPARADA']);
      const result = await recovery().recover(500, 0); assert(result.cancelled >= 1);
      const current = await execution.consultar(intent.intencion_id); assert.equal(current.decisionNativa, 'ABORTADA'); assert.equal(current.estadoAuth, 'CANCELADA');
      assert.equal((await authPerson(item.command.payload.documentNumber)).length, 0); assert.equal((await recovery().recover(500, 0)).resumed, 0);
      const retry = await banco.upsertDocente(item.input.rawPayload, optionsFor(item)); assert.equal(retry.action, 'insert');
      assert.equal((await authPerson(item.command.payload.documentNumber)).length, 1); assert.equal((await profiles(retry.personaId)).length, 1);
    });

    await check('Escritura por Auth: respuesta de Auth perdida tras aplicar una edición: el recuperador cancela, detecta que se aplicó y la compensa', async () => {
      const before = (await authPerson(createdItem.command.payload.documentNumber))[0], beforeBusiness = await business(), beforeIntents = await intents();
      const item = data({ DOCUMENTO_IDENTIDAD: createdItem.command.payload.documentNumber, CORREO_INSTITUCIONAL: createdItem.command.emailFinal, NOMBRE_COMPLETO: 'NOMBRE CUYA RESPUESTA SE PERDIO' }); failAfterApply = 1;
      await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item)), error => error.getStatus?.() === 503);
      assert.equal((await authPerson(createdItem.command.payload.documentNumber))[0].nom_largo, 'NOMBRE CUYA RESPUESTA SE PERDIO');
      const [intent] = await newIntents(beforeIntents); await recovery().recover(500, 0);
      assert.equal((await authPerson(createdItem.command.payload.documentNumber))[0].nom_largo, before.nom_largo);
      const current = await execution.consultar(intent.intencion_id); assert.equal(current.decisionNativa, 'ABORTADA'); assert.equal(current.resolucionAuth.estado, 'COMPENSADA');
      assert.deepEqual(await business(), beforeBusiness);
    });

    await check('Escritura por Auth: una intención que nunca llegó a Auth y quedó detenida se cancela; no crea identidad ni perfil', async () => {
      const item = data(); await execution.preparar(item.id, item.command, item.input);
      const result = await recovery().recover(500, 0); assert(result.cancelled >= 1);
      const current = await execution.consultar(item.id);
      assert.equal(current.decisionNativa, 'ABORTADA'); assert.equal(current.estadoAuth, 'CANCELADA'); assert.equal(current.estadoNativo, 'PREPARADA');
      assert.equal((await authPerson(item.command.payload.documentNumber)).length, 0);
    });

    await check('Escritura por Auth: fallo técnico tras aplicar en Auth no repite la aplicación; el recuperador solo completa el perfil', async () => {
      const item = data(), beforeIntents = await intents();
      await trigger('RundAprobacionLog', 'INSERT', async () => {
        await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item)), /FALLO FICTICIO NATIVO/);
      });
      const [intent] = await newIntents(beforeIntents); assert.deepEqual([intent.decision, intent.nativo, intent.auth], ['EN_CURSO', 'PREPARADA', 'AUTH_APLICADA']);
      assert.equal((await authPerson(item.command.payload.documentNumber)).length, 1);
      const calls = applyCalls, result = await recovery().recover(500, 0);
      assert(result.resumed >= 1); assert.equal(applyCalls, calls, 'la identidad no se aplica por segunda vez');
      assert.equal((await intents()).find(r => r.intencion_id === intent.intencion_id).nativo, 'CONFIRMADA');
      assert.equal((await profiles((await authPerson(item.command.payload.documentNumber))[0].id_person)).length, 1);
    });

    await check('Escritura por Auth: dos recuperadores a la vez sobre la misma intención dejan un solo perfil y una sola auditoría', async () => {
      const item = data(), beforeIntents = await intents();
      await trigger('RundAprobacionLog', 'INSERT', async () => { await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item)), /FALLO FICTICIO NATIVO/); });
      const [intent] = await newIntents(beforeIntents);
      await Promise.allSettled([recovery().recover(500, 0), recovery().recover(500, 0)]);
      assert.equal((await intents()).find(r => r.intencion_id === intent.intencion_id).nativo, 'CONFIRMADA');
      const personaId = (await authPerson(item.command.payload.documentNumber))[0].id_person, rows = await profiles(personaId);
      assert.equal(rows.length, 1); assert.equal((await admin.query('SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1', [rows[0].id])).rows.length, 1);
    });

    await check('Escritura por Auth: un rechazo de negocio descubierto al reanudar (soporte rechazado) revierte la identidad en Auth', async () => {
      const personaBefore = (await authPerson(createdItem.command.payload.documentNumber))[0], docente = (await profiles(created.personaId))[0];
      const item = data({ DOCUMENTO_IDENTIDAD: createdItem.command.payload.documentNumber, CORREO_INSTITUCIONAL: createdItem.command.emailFinal, NOMBRE_COMPLETO: 'NOMBRE QUE DEBE REVERTIRSE AL REANUDAR', OBSERVACIONES: 'CAMBIO PENDIENTE' });
      const support = randomUUID();
      item.input.options.audit.requiredSupport = { id: support, type: 'soporte_edicion_perfil', docenteId: docente.id };
      await admin.query(`INSERT INTO rund."RundSoporteCampo" (id,docente_id,bloque,tipo_soporte,documento_carpeta_id,estado) VALUES ($1,$2,'GENERAL','soporte_edicion_perfil',$3,'Pendiente')`, [support, docente.id, randomUUID()]);
      await execution.preparar(item.id, item.command, item.input);
      await coord.registrarEnAuth(item.id); const local = await coord.consultar(item.id);
      await originalApply(local.operacionAuthId, item.command); await coord.reconciliar(item.id);
      assert.notEqual((await authPerson(createdItem.command.payload.documentNumber))[0].nom_largo, personaBefore.nom_largo);
      await admin.query(`UPDATE rund."RundSoporteCampo" SET estado='Rechazado' WHERE id=$1`, [support]);
      const beforeBusiness = await business(); await recovery().recover(500, 0);
      assert.equal((await authPerson(createdItem.command.payload.documentNumber))[0].nom_largo, personaBefore.nom_largo);
      const current = await execution.consultar(item.id); assert.equal(current.decisionNativa, 'ABORTADA'); assert.equal(current.resolucionAuth.estado, 'COMPENSADA');
      assert.deepEqual(await business(), beforeBusiness);
    });

    await check('Escritura por Auth: vista previa, transacción externa, contexto incompatible o bandera apagada usan el escritor anterior', async () => {
      const item = data(), writesBefore = writes, beforeIntents = await intents();
      const legacy = /auth\.personas|relation.*auth|does not exist|no existe/i;
      await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item, { outerManager: ds.manager })), legacy);
      const noAudit = optionsFor(item); delete noAudit.audit;
      await assert.rejects(banco.upsertDocente(item.input.rawPayload, noAudit), legacy);
      process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'false';
      try { await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item)), legacy); }
      finally { process.env.RUND_IDENTITY_WRITE_VIA_AUTH_API = 'true'; }
      assert.equal(writes, writesBefore, 'el escritor por Auth no se invocó'); assert.deepEqual(await newIntents(beforeIntents), []);
      assert.equal((await authPerson(item.command.payload.documentNumber)).length, 0);
    });

    await check('Escritura por Auth: sin el módulo registrado se conserva el escritor anterior aunque la bandera esté activa', async () => {
      banco.moduleRef = { get: () => { throw new Error('no registrado'); } };
      try { const item = data(); await assert.rejects(banco.upsertDocente(item.input.rawPayload, optionsFor(item)), /auth\.personas|relation|does not exist|no existe/i); }
      finally { banco.moduleRef = { get: () => writer }; }
    });
  } finally {
    client.aplicar = originalApply; banco.sendWelcomeEmail = originalMail; banco.moduleRef = originalRef;
    for (const [key, value] of Object.entries({ RUND_IDENTITY_WRITE_VIA_AUTH_API: savedEnv.flag, INTERNAL_SERVICE_TOKEN: savedEnv.token })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (proof) await proof.close();
  }
};
