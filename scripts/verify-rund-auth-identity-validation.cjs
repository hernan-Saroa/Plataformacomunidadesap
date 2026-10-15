/* Contrato preparatorio con Auth compilado en conexión de solo lectura; datos ficticios. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');

module.exports = async function verifyIdentityValidation(pgConfig, runtime, check, ctx) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, authUrl, authToken, authFixture } = ctx;
  const { AuthIdentityValidationClient } = require(path.resolve(__dirname, '../backend/rund-service/dist/common/auth-identity-validation.client'));
  const client = new AuthIdentityValidationClient(), people = Array.from({ length: 3 }, () => randomUUID()), users = Array.from({ length: 3 }, () => randomUUID());
  const roles = [randomUUID(), randomUUID()], marker = randomUUID().slice(0, 8);
  const emails = people.map((_, i) => `prevalidacion-${marker}-${i}@example.test`), orphanEmail = `huerfano-${marker}@example.test`;
  const documents = [' 00.123.456 ', 'CORREO-' + marker, 'OTRO-' + marker];
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN'], saved = keys.map(key => process.env[key]);
  const input = (overrides = {}) => ({ version: 1, operacionId: randomUUID(), documento: '00123456', correo: emails[0], resolverPorCorreo: false, ...overrides });
  const snapshot = async () => {
    const result = {};
    for (const [schema, table] of [['auth', 'personas'], ['auth', 'user'], ['auth', 'user_roles'], ['auth', 'role'], ['rund', 'Docente'], ['rund', 'RundAprobacionLog']]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    const sequences = (await database.query("SELECT schemaname,sequencename,last_value FROM pg_sequences WHERE schemaname IN ('auth','rund') ORDER BY schemaname,sequencename")).rows;
    result.sequences = sequences; return result;
  };
  const source = async (consulta, status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(authUrl + '/internal/rund/v1/personas/escritura/validar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(consulta),
    }); assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  // Selecciones anteriores a la escritura del punto 60, sin ejecutar sus mutaciones.
  const reference = async consulta => {
    let person = (await database.query(`SELECT id_person FROM auth.personas WHERE
      UPPER(regexp_replace(BTRIM(num_identificacion::text),'\\.','','g'))=UPPER(regexp_replace(BTRIM($1::text),'\\.','','g')) LIMIT 1`, [consulta.documento])).rows[0];
    let coincidencia = person ? 'documento' : 'ninguna';
    if (!person && consulta.resolverPorCorreo) {
      person = (await database.query('SELECT id_person FROM auth.personas WHERE LOWER(dir_email)=LOWER($1) LIMIT 1', [consulta.correo])).rows[0];
      if (person) coincidencia = 'correo';
    }
    const conflicts = (await database.query(`SELECT owner_id FROM (
      SELECT p.id_person::text AS owner_id FROM auth.personas p WHERE LOWER(p.dir_email)=LOWER($1)
      UNION SELECT u.id_person::text FROM auth."user" u WHERE LOWER(u.username)=LOWER($1)
    ) owners WHERE owner_id IS NULL OR $2::uuid IS NULL OR owner_id::uuid<>$2::uuid LIMIT 1`, [consulta.correo, person?.id_person || null])).rows;
    const user = person ? (await database.query('SELECT id_user FROM auth."user" WHERE id_person=$1 LIMIT 1', [person.id_person])).rows[0] : null;
    const role = (await database.query(`SELECT id FROM auth.role WHERE UPPER(code)='DOCENTE' OR UPPER(name)='DOCENTE'
      ORDER BY CASE WHEN UPPER(code)='DOCENTE' THEN 0 ELSE 1 END LIMIT 1`)).rows[0];
    return { personaId: person?.id_person || null, usuarioId: user?.id_user || null, rolDocenteId: role?.id || null,
      coincidencia, conflictoCorreo: conflicts.length > 0 };
  };
  const baseline = await snapshot();
  try {
    process.env.AUTH_SERVICE_URL = authUrl; process.env.AUTH_INTERNAL_SERVICE_TOKEN = authToken;
    for (let i = 0; i < people.length; i++) await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,dir_email)
      VALUES ($1,$2,'CC','PREVALIDACIÓN FICTICIA','PREVALIDACIÓN','FICTICIA','X',$3)`, [people[i], documents[i], emails[i]]);
    for (const i of [0, 2]) await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
      VALUES ($1,$2,$3,'HASH PRIVADO FICTICIO',$4,false)`, [users[i], randomUUID(), i ? orphanEmail : emails[i].toUpperCase(), i ? null : people[0]]);
    const setup = await snapshot();
    await check('Prevalidación Auth: guard exige token interno incluso con JWT y publica solo resultado mínimo sin caché ni reserva', async () => {
      const q = input();
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(q, 401, headers);
      const { res, body } = await source(q); assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(body.data.consulta, q); assert.equal(body.data.reserva, false);
      assert.deepEqual(Object.keys(body.data.resultado).sort(), ['coincidencia', 'conflictoCorreo', 'personaId', 'rolDocenteId', 'usuarioId']);
      assert(!/password|HASH PRIVADO|nom_largo|id_tercero/.test(JSON.stringify(body)));
      assert(await authFixture.prevalidationConnectionReadOnly()); assert.deepEqual(await snapshot(), setup);
    });
    await check('Prevalidación Auth: contrato inválido se rechaza sin cambios en filas ni secuencias', async () => {
      for (const q of [null, [], {}, input({ version: 2 }), input({ documento: null }), input({ correo: ' MAYUSCULAS@example.test ' }),
        input({ resolverPorCorreo: 'true' }), input({ commit: true })]) await source(q, 400);
      assert.deepEqual(await snapshot(), setup);
    });
    await check('Prevalidación Auth: documento normalizado y prioridad sobre email coinciden con las selecciones previas de escritura', async () => {
      for (const q of [input(), input({ documento: documents[0] }), input({ correo: emails[1], resolverPorCorreo: true }),
        input({ documento: 'NO-EXISTE-' + marker, correo: emails[1], resolverPorCorreo: true })]) {
        assert.deepEqual((await client.validar(q)).resultado, await reference(q));
      }
      assert.equal((await client.validar(input({ correo: emails[1], resolverPorCorreo: true }))).resultado.personaId, people[0]);
    });
    await check('Prevalidación Auth: fallback por email depende de la opción interna y no presume verificación OTP ni crea cuenta', async () => {
      const q = input({ documento: 'NO-EXISTE-' + marker, correo: emails[1] });
      const a = await client.validar(q); assert.equal(a.resultado.personaId, null); assert.equal(a.resultado.conflictoCorreo, true);
      const b = await client.validar({ ...q, resolverPorCorreo: true }); assert.equal(b.resultado.personaId, people[1]); assert.equal(b.resultado.usuarioId, null);
      assert.equal(b.resultado.coincidencia, 'correo'); assert.equal(b.resultado.conflictoCorreo, false); assert.deepEqual(await snapshot(), setup);
    });
    await check('Prevalidación Auth: correo de otra persona, username huérfano y persona nueva conservan los conflictos anteriores', async () => {
      for (const q of [input({ correo: emails[2] }), input({ correo: orphanEmail }),
        input({ documento: 'NUEVO-' + marker, correo: `nuevo-${marker}@example.test` })]) {
        const result = (await client.validar(q)).resultado; assert.deepEqual(result, await reference(q));
        assert.equal(result.conflictoCorreo, q.correo !== `nuevo-${marker}@example.test`);
      }
    });
    await check('Prevalidación Auth: rol DOCENTE conserva code/name, prioridad por code e inactivos; ausencia confirmada devuelve null', async () => {
      const original = (await database.query("SELECT id,code,name FROM auth.role WHERE UPPER(code)='DOCENTE' OR UPPER(name)='DOCENTE'")).rows;
      try {
        for (const row of original) await database.query('UPDATE auth.role SET code=$2,name=$2 WHERE id=$1', [row.id, 'PREVAL-' + row.id]);
        assert.equal((await client.validar(input())).resultado.rolDocenteId, null);
        await database.query(`INSERT INTO auth.role (id,code,name,category,is_active) VALUES ($1,$2,'DOCENTE','personalizado',false)`, [roles[0], 'PREVAL-' + marker]);
        assert.equal((await client.validar(input())).resultado.rolDocenteId, roles[0]);
        await database.query(`INSERT INTO auth.role (id,code,name,category,is_active) VALUES ($1,'docente',$2,'personalizado',false)`, [roles[1], 'PREVAL-CODE-' + marker]);
        assert.equal((await client.validar(input())).resultado.rolDocenteId, roles[1]);
      } finally {
        await database.query('DELETE FROM auth.role WHERE id=ANY($1::uuid[])', [roles]);
        for (const row of original) await database.query('UPDATE auth.role SET code=$2,name=$3 WHERE id=$1', [row.id, row.code, row.name]);
      }
      assert.deepEqual(await snapshot(), setup);
    });
    await check('Prevalidación Auth: huella vincula solicitud y resultado; reintento consulta de nuevo y refleja cambios sin recibo persistido', async () => {
      const q = input({ documento: documents[1], correo: emails[1] }), a = await client.validar(q), b = await client.validar(q);
      assert.equal(a.huella, b.huella); assert.deepEqual(a.resultado, b.resultado);
      const expected = createHash('sha256').update(JSON.stringify([q.version, q.operacionId, q.documento, q.correo, q.resolverPorCorreo,
        a.resultado.personaId, a.resultado.usuarioId, a.resultado.rolDocenteId, a.resultado.coincidencia, a.resultado.conflictoCorreo])).digest('hex');
      assert.equal(a.huella, expected);
      try {
        await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
          VALUES ($1,$2,$3,'HASH PRIVADO FICTICIO',$4,false)`, [users[1], randomUUID(), emails[1], people[1]]);
        const c = await client.validar(q); assert.equal(c.resultado.usuarioId, users[1]); assert.notEqual(c.huella, a.huella); assert.equal(c.reserva, false);
      } finally { await database.query('DELETE FROM auth."user" WHERE id_user=$1', [users[1]]); }
      assert.deepEqual(await snapshot(), setup);
    });
    await check('Prevalidación Auth: solicitudes simultáneas no crean personas, cuentas, roles ni reservas; no reenvían JWT/cookies', async () => {
      const q = input({ documento: 'NO-EXISTE-' + marker, correo: `nuevo-${marker}@example.test` });
      const count = authFixture.prevalidationRequestCount(), headers = authFixture.prevalidationRequestHeaders().length;
      const results = await Promise.all(Array.from({ length: 5 }, () => client.validar(q)));
      assert(results.every(row => row.resultado.personaId === null && row.huella === results[0].huella && row.reserva === false));
      assert.equal(authFixture.prevalidationRequestCount(), count + 5);
      assert(authFixture.prevalidationRequestHeaders().slice(headers).every(row => row.tokenMatches && !row.authorizationForwarded && !row.cookieForwarded));
      assert.deepEqual(await snapshot(), setup);
    });
    await check('Prevalidación Auth: caída, 404 o respuesta parcial no confirman ausencia y conservan filas/secuencias', async () => {
      try {
        for (const mode of ['unavailable', 'missing', 'partial']) {
          authFixture.setPrevalidationMode(mode); await assert.rejects(client.validar(input()), error => error.getStatus() === 503);
        }
      } finally { authFixture.setPrevalidationMode('normal'); }
      assert.deepEqual(await snapshot(), setup);
    });
  } finally {
    authFixture.setPrevalidationMode('normal');
    await database.query('DELETE FROM auth."user" WHERE id_user=ANY($1::uuid[])', [users]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [people]);
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    const after = await snapshot(); delete baseline.sequences; delete after.sequences;
    assert.deepEqual(after, baseline); // La preparación de fixtures puede consumir IDs; la API no consume ninguno.
  }
};
