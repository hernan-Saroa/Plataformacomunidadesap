/* Identidad puntual: solo clúster ficticio del verificador, nunca instalaciones existentes. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { randomUUID, randomBytes, createHash } = require('node:crypto');

module.exports = async function verifyCardIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, authUrl, authFixture, authToken, jwt } = context;
  const root = path.resolve(__dirname, '..'), rundRoot = path.join(root, 'backend/rund-service');
  const load = file => require(path.join(rundRoot, 'dist', file));
  const { BancoDocentesService } = load('modules/banco-docentes/banco-docentes.service');
  const { protectRundSensitiveData } = load('modules/banco-docentes/banco-docentes-sensitive-data');
  const { BancoDocenteEntity } = load('entities/banco-docente.entity');
  const { BancoDocenteInvitacionEntity } = load('entities/banco-docente-invitacion.entity');
  const { DataSource } = require(path.join(rundRoot, 'node_modules/typeorm'));
  const person = randomUUID(), other = randomUUID(), orphan = randomUUID(), user = randomUUID(), invite = randomUUID();
  const profiles = ['CARD-A-' + randomUUID(), 'CARD-B-' + randomUUID(), 'CARD-C-' + randomUUID(), 'CARD-D-' + randomUUID()];
  const document = ' 000.456.789.12 ', normalized = '00045678912', email = 'card-' + randomUUID() + '@example.test';
  const session = randomBytes(32).toString('hex'), link = randomBytes(32).toString('hex');
  const fichaRoute = id => 'personas/ficha/por-persona/' + encodeURIComponent(id);
  const exactRoute = doc => 'personas/ficha/por-documento/' + encodeURIComponent(doc);
  const aliasRoute = key => 'personas/por-alias/' + encodeURIComponent(key);
  const cardRoute = id => '/banco-docentes/' + encodeURIComponent(id) + '/tarjeta-rund';
  const personRoute = (id, period) => '/banco-docentes/by-persona/' + encodeURIComponent(id) + '/tarjeta-rund'
    + (period ? '?periodoCarga=' + period : '');
  const infoRoute = token => '/banco-docentes/autogestion/me/' + token;
  const source = async (route, status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(authUrl + '/internal/rund/v1/' + route, { headers });
    assert.equal(res.status, status, await res.clone().text()); return { res, data: (await res.json()).data };
  };
  const serial = data => JSON.parse(JSON.stringify(data));
  const publicCard = data => serial(protectRundSensitiveData(data, true));
  const native = async () => (await database.query('SELECT to_jsonb(d) AS row FROM rund."Docente" d ORDER BY id')).rows;
  const previousAliasSql = fs.readFileSync(path.join(__dirname, 'fixtures/rund-resolve-docente-before-api.sql'), 'utf8');
  const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
    password: pgConfig.password, database: pgConfig.database, entities: [BancoDocenteEntity, BancoDocenteInvitacionEntity],
    synchronize: false, extra: { max: 1 } });
  await ds.initialize();
  const makeService = () => {
    const s = Object.create(BancoDocentesService.prototype);
    s.docenteRepo = ds.getRepository(BancoDocenteEntity); s.invitacionRepo = ds.getRepository(BancoDocenteInvitacionEntity);
    s.dataSource = { query: async (sql, params) => { assert(!/auth\./.test(sql)); return ds.query(sql, params); } };
    s.identities = {
      fichaPorPersona: async id => (await source(fichaRoute(id))).data.persona,
      fichaPorDocumento: async doc => (await source(exactRoute(doc))).data.persona,
      personasPorAlias: async key => (await source(aliasRoute(key))).data.personaIds,
    };
    s.authBanco = { proyeccion: async () => (await source('banco/proyeccion')).data };
    s.catalogos = { territorialesBanco: async () => (await source('catalogos/territoriales-banco')).data.items };
    s.logSensitiveDataAccess = async () => {}; // La auditoría real se comprueba por HTTP por separado.
    return s;
  };
  const reference = makeService();
  reference.identities.fichaPorPersona = async id => (await database.query(`SELECT nom_largo,num_identificacion,
    tip_identificacion,gen_tercero,fec_nacimiento,dir_email,tel_celular FROM auth.personas WHERE id_person=$1 LIMIT 1`, [id])).rows[0] || null;
  try {
    await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,
      nom_tercero,pri_apellido,seg_apellido,gen_tercero,fec_nacimiento,dir_email,tel_celular,id_seccional)
      VALUES ($1,$2,'CC','PERSONA HISTÓRICA APELLIDO SEGUNDO','PERSONA HISTÓRICA','APELLIDO','SEGUNDO','F',
        '1980-01-17','personal.ficticio@example.test','3001234567',999)`, [person, document]);
    for (let i = 0; i < 3; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d) || jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$3::text,'territorialReportada','META',
        'correoInstitucional',$4::text,'correoAlternativo','alternativo.ficticio@example.test',
        'puntajeSalarial',0,'updatedAt',$5::text))).* FROM rund."Docente" d WHERE id=$6`,
      [profiles[i], i === 2 ? orphan : person, i === 0 ? '2025-1' : '2026-2',
        i === 0 ? email : 'historico-' + i + '-' + email, i === 0 ? '2025-01-01' : '2026-01-01', docenteId]);
    await database.query(`INSERT INTO rund."BancoDocentesInvitaciones" (id,correo_institucional,token_acceso,
      estado,fecha_expiracion,sesion_token_hash,sesion_expira_en) VALUES ($1,$2,$3,'OTP validado',
      now()+interval '2 hours',$4,now()+interval '2 hours')`, [invite, email, link, createHash('sha256').update(session).digest('hex')]);

    await check('Tarjeta identidad: APIs Auth exigen token interno y proyectan columnas reales sin cuenta ni rol', async () => {
      for (const route of [fichaRoute(person), exactRoute(document), aliasRoute(normalized)]) {
        for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(route, 401, headers);
      }
      const { res, data } = await source(fichaRoute(person)); assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.equal(data.encontrada, true); assert.equal(data.consulta, person);
      assert.deepEqual(data.persona, { personaId: person, num_identificacion: document, tip_identificacion: 'CC',
        nom_largo: 'PERSONA HISTÓRICA APELLIDO SEGUNDO', nom_tercero: 'PERSONA HISTÓRICA', pri_apellido: 'APELLIDO',
        seg_apellido: 'SEGUNDO', gen_tercero: 'F', fec_nacimiento: '1980-01-17', dir_email: 'personal.ficticio@example.test', tel_celular: '3001234567' });
      assert.equal(Number((await database.query('SELECT count(*) FROM auth."user" WHERE id_person=$1', [person])).rows[0].count), 0);
    });
    await check('Tarjeta identidad: documento exacto y alias normalizado conservan sus contratos distintos y ausencia explícita', async () => {
      assert.equal((await source(exactRoute(document))).data.persona.personaId, person);
      assert.deepEqual((await source(exactRoute(normalized))).data, { consulta: normalized, encontrada: false, persona: null });
      assert.deepEqual((await source(aliasRoute(normalized))).data, { clave: normalized, personaIds: [person], total: 1 });
      const missing = randomUUID();
      assert.deepEqual((await source(fichaRoute(missing))).data, { consulta: missing, encontrada: false, persona: null });
    });
    await check('Tarjeta identidad: DTO completo y períodos históricos coinciden con lectura anterior, incluidos ceros y fecha civil', async () => {
      for (const id of profiles.slice(0, 3)) {
        const actual = (await request(cardRoute(id))).data;
        assert.deepEqual(actual, publicCard(await reference.getTarjetaRUND(id)));
      }
      for (const period of ['2025-1', '2026-2']) {
        const actual = (await request(personRoute(person, period))).data;
        assert.deepEqual(actual, publicCard(await reference.getTarjetaRUND(profiles[period === '2025-1' ? 0 : 1])));
      }
      assert.equal((await request(personRoute(document, '2025-1'))).data.docenteId, profiles[0]);
      assert.equal((await request(personRoute(normalized, '2025-1'))).data, null);
      const orphanCard = (await request(cardRoute(profiles[2]))).data;
      assert(orphanCard.bloques.IDENTIDAD.campos.some(field => field.campo === 'DOCUMENTO_IDENTIDAD' && field.valor === null));
    });
    await check('Tarjeta identidad: alias de usuario inactivo, persona y cédula mantienen resolución propia por período/fecha', async () => {
      await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
        VALUES ($1,$2,$3,'HASH_FICTICIO',$4,false)`, [user, randomUUID(), email, person]);
      const current = makeService();
      for (const key of [user, person, normalized, document]) {
        for (const period of [undefined, '2025-1', '2026-2']) {
          // La prioridad UUID de persona ya existía; verificarla con período explícito.
          if (key === person && !period) continue;
          const old = (await database.query(previousAliasSql, [key, period || null])).rows[0].id;
          assert.equal(await current.resolveDocenteId(key, period), old);
        }
      }
      assert.equal((await request(cardRoute(normalized))).data.docenteId, profiles[1]);
    });
    await check('Tarjeta identidad: autogestión sin rol docente recupera nombres/contactos reales y conserva OTP/enmascaramiento', async () => {
      const before = await native();
      const response = await request(infoRoute(session), { token: null });
      assert.equal(response.success, true); assert.equal(response.data.docente_id, profiles[0]);
      assert.equal(response.data.primer_nombre, 'PERSONA HISTÓRICA'); assert.equal(response.data.primer_apellido, 'APELLIDO');
      assert.equal(response.data.segundo_nombre, null); assert.equal(response.data.segundo_apellido, 'SEGUNDO');
      assert.equal(response.data.correo_personal, 'personal.ficticio@example.test'); assert.equal(response.data.telefono, '3001234567');
      assert.notEqual(response.data.documento_identidad, document); assert.equal(response.data.puntaje_salarial, null);
      assert(!JSON.stringify(response.data).includes(document));
      await request(infoRoute(link), { token: null, status: 403 });
      await database.query(`UPDATE rund."BancoDocentesInvitaciones" SET sesion_expira_en=now()-interval '1 minute' WHERE id=$1`, [invite]);
      await request(infoRoute(session), { token: null, status: 403 });
      await database.query(`UPDATE rund."BancoDocentesInvitaciones" SET sesion_expira_en=now()+interval '2 hours' WHERE id=$1`, [invite]);
      assert.deepEqual(await native(), before);
    });
    await check('Tarjeta identidad: Auth caído, ruta antigua o ficha parcial devuelven 503 sin tarjeta vacía ni mutaciones', async () => {
      const before = await native();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setFichaMode(mode);
        for (const route of [cardRoute(profiles[0]), personRoute(person, '2025-1'), infoRoute(session)]) {
          const result = await request(route, { status: 503 }); assert.equal(result.data, undefined);
        }
      } } finally { authFixture.setFichaMode('normal'); }
      assert.deepEqual(await native(), before);
      assert.equal((await request(cardRoute(profiles[0]))).data.docenteId, profiles[0]);
    });
    await check('Tarjeta identidad: fallo de alias no ejecuta SQL alternativo ni clasifica al docente como ausente', async () => {
      const before = await native();
      try { for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setAliasMode(mode); await request(cardRoute(normalized), { status: 503 });
      } } finally { authFixture.setAliasMode('normal'); }
      assert.deepEqual(await native(), before);
    });
    await check('Tarjeta identidad: documento exacto ambiguo falla cerrado, mientras alias conserva candidatas y orden RUND', async () => {
      await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero)
        VALUES ($1,$2,'CC','OTRA PERSONA FICTICIA','OTRA','FICTICIA','X')`, [other, normalized]);
      await database.query(`INSERT INTO rund."Docente" SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)
        || jsonb_build_object('id',$1::text,'personaId',$2::text,'updatedAt','2027-01-01'))).*
        FROM rund."Docente" d WHERE id=$3`, [profiles[3], other, profiles[1]]);
      const aliases = (await source(aliasRoute(normalized))).data;
      assert.deepEqual(aliases.personaIds.slice().sort(), [person, other].sort());
      assert.equal((await request(cardRoute(normalized))).data.docenteId, profiles[3]);
      assert.equal((await database.query(previousAliasSql, [normalized, null])).rows[0].id, profiles[3]);
      await database.query('UPDATE auth.personas SET num_identificacion=$2 WHERE id_person=$1', [other, document]);
      await source(exactRoute(document), 409); await request(personRoute(document, '2025-1'), { status: 503 });
      await database.query('DELETE FROM rund."RundCampoEstado" WHERE docente_id=$1', [profiles[3]]);
      await database.query('DELETE FROM rund."Docente" WHERE id=$1', [profiles[3]]);
      await database.query('DELETE FROM auth.personas WHERE id_person=$1', [other]);
    });
    await check('Tarjeta identidad: auditoría fallida bloquea ambas tarjetas y autogestión sin entregar datos', async () => {
      await database.query(`CREATE FUNCTION rund.reject_point_identity_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF (NEW.metadata->>'endpoint') IN ('TARJETA_RUND_POR_ID','TARJETA_RUND_POR_PERSONA','AUTOGESTION_MI_PERFIL')
          THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_point_identity_audit BEFORE INSERT ON rund."RundAprobacionLog"
          FOR EACH ROW EXECUTE FUNCTION rund.reject_point_identity_audit()`);
      try {
        const direct = await request(cardRoute(profiles[0])); assert.equal(direct.success, false); assert.equal(direct.data, null);
        await request(personRoute(person, '2025-1'), { status: 500 });
        await request(infoRoute(session), { token: null, status: 500 });
      } finally {
        await database.query('DROP TRIGGER reject_point_identity_audit ON rund."RundAprobacionLog"; DROP FUNCTION rund.reject_point_identity_audit()');
      }
    });
    await check('Tarjeta identidad: tarjeta y autogestión leen solo SQL RUND bajo un rol sin permisos sobre Auth', async () => {
      const role = 'rund_card_' + randomUUID().replace(/-/g, ''); assert.match(role, /^[a-z0-9_]+$/);
      await database.query(`CREATE ROLE "${role}" NOLOGIN`);
      try {
        await database.query(`GRANT USAGE ON SCHEMA rund TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA rund TO "${role}"`);
        await ds.query(`SET ROLE "${role}"`);
        await assert.rejects(ds.query('SELECT id_person FROM auth.personas LIMIT 1'), error => error.code === '42501');
        const current = makeService();
        assert.equal(await current.resolveDocenteId(normalized, '2026-2'), profiles[1]);
        assert.deepEqual(serial(await current.getTarjetaRUND(profiles[0])), serial(await reference.getTarjetaRUND(profiles[0])));
        const info = await current.getAutogestionInfo(session);
        assert.equal(info.docente_id, profiles[0]); assert.equal(info.primer_nombre, 'PERSONA HISTÓRICA');
      } finally {
        await ds.query('RESET ROLE');
        await database.query(`REVOKE SELECT ON ALL TABLES IN SCHEMA rund FROM "${role}"; REVOKE USAGE ON SCHEMA rund FROM "${role}"`);
        await database.query(`DROP ROLE "${role}"`);
      }
    });
    await check('Tarjeta identidad: JWT y enmascaramiento siguen aplicando en la tarjeta pública', async () => {
      await request(cardRoute(profiles[0]), { token: null, status: 401 });
      const token = jwt.sign({ sub: randomUUID(), roles: ['ADMIN'] }, { expiresIn: '2m' });
      const card = (await request(cardRoute(profiles[0]), { token })).data;
      assert(card); assert.equal(card.proteccion_datos.acceso_completo, false);
      assert(!JSON.stringify(card).includes(document));
    });
  } finally {
    authFixture.setFichaMode('normal'); authFixture.setAliasMode('normal'); await ds.destroy();
    await database.query('DELETE FROM rund."BancoDocentesInvitaciones" WHERE id=$1', [invite]);
    await database.query('DELETE FROM rund."RundCampoEstado" WHERE docente_id=ANY($1::text[])', [profiles]);
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [profiles]);
    await database.query('DELETE FROM auth."user" WHERE id_user=$1', [user]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [[person, other]]);
  }
};
