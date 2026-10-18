/* Solo datos ficticios del clúster creado por verify-rund-service-integration.cjs.
 * La prueba de escritura se ejecuta al final, antes de eliminar ese clúster.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyBankCatalog(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, row, workbookBody, docenteId, authUrl, authFixture, authToken } = context;
  const snapshot = async () => {
    const result = {};
    for (const [schema, table] of [['auth', 'personas'], ['auth', 'user'], ['auth', 'user_roles'],
      ...['Docente', 'RundSoporteCampo', 'RundCargaMasiva', 'RundAprobacionLog', 'RundAccesoDatosLog', 'validacion_documental', 'RundCampoEstado'].map(t => ['rund', t])]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const catalogUrl = authUrl + '/internal/rund/v1/catalogos/territoriales-banco';
  await check('Banco catálogo: API Auth exige token y conserva tres columnas, orden SQL y cabecera privada', async () => {
    for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) {
      const res = await fetch(catalogUrl, { headers }); assert.equal(res.status, 401); await res.arrayBuffer();
    }
    const res = await fetch(catalogUrl, { headers: { 'x-internal-service-token': authToken } });
    assert.equal(res.status, 200); assert.equal(res.headers.get('cache-control'), 'private, no-store');
    const items = (await database.query(`SELECT id_seccional::text AS id,nom_seccional AS nombre,cod_seccional AS codigo
      FROM auth.seccionales ORDER BY nom_seccional ASC`)).rows;
    assert.deepEqual((await res.json()).data, { items, total: items.length });
  });
  const previewRows = [1, 2].map(i => ({ ...row, DOCUMENTO_IDENTIDAD: '909000000' + i,
    CORREO_INSTITUCIONAL: `catalogo-preview-${i}@example.test` }));
  await check('Banco catálogo: XLSX de varias filas confirma catálogo una sola vez y revierte perfiles, identidad y soportes', async () => {
    const before = await snapshot(), requests = authFixture.bankCatalogRequestCount();
    const response = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: workbookBody(previewRows), status: 201 });
    assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
    assert.equal(response.data.total, 2); assert.equal(authFixture.bankCatalogRequestCount() - requests, 1);
    // La auditoría de lectura de la previsualización es intencional, fuera del rollback.
    const after = await snapshot(); delete before['rund.RundAccesoDatosLog']; delete after['rund.RundAccesoDatosLog'];
    assert.deepEqual(after, before);
  });
  await check('Banco catálogo: Auth caído o parcial impide previsualización/carga sin guardar soporte, perfiles o auditoría', async () => {
    const before = await snapshot();
    try {
      for (const mode of ['unavailable', 'partial']) {
        authFixture.setCatalogMode(mode);
        for (const suffix of ['', '?dry_run=true']) {
          const count = authFixture.bankCatalogRequestCount();
          await request('/banco-docentes/bulk' + suffix, { method: 'POST', body: workbookBody(previewRows), status: 503 });
          assert.equal(authFixture.bankCatalogRequestCount() - count, 1);
        }
      }
    } finally { authFixture.setCatalogMode('normal'); }
    assert.deepEqual(await snapshot(), before);
  });
  await check('Banco catálogo: fallo al inicializar bloques revierte la fila completa sin dejar estados huérfanos', async () => {
    const before = await snapshot();
    const serviceRoot = path.resolve(__dirname, '../backend/rund-service');
    const { DataSource } = require(path.join(serviceRoot, 'node_modules/typeorm'));
    const { BancoDocenteEntity } = require(path.join(serviceRoot, 'dist/entities/banco-docente.entity'));
    const { BancoDocentesService } = require(path.join(serviceRoot, 'dist/modules/banco-docentes/banco-docentes.service'));
    const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port,
      username: pgConfig.user, password: pgConfig.password, database: pgConfig.database,
      entities: [BancoDocenteEntity], synchronize: false, extra: { max: 1 } });
    await ds.initialize();
    await database.query(`CREATE FUNCTION rund.reject_bank_preview() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.bloque='FORMACION' THEN RAISE EXCEPTION 'FALLO FICTICIO DE BLOQUES'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_bank_preview BEFORE INSERT ON rund."RundCampoEstado"
      FOR EACH ROW EXECUTE FUNCTION rund.reject_bank_preview()`);
    try {
      const response = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: workbookBody(previewRows), status: 201 });
      // El preview ya no inserta bloques: un trigger de escritura no participa en la observación.
      assert.equal(response.data.errors, 0); assert.equal(response.data.created, 2);
      // Se conserva la comprobación de rollback del escritor real, ahora fuera del preview.
      const source = await fetch(catalogUrl, { headers: { 'x-internal-service-token': authToken } });
      assert.equal(source.status, 200); const territoriales = (await source.json()).data.items;
      const writer = Object.create(BancoDocentesService.prototype); writer.dataSource = ds;
      for (const sample of previewRows) await assert.rejects(ds.transaction(manager => writer.upsertDocente(sample,
        { bulkImport: true, territoriales, outerManager: manager })),
      error => ['25P02', 'P0001'].includes(error.driverError?.code || error.code));
    } finally {
      await ds.destroy();
      await database.query('DROP TRIGGER reject_bank_preview ON rund."RundCampoEstado"; DROP FUNCTION rund.reject_bank_preview()');
    }
    const after = await snapshot(); delete before['rund.RundAccesoDatosLog']; delete after['rund.RundAccesoDatosLog'];
    assert.deepEqual(after, before);
  });
  await check('Banco catálogo: edición con soporte válido falla ante Auth sin tocar perfil, identidad o decisiones', async () => {
    const support = randomUUID();
    await database.query(`INSERT INTO rund."RundSoporteCampo" (id,docente_id,bloque,tipo_soporte,documento_carpeta_id)
      VALUES ($1,$2,'VINCULACION','soporte_edicion_perfil','/ficticio-edicion.pdf')`, [support, docenteId]);
    try {
      const before = await snapshot(); authFixture.setCatalogMode('unavailable');
      try {
        await request('/banco-docentes/' + docenteId, { method: 'PUT', status: 503,
          body: { soporteEdicionId: support, justificacionEdicion: 'Corrección ficticia documentada', telefono: '3001234567' } });
      } finally { authFixture.setCatalogMode('normal'); }
      assert.deepEqual(await snapshot(), before);
    } finally { await database.query('DELETE FROM rund."RundSoporteCampo" WHERE id=$1', [support]); }
  });
  await check('Banco catálogo: vacío confirmado conserva la tolerancia del masivo y el texto reportado', async () => {
    const before = await snapshot(); authFixture.setCatalogMode('empty');
    try {
      const response = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: workbookBody([previewRows[0]]), status: 201 });
      assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
      assert.equal(response.data.results[0].territorialNombre, row.TERRITORIAL);
    } finally { authFixture.setCatalogMode('normal'); }
    const after = await snapshot(); delete before['rund.RundAccesoDatosLog']; delete after['rund.RundAccesoDatosLog'];
    assert.deepEqual(after, before);
  });
  const seccional = '9007199254740993';
  const newRow = { ...row, DOCUMENTO_IDENTIDAD: '9090000099', CORREO_INSTITUCIONAL: 'catalogo-definitivo@example.test', TERRITORIAL: 'NORTESANTANDER' };
  let profileId;
  await database.query(`INSERT INTO auth.seccionales (id_seccional,nom_seccional,cod_seccional)
    VALUES ($1,'Norte de Santander','001')`, [seccional]);
  await check('Banco catálogo: carga real resuelve alias por ID Auth bigint, conserva código y texto original del archivo', async () => {
    const requests = authFixture.bankCatalogRequestCount();
    const response = await request('/banco-docentes/bulk', { method: 'POST', body: workbookBody([newRow]), status: 201 });
    assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
    assert.equal(response.data.created, 1); assert.equal(authFixture.bankCatalogRequestCount() - requests, 1);
    profileId = response.data.results[0].docenteId;
    const profile = (await database.query('SELECT * FROM rund."Docente" WHERE id=$1', [profileId])).rows[0];
    assert.equal(profile.territorialId, seccional); assert.equal(profile.territorialReportada, 'NORTESANTANDER');
    assert.equal(profile.datosCargaMasiva.TERRITORIAL, 'NORTESANTANDER');
    assert.equal((await database.query('SELECT cod_seccional FROM auth.seccionales WHERE id_seccional=$1', [seccional])).rows[0].cod_seccional, '001');
  });
  await check('Banco catálogo: reimportación con nombre desconocido conserva ID operativo y decisiones documentales', async () => {
    await database.query(`UPDATE rund.validacion_documental SET estado_documento='Aceptado',validado_por='ACTOR_FICTICIO',
      observacion='CONSERVAR',fecha_validacion='2026-01-01' WHERE docente_id=$1 AND campo_rund='DOCUMENTO_IDENTIDAD'`, [profileId]);
    const states = async () => (await database.query('SELECT * FROM rund.validacion_documental WHERE docente_id=$1 ORDER BY id', [profileId])).rows;
    const before = await states(), requests = authFixture.bankCatalogRequestCount();
    const response = await request('/banco-docentes/bulk', { method: 'POST', body: workbookBody([{ ...newRow, TERRITORIAL: 'Regional informada desconocida' }]), status: 201 });
    assert.equal(response.data.errors, 0, JSON.stringify(response.data.errorDetails));
    assert.equal(authFixture.bankCatalogRequestCount() - requests, 1);
    const profile = (await database.query('SELECT * FROM rund."Docente" WHERE id=$1', [profileId])).rows[0];
    assert.equal(profile.territorialId, seccional); assert.equal(profile.territorialReportada, 'Regional informada desconocida');
    assert.deepEqual(await states(), before);
  });
};
