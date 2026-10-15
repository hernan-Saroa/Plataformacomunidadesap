/* Verificación del período en el clúster ficticio de verify-rund-service-integration.
 * No carga .env ni acepta una instalación existente. Restaura sus fixtures de período.
 */
const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function verifyActivePeriod(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, row, workbookBody, catalogFixture, ptaToken, authFixture } = context;
  const periods = async () => (await database.query('SELECT codigo,estado FROM academic_work_plan.periodo_academico ORDER BY codigo')).rows;
  const originalPeriods = await periods();
  const replacePeriods = async items => {
    // Tabla fixture mínima de este clúster temporal; nunca se ejecuta sobre PTA instalado.
    await database.query('DELETE FROM academic_work_plan.periodo_academico');
    for (const item of items) await database.query('INSERT INTO academic_work_plan.periodo_academico (codigo,estado) VALUES ($1,$2)', [item.codigo, item.estado]);
  };
  const snapshot = async () => {
    const result = {};
    for (const [schema, table] of [['auth', 'personas'], ['auth', 'user'], ['auth', 'user_roles'],
      ...['Docente', 'RundSoporteCampo', 'RundCargaMasiva', 'RundAprobacionLog', 'validacion_documental', 'RundCampoEstado'].map(t => ['rund', t])]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    // Se conserva la auditoría de lectura del resultado de previsualización.
    return result;
  };
  const endpoint = catalogFixture.url + '/internal/rund/v1/catalogos/periodo-activo';
  const source = async (status = 200, headers = { 'x-internal-service-token': ptaToken }) => {
    const res = await fetch(endpoint, { headers }); assert.equal(res.status, status, await res.clone().text());
    const data = await res.json(); return { res, data };
  };
  const missingRow = i => {
    const result = { ...row, DOCUMENTO_IDENTIDAD: '909002000' + i, CORREO_INSTITUCIONAL: `periodo-ficticio-${i}@example.test` };
    delete result.PERIODO_CARGA; delete result.periodoCarga; delete result.periodo_carga; return result;
  };
  try {
    await replacePeriods([{ codigo: '2026-2', estado: 'en_curso' }, { codigo: '2027-1', estado: 'planeacion' }]);
    await check('Período activo: API PTA exige token y devuelve solo código/estado en curso sin caché ni escrituras', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(401, headers);
      const before = await periods(), { res, data } = await source();
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(data, { items: [{ codigo: '2026-2', estado: 'en_curso' }], total: 1 });
      assert.deepEqual(await periods(), before);
    });
    await check('Período activo: carga JSON multirregistro conserva período de fila y completa faltantes con una sola consulta', async () => {
      const count = catalogFixture.periodRequestCount();
      const rows = [{ ...missingRow(1), PERIODO_CARGA: '2025-1' }, missingRow(2), missingRow(3)];
      const response = await request('/banco-docentes/bulk', { method: 'POST', body: { rows }, status: 201 });
      assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
      assert.equal(response.data.created, 3); assert.equal(catalogFixture.periodRequestCount() - count, 1);
      const profiles = (await database.query(`SELECT p.num_identificacion AS documento,d."periodoCarga" AS periodo
        FROM rund."Docente" d JOIN auth.personas p ON p.id_person=d."personaId"
        WHERE p.num_identificacion=ANY($1::text[]) ORDER BY p.num_identificacion`, [rows.map(r => r.DOCUMENTO_IDENTIDAD)])).rows;
      assert.deepEqual(profiles, rows.map((r, i) => ({ documento: r.DOCUMENTO_IDENTIDAD, periodo: i ? '2026-2' : '2025-1' })));
    });
    await check('Período activo: XLSX sin período usa PTA una vez y revierte identidad, perfiles, bloques y soportes', async () => {
      const before = await snapshot(), count = catalogFixture.periodRequestCount();
      const response = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: workbookBody([missingRow(4), missingRow(5)]), status: 201 });
      assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
      assert.equal(catalogFixture.periodRequestCount() - count, 1); assert.deepEqual(await snapshot(), before);
    });
    await check('Período activo: caída, ruta ausente, respuesta parcial o estado incorrecto impiden escribir y no usan SQL alternativo', async () => {
      const before = await snapshot(), authCalls = authFixture.bankCatalogRequestCount();
      try {
        for (const mode of ['unavailable', 'missing', 'partial', 'wrong-state']) {
          catalogFixture.setPeriodMode(mode);
          for (const suffix of ['', '?dry_run=true']) await request('/banco-docentes/bulk' + suffix,
            { method: 'POST', body: { rows: [missingRow(6)] }, status: 503 });
        }
      } finally { catalogFixture.setPeriodMode('normal'); }
      assert.equal(authFixture.bankCatalogRequestCount(), authCalls); assert.deepEqual(await snapshot(), before);
    });
    await check('Período activo: período de fila y valor general explícitos funcionan aunque PTA no esté disponible', async () => {
      const count = catalogFixture.periodRequestCount(); catalogFixture.setPeriodMode('unavailable');
      try {
        const rows = [{ ...missingRow(7), PERIODO_CARGA: '2024-2' }, missingRow(8)];
        const response = await request('/banco-docentes/bulk?periodo_carga=2023-1', { method: 'POST', body: { rows }, status: 201 });
        assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
        const profiles = (await database.query(`SELECT p.num_identificacion AS documento,d."periodoCarga" AS periodo
          FROM rund."Docente" d JOIN auth.personas p ON p.id_person=d."personaId"
          WHERE p.num_identificacion=ANY($1::text[]) ORDER BY p.num_identificacion`, [rows.map(r => r.DOCUMENTO_IDENTIDAD)])).rows;
        assert.deepEqual(profiles, [{ documento: rows[0].DOCUMENTO_IDENTIDAD, periodo: '2024-2' }, { documento: rows[1].DOCUMENTO_IDENTIDAD, periodo: '2023-1' }]);
        assert.equal(catalogFixture.periodRequestCount(), count);
      } finally { catalogFixture.setPeriodMode('normal'); }
    });
    await check('Período activo: ausencia real conserva error por fila sin inventar un período ni sembrar defaults en PTA', async () => {
      for (const items of [[{ codigo: '2026-2', estado: 'cerrado' }, { codigo: '2027-1', estado: 'planeacion' }], []]) {
        await replacePeriods(items);
        assert.deepEqual((await source()).data, { items: [], total: 0 });
        const before = await snapshot(), beforePeriods = await periods();
        const response = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: { rows: [missingRow(6)] }, status: 201 });
        assert.equal(response.data.errors, 1); assert.equal(response.data.errorDetails[0].columna, 'PERIODO_CARGA');
        assert.deepEqual(await periods(), beforePeriods); assert.deepEqual(await snapshot(), before);
      }
    });
    await check('Período activo: varios en curso producen conflicto en PTA y 503 en RUND antes de alterar datos', async () => {
      await replacePeriods([{ codigo: '2026-1', estado: 'en_curso' }, { codigo: '2026-2', estado: 'en_curso' }]);
      await source(409);
      const before = await snapshot(), beforePeriods = await periods();
      await request('/banco-docentes/bulk', { method: 'POST', body: { rows: [missingRow(6)] }, status: 503 });
      assert.deepEqual(await snapshot(), before); assert.deepEqual(await periods(), beforePeriods);
    });
  } finally { catalogFixture.setPeriodMode('normal'); await replacePeriods(originalPeriods); }
};
