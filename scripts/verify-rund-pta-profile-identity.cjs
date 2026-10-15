/* Perfil público de interoperabilidad sobre el clúster ficticio del verificador RUND.
 * Compara el DTO con el SQL anterior; no carga .env ni toca instalaciones existentes.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyProfileIdentity(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, authUrl, authFixture, authToken } = context;
  const person = randomUUID(), duplicate = randomUUID(), document = '00012345999';
  const ids = ['DOC-PERFIL-PTA-A-' + randomUUID(), 'DOC-PERFIL-PTA-B-' + randomUUID()];
  const secIds = ['9007199254740996', '9007199254740997'];
  const endpoint = 'RUND_PTA_CONSULTA_PERFIL_V1';
  const route = period => '/rund/interoperabilidad/perfiles/' + document + (period ? '?periodo=' + period : '');
  const identityUrl = authUrl + '/internal/rund/v1/personas/perfil-pta/' + document;
  const source = async (status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(identityUrl, { headers }); assert.equal(res.status, status, await res.clone().text());
    return { res, body: await res.json() };
  };
  const native = async () => (await database.query('SELECT to_jsonb(d) AS row FROM rund."Docente" d ORDER BY id')).rows;
  const previousDto = async period => {
    const [r] = (await database.query(`SELECT d.id AS docente_id,
      COALESCE(NULLIF(BTRIM(p.nom_largo),''),NULLIF(CONCAT_WS(' ',p.nom_tercero,p.pri_apellido,p.seg_apellido),'')) AS nombre_completo,
      d."perfilAcademico" AS perfil_academico,d."perfilAcademicoPro" AS perfil_academico_profesional,
      d."nivelFormacion" AS nivel_formacion,d.escalafon AS categoria,
      COALESCE(NULLIF(d."territorialId",''),p.id_seccional::text) AS territorial_id,
      s.nom_seccional AS territorial_nombre,s.cod_seccional AS territorial_codigo,
      COALESCE(d."horasAsignables",0) AS horas_programables,d.estado AS estado_vinculacion,
      d."tipoVinculacion" AS tipo_vinculacion,d."periodoCarga" AS periodo
      FROM rund."Docente" d JOIN auth.personas p ON p.id_person=d."personaId"
      LEFT JOIN auth.seccionales s ON s.id_seccional::text=COALESCE(NULLIF(d."territorialId",''),p.id_seccional::text)
      WHERE regexp_replace(BTRIM(p.num_identificacion),'\\.','','g')=$1
      ORDER BY CASE WHEN d."periodoCarga"=$2::text THEN 0 ELSE 1 END,
        CASE WHEN d."idRund" IS NOT NULL THEN 0 ELSE 1 END,CASE WHEN d."periodoCarga" IS NOT NULL THEN 0 ELSE 1 END,
        d."updatedAt" DESC NULLS LAST,d.id ASC LIMIT 1`, [document, period ?? null])).rows;
    assert(r);
    return { docente_id: r.docente_id, perfil: { nombre_completo: r.nombre_completo ?? null,
      perfil_academico: r.perfil_academico ?? null, perfil_academico_profesional: r.perfil_academico_profesional ?? null,
      nivel_formacion: r.nivel_formacion ?? null }, categoria: r.categoria ?? null,
      territorial: { id: r.territorial_id ?? null, nombre: r.territorial_nombre ?? null, codigo: r.territorial_codigo ?? null },
      horas_programables: Number(r.horas_programables ?? 0), estado_vinculacion: r.estado_vinculacion ?? null,
      tipo_vinculacion: r.tipo_vinculacion ?? null, periodo: r.periodo ?? null };
  };
  try {
    for (let i = 0; i < secIds.length; i++) await database.query(`INSERT INTO auth.seccionales (id_seccional,nom_seccional,cod_seccional)
      VALUES ($1,$2,$3)`, [secIds[i], i ? 'Operativa histórica' : 'Persona histórica', i ? '010' : '009']);
    await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,seg_apellido,gen_tercero,id_seccional)
      VALUES ($1,' 000.123.459.99 ','CC','   ','NOMBRE','APELLIDO','OTRO','X',$2)`, [person, secIds[0]]);
    for (let i = 0; i < ids.length; i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d) || jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$3::text,'territorialId',$4::text,
        'idRund',$5::text,'horasAsignables',$6::int,'estado',$7::text,'updatedAt',$8::text))).*
      FROM rund."Docente" d WHERE id=$9`, [ids[i], person, i ? '2026-2' : '2025-1', i ? secIds[1] : '',
      i ? null : 'RUND-FICTICIO-PTA', i ? 800 : 0, i ? 'ACTIVO' : 'RETIRADO', i ? '2026-01-01' : '2025-01-01', docenteId]);
    await check('Perfil PTA: identidad Auth protegida, documento con puntos/ceros, nombre compuesto y persona sin usuario', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(401, headers);
      const { res, body } = await source();
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(body.data, { encontrada: true, personaId: person, documento: document,
        nombreCompleto: 'NOMBRE APELLIDO OTRO', territorialId: secIds[0] });
      assert.equal(Number((await database.query('SELECT count(*) FROM auth."user" WHERE id_person=$1', [person])).rows[0].count), 0);
    });
    await check('Perfil PTA: DTO completo coincide con SQL anterior por período y prioridad sin período, sin sensibles ni escrituras', async () => {
      const before = await native();
      for (const period of ['2025-1', '2026-2', undefined]) {
        const expected = await previousDto(period), response = await request(route(period));
        assert.deepEqual(response.data, expected);
        assert(!JSON.stringify(response.data).includes(document));
        assert(!/puntaje|salario|telefono|nacimiento/i.test(JSON.stringify(response.data)));
      }
      assert.equal((await request(route())).data.docente_id, ids[0]);
      assert.deepEqual(await native(), before);
      const logs = (await database.query(`SELECT * FROM rund."RundAccesoDatosLog" WHERE endpoint=$1
        AND docentes && $2::text[] ORDER BY "createdAt"`, [endpoint, ids])).rows;
      assert(logs.length >= 4); assert(logs.every(log => log.resultado === 'ENMASCARADO'));
      assert(!JSON.stringify(logs).includes(document));
    });
    await check('Perfil PTA: territorial desconocida no sustituye el ID; ausencia de ambas conserva null sin pedir catálogo', async () => {
      await database.query('UPDATE rund."Docente" SET "territorialId"=$2 WHERE id=$1', [ids[0], 'NO-EXISTE']);
      assert.deepEqual((await request(route('2025-1'))).data, await previousDto('2025-1'));
      await database.query('UPDATE rund."Docente" SET "territorialId"=$2 WHERE id=$1', [ids[0], '']);
      await database.query('UPDATE auth.personas SET id_seccional=null WHERE id_person=$1', [person]);
      authFixture.setCatalogMode('unavailable');
      try { assert.deepEqual((await request(route('2025-1'))).data.territorial, { id: null, nombre: null, codigo: null }); }
      finally { authFixture.setCatalogMode('normal'); await database.query('UPDATE auth.personas SET id_seccional=$2 WHERE id_person=$1', [person, secIds[0]]); }
    });
    await check('Perfil PTA: persona ausente conserva Flujo 1 y perfil sin período conserva error distinto y auditoría', async () => {
      const missing = await request('/rund/interoperabilidad/perfiles/00000000000000999999', { status: 404 });
      assert.equal(missing.code, 'RUND_DOCENTE_NO_ENCONTRADO'); assert.equal(missing.flujo_alta, 'FLUJO_1');
      const period = await request(route('2099-2'), { status: 404 });
      assert.equal(period.code, 'RUND_DOCENTE_SIN_PERIODO'); assert.equal(period.flujo_alta, null);
    });
    await check('Perfil PTA: caída, ruta antigua ausente o respuesta parcial de Auth devuelven 503 sin sugerir alta', async () => {
      const before = await native(); assert(await previousDto('2026-2'));
      try {
        for (const mode of ['unavailable', 'missing', 'partial']) {
          authFixture.setPtaIdentityMode(mode);
          const response = await request(route('2026-2'), { status: 503 }); assert.equal(response.flujo_alta, undefined);
        }
      } finally { authFixture.setPtaIdentityMode('normal'); }
      assert.deepEqual(await native(), before);
    });
    await check('Perfil PTA: documento normalizado ambiguo falla en Auth/RUND sin seleccionar otra identidad', async () => {
      await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero)
        VALUES ($1,$2,'CC','DUPLICADO FICTICIO','DUPLICADO','FICTICIO','X')`, [duplicate, document]);
      try { await source(409); await request(route('2026-2'), { status: 503 }); }
      finally { await database.query('DELETE FROM auth.personas WHERE id_person=$1', [duplicate]); }
    });
    await check('Perfil PTA: catálogo caído o parcial falla sin reemplazar nombres; la recuperación conserva DTO', async () => {
      const before = await native();
      try { for (const mode of ['unavailable', 'partial']) { authFixture.setCatalogMode(mode); await request(route('2026-2'), { status: 503 }); } }
      finally { authFixture.setCatalogMode('normal'); }
      assert.deepEqual((await request(route('2026-2'))).data, await previousDto('2026-2'));
      assert.deepEqual(await native(), before);
    });
    await check('Perfil PTA: auditoría indisponible impide entregar datos y conserva el perfil', async () => {
      const before = await native();
      await database.query(`CREATE FUNCTION rund.reject_interop_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.endpoint='RUND_PTA_CONSULTA_PERFIL_V1' THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_interop_audit BEFORE INSERT ON rund."RundAccesoDatosLog"
        FOR EACH ROW EXECUTE FUNCTION rund.reject_interop_audit()`);
      try { const response = await request(route('2026-2'), { status: 503 }); assert.equal(response.data, undefined); }
      finally { await database.query('DROP TRIGGER reject_interop_audit ON rund."RundAccesoDatosLog"; DROP FUNCTION rund.reject_interop_audit()'); }
      assert.deepEqual(await native(), before);
    });
  } finally {
    authFixture.setPtaIdentityMode('normal'); authFixture.setCatalogMode('normal');
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [ids]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])', [[person, duplicate]]);
    await database.query('DELETE FROM auth.seccionales WHERE id_seccional=ANY($1::bigint[])', [secIds]);
  }
};
