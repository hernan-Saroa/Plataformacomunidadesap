/* PTA propietario real compilado + Macro Docente con repositorios y permisos limitados. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyHistoricalIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, ptaFixture, ptaToken, publicBase, jwt } = context;
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const compiled = file => require(path.join(serviceRoot, 'dist', file));
  const { DataSource, In } = require(path.join(serviceRoot, 'node_modules/typeorm'));
  const { MacroDocenteService } = compiled('modules/macro-docente/macro-docente.service');
  const { RundCatalogosClient } = compiled('common/rund-catalogos.client');
  const { PtaPlanesClient } = compiled('common/pta-planes.client');
  const types = ['plan-trabajo-academico', 'banco-docente', 'programa', 'facultad', 'persona', 'usuario', 'rund-acceso-externo', 'rund-macro-docente-consulta-log']
    .map(name => Object.values(compiled('entities/' + name + '.entity'))[0]);
  const [Plan, Docente, Programa, Facultad, Persona, Usuario, Acceso, Log] = types;
  const role = 'macro_hist_' + randomUUID().replace(/-/g, ''), readRoleId = randomUUID(), readRoleCode = 'MACRO_HIST_' + randomUUID().slice(0, 8);
  const pids = Array.from({ length: 3 }, () => randomUUID()), uids = [randomUUID(), randomUUID()];
  const profiles = pids.map(() => 'HIST-' + randomUUID()), plans = Array.from({ length: 4 }, () => randomUUID());
  const keys = ['ACADEMIC_WORK_PLAN_SERVICE_URL', 'PTA_INTERNAL_SERVICE_TOKEN'], saved = keys.map(key => process.env[key]);
  let admin, limited, roleCreated = false, programaId, facultadId, external;
  const fields = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'identificacion'];
  const snapshot = async () => {
    const result = {};
    for (const [schema, table] of [['auth', 'personas'], ['auth', 'user'], ['academic_work_plan', 'Persona'],
      ['academic_work_plan', 'Usuario'], ['academic_work_plan', 'PlanTrabajoAcademico'], ['academic_work_plan', 'programa'],
      ['rund', 'Docente'], ['rund', 'validacion_documental'], ['rund', 'RundAprobacionLog']]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const source = async (personaIds, status = 200, headers = { 'x-internal-service-token': ptaToken }) => {
    const res = await fetch(ptaFixture.url + '/internal/rund/v1/personas/identidades-historicas', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ personaIds }),
    });
    assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  const build = (ds, catalogos, planes = new PtaPlanesClient()) => new MacroDocenteService(planes, ds.getRepository(Docente), catalogos,
    ds.getRepository(Acceso), ds.getRepository(Log), { notifyAccesoExternoOtorgado: async () => false });
  try {
    process.env.ACADEMIC_WORK_PLAN_SERVICE_URL = ptaFixture.url; process.env.PTA_INTERNAL_SERVICE_TOKEN = ptaToken;
    for (let i = 0; i < 2; i++) {
      await database.query(`INSERT INTO academic_work_plan."Usuario" (id,email,password,activo)
        VALUES ($1,$2,'FICTICIO',false)`, [uids[i], 'hist-' + uids[i] + '@example.test']);
      await database.query(`INSERT INTO academic_work_plan."Persona"
        (id,"usuarioId",primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,identificacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [pids[i], uids[i], i ? null : '  José ', i ? '' : ' Histórico ',
        i ? ' Muñoz ' : ' Pérez ', i ? null : '', i ? null : ' 00.123 ']);
    }
    for (const i of [0, 2]) await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero)
      VALUES ($1,$2,'CC','AUTH ACTUAL DISTINTO','AUTH','ACTUAL','X')`, [pids[i], 'AUTH-HIST-' + i + '-' + randomUUID().slice(0, 8)]);
    [facultadId] = (await database.query(`INSERT INTO academic_work_plan.facultad (codigo,nombre)
      VALUES ($1,$2) RETURNING id`, ['HF-' + randomUUID().slice(0, 8), 'FACULTAD HISTÓRICA FICTICIA ' + randomUUID().slice(0, 8)])).rows.map(row => row.id);
    [programaId] = (await database.query(`INSERT INTO academic_work_plan.programa
      (codigo,nombre,nombre_excel,nombre_corto,id_facultad,tipo,modalidad)
      VALUES ($1,'PROGRAMA RESPALDO HISTÓRICO','HISTÓRICO','HISTÓRICO',$2,'pregrado','presencial') RETURNING id`,
    ['HP-' + randomUUID().slice(0, 8), facultadId])).rows.map(row => row.id);
    for (let i = 0; i < profiles.length; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object('id',$1::text,'personaId',$2::text,
        'periodoCarga','2098-1','nucleoTematico',' Investigación '))).* FROM rund."Docente" d WHERE id=$3`, [profiles[i], pids[i], docenteId]);
    const data = [
      { asignaturas: [{ codigo: 'H1', nombre: 'HISTORIA UNO', horas: '12', programa_id: String(programaId), programa_nombre: 'Programa embebido',
        territorial_nombre: ' Histórica ', cetap_nombre: ' Sede Antígua ' }, { codigo: 'H2', nombre: 'HISTORIA DOS', horasClase: 6,
        programa_id: String(programaId), territorial: { nombre: 'Otra' }, sede_nombre: 'Sede dos' }] },
      { asignaturas: [{ asignatura_codigo: 'H3', asignatura_nombre: 'HISTORIA TRES', horas_clase: 5, programa: { id: String(programaId) } }] },
      { asignaturas: [{ codigoAsignatura: 'H4', nombreAsignatura: 'SIN IDENTIDAD HISTÓRICA', horas: 0 }] },
      { asignaturas: [{ codigo: 'NO-FIRME', nombre: 'NO DEBE APARECER', horas: 99 }] },
    ];
    for (let i = 0; i < plans.length; i++) await database.query(`INSERT INTO academic_work_plan."PlanTrabajoAcademico"
      (id,"docenteId",periodo,estado,"datosEstructurados","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())`,
    [plans[i], profiles[i % 3], i === 1 ? '2098-1' : '2098-2', i === 3 ? 'BORRADOR' : i === 1 ? 'APROBADO' : 'EN_FIRME', JSON.stringify(data[i])]);
    const settings = { type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
      password: pgConfig.password, database: pgConfig.database, entities: types, synchronize: false, extra: { max: 1 } };
    admin = new DataSource(settings); limited = new DataSource(settings); await admin.initialize(); await limited.initialize();
    await database.query(`CREATE ROLE ${role}; GRANT USAGE ON SCHEMA rund,academic_work_plan TO ${role};
      GRANT SELECT ON rund."Docente" TO ${role}`);
    roleCreated = true; await limited.query('SET ROLE ' + role);
    const client = new RundCatalogosClient(), service = build(limited, client);
    // Referencia de la operación reemplazada: mismo Repository<Persona>.find(In(ids)) y campos originales.
    const previous = build(admin, { identidadesHistoricas: async ids => (await admin.getRepository(Persona).find({ where: { id: In(ids) } }))
      .map(person => ({ personaId: person.id, ...Object.fromEntries(fields.map(field => [field, person[field]])) })),
      programasHistoricos: ids => admin.getRepository(Programa).find({ where: { id: In(ids) } }) }, {
      planesFirmes: async filters => {
        const qb = admin.getRepository(Plan).createQueryBuilder('pta').where('pta.estado IN (:...estados)', {
          estados: ['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO'],
        });
        if (filters.periodo) qb.andWhere('pta.periodo = :periodo', { periodo: filters.periodo });
        if (filters.docenteId) qb.andWhere('pta.docenteId = :docenteId', { docenteId: filters.docenteId });
        return qb.orderBy('pta.periodo', 'DESC').getMany();
      },
    });
    const query = '/macro-docente?periodo=2098-2';
    await check('Identidad Macro: PTA exige token, confirma consulta sin caché y conserva proyección histórica mínima', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(pids, 401, headers);
      for (const ids of [['incompatible'], [null], [pids[0], pids[0]], Array(501).fill(pids[0])]) await source(ids, 400);
      const before = await snapshot(), { res, body } = await source(pids);
      assert.equal(res.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(body.consulta, { personaIds: pids });
      assert.equal(body.total, 2);
      const expected = (await admin.getRepository(Persona).find({ where: { id: In(pids) } }))
        .map(person => ({ personaId: person.id, ...Object.fromEntries(fields.map(field => [field, person[field]])) }));
      assert.deepEqual(body.items.sort((a,b) => a.personaId.localeCompare(b.personaId)), expected.sort((a,b) => a.personaId.localeCompare(b.personaId)));
      assert.deepEqual(await snapshot(), before);
    });
    await check('Identidad Macro: historial y consulta puntual funcionan sin SELECT de Persona PTA ni Auth y coinciden con el repositorio anterior', async () => {
      await assert.rejects(limited.getRepository(Persona).find(), /permission denied/);
      await assert.rejects(limited.getRepository(Programa).find(), /permission denied/);
      await assert.rejects(limited.query('SELECT * FROM auth.personas'), /permission denied/);
      for (const filter of [{ periodo: '2098-2' }, { docenteId: profiles[0] }, { docenteId: profiles[1] }]) {
        assert.deepEqual(await service.getHistorial(filter), await previous.getHistorial(filter));
      }
      const result = await service.getConsultaPuntual(profiles[0], '2098-2'); assert.equal(result.length, 2);
      assert.deepEqual(result, await previous.getConsultaPuntual(profiles[0], '2098-2'));
      assert.equal(result[0].documento_identidad, '00.123'); assert(result[0].docente_nombre.includes('José'));
      assert(!result.some(row => row.asignatura_codigo === 'NO-FIRME'));
    });
    await check('Identidad Macro: filtros, programa legacy, prioridades y paginación conservan exactamente las filas anteriores', async () => {
      for (const filter of [{ periodo: '2098-2', territorial: 'historica' }, { periodo: '2098-2', cetap: 'sede antigua' },
        { periodo: '2098-2', programa: 'PROGRAMA RESPALDO HISTORICO' }, { periodo: '2098-2', nucleoTematico: 'investigacion' },
        { periodo: '2098-2', page: 2, limit: 1 }, { docenteId: profiles[1], limit: 200 }]) {
        assert.deepEqual(await service.getHistorial(filter), await previous.getHistorial(filter));
      }
      const result = await service.getHistorial({ docenteId: profiles[0] });
      assert.equal(result.items.find(row => row.asignatura_codigo === 'H1').programa, 'Programa embebido');
      assert.equal(result.items.find(row => row.asignatura_codigo === 'H2').programa, 'PROGRAMA RESPALDO HISTÓRICO');
    });
    await check('Identidad Macro: ausencia histórica conserva null y no sustituye nombres/documentos por los actuales de Auth', async () => {
      const row = (await service.getHistorial({ docenteId: profiles[2] })).items[0];
      assert.equal(row.docente_nombre, null); assert.equal(row.documento_identidad, null);
      const empty = (await source([pids[2], randomUUID()])).body; assert.deepEqual(empty.items, []); assert.equal(empty.total, 0);
      assert.notEqual((await database.query('SELECT nom_largo FROM auth.personas WHERE id_person=$1', [pids[0]])).rows[0].nom_largo,
        (await service.getHistorial({ docenteId: profiles[0] })).items[0].docente_nombre);
    });
    await check('Identidad Macro: caída, 404 o respuesta parcial no entregan historial vacío ni leen Persona por SQL alternativo', async () => {
      const before = await snapshot();
      for (const mode of ['unavailable', 'missing', 'partial']) {
        ptaFixture.setHistoricalMode(mode);
        await assert.rejects(service.getHistorial({ periodo: '2098-2' }), error => error.getStatus() === 503);
        await request(query, { status: 503 });
        await request(`/macro-docente/consulta?docenteId=${profiles[0]}&periodo=2098-2`, { status: 503 });
      }
      ptaFixture.setHistoricalMode('normal'); assert.deepEqual(await service.getHistorial({ periodo: '2098-2' }), await previous.getHistorial({ periodo: '2098-2' }));
      assert.deepEqual(await snapshot(), before);
    });
    await check('Identidad Macro: cambios históricos del propietario se reflejan sin caché entre solicitudes', async () => {
      const original = (await database.query('SELECT * FROM academic_work_plan."Persona" WHERE id=$1', [pids[0]])).rows[0];
      try {
        await database.query(`UPDATE academic_work_plan."Persona" SET primer_nombre=' CAMBIO HISTÓRICO ',segundo_nombre=NULL,
          primer_apellido='',segundo_apellido=NULL,identificacion=' 00.777 ' WHERE id=$1`, [pids[0]]);
        const result = await request(`/macro-docente?docenteId=${profiles[0]}&periodo=2098-2`);
        assert.equal(result.items[0].docente_nombre, 'CAMBIO HISTÓRICO'); assert.equal(result.items[0].documento_identidad, '00.777');
        assert.deepEqual(await service.getHistorial({ docenteId: profiles[0] }), await previous.getHistorial({ docenteId: profiles[0] }));
      } finally {
        await database.query(`UPDATE academic_work_plan."Persona" SET primer_nombre=$2,segundo_nombre=$3,
          primer_apellido=$4,segundo_apellido=$5,identificacion=$6 WHERE id=$1`, [pids[0], ...fields.map(field => original[field])]);
      }
    });
    await check('Identidad Macro: más de 500 IDs no se truncan y un fallo del segundo lote aborta sin resultado parcial', async () => {
      const ids = [pids[0], ...Array.from({ length: 500 }, () => randomUUID())], before = ptaFixture.historicalRequestCount(),
        headers = ptaFixture.historicalRequestHeaders().length;
      assert.equal((await client.identidadesHistoricas(ids)).length, 1); assert.equal(ptaFixture.historicalRequestCount(), before + 2);
      assert(ptaFixture.historicalRequestHeaders().slice(headers).every(item => item.tokenMatches && !item.authorizationForwarded && !item.cookieForwarded));
      ptaFixture.setHistoricalMode('fail-second');
      try { await assert.rejects(client.identidadesHistoricas(ids), error => error.getStatus() === 503); }
      finally { ptaFixture.setHistoricalMode('normal'); }
    });
    await check('Identidad Macro: main conserva permisos, enmascaramiento y alcance del enlace externo al mismo docente', async () => {
      await database.query(`INSERT INTO auth.role (id,code,name,category,is_active) VALUES ($1,$2,$2,'personalizado',true)`, [readRoleId, readRoleCode]);
      await database.query(`INSERT INTO auth.role_permissions (id_rol,id_permission,is_active)
        SELECT $1,id_permission,true FROM auth.permission WHERE code='pta.macro_docente.consultar'`, [readRoleId]);
      const token = jwt.sign({ sub: randomUUID(), roles: [readRoleCode] }, { expiresIn: '10m' });
      const privateResult = await request(`/macro-docente?docenteId=${profiles[0]}&periodo=2098-2`, { token });
      assert(privateResult.items[0].documento_identidad.includes('*')); assert.notEqual(privateResult.items[0].documento_identidad, '00.123');
      await request(query, { token: null, status: 401 });
      const result = await request('/macro-docente/accesos-externos', { method: 'POST', status: 201, body: {
        enteNombre: 'HISTÓRICO FICTICIO', docenteId: profiles[0], fechaInicio: new Date(Date.now()-60000).toISOString(), fechaFin: new Date(Date.now()+3600000).toISOString() } });
      external = result.data;
      const route = '/services/rund/api/v1/pta/macro-docente/externo/' + external.token;
      const publicResult = await request(`${route}?periodo=2098-2&docenteId=${profiles[1]}`, { origin: publicBase, token: null });
      assert.equal(publicResult.total, 2); assert(publicResult.items.every(row => row.docente_id === profiles[0] && row.documento_identidad.includes('*')));
    });
    await check('Identidad Macro: fallos del propietario o de auditoría no entregan datos por enlace externo y la revocación se conserva', async () => {
      const route = '/services/rund/api/v1/pta/macro-docente/externo/' + external.token, before = await snapshot();
      ptaFixture.setHistoricalMode('unavailable');
      try { await request(route + '?periodo=2098-2', { origin: publicBase, token: null, status: 503 }); }
      finally { ptaFixture.setHistoricalMode('normal'); }
      await database.query(`CREATE FUNCTION rund.reject_macro_hist_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.periodo='2098-2' THEN RAISE EXCEPTION 'AUDITORIA HISTORICA FICTICIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_macro_hist_audit BEFORE INSERT ON rund."RundMacroDocenteConsultaLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_macro_hist_audit()`);
      try {
        await request(query, { status: 403 }); await request(route + '?periodo=2098-2', { origin: publicBase, token: null, status: 403 });
      } finally { await database.query('DROP TRIGGER reject_macro_hist_audit ON rund."RundMacroDocenteConsultaLog"; DROP FUNCTION rund.reject_macro_hist_audit()'); }
      await request(`/macro-docente/accesos-externos/${external.id}`, { method: 'DELETE' });
      await request(route, { origin: publicBase, token: null, status: 403 }); assert.deepEqual(await snapshot(), before);
    });
    await check('Identidad Macro: sin planes firmes confirmados no consulta el lote de identidad histórica', async () => {
      const before = ptaFixture.historicalRequestCount(); ptaFixture.setHistoricalMode('unavailable');
      try { assert.deepEqual(await service.getHistorial({ periodo: 'NO-EXISTE-HISTÓRICO' }), { items: [], total: 0, page: 1, limit: 50, pages: 1 }); }
      finally { ptaFixture.setHistoricalMode('normal'); }
      assert.equal(ptaFixture.historicalRequestCount(), before);
    });
    await require('./verify-rund-macro-programs.cjs')(check, { ...context, service, previous, client, limited, Programa,
      profiles, programaId, facultadId, readRoleCode, snapshot });
    await require('./verify-rund-macro-plans.cjs')(check, { ...context, service, previous, limited, admin, Plan,
      planesClient: new PtaPlanesClient(), profiles, readRoleCode, snapshot });
  } finally {
    ptaFixture.setHistoricalMode('normal');
    for (const ds of [limited, admin]) if (ds?.isInitialized) await ds.destroy();
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    if (roleCreated) await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
    await database.query('DELETE FROM auth.role_permissions WHERE id_rol=$1', [readRoleId]);
    await database.query('DELETE FROM auth.role WHERE id=$1', [readRoleId]);
    await database.query('DELETE FROM academic_work_plan."PlanTrabajoAcademico" WHERE id=ANY($1::uuid[])', [plans]);
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [profiles]);
    await database.query('DELETE FROM academic_work_plan."Persona" WHERE id=ANY($1::uuid[])', [pids]);
    await database.query('DELETE FROM academic_work_plan."Usuario" WHERE id=ANY($1::uuid[])', [uids]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [pids]);
    if (programaId) await database.query('DELETE FROM academic_work_plan.programa WHERE id=$1', [programaId]);
    if (facultadId) await database.query('DELETE FROM academic_work_plan.facultad WHERE id=$1', [facultadId]);
    // Los accesos revocados y la auditoría ficticia quedan hasta eliminar el cluster temporal.
  }
};
