/* OCR de RUND: datos/archivos ficticios, motores HTTP simulados y PostgreSQL temporal. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { randomUUID, createHash } = require('node:crypto');
const previous = require('./fixtures/rund-extraction-context-before-api.cjs');

module.exports = async function verifyExtractionIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, jwt, authUrl, authFixture, authToken, appDir } = context;
  assert(path.resolve(appDir).startsWith(path.resolve(runtime) + path.sep));
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const compiled = file => require(path.join(serviceRoot, 'dist', file));
  const { DataSource } = require(path.join(serviceRoot, 'node_modules/typeorm'));
  const { AuthIdentityClient } = compiled('common/auth-identity.client');
  const { RundExtraccionService } = compiled('modules/banco-docentes/rund-extraccion.service');
  const { RundDocumentStorageService } = compiled('modules/banco-docentes/rund-document-storage.service');
  const { extractionProfile, EXTRACTION_FIELDS, extractionValue } = compiled('modules/banco-docentes/rund-extraccion-fields');
  const person = randomUUID(), orphan = randomUUID(), ids = [randomUUID(), 'OCR-TEXT-' + randomUUID(), 'OCR-HUERFANO-' + randomUUID()];
  const tag = randomUUID().slice(0, 8), role = 'ocr_' + randomUUID().replace(/-/g, '');
  const authName = ' DOCENTE FICTICIO ÁLVAREZ ', documentNumber = ' 001.234.5678 ';
  const pdf = Buffer.from('%PDF-1.7\nOCR FICTICIO ' + tag);
  const actor = { actorId: 'OCR_FICTICIO', roles: ['SUPER_ADMIN'], fullAccess: true };
  const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
    password: pgConfig.password, database: pgConfig.database, synchronize: false, extra: { max: 1 } });
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'RUND_OCR_ENABLED', 'RUND_OCR_TOKEN', 'RUND_OCR_URL',
    'RUND_OLLAMA_URL', 'RUND_OLLAMA_MODEL', 'OPENKM_BASE_URL', 'RUND_DOCUMENT_ALLOW_LOCAL', 'TZ'];
  const saved = keys.map(key => process.env[key]);
  const docs = [], workers = []; let roleCreated = false, engine, beforeModel, storage, first, recovered;
  const marker = (await database.query('SELECT * FROM rund."RundExtraccionInicio" WHERE id=true')).rows;
  const counts = { ocr: 0, model: 0 };
  const fullContext = row => row && Object.fromEntries(Object.entries(EXTRACTION_FIELDS).map(([key, def]) => [key, extractionValue(row[def.source])]));
  const job = async id => (await database.query('SELECT * FROM rund."RundExtraccionTrabajo" WHERE id=$1', [id])).rows[0];
  const suggestions = async id => (await database.query('SELECT * FROM rund."RundExtraccionSugerencia" WHERE trabajo_id=$1 ORDER BY campo', [id])).rows;
  const profiles = async () => ({ auth: (await database.query('SELECT (to_jsonb(p) - \'fec_modificacion\') AS row FROM auth.personas p ORDER BY id_person')).rows,
    native: (await database.query('SELECT to_jsonb(d) AS row FROM rund."Docente" d ORDER BY id')).rows });
  const enableNow = id => database.query(`UPDATE rund."RundExtraccionTrabajo" SET disponible_en=now()-interval '1 second' WHERE id=$1`, [id]);
  try {
    await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,fec_nacimiento)
      VALUES ($1,$2,'CC',$3,'DOCENTE','FICTICIO','F','1980-01-17')`, [person, documentNumber, authName]);
    for (let i = 0; i < ids.length; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$3::text,'pregrado','Título anterior',
        'sexoBiologico','Mujer','fechaInicioVinculacion','2025-02-03','datosCargaMasiva',jsonb_build_object('pregrado','HISTORICO')))).*
      FROM rund."Docente" d WHERE id=$4`, [ids[i], i === 2 ? orphan : person, '2020-' + (i + 1), docenteId]);
    await ds.initialize();
    await database.query(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA rund TO ${role};
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA rund TO ${role}`); roleCreated = true;
    await ds.query('SET ROLE ' + role);
    for (const table of ['auth.personas', 'academic_work_plan."Persona"']) await assert.rejects(ds.query('SELECT * FROM ' + table), /permission denied/);
    process.env.AUTH_SERVICE_URL = authUrl; process.env.AUTH_INTERNAL_SERVICE_TOKEN = authToken;
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'true'; process.env.OPENKM_BASE_URL = '';
    process.env.RUND_OCR_ENABLED = 'true'; process.env.RUND_OCR_TOKEN = 'ocr-ficticio-local-000000000000000000000000';
    process.env.RUND_OLLAMA_MODEL = 'qwen3.5:4b';
    engine = http.createServer(async (req, res) => {
      try {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        res.setHeader('Content-Type', 'application/json');
        if (req.url === '/extract') {
          counts.ocr++; assert.equal(req.headers.authorization, 'Bearer ' + process.env.RUND_OCR_TOKEN);
          res.end(JSON.stringify({ motor: 'OCR FICTICIO', paginas: [{ pagina: 1, texto: 'Título: Administración Pública', confianza: 0.95 }] }));
        } else if (req.url === '/api/chat') {
          counts.model++; const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          assert.equal(body.model, 'qwen3.5:4b'); assert.deepEqual(body.format.properties.sugerencias.items.properties.campo.enum, ['pregrado']);
          if (beforeModel) { const hook = beforeModel; beforeModel = null; await hook(); }
          res.end(JSON.stringify({ message: { content: JSON.stringify({ sugerencias: [
            { campo: 'pregrado', valor: 'Administración Pública', pagina: 1, evidencia: 'Título: Administración Pública', confianza: 0.9 },
          ] }) } }));
        } else { res.statusCode = 404; res.end('{}'); }
      } catch { res.statusCode = 500; res.end('{}'); }
    });
    await new Promise(resolve => engine.listen(0, '127.0.0.1', resolve));
    const engineUrl = 'http://127.0.0.1:' + engine.address().port;
    process.env.RUND_OCR_URL = engineUrl; process.env.RUND_OLLAMA_URL = engineUrl;
    const oldCwd = process.cwd(); try { process.chdir(appDir); storage = new RundDocumentStorageService(); } finally { process.chdir(oldCwd); }
    const identities = new AuthIdentityClient();
    const worker = () => { const service = new RundExtraccionService(ds, storage, identities); workers.push(service); return service; };
    const service = worker();
    const enqueue = async (ownerId = ids[0]) => {
      const id = randomUUID();
      const stored = await storage.store({ content: pdf, documentNumber: 'OCR-' + tag, category: 'TITULOS', logicalId: id, version: 1 });
      docs.push({ id, path: stored.storagePath });
      await database.query(`INSERT INTO rund."RundDocumentoPerfil" (id,documento_logico_id,docente_id,categoria_codigo,bloque,tipo_soporte,
        nombre_archivo,mime_type,tamano_bytes,checksum_sha256,proveedor_almacenamiento,almacenamiento_ruta,creado_por,"createdAt")
        VALUES ($1,$1,$2,'TITULOS','FORMACION','diploma_pregrado','ocr-ficticio.pdf','application/pdf',$3,$4,$5,$6,$7,'2000-01-01')`,
      [id, ownerId, pdf.length, createHash('sha256').update(pdf).digest('hex'), stored.provider, stored.storagePath, actor.actorId]);
      await service.enqueue(ownerId, id, actor);
      return (await database.query('SELECT * FROM rund."RundExtraccionTrabajo" WHERE documento_id=$1 ORDER BY creado_en DESC LIMIT 1', [id])).rows[0];
    };
    await check('Identidad OCR: contexto completo coincide con SQL anterior en UTC, Bogotá y Tokio, incluidos IDs textuales y fechas', async () => {
      const oldZone = process.env.TZ;
      const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try { for (const zone of ['UTC', 'America/Bogota', 'Asia/Tokyo']) {
        process.env.TZ = zone;
        for (const id of ids.slice(0, 2)) assert.deepEqual(await extractionProfile(ds, id, identities), fullContext(await previous(database, id)));
      } } finally {
        // Windows puede conservar en caché la última zona al borrar TZ; restaurar primero la zona efectiva.
        process.env.TZ = oldZone === undefined ? resolvedZone : oldZone;
        if (oldZone === undefined) delete process.env.TZ;
      }
      await assert.rejects(extractionProfile(ds, ids[2], identities), error => error.getStatus() === 400);
      await assert.rejects(extractionProfile(ds, 'AUSENTE-' + tag, identities), error => error.getStatus() === 400);
      await database.query(`UPDATE auth.personas SET nom_largo='',num_identificacion='',gen_tercero='',fec_nacimiento=null WHERE id_person=$1`, [person]);
      try { assert.deepEqual(await extractionProfile(ds, ids[0], identities), fullContext(await previous(database, ids[0]))); }
      finally { await database.query(`UPDATE auth.personas SET nom_largo=$2,num_identificacion=$3,gen_tercero='F',fec_nacimiento='1980-01-17' WHERE id_person=$1`, [person, authName, documentNumber]); }
    });
    await check('Identidad OCR: el snapshot nativo no mezcla cambios de formación durante la consulta Auth', async () => {
      const expected = fullContext(await previous(database, ids[0]));
      try { assert.deepEqual(await extractionProfile(ds, ids[0], { fichaPorPersona: async id => {
        await database.query(`UPDATE rund."Docente" SET pregrado='Cambio concurrente' WHERE id=$1`, [ids[0]]);
        return identities.fichaPorPersona(id);
      } }), expected); }
      finally { await database.query(`UPDATE rund."Docente" SET pregrado='Título anterior' WHERE id=$1`, [ids[0]]); }
    });
    await check('Identidad OCR: proceso completo con SQL solo RUND y motores HTTP ficticios conserva sugerencias pendientes y valor previo', async () => {
      first = await enqueue(); const expected = fullContext(await previous(database, ids[0])), before = await profiles();
      await service.tick(); const current = await job(first.id), rows = await suggestions(first.id);
      assert.equal(current.estado, 'COMPLETADO'); assert.deepEqual(current.perfil_base, expected); assert.equal(current.lease_id, null);
      assert.equal(rows.length, 1); assert.equal(rows[0].campo, 'pregrado'); assert.equal(rows[0].valor, 'Administración Pública');
      assert.equal(rows[0].valor_previo, 'Título anterior'); assert.equal(rows[0].estado, 'PENDIENTE');
      assert.deepEqual(counts, { ocr: 1, model: 1 }); assert.deepEqual(await profiles(), before);
      assert.equal((await service.list(ids[0], actor)).jobs[0].sugerencias[0].estado, 'PENDIENTE');
    });
    await check('Identidad OCR: Auth caído, 404 o ficha parcial conserva el perfil y reintenta tres veces sin leer PDF ni llamar motores', async () => {
      const before = await profiles(), enginesBefore = { ...counts };
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        const pending = await enqueue(); authFixture.setFichaMode(mode);
        for (let i = 0; i < 3; i++) { await enableNow(pending.id); await service.tick(); }
        const current = await job(pending.id); assert.equal(current.estado, 'ERROR'); assert.equal(current.intentos, 3);
        assert.equal(current.error_codigo, 'EXTRACCION_NO_DISPONIBLE'); assert.equal(current.lease_id, null);
        assert.deepEqual(current.perfil_base, {}); assert.equal((await suggestions(pending.id)).length, 0);
        authFixture.setFichaMode('normal');
      } } finally { authFixture.setFichaMode('normal'); }
      assert.deepEqual(counts, enginesBefore); assert.deepEqual(await profiles(), before);
      for (const doc of docs) assert.deepEqual(fs.readFileSync(path.join(appDir, 'uploads', doc.path)), pdf);
    });
    await check('Identidad OCR: la recuperación de Auth permite continuar el mismo trabajo tras reiniciar el worker', async () => {
      recovered = await enqueue(); authFixture.setFichaMode('unavailable');
      try { await service.tick(); } finally { authFixture.setFichaMode('normal'); }
      assert.equal((await job(recovered.id)).estado, 'PENDIENTE');
      await enableNow(recovered.id); await worker().tick();
      const current = await job(recovered.id); assert.equal(current.estado, 'COMPLETADO'); assert.equal(current.intentos, 2);
      assert.equal((await suggestions(recovered.id))[0].estado, 'PENDIENTE');
      assert.equal((await database.query('SELECT pregrado FROM rund."Docente" WHERE id=$1', [ids[0]])).rows[0].pregrado, 'Título anterior');
    });
    await check('Identidad OCR: reemplazar el PDF durante el análisis marca obsoleto y no publica sugerencias', async () => {
      const pending = await enqueue(); const before = await profiles();
      beforeModel = () => database.query(`UPDATE rund."RundDocumentoPerfil" SET estado='REEMPLAZADO' WHERE id=$1`, [pending.documento_id]);
      await service.tick(); assert.equal((await job(pending.id)).estado, 'OBSOLETO');
      assert.equal((await suggestions(pending.id)).length, 0); assert.deepEqual(await profiles(), before);
    });
    await check('Identidad OCR: una reserva perdida no permite al resultado tardío sustituir el trabajo ni crear sugerencias', async () => {
      const pending = await enqueue(), replacement = randomUUID(); const before = await profiles();
      beforeModel = () => database.query(`UPDATE rund."RundExtraccionTrabajo" SET lease_id=$2 WHERE id=$1`, [pending.id, replacement]);
      await service.tick(); assert.equal((await job(pending.id)).lease_id, replacement);
      assert.equal((await suggestions(pending.id)).length, 0); assert.deepEqual(await profiles(), before);
      await database.query(`UPDATE rund."RundExtraccionTrabajo" SET estado='OBSOLETO',lease_id=null,lease_hasta=null WHERE id=$1`, [pending.id]);
    });
    await check('Identidad OCR: confirmación humana conserva locks, rollback de auditoría, aplicación exacta y rechazo de revisión obsoleta', async () => {
      const selected = (await suggestions(first.id))[0], before = await profiles();
      const route = '/banco-docentes/' + ids[0] + '/extracciones/sugerencias/';
      await database.query(`CREATE FUNCTION rund.reject_ocr_identity_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.docente_id='${ids[0]}' AND NEW.accion='APLICAR_SUGERENCIA_OCR' THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA';
        END IF; RETURN NEW; END $$; CREATE TRIGGER reject_ocr_identity_audit BEFORE INSERT ON rund."RundAprobacionLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_ocr_identity_audit()`);
      try { await request(route + selected.id + '/confirmar', { method: 'POST', status: 500 }); }
      finally { await database.query('DROP TRIGGER reject_ocr_identity_audit ON rund."RundAprobacionLog"; DROP FUNCTION rund.reject_ocr_identity_audit()'); }
      assert.deepEqual(await profiles(), before); assert.equal((await suggestions(first.id))[0].estado, 'PENDIENTE');
      authFixture.setFichaMode('unavailable');
      try { assert.equal((await request(route + selected.id + '/confirmar', { method: 'POST', status: 201 })).data.changed, true); }
      finally { authFixture.setFichaMode('normal'); }
      assert.equal((await suggestions(first.id))[0].estado, 'APROBADA');
      assert.equal((await database.query('SELECT pregrado FROM rund."Docente" WHERE id=$1', [ids[0]])).rows[0].pregrado, 'Administración Pública');
      assert.deepEqual((await profiles()).auth, before.auth);
      await request(route + selected.id + '/confirmar', { method: 'POST', status: 409 });
      const stale = (await suggestions(recovered.id))[0];
      await request(route + stale.id + '/confirmar', { method: 'POST', status: 409 });
      assert.equal((await suggestions(recovered.id))[0].estado, 'PENDIENTE');
    });
    await check('Identidad OCR: el main conserva OCR desactivado, JWT, roles y protección del original sin activar instalaciones', async () => {
      const route = '/banco-docentes/' + ids[0] + '/extracciones';
      const teacher = jwt.sign({ sub: randomUUID(), roles: ['DOCENTE'] }, { expiresIn: '2m' });
      const admin = jwt.sign({ sub: randomUUID(), roles: ['ADMIN'] }, { expiresIn: '2m' });
      await request(route, { token: null, status: 401 }); await request(route, { token: teacher, status: 403 });
      await request(route, { token: admin, status: 403 }); assert.equal((await request(route)).data.enabled, false);
      await request(route + '/documentos/' + docs[0].id, { method: 'POST', status: 503 });
    });
  } finally {
    authFixture.setFichaMode('normal');
    for (const service of workers) await service.onModuleDestroy();
    if (ds.isInitialized) await ds.destroy();
    if (engine) await new Promise(resolve => engine.close(resolve));
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    if (roleCreated) await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
    await database.query('DELETE FROM rund."RundExtraccionSugerencia" WHERE trabajo_id IN (SELECT id FROM rund."RundExtraccionTrabajo" WHERE docente_id=ANY($1::text[]))', [ids]);
    await database.query('DELETE FROM rund."RundExtraccionTrabajo" WHERE docente_id=ANY($1::text[])', [ids]);
    await database.query('DELETE FROM rund."RundDocumentoPerfil" WHERE docente_id=ANY($1::text[])', [ids]);
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [ids]);
    await database.query('DELETE FROM auth.personas WHERE id_person=$1', [person]);
    if (!marker.length) await database.query('DELETE FROM rund."RundExtraccionInicio" WHERE id=true');
    for (const doc of docs) {
      const target = path.resolve(appDir, 'uploads', doc.path);
      assert(target.startsWith(path.resolve(appDir, 'uploads') + path.sep)); fs.rmSync(target, { force: true });
    }
  }
};
