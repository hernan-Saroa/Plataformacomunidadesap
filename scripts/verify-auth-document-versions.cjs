/* Se ejecuta desde verify-rund-service-integration.cjs en su cluster temporal.
 * No acepta URLs de bases existentes, no lee .env y usa exclusivamente archivos ficticios.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const authRoot = path.join(root, 'backend/auth-service');
const dep = name => require(path.join(root, 'backend/rund-service/node_modules', name));
const authDep = name => require(require.resolve(name, { paths: [authRoot] }));
const compiled = name => require(path.join(authRoot, 'dist', name));

module.exports = async function verifyAuthVersions(pgConfig, runtime, check, countsContext) {
  assert.equal(pgConfig.database, 'rund_integration');
  assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { Client } = dep('pg'), { DataSource } = dep('typeorm');
  const admin = new Client(pgConfig); await admin.connect();
  await admin.query('CREATE DATABASE auth_document_versions'); await admin.end();
  const client = new Client({ ...pgConfig, database: 'auth_document_versions' }); await client.connect();
  const savedEnv = Object.fromEntries(['CARPETA_DOCUMENT_VERSIONING_ENABLED', 'JWT_SECRET'].map(k => [k, process.env[k]]));
  const oldCwd = process.cwd();
  const filesRoot = path.join(runtime, 'auth-documents'); fs.mkdirSync(filesRoot);
  let db, app;
  const ownChecks = [];
  const stateChecks = [];
  const verify = (name, work) => check(`Auth historial: ${name}`, async () => { await work(); ownChecks.push(name); });
  const verifyState = (name, work) => check(`Auth estados: ${name}`, async () => { await work(); stateChecks.push(name); });
  try {
    process.chdir(filesRoot);
    await client.query(fs.readFileSync(path.join(root, 'db/init/003_auth_ddl_20260129_215539.sql'), 'utf8'));
    await client.query('SET search_path TO public');
    await client.query(fs.readFileSync(path.join(root, 'db/migrations/158_add_id_person_to_personas_and_user.sql'), 'utf8'));
    for (const name of ['309_create_auth_carpeta_digital.sql', '339_create_documento_carpeta_digital.sql']) {
      await client.query(fs.readFileSync(path.join(root, 'db/migrations', name), 'utf8'));
    }
    const entities = [];
    function readEntities(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const name = path.join(directory, entry.name);
        if (entry.isDirectory()) readEntities(name);
        else if (entry.name.endsWith('.entity.js')) entities.push(...Object.values(require(name)).filter(value => typeof value === 'function'));
      }
    }
    readEntities(path.join(authRoot, 'dist'));
    db = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
      password: pgConfig.password, database: 'auth_document_versions', schema: 'auth', entities, synchronize: false });
    await db.initialize();
    const { CarpetaDocumentVersionsService } = compiled('carpeta-digital/carpeta-document-versions.service');
    const { CarpetaDigitalService } = compiled('carpeta-digital/carpeta-digital.service');
    const { CarpetaDigitalController } = compiled('carpeta-digital/carpeta-digital.controller');
    const { PortalController } = compiled('portal/portal.controller');
    const { PortalService } = compiled('portal/portal.service');
    const { rundFolderStaticAccess } = compiled('carpeta-digital/rund-document-access');
    const { DocumentoCarpetaDigital } = compiled('carpeta-digital/documento-carpeta-digital.entity');
    const { CarpetaDigital } = compiled('carpeta-digital/carpeta-digital.entity');
    const { TipoDocumento } = compiled('carpeta-digital/tipo-documento.entity');
    const { Person } = compiled('users/person.entity');
    const { DocumentTypeValidatorService } = compiled('carpeta-digital/document-type-validator.service');
    const { RundStateSnapshotService } = compiled('carpeta-digital/rund-state-snapshot.service');
    const { RundStateSnapshotController, RundStateSnapshotGuard } = compiled('carpeta-digital/rund-state-snapshot.controller');
    const stateSnapshot = new RundStateSnapshotService(db);
    const versions = new CarpetaDocumentVersionsService(db);
    const service = new CarpetaDigitalService(db.getRepository(CarpetaDigital), db.getRepository(TipoDocumento),
      db.getRepository(Person), db.getRepository(DocumentoCarpetaDigital), db, { enabled: false }, versions);
    const person = randomUUID(), folder = randomUUID(), document = randomUUID(), foreign = randomUUID();
    const actor = randomUUID(), original = randomUUID() + '.pdf';
    await client.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,dir_email)
      VALUES ($1,'TEST-VERSION','CC','Persona Ficticia','Persona','Ficticia','X','ficticia@example.test')`, [person]);
    await client.query('INSERT INTO auth.carpeta_digital (id_carpeta_digital,persona_id) VALUES ($1,$2)', [folder, person]);
    const directory = path.join(filesRoot, 'uploads/carpeta-digital', person); fs.mkdirSync(directory, { recursive: true });
    const oldBytes = Buffer.from('ORIGINAL FICTICIO V1'), newBytes = Buffer.from('REEMPLAZO FICTICIO V2');
    fs.writeFileSync(path.join(directory, original), oldBytes);
    const originalUrl = `/auth/api/v1/uploads/carpeta-digital/${person}/${original}`;
    await client.query(`INSERT INTO auth.documento_carpeta_digital
      (id_documento,carpeta_digital_id,nombre,tipo_archivo,tamano_bytes,url_archivo,estado,validado_por,fecha_validacion)
      VALUES ($1,$2,'Original.pdf','pdf',$3,$4,'validado',$5,now()),($6,$2,'Otro.pdf','pdf',$3,$4,'pendiente',null,null)`,
    [document, folder, oldBytes.length, originalUrl, actor, foreign]);
    const snapshot = async () => (await client.query('SELECT * FROM auth.documento_carpeta_digital WHERE id_documento=$1', [document])).rows[0];
    process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED = 'false';
    await verify('deshabilitado no consulta la tabla nueva ni cambia documentos', async () => {
      const before = await snapshot(); await assert.rejects(versions.history(document), error => error.getStatus() === 409);
      const meta = await service.getDocumento(document); assert.equal(meta.versionado_disponible, false);
      assert.deepEqual(await snapshot(), before); assert.equal((await client.query("SELECT to_regclass('auth.documento_carpeta_version') AS name")).rows[0].name, null);
    });
    await verify('migración 667 repetible sin copiar archivos ni modificar documentos', async () => {
      const before = await snapshot(), migration = fs.readFileSync(path.join(root, 'db/migrations/667_auth_carpeta_documento_versiones.sql'), 'utf8');
      await client.query(migration); await client.query(migration);
      assert.deepEqual(await snapshot(), before);
      assert.equal((await client.query('SELECT count(*) FROM auth.documento_carpeta_version')).rows[0].count, '0');
    });
    process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED = 'true';
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    const { Module } = authDep('@nestjs/common'), { NestFactory, Reflector } = authDep('@nestjs/core');
    const { JwtStrategy } = compiled('auth/strategies/jwt.strategy');
    const { JwtAuthGuard } = compiled('auth/guards/jwt-auth.guard');
    class FixtureModule {}
    Module({ controllers: [CarpetaDigitalController, RundStateSnapshotController, PortalController], providers: [JwtStrategy, RundStateSnapshotGuard,
      { provide: PortalService, useValue: {} },
      { provide: RundStateSnapshotService, useValue: stateSnapshot },
      { provide: CarpetaDigitalService, useValue: service }, { provide: CarpetaDocumentVersionsService, useValue: versions },
      { provide: DocumentTypeValidatorService, useValue: {} }] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false }); app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    app.use('/portal', rundFolderStaticAccess(db, new (dep('@nestjs/jwt').JwtService)({ secret: process.env.JWT_SECRET })));
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl(), jwt = new (dep('@nestjs/jwt').JwtService)({ secret: process.env.JWT_SECRET });
    const token = jwt.sign({ sub: actor, roles: ['SUPER_ADMIN'] });
    const request = async (p, { method = 'GET', data, body, status = 200, session = token } = {}) => {
      const headers = session ? { Cookie: `esap_access_token=${session}` } : {};
      if (data) headers['Content-Type'] = 'application/json';
      const res = await fetch(`${base}/carpeta-digital/documentos/${document}${p}`, { method, headers, body: data ? JSON.stringify(data) : body });
      assert.equal(res.status, status, `${method} ${p}: ${await res.clone().text()}`);
      return p.endsWith('/contenido') && status === 200 ? { bytes: Buffer.from(await res.arrayBuffer()), headers: res.headers } : res.json();
    };
    await verify('endpoints nuevos requieren la sesión JWT real incluso para historial', async () => {
      await request('/versiones', { session: null, status: 401 });
      await request('/versiones', { session: 'INVALIDO', status: 401 });
      await request('/versiones', { method: 'POST', session: null, status: 401, data: { version_actual: 1, roles: ['SUPER_ADMIN'] } });
      await request(`/versiones/${randomUUID()}/restaurar`, { method: 'POST', session: null, status: 401, data: { version_actual: 1 } });
      assert.equal((await client.query('SELECT count(*) FROM auth.documento_carpeta_version')).rows[0].count, '0');
    });
    let first;
    await verify('primera consulta captura bytes/fecha reales y no duplica la versión inicial', async () => {
      const before = await snapshot(); first = (await request('/versiones')).data;
      assert.equal(first.version_actual, 1); assert.equal(first.versiones.length, 1);
      assert.equal(new Date(first.versiones[0].fecha_creacion).getTime(), new Date(before.fecha_subida).getTime());
      assert.equal(first.versiones[0].creado_por, null);
      assert.equal((await request('/versiones')).data.versiones[0].id, first.versiones[0].id);
      assert.deepEqual(await snapshot(), before);
    });
    await verify('descarga versión específica devuelve sus bytes y no permite versiones ajenas', async () => {
      const other = await versions.history(foreign);
      await request(`/versiones/${other.versiones[0].id}/contenido`, { status: 404 });
      const file = await request(`/versiones/${first.versiones[0].id}/contenido`);
      assert.deepEqual(file.bytes, oldBytes); assert.equal(file.headers.get('cache-control'), 'private, no-store');
    });
    const multipart = (expected, bytes = newBytes) => {
      const data = new FormData(); data.append('file', new Blob([bytes]), 'Nuevo.pdf'); data.append('version_actual', String(expected));
      data.append('comentarios', 'Cambio ficticio'); data.append('creado_por', randomUUID()); return data;
    };
    await verify('subida HTTP real conserva versión anterior y limpia la validación previa', async () => {
      const result = (await request('/versiones', { method: 'POST', body: multipart(1), status: 201 })).data;
      assert.equal(result.version_actual, 2); assert.equal(result.version.creado_por, actor); assert.equal(result.estado, 'pendiente');
      const doc = await snapshot(); assert.equal(doc.validado_por, null); assert.equal(doc.fecha_validacion, null);
      assert.equal(doc.estado, 'pendiente'); assert.equal(doc.tamano_bytes, String(newBytes.length));
      assert.deepEqual(fs.readFileSync(path.join(directory, original)), oldBytes);
      assert.deepEqual((await request(`/versiones/${first.versiones[0].id}/contenido`)).bytes, oldBytes);
    });
    await verify('dos reemplazos simultáneos con igual precondición producen un éxito y un conflicto', async () => {
      const results = await Promise.allSettled([versions.replace(document, { originalname: 'A.pdf', buffer: Buffer.from('A') }, 2, '', { sub: actor }),
        versions.replace(document, { originalname: 'B.pdf', buffer: Buffer.from('B') }, 2, '', { sub: actor })]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.getStatus(), 409);
      assert.equal((await versions.history(document)).version_actual, 3); assert.equal(fs.readdirSync(directory).length, 3);
    });
    await verify('restaurar crea versión 4 con bytes de versión 1 y conserva las intermedias', async () => {
      const result = (await request(`/versiones/${first.versiones[0].id}/restaurar`, { method: 'POST', status: 201,
        data: { version_actual: 3, comentarios: 'Restauración ficticia' } })).data;
      assert.equal(result.version_actual, 4); assert.equal(result.version.restaurada_desde_version, 1);
      assert.deepEqual((await request(`/versiones/${result.version.id}/contenido`)).bytes, oldBytes);
      assert.equal((await request('/versiones')).data.versiones.length, 4); assert.equal((await snapshot()).estado, 'pendiente');
    });
    await verify('versión ajena o precondición antigua no escribe archivos ni cambia documento', async () => {
      const before = await snapshot(), names = fs.readdirSync(directory);
      await request(`/versiones/${randomUUID()}/restaurar`, { method: 'POST', status: 404, data: { version_actual: 4 } });
      await request('/versiones', { method: 'POST', body: multipart(1), status: 409 });
      await request('/versiones', { method: 'POST', body: multipart(0), status: 400 });
      assert.deepEqual(await snapshot(), before); assert.deepEqual(fs.readdirSync(directory), names);
    });
    await verify('fallo de INSERT revierte documento y limpia exclusivamente el nuevo archivo', async () => {
      const before = await snapshot(), names = fs.readdirSync(directory);
      await client.query(`CREATE FUNCTION auth.reject_version_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO'; END $$;
        CREATE TRIGGER reject_version_fixture BEFORE INSERT ON auth.documento_carpeta_version FOR EACH ROW EXECUTE FUNCTION auth.reject_version_fixture()`);
      try { await request('/versiones', { method: 'POST', body: multipart(4), status: 500 }); }
      finally { await client.query('DROP TRIGGER reject_version_fixture ON auth.documento_carpeta_version; DROP FUNCTION auth.reject_version_fixture()'); }
      assert.deepEqual(await snapshot(), before); assert.deepEqual(fs.readdirSync(directory), names);
      assert.equal((await versions.history(document)).version_actual, 4);
    });
    await verify('checksum detecta un original modificado y no lo restaura ni sustituye por la actual', async () => {
      fs.writeFileSync(path.join(directory, original), 'ALTERADO FICTICIO'); const before = await snapshot();
      try {
        await request(`/versiones/${first.versiones[0].id}/contenido`, { status: 409 });
        await request(`/versiones/${first.versiones[0].id}/restaurar`, { method: 'POST', status: 409, data: { version_actual: 4 } });
        assert.deepEqual(await snapshot(), before);
      } finally { fs.writeFileSync(path.join(directory, original), oldBytes); }
    });
    await verify('copias RUND, soportes enlazados, URLs PTA y namespaces ajenos se rechazan', async () => {
      const before = await snapshot();
      for (const values of [{ categoria: 'RUND' }, { rund_soporte_id: randomUUID() }, { url_archivo: '/pta/api/v1/uploads/privado.pdf' }]) {
        const column = Object.keys(values)[0]; await client.query(`UPDATE auth.documento_carpeta_digital SET ${column}=$2 WHERE id_documento=$1`, [document, values[column]]);
        await request('/versiones', { status: 409 });
        await client.query('UPDATE auth.documento_carpeta_digital SET categoria=$2,rund_soporte_id=$3,url_archivo=$4 WHERE id_documento=$1',
          [document, before.categoria, before.rund_soporte_id, before.url_archivo]);
      }
      await assert.rejects(versions.history(`rund-service:documento:${document}`), e => e.getStatus() === 400);
    });
    await verify('un historial general no se reclasifica como soporte privado RUND', async () => {
      const before = await snapshot();
      await assert.rejects(service.reclassifyDocumento(document, { categoria: 'RUND', revisionDocumento: (await service.getDocumento(document)).revision_documento }, { sub: actor }),
        e => e.getStatus() === 409 && e.message.includes('no se convierte'));
      assert.deepEqual(await snapshot(), before);
    });
    await verify('archivo vacío, formato no admitido y URL con traversal no modifican documentos', async () => {
      const before = await snapshot(), names = fs.readdirSync(directory);
      for (const file of [{ originalname: 'Vacio.pdf', buffer: Buffer.alloc(0) }, { originalname: 'Script.exe', buffer: newBytes }]) {
        await assert.rejects(versions.replace(document, file, 4, '', { sub: actor }), e => e.getStatus() === 400);
      }
      await client.query('UPDATE auth.documento_carpeta_digital SET url_archivo=$2 WHERE id_documento=$1', [document, '/auth/api/v1/uploads/carpeta-digital/../../secreto.pdf']);
      try { await request('/versiones', { status: 409 }); }
      finally { await client.query('UPDATE auth.documento_carpeta_digital SET url_archivo=$2 WHERE id_documento=$1', [document, before.url_archivo]); }
      assert.deepEqual(fs.readdirSync(directory), names);
    });
    await verify('directorio sustituido por enlace fuera de uploads impide escribir/restaurar', async () => {
      const outside = path.join(filesRoot, 'outside-fixture'), saved = directory + '-saved';
      assert(path.resolve(saved).startsWith(path.resolve(runtime) + path.sep));
      fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, 'conservar.txt'), 'CONSERVAR');
      const before = await snapshot(); fs.renameSync(directory, saved);
      try {
        fs.symlinkSync(outside, directory, process.platform === 'win32' ? 'junction' : 'dir');
        await request('/versiones', { method: 'POST', body: multipart(4), status: 409 });
        assert.deepEqual(await snapshot(), before); assert.deepEqual(fs.readdirSync(outside), ['conservar.txt']);
      } finally {
        if (fs.existsSync(directory)) { if (process.platform === 'win32') fs.rmdirSync(directory); else fs.unlinkSync(directory); }
        fs.renameSync(saved, directory);
      }
    });
    await verify('reclasificar y reemplazar simultáneamente no revierte la URL ni pierde el archivo nuevo', async () => {
      const before = await snapshot(), revisionDocumento = (await service.getDocumento(document)).revision_documento;
      const results = await Promise.allSettled([service.reclassifyDocumento(document, { categoria: 'academico', revisionDocumento }, { sub: actor }),
        versions.replace(document, { originalname: 'Concurrente.pdf', buffer: Buffer.from('CONCURRENTE') }, 4, '', { sub: actor })]);
      assert.equal(results[1].status, 'fulfilled');
      if (results[0].status === 'rejected') assert.equal(results[0].reason.getStatus(), 409);
      const doc = await snapshot(), history = await versions.history(document);
      assert.equal(doc.categoria, results[0].status === 'fulfilled' ? 'academico' : before.categoria);
      assert.equal(history.version_actual, 5); assert.equal(doc.estado, 'pendiente');
      assert.deepEqual((await versions.download(document, history.versiones[0].id)).bytes, Buffer.from('CONCURRENTE'));
    });
    await verify('retirar un documento elimina solo su historial y conserva originales y el otro documento', async () => {
      const before = await snapshot(), names = fs.readdirSync(directory);
      await service.deleteDocumento(foreign, { sub: actor }, (await service.getDocumento(foreign)).revision_documento);
      assert.equal((await client.query('SELECT count(*) FROM auth.documento_carpeta_version WHERE documento_id=$1', [foreign])).rows[0].count, '0');
      assert.deepEqual(await snapshot(), before); assert.deepEqual(fs.readdirSync(directory), names);
      assert.equal((await versions.history(document)).version_actual, 5);
    });
    let seen;
    const revision = async () => (await service.getDocumento(document)).revision_documento;
    await verifyState('metadata/listado comparten una revisión persistida y el historial no la altera', async () => {
      seen = await revision(); assert.match(seen, /^[a-f0-9]{64}$/);
      const row = await db.getRepository(DocumentoCarpetaDigital).findOneByOrFail({ id: document });
      assert.equal(service.toDocumentoDto(row).revision_documento, seen);
      await versions.history(document); assert.equal(await revision(), seen);
      assert.equal((await service.getDocumento(document)).requiere_revision_documento, true);
    });
    await verifyState('validar/rechazar sin revisión o con revisión ajena falla sin modificar el documento', async () => {
      const before = await snapshot();
      for (const revision_documento of [undefined, 'a'.repeat(64), '', { visto: true }]) {
        await request('/validate', { method: 'PUT', status: 409, data: { estado: 'validado', revision_documento, validadoPor: randomUUID() } });
        await request('/validate', { method: 'PUT', status: 409, data: { estado: 'rechazado', revision_documento } });
      }
      assert.deepEqual(await snapshot(), before);
    });
    await verifyState('validación vigente persiste, cambia la revisión y no crea otra versión de archivo', async () => {
      const versionsBefore = (await versions.history(document)).versiones.length;
      const data = (await request('/validate', { method: 'PUT', data: { estado: 'validado', revision_documento: seen, validadoPor: 'ACTOR_FALSO' } })).data;
      assert.equal(data.estado, 'validado'); assert.notEqual(data.revision_documento, seen); assert.equal(data.validado_por, null);
      assert.equal((await versions.history(document)).versiones.length, versionsBefore);
      const stats = service.documentStats(await db.getRepository(DocumentoCarpetaDigital).find({ where: { carpetaDigitalId: folder }, select: ['estado'] }));
      assert.equal(stats.documentos_completos, 1); assert.equal(stats.total_documentos, 1);
    });
    await verifyState('reclasificación vigente reinicia aprobación, conserva original y evita revalidación con la vista anterior', async () => {
      const before = await snapshot(), seenBefore = await revision();
      const data = (await request('/reclassify', { method: 'PUT', data: { categoria: 'laboral', revision_documento: seenBefore } })).data;
      assert.equal(data.estado, 'pendiente'); assert.equal(data.validado_por, null); assert.equal(data.fecha_validacion, null);
      assert.equal(data.url_archivo, before.url_archivo); assert.notEqual(data.revision_documento, seenBefore);
      await request('/validate', { method: 'PUT', status: 409, data: { estado: 'validado', revision_documento: seenBefore } });
      const stats = service.documentStats(await db.getRepository(DocumentoCarpetaDigital).find({ where: { carpetaDigitalId: folder }, select: ['estado'] }));
      assert.equal(stats.documentos_completos, 0); assert.equal(stats.documentos_pendientes, 1);
    });
    await verifyState('un no-op de reclasificación conserva aprobación y revisión sin tocar la fila', async () => {
      await request('/validate', { method: 'PUT', data: { estado: 'validado', revision_documento: await revision() } });
      const before = await snapshot(), seenBefore = await revision();
      const result = (await request('/reclassify', { method: 'PUT', data: { categoria: before.categoria, revision_documento: seenBefore } })).data;
      assert.equal(result.estado, 'validado'); assert.equal(result.revision_documento, seenBefore); assert.deepEqual(await snapshot(), before);
    });
    await verifyState('revisión previa a un reemplazo no permite aprobar, rechazar, reclasificar ni retirar el nuevo original', async () => {
      const stale = await revision();
      await request('/versiones', { method: 'POST', status: 201, body: multipart(5, Buffer.from('NUEVO ORIGINAL V6')) });
      const before = await snapshot(), names = fs.readdirSync(directory);
      await request('/validate', { method: 'PUT', status: 409, data: { estado: 'validado', revision_documento: stale } });
      await request('/validate', { method: 'PUT', status: 409, data: { estado: 'rechazado', revision_documento: stale } });
      await request('/reclassify', { method: 'PUT', status: 409, data: { categoria: 'personal', revision_documento: stale } });
      await request(`?revision_documento=${stale}`, { method: 'DELETE', status: 409 });
      assert.deepEqual(await snapshot(), before); assert.deepEqual(fs.readdirSync(directory), names);
      assert.equal((await versions.history(document)).version_actual, 6);
    });
    await verifyState('dos decisiones simultáneas de la misma revisión producen una sola decisión guardada', async () => {
      const revisionDocumento = await revision();
      const results = await Promise.allSettled(['validado','rechazado'].map(estado => service.validateDocumento(document, { estado, revisionDocumento }, { sub: actor })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.getStatus(), 409);
      assert.notEqual(await revision(), revisionDocumento); assert.equal((await versions.history(document)).version_actual, 6);
    });
    await verifyState('tipo individual de otra carpeta o inactivo se rechaza; cambio de tipo propio reinicia aprobación', async () => {
      const otherPerson = randomUUID(), otherFolder = randomUUID(), ownType = randomUUID(), otherType = randomUUID(), inactive = randomUUID();
      await client.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,dir_email)
        VALUES ($1,'TEST-OTRA','CC','Otra Persona Ficticia','Otra','Ficticia','X','otra@example.test')`, [otherPerson]);
      await client.query('INSERT INTO auth.carpeta_digital (id_carpeta_digital,persona_id) VALUES ($1,$2)', [otherFolder, otherPerson]);
      await client.query(`INSERT INTO auth.tipo_documento (id_tipo_documento,carpeta_digital_id,nombre,activo)
        VALUES ($1,$2,'Requisito propio',true),($3,$4,'Requisito ajeno',true),($5,null,'Inactivo',false)`, [ownType,folder,otherType,otherFolder,inactive]);
      const before = await snapshot();
      for (const tipo_documento_id of [otherType,inactive]) await request('/reclassify', { method: 'PUT', status: 400,
        data: { tipo_documento_id, revision_documento: await revision() } });
      assert.deepEqual(await snapshot(), before);
      await request('/validate', { method: 'PUT', data: { estado: 'validado', revision_documento: await revision() } });
      const result = (await request('/reclassify', { method: 'PUT', data: { tipo_documento_id: ownType, revision_documento: await revision() } })).data;
      assert.equal(result.tipo_documento_id, ownType); assert.equal(result.estado, 'pendiente'); assert.equal(result.validado_por, null);
      assert.equal(result.url_archivo, before.url_archivo);
    });
    await verifyState('fallo al guardar la decisión revierte estado y revisión, sin tocar bytes/historial', async () => {
      const before = await snapshot(), seenBefore = await revision(), names = fs.readdirSync(directory);
      await client.query(`CREATE FUNCTION auth.reject_decision_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO'; END $$;
        CREATE TRIGGER reject_decision_fixture BEFORE UPDATE ON auth.documento_carpeta_digital FOR EACH ROW EXECUTE FUNCTION auth.reject_decision_fixture()`);
      try { await request('/validate', { method: 'PUT', status: 500, data: { estado: 'validado', revision_documento: seenBefore } }); }
      finally { await client.query('DROP TRIGGER reject_decision_fixture ON auth.documento_carpeta_digital; DROP FUNCTION auth.reject_decision_fixture()'); }
      assert.deepEqual(await snapshot(), before); assert.equal(await revision(), seenBefore); assert.deepEqual(fs.readdirSync(directory), names);
      assert.equal((await versions.history(document)).version_actual, 6);
    });
    await verifyState('deshabilitar historial permite clientes anteriores y sigue rechazando una revisión enviada obsoleta', async () => {
      process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED = 'false';
      const seenBefore = await revision();
      await request('/validate', { method: 'PUT', data: { estado: 'rechazado' } });
      assert.equal((await service.getDocumento(document)).requiere_revision_documento, false);
      const before = await snapshot();
      await request('/validate', { method: 'PUT', status: 409, data: { estado: 'validado', revision_documento: seenBefore } });
      assert.deepEqual(await snapshot(), before);
      process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED = 'true';
    });
    await verifyState('revisión general antigua no permite decidir sobre un documento reclasificado como RUND', async () => {
      const before = await snapshot(), oldRevision = await revision();
      await client.query("UPDATE auth.documento_carpeta_digital SET categoria='RUND' WHERE id_documento=$1", [document]);
      const changed = await snapshot();
      try {
        await request('/validate', { method: 'PUT', status: 409, data: { estado: 'validado', revision_documento: oldRevision } });
        await request('/reclassify', { method: 'PUT', status: 409, data: { categoria: 'personal', revision_documento: oldRevision } });
        assert.deepEqual(await snapshot(), changed);
      } finally { await client.query('UPDATE auth.documento_carpeta_digital SET categoria=$2 WHERE id_documento=$1', [document, before.categoria]); }
    });
    await verify('metadatos propios habilitan historial; deshabilitar conserva versiones/bytes y vuelve al contrato previo', async () => {
      assert.equal((await service.getDocumento(document)).versionado_disponible, true);
      const before = await snapshot(), names = fs.readdirSync(directory);
      process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED = 'false';
      assert.equal((await service.getDocumento(document)).versionado_disponible, false);
      await request('/versiones', { status: 409 });
      assert.deepEqual(await snapshot(), before); assert.deepEqual(fs.readdirSync(directory), names);
      assert.equal((await client.query('SELECT count(*) FROM auth.documento_carpeta_version WHERE documento_id=$1', [document])).rows[0].count, '6');
    });
    await require('./verify-rund-folder-counts.cjs')({ pgConfig, authDb: db, carpetaService: service, authUrl: base, session: token, check, ...countsContext });
    await require('./verify-rund-auth-state-sync.cjs')({ pgConfig, authDb: db, authUrl: base, person, folder, document, check });
    fs.writeFileSync(path.join(root, 'docs/rund/validacion-historial-auth-postgres-local.json'), JSON.stringify({ verifiedAt: new Date().toISOString(),
      passed: true, syntheticDataOnly: true, database: 'auth_document_versions dentro del cluster temporal eliminado al finalizar',
      application: 'Controller/Auth JWT guard/strategy, servicio y repositorios compilados reales; Nest de prueba, no todo AppModule',
      migration: '667_auth_carpeta_documento_versiones.sql', synchronize: false, checks: ownChecks }, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'docs/rund/validacion-estados-auth-postgres-local.json'), JSON.stringify({ verifiedAt: new Date().toISOString(),
      step: '12.3b.1', passed: true, syntheticDataOnly: true, existingDatabaseUsed: false, synchronize: false,
      application: 'Auth controller/guard/strategy/servicios/repositorios compilados reales; Nest y PostgreSQL temporales',
      checks: stateChecks }, null, 2) + '\n');
  } finally {
    if (app) await app.close(); if (db?.isInitialized) await db.destroy(); await client.end(); process.chdir(oldCwd);
    for (const [k, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[k]; else process.env[k] = value; }
  }
};
