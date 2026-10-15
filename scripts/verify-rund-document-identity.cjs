/* Expediente/evidencias contra servicios compilados y una base temporal, nunca operativa. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const previous = require('./fixtures/rund-documentos-before-api.cjs');

module.exports = async function verifyDocumentIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, jwt, authUrl, authFixture, authToken, appDir } = context;
  assert(path.resolve(appDir).startsWith(path.resolve(runtime) + path.sep));
  const root = path.resolve(__dirname, '..'), rundRoot = path.join(root, 'backend/rund-service');
  const compiled = name => require(path.join(rundRoot, 'dist', name));
  const { DataSource } = require(path.join(rundRoot, 'node_modules/typeorm'));
  const { AuthIdentityClient } = compiled('common/auth-identity.client');
  const { RundDocumentosService } = compiled('modules/banco-docentes/rund-documentos.service');
  const { RundDocumentStorageService } = compiled('modules/banco-docentes/rund-document-storage.service');
  const { BancoDocentesService } = compiled('modules/banco-docentes/banco-docentes.service');
  const { RundAprobacionLogEntity } = compiled('entities/rund-aprobacion-log.entity');
  const { assertRundEvidenceData, hasRundData } = compiled('modules/banco-docentes/rund-evidence-data');
  const people = Array.from({ length: 5 }, () => randomUUID()), tag = randomUUID().slice(0, 8);
  const rawDocument = ' 00.123.' + tag + ' ', caseDocument = 'AbC.' + tag;
  const ids = ['EXP-' + randomUUID(), 'EXP-HIST-' + randomUUID(), 'EXP-DUP-' + randomUUID(),
    'EXP-HUERFANO-' + randomUUID(), rawDocument, 'EXP-VACIO-' + randomUUID()];
  const documents = [rawDocument, rawDocument, caseDocument, null, ''];
  const role = 'document_' + randomUUID().replace(/-/g, '');
  const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
    password: pgConfig.password, database: pgConfig.database, synchronize: false, entities: [RundAprobacionLogEntity], extra: { max: 1 } });
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'OPENKM_BASE_URL', 'RUND_DOCUMENT_ALLOW_LOCAL'];
  const saved = keys.map(key => process.env[key]);
  let roleCreated = false, current;
  const serial = value => JSON.parse(JSON.stringify(value));
  const files = () => {
    const base = path.join(appDir, 'uploads'), result = {};
    const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) result[path.relative(base, file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    } }; walk(base); return result;
  };
  const snapshot = async () => {
    const out = { files: files() };
    for (const [schema, table] of [['auth', 'personas'], ...['Docente', 'RundDocumentoPerfil', 'RundSoporteCampo',
      'RundCampoEstado', 'RundAprobacionLog'].map(table => ['rund', table])]) {
      out[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return out;
  };
  const pdf = Buffer.from('%PDF-1.7\nEXPEDIENTE FICTICIO ' + tag);
  const data = { categoria: 'IDENTIDAD', bloque: 'IDENTIDAD', tipoSoporte: 'documento_identidad', campo: 'DOCUMENTO_IDENTIDAD' };
  const form = (values = data) => {
    const body = new FormData(); body.append('file', new Blob([pdf], { type: 'application/pdf' }), 'expediente.pdf');
    for (const [key, value] of Object.entries(values)) body.append(key, value); return body;
  };
  const route = '/banco-docentes/' + ids[0] + '/documentos';
  try {
    for (const i of [0, 1, 2, 4]) await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,fec_nacimiento)
      VALUES ($1,$2,'CC',$3,'EXPEDIENTE','FICTICIO','X','1980-01-17')`, [people[i], documents[i], 'EXPEDIENTE FICTICIO ' + tag]);
    const owners = [people[0], people[0], people[1], people[3], people[2], people[4]];
    const years = [2020, 2022, 2023, 2024, 2021, 2025];
    for (let i = 0; i < ids.length; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$5::text,'estado','INACTIVO',
        'updatedAt',$3::text,'pregrado','Título vigente','maestria',null,'puntajeSalarial',0,
        'sexoBiologico','Femenino','datosCargaMasiva',jsonb_build_object('maestria','DATO HISTORICO')))).*
      FROM rund."Docente" d WHERE id=$4`, [ids[i], owners[i], years[i] + '-01-01T00:00:00', docenteId, years[i] + '-1']);
    [process.env.AUTH_SERVICE_URL, process.env.AUTH_INTERNAL_SERVICE_TOKEN, process.env.OPENKM_BASE_URL,
      process.env.RUND_DOCUMENT_ALLOW_LOCAL] = [authUrl, authToken, '', 'true'];
    await ds.initialize();
    await database.query(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA rund TO ${role};
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA rund TO ${role}`); roleCreated = true;
    await ds.query('SET ROLE ' + role);
    for (const table of ['auth.personas', 'academic_work_plan."Persona"']) await assert.rejects(ds.query('SELECT * FROM ' + table), /permission denied/);
    const identities = new AuthIdentityClient();
    const oldCwd = process.cwd(); let storage;
    try { process.chdir(appDir); storage = new RundDocumentStorageService(); } finally { process.chdir(oldCwd); }
    const service = new RundDocumentosService(ds, storage, identities);
    await check('Identidad expediente: resolución completa coincide con SQL anterior, OR, documento exacto, duplicados e históricos', async () => {
      for (const key of [...ids, ...people, rawDocument.trim(), rawDocument.replace(/[. ]/g, ''), caseDocument.toLowerCase(), caseDocument, people[0].toUpperCase(), 'AUSENTE-' + tag]) {
        const expected = await previous.resolver(database, key);
        if (expected) assert.deepEqual(await service.requireDocente(key), expected);
        else await assert.rejects(service.requireDocente(key), error => error.getStatus() === 404);
      }
      assert.equal((await service.requireDocente(rawDocument)).id, ids[2]);
      assert.equal((await service.requireDocente(people[0])).id, ids[1]);
      assert.equal((await service.requireDocente(ids[3])).document_number, ids[3]);
      assert.equal((await service.requireDocente(ids[5])).document_number, '');
    });
    await check('Identidad expediente: selección conserva snapshot nativo durante cambio concurrente de persona y fecha', async () => {
      const before = await previous.resolver(database, people[0]);
      const concurrent = new RundDocumentosService(ds, storage, {
        coincidenciasUnicidad: async (...args) => {
          await database.query(`UPDATE rund."Docente" SET "personaId"=$2,"updatedAt"='2035-01-01' WHERE id=$1`, [ids[1], people[2]]);
          return identities.coincidenciasUnicidad(...args);
        },
      });
      try { assert.deepEqual(await concurrent.requireDocente(people[0]), before); }
      finally { await database.query(`UPDATE rund."Docente" SET "personaId"=$2,"updatedAt"='2022-01-01' WHERE id=$1`, [ids[1], people[0]]); }
    });
    await check('Identidad expediente: validación por fila conserva LEFT JOIN, sexo nativo, títulos, cero e ignorar datos históricos', async () => {
      const cases = [['documento_identidad', 'DOCUMENTO_IDENTIDAD', ['num_identificacion']], ['documento_identidad', 'NOMBRE_COMPLETO', ['nom_largo']],
        ['pasaporte', 'GENERO', ['gen_tercero']], ['documento_identidad', 'FECHA_NACIMIENTO', ['fec_nacimiento']],
        ['cedula_extranjeria', 'SEXO_BIOLOGICO', ['sexoBiologico', 'gen_tercero']], ['diploma_pregrado', undefined, ['pregrado']],
        ['diploma_maestria', undefined, ['maestria']], ['resolucion_puntaje_salarial', undefined, ['puntajeSalarial']]];
      for (const id of [ids[0], ids[3], ids[5]]) {
        const profile = await previous.evidence(database, id);
        for (const [type, campo, fields] of cases) {
          const action = assertRundEvidenceData(ds, id, identities, type, campo);
          if (fields.some(field => hasRundData(profile[field]))) await action;
          else await assert.rejects(action, error => error.getStatus() === 400);
        }
      }
    });
    await check('Identidad expediente: carga HTTP real crea PDF en ruta del documento confiable y conserva versiones y metadatos', async () => {
      const created = await request(route, { method: 'POST', body: form(), status: 201 }); current = created.data;
      assert.equal(current.version, 1); assert.equal(current.docenteId, ids[0]); assert(current.rundSoporteId);
      const row = (await database.query('SELECT * FROM rund."RundDocumentoPerfil" WHERE id=$1', [current.id])).rows[0];
      const safeDocument = rawDocument.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      assert(row.almacenamiento_ruta.startsWith('rund-documentos/' + safeDocument + '/IDENTIDAD/'));
      assert.deepEqual(fs.readFileSync(path.join(appDir, 'uploads', row.almacenamiento_ruta)), pdf);
      assert.equal((await request(route)).data[0].id, current.id);
    });
    await check('Identidad expediente: fallo de coincidencias bloquea listado, carga, reemplazo y eliminación sin escrituras ni archivos', async () => {
      const before = await snapshot();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setCoincidenciasMode(mode);
        await request(route, { status: 503 });
        await request(route, { method: 'POST', body: form({ ...data, tipoSoporte: 'pasaporte' }), status: 503 });
        await request(route + '/' + current.id + '/reemplazo', { method: 'POST', body: form({ campo: 'DOCUMENTO_IDENTIDAD' }), status: 503 });
        await request(route + '/' + current.id, { method: 'DELETE', status: 503 });
      } } finally { authFixture.setCoincidenciasMode('normal'); }
      assert.deepEqual(await snapshot(), before);
    });
    await check('Identidad expediente: ficha caída o parcial bloquea evidencia de identidad; títulos nativos siguen funcionando', async () => {
      const before = await snapshot();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setFichaMode(mode);
        await request(route, { method: 'POST', body: form({ ...data, tipoSoporte: 'pasaporte' }), status: 503 });
        await request(route + '/' + current.id + '/reemplazo', { method: 'POST', body: form({ campo: 'DOCUMENTO_IDENTIDAD' }), status: 503 });
      } } finally { authFixture.setFichaMode('normal'); }
      assert.deepEqual(await snapshot(), before);
      authFixture.setFichaMode('unavailable');
      try { await assertRundEvidenceData(ds, ids[0], identities, 'diploma_pregrado'); }
      finally { authFixture.setFichaMode('normal'); }
    });
    await check('Identidad expediente: JWT, propiedad docente y metadatos protegidos conservan restricciones', async () => {
      const admin = jwt.sign({ sub: randomUUID(), roles: ['ADMIN'] }, { expiresIn: '2m' });
      const foreignUser = (await database.query(`SELECT u.id_user FROM auth."user" u
        JOIN rund."Docente" d ON d."personaId"=u.id_person WHERE d.id=$1`, [docenteId])).rows[0].id_user;
      const teacher = jwt.sign({ sub: foreignUser, roles: ['DOCENTE'] }, { expiresIn: '2m' });
      await request(route, { token: null, status: 401 }); await request(route, { token: teacher, status: 403 });
      const protectedRow = (await request(route, { token: admin })).data[0];
      assert.equal(protectedRow.nombreArchivo, 'Documento del perfil.pdf'); assert.equal(protectedRow.contenidoUrl, null);
      await request(route + '/' + current.id + '/contenido', { token: admin, status: 403 });
      await request(route, { token: teacher, method: 'POST', body: form(), status: 403 });
    });
    await check('Identidad expediente: CRUD y vinculación usan rol sin SQL Auth/PTA y mantienen versiones, auditoría y revisión', async () => {
      const actor = { actorId: 'PRUEBA_EXPEDIENTE', roles: ['SUPER_ADMIN'], fullAccess: true };
      const version1 = (await service.list(ids[0]))[0]; assert.equal(version1.id, current.id);
      assert.deepEqual((await service.content(ids[0], current.id, actor)).buffer, pdf);
      const file = { originalname: 'version-2.pdf', mimetype: 'application/pdf', size: pdf.length, buffer: pdf };
      const version2 = await service.replace(ids[0], current.id, file, actor.actorId, 'reemplazo ficticio', undefined, 'DOCUMENTO_IDENTIDAD');
      assert.equal(version2.version, 2); assert.equal(version2.documentoLogicoId, version1.documentoLogicoId);
      const history = await service.list(ids[0], undefined, true); assert.equal(history.length, 2);
      assert.equal(history.find(row => row.id === current.id).estado, 'REEMPLAZADO');
      assert.deepEqual((await service.content(ids[0], current.id, actor)).buffer, pdf);
      const bank = Object.create(BancoDocentesService.prototype);
      Object.assign(bank, { dataSource: ds, identities, auditLogRepo: ds.getRepository(RundAprobacionLogEntity),
        logger: { warn: message => { throw new Error(message); } }, resolveDocenteId: async id => id });
      const first = await bank.vincularSoporte(ids[5], 'FORMACION', { tipoSoporte: 'diploma_pregrado', documentoCarpetaId: '/pta/api/v1/uploads/ficticio.pdf', cargadoPor: actor.actorId });
      const second = await bank.vincularSoporte(ids[5], 'FORMACION', { tipoSoporte: 'diploma_pregrado', documentoCarpetaId: '/rund/api/v1/uploads/ficticio-v2.pdf', cargadoPor: actor.actorId });
      assert.equal(first.id, second.id);
      const legacy = (await ds.query('SELECT * FROM rund."RundSoporteCampo" WHERE id=$1', [second.id]))[0];
      assert.equal(legacy.documento_carpeta_id, '/rund/api/v1/uploads/ficticio-v2.pdf'); assert.equal(legacy.estado, 'Pendiente');
      await service.remove(ids[0], version2.id, actor.actorId);
      assert.equal((await service.list(ids[0])).length, 0); assert.equal((await service.list(ids[0], undefined, true)).length, 2);
      const logs = await ds.query('SELECT accion FROM rund."RundAprobacionLog" WHERE docente_id=ANY($1::text[])', [ids]);
      for (const action of ['CARGAR_DOCUMENTO', 'REEMPLAZAR_DOCUMENTO', 'ELIMINAR_DOCUMENTO', 'VINCULAR_SOPORTE']) assert(logs.some(row => row.accion === action));
    });
    await check('Identidad expediente: fallo de auditoría revierte carga y retira el PDF sin alterar versiones previas', async () => {
      const before = await snapshot();
      await database.query(`CREATE FUNCTION rund.reject_document_identity_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.docente_id='${ids[0]}' AND NEW.accion='CARGAR_DOCUMENTO' THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA';
        END IF; RETURN NEW; END $$; CREATE TRIGGER reject_document_identity_audit BEFORE INSERT ON rund."RundAprobacionLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_document_identity_audit()`);
      try { await request(route, { method: 'POST', body: form(), status: 500 }); }
      finally { await database.query('DROP TRIGGER reject_document_identity_audit ON rund."RundAprobacionLog"; DROP FUNCTION rund.reject_document_identity_audit()'); }
      assert.deepEqual(await snapshot(), before);
    });
  } finally {
    authFixture.setCoincidenciasMode('normal'); authFixture.setFichaMode('normal');
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    if (ds.isInitialized) await ds.destroy();
    if (roleCreated) await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
    const rows = (await database.query('SELECT almacenamiento_ruta FROM rund."RundDocumentoPerfil" WHERE docente_id=ANY($1::text[])', [ids])).rows;
    for (const row of rows) {
      const target = path.resolve(appDir, 'uploads', row.almacenamiento_ruta);
      assert(target.startsWith(path.resolve(appDir, 'uploads') + path.sep)); fs.rmSync(target, { force: true });
    }
    for (const table of ['RundSoporteCampo', 'RundDocumentoPerfil', 'RundCampoEstado', 'Docente']) {
      await database.query(`DELETE FROM rund."${table}" WHERE ${table === 'Docente' ? 'id' : 'docente_id'}=ANY($1::text[])`, [ids]);
    }
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [people]);
  }
};
