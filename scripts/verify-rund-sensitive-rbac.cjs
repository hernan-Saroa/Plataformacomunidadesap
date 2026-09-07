/* Pruebas con PostgreSQL real en una base temporal vacía. No copia ni cambia perfiles de esap_db. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const serviceRoot = path.resolve(__dirname, '../backend/academic-work-plan-service');
const dotenv = require(path.join(serviceRoot, 'node_modules/dotenv'));
const env = dotenv.parse(fs.readFileSync(path.join(serviceRoot, '.env')));
if (!['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)) throw new Error('Esta prueba solo admite PostgreSQL local.');
const config = { host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER, password: env.DB_PASS,
  database: env.DB_NAME, connectionTimeoutMillis: 5000 };
const tempDb = `codex_rund_rbac_${Date.now()}`;
const results = [];
const admin = new Client(config);
let db;
let created = false;
async function test(name, run) { await run(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }

(async () => {
  try {
    await admin.connect();
    assert.match(tempDb, /^codex_rund_rbac_\d+$/);
    await admin.query(`CREATE DATABASE "${tempDb}"`);
    created = true;
    db = new Client({ ...config, database: tempDb });
    await db.connect();
    await db.query('CREATE SCHEMA academic_work_plan; CREATE TABLE academic_work_plan."BancoDocentesInvitaciones" (id UUID PRIMARY KEY)');
    const migration = fs.readFileSync(path.resolve(__dirname, '../db/migrations/428_complete_rund_sensitive_access.sql'), 'utf8');
    const { recordRundAccess } = require(path.join(serviceRoot, 'dist/pta/banco-docentes/rund-access-audit'));
    const adapter = { query: db.query.bind(db) };
    const entry = { actorId: 'test-actor', roles: ['ADMIN'], endpoint: 'TEST_PERFIL', resourceId: 'test-resource',
      docenteIds: ['test-docente'], fields: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'], fullAccess: false };
    await test('migración idempotente y columnas de sesión', async () => {
      await db.query(migration); await db.query(migration);
      const columns = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='academic_work_plan' AND table_name='BancoDocentesInvitaciones'");
      assert(columns.rows.some((r) => r.column_name === 'sesion_token_hash'));
      assert(columns.rows.some((r) => r.column_name === 'sesion_expira_en'));
    });
    await test('auditoría persistida con actor, campos, fecha y hora sin valores originales', async () => {
      await recordRundAccess(adapter, entry);
      const { rows } = await db.query('SELECT * FROM academic_work_plan."RundAccesoDatosLog"');
      assert.equal(rows.length, 1); assert.equal(rows[0].actor_id, 'test-actor');
      assert.deepEqual(rows[0].campos, entry.fields); assert.equal(rows[0].resultado, 'ENMASCARADO');
      assert(rows[0].createdAt instanceof Date);
      assert(!JSON.stringify(rows).includes('1020304050')); assert(!JSON.stringify(rows).includes('145.5'));
    });
    for (const operation of ['UPDATE', 'DELETE', 'TRUNCATE']) {
      await test(`bitácora rechaza ${operation}`, async () => {
        const sql = operation === 'UPDATE' ? 'UPDATE academic_work_plan."RundAccesoDatosLog" SET actor_id=\'cambio\''
          : operation === 'DELETE' ? 'DELETE FROM academic_work_plan."RundAccesoDatosLog"' : 'TRUNCATE academic_work_plan."RundAccesoDatosLog"';
        await assert.rejects(db.query(sql), /inmutables/);
        assert.equal((await db.query('SELECT count(*)::int AS total FROM academic_work_plan."RundAccesoDatosLog"')).rows[0].total, 1);
      });
    }
    await test('fallo de auditoría revierte una modificación en la misma transacción', async () => {
      await db.query('CREATE TABLE test_profile (value TEXT); INSERT INTO test_profile VALUES (\'original\')');
      await db.query(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.actor_id = 'FAIL' THEN RAISE EXCEPTION 'fallo simulado'; END IF; RETURN NEW; END; $$;
        CREATE TRIGGER fail_test_audit BEFORE INSERT ON academic_work_plan."RundAccesoDatosLog"
        FOR EACH ROW EXECUTE FUNCTION fail_test_audit()`);
      await db.query('BEGIN');
      try {
        await db.query("UPDATE test_profile SET value='cambiado'");
        await assert.rejects(recordRundAccess(adapter, { ...entry, actorId: 'FAIL' }), /No fue posible registrar/);
      } finally { await db.query('ROLLBACK'); }
      assert.equal((await db.query('SELECT value FROM test_profile')).rows[0].value, 'original');
    });
    await test('descarga HTTP con JWT real: denegada a docente, completa a GGP y ambas auditadas', async () => {
      const express = require(path.join(serviceRoot, 'node_modules/express'));
      const request = require(path.join(serviceRoot, 'node_modules/supertest'));
      const { JwtService } = require(path.join(serviceRoot, 'node_modules/@nestjs/jwt'));
      const { rundStaticAccess } = require(path.join(serviceRoot, 'dist/pta/banco-docentes/rund-static-access'));
      const jwt = new JwtService({ secret: 'isolated-integration-test-secret' });
      const app = express();
      app.use(rundStaticAccess(adapter, jwt));
      app.get('/uploads/{*file}', (_req, res) => res.type('text').send('contenido-original-ficticio'));
      for (const [role, status] of [['DOCENTE', 403], ['GESTION_PROFESORAL', 200]]) {
        await request(app).get('/uploads/rund-documentos/test.pdf')
          .set('Cookie', `esap_access_token=${jwt.sign({ sub: 'http-test-actor', roles: [role] })}`).expect(status);
      }
      const { rows } = await db.query('SELECT resultado FROM academic_work_plan."RundAccesoDatosLog" WHERE actor_id=$1 ORDER BY "createdAt"', ['http-test-actor']);
      assert.deepEqual(rows.map((r) => r.resultado), ['DENEGADO', 'COMPLETO']);
    });
    await test('URL histórica de Carpeta Digital sigue protegida después de retirar el registro documental', async () => {
      await db.query(`CREATE SCHEMA auth; CREATE TABLE auth.documento_carpeta_digital
        (id_documento UUID, url_archivo TEXT, rund_soporte_id UUID, categoria TEXT);
        CREATE TABLE academic_work_plan."RundSoporteCampo" (id UUID, documento_carpeta_id TEXT);
        INSERT INTO auth.documento_carpeta_digital VALUES
        ('11111111-1111-4111-8111-111111111111','/auth/api/v1/uploads/carpeta-digital/test/original.pdf',NULL,'rund')`);
      const express = require(path.join(serviceRoot, 'node_modules/express'));
      const request = require(path.join(serviceRoot, 'node_modules/supertest'));
      const { JwtService } = require(path.join(serviceRoot, 'node_modules/@nestjs/jwt'));
      const { rundFolderStaticAccess } = require(path.resolve(__dirname, '../backend/auth-service/dist/carpeta-digital/rund-document-access'));
      const app = express();
      app.use(rundFolderStaticAccess({ query: async (sql, params) => (await db.query(sql, params)).rows }, new JwtService({ secret: 'isolated-test-secret' })));
      app.get('/uploads/{*path}', (_req, res) => res.send('original sensible ficticio'));
      await request(app).get('/uploads/carpeta-digital/test/original.pdf').expect(401);
      await db.query('DELETE FROM auth.documento_carpeta_digital');
      await request(app).get('/uploads/carpeta-digital/test/original.pdf').expect(401);
      await request(app).get('/uploads/carpeta-digital/test/general.pdf').expect(200, 'original sensible ficticio');
    });
    const report = { executedAt: new Date().toISOString(), database: 'PostgreSQL local, base temporal vacía',
      businessDataModified: false, results };
    fs.writeFileSync(path.resolve(__dirname, '../docs/rund/validacion-rbac-integracion.json'), JSON.stringify(report, null, 2) + '\n');
  } finally {
    if (db) await db.end();
    if (created) {
      assert.match(tempDb, /^codex_rund_rbac_\d+$/);
      // Solo se elimina la base que esta ejecución acaba de crear y cuyo nombre se validó.
      await admin.query(`DROP DATABASE "${tempDb}"`);
    }
    await admin.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
