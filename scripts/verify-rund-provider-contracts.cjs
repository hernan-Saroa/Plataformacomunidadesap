/* Solo fixtures del cluster creado por verify-rund-service-integration.cjs.
 * No lee .env ni admite una conexión a bases instaladas.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const { Client } = require(path.join(root, 'backend/rund-service/node_modules/pg'));

module.exports = async function verifyProvider(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration');
  assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const db = new Client(pgConfig); await db.connect();
  const { request, internal, docenteId } = context;
  const { CAMPOS_SOPORTE_RUND } = require(path.join(root, 'backend/rund-service/dist/modules/banco-docentes/rund-document-fields.js'));
  const expectedPercent = Math.round(100 / CAMPOS_SOPORTE_RUND.length);
  const expectedCount = CAMPOS_SOPORTE_RUND.length + 1;
  const fixtureId = 'DOC-CATALOGO-FICTICIO-' + randomUUID();
  let fixtureCreated = false;
  try {
    const [source] = (await db.query('SELECT * FROM rund."Docente" WHERE id=$1', [docenteId])).rows;
    const personaId = source.personaId;
    const userId = (await db.query('SELECT id_user FROM auth."user" WHERE id_person=$1', [personaId])).rows[0].id_user;
    const firstId = (await db.query('SELECT id FROM rund."Docente" WHERE "personaId"=$1 AND "periodoCarga"=$2', [personaId, '2026-1'])).rows[0].id;
    await check('Proveedor RUND: período inexistente retorna 404 sin sustituirlo por otro perfil', async () => {
      await internal(`docentes/resolver/${personaId}?periodo=2099-2`, { status: 404 });
      await internal(`docentes/resolver/${docenteId}?periodo=2026-1`, { status: 404 });
      assert.equal((await internal(`docentes/resolver/${personaId}?periodo=2026-2`)).data.id, docenteId);
    });
    await check('Proveedor RUND: alias ambiguos de persona/usuario no eligen estados de un período arbitrario', async () => {
      const snapshot = async () => (await db.query('SELECT * FROM rund.validacion_documental ORDER BY id')).rows;
      const before = await snapshot();
      await request(`/rund/docente/${personaId}`, { status: 409 });
      await internal(`docentes/${personaId}/validacion`, { status: 409 });
      await request(`/rund/docente/${userId}`, { status: 409 });
      assert.deepEqual(await snapshot(), before);
    });
    await check('Proveedor RUND: cada ID de perfil explícito conserva sus propios estados aunque comparta persona', async () => {
      for (const id of [firstId, docenteId]) {
        const response = (await internal(`docentes/${id}/validacion`)).data;
        assert.equal(response.docenteId, id);
        assert.equal(response.personaId, personaId);
        assert(response.validaciones.length >= CAMPOS_SOPORTE_RUND.length);
        assert(CAMPOS_SOPORTE_RUND.every(item => response.validaciones.some(row => row.campo_rund === item.campo)));
        const persisted = (await db.query('SELECT id FROM rund.validacion_documental WHERE docente_id=$1', [id])).rows.map(row => row.id).sort();
        assert.deepEqual(response.validaciones.map(row => row.id).sort(), persisted);
      }
    });
    await db.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d) || jsonb_build_object(
        'id',$1::text,'periodoCarga','2099-1','idRund',$1::text))).*
      FROM rund."Docente" d WHERE id=$2`, [fixtureId, docenteId]);
    fixtureCreated = true;
    const originalIds = [randomUUID(), randomUUID(), randomUUID()];
    for (const [index, campo, estado] of [[0, 'DOCUMENTO_IDENTIDAD', 'Aceptado'], [1, 'GENERO', 'No aplica'], [2, 'CAMPO_HISTORICO_ADICIONAL', 'Aceptado']]) {
      await db.query(`INSERT INTO rund.validacion_documental
        (id,docente_id,campo_rund,tipo_documento_soporte,estado_documento,fecha_validacion,validado_por,observacion)
        VALUES ($1,$2,$3,'IDENTIDAD',$4,'2026-01-01','ACTOR_FICTICIO','CONSERVAR DECISION')`, [originalIds[index], fixtureId, campo, estado]);
    }
    const snapshot = async () => (await db.query('SELECT * FROM rund.validacion_documental WHERE docente_id=$1 ORDER BY id', [fixtureId])).rows;
    const original = await snapshot();
    await check('Proveedor RUND: fallo al completar el catálogo revierte toda la sentencia y conserva decisiones previas', async () => {
      await db.query(`CREATE FUNCTION rund.reject_catalogo_ficticio() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.docente_id LIKE 'DOC-CATALOGO-FICTICIO-%' AND NEW.campo_rund='FIN_VINCULACION'
          THEN RAISE EXCEPTION 'FALLO FICTICIO DE CATALOGO'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_catalogo_ficticio BEFORE INSERT ON rund.validacion_documental
        FOR EACH ROW EXECUTE FUNCTION rund.reject_catalogo_ficticio()`);
      try {
        await internal(`docentes/${fixtureId}/validacion`, { status: 500 });
        assert.deepEqual(await snapshot(), original);
      } finally {
        await db.query('DROP TRIGGER reject_catalogo_ficticio ON rund.validacion_documental; DROP FUNCTION rund.reject_catalogo_ficticio()');
      }
    });
    await check('Proveedor RUND: completa 36 requisitos sin perder aprobaciones, No aplica, actores ni campos históricos', async () => {
      const result = (await internal(`docentes/${fixtureId}/validacion`)).data;
      assert.equal(result.completitud, expectedPercent);
      assert.equal(result.validaciones.length, expectedCount);
      const after = await snapshot();
      assert.deepEqual(after.filter(row => originalIds.includes(row.id)), original);
      assert(after.filter(row => !originalIds.includes(row.id)).every(row => row.estado_documento === 'Sin cargar'));
    });
    await check('Proveedor RUND: inicializaciones concurrentes no duplican campos ni cambian decisiones persistidas', async () => {
      await db.query('DELETE FROM rund.validacion_documental WHERE docente_id=$1 AND NOT (id=ANY($2::uuid[]))', [fixtureId, originalIds]);
      const results = await Promise.all(Array.from({ length: 4 }, () => internal(`docentes/${fixtureId}/validacion`)));
      assert(results.every(result => result.data.completitud === expectedPercent && result.data.validaciones.length === expectedCount));
      const after = await snapshot();
      assert.equal(after.length, expectedCount);
      assert.equal(new Set(after.map(row => row.campo_rund)).size, expectedCount);
      assert.deepEqual(after.filter(row => originalIds.includes(row.id)), original);
    });
    await check('Proveedor RUND: repetir una consulta completa conserva IDs, fechas, metadatos y estados', async () => {
      const before = await snapshot();
      await internal(`docentes/${fixtureId}/validacion`);
      await request(`/rund/docente/${fixtureId}`);
      assert.deepEqual(await snapshot(), before);
    });
  } finally {
    try {
      if (fixtureCreated) {
        await db.query('DELETE FROM rund.validacion_documental WHERE docente_id=$1', [fixtureId]);
        await db.query('DELETE FROM rund."Docente" WHERE id=$1', [fixtureId]);
      }
    } finally { await db.end(); }
  }
};
