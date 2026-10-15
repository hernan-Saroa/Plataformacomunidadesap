/* APIs compiladas de catálogos. Solo se invoca dentro del clúster PostgreSQL temporal.
 * No carga AppModule, .env ni catálogos de instalaciones existentes.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ptaRoot = path.join(root, 'backend/academic-work-plan-service');
const dep = name => require(require.resolve(name, { paths: [ptaRoot] }));
const compiled = name => require(path.join(ptaRoot, 'dist', name));

module.exports = async function startCatalogFixture(pgConfig, runtime, token) {
  assert.equal(pgConfig.database, 'rund_integration');
  assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { Client } = require(path.join(root, 'backend/rund-service/node_modules/pg'));
  const db = new Client(pgConfig); await db.connect();
  let app, mode = 'normal', periodMode = 'normal', periodRequests = 0, nombreMode = 'normal';
  let historicalMode = 'normal', historicalRequests = 0, historicalBatch = 0;
  const historicalHeaders = [];
  let programMode = 'normal', programRequests = 0, programBatch = 0;
  const programHeaders = [];
  let planMode = 'normal', planRequests = 0;
  const planHeaders = [];
  try {
    await db.query('SET default_transaction_read_only=on');
    const { Module } = dep('@nestjs/common'), { NestFactory, Reflector } = dep('@nestjs/core');
    const { ConfigService } = dep('@nestjs/config');
    const { RundCatalogosController, RundNombreHistoricoController, RundPlanesHistoricosController, RundCatalogosGuard, RundCatalogosService } = compiled('integracion-rund/rund-catalogos.module');
    const { JwtAuthGuard } = compiled('auth/jwt-auth.guard');
    class FixtureModule {}
    Module({ controllers: [RundCatalogosController, RundNombreHistoricoController, RundPlanesHistoricosController], providers: [RundCatalogosGuard,
      { provide: RundCatalogosService, useValue: new RundCatalogosService({ query: async (sql, values) => (await db.query(sql, values)).rows }) },
      { provide: ConfigService, useValue: { get: key => key === 'INTERNAL_SERVICE_TOKEN' ? token : undefined } },
    ] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
    app.use((req, res, next) => {
      if (req.path === '/internal/rund/v1/planes/historial-firme') {
        planRequests++;
        planHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
          tokenMatches: req.headers['x-internal-service-token'] === token });
        if (planMode !== 'normal') {
          res.status(planMode === 'missing' ? 404 : planMode === 'partial' ? 200 : 503).json({ items: [], total: 0 }); return;
        }
      }
      if (req.path === '/internal/rund/v1/catalogos/programas-historicos') {
        programRequests++; programBatch++;
        programHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
          tokenMatches: req.headers['x-internal-service-token'] === token });
        if (programMode !== 'normal' && !(programMode === 'fail-second' && programBatch !== 2)) {
          res.status(programMode === 'missing' ? 404 : programMode === 'partial' ? 200 : 503).json({ items: [], total: 0 }); return;
        }
      }
      if (req.path === '/internal/rund/v1/personas/identidades-historicas') {
        historicalRequests++; historicalBatch++;
        historicalHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
          tokenMatches: req.headers['x-internal-service-token'] === token });
        if (historicalMode !== 'normal' && !(historicalMode === 'fail-second' && historicalBatch !== 2)) {
          res.status(historicalMode === 'missing' ? 404 : historicalMode === 'partial' ? 200 : 503)
            .json({ items: [], total: 0 }); return;
        }
      }
      if (req.path.endsWith('/nombre-historico') && nombreMode !== 'normal') {
        res.status(nombreMode === 'unavailable' ? 503 : nombreMode === 'missing' ? 404 : 200)
          .json({ items: [], total: 1 }); return;
      }
      if (req.path === '/internal/rund/v1/catalogos/periodo-activo') {
        periodRequests++;
        if (periodMode !== 'normal') {
          const status = periodMode === 'unavailable' ? 503 : periodMode === 'missing' ? 404 : 200;
          res.status(status).json(periodMode === 'wrong-state'
            ? { items: [{ codigo: '2026-2', estado: 'concertacion' }], total: 1 } : { items: [], total: 1 }); return;
        }
      }
      if (mode === 'normal') { next(); return; }
      res.status(mode === 'unavailable' ? 503 : 200).json({ items: [], total: 1 });
    });
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    await app.listen(0, '127.0.0.1'); const url = await app.getUrl();
    return {
      url, close: async () => { await app.close(); await db.end(); },
      setPeriodMode: value => { periodMode = value; },
      setNombreMode: value => { nombreMode = value; },
      setHistoricalMode: value => { historicalMode = value; historicalBatch = 0; },
      historicalRequestCount: () => historicalRequests,
      historicalRequestHeaders: () => [...historicalHeaders],
      setProgramMode: value => { programMode = value; programBatch = 0; },
      programRequestCount: () => programRequests,
      programRequestHeaders: () => [...programHeaders],
      setPlanMode: value => { planMode = value; },
      planRequestCount: () => planRequests,
      planRequestHeaders: () => [...planHeaders],
      periodRequestCount: () => periodRequests,
      verify: async (check, { database, internal, docenteId, authUrl, authFixture }) => {
        const get = async (base, recurso, headers = { 'x-internal-service-token': token }, status = 200) => {
          const res = await fetch(base + '/internal/rund/v1/catalogos/' + recurso, { headers });
          assert.equal(res.status, status, await res.clone().text());
          const body = await res.json(); return { res, data: 'data' in body ? body.data : body };
        };
        await check('Catálogos: Auth y PTA exigen token interno incluso con JWT de usuario', async () => {
          for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) {
            await get(authUrl, 'seccionales', headers, 401);
            await get(url, 'territoriales', headers, 401);
          }
        });
        await check('Catálogos: DTO mínimo completo, sin caché ni conversión de IDs en APIs propietarias de solo lectura', async () => {
          for (const [base, recurso, sql] of [[authUrl, 'seccionales', 'SELECT id_seccional::text AS id,nom_seccional AS nombre FROM auth.seccionales ORDER BY id_seccional'],
            [url, 'territoriales', 'SELECT codigo,nombre FROM academic_work_plan.direccion_territorial ORDER BY codigo']]) {
            const { res, data } = await get(base, recurso);
            assert.equal(res.headers.get('cache-control'), 'private, no-store');
            const items = (await database.query(sql)).rows;
            assert.deepEqual(data, { items, total: items.length });
          }
          assert.equal((await db.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on');
        });
        const ids = Array.from({ length: 3 }, () => 'DOC-CATALOGO-API-' + randomUUID());
        const authIds = ['9007199254740993', '9007199254740994'];
        const codigo = '001';
        try {
          await database.query(`INSERT INTO academic_work_plan.direccion_territorial (codigo,nombre,activo,deleted_at)
            VALUES ($1,'TERRITORIAL PTA HISTORICA',false,now())`, [codigo]);
          for (const id of authIds) await database.query(`INSERT INTO auth.seccionales (id_seccional,nom_seccional,cod_seccional)
            VALUES ($1,'SECCIONALES AUTH HOMONIMAS','001')`, [id]);
          for (let i = 0; i < ids.length; i++) {
            await database.query(`INSERT INTO rund."Docente"
              SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d) || jsonb_build_object(
                'id',$1::text,'periodoCarga',$2::text,'idRund',$1::text,'territorialId',$3::text,
                'sedeId',$4::text,'updatedAt','2030-01-01T00:00:00'))).*
              FROM rund."Docente" d WHERE id=$5`, [ids[i], '2098-' + (i + 1), i ? authIds[i - 1] : codigo, i === 2 ? 'CETAP-FICTICIO' : null, docenteId]);
          }
          const person = (await database.query(`SELECT p.num_identificacion AS documento FROM auth.personas p
            JOIN rund."Docente" d ON d."personaId"=p.id_person WHERE d.id=$1`, [docenteId])).rows[0];
          // El perfil de código PTA es el más reciente, con orden inequívoco para esta prueba.
          await database.query(`UPDATE rund."Docente" SET "updatedAt"='2031-01-01' WHERE id=$1`, [ids[0]]);
          await check('Catálogos: perfil conserva código PTA con ceros e histórico inactivo, sin sustituir ID Auth', async () => {
            const profile = (await internal('docentes/por-documento/' + person.documento)).data;
            assert.equal(profile.idDocente, ids[0]); assert.equal(profile.territorialCodigo, codigo);
            assert.equal(profile.territorialNombre, 'TERRITORIAL PTA HISTORICA');
            const expected = (await database.query(`SELECT dt.nombre FROM rund."Docente" d
              LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.codigo=d."territorialId" WHERE d.id=$1`, [ids[0]])).rows[0].nombre;
            assert.equal(profile.territorialNombre, expected);
          });
          await check('Catálogos: cobertura conserva JOIN histórico por ID Auth, bigint, homónimos y conteos CETAP', async () => {
            const actual = (await internal('estadisticas/backoffice')).data.coberturaTerritorial;
            const expected = (await database.query(`SELECT s.nom_seccional AS territorial,COUNT(d.id)::int AS total,
              COUNT(CASE WHEN d."sedeId" IS NULL THEN 1 END)::int AS sin_cetap,
              COUNT(CASE WHEN d."sedeId" IS NOT NULL THEN 1 END)::int AS con_cetap
              FROM rund."Docente" d JOIN auth.seccionales s ON d."territorialId"=s.id_seccional::text
              GROUP BY s.nom_seccional ORDER BY total DESC`)).rows;
            const sort = rows => [...rows].sort((a, b) => a.territorial.localeCompare(b.territorial));
            assert.deepEqual(sort(actual), sort(expected));
            assert.deepEqual(actual.find(row => row.territorial === 'SECCIONALES AUTH HOMONIMAS'),
              { territorial: 'SECCIONALES AUTH HOMONIMAS', total: 2, sin_cetap: 1, con_cetap: 1 });
          });
          const snapshot = async () => (await database.query('SELECT to_jsonb(d) AS row FROM rund."Docente" d ORDER BY id')).rows;
          await check('Catálogos: fallo o respuesta parcial de PTA produce 503 sin recurrir al JOIN disponible', async () => {
            const before = await snapshot();
            try { for (mode of ['unavailable', 'partial']) await internal('docentes/por-documento/' + person.documento, { status: 503 }); }
            finally { mode = 'normal'; }
            assert.deepEqual(await snapshot(), before);
          });
          await check('Catálogos: fallo o respuesta parcial de Auth no publica cobertura vacía ni usa sus tablas desde RUND', async () => {
            const before = await snapshot();
            try {
              for (const failure of ['unavailable', 'partial']) {
                authFixture.setCatalogMode(failure);
                await internal('estadisticas/backoffice', { status: 503 });
              }
            } finally { authFixture.setCatalogMode('normal'); }
            assert.deepEqual(await snapshot(), before);
          });
          await check('Catálogos: código desconocido mantiene null y la recuperación restaura el nombre confirmado', async () => {
            await database.query(`UPDATE rund."Docente" SET "territorialId"='NO-EXISTE' WHERE id=$1`, [ids[0]]);
            assert.equal((await internal('docentes/por-documento/' + person.documento)).data.territorialNombre, null);
            await database.query(`UPDATE rund."Docente" SET "territorialId"=$2 WHERE id=$1`, [ids[0], codigo]);
            assert.equal((await internal('docentes/por-documento/' + person.documento)).data.territorialNombre, 'TERRITORIAL PTA HISTORICA');
          });
        } finally {
          mode = 'normal'; authFixture.setCatalogMode('normal');
          await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])', [ids]);
          await database.query('DELETE FROM auth.seccionales WHERE id_seccional=ANY($1::bigint[])', [authIds]);
          await database.query('DELETE FROM academic_work_plan.direccion_territorial WHERE codigo=$1', [codigo]);
        }
      },
    };
  } catch (error) { if (app) await app.close(); await db.end(); throw error; }
};
