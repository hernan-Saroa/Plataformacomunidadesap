/* Identidad de soportes: exclusivamente PostgreSQL y archivos ficticios temporales. */
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const previous = require('./fixtures/rund-vencimientos-before-api.cjs');

module.exports = async function verifySupportIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, jwt, authUrl, authFixture, authToken, ptaFixture, appDir } = context;
  assert(path.resolve(appDir).startsWith(path.resolve(runtime) + path.sep));
  const root = path.resolve(__dirname, '..'), rundRoot = path.join(root, 'backend/rund-service');
  const { BancoDocentesService } = require(path.join(rundRoot, 'dist/modules/banco-docentes/banco-docentes.service'));
  const { AuthIdentityClient } = require(path.join(rundRoot, 'dist/common/auth-identity.client'));
  const { RundCatalogosClient } = require(path.join(rundRoot, 'dist/common/rund-catalogos.client'));
  const { protectRundSensitiveData } = require(path.join(rundRoot, 'dist/modules/banco-docentes/banco-docentes-sensitive-data'));
  const { Client } = require(path.join(rundRoot, 'node_modules/pg'));
  const people = Array.from({ length: 3 }, () => randomUUID()), ids = Array.from({ length: 3 }, () => 'SOPORTE-' + randomUUID());
  const supports = Array.from({ length: 8 }, () => randomUUID()), usuario = randomUUID();
  const tag = randomUUID().slice(0, 8).toUpperCase(), authName = 'AUTH SOPORTES ' + tag;
  const ptaParts = [' José ', ' Luis', 'Muñoz', tag], historicalName = ptaParts.join(' ').replace(/[^a-zA-Z0-9 -]/g, '').trim().toUpperCase();
  const folder = path.join(appDir, 'uploads/carpeta-digital', authName, 'RUND');
  const historicalFolder = path.join(appDir, 'uploads/carpeta-digital', historicalName, 'RUND');
  const serial = value => JSON.parse(JSON.stringify(value));
  const publicRows = rows => rows.map(row => serial(protectRundSensitiveData(row, true)));
  const snapshot = async () => {
    const out = {};
    for (const [schema, table] of [['auth', 'personas'], ['academic_work_plan', 'Persona'],
      ...['Docente', 'RundSoporteCampo', 'RundDocumentoPerfil', 'RundAprobacionLog'].map(table => ['rund', table])]) {
      out[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return out;
  };
  const owner = async (id, status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(ptaFixture.url + '/internal/rund/v1/personas/' + id + '/nombre-historico', { headers });
    assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  try {
    for (let i = 0; i < 2; i++) await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,fec_nacimiento)
      VALUES ($1,$2,'CC',$3,'SOPORTES','FICTICIO','X','1980-01-17')`,
    [people[i], 'SOPORTES-' + tag + i, i ? '' : authName]);
    for (let i = 0; i < 3; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'estado','INACTIVO','periodoCarga','2020-1'))).*
      FROM rund."Docente" d WHERE id=$3`, [ids[i], people[i], docenteId]);
    await database.query(`INSERT INTO academic_work_plan."Usuario" (id,email,password) VALUES ($1,$2,'ficticio')`, [usuario, tag + '@example.test']);
    await database.query(`INSERT INTO academic_work_plan."Persona"
      (id,"usuarioId",primer_nombre,segundo_nombre,primer_apellido,segundo_apellido)
      VALUES ($1,$2,$3,$4,$5,$6)`, [people[0], usuario, ...ptaParts]);
    const states = ['Pendiente', 'Aprobado', 'Rechazado', 'rechazado', 'Pendiente', 'Pendiente', 'Pendiente', 'Pendiente'];
    const days = [-10, 5, 5, 15, 90, null, -3, 7];
    for (let i = 0; i < supports.length; i++) await database.query(`INSERT INTO rund."RundSoporteCampo"
      (id,docente_id,bloque,tipo_soporte,nombre_archivo,estado,fecha_vencimiento,cargado_por)
      VALUES ($1,$2,'TRANSVERSAL','soporte_edicion_perfil',$3,$4,NOW()+$5::interval,'PRUEBA_SOPORTES')`,
    [supports[i], i === 6 ? ids[1] : i === 7 ? ids[2] : ids[0], 'soporte-' + i + '.pdf', states[i], days[i] === null ? null : days[i] + ' days']);
    fs.mkdirSync(folder, { recursive: true }); fs.writeFileSync(path.join(folder, 'nuevo.pdf'), 'contenido ficticio inmutable');
    fs.mkdirSync(historicalFolder, { recursive: true }); fs.writeFileSync(path.join(historicalFolder, 'historico.pdf'), 'histórico ficticio');
    await check('Identidad soportes: PTA exige token interno, valida UUID y publica solo nombres históricos sin caché', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await owner(people[0], 401, headers);
      await owner('no-es-uuid', 400);
      const before = await snapshot(), { res, body } = await owner(people[0]);
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(body, { items: [{ personaId: people[0], primer_nombre: ptaParts[0], segundo_nombre: ptaParts[1],
        primer_apellido: ptaParts[2], segundo_apellido: ptaParts[3] }], total: 1 });
      assert.deepEqual((await owner(people[1])).body, { items: [], total: 0 });
      assert.deepEqual(await snapshot(), before);
    });
    await check('Identidad soportes: vencimientos conserva DTO completo del SQL anterior, umbrales, estados y huérfanos', async () => {
      for (const days of [-5, 0, 30, 365]) {
        const result = await request('/banco-docentes/soportes/proximos-vencer?dias=' + days);
        assert.deepEqual(result.data, publicRows(await previous(database, days)));
        assert(!JSON.stringify(result).includes('_rundPersonaId'));
      }
      const data = (await request('/banco-docentes/soportes/proximos-vencer')).data;
      assert(data.some(row => row.id === supports[6] && row.nombre_docente === ''));
      assert(!data.some(row => [supports[2], supports[4], supports[5], supports[7]].includes(row.id)));
    });
    await check('Identidad soportes: diagnóstico conserva carpeta histórica PTA distinta de Auth y ausencia por ID', async () => {
      const result = await request('/banco-docentes/admin/sync-check/' + ids[0]);
      assert.equal(result.data.docenteNombre, historicalName); assert.equal(result.data.diskCount, 1);
      assert.equal(result.data.dbCount, 6);
      const missing = await request('/banco-docentes/admin/sync-check/' + ids[1]);
      assert.equal(missing.data.docenteNombre, ids[1]); assert.equal(missing.data.diskCount, 0);
    });
    await check('Identidad soportes: caída, 404 o respuesta parcial de PTA falla sin diagnóstico ficticio ni escrituras', async () => {
      const before = await snapshot();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        ptaFixture.setNombreMode(mode); const result = await request('/banco-docentes/admin/sync-check/' + ids[0], { status: 503 });
        assert.equal(result.data, undefined);
      } } finally { ptaFixture.setNombreMode('normal'); }
      assert.deepEqual(await snapshot(), before);
    });
    await check('Identidad soportes: Auth indisponible no devuelve vencimientos ni inicia reparación o enlaces', async () => {
      const before = await snapshot();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setCoincidenciasMode(mode);
        await request('/banco-docentes/soportes/proximos-vencer', { status: 503 });
        await request('/banco-docentes/admin/sync-all-soportes', { method: 'POST', status: 503 });
        await request('/banco-docentes/reparar-soportes-db', { status: 503 });
      } } finally { authFixture.setCoincidenciasMode('normal'); }
      assert.deepEqual(await snapshot(), before);
      assert.equal(fs.readFileSync(path.join(folder, 'nuevo.pdf'), 'utf8'), 'contenido ficticio inmutable');
    });
    await check('Identidad soportes: JWT, permisos, enmascaramiento y umbral inválido mantienen la protección pública', async () => {
      const admin = jwt.sign({ sub: randomUUID(), roles: ['ADMIN'] }, { expiresIn: '2m' });
      const teacher = jwt.sign({ sub: randomUUID(), roles: ['DOCENTE'] }, { expiresIn: '2m' });
      for (const route of ['/banco-docentes/soportes/proximos-vencer', '/banco-docentes/admin/sync-check/' + ids[0]]) {
        await request(route, { token: null, status: 401 }); await request(route, { token: teacher, status: 403 });
      }
      await request('/banco-docentes/admin/sync-all-soportes', { method: 'POST', token: admin, status: 403 });
      const data = (await request('/banco-docentes/soportes/proximos-vencer', { token: admin })).data;
      assert(data.length > 0); assert(data.every(row => row.proteccion_datos.acceso_completo === false));
      await request('/banco-docentes/soportes/proximos-vencer?dias=invalido', { status: 400 });
    });
    await check('Identidad soportes: auditoría fallida bloquea vencimientos y diagnóstico sin entregar resultados', async () => {
      await database.query(`CREATE FUNCTION rund.reject_support_identity_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF (NEW.metadata->>'endpoint') IN ('SOPORTES_RUND_POR_VENCER','DIAGNOSTICO_SOPORTES_RUND')
          THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_support_identity_audit BEFORE INSERT ON rund."RundAprobacionLog"
          FOR EACH ROW EXECUTE FUNCTION rund.reject_support_identity_audit()`);
      try { for (const route of ['/banco-docentes/soportes/proximos-vencer', '/banco-docentes/admin/sync-check/' + ids[0]]) {
        assert.equal((await request(route, { status: 500 })).data, undefined);
      } } finally { await database.query('DROP TRIGGER reject_support_identity_audit ON rund."RundAprobacionLog"; DROP FUNCTION rund.reject_support_identity_audit()'); }
    });
    await check('Identidad soportes: tres flujos funcionan con rol RUND sin acceso SQL a Auth o PTA y reparación idempotente', async () => {
      const role = 'support_' + randomUUID().replace(/-/g, '');
      const client = new Client(pgConfig); await client.connect();
      const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'ACADEMIC_WORK_PLAN_SERVICE_URL', 'PTA_INTERNAL_SERVICE_TOKEN'];
      const saved = keys.map(key => process.env[key]), oldCwd = process.cwd();
      try {
        await database.query(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA rund TO ${role};
          GRANT SELECT ON rund."Docente",rund."RundSoporteCampo",rund."RundDocumentoPerfil" TO ${role};
          GRANT INSERT,UPDATE ON rund."RundSoporteCampo" TO ${role}`);
        await client.query('SET ROLE ' + role);
        for (const table of ['auth.personas', 'academic_work_plan."Persona"']) await assert.rejects(client.query('SELECT * FROM ' + table), /permission denied/);
        [process.env.AUTH_SERVICE_URL, process.env.AUTH_INTERNAL_SERVICE_TOKEN,
          process.env.ACADEMIC_WORK_PLAN_SERVICE_URL, process.env.PTA_INTERNAL_SERVICE_TOKEN] = [authUrl, authToken, ptaFixture.url, authToken];
        process.chdir(appDir);
        const service = Object.create(BancoDocentesService.prototype);
        service.identities = new AuthIdentityClient(); service.catalogos = new RundCatalogosClient();
        service.dataSource = { query: async (sql, params) => {
          assert(!/auth\.|academic_work_plan\./.test(sql)); return (await client.query(sql, params)).rows;
        } };
        service.docenteRepo = { findOne: async () => (await client.query('SELECT * FROM rund."Docente" WHERE id=$1', [ids[0]])).rows[0],
          find: async () => (await client.query('SELECT * FROM rund."Docente" WHERE id=ANY($1::text[])', [ids])).rows };
        service.resolveDocenteId = async id => id;
        assert.deepEqual(serial(await service.getSoportesProximosVencer()), serial(await previous(database, 30)));
        assert.equal((await service.syncCheckDocente(ids[0])).diskCount, 1);
        const before = new Map((await database.query('SELECT * FROM rund."RundSoporteCampo" WHERE docente_id=$1', [ids[0]])).rows.map(row => [row.id, row]));
        const first = await service.repararSoportesMasivo(); assert.equal(first.totalRegistrosEnlazados, 1); assert.equal(first.totalRegistrosCreados, 0);
        const second = await service.repararSoportesMasivo(); assert.equal(second.totalRegistrosEnlazados, 0); assert.equal(second.totalRegistrosCreados, 0);
        const after = (await database.query('SELECT * FROM rund."RundSoporteCampo" WHERE documento_carpeta_id LIKE $1', ['%' + tag + '%'])).rows;
        assert.equal(after.length, 1);
        assert.deepEqual(after[0], { ...before.get(after[0].id), documento_carpeta_id:
          '/rund/api/v1/uploads/carpeta-digital/' + encodeURIComponent(authName) + '/RUND/nuevo.pdf' });
        assert.equal(fs.readFileSync(path.join(folder, 'nuevo.pdf'), 'utf8'), 'contenido ficticio inmutable');
      } finally {
        process.chdir(oldCwd); keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
        await client.end(); await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
      }
    });
  } finally {
    authFixture.setCoincidenciasMode('normal'); ptaFixture.setNombreMode('normal');
    await database.query('DELETE FROM rund."RundSoporteCampo" WHERE docente_id=ANY($1::text[])', [ids]);
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [ids]);
    await database.query('DELETE FROM academic_work_plan."Persona" WHERE id=$1', [people[0]]);
    await database.query('DELETE FROM academic_work_plan."Usuario" WHERE id=$1', [usuario]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [people]);
    for (const directory of [path.dirname(folder), path.dirname(historicalFolder)]) {
      assert(path.resolve(directory).startsWith(path.resolve(appDir) + path.sep));
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
};
