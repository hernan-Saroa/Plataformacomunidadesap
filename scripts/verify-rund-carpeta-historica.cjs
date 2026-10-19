/* Carpeta histórica de PTA (API interna) + cliente y protección de originales de Auth, con PostgreSQL real
 * en un cluster temporal y datos ficticios. No lee .env ni se conecta a una base existente.
 * Requiere npm run build en backend/academic-work-plan-service y backend/auth-service.
 * Se ejecuta dos veces el esquema: docente_id uuid (instalación sin migración 336) y text (con ella).
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const pta = path.join(root, 'backend/academic-work-plan-service');
const auth = path.join(root, 'backend/auth-service');
const dep = (base, name) => require(path.join(base, 'node_modules', name));
require(path.join(pta, 'node_modules/reflect-metadata'));
const { Client } = dep(pta, 'pg');
const { DataSource } = dep(pta, 'typeorm');
const { Test } = dep(pta, '@nestjs/testing');
const { ConfigService } = dep(pta, '@nestjs/config');
const express = dep(auth, 'express');
const request = dep(auth, 'supertest');
const { JwtService } = dep(auth, '@nestjs/jwt');
const { RundCarpetaHistoricoController, RundCarpetaHistoricoService } = require(path.join(pta, 'dist/integracion-rund/rund-carpeta-historico.module.js'));
const { RundCatalogosGuard } = require(path.join(pta, 'dist/integracion-rund/rund-catalogos.module.js'));
const { PtaHistoricoClient } = require(path.join(auth, 'dist/carpeta-digital/pta-historico.client.js'));
const { rundFolderStaticAccess, RUND_ORIGINAL_ENDPOINTS, rundOriginalResourceId } = require(path.join(auth, 'dist/carpeta-digital/rund-document-access.js'));

const pgBin = process.env.PG_BIN_DIR || ['C:/Program Files/PostgreSQL/18/bin', 'C:/Program Files/PostgreSQL/15/bin'].find(dir => fs.existsSync(dir));
const bin = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const token = 'token-ficticio-' + randomUUID();
const checks = [];
const check = async (name, run) => { await run(); checks.push(name); console.log('OK  ' + name); };
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const run = (exe, args) => { const r = spawnSync(bin(exe), args, { stdio: 'ignore', windowsHide: true }); assert.equal(r.status, 0, `${exe} falló`); };

async function verify(soporteType) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rund-hist-'));
  const port = await freePort();
  run('initdb', ['-D', dir, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
  run('pg_ctl', ['-D', dir, '-o', `-p ${port} -c listen_addresses=127.0.0.1`, '-l', path.join(dir, 'log.txt'), '-w', 'start']);
  const db = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
  let app, dataSource;
  try {
    await db.connect();
    await db.query(`CREATE SCHEMA academic_work_plan;
      CREATE TABLE academic_work_plan."Docente" (id text PRIMARY KEY, "personaId" uuid NOT NULL, "periodoCarga" text, estado text NOT NULL DEFAULT 'ACTIVO');
      CREATE TABLE academic_work_plan."RundSoporteCampo" (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), docente_id ${soporteType}, bloque text, tipo_soporte text,
        documento_carpeta_id text, nombre_archivo text, estado varchar(50) NOT NULL DEFAULT 'Pendiente', cargado_por varchar(255), observacion text,
        fecha_vencimiento timestamp, "createdAt" timestamp NOT NULL DEFAULT now());
      CREATE TABLE academic_work_plan."RundAccesoDatosLog" (id uuid PRIMARY KEY, actor_id text NOT NULL, roles text[] NOT NULL, endpoint text NOT NULL,
        recurso_id text, docentes text[] NOT NULL DEFAULT '{}', campos text[] NOT NULL,
        resultado text NOT NULL CHECK (resultado IN ('COMPLETO','ENMASCARADO','DENEGADO')), ip text, "createdAt" timestamptz NOT NULL DEFAULT clock_timestamp());
      CREATE FUNCTION academic_work_plan.immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'inmutable'; END $$;
      CREATE TRIGGER trg_immutable BEFORE UPDATE OR DELETE ON academic_work_plan."RundAccesoDatosLog" FOR EACH ROW EXECUTE FUNCTION academic_work_plan.immutable();`);

    const personaA = randomUUID(), personaB = randomUUID(), personaC = randomUUID();
    const docA1 = randomUUID(), docA2 = randomUUID(), docB = randomUUID();
    await db.query(`INSERT INTO academic_work_plan."Docente"(id,"personaId","periodoCarga",estado) VALUES ($1,$2,'2025-1','ACTIVO'),($3,$2,'2026-1','INACTIVO'),($4,$5,NULL,'ACTIVO')`,
      [docA1, personaA, docA2, docB, personaB]);
    const sop = { conArchivo: randomUUID(), conEnlace: randomUUID(), vacio: randomUUID(), otra: randomUUID() };
    await db.query(`INSERT INTO academic_work_plan."RundSoporteCampo"(id,docente_id,bloque,tipo_soporte,documento_carpeta_id,nombre_archivo,estado) VALUES
      ($1,$5,'B1','CEDULA',NULL,'cedula.pdf','Aprobado'),
      ($2,$6,'B2','TITULO','/auth/api/v1/uploads/carpeta-digital/a/historico.pdf',NULL,'Pendiente'),
      ($3,$5,'B3','VACIO','  ','  ','Pendiente'),
      ($4,$7,'B1','CEDULA',NULL,'otra.pdf','Aprobado')`, [sop.conArchivo, sop.conEnlace, sop.vacio, sop.otra, docA1, docA2, docB]);

    dataSource = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'postgres', database: 'postgres' });
    await dataSource.initialize();
    const moduleRef = await Test.createTestingModule({
      controllers: [RundCarpetaHistoricoController],
      providers: [RundCatalogosGuard, RundCarpetaHistoricoService, { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: { get: key => (key === 'INTERNAL_SERVICE_TOKEN' ? token : undefined) } }],
    }).compile();
    app = moduleRef.createNestApplication(); await app.init(); await app.listen(0, '127.0.0.1');
    const base = (await app.getUrl()).replace('[::1]', '127.0.0.1').replace('localhost', '127.0.0.1');
    Object.assign(process.env, { INTERNAL_SERVICE_TOKEN: token, ACADEMIC_WORK_PLAN_SERVICE_URL: base, PTA_HISTORICO_API_ENABLED: 'true' });
    const client = new PtaHistoricoClient();
    const tag = `[docente_id ${soporteType}] `;
    const http = (method, route, body, headers = { 'x-internal-service-token': token }) =>
      fetch(base + '/internal/rund/v1/carpeta-historica/' + route, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const snapshot = async () => JSON.stringify([(await db.query('SELECT * FROM academic_work_plan."Docente" ORDER BY id')).rows,
      (await db.query('SELECT * FROM academic_work_plan."RundSoporteCampo" ORDER BY id')).rows]);

    await check(tag + 'sin token o con token incorrecto la API rechaza con 401 y sin cuerpo útil', async () => {
      for (const headers of [{}, { 'x-internal-service-token': 'incorrecto' }, { authorization: 'Bearer jwt' }]) {
        assert.equal((await http('POST', 'soportes', { personaIds: [personaA] }, headers)).status, 401);
        assert.equal((await http('GET', 'perfiles/' + personaA, undefined, headers)).status, 401);
      }
    });

    await check(tag + 'soportes por lote: solo los que tienen archivo o enlace, con persona y período, sin cambiar datos', async () => {
      const before = await snapshot();
      const rows = await client.soportesPorPersonas([personaA, personaB, personaC]);
      assert.deepEqual(rows.map(r => r.id).sort(), [sop.conArchivo, sop.conEnlace, sop.otra].sort());
      const porId = Object.fromEntries(rows.map(r => [r.id, r]));
      assert.equal(porId[sop.conArchivo].persona_id, personaA); assert.equal(porId[sop.conArchivo].periodo_carga, '2025-1');
      assert.equal(porId[sop.conEnlace].periodo_carga, '2026-1'); assert.equal(porId[sop.otra].persona_id, personaB);
      assert.equal(porId[sop.otra].periodo_carga, null);
      assert(!rows.some(r => r.id === sop.vacio));
      assert.deepEqual(await client.soportesPorPersonas([personaC]), []);
      assert.equal(await snapshot(), before);
    });

    await check(tag + 'más de 500 personas se reparten en lotes y se agregan sin perder filas', async () => {
      const extra = Array.from({ length: 520 }, () => randomUUID());
      const all = await client.soportesPorPersonas([personaA, personaB, ...extra]);
      assert.equal(all.length, 3);
    });

    await check(tag + 'perfiles: orden por período descendente con nulos al final y alcance de una sola persona', async () => {
      const a = await client.perfilesPorPersona(personaA);
      assert.deepEqual(a.map(p => p.id), [docA2, docA1]); assert.equal(a[0].estado, 'INACTIVO');
      assert.deepEqual((await client.perfilesPorPersona(personaB)).map(p => p.periodo_carga), [null]);
      assert.deepEqual(await client.perfilesPorPersona(personaC), []);
    });

    await check(tag + 'más de 200 perfiles se rechaza en lugar de truncarse en silencio', async () => {
      const heavy = randomUUID();
      await db.query(`INSERT INTO academic_work_plan."Docente"(id,"personaId","periodoCarga") SELECT gen_random_uuid()::text,$1,'P'||g FROM generate_series(1,201) g`, [heavy]);
      await assert.rejects(client.perfilesPorPersona(heavy), error => error.getStatus() === 503);
    });

    await check(tag + 'persona de un soporte: la devuelve y distingue la ausencia confirmada de un fallo', async () => {
      assert.equal(await client.personaDeSoporte(sop.conArchivo), personaA);
      assert.equal(await client.personaDeSoporte(randomUUID()), null);
      assert.equal((await http('GET', 'soportes/no-es-uuid/persona')).status, 400);
    });

    await check(tag + 'original histórico: por soporte enlazado (sin distinguir mayúsculas) y por marca permanente', async () => {
      assert.equal(await client.esOriginalHistorico('/AUTH/api/v1/uploads/carpeta-digital/a/HISTORICO.pdf', 'r1', RUND_ORIGINAL_ENDPOINTS), true);
      assert.equal(await client.esOriginalHistorico('/auth/api/v1/uploads/carpeta-digital/a/general.pdf', 'r2', RUND_ORIGINAL_ENDPOINTS), false);
      await client.registrarAcceso({ actorId: 'ggp', roles: ['GESTION_PROFESORAL'], endpoint: 'CARPETA_DIGITAL_RETIRAR_RUND', recursoId: 'r2', campos: ['DOCUMENTO_IDENTIDAD'], resultado: 'COMPLETO' });
      assert.equal(await client.esOriginalHistorico('/auth/api/v1/uploads/carpeta-digital/a/general.pdf', 'r2', RUND_ORIGINAL_ENDPOINTS), true);
      assert.equal(await client.esOriginalHistorico('/x', 'r2', ['OTRO_ENDPOINT']), false);
    });

    await check(tag + 'bitácora: registra una fila inmutable por acceso, valida el cuerpo y no admite campos ajenos', async () => {
      const before = Number((await db.query('SELECT count(*) FROM academic_work_plan."RundAccesoDatosLog"')).rows[0].count);
      const acceso = { actorId: 'docente-1', roles: ['DOCENTE'], endpoint: 'CARPETA_DIGITAL_ORIGINAL_RUND', recursoId: 'r3', campos: ['PUNTAJE_SALARIAL'], resultado: 'DENEGADO' };
      await client.registrarAcceso(acceso);
      const rows = (await db.query(`SELECT * FROM academic_work_plan."RundAccesoDatosLog" WHERE recurso_id='r3'`)).rows;
      assert.equal(rows.length, 1); assert.equal(rows[0].resultado, 'DENEGADO'); assert.deepEqual(rows[0].roles, ['DOCENTE']);
      assert.equal(Number((await db.query('SELECT count(*) FROM academic_work_plan."RundAccesoDatosLog"')).rows[0].count), before + 1);
      await assert.rejects(db.query(`DELETE FROM academic_work_plan."RundAccesoDatosLog"`), /inmutable/);
      for (const mala of [{ ...acceso, resultado: 'OTRO' }, { ...acceso, extra: 1 }, { ...acceso, actorId: '' }, { ...acceso, roles: 'DOCENTE' }]) {
        assert.equal((await http('POST', 'accesos', mala)).status, 400);
      }
      assert.equal(Number((await db.query('SELECT count(*) FROM academic_work_plan."RundAccesoDatosLog"')).rows[0].count), before + 1);
    });

    await check(tag + 'las respuestas no se cachean y la consulta inválida se rechaza antes de tocar la base', async () => {
      assert.equal((await http('POST', 'soportes', { personaIds: [personaA] })).headers.get('cache-control'), 'private, no-store');
      for (const body of [{}, { personaIds: [] }, { personaIds: ['x'] }, { personaIds: [personaA], otro: 1 }]) assert.equal((await http('POST', 'soportes', body)).status, 400);
    });

    await check(tag + 'protección de originales de Auth con PTA real: histórico protegido, general libre, caída = 503', async () => {
      const jwt = new JwtService({ secret: 'secreto-ficticio' });
      const server = express();
      server.use(rundFolderStaticAccess({ query: async () => [] }, jwt, undefined, client));
      server.get('/uploads/{*path}', (_req, res) => res.send('ARCHIVO'));
      const protegido = '/uploads/carpeta-digital/a/historico.pdf', libre = '/uploads/carpeta-digital/a/otro-general.pdf';
      await request(server).get(protegido).expect(401);
      await request(server).get(protegido).set('Authorization', 'Bearer ' + jwt.sign({ sub: 'u', roles: ['DOCENTE'] })).expect(403);
      await request(server).get(protegido).set('Authorization', 'Bearer ' + jwt.sign({ sub: 'g', roles: ['GESTION_PROFESORAL'] })).expect(200, 'ARCHIVO');
      await request(server).get(libre).expect(200, 'ARCHIVO');
      const logged = (await db.query(`SELECT resultado FROM academic_work_plan."RundAccesoDatosLog" WHERE endpoint='CARPETA_DIGITAL_ORIGINAL_RUND' AND recurso_id=$1 ORDER BY "createdAt"`,
        [rundOriginalResourceId('/auth/api/v1' + protegido)])).rows.map(r => r.resultado);
      assert.deepEqual(logged, ['DENEGADO', 'DENEGADO', 'COMPLETO']);
      await app.close(); app = undefined;
      await request(server).get(protegido).expect(503); await request(server).get(libre).expect(503);
    });
  } finally {
    if (app) await app.close().catch(() => undefined);
    if (dataSource?.isInitialized) await dataSource.destroy().catch(() => undefined);
    await db.end().catch(() => undefined);
    spawnSync(bin('pg_ctl'), ['-D', dir, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  for (const type of ['uuid', 'text']) await verify(type);
  console.log(`\n${checks.length} comprobaciones correctas`);
})().catch(error => { console.error(error); process.exit(1); });
