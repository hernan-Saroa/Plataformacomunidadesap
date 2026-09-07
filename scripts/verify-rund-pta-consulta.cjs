/* REQ-RUND-F015: HTTP y PostgreSQL real en una base temporal con datos ficticios. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const serviceRoot = path.resolve(__dirname, '../backend/academic-work-plan-service');
const dependency = (name) => require(path.join(serviceRoot, 'node_modules', name));
const env = dependency('dotenv').parse(fs.readFileSync(path.join(serviceRoot, '.env')));
if (!['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)) throw new Error('Esta prueba solo admite PostgreSQL local.');
const config = { host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER, password: env.DB_PASS,
  database: env.DB_NAME, connectionTimeoutMillis: 5000 };
const tempDb = `codex_rund_pta_${randomUUID().replaceAll('-', '')}`;
const admin = new Client(config);
const results = [];
let db;
let app;
let created = false;
async function test(name, run) { await run(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }

(async () => {
  try {
    await admin.connect();
    assert.match(tempDb, /^codex_rund_pta_[a-f0-9]{32}$/);
    await admin.query(`CREATE DATABASE "${tempDb}"`);
    created = true;
    db = new Client({ ...config, database: tempDb });
    await db.connect();
    await db.query(`
      CREATE SCHEMA auth;
      CREATE SCHEMA academic_work_plan;
      CREATE TABLE auth.personas (id_person UUID PRIMARY KEY, num_identificacion TEXT,
        nom_largo TEXT, nom_tercero TEXT, pri_apellido TEXT, seg_apellido TEXT, id_seccional UUID);
      CREATE TABLE auth.seccionales (id_seccional UUID PRIMARY KEY, nom_seccional TEXT, cod_seccional TEXT);
      CREATE TABLE academic_work_plan."Docente" (id UUID PRIMARY KEY, "personaId" UUID,
        "perfilAcademico" TEXT, "perfilAcademicoPro" TEXT, "nivelFormacion" TEXT,
        escalafon TEXT, "territorialId" TEXT, "horasAsignables" INT, estado TEXT,
        "tipoVinculacion" TEXT, "periodoCarga" TEXT, "idRund" TEXT, "updatedAt" TIMESTAMP,
        "puntajeSalarial" FLOAT, salario FLOAT);
      CREATE TABLE academic_work_plan."BancoDocentesInvitaciones" (id UUID PRIMARY KEY);
    `);
    await db.query(fs.readFileSync(path.resolve(__dirname, '../db/migrations/428_complete_rund_sensitive_access.sql'), 'utf8'));
    const persona = randomUUID();
    const territorial = randomUUID();
    const firstDocente = randomUUID();
    const secondDocente = randomUUID();
    const cedula = '001020304050';
    await db.query('INSERT INTO auth.seccionales VALUES ($1,$2,$3)', [territorial, 'Territorial ficticia', '99']);
    await db.query('INSERT INTO auth.personas VALUES ($1,$2,$3,$4,$5,$6,$7)', [persona, ' 001.020.304.050 ', 'DOCENTE FICTICIO', 'DOCENTE', 'FICTICIO', null, territorial]);
    for (const [id, periodo, horas, estado, updated] of [
      [firstDocente, '2026-1', 0, 'RETIRADO', '2026-09-01'],
      [secondDocente, '2026-2', 800, 'ACTIVO', '2026-08-01'],
    ]) {
      await db.query(`INSERT INTO academic_work_plan."Docente"
        (id,"personaId","perfilAcademico","perfilAcademicoPro","nivelFormacion",escalafon,
          "horasAsignables",estado,"tipoVinculacion","periodoCarga","idRund","updatedAt","puntajeSalarial",salario)
        VALUES ($1,$2,'Administración pública','Docencia','MAESTRIA','ASOCIADO',$3,$4,'CARRERA',$5,'RUND-PRUEBA',$6,145.5,9999999)`,
      [id, persona, horas, estado, periodo, updated]);
    }
    const snapshot = (await db.query('SELECT * FROM academic_work_plan."Docente" ORDER BY id')).rows;
    const { Test } = dependency('@nestjs/testing');
    const { PassportModule } = dependency('@nestjs/passport');
    const { JwtService } = dependency('@nestjs/jwt');
    const { DataSource } = dependency('typeorm');
    const request = dependency('supertest');
    const { RundPtaConsultaController } = require(path.join(serviceRoot, 'dist/pta/banco-docentes/rund-pta-consulta.controller'));
    const { RundPtaConsultaService } = require(path.join(serviceRoot, 'dist/pta/banco-docentes/rund-pta-consulta.service'));
    const { JwtStrategy } = require(path.join(serviceRoot, 'dist/auth/jwt.strategy'));
    process.env.JWT_SECRET = randomUUID(); // Secreto solo de este proceso de prueba.
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const actorId = randomUUID();
    const token = jwt.sign({ sub: actorId, roles: ['SUPER_ADMIN'] }, { expiresIn: '5m' });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [RundPtaConsultaController],
      providers: [JwtStrategy, RundPtaConsultaService,
        { provide: DataSource, useValue: { query: async (sql, params) => (await db.query(sql, params)).rows } }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('pta/api/v1');
    await app.init();
    const base = '/pta/api/v1/rund/interoperabilidad/perfiles';
    const get = (suffix) => request(app.getHttpServer()).get(`${base}/${suffix}`).auth(token, { type: 'bearer' });

    await test('200: consulta por cédula con ceros y documento almacenado con puntos; no requiere cuenta de usuario', async () => {
      const { body } = await get(`${cedula}?periodo=2026-2`).expect(200);
      assert.equal(body.data.docente_id, secondDocente);
      assert.equal(body.data.horas_programables, 800);
      assert.equal(body.data.categoria, 'ASOCIADO');
      assert.equal(body.data.perfil.nombre_completo, 'DOCENTE FICTICIO');
      assert.deepEqual(body.data.territorial, { id: territorial, nombre: 'Territorial ficticia', codigo: '99' });
      assert(!JSON.stringify(body).includes('145.5'));
      assert(!JSON.stringify(body).includes('9999999'));
      assert(!JSON.stringify(body).includes(cedula));
    });
    await test('periodo exacto tiene prioridad sobre fecha de actualización; preserva estado y horas', async () => {
      const { body } = await get(`${cedula}?periodo=2026-1`).expect(200);
      assert.equal(body.data.docente_id, firstDocente);
      assert.equal(body.data.horas_programables, 0);
      assert.equal(body.data.estado_vinculacion, 'RETIRADO');
    });
    await test('sin periodo selecciona de forma determinista el registro priorizado más actualizado', async () => {
      const { body } = await get(cedula).expect(200);
      assert.equal(body.data.docente_id, firstDocente);
      assert.equal(body.data.periodo, '2026-1');
    });
    await test('404 por periodo ausente conserva la distinción frente al alta', async () => {
      const { body } = await get(`${cedula}?periodo=2025-1`).expect(404);
      assert.equal(body.code, 'RUND_DOCENTE_SIN_PERIODO');
      assert.equal(body.flujo_alta, null);
    });
    await test('404 para cédula inexistente indica Flujo 1', async () => {
      const { body } = await get('000000000000').expect(404);
      assert.equal(body.code, 'RUND_DOCENTE_NO_ENCONTRADO');
      assert.equal(body.flujo_alta, 'FLUJO_1');
    });
    await test('401 sin autenticación y 400 para entrada inválida', async () => {
      await request(app.getHttpServer()).get(`${base}/${cedula}`).expect(401);
      await get(encodeURIComponent("1' OR 1=1")).expect(400);
    });
    await test('auditoría real contiene actor, fecha, hora y campo; excluye valores sensibles', async () => {
      const { rows } = await db.query('SELECT * FROM academic_work_plan."RundAccesoDatosLog"');
      assert.equal(rows.length, 5);
      for (const row of rows) {
        assert.equal(row.actor_id, actorId);
        assert.equal(row.endpoint, 'RUND_PTA_CONSULTA_PERFIL_V1');
        assert(row.createdAt instanceof Date);
        assert.deepEqual(row.campos, ['DOCUMENTO_IDENTIDAD']);
      }
      assert(!JSON.stringify(rows).includes(cedula));
      assert(!JSON.stringify(rows).includes('145.5'));
    });
    await test('503 al fallar auditoría y ninguna modificación de perfiles', async () => {
      await db.query(`CREATE FUNCTION academic_work_plan.fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'fallo de prueba'; END; $$;
        CREATE TRIGGER fail_test_audit BEFORE INSERT ON academic_work_plan."RundAccesoDatosLog"
        FOR EACH ROW EXECUTE FUNCTION academic_work_plan.fail_test_audit()`);
      await get(cedula).expect(503);
      assert.deepEqual((await db.query('SELECT * FROM academic_work_plan."Docente" ORDER BY id')).rows, snapshot);
    });
    fs.writeFileSync(path.resolve(__dirname, '../docs/rund/validacion-F015-integracion.json'), JSON.stringify({
      executedAt: new Date().toISOString(), environment: 'PostgreSQL local, base temporal y datos ficticios',
      businessDataModified: false, results,
    }, null, 2) + '\n');
  } finally {
    if (app) await app.close();
    if (db) await db.end();
    if (created) {
      // Solo elimina la base nueva creada por esta ejecución, nunca la base de la plataforma.
      assert.match(tempDb, /^codex_rund_pta_[a-f0-9]{32}$/);
      await admin.query(`DROP DATABASE "${tempDb}"`);
    }
    await admin.end();
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
