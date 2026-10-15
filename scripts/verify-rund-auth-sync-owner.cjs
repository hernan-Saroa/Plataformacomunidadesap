/* Sincronización compilada: Auth HTTP real y dos conexiones limitadas al schema RUND. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const previous = require('./fixtures/rund-auth-sync-before-api.cjs');

module.exports = async function verifySyncOwner(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, authUrl, authFixture, authToken, setListingMode } = context;
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const { DataSource } = require(path.join(serviceRoot, 'node_modules/typeorm'));
  const { syncRundProfilesFromAuth } = require(path.join(serviceRoot, 'dist/modules/banco-docentes/rund-auth-sync'));
  const keys = ['AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'RUND_AUTH_SYNC_TIMEOUT_MS', 'RUND_AUTH_SYNC_MAX_PAGES'];
  const saved = keys.map(key => process.env[key]);
  const role = 'sync_owner_' + randomUUID().replace(/-/g, ''), sources = [], pids = [], uids = [];
  const ids = Array.from({ length: 6 }, () => ({ pid: randomUUID(), uid: randomUUID(), pub: randomUUID() }));
  const tag = randomUUID().slice(0, 8), duplicateRole = randomUUID(), territorial = '9007199254740993';
  let roleCreated = false, territoryCreated = false;
  const [{ id: rolId }] = (await database.query(previous.roleSql)).rows;
  const actor = { actorId: 'OPERADOR-FICTICIO-' + tag, ip: '127.0.0.1' };
  const sync = (source = sources[0]) => syncRundProfilesFromAuth(source, authUrl, actor);
  const snapshot = async schema => {
    const result = {};
    for (const table of schema === 'rund' ? ['Docente', 'RundCampoEstado', 'validacion_documental', 'RundAprobacionLog']
      : ['personas', 'user', 'user_roles', 'role']) {
      result[table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const sequence = async () => (await database.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows;
  const source = async (route, consulta, status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(authUrl + '/internal/rund/v1/personas/sincronizacion/' + route, {
      method: consulta === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers },
      ...(consulta === undefined ? {} : { body: JSON.stringify(consulta) }),
    });
    assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  const query = (i = 0) => ({ personaId: ids[i].pid, usuarioId: ids[i].uid, rolId });
  const activate = (i, value = true) => database.query('UPDATE auth."user" SET is_active=$2 WHERE id_user=$1', [ids[i].uid, value]);
  try {
    process.env.AUTH_INTERNAL_SERVICE_TOKEN = authToken; delete process.env.INTERNAL_SERVICE_TOKEN;
    delete process.env.RUND_AUTH_SYNC_TIMEOUT_MS; delete process.env.RUND_AUTH_SYNC_MAX_PAGES;
    await database.query('INSERT INTO auth.seccionales (id_seccional,nom_seccional) VALUES ($1,$2)', [territorial, 'SYNC TERRITORIAL FICTICIA']);
    territoryCreated = true;
    for (let i = 0; i < ids.length; i++) {
      const { pid, uid, pub } = ids[i]; pids.push(pid); uids.push(uid);
      await database.query(`INSERT INTO auth.personas
        (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,dir_email,id_seccional)
        VALUES ($1,$2,'CC','SYNC OWNER FICTICIO','SYNC','OWNER','X',$3,$4)`,
      [pid, ' OWNER.' + tag + i + ' ', ' SYNC-OWNER-' + tag + i + '@Example.test ', territorial]);
      await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
        VALUES ($1,$2,$3,'FICTICIO',$4,$5)`, [uid, pub, 'sync-owner-' + tag + i, pid, i === 0]);
      await database.query('INSERT INTO auth.user_roles (id_user,id_rol,is_active) VALUES ($1,$2,true)', [uid, rolId]);
    }
    await check('Sync propietario: Auth exige token en ambas rutas, valida IDs y devuelve solo la proyección sin caché', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) {
        await source('rol-docente', undefined, 401, headers); await source('revalidar', query(), 401, headers);
      }
      for (const raw of [null, [], {}, { ...query(), usuarioId: 'publico' }]) await source('revalidar', raw, 400);
      const before = await snapshot('auth'), { res, body } = await source('rol-docente');
      assert.equal(res.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(body.data, { rolId });
      const identity = await source('revalidar', query());
      assert.equal(identity.res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(identity.body.data, { consulta: query(), encontrada: true,
        identidad: (await database.query(previous.identitySql, [ids[0].pid, ids[0].uid, rolId])).rows[0] });
      assert.deepEqual(await snapshot('auth'), before);
    });
    await check('Sync propietario: rol coincide con SQL anterior en mayúsculas, espacios, inactivo, ausente y ambiguo', async () => {
      try {
        await database.query("UPDATE auth.role SET code='docente' WHERE id=$1", [rolId]);
        assert.deepEqual((await source('rol-docente')).body.data, { rolId });
        for (const [code, active] of [[' DOCENTE ', true], ['DOCENTE', false], ['DOCENTE', null]]) {
          await database.query('UPDATE auth.role SET code=$2,is_active=$3 WHERE id=$1', [rolId, code, active]);
          assert.equal((await database.query(previous.roleSql)).rows.length, 0); await source('rol-docente', undefined, 503);
        }
        await database.query("UPDATE auth.role SET code='DOCENTE',is_active=true WHERE id=$1", [rolId]);
        await database.query("INSERT INTO auth.role (id,code,name,category,is_active) VALUES ($1,'docente','FICTICIO','institucional',true)", [duplicateRole]);
        assert.equal((await database.query(previous.roleSql)).rows.length, 2); await source('rol-docente', undefined, 503);
      } finally {
        await database.query('DELETE FROM auth.role WHERE id=$1', [duplicateRole]);
        await database.query("UPDATE auth.role SET code='DOCENTE',is_active=true WHERE id=$1", [rolId]);
      }
    });
    await check('Sync propietario: revalidación coincide con SQL anterior en rol/cuenta revocados, null, public_id y persona ajena', async () => {
      try {
        for (const active of [true, false, null]) for (const assigned of [true, false, null]) {
          await activate(0, active); await database.query('UPDATE auth.user_roles SET is_active=$2 WHERE id_user=$1', [ids[0].uid, assigned]);
          const expected = (await database.query(previous.identitySql, [ids[0].pid, ids[0].uid, rolId])).rows[0];
          assert.deepEqual((await source('revalidar', query())).body.data.identidad, expected);
        }
        for (const usuarioId of [ids[0].pub, ids[1].uid, randomUUID()]) {
          const consulta = { ...query(), usuarioId };
          assert.deepEqual((await source('revalidar', consulta)).body.data, { consulta, encontrada: false, identidad: null });
        }
        await activate(0); await database.query('UPDATE auth.user_roles SET is_active=true WHERE id_user=$1', [ids[0].uid]);
        for (const active of [false, null]) {
          await database.query('UPDATE auth.role SET is_active=$2 WHERE id=$1', [rolId, active]);
          assert.deepEqual((await source('revalidar', query())).body.data.identidad,
            (await database.query(previous.identitySql, [ids[0].pid, ids[0].uid, rolId])).rows[0]);
        }
      } finally {
        await activate(0); await database.query('UPDATE auth.user_roles SET is_active=true WHERE id_user=$1', [ids[0].uid]);
        await database.query('UPDATE auth.role SET is_active=true WHERE id=$1', [rolId]);
      }
    });
    await database.query(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA rund TO ${role};
      GRANT SELECT,INSERT ON rund."Docente",rund."RundCampoEstado",rund.validacion_documental,rund."RundAprobacionLog" TO ${role};
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA rund TO ${role}`); roleCreated = true;
    for (let i = 0; i < 2; i++) {
      const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
        password: pgConfig.password, database: pgConfig.database, synchronize: false, extra: { max: 1 } });
      sources.push(ds); await ds.initialize(); await ds.query('SET ROLE ' + role);
      ds.testPid = (await ds.query('SELECT pg_backend_pid() AS id'))[0].id;
      for (const table of ['auth.role', 'auth.personas', 'auth."user"', 'auth.user_roles', 'academic_work_plan."Persona"']) {
        await assert.rejects(ds.query('SELECT * FROM ' + table), /permission denied/);
      }
    }
    await check('Sync propietario: alta mínima completa con permisos solo RUND y conserva Auth/perfiles previos', async () => {
      const beforeAuth = await snapshot('auth'), existing = (await database.query('SELECT * FROM rund."Docente" ORDER BY id')).rows;
      const result = await sync(); assert.equal(result.created, 1); assert.equal(result.failed, 0);
      const [row] = (await database.query('SELECT * FROM rund."Docente" WHERE "personaId"=$1', [ids[0].pid])).rows;
      assert.equal(row.territorialId, territorial); assert.equal(row.territorialReportada, 'SYNC TERRITORIAL FICTICIA');
      assert.equal(row.correoInstitucional, 'sync-owner-' + tag + '0@example.test');
      assert.equal(row.estado, 'INACTIVO'); assert.equal(row.estadoAprobacion, 'PENDIENTE_APROBACION');
      assert.equal(row.horasAsignables, 0); assert.equal(row.tipoVinculacion, '');
      assert.equal((await database.query('SELECT count(*)::int AS n FROM rund."RundCampoEstado" WHERE docente_id=$1', [row.id])).rows[0].n, 6);
      assert.equal((await database.query('SELECT count(*)::int AS n FROM rund.validacion_documental WHERE docente_id=$1', [row.id])).rows[0].n, 36);
      const [audit] = (await database.query(`SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND soporte_id='AUTH_SYNC'`, [row.id])).rows;
      assert.equal(audit.actor_id, actor.actorId); assert.equal(audit.ip, actor.ip); assert.equal(audit.metadata.usuarioId, ids[0].uid);
      assert.deepEqual(await snapshot('auth'), beforeAuth);
      assert.deepEqual((await database.query('SELECT * FROM rund."Docente" WHERE id=ANY($1::text[]) ORDER BY id', [existing.map(row => row.id)])).rows, existing);
    });
    await check('Sync propietario: caída, 404 o contrato parcial de ambas rutas nunca confirma ausencia o éxito vacío', async () => {
      const before = await snapshot('rund'), beforeAuth = await snapshot('auth');
      for (const setter of [authFixture.setSyncRoleMode, authFixture.setSyncAccountMode]) {
        for (const mode of ['unavailable', 'missing', 'partial']) {
          setter(mode); await assert.rejects(sync(), error => error.getStatus() === 503);
          assert.deepEqual(await snapshot('rund'), before); assert.deepEqual(await snapshot('auth'), beforeAuth);
        }
        setter('normal');
      }
    });
    await check('Sync propietario: cuenta revocada mientras espera el advisory lock se revalida después y no se crea', async () => {
      await activate(1); const before = await snapshot('rund');
      const { Client } = require(path.join(serviceRoot, 'node_modules/pg')), blocker = new Client(pgConfig);
      await blocker.connect(); let pending;
      try {
        await blocker.query('BEGIN'); await blocker.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['rund-auth-sync:' + ids[1].pid]);
        pending = sync(); const deadline = Date.now() + 15000;
        while (!(await database.query("SELECT 1 FROM pg_locks WHERE pid=$1 AND locktype='advisory' AND NOT granted", [sources[0].testPid])).rowCount) {
          if (Date.now() > deadline) throw new Error('No esperó el lock nativo');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        await activate(1, false); await blocker.query('COMMIT');
        assert.equal((await pending).created, 0); assert.deepEqual(await snapshot('rund'), before);
      } finally { await blocker.query('ROLLBACK'); await blocker.end(); if (pending) await pending.catch(() => {}); await activate(1, false); }
    });
    await check('Sync propietario: fallo de Auth después de la primera alta revierte perfiles, bloques, validaciones y auditoría', async () => {
      await activate(2); await activate(3);
      const sorted = [ids[2], ids[3]].sort((a, b) => a.pid.localeCompare(b.pid)), before = await snapshot('rund'), authBefore = await snapshot('auth');
      const seqBefore = BigInt((await sequence())[0].last_value);
      authFixture.setSyncHook(async raw => { if (raw.personaId === sorted[1].pid) throw new Error('FALLA AUTH FICTICIA TRAS ALTA'); });
      try { await assert.rejects(sync(), error => error.getStatus() === 503); }
      finally { authFixture.setSyncHook(undefined); }
      assert.deepEqual(await snapshot('rund'), before); assert.deepEqual(await snapshot('auth'), authBefore);
      assert(BigInt((await sequence())[0].last_value) > seqBefore, 'El escenario debe haber intentado el primer INSERT antes del fallo');
      assert.equal((await sync()).created, 2);
    });
    await check('Sync propietario: dos conexiones independientes crean una sola alta tras revalidar en Auth', async () => {
      await activate(4); const authBefore = await snapshot('auth');
      const results = await Promise.all(sources.map(ds => sync(ds)));
      assert.equal(results.reduce((sum, row) => sum + row.created, 0), 1);
      assert.equal(results.reduce((sum, row) => sum + row.failed, 0), 0);
      assert.equal((await database.query('SELECT count(*)::int AS n FROM rund."Docente" WHERE "personaId"=$1', [ids[4].pid])).rows[0].n, 1);
      assert.deepEqual(await snapshot('auth'), authBefore);
    });
    await check('Sync propietario: repetir conserva todos los perfiles, bloques, validaciones, auditoría y secuencia', async () => {
      const before = await snapshot('rund'), authBefore = await snapshot('auth'), seq = await sequence();
      assert.equal((await sync()).created, 0);
      assert.deepEqual(await snapshot('rund'), before); assert.deepEqual(await snapshot('auth'), authBefore); assert.deepEqual(await sequence(), seq);
    });
    await check('Sync propietario: public_id de /users no sustituye id interno ni crea perfiles sin identidad confirmada', async () => {
      await activate(5); const before = await snapshot('rund'); setListingMode('public-ids');
      try { const result = await sync(); assert.equal(result.created, 0); assert(result.failed > 0); assert.deepEqual(await snapshot('rund'), before); }
      finally { setListingMode('normal'); }
    });
  } finally {
    authFixture.setSyncHook(undefined); authFixture.setSyncRoleMode('normal'); authFixture.setSyncAccountMode('normal'); setListingMode('normal');
    for (const ds of sources) if (ds.isInitialized) await ds.destroy();
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    if (roleCreated) await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
    // La auditoría es inmutable: queda en el cluster ficticio hasta su eliminación final.
    for (const table of ['RundCampoEstado', 'validacion_documental']) await database.query(`DELETE FROM rund."${table}"
      WHERE docente_id IN (SELECT id FROM rund."Docente" WHERE "personaId"=ANY($1::uuid[]))`, [pids]);
    await database.query('DELETE FROM rund."Docente" WHERE "personaId"=ANY($1::uuid[])', [pids]);
    await database.query('DELETE FROM auth.user_roles WHERE id_user=ANY($1::uuid[])', [uids]);
    await database.query('DELETE FROM auth."user" WHERE id_user=ANY($1::uuid[])', [uids]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [pids]);
    if (territoryCreated) await database.query('DELETE FROM auth.seccionales WHERE id_seccional=$1', [territorial]);
  }
};
