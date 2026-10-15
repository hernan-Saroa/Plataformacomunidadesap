/* Invocado únicamente por la integración con PostgreSQL temporal.
 * No admite bases existentes, no lee .env ni ejecuta migraciones operativas.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const ptaRoot = path.join(root, 'backend/academic-work-plan-service');
const dependency = name => require(require.resolve(name, { paths: [ptaRoot] }));

module.exports = async function verifyConsumerCopies(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration');
  assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { Client } = dependency('pg'), { DataSource } = dependency('typeorm');
  const { RundDocentesClient } = require(path.join(ptaRoot, 'dist/integracion-rund/rund-docentes.client.js'));
  const { RundSyncService } = require(path.join(ptaRoot, 'dist/integracion-rund/rund-sync.service.js'));
  const admin = new Client(pgConfig);
  await admin.connect();
  try { await admin.query('CREATE DATABASE pta_rund_contract'); } finally { await admin.end(); }
  const db = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port,
    username: pgConfig.user, password: pgConfig.password, database: 'pta_rund_contract', entities: [], synchronize: false });
  const originalEnv = Object.fromEntries(['RUND_SERVICE_URL', 'INTERNAL_SERVICE_TOKEN'].map(key => [key, process.env[key]]));
  let fixture;
  try {
    await db.initialize();
    await db.query(`CREATE SCHEMA academic_work_plan;
      CREATE TABLE academic_work_plan."Docente" (id text PRIMARY KEY, "personaId" uuid NOT NULL,
        "periodoCarga" text, "horasAsignables" integer NOT NULL, "situacionAdministrativa" text,
        CONSTRAINT "Docente_personaId_periodoCarga_key" UNIQUE ("personaId", "periodoCarga"))`);
    await db.query(`INSERT INTO academic_work_plan."Docente" VALUES ('LOCAL-HISTORICO',$1,'2026-2',111,'ESTADO FICTICIO')`, [context.personaId]);
    await db.query(`CREATE TABLE academic_work_plan.plan_contrato_ficticio
      (id text PRIMARY KEY, docente_id text NOT NULL REFERENCES academic_work_plan."Docente"(id));
      INSERT INTO academic_work_plan.plan_contrato_ficticio VALUES ('PLAN-FICTICIO','LOCAL-HISTORICO')`);
    const snapshot = () => db.query('SELECT * FROM academic_work_plan."Docente" ORDER BY id');
    Object.assign(process.env, { RUND_SERVICE_URL: context.rundUrl, INTERNAL_SERVICE_TOKEN: context.serviceToken });
    const client = new RundDocentesClient();
    const source = await client.resolver(context.personaId, '2026-2');
    assert.equal(source.id, context.docenteId);
    await check('PTA copia: sincronización HTTP/SQL real conserva el ID local y sus referencias al actualizar el perfil', async () => {
      const id = await new RundSyncService(db, client).sincronizarDocente(context.personaId, '2026-2');
      assert.equal(id, 'LOCAL-HISTORICO');
      const rows = await snapshot();
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, 'LOCAL-HISTORICO');
      assert.equal(rows[0].personaId, context.personaId);
      assert.equal(rows[0].horasAsignables, Number(source.horasAsignables));
      assert.equal(rows[0].situacionAdministrativa, source.situacionAdministrativa);
      assert.deepEqual(await db.query('SELECT * FROM academic_work_plan.plan_contrato_ficticio'),
        [{ id: 'PLAN-FICTICIO', docente_id: 'LOCAL-HISTORICO' }]);
      assert.deepEqual(await client.resolver(context.personaId, '2026-2'), source);
    });
    let body;
    fixture = http.createServer((req, res) => {
      if (req.headers['x-internal-service-token'] !== context.serviceToken) {
        res.writeHead(401); res.end(); return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: body }));
    });
    await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
    process.env.RUND_SERVICE_URL = `http://127.0.0.1:${fixture.address().port}`;
    await check('PTA copia: una respuesta HTTP parcial no convierte las columnas históricas en NULL', async () => {
      const before = await snapshot();
      body = { id: source.id, personaId: source.personaId, periodoCarga: source.periodoCarga };
      await assert.rejects(new RundSyncService(db, client).sincronizarDocente(context.personaId, '2026-2'), { status: 503 });
      assert.deepEqual(await snapshot(), before);
    });
    await check('PTA copia: un período ajeno y una página incompleta no alteran la copia ni simulan éxito vacío', async () => {
      const before = await snapshot();
      body = { ...source, periodoCarga: 'PERIODO-AJENO' };
      await assert.rejects(new RundSyncService(db, client).sincronizarDocente(context.personaId, '2026-2'), { status: 503 });
      body = { items: [] };
      await assert.rejects(new RundSyncService(db, client).sincronizarTodo(), { status: 503 });
      assert.deepEqual(await snapshot(), before);
    });
    await check('PTA copia: columnas nulas explícitas siguen actualizándose sin perder el ID local', async () => {
      body = { ...source, situacionAdministrativa: null };
      assert.equal(await new RundSyncService(db, client).sincronizarDocente(context.personaId, '2026-2'), 'LOCAL-HISTORICO');
      const [row] = await snapshot();
      assert.equal(row.situacionAdministrativa, null);
      assert.equal(row.horasAsignables, Number(source.horasAsignables));
    });
  } finally {
    if (fixture?.listening) await new Promise((resolve, reject) => fixture.close(error => error ? reject(error) : resolve()));
    if (db.isInitialized) await db.destroy();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
};
