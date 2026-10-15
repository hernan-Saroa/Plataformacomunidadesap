/* Destinatario de avisos: Auth real compilado, RUND sin SQL externo y receptor HTTP ficticio. */
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const { randomUUID } = require('node:crypto');
const previous = require('./fixtures/rund-ocr-recipient-before-api.cjs');

module.exports = async function verifyOcrRecipient(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, docenteId, authUrl, authFixture, authToken } = context;
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const compiled = file => require(path.join(serviceRoot, 'dist', file));
  const { DataSource } = require(path.join(serviceRoot, 'node_modules/typeorm'));
  const { AuthIdentityClient } = compiled('common/auth-identity.client');
  const { RundExtraccionNotificationsService } = compiled('modules/banco-docentes/rund-extraccion-notifications.service');
  const people = Array.from({ length: 5 }, () => randomUUID()), users = Array.from({ length: 6 }, () => randomUUID());
  const tag = randomUUID().slice(0, 8), profile = 'AVISO-' + randomUUID(), document = randomUUID();
  const names = ['Aviso-' + tag + '@example.test', 'Inactivo-' + tag, ' Legacy ' + tag + ' ', users[0], '', ' SinPersona-' + tag];
  const states = [true, false, null, true, true, true], role = 'recipient_' + randomUUID().replace(/-/g, '');
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'RUND_OCR_ENABLED', 'NOTIFICATIONS_SERVICE_URL', 'NOTIFICATION_SERVICE_URL'];
  const saved = keys.map(key => process.env[key]), workers = [], sources = [], attempts = [], delivered = new Map();
  let sink, roleCreated = false, deliveryMode = 'normal';
  const source = async (raw, status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(authUrl + '/internal/rund/v1/personas/destinatario-aviso', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(raw),
    });
    assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  const row = async id => (await database.query('SELECT * FROM rund."RundExtraccionTrabajo" WHERE id=$1', [id])).rows[0];
  const due = id => database.query(`UPDATE rund."RundExtraccionTrabajo" SET notificacion_proxima=now()-interval '1 second' WHERE id=$1`, [id]);
  const data = async () => {
    const result = {};
    for (const [schema, table] of [['auth', 'personas'], ['auth', 'user'], ['rund', 'Docente'], ['rund', 'RundDocumentoPerfil'], ['rund', 'RundExtraccionSugerencia']]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const unchangedJob = job => Object.fromEntries(Object.entries(job).filter(([key]) => !['notificado_en', 'notificacion_proxima'].includes(key)));
  const createJob = async (creator = users[0], state = 'COMPLETADO') => {
    // Aislar cada escenario sin esperar los aplazamientos reales de un minuto/un día.
    await database.query(`UPDATE rund."RundExtraccionTrabajo" SET notificacion_proxima=now()+interval '1 day'
      WHERE docente_id=$1 AND notificado_en IS NULL`, [profile]);
    return (await database.query(`INSERT INTO rund."RundExtraccionTrabajo" (documento_id,docente_id,creado_por,estado,intentos,perfil_base,motor)
      VALUES ($1,$2,$3,$4,2,'{"nombreCompleto":"DATOS PRIVADOS FICTICIOS"}','{"motor":"FICTICIO"}') RETURNING *`,
    [document, profile, creator, state])).rows[0];
  };
  try {
    for (let i = 0; i < people.length; i++) await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,fec_nacimiento)
      VALUES ($1,$2,'CC','AVISO FICTICIO','AVISO','FICTICIO','X','1980-01-17')`, [people[i], 'AVISO-DOC-' + tag + i]);
    for (let i = 0; i < users.length; i++) await database.query(`INSERT INTO auth."user"
      (id_user,username,password_hash,id_person,is_active) VALUES ($1,$2,'FICTICIO',$3,$4)`, [users[i], names[i], i === 5 ? null : people[i], states[i]]);
    await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga','2020-1'))).* FROM rund."Docente" d WHERE id=$3`, [profile, people[0], docenteId]);
    await database.query(`INSERT INTO rund."RundDocumentoPerfil" (id,documento_logico_id,docente_id,categoria_codigo,bloque,tipo_soporte,
      nombre_archivo,mime_type,tamano_bytes,checksum_sha256,proveedor_almacenamiento,almacenamiento_ruta,creado_por,"createdAt")
      VALUES ($1,$1,$2,'TITULOS','FORMACION','diploma_pregrado','aviso-ficticio.pdf','application/pdf',10,'FICTICIO','LOCAL',
        'rund-documentos/aviso-ficticio-no-leer.pdf',$3,'2000-01-01')`, [document, profile, users[0]]);
    await database.query(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA rund TO ${role};
      GRANT SELECT,UPDATE ON rund."RundExtraccionTrabajo" TO ${role}`); roleCreated = true;
    for (let i = 0; i < 2; i++) {
      const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
        password: pgConfig.password, database: pgConfig.database, synchronize: false, extra: { max: 1 } });
      sources.push(ds); await ds.initialize(); await ds.query('SET ROLE ' + role);
      for (const table of ['auth."user"', 'academic_work_plan."Persona"', 'rund."Docente"']) {
        await assert.rejects(ds.query('SELECT * FROM ' + table), /permission denied/);
      }
    }
    sink = http.createServer(async (req, res) => {
      try {
        assert.equal(req.url, '/notifications'); assert.equal(req.method, 'POST');
        assert.equal(req.headers.authorization, undefined); assert.equal(req.headers['x-internal-service-token'], undefined);
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); attempts.push(body);
        res.setHeader('Content-Type', 'application/json');
        if (deliveryMode === 'unavailable') { res.statusCode = 503; res.end('{}'); return; }
        const existing = delivered.get(body.clave_idempotencia);
        // Mismo alcance de clave+destinatario+tipo que notifications-service; sin crear avisos reales.
        if (existing && (existing.id_usuario_destinatario !== body.id_usuario_destinatario || existing.tipo_notificacion !== body.tipo_notificacion)) {
          res.statusCode = 409; res.end('{}'); return;
        }
        if (!existing) delivered.set(body.clave_idempotencia, body);
        res.statusCode = deliveryMode === 'lost-ack' ? 503 : 201; res.end('{}');
      } catch { res.statusCode = 500; res.end('{}'); }
    });
    await new Promise(resolve => sink.listen(0, '127.0.0.1', resolve));
    process.env.AUTH_SERVICE_URL = authUrl; process.env.AUTH_INTERNAL_SERVICE_TOKEN = authToken;
    process.env.NOTIFICATIONS_SERVICE_URL = 'http://127.0.0.1:' + sink.address().port; process.env.RUND_OCR_ENABLED = 'true';
    const identities = new AuthIdentityClient();
    for (const ds of sources) workers.push(new RundExtraccionNotificationsService(ds, identities));
    const [service, restarted] = workers;
    await check('Destinatario OCR: Auth exige token interno, devuelve proyección mínima sin caché y no escribe', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source({ clave: users[0] }, 401, headers);
      const before = await data(), { res, body } = await source({ clave: users[0] });
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(body.data, { consulta: users[0], encontrado: true, usuarioId: users[0] });
      for (const raw of [null, [], {}, { clave: null }, { clave: 1 }]) await source(raw, 400);
      assert.deepEqual(await data(), before);
    });
    await check('Destinatario OCR: UUID exacto, persona, username, espacios, estados nulos/inactivos y ausencia coinciden con SQL anterior', async () => {
      const publicId = (await database.query('SELECT public_id FROM auth."user" WHERE id_user=$1', [users[0]])).rows[0].public_id;
      for (const key of [...users, ...people, ...names, names[0].toUpperCase(), names[2].toUpperCase(), names[2].trim(),
        users[0].toUpperCase(), publicId, 'AVISO-DOC-' + tag + '0', 'AUSENTE-' + tag, ' ', "alias' OR true --"]) {
        assert.equal(await identities.destinatarioAviso(key), await previous.recipient(database, key));
      }
      assert.equal(await identities.destinatarioAviso(users[0]), users[0]);
      assert.equal(await identities.destinatarioAviso(names[2]), users[2]);
      assert.equal(await identities.destinatarioAviso(users[5]), users[5]);
    });
    await check('Destinatario OCR: COMPLETADO, ERROR y OBSOLETO conservan payload completo, privacidad y SQL solo de la cola', async () => {
      const before = await data();
      for (const state of ['COMPLETADO', 'ERROR', 'OBSOLETO']) {
        const pending = await createJob(people[2], state); const attemptCount = attempts.length;
        await service.tick(); assert((await row(pending.id)).notificado_en); assert.equal(attempts.length, attemptCount + 1);
        assert.deepEqual(attempts.at(-1), previous.payload(pending, users[2]));
        assert(!JSON.stringify(attempts.at(-1)).includes('DATOS PRIVADOS FICTICIOS'));
        assert.deepEqual(unchangedJob(await row(pending.id)), unchangedJob(pending));
      }
      assert.deepEqual(await data(), before);
    });
    await check('Destinatario OCR: caída, 404 y respuesta parcial de Auth dejan reintento corto sin envío ni análisis nuevo', async () => {
      const before = await data();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        const count = attempts.length;
        const pending = await createJob(); authFixture.setDestinatarioMode(mode); await service.tick();
        const current = await row(pending.id); assert.equal(current.notificado_en, null);
        const delay = current.notificacion_proxima.getTime() - Date.now(); assert(delay > 30000 && delay < 120000);
        assert.deepEqual(unchangedJob(current), unchangedJob(pending)); assert.equal(attempts.length, count);
        authFixture.setDestinatarioMode('normal'); await due(pending.id); await restarted.tick();
        assert((await row(pending.id)).notificado_en); assert.equal(attempts.at(-1).clave_idempotencia, pending.notificacion_id);
      } } finally { authFixture.setDestinatarioMode('normal'); }
      assert.deepEqual(await data(), before);
    });
    await check('Destinatario OCR: ausencia/inactivo confirmado aplaza un día y una cuenta reactivada se resuelve nuevamente', async () => {
      const before = attempts.length;
      for (const key of [users[1], people[1], 'AUSENTE-' + tag]) {
        const pending = await createJob(key); await service.tick(); const current = await row(pending.id);
        assert.equal(current.notificado_en, null); assert(current.notificacion_proxima.getTime() - Date.now() > 23 * 3600000);
        assert.deepEqual(unchangedJob(current), unchangedJob(pending));
      }
      assert.equal(attempts.length, before);
      const pending = await createJob(users[1]); await service.tick();
      await database.query('UPDATE auth."user" SET is_active=true WHERE id_user=$1', [users[1]]);
      try { await due(pending.id); await restarted.tick(); assert((await row(pending.id)).notificado_en); assert.equal(attempts.at(-1).id_usuario_destinatario, users[1]); }
      finally { await database.query('UPDATE auth."user" SET is_active=false WHERE id_user=$1', [users[1]]); }
    });
    await check('Destinatario OCR: receptor no disponible o acuse perdido reintenta la misma clave sin duplicar el aviso ficticio', async () => {
      for (const mode of ['unavailable', 'lost-ack']) {
        const pending = await createJob(), before = attempts.length, deliveredBefore = delivered.size;
        deliveryMode = mode; await service.tick(); assert.equal((await row(pending.id)).notificado_en, null);
        deliveryMode = 'normal'; await due(pending.id); await restarted.tick();
        assert((await row(pending.id)).notificado_en); assert.deepEqual(attempts[before], attempts[before + 1]);
        assert.equal(delivered.size, deliveredBefore + 1); assert.equal(attempts[before].clave_idempotencia, pending.notificacion_id);
      }
    });
    await check('Destinatario OCR: fallo al marcar notificado después del envío conserva clave y permite recuperación idempotente', async () => {
      const pending = await createJob(), before = attempts.length, deliveredBefore = delivered.size;
      await database.query(`CREATE FUNCTION rund.reject_recipient_ack() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.id='${pending.id}' AND NEW.notificado_en IS DISTINCT FROM OLD.notificado_en THEN RAISE EXCEPTION 'FALLO FICTICIO ACUSE';
        END IF; RETURN NEW; END $$; CREATE TRIGGER reject_recipient_ack BEFORE UPDATE ON rund."RundExtraccionTrabajo"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_recipient_ack()`);
      try { await service.tick(); } finally { await database.query('DROP TRIGGER reject_recipient_ack ON rund."RundExtraccionTrabajo"; DROP FUNCTION rund.reject_recipient_ack()'); }
      assert.equal((await row(pending.id)).notificado_en, null); assert.equal(delivered.size, deliveredBefore + 1);
      await due(pending.id); await restarted.tick(); assert((await row(pending.id)).notificado_en);
      assert.deepEqual(attempts[before], attempts[before + 1]); assert.equal(delivered.size, deliveredBefore + 1);
    });
    await check('Destinatario OCR: dos workers con conexiones independientes reservan y entregan un solo aviso', async () => {
      const pending = await createJob(), before = attempts.length, calls = authFixture.destinatarioRequestCount();
      await Promise.all([service.tick(), restarted.tick()]);
      assert((await row(pending.id)).notificado_en); assert.equal(attempts.length, before + 1);
      assert.equal(authFixture.destinatarioRequestCount(), calls + 1);
    });
    await check('Destinatario OCR: cambio de cuenta no usa caché ni reasigna una clave ya aceptada a otro destinatario', async () => {
      const alias = 'movido-' + tag;
      await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1', [users[0], alias]);
      try {
        const pending = await createJob(alias); deliveryMode = 'lost-ack'; await service.tick(); deliveryMode = 'normal';
        assert.equal(delivered.get(pending.notificacion_id).id_usuario_destinatario, users[0]);
        await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1', [users[0], names[0]]);
        await database.query('UPDATE auth."user" SET username=$2,is_active=true WHERE id_user=$1', [users[1], alias]);
        await due(pending.id); await restarted.tick(); assert.equal((await row(pending.id)).notificado_en, null);
        assert.equal(attempts.at(-1).id_usuario_destinatario, users[1]);
        assert.equal(delivered.get(pending.notificacion_id).id_usuario_destinatario, users[0]);
        await database.query('UPDATE auth."user" SET username=$2,is_active=false WHERE id_user=$1', [users[1], names[1]]);
        await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1', [users[0], alias]);
        await due(pending.id); await service.tick(); assert((await row(pending.id)).notificado_en);
      } finally {
        deliveryMode = 'normal';
        await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1', [users[0], names[0]]);
        await database.query('UPDATE auth."user" SET username=$2,is_active=false WHERE id_user=$1', [users[1], names[1]]);
      }
    });
    await check('Destinatario OCR: OCR apagado y trabajos pendientes no consultan Auth ni envían avisos', async () => {
      const pending = await createJob(), calls = authFixture.destinatarioRequestCount(), count = attempts.length;
      process.env.RUND_OCR_ENABLED = 'false'; service.onModuleInit(); await service.tick();
      assert.deepEqual(await row(pending.id), pending); assert.equal(authFixture.destinatarioRequestCount(), calls); assert.equal(attempts.length, count);
      process.env.RUND_OCR_ENABLED = 'true';
      await createJob(users[0], 'PENDIENTE'); await service.tick(); assert.equal(authFixture.destinatarioRequestCount(), calls); assert.equal(attempts.length, count);
    });
  } finally {
    authFixture.setDestinatarioMode('normal'); for (const worker of workers) worker.onModuleDestroy();
    for (const ds of sources) if (ds.isInitialized) await ds.destroy();
    if (sink) await new Promise(resolve => sink.close(resolve));
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    if (roleCreated) await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
    await database.query('DELETE FROM rund."RundExtraccionTrabajo" WHERE docente_id=$1', [profile]);
    await database.query('DELETE FROM rund."RundDocumentoPerfil" WHERE id=$1', [document]);
    await database.query('DELETE FROM rund."Docente" WHERE id=$1', [profile]);
    await database.query('DELETE FROM auth."user" WHERE id_user=ANY($1::uuid[])', [users]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [people]);
  }
};
