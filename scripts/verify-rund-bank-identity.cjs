/* Banco, ficha y estadísticas contra PostgreSQL temporal. La consulta anterior
 * está congelada en fixtures/rund-banco-before-api.sql solo como referencia de prueba.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyBankIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, authUrl, authFixture, authToken, jwt } = context;
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const { BancoDocentesService } = require(path.join(serviceRoot, 'dist/modules/banco-docentes/banco-docentes.service'));
  const { protectRundSensitiveData } = require(path.join(serviceRoot, 'dist/modules/banco-docentes/banco-docentes-sensitive-data'));
  const originalSql = fs.readFileSync(path.join(__dirname, 'fixtures/rund-banco-before-api.sql'), 'utf8');
  const currentSql = BancoDocentesService.prototype.authDocentesBaseSql();
  const marker = 'BANCOFICTICIO' + randomUUID().replace(/-/g, '').slice(0, 8);
  const people = Array.from({ length: 5 }, () => randomUUID()), users = people.slice(0, 4).map(() => randomUUID());
  const roles = Array.from({ length: 3 }, () => randomUUID());
  const profiles = ['BANCO-A-' + randomUUID(), 'BANCO-B-' + randomUUID(), 'BANCO-SIN-USUARIO-' + randomUUID()];
  const secIds = ['9007199254740998', '9007199254740999'], siteIds = ['9007199254740993', '9007199254740994'];
  const document = '00012345678';
  const native = async () => (await database.query('SELECT to_jsonb(d) AS row FROM rund."Docente" d ORDER BY id')).rows;
  const source = async (status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(authUrl + '/internal/rund/v1/banco/proyeccion', { headers });
    assert.equal(res.status, status, await res.clone().text());
    return { res, data: (await res.json()).data };
  };
  const serialize = data => JSON.parse(JSON.stringify(data));
  const publicProfile = data => serialize(protectRundSensitiveData(data, true));
  const publicList = ({ data, ...pagination }) => ({ success: true, items: data.map(publicProfile), ...pagination });
  // En la referencia se ejecuta el CTE anterior. Las condiciones finales y el
  // mapeador público se conservan; los parámetros vuelven a su posición original.
  const reference = Object.create(BancoDocentesService.prototype);
  reference.authBanco = { proyeccion: async () => ({}) };
  reference.dataSource = { query: async (sql, params) => {
    assert(sql.includes(currentSql));
    const tail = sql.slice(sql.indexOf(currentSql) + currentSql.length)
      .replace(/\$(\d+)/g, (_, n) => '$' + (Number(n) - 1))
      .replaceAll('FROM auth_seccionales filtro_sec', 'FROM auth.seccionales filtro_sec');
    return (await database.query(originalSql + tail, params.slice(1))).rows;
  } };
  const canonicalStats = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    Array.isArray(value) ? value.slice().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : value]));
  const listRoute = filters => '/banco-docentes?' + new URLSearchParams(filters);
  const profileRoute = (id, period) => '/banco-docentes/' + encodeURIComponent(id) + (period ? '?periodoCarga=' + period : '');
  try {
    await database.query(`INSERT INTO auth.geopolitica (id_geopolitica,cod_geopolitica,nom_div_geopolitica,ind_oculto)
      VALUES ($1,'BFICTICIO','Ubicación banco ficticia',0)`, [siteIds[0]]);
    for (let i = 0; i < 2; i++) {
      await database.query(`INSERT INTO auth.seccionales (id_seccional,nom_seccional,cod_seccional) VALUES ($1,$2,$3)`,
        [secIds[i], i ? 'Operativa banco ficticia' : 'Norte de Santander', i ? '010' : '001']);
      await database.query(`INSERT INTO auth.sedes (id_sede,nom_sede,id_seccional,id_empresa,cod_sede,id_geopolitica)
        VALUES ($1,$2,$3,1,$4,$5)`,
        [siteIds[i], i ? 'CETAP perfil ficticio' : 'CETAP persona ficticia', secIds[i], 'BF' + i, siteIds[0]]);
    }
    await database.query(`INSERT INTO auth.role (id,code,name,category,is_active) VALUES
      ($1,$4,'docente','personalizado',true),($2,$5,'DoCeNtE','personalizado',false),($3,$6,$6,'personalizado',true)`,
      [...roles, marker + 'ALIAS', marker + 'INACTIVO', marker + 'OTRO']);
    for (let i = 0; i < people.length; i++) {
      await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,
        nom_tercero,pri_apellido,seg_apellido,gen_tercero,fec_nacimiento,dir_email,tel_celular,id_seccional,id_sede)
        VALUES ($1,$2,'CC',$3,$4,'APELLIDO','SEGUNDO','F','1980-01-17',$5,'3001234567',$6,$7)`,
        [people[i], i ? marker + i : ' 000.123.456.78 ', i ? marker + ' ' + i : '', marker,
          marker.toLowerCase() + i + '@example.test', secIds[0], siteIds[0]]);
      if (i < users.length) {
        await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active,created_at,updated_at)
          VALUES ($1,$2,$3,'HASH_FICTICIO',$4,$5,'2020-01-01T09:00:00-05:00','2026-02-03T09:05:06-05:00')`,
          [users[i], randomUUID(), marker + i, people[i], i !== 0]);
        await database.query(`INSERT INTO auth.user_roles (id_user,id_rol,is_active) VALUES ($1,$2,$3)`,
          [users[i], i === 3 ? roles[1] : roles[0], i !== 2]);
      }
    }
    await database.query('INSERT INTO auth.user_roles (id_user,id_rol,is_active) VALUES ($1,$2,true),($1,$3,false)', [users[0], roles[2], roles[1]]);
    for (let i = 0; i < profiles.length; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d) || jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$3::text,'territorialId',$4::text,'sedeId',$5::text,
        'territorialReportada',$6::text,'idRund',$7::text,'horasAsignables',$8::int,'estado',$9::text,
        'ordenListado',$10::int,'escalafon','Titular','nucleoTematico','Ciencias Sociales','nivelFormacion','Maestría',
        'updatedAt',$11::text))).* FROM rund."Docente" d WHERE id=$12`,
      [profiles[i], i === 2 ? people[4] : people[0], i === 1 ? '2026-2' : '2025-1',
        i === 1 ? secIds[1] : '', i === 1 ? siteIds[1] : null, i === 1 ? '  Operativa banco ficticia  ' : 'NORTE-SANTANDER',
        i === 1 ? null : 'RUND-BANCO-FICTICIO-' + i, i === 1 ? 800 : 0, i === 1 ? 'ACTIVO' : 'RETIRADO',
        900000 + i, i === 1 ? '2026-01-01' : '2025-01-01', docenteId]);

    await check('Banco identidad: API Auth exige token interno y no expone secretos ni perfiles RUND', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(401, headers);
      const { res, data } = await source(); assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.equal(data.version, 1); assert.equal(data.items.length, data.total);
      const row = data.items.find(item => item.id_user === users[0]); assert(row);
      assert.equal(row.num_identificacion, ' 000.123.456.78 '); assert.equal(row.id_seccional, secIds[0]);
      assert.equal(row.id_sede, siteIds[0]); assert.equal(row.is_active, false);
      assert.deepEqual(Object.keys(row).sort(), ['id_user','username','is_active','created_at','updated_at','id_person',
        'num_identificacion','tip_identificacion','nom_largo','nom_tercero','pri_apellido','seg_apellido','gen_tercero',
        'fec_nacimiento','dir_email','tel_celular','id_seccional','id_sede','roles'].sort());
      assert(!/password|token|puntaje|salario|horasAsignables/.test(JSON.stringify(data)));
    });
    await check('Banco identidad: conserva rol por nombre, cuentas inactivas y excluye rol o asignación inactivos y personas sin usuario', async () => {
      const { data } = await source(); const own = data.items.filter(item => people.includes(item.id_person));
      assert.deepEqual(own.map(item => item.id_user).sort(), users.slice(0, 2).sort());
      assert.deepEqual(own.find(item => item.id_user === users[0]).roles, [marker + 'ALIAS', marker + 'OTRO']);
    });
    await check('Banco identidad: listado completo, paginación y filtros coinciden con el CTE anterior', async () => {
      for (const filters of [{ search: marker }, { search: marker, page: 1, limit: 1 }, { search: marker, page: 2, limit: 1 },
        { search: marker, periodoCarga: '2026-2' }, { search: marker, estado: 'ACTIVO' }, { search: marker, estado: 'INACTIVO' },
        { search: marker, estado: 'SUSPENDIDO' }, { search: marker, dedicacion: 'NO-EXISTE' },
        { search: marker, vinculacion: 'CARRERA' }, { search: "' OR true --" },
        { search: marker, territorial: secIds[0] }, { search: marker, territorial: secIds[1] }]) {
        const before = authFixture.bankIdentityRequestCount();
        const actual = await request(listRoute(filters));
        assert.deepEqual(actual, publicList(await reference.list(filters)));
        assert.equal(authFixture.bankIdentityRequestCount() - before, 1);
      }
    });
    await check('Banco identidad: ficha conserva alias de usuario/persona/documento con puntos e ID docente textual y prioridad de período', async () => {
      for (const id of [users[0], people[0], document, ' 000.123.456.78 ', profiles[0]]) {
        for (const period of [undefined, '2025-1', ...(id === profiles[0] ? [] : ['2026-2'])]) {
          assert.deepEqual((await request(profileRoute(id, period))).data, publicProfile(await reference.getById(id, period)));
        }
      }
      assert.equal((await request(profileRoute(people[0]))).data.docente_id, profiles[0]);
      const current = (await request(profileRoute(people[0], '2026-2'))).data;
      assert.equal(current.docente_id, profiles[1]); assert.equal(current.activo, true);
      assert.equal(current.territorial_id, secIds[1]); assert.equal(current.sede_id, siteIds[1]);
      assert.equal(current.nacimiento, '1980-01-17');
      assert.equal(current.createdAt, '2020-01-01T14:00:00.000Z');
      await request(profileRoute(people[0], '2099-2'), { status: 404 });
      await request(profileRoute(people[4]), { status: 404 });
    });
    await check('Banco identidad: usuario docente sin perfil nativo sigue en listado/ficha sin crear registros', async () => {
      const before = await native();
      const result = (await request(profileRoute(users[1]))).data;
      assert.deepEqual(result, publicProfile(await reference.getById(users[1])));
      assert.equal(result.docente_id, null); assert.equal(result.id, users[1]);
      assert.equal(result.territorial_id, secIds[0]); assert.equal(result.sede_id, siteIds[0]);
      assert.deepEqual(await native(), before);
    });
    await check('Banco identidad: resumen y nueve grupos estadísticos coinciden con el SQL anterior y usan una lectura Auth', async () => {
      for (const filters of [{}, { periodoCarga: '2026-2' }, { territorial: secIds[0] }, { territorial: secIds[1] },
        { estado: 'INACTIVO' }, { categoria: 'titular' }, { genero: 'f' }, { nivelFormacion: 'maestría' },
        { nucleoTematico: 'ciencias sociales' }, { territorial: secIds[1], periodoCarga: '2026-2', estado: 'ACTIVO' }]) {
        const before = authFixture.bankIdentityRequestCount();
        const actual = (await request('/banco-docentes/stats?' + new URLSearchParams(filters))).data;
        assert.deepEqual(canonicalStats(actual), canonicalStats(serialize(await reference.getStats(filters))));
        assert.equal(authFixture.bankIdentityRequestCount() - before, 1);
      }
    });
    await check('Banco identidad: caídas, ruta 404 o proyección parcial producen 503 sin SQL alternativo ni mutaciones', async () => {
      const before = await native();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setBankIdentityMode(mode);
        await request(listRoute({ search: marker }), { status: 503 });
        await request(profileRoute(users[0]), { status: 503 });
        await request('/banco-docentes/stats', { status: 503 });
      } } finally { authFixture.setBankIdentityMode('normal'); }
      assert.deepEqual(await native(), before);
      assert.deepEqual(await request(listRoute({ search: marker })), publicList(await reference.list({ search: marker })));
    });
    await check('Banco identidad: ausencia explícita devuelve listado/estadísticas vacíos y ficha 404', async () => {
      authFixture.setBankIdentityMode('empty');
      try {
        assert.deepEqual(await request('/banco-docentes'), { success: true, items: [], total: 0, page: 1, limit: 50, pages: 0 });
        assert.equal((await request('/banco-docentes/stats')).data.total, 0);
        await request(profileRoute(users[0]), { status: 404 });
      } finally { authFixture.setBankIdentityMode('normal'); }
    });
    await check('Banco identidad: cambios del propietario se reflejan en la siguiente operación, sin caché persistida', async () => {
      await database.query('UPDATE auth.personas SET nom_largo=$2 WHERE id_person=$1', [people[0], marker + ' ACTUALIZADO']);
      assert.equal((await request(profileRoute(users[0]))).data.nombre_completo, marker + ' ACTUALIZADO');
      await database.query('UPDATE auth.user_roles SET is_active=false WHERE id_user=$1 AND id_rol=$2', [users[0], roles[0]]);
      await request(profileRoute(users[0]), { status: 404 });
      await database.query('UPDATE auth.user_roles SET is_active=true WHERE id_user=$1 AND id_rol=$2', [users[0], roles[0]]);
      assert.equal((await request(profileRoute(users[0]))).data.docente_id, profiles[0]);
    });
    await check('Banco identidad: permisos y propiedad docente siguen restringiendo perfiles ajenos y listado', async () => {
      const ownToken = jwt.sign({ sub: users[0], roles: ['DOCENTE'] }, { expiresIn: '2m' });
      await request('/banco-docentes', { token: ownToken, status: 403 });
      await request(profileRoute(users[0]), { token: ownToken });
      await request(profileRoute(users[1]), { token: ownToken, status: 403 });
      await request(profileRoute(users[0]), { token: null, status: 401 });
    });
    await check('Banco identidad: auditoría fallida bloquea listado y ficha sin entregar datos ni alterar perfiles', async () => {
      const before = await native();
      await database.query(`CREATE FUNCTION rund.reject_bank_identity_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF (NEW.metadata->>'endpoint') IN ('BANCO_DOCENTES_LISTADO','PERFIL_RUND_POR_ID')
          THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_bank_identity_audit BEFORE INSERT ON rund."RundAprobacionLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_bank_identity_audit()`);
      try {
        for (const route of [listRoute({ search: marker }), profileRoute(users[0])]) {
          const response = await request(route, { status: 500 });
          assert.equal(response.items, undefined); assert.equal(response.data, undefined);
        }
      } finally {
        await database.query('DROP TRIGGER reject_bank_identity_audit ON rund."RundAprobacionLog"; DROP FUNCTION rund.reject_bank_identity_audit()');
      }
      assert.deepEqual(await native(), before);
    });
    await check('Banco identidad: consultas de listado/ficha/estadísticas funcionan sin permisos SQL sobre Auth', async () => {
      const { Client } = require(path.join(serviceRoot, 'node_modules/pg'));
      const role = 'rund_banco_' + randomUUID().replace(/-/g, ''); assert.match(role, /^[a-z0-9_]+$/);
      const client = new Client(pgConfig); await client.connect();
      await database.query(`CREATE ROLE "${role}" NOLOGIN`);
      try {
        await database.query(`GRANT USAGE ON SCHEMA rund TO "${role}"`);
        await database.query(`GRANT SELECT ON rund."Docente" TO "${role}"`);
        await client.query(`SET ROLE "${role}"`);
        await assert.rejects(client.query('SELECT id_person FROM auth.personas LIMIT 1'), error => error.code === '42501');
        const current = Object.create(BancoDocentesService.prototype);
        current.authBanco = { proyeccion: async () => (await source()).data };
        current.dataSource = { query: async (sql, params) => {
          assert(!/auth\.|academic_work_plan\./.test(sql)); return (await client.query(sql, params)).rows;
        } };
        assert.deepEqual(serialize(await current.list({ search: marker })), serialize(await reference.list({ search: marker })));
        assert.deepEqual(serialize(await current.getById(users[0], '2026-2')), serialize(await reference.getById(users[0], '2026-2')));
        assert.deepEqual(canonicalStats(serialize(await current.getStats({ territorial: secIds[0] }))),
          canonicalStats(serialize(await reference.getStats({ territorial: secIds[0] }))));
      } finally {
        await client.end(); await database.query(`REVOKE SELECT ON rund."Docente" FROM "${role}"`);
        await database.query(`REVOKE USAGE ON SCHEMA rund FROM "${role}"`); await database.query(`DROP ROLE "${role}"`);
      }
    });
  } finally {
    authFixture.setBankIdentityMode('normal');
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [profiles]);
    await database.query('DELETE FROM auth.user_roles WHERE id_user=ANY($1::uuid[])', [users]);
    await database.query('DELETE FROM auth."user" WHERE id_user=ANY($1::uuid[])', [users]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [people]);
    await database.query('DELETE FROM auth.role WHERE id=ANY($1::uuid[])', [roles]);
    await database.query('DELETE FROM auth.sedes WHERE id_sede=ANY($1::bigint[])', [siteIds]);
    await database.query('DELETE FROM auth.geopolitica WHERE id_geopolitica=$1', [siteIds[0]]);
    await database.query('DELETE FROM auth.seccionales WHERE id_seccional=ANY($1::bigint[])', [secIds]);
  }
};
