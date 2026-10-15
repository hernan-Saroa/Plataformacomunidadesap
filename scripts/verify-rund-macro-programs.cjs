/* Respaldo de programas: repositorio anterior frente a API PTA con RUND sin SELECT del catálogo. */
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');

module.exports = async function verifyPrograms(check, ctx) {
  const { database, request, profiles, programaId, facultadId, service, previous, client, limited, Programa, ptaFixture,
    ptaToken, publicBase, jwt, readRoleCode, snapshot } = ctx;
  const ids = ['9007199254740993', '9007199254740994', '9007199254740995', '-9223372036854775808', '9223372036854775807'];
  const names = [' INACTIVO HISTÓRICO ', 'RETIRADO HISTÓRICO', '   ', 'MÍNIMO HISTÓRICO', 'MÁXIMO HISTÓRICO'];
  const planIds = [randomUUID(), randomUUID()], periodo = '2097-2';
  let external;
  const source = async (programaIds, status = 200, headers = { 'x-internal-service-token': ptaToken }) => {
    const res = await fetch(ptaFixture.url + '/internal/rund/v1/catalogos/programas-historicos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ programaIds }),
    });
    assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  const filters = { docenteId: profiles[0], periodo }, route = `/macro-docente?docenteId=${profiles[0]}&periodo=${periodo}`;
  const queryNames = async () => Object.fromEntries((await service.getHistorial(filters)).items.map(row => [row.asignatura_codigo, row.programa]));
  const baseline = await snapshot();
  try {
    for (let i = 0; i < ids.length; i++) await database.query(`INSERT INTO academic_work_plan.programa
      (id,codigo,nombre,nombre_excel,nombre_corto,id_facultad,tipo,modalidad,activo,deleted_at)
      VALUES ($1,$2,$3,'FICTICIO','FICTICIO',$4,'pregrado','presencial',$5,$6)`,
    [ids[i], 'MP-' + randomUUID().slice(0, 8), names[i], facultadId, i !== 0, i === 1 ? new Date('2000-01-01') : null]);
    const asignaturas = [
      { codigo: 'P-A', programa_id: ids[1], programa_nombre_completo: ' Nombre embebido ', programa_nombre: 'Otro', horas: 1 },
      { codigo: 'P-B', programa_id: ids[0], territorial_nombre: ' Histórica ', horasClase: 2 },
      { codigo: 'P-C', programa_id: ids[1] }, { codigo: 'P-D', programa_id: '-99999' },
      { codigo: 'P-E', programa_id: '0' + ids[0] }, { codigo: 'P-F', programa_id: '+' + ids[0] },
      { codigo: 'P-G', programa_id: ids[2] }, { codigo: 'P-H', programa: { id: ids[3] } },
      { codigo: 'P-I', programaId: ids[4] }, { codigo: 'P-J', programa_id: 1 },
    ];
    for (let i = 0; i < planIds.length; i++) await database.query(`INSERT INTO academic_work_plan."PlanTrabajoAcademico"
      (id,"docenteId",periodo,estado,"datosEstructurados","createdAt","updatedAt") VALUES ($1,$2,$3,'EN_FIRME',$4,now(),now())`,
    [planIds[i], profiles[0], i ? '2097-1' : periodo, JSON.stringify({ asignaturas: i
      ? [{ codigo: 'SOLO-EMBEBIDO', programa_id: 'id-incompatible-no-consultado', programa_nombre: ' EMBEBIDO ' }] : asignaturas })]);
    const setup = await snapshot();
    await check('Programas Macro: PTA exige token, publica solo ID/nombre textual con echo y sin caché', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(ids, 401, headers);
      for (const values of [[1], ['no-id'], ['9223372036854775808'], ['1', '1'], Array(501).fill('1')]) await source(values, 400);
      const { res, body } = await source(ids);
      assert.equal(res.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(body.consulta, { programaIds: ids });
      assert.equal(body.total, 4); assert(body.items.every(row => Object.keys(row).sort().join(',') === 'id,nombre' && typeof row.id === 'string'));
      assert.equal(body.items.find(row => row.id === ids[0]).nombre, names[0]);
      assert(!body.items.some(row => row.id === ids[1])); assert.deepEqual(await snapshot(), setup);
    });
    await check('Programas Macro: historial coincide con Repository.find sin SELECT del catálogo, con inactivos y soft delete', async () => {
      await assert.rejects(limited.getRepository(Programa).find(), /permission denied/);
      assert.deepEqual(await service.getHistorial(filters), await previous.getHistorial(filters));
      const rows = await queryNames();
      assert.equal(rows['P-A'], 'Nombre embebido'); assert.equal(rows['P-B'], names[0]); assert.equal(rows['P-C'], null); assert.equal(rows['P-D'], null);
    });
    await check('Programas Macro: bigint extremos, alias con ceros/signo y nombres vacíos conservan las claves del mapa anterior', async () => {
      const rows = await queryNames();
      assert.equal(rows['P-E'], null); assert.equal(rows['P-F'], null); assert.equal(rows['P-J'], null);
      assert.equal(rows['P-G'], '   '); assert.equal(rows['P-H'], names[3]); assert.equal(rows['P-I'], names[4]);
      const body = (await source(['0' + ids[0], '+' + ids[0]])).body;
      assert.deepEqual(body.items, [{ id: ids[0], nombre: names[0] }]);
    });
    await check('Programas Macro: filtros, paginación y consulta puntual mantienen las mismas asignaturas y totales', async () => {
      for (const filter of [filters, { ...filters, page: 2, limit: 3 }, { ...filters, programa: 'nombre embebido' },
        { ...filters, programa: 'inactivo historico' }, { ...filters, territorial: 'historica' }]) {
        assert.deepEqual(await service.getHistorial(filter), await previous.getHistorial(filter));
      }
      assert.deepEqual(await service.getConsultaPuntual(profiles[0], periodo), await previous.getConsultaPuntual(profiles[0], periodo));
    });
    await check('Programas Macro: más de 500 candidatos se consultan completos y un segundo lote caído no publica el primero', async () => {
      const batchIds = [ids[0], ...Array.from({ length: 500 }, (_, i) => String(10000000000000000n + BigInt(i)))];
      const before = ptaFixture.programRequestCount(), headers = ptaFixture.programRequestHeaders().length;
      assert.deepEqual(await client.programasHistoricos(batchIds), [{ id: ids[0], nombre: names[0] }]);
      assert.equal(ptaFixture.programRequestCount(), before + 2);
      assert(ptaFixture.programRequestHeaders().slice(headers).every(row => row.tokenMatches && !row.authorizationForwarded && !row.cookieForwarded));
      ptaFixture.setProgramMode('fail-second');
      try { await assert.rejects(client.programasHistoricos(batchIds), error => error.getStatus() === 503); }
      finally { ptaFixture.setProgramMode('normal'); }
    });
    await check('Programas Macro: cambios de nombre, retiro y restauración del propietario se reflejan en la siguiente consulta', async () => {
      try {
        await database.query('UPDATE academic_work_plan.programa SET nombre=$2 WHERE id=$1', [ids[0], 'CAMBIO HISTÓRICO']);
        assert.equal((await queryNames())['P-B'], 'CAMBIO HISTÓRICO');
        await database.query('UPDATE academic_work_plan.programa SET deleted_at=now() WHERE id=$1', [ids[0]]);
        assert.equal((await queryNames())['P-B'], null);
        await database.query('UPDATE academic_work_plan.programa SET deleted_at=NULL WHERE id=$1', [ids[0]]);
        assert.equal((await queryNames())['P-B'], 'CAMBIO HISTÓRICO');
      } finally { await database.query('UPDATE academic_work_plan.programa SET nombre=$2,deleted_at=NULL WHERE id=$1', [ids[0], names[0]]); }
    });
    await check('Programas Macro: caída, 404 o respuesta parcial falla sin historial parcial; nombres embebidos no dependen del catálogo', async () => {
      for (const mode of ['unavailable', 'missing', 'partial']) {
        ptaFixture.setProgramMode(mode);
        await assert.rejects(service.getHistorial(filters), error => error.getStatus() === 503);
        await request(route, { status: 503 }); await request(`/macro-docente/consulta?docenteId=${profiles[0]}&periodo=${periodo}`, { status: 503 });
        const before = ptaFixture.programRequestCount();
        const embedded = await service.getHistorial({ docenteId: profiles[0], periodo: '2097-1' });
        assert.equal(embedded.items[0].programa, 'EMBEBIDO'); assert.equal(ptaFixture.programRequestCount(), before);
      }
      ptaFixture.setProgramMode('normal'); assert.deepEqual(await service.getHistorial(filters), await previous.getHistorial(filters));
    });
    await check('Programas Macro: main conserva permisos, documento protegido y alcance del acceso externo', async () => {
      const token = jwt.sign({ sub: randomUUID(), roles: [readRoleCode] }, { expiresIn: '10m' });
      const result = await request(route, { token }); assert.equal(result.total, 10); assert(result.items[0].documento_identidad.includes('*'));
      await request(route, { token: null, status: 401 });
      external = (await request('/macro-docente/accesos-externos', { method: 'POST', status: 201, body: {
        enteNombre: 'PROGRAMAS FICTICIOS', docenteId: profiles[0], fechaInicio: new Date(Date.now()-60000).toISOString(), fechaFin: new Date(Date.now()+3600000).toISOString() } })).data;
      const publicRoute = '/services/rund/api/v1/pta/macro-docente/externo/' + external.token;
      const publicResult = await request(`${publicRoute}?periodo=${periodo}&docenteId=${profiles[1]}`, { origin: publicBase, token: null });
      assert.equal(publicResult.total, 10); assert(publicResult.items.every(row => row.docente_id === profiles[0] && row.documento_identidad.includes('*')));
    });
    await check('Programas Macro: propietario o auditoría indisponibles bloquean el enlace y revocación sigue funcionando', async () => {
      const publicRoute = '/services/rund/api/v1/pta/macro-docente/externo/' + external.token;
      ptaFixture.setProgramMode('missing');
      try { await request(publicRoute + '?periodo=' + periodo, { origin: publicBase, token: null, status: 503 }); }
      finally { ptaFixture.setProgramMode('normal'); }
      await database.query(`CREATE FUNCTION rund.reject_macro_program_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.periodo='2097-2' THEN RAISE EXCEPTION 'AUDITORIA PROGRAMA FICTICIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_macro_program_audit BEFORE INSERT ON rund."RundMacroDocenteConsultaLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_macro_program_audit()`);
      try { await request(route, { status: 403 }); await request(publicRoute + '?periodo=' + periodo, { origin: publicBase, token: null, status: 403 }); }
      finally { await database.query('DROP TRIGGER reject_macro_program_audit ON rund."RundMacroDocenteConsultaLog"; DROP FUNCTION rund.reject_macro_program_audit()'); }
      await request(`/macro-docente/accesos-externos/${external.id}`, { method: 'DELETE' });
      await request(publicRoute, { origin: publicBase, token: null, status: 403 });
    });
    await check('Programas Macro: consultas y fallos no alteran personas, programas, planes, cuentas ni perfiles', async () => {
      assert.deepEqual(await snapshot(), setup);
    });
  } finally {
    ptaFixture.setProgramMode('normal');
    await database.query('DELETE FROM academic_work_plan."PlanTrabajoAcademico" WHERE id=ANY($1::uuid[])', [planIds]);
    await database.query('DELETE FROM academic_work_plan.programa WHERE id=ANY($1::bigint[])', [ids]);
    assert.deepEqual(await snapshot(), baseline);
    // Accesos revocados y bitácora ficticia se conservan hasta eliminar el cluster temporal.
  }
};
