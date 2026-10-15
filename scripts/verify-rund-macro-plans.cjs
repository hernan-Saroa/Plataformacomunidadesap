/* Selección firme del propietario PTA frente al QueryBuilder anterior; solo datos ficticios. */
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');

module.exports = async function verifyPlans(check, ctx) {
  const { database, request, service, previous, limited, Plan, planesClient, profiles, readRoleCode,
    ptaFixture, ptaToken, publicBase, jwt, snapshot } = ctx;
  const periodo = '2096-2', states = ['APROBADO', 'APROBADO_DEF', 'EN_FIRME', 'RADICADO', 'EN_EJECUCION', 'FINALIZADO', 'TERMINADO'];
  const planIds = [], filters = { docenteId: profiles[0], periodo };
  const route = `/macro-docente?docenteId=${profiles[0]}&periodo=${periodo}`;
  const baseline = await snapshot();
  let external;
  const insert = async (docenteId, period, estado, datos) => {
    const id = randomUUID(); planIds.push(id);
    await database.query(`INSERT INTO academic_work_plan."PlanTrabajoAcademico"
      (id,"docenteId",periodo,estado,"datosEstructurados","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,now(),now())`,
    [id, docenteId, period, estado, datos === null ? null : JSON.stringify(datos)]); return id;
  };
  const source = async (body, status = 200, headers = { 'x-internal-service-token': ptaToken }) => {
    const res = await fetch(ptaFixture.url + '/internal/rund/v1/planes/historial-firme', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    }); assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  const equivalent = async filter => assert.deepEqual(await service.getHistorial(filter), await previous.getHistorial(filter));
  try {
    for (const estado of [...states, 'BORRADOR', 'DEVUELTO', 'CERRADO', 'aprobado', 'APROBADO ']) await insert(profiles[0], periodo, estado,
      { asignaturas: [{ codigo: estado, programa_nombre: ' PROGRAMA HISTÓRICO ', territorial_nombre: ' Histórica ', horasClase: '0' }], privadoNoConsumido: 'NO EXPONER' });
    await insert(profiles[1], periodo, 'EN_FIRME', { asignaturas: [{ codigo: 'OTRO-DOCENTE' }] });
    for (const datos of [null, 7, 'legacy', [], {}, { asignaturas: null }, { asignaturas: {} }, { asignaturas: 'legacy' },
      { asignaturas: [null, 1, 'texto', {}, { codigoAsignatura: 'A', horas_clase: '3', sede: { nombre: ' ANTIGUA ' } }] }]) {
      await insert(profiles[0], '2096-0', 'EN_FIRME', datos);
    }
    await insert(' ' + profiles[0] + ' ', ' 2096-X ', 'RADICADO', { asignaturas: [{ codigo: 'CRUDO' }] });
    await insert(profiles[0], '2096-DRAFT', 'BORRADOR', { asignaturas: [{ codigo: 'NO-FIRME' }] });
    const setup = await snapshot();
    await check('Planes Macro: token interno obligatorio, filtros acotados, proyección mínima y respuesta sin caché', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(filters, 401, headers);
      for (const body of [null, [], {}, { docenteId: '' }, { periodo: 1 }, { periodo, estado: 'BORRADOR' }]) await source(body, 400);
      const { res, body } = await source(filters);
      assert.equal(res.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(body.consulta, filters); assert.equal(body.total, 7);
      assert(body.items.every(item => Object.keys(item).sort().join(',') === 'datosEstructurados,docenteId,estado,id,periodo'
        && Object.keys(item.datosEstructurados).join(',') === 'asignaturas'));
      assert(!JSON.stringify(body).includes('NO EXPONER')); assert.deepEqual(await snapshot(), setup);
    });
    await check('Planes Macro: los siete estados firmes coinciden con QueryBuilder sin SELECT de planes desde el consumidor', async () => {
      await assert.rejects(limited.getRepository(Plan).find(), /permission denied/);
      await equivalent(filters);
      const actual = await service.getHistorial(filters); assert.equal(actual.total, 7);
      assert.deepEqual(actual.items.map(row => row.asignatura_codigo).sort(), [...states].sort());
    });
    await check('Planes Macro: JSON nulo, escalar o histórico y asignaturas heterogéneas mantienen el aplanado anterior', async () => {
      await equivalent({ docenteId: profiles[0], periodo: '2096-0' });
      const actual = await service.getConsultaPuntual(profiles[0], '2096-0'); assert.equal(actual.length, 5);
      assert.deepEqual(actual, await previous.getConsultaPuntual(profiles[0], '2096-0'));
      assert.equal(actual.at(-1).asignatura_codigo, 'A'); assert.equal(actual.at(-1).horas, 3);
    });
    await check('Planes Macro: docente, período, filtros posteriores y páginas conservan alcance, valores crudos y orden descendente', async () => {
      for (const filter of [filters, { periodo }, { docenteId: profiles[0] }, { ...filters, page: 2, limit: 3 },
        { ...filters, territorial: 'historica', programa: 'programa historico' }, { ...filters, nucleoTematico: 'investigacion' },
        { docenteId: ' ' + profiles[0] + ' ', periodo: ' 2096-X ' }]) await equivalent(filter);
      const raw = await planesClient.planesFirmes({ docenteId: ' ' + profiles[0] + ' ', periodo: ' 2096-X ' }); assert.equal(raw.length, 1);
      const all = await planesClient.planesFirmes({ docenteId: profiles[0] });
      for (let i = 1; i < all.length; i++) assert(all[i-1].periodo >= all[i].periodo);
    });
    await check('Planes Macro: más de 500 planes se transportan completos antes de paginar las asignaturas', async () => {
      const batch = Array.from({ length: 501 }, () => randomUUID()); planIds.push(...batch);
      try {
        await database.query(`INSERT INTO academic_work_plan."PlanTrabajoAcademico"
          (id,"docenteId",periodo,estado,"datosEstructurados","createdAt","updatedAt")
          SELECT id,$2,'2096-M-'||ordinality::text,'TERMINADO',jsonb_build_object('asignaturas',jsonb_build_array(jsonb_build_object('codigo',id::text))),now(),now()
          FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id,ordinality)`, [batch, profiles[2]]);
        const before = ptaFixture.planRequestCount(), headers = ptaFixture.planRequestHeaders().length;
        const plans = await planesClient.planesFirmes({ docenteId: profiles[2] }); assert.equal(plans.filter(row => batch.includes(row.id)).length, 501);
        assert.equal(ptaFixture.planRequestCount(), before + 1);
        assert(ptaFixture.planRequestHeaders().slice(headers).every(row => row.tokenMatches && !row.authorizationForwarded && !row.cookieForwarded));
        const result = await service.getHistorial({ docenteId: profiles[2], limit: 200 }); assert(result.total >= 501); assert.equal(result.items.length, 200);
        await equivalent({ docenteId: profiles[2], page: 3, limit: 200 });
      } finally { await database.query('DELETE FROM academic_work_plan."PlanTrabajoAcademico" WHERE id=ANY($1::uuid[])', [batch]); }
    });
    await check('Planes Macro: cambios de estado y asignaturas de PTA se reflejan en la siguiente consulta sin caché', async () => {
      const id = planIds[0];
      const original = (await database.query('SELECT * FROM academic_work_plan."PlanTrabajoAcademico" WHERE id=$1', [id])).rows[0];
      try {
        await database.query('UPDATE academic_work_plan."PlanTrabajoAcademico" SET estado=\'BORRADOR\' WHERE id=$1', [id]);
        assert.equal((await service.getHistorial(filters)).total, 6);
        await database.query(`UPDATE academic_work_plan."PlanTrabajoAcademico" SET estado='APROBADO',"datosEstructurados"=$2 WHERE id=$1`,
          [id, JSON.stringify({ asignaturas: [{ codigo: 'CAMBIO', horas: '27' }] })]);
        assert.equal((await service.getHistorial(filters)).items.find(row => row.asignatura_codigo === 'CAMBIO').horas, 27); await equivalent(filters);
      } finally { await database.query('UPDATE academic_work_plan."PlanTrabajoAcademico" SET estado=$2,"datosEstructurados"=$3 WHERE id=$1',
        [id, original.estado, JSON.stringify(original.datosEstructurados)]); }
    });
    await check('Planes Macro: ausencia y planes borrador confirman vacío; sin propietario disponible no se presume ausencia', async () => {
      for (const period of ['2096-AUSENTE', '2096-DRAFT']) {
        const filter = { docenteId: profiles[0], periodo: period }; await equivalent(filter);
        assert.equal((await service.getHistorial(filter)).total, 0);
        ptaFixture.setPlanMode('unavailable');
        try { await assert.rejects(service.getHistorial(filter), error => error.getStatus() === 503); }
        finally { ptaFixture.setPlanMode('normal'); }
      }
    });
    await check('Planes Macro: caída, 404 y contrato parcial devuelven 503 en historial y consulta puntual sin SQL alternativo', async () => {
      for (const mode of ['unavailable', 'missing', 'partial']) {
        ptaFixture.setPlanMode(mode);
        await assert.rejects(service.getHistorial(filters), error => error.getStatus() === 503);
        await request(route, { status: 503 }); await request(`/macro-docente/consulta?docenteId=${profiles[0]}&periodo=${periodo}`, { status: 503 });
      }
      ptaFixture.setPlanMode('normal'); await equivalent(filters);
    });
    await check('Planes Macro: sesión, documento protegido y enlace externo mantienen permisos y un único docente', async () => {
      const token = jwt.sign({ sub: randomUUID(), roles: [readRoleCode] }, { expiresIn: '10m' });
      const result = await request(route, { token }); assert.equal(result.total, 7); assert(result.items.every(row => row.documento_identidad.includes('*')));
      const before = ptaFixture.planRequestCount(); await request(route, { token: null, status: 401 }); assert.equal(ptaFixture.planRequestCount(), before);
      external = (await request('/macro-docente/accesos-externos', { method: 'POST', status: 201, body: {
        enteNombre: 'PLANES FICTICIOS', docenteId: profiles[0], fechaInicio: new Date(Date.now()-60000).toISOString(), fechaFin: new Date(Date.now()+3600000).toISOString() } })).data;
      const publicRoute = '/services/rund/api/v1/pta/macro-docente/externo/' + external.token;
      const publicResult = await request(`${publicRoute}?periodo=${periodo}&docenteId=${profiles[1]}`, { origin: publicBase, token: null });
      assert.equal(publicResult.total, 7); assert(publicResult.items.every(row => row.docente_id === profiles[0] && row.documento_identidad.includes('*')));
    });
    await check('Planes Macro: fallo del propietario o auditoría bloquea entrega externa; revocación sigue impidiendo consultar', async () => {
      const publicRoute = '/services/rund/api/v1/pta/macro-docente/externo/' + external.token;
      ptaFixture.setPlanMode('missing');
      try { await request(publicRoute + '?periodo=' + periodo, { origin: publicBase, token: null, status: 503 }); }
      finally { ptaFixture.setPlanMode('normal'); }
      await database.query(`CREATE FUNCTION rund.reject_macro_plan_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.periodo='2096-2' THEN RAISE EXCEPTION 'AUDITORIA PLAN FICTICIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_macro_plan_audit BEFORE INSERT ON rund."RundMacroDocenteConsultaLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_macro_plan_audit()`);
      try { await request(route, { status: 403 }); await request(publicRoute + '?periodo=' + periodo, { origin: publicBase, token: null, status: 403 }); }
      finally { await database.query('DROP TRIGGER reject_macro_plan_audit ON rund."RundMacroDocenteConsultaLog"; DROP FUNCTION rund.reject_macro_plan_audit()'); }
      await request(`/macro-docente/accesos-externos/${external.id}`, { method: 'DELETE' });
      await request(publicRoute, { origin: publicBase, token: null, status: 403 });
    });
    await check('Planes Macro: consultas y fallos mantienen intactas filas de planes, personas, programas y perfiles', async () => {
      assert.deepEqual(await snapshot(), setup);
    });
  } finally {
    ptaFixture.setPlanMode('normal');
    await database.query('DELETE FROM academic_work_plan."PlanTrabajoAcademico" WHERE id=ANY($1::uuid[])', [planIds]);
    assert.deepEqual(await snapshot(), baseline);
  }
};
