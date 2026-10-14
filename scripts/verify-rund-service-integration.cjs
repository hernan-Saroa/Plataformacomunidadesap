/* RUND completo + PostgreSQL real, en un cluster temporal con datos ficticios.
 * No lee archivos .env ni acepta conexiones a una base existente.
 * Requiere npm run build en backend/rund-service y binarios locales de PostgreSQL.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { randomUUID, randomBytes } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const serviceRoot = path.join(root, 'backend/rund-service');
const dependency = (name) => require(path.join(serviceRoot, 'node_modules', name));
const { Client } = dependency('pg');
const { JwtService } = dependency('@nestjs/jwt');
const xlsx = dependency('xlsx');
require(path.join(serviceRoot, 'node_modules/reflect-metadata'));
const { DataSource } = dependency('typeorm');
const pgBin = process.env.PG_BIN_DIR || 'C:/Program Files/PostgreSQL/15/bin';
const binary = (name) => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const migrationNames = ['001_create_rund_schema.sql', '002_seed_rund_auth_module.sql', '003_legacy_rund_tables.sql',
  '004_rund_docente_identificadores_text.sql', '005_rund_tarjeta_numero_secuencia.sql',
  '006_rund_catalogo_permisos_compatibles.sql', '007_rund_carpeta_auth_proyeccion.sql'];
const checks = [];
let runtime;
let database;
let clusterStarted = false;
let application;
let applicationOutput = '';
let notifications;
let publicProxy;
let notificationCount = 0;
const notificationBodies = [];
const authSyncToken = randomBytes(32).toString('hex');
let authSyncMode = 'normal';
let authSyncPageSize = 100;
const authSyncRequests = [];

function fictitiousPdf(label) {
  const stream = `BT /F1 12 Tf 72 720 Td (${label}) Tj ET\n`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`];
  let content = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(content)); content += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(content);
  content += `xref\n0 6\n0000000000 65535 f \n`;
  content += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  return Buffer.from(content + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

async function check(name, run) {
  await run();
  checks.push(name);
  console.log(`PASS ${name}`);
}

function command(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, ...options });
    let output = '';
    let timedOut = false;
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 120_000);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    // En Windows, postgres puede heredar un pipe de pg_ctl y mantenerlo abierto.
    // La salida del proceso controlador es suficiente; no esperar el cierre de ese pipe.
    child.once('exit', (code) => {
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      if (timedOut) reject(new Error(`Timeout ejecutando ${path.basename(executable)}`));
      else if (code === 0) resolve(output);
      else reject(new Error(`${path.basename(executable)} falló (${code}): ${output}`));
    });
  });
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function migrate(name, client = database) {
  await client.query('BEGIN');
  try {
    await client.query(fs.readFileSync(path.join(serviceRoot, 'db/migrations', name), 'utf8'));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Migración ${name}: ${error.message}`);
  }
}

async function schemaSnapshot() {
  return (await database.query(`SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns WHERE table_schema = 'rund' ORDER BY table_name, ordinal_position`)).rows;
}

async function entityTypeDifferences(client) {
  const entities = fs.readdirSync(path.join(serviceRoot, 'dist/entities'))
    .filter((name) => name.endsWith('.entity.js'))
    .flatMap((name) => Object.values(require(path.join(serviceRoot, 'dist/entities', name))));
  const metadata = new DataSource({ type: 'postgres', entities });
  await metadata.buildMetadatas();
  const columns = (await client.query(`SELECT c.relname AS table_name, a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, NULL) AS data_type
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='rund' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped`)).rows;
  const differences = [];
  for (const entity of metadata.entityMetadatas.filter((item) => item.schema === 'rund')) {
    for (const column of entity.columns) {
      const actual = columns.find((item) => item.table_name === entity.tableName && item.column_name === column.databaseName);
      const expected = metadata.driver.normalizeType(column) + (column.isArray ? '[]' : '');
      if (!actual || actual.data_type !== expected) differences.push({ table: entity.tableName,
        column: column.databaseName, entityType: expected, databaseType: actual?.data_type || 'MISSING' });
    }
  }
  return differences;
}

async function verifyExistingDataUpgrade(pgConfig) {
  await database.query('CREATE DATABASE rund_schema_upgrade');
  const client = new Client({ ...pgConfig, database: 'rund_schema_upgrade' });
  await client.connect();
  try {
    await client.query(fs.readFileSync(path.join(root, 'db/init/003_auth_ddl_20260129_215539.sql'), 'utf8'));
    await client.query('SET search_path TO public');
    for (const name of migrationNames.slice(0, 3)) await migrate(name, client);
    const docenteId = randomUUID();
    const documentId = randomUUID();
    await client.query(`INSERT INTO rund."Docente" (id,"personaId","territorialId","tipoVinculacion",dedicacion,"updatedAt")
      VALUES ($1,$2,'999','CARRERA','TIEMPO_COMPLETO',now())`, [docenteId, randomUUID()]);
    await client.query(`INSERT INTO rund."RundCampoEstado" (docente_id,bloque) VALUES ($1,'IDENTIDAD')`, [docenteId]);
    await client.query(`INSERT INTO rund."RundSoporteCampo" (docente_id,bloque) VALUES ($1,'IDENTIDAD')`, [docenteId]);
    await client.query(`INSERT INTO rund."RundAprobacionLog" (docente_id,accion,actor_id,metadata)
      VALUES ($1,'PRUEBA_MIGRACION','ACTOR_FICTICIO','{"conservar":true}')`, [docenteId]);
    await client.query(`INSERT INTO rund."RundDocumentoPerfil" (id,documento_logico_id,docente_id,categoria_codigo,
      nombre_archivo,mime_type,tamano_bytes,checksum_sha256,proveedor_almacenamiento,almacenamiento_ruta,creado_por)
      VALUES ($1,$2,$3,'IDENTIDAD','ficticio.pdf','application/pdf',1,$4,'LOCAL','ficticio.pdf','ACTOR_FICTICIO')`,
      [documentId, randomUUID(), docenteId, '0'.repeat(64)]);
    await client.query(`INSERT INTO rund."RundExtraccionTrabajo" (documento_id,docente_id,creado_por)
      VALUES ($1,$2,'ACTOR_FICTICIO')`, [documentId, docenteId]);
    await client.query(`CREATE SCHEMA academic_work_plan;
      CREATE TABLE academic_work_plan.prueba_inmutable (id text PRIMARY KEY, valor text);
      INSERT INTO academic_work_plan.prueba_inmutable VALUES ('FICTICIO','CONSERVAR');
      INSERT INTO rund.docente (numero_documento,nombres,apellidos) VALUES ('9000000088','PRUEBA','CONSERVAR')`);

    const snapshot = async () => {
      const result = {};
      const tables = (await client.query(`SELECT schemaname,tablename FROM pg_tables
        WHERE schemaname IN ('rund','auth','academic_work_plan') ORDER BY schemaname,tablename`)).rows;
      for (const { schemaname, tablename } of tables) {
        result[`${schemaname}.${tablename}`] = (await client.query(`SELECT to_jsonb(t) AS row
          FROM "${schemaname}"."${tablename}" t ORDER BY to_jsonb(t)::text`)).rows;
      }
      return result;
    };
    const indexes = async () => (await client.query(`SELECT indexname,indexdef FROM pg_indexes
      WHERE schemaname='rund' ORDER BY indexname`)).rows;
    const before = await snapshot();
    const beforeIndexes = await indexes();
    const migrationSql = fs.readFileSync(path.join(serviceRoot, 'db/migrations', migrationNames[3]), 'utf8');
    await check('Migración 004 revierte todos sus cambios si encuentra un tipo inesperado', async () => {
      await client.query('ALTER TABLE rund."RundExtraccionTrabajo" ALTER COLUMN docente_id TYPE integer USING 42');
      // Sin BEGIN externo: comprobar la atomicidad del DO como lo ejecuta psql.
      await assert.rejects(client.query(migrationSql), /Tipo inesperado/);
      const types = (await client.query(`SELECT table_name,data_type FROM information_schema.columns
        WHERE table_schema='rund' AND column_name='docente_id' AND table_name IN ('RundCampoEstado','RundSoporteCampo','RundAprobacionLog','RundDocumentoPerfil')`)).rows;
      assert(types.every((row) => row.data_type === (row.table_name === 'RundCampoEstado' ? 'character varying' : 'uuid')));
      // Restaurar únicamente la columna ficticia que esta prueba alteró.
      assert.match(docenteId, /^[a-f0-9-]{36}$/);
      await client.query(`ALTER TABLE rund."RundExtraccionTrabajo" ALTER COLUMN docente_id TYPE uuid USING '${docenteId}'::uuid`);
      assert.deepEqual(await snapshot(), before);
    });
    await check('Migración 004 conserva registros, índices, auditoría y los otros esquemas', async () => {
      await client.query(migrationSql);
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual(await indexes(), beforeIndexes);
      await assert.rejects(client.query('UPDATE rund."RundAprobacionLog" SET accion=accion'), /inmutabl/);
      await client.query(migrationSql);
      assert.deepEqual(await snapshot(), before);
    });
    const cardMigration = fs.readFileSync(path.join(serviceRoot, 'db/migrations', migrationNames[4]), 'utf8');
    await client.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
      VALUES ('9000000087','TARJETA','ANTERIOR','RUND-2024-999999'),
        ('9000000086','TARJETA','ANTERIOR','RUND-2026-000007'),
        ('9000000085','TARJETA','ESPECIAL','HISTORICA-FICTICIA')`);
    const cardsBefore = await snapshot();
    const bankSequenceBefore = (await client.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows;
    await check('Migración 005 conserva tarjetas, filas y secuencia del banco; inicia sobre el máximo histórico', async () => {
      await client.query(cardMigration);
      assert.deepEqual(await snapshot(), cardsBefore);
      assert.deepEqual((await client.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows, bankSequenceBefore);
      assert.equal((await client.query("SELECT nextval('rund.numero_tarjeta_rund_seq')::text AS value")).rows[0].value, '1000000');
    });
    await check('Repetir 005 no reutiliza números reservados ni limita el correlativo a seis dígitos', async () => {
      await client.query(cardMigration);
      assert.equal((await client.query("SELECT nextval('rund.numero_tarjeta_rund_seq')::text AS value")).rows[0].value, '1000001');
      assert.deepEqual(await snapshot(), cardsBefore);
      await client.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
        VALUES ('9000000084','TARJETA','PRECISA','RUND-2099-9007199254740993')`);
      const withLargeCard = await snapshot();
      await client.query(cardMigration);
      assert.equal((await client.query("SELECT nextval('rund.numero_tarjeta_rund_seq')::text AS value")).rows[0].value, '9007199254740994');
      assert.deepEqual(await snapshot(), withLargeCard);
    });
    await check('005 falla sin renumerar tarjetas ni mover la secuencia ante un correlativo agotado', async () => {
      await client.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
        VALUES ('9000000083','TARJETA','LIMITE','RUND-2099-9223372036854775807')`);
      const exhaustedBefore = await snapshot();
      const sequenceBefore = (await client.query('SELECT last_value,is_called FROM rund.numero_tarjeta_rund_seq')).rows;
      await assert.rejects(client.query(cardMigration), /No hay correlativos BIGINT/);
      assert.deepEqual(await snapshot(), exhaustedBefore);
      assert.deepEqual((await client.query('SELECT last_value,is_called FROM rund.numero_tarjeta_rund_seq')).rows, sequenceBefore);
    });
    await check('006 preserva permisos previos, módulos, IDs, revocaciones y grants personalizados', async () => {
      const oldModule = randomUUID();
      const viewId = randomUUID();
      const macroId = randomUUID();
      const ggp = randomUUID();
      await client.query(`INSERT INTO auth.module (id_module,code,name,is_active) VALUES ($1,'pta','MODULO FICTICIO',false)`, [oldModule]);
      await client.query(`INSERT INTO auth.role (id,code,name,category,is_active) VALUES
        ($1,'GESTION_PROFESORAL','GGP','sistema',true),($2,'RECTOR','RECTOR','sistema',true)`, [ggp, randomUUID()]);
      await client.query(`INSERT INTO auth.permission (id_permission,code,name,description,id_module,is_active) VALUES
        ($1,'banco-docentes.rund.view','NOMBRE PERSONALIZADO','CONSERVAR',$3,false),
        ($2,'pta.macro_docente.consultar','CONSULTA PERSONALIZADA','CONSERVAR',$3,true)`, [viewId, macroId, oldModule]);
      await client.query(`INSERT INTO auth.role_permissions (id_rol,id_permission,is_active) VALUES ($1,$2,false),($1,$3,false)`, [ggp, viewId, macroId]);
      const beforePermissions = (await client.query('SELECT * FROM auth.permission ORDER BY code')).rows;
      const beforeGrants = (await client.query('SELECT * FROM auth.role_permissions ORDER BY id_rol,id_permission')).rows;
      const beforeModules = (await client.query('SELECT * FROM auth.module ORDER BY code')).rows;
      const beforeDomains = await snapshot();
      const permissionSql = fs.readFileSync(path.join(serviceRoot, 'db/migrations', migrationNames[5]), 'utf8');
      await client.query(permissionSql);
      for (const old of beforePermissions) assert.deepEqual((await client.query('SELECT * FROM auth.permission WHERE id_permission=$1', [old.id_permission])).rows[0], old);
      for (const old of beforeGrants) assert.deepEqual((await client.query('SELECT * FROM auth.role_permissions WHERE id_rol=$1 AND id_permission=$2', [old.id_rol, old.id_permission])).rows[0], old);
      assert.deepEqual((await client.query('SELECT * FROM auth.module ORDER BY code')).rows, beforeModules);
      const afterDomains = await snapshot();
      for (const key of Object.keys(beforeDomains).filter((key) => !['auth.permission','auth.role_permissions'].includes(key))) assert.deepEqual(afterDomains[key], beforeDomains[key]);
      assert.equal(Number((await client.query(`SELECT count(*) FROM auth.role_permissions rp JOIN auth.role r ON r.id=rp.id_rol
        JOIN auth.permission p ON p.id_permission=rp.id_permission WHERE r.code='RECTOR' AND p.code='pta.macro_docente.consultar'`)).rows[0].count), 0);
      const once = await snapshot();
      await client.query(permissionSql);
      assert.deepEqual(await snapshot(), once);
    });
  } finally { await client.end(); }
}

async function cleanup() {
  if (runtime) {
    assert.equal(path.dirname(fs.realpathSync(runtime)), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(runtime), /^esap-rund-integration-/);
  }
  if (application && application.exitCode === null && application.signalCode === null) {
    const closed = new Promise((resolve) => application.once('close', resolve));
    application.kill();
    await closed;
  }
  if (database) await database.end();
  if (publicProxy) await new Promise((resolve) => publicProxy.close(resolve));
  if (notifications) await new Promise((resolve) => notifications.close(resolve));
  if (clusterStarted || (runtime && fs.existsSync(path.join(runtime, 'data/postmaster.pid')))) {
    // pg_ctl solo controla el directorio que creó esta ejecución.
    await command(binary('pg_ctl'), ['-D', path.join(runtime, 'data'), '-m', 'fast', '-w', 'stop']);
  }
  if (runtime) {
    const resolved = fs.realpathSync(runtime);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(resolved), /^esap-rund-integration-/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

async function run() {
  for (const name of ['initdb', 'pg_ctl']) assert(fs.existsSync(binary(name)), `Falta ${name}; configure PG_BIN_DIR.`);
  assert(fs.existsSync(path.join(serviceRoot, 'dist/main.js')), 'Primero compile rund-service.');
  runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'esap-rund-integration-'));
  const passwordFile = path.join(runtime, 'password.txt');
  const password = randomBytes(32).toString('hex');
  fs.writeFileSync(passwordFile, password, { mode: 0o600 });
  const pgPort = await freePort();
  const appPort = await freePort();
  const pgConfig = { host: '127.0.0.1', port: pgPort, user: 'rund_integration_admin', password,
    database: 'postgres', connectionTimeoutMillis: 5000 };
  let postgresVersion;
  try {
    console.log('Preparando PostgreSQL temporal (sin usar .env ni bases existentes)...');
    await command(binary('initdb'), ['-D', path.join(runtime, 'data'), '-U', pgConfig.user,
      '--auth=scram-sha-256', '--pwfile=' + passwordFile, '--encoding=UTF8', '--locale=C']);
    console.log('Cluster temporal inicializado.');
    await command(binary('pg_ctl'), ['-D', path.join(runtime, 'data'), '-l', path.join(runtime, 'postgres.log'),
      '-o', `-h 127.0.0.1 -p ${pgPort}`, '-w', 'start']);
    clusterStarted = true;
    console.log('PostgreSQL temporal disponible.');
    fs.unlinkSync(passwordFile);
    database = new Client(pgConfig);
    await database.connect();
    await database.query('CREATE DATABASE rund_integration');
    await database.end();
    pgConfig.database = 'rund_integration';
    database = new Client(pgConfig);
    await database.connect();
    postgresVersion = (await database.query('SHOW server_version')).rows[0].server_version;

    // Prerrequisitos de auth: DDL y migración reales del repositorio, sin semillas de usuarios reales.
    await database.query(fs.readFileSync(path.join(root, 'db/init/003_auth_ddl_20260129_215539.sql'), 'utf8'));
    // El dump deja search_path vacío; psql usa una sesión nueva para cada migración.
    await database.query('SET search_path TO public');
    await database.query(fs.readFileSync(path.join(root, 'db/migrations/158_add_id_person_to_personas_and_user.sql'), 'utf8'));
    for (const role of ['SUPER_ADMIN', 'GESTION_PROFESORAL', 'DOCENTE']) {
      await database.query(`INSERT INTO auth.role (id,code,name,category,is_active)
        VALUES ($1,$2,$2,'sistema',true)`, [randomUUID(), role]);
    }
    for (const name of migrationNames) await check(`Migración ${name} en PostgreSQL real`, () => migrate(name));
    await check('Catálogo de permisos cubre los decoradores y no equipara operaciones distintas', async () => {
      const { RUND_PERMISSION_CODES } = require(path.join(serviceRoot, 'dist/auth/rund-permission-catalog'));
      const codes = (await database.query('SELECT code FROM auth.permission')).rows.map((row) => row.code);
      assert(RUND_PERMISSION_CODES.every((code) => codes.includes(code)));
      assert.equal(RUND_PERMISSION_CODES.length, 16);
      const { PERMISSIONS_KEY } = require(path.join(serviceRoot, 'dist/auth/auth.decorators'));
      const { RUND_PERMISSIONS_KEY } = require(path.join(serviceRoot, 'dist/modules/banco-docentes/rund-permissions'));
      const { MACRO_DOCENTE_PERMISSION_KEY } = require(path.join(serviceRoot, 'dist/modules/macro-docente/macro-docente-permission.decorator'));
      for (const module of fs.readdirSync(path.join(serviceRoot, 'dist/modules'))) {
        const directory = path.join(serviceRoot, 'dist/modules', module);
        if (!fs.statSync(directory).isDirectory()) continue;
        for (const name of fs.readdirSync(directory).filter((name) => name.endsWith('.controller.js'))) {
          for (const controller of Object.values(require(path.join(directory, name))).filter((value) => typeof value === 'function' && value.prototype)) {
            for (const method of Object.getOwnPropertyNames(controller.prototype).filter((name) => name !== 'constructor')) {
              const handler = Object.getOwnPropertyDescriptor(controller.prototype, method)?.value;
              if (typeof handler !== 'function') continue;
              for (const key of [PERMISSIONS_KEY, RUND_PERMISSIONS_KEY, MACRO_DOCENTE_PERMISSION_KEY]) {
                const required = Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller);
                for (const code of (Array.isArray(required) ? required : required ? [required] : [])) {
                  assert(RUND_PERMISSION_CODES.includes(code) && codes.includes(code), `${controller.name}.${method}: ${code}`);
                }
              }
            }
          }
        }
      }
    });
    await check('Todos los tipos de columnas mapeadas de RUND coinciden con PostgreSQL', async () => {
      assert.deepEqual(await entityTypeDifferences(database), []);
      const references = (await database.query(`SELECT table_name,data_type FROM information_schema.columns
        WHERE table_schema='rund' AND column_name='docente_id'`)).rows;
      assert(references.length >= 9);
      assert(references.every((column) => column.data_type === 'text'));
    });
    await verifyExistingDataUpgrade(pgConfig);
    await check('Esquema nuevo vacío: 27 tablas y 7 categorías, sin copiar docentes', async () => {
      const tables = (await database.query(`SELECT tablename FROM pg_tables WHERE schemaname='rund' ORDER BY tablename`)).rows;
      assert.equal(tables.length, 27);
      for (const { tablename } of tables) {
        const count = Number((await database.query(`SELECT count(*) FROM rund."${tablename}"`)).rows[0].count);
        assert.equal(count, tablename === 'RundDocumentoCategoria' ? 7 : 0, tablename);
      }
    });
    await check('Migraciones repetibles sin duplicar columnas, categorías ni permisos', async () => {
      const before = await schemaSnapshot();
      for (const name of migrationNames) await migrate(name);
      assert.deepEqual(await schemaSnapshot(), before);
      assert.equal(Number((await database.query(`SELECT count(*) FROM auth.permission WHERE code LIKE 'rund.%'`)).rows[0].count), 6);
      assert.equal(Number((await database.query(`SELECT count(*) FROM rund."RundDocumentoCategoria"`)).rows[0].count), 7);
    });

    // Fixtures de tablas externas mientras sigue pendiente sustituir las lecturas cross-schema.
    const externalEntities = ['persona', 'usuario', 'programa', 'facultad', 'plan-trabajo-academico', 'pta-configuracion']
      .flatMap((name) => Object.values(require(path.join(serviceRoot, `dist/entities/${name}.entity.js`))));
    const fixture = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port,
      username: pgConfig.user, password, database: pgConfig.database, entities: externalEntities, synchronize: false });
    await database.query('CREATE SCHEMA academic_work_plan');
    await fixture.initialize();
    try { await fixture.synchronize(); } finally { await fixture.destroy(); }
    await database.query(`CREATE TABLE academic_work_plan.periodo_academico (codigo text PRIMARY KEY, estado text);
      INSERT INTO academic_work_plan.periodo_academico VALUES ('2026-2','en_curso');
      INSERT INTO auth.seccionales (id_seccional,nom_seccional,cod_seccional) VALUES (999,'Territorial Ficticia','99')`);

    // Intercepta todos los correos del proceso de prueba; no se contacta ningún servicio real.
    notifications = http.createServer(async (req, res) => {
      if (req.method === 'GET' && req.url.startsWith('/users?')) {
        const url = new URL(req.url, 'http://auth-ficticio');
        authSyncRequests.push({ page: url.searchParams.get('page'), role: url.searchParams.get('role'),
          status: url.searchParams.get('status'), tokenMatches: req.headers['x-internal-service-token'] === authSyncToken,
          authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie) });
        res.setHeader('Content-Type', 'application/json');
        if (req.headers['x-internal-service-token'] !== authSyncToken) { res.writeHead(401); res.end('{}'); return; }
        const page = Number(url.searchParams.get('page'));
        if (authSyncMode === 'unauthorized' || (authSyncMode === 'fail-page-2' && page === 2)) {
          res.writeHead(authSyncMode === 'unauthorized' ? 401 : 503); res.end('{}'); return;
        }
        try {
          // Fixture del contrato actual /users: rol por UUID, identidad interna y ResponseInterceptor.
          // La asignación inactiva se conserva en la lista para comprobar su revalidación en RUND.
          const rows = (await database.query(`SELECT p.id_person AS id, p.num_identificacion AS identification_number,
            p.nom_largo AS full_name, p.nom_tercero AS first_name, p.pri_apellido AS last_name, p.dir_email AS email,
            u.id_user, u.public_id, u.is_active, r.id AS role_id, r.code AS role_code, r.is_active AS role_active
            FROM auth."user" u JOIN auth.personas p ON p.id_person=u.id_person
            JOIN auth.user_roles ur ON ur.id_user=u.id_user JOIN auth.role r ON r.id=ur.id_rol
            WHERE ur.id_rol=$1::uuid AND u.is_active=true ORDER BY p.nom_tercero,u.id_user`, [url.searchParams.get('role')])).rows;
          const limit = Math.min(Number(url.searchParams.get('limit')), authSyncPageSize);
          const data = rows.slice((page - 1) * limit, page * limit).map(row => ({ id: row.id,
            identification_number: row.identification_number, full_name: row.full_name,
            first_name: row.first_name, last_name: row.last_name, email: row.email,
            user: { id_user: authSyncMode === 'public-ids' ? row.public_id : row.id_user, public_id: row.public_id,
              is_active: row.is_active, roles: [{ id: row.role_id, code: row.role_code, is_active: row.role_active }] } }));
          res.end(JSON.stringify({ success: true, data: { data, meta: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) } } }));
        } catch { res.writeHead(500); res.end('{}'); }
        return;
      }
      notificationCount++;
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        notificationBodies.push(JSON.parse(body || '{}'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    });
    await new Promise((resolve) => notifications.listen(0, '127.0.0.1', resolve));
    const stubUrl = `http://127.0.0.1:${notifications.address().port}`;
    // Fixture del enrutamiento público definido en Nginx y el gateway, hacia el main real.
    publicProxy = http.createServer((req, res) => {
      const prefix = '/services/rund/api/v1';
      if (!req.url.startsWith(prefix + '/')) { res.writeHead(404); res.end(); return; }
      const upstream = http.request({ host: '127.0.0.1', port: appPort, path: req.url.slice(prefix.length),
        method: req.method, headers: req.headers }, (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);
      });
      upstream.on('error', () => { res.writeHead(502); res.end(); });
      req.pipe(upstream);
    });
    await new Promise((resolve) => publicProxy.listen(0, '127.0.0.1', resolve));
    const publicBase = `http://127.0.0.1:${publicProxy.address().port}`;
    const appDir = path.join(runtime, 'app');
    fs.mkdirSync(path.join(appDir, 'uploads'), { recursive: true });
    const secret = randomBytes(32).toString('hex');
    const folderToken = randomBytes(32).toString('hex');
    const env = { ...process.env, NODE_ENV: 'test', PORT: String(appPort), DB_HOST: pgConfig.host,
      DB_PORT: String(pgConfig.port), DB_USER: pgConfig.user, DB_PASS: password, DB_PASSWORD: password,
      DB_NAME: pgConfig.database, JWT_SECRET: secret, JWT_PUBLIC_PATHS: '', RUND_OCR_ENABLED: 'false',
      RUND_ENABLE_DEV_OTP: 'false', RUND_DOCUMENT_ALLOW_LOCAL: 'true', RUND_DOCUMENT_MAX_SIZE_BYTES: '',
      OPENKM_BASE_URL: '', OPENKM_USERNAME: '', OPENKM_PASSWORD: '', AUTH_SERVICE_URL: stubUrl,
      NOTIFICATIONS_SERVICE_URL: stubUrl, NOTIFICATION_SERVICE_URL: stubUrl,
      AUTH_INTERNAL_SERVICE_TOKEN: authSyncToken, INTERNAL_SERVICE_TOKEN: '', RUND_AUTH_SYNC_TIMEOUT_MS: '5000', RUND_AUTH_SYNC_MAX_PAGES: '1000',
      RUND_CARPETA_INTERNAL_TOKEN: folderToken,
      RUND_CARPETA_SYNC_ENABLED: 'false', RUND_CARPETA_SYNC_TOKEN: '',
      PUBLIC_APP_URL: publicBase, FRONTEND_URL: publicBase };
    application = spawn(process.execPath, [path.join(serviceRoot, 'dist/main.js')], { cwd: appDir, env, windowsHide: true });
    application.stdout.on('data', (chunk) => { applicationOutput += chunk; });
    application.stderr.on('data', (chunk) => { applicationOutput += chunk; });
    let spawnError;
    application.once('error', (error) => { spawnError = error; });
    const base = `http://127.0.0.1:${appPort}`;
    const jwt = new JwtService({ secret });
    const actorId = randomUUID();
    const adminToken = jwt.sign({ sub: actorId, roles: ['SUPER_ADMIN'] }, { expiresIn: '10m' });
    const teacherToken = jwt.sign({ sub: randomUUID(), roles: ['DOCENTE'] }, { expiresIn: '10m' });
    async function request(route, { token = adminToken, method = 'GET', body, status = 200, origin = base, extraHeaders = {} } = {}) {
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders };
      if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
      const response = await fetch(origin + route, { method, headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
      const content = await response.text();
      assert.equal(response.status, status, `${method} ${route}: ${content}`);
      return content ? JSON.parse(content) : null;
    }
    await check('Arranque del main real y health/ready con conexión a PostgreSQL', async () => {
      const deadline = Date.now() + 90_000;
      let ready = false;
      while (Date.now() < deadline) {
        if (spawnError) throw spawnError;
        if (application.exitCode !== null) throw new Error(`RUND terminó durante el arranque: ${applicationOutput}`);
        try { await request('/health', { token: null }); ready = true; break; } catch { /* arranque en curso */ }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      assert(ready, `RUND no arrancó: ${applicationOutput}`);
      const result = await request('/health/ready', { token: null });
      assert.equal(result.database, 'up');
      assert.equal(result.service, 'rund-service');
      assert(!applicationOutput.includes('No se pudieron verificar columnas RUND'));
    });
    await check('JWT y permisos: 401 sin sesión y 403 para rol sin autorización', async () => {
      await request('/banco-docentes', { token: null, status: 401 });
      await request('/docentes', { token: teacherToken, status: 403 });
      await request('/rund/interoperabilidad/perfiles/9000000001', { token: teacherToken, status: 403 });
    });
    await check('CRUD base: creación, consulta por ORM y rechazo de documento duplicado', async () => {
      const body = { numeroDocumento: '9000000099', nombres: 'PRUEBA', apellidos: 'INTEGRACION', tipoDocumento: 'CC' };
      const created = await request('/docentes', { method: 'POST', body, status: 201 });
      assert(created.idDocente);
      assert.equal((await request(`/docentes/${created.idDocente}`)).numeroDocumento, body.numeroDocumento);
      await request('/docentes', { method: 'POST', body, status: 409 });
      assert.equal((await request('/docentes')).total, 1);
    });

    const row = { DOCUMENTO_IDENTIDAD: '9000000001', TIPO_DOCUMENTO: 'CC', NOMBRE_COMPLETO: 'DOCENTE FICTICIO INTEGRACION',
      GENERO: 'M', FECHA_NACIMIENTO: '1980-01-01', CORREO_INSTITUCIONAL: 'rund.integracion@example.test',
      VINCULACION: 'CARRERA', TERRITORIAL: 'Territorial Ficticia', DEDICACION: 'TIEMPO_COMPLETO',
      CATEGORIA_ESCALAFON: 'ASOCIADO', INICIO_VINCULACION: '2026-01-01', ACTO_ADMINISTRATIVO: 'ACTO FICTICIO',
      NIVEL_FORMACION: 'MAESTRIA', TITULO_PREGRADO: 'ADMINISTRACION PUBLICA', NUCLEO_TEMATICO: 'GESTION PUBLICA',
      PERFIL_ACADEMICO: 'DOCENCIA', HORAS_PTA: 720, PUNTAJE_SALARIAL: 145.5, PERIODO_CARGA: '2026-2' };
    function workbookBody(rows) {
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(rows), 'CARGA_DOCENTES');
      const form = new FormData();
      form.append('file', new Blob([xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'docentes-ficticios.xlsx');
      return form;
    }
    const profileCount = async () => Number((await database.query('SELECT count(*) FROM rund."Docente"')).rows[0].count);
    await check('Previsualización XLSX revierte perfiles, usuarios y soportes', async () => {
      const result = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: workbookBody([row]), status: 201 });
      assert.equal(result.success, true);
      assert.equal(result.data.errors, 0, JSON.stringify(result.data.errorDetails));
      assert.equal(await profileCount(), 0);
      assert.equal(Number((await database.query('SELECT count(*) FROM auth."user"')).rows[0].count), 0);
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."RundCargaMasiva"')).rows[0].count), 0);
    });
    let docenteId;
    await check('Carga XLSX definitiva guarda perfil, usuario, rol, validaciones y soporte', async () => {
      const result = await request('/banco-docentes/bulk', { method: 'POST', body: workbookBody([row]), status: 201 });
      assert.equal(result.data.errors, 0, JSON.stringify(result.data.errorDetails));
      assert.equal(result.data.created, 1);
      assert.equal(await profileCount(), 1);
      docenteId = (await database.query('SELECT id FROM rund."Docente"')).rows[0].id;
      assert.match(docenteId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      assert.equal(Number((await database.query('SELECT count(*) FROM auth.user_roles')).rows[0].count), 1);
      assert(Number((await database.query('SELECT count(*) FROM rund.validacion_documental')).rows[0].count) > 0);
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."RundCargaMasiva"')).rows[0].count), 1);
    });
    await check('Reimportar el mismo XLSX conserva un único perfil', async () => {
      const result = await request('/banco-docentes/bulk', { method: 'POST', body: workbookBody([row]), status: 201 });
      assert.equal(result.data.errors, 0);
      assert.equal(result.data.created, 0);
      assert.equal(await profileCount(), 1);
    });
    await check('Listado, cabezote y contrato de interoperabilidad consultan el esquema rund', async () => {
      const list = await request('/banco-docentes?periodoCarga=2026-2');
      assert.equal(list.total, 1);
      assert.equal((await request(`/banco-docentes/${docenteId}/cabezote`)).success, true);
      const result = await request(`/rund/interoperabilidad/perfiles/${row.DOCUMENTO_IDENTIDAD}?periodo=2026-2`);
      assert.equal(result.data.docente_id, docenteId);
      assert.equal(result.data.horas_programables, 720);
      assert(!JSON.stringify(result).includes('145.5'));
      await request(`/rund/interoperabilidad/perfiles/${row.DOCUMENTO_IDENTIDAD}?periodo=2025-1`, { status: 404 });
    });
    await check('Bloques, categorías y validación documental funcionan con PostgreSQL real', async () => {
      assert.equal((await request(`/banco-docentes/${docenteId}/bloques`)).data.length, 6);
      assert.equal((await request('/banco-docentes/documentos/categorias')).data.length, 7);
      const result = await request(`/rund/docente/${docenteId}`);
      assert(result.data.validaciones.length > 0);
      assert.equal(result.data.personaId, (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId);
    });
    let document;
    const pdf = fictitiousPdf('RUND - DOCUMENTO FICTICIO');
    function documentBody(content, create = true) {
      const form = new FormData();
      form.append('file', new Blob([content], { type: 'application/pdf' }), 'identidad-ficticia.pdf');
      if (create) {
        form.append('categoria', 'IDENTIDAD');
        form.append('bloque', 'IDENTIDAD');
        form.append('tipoSoporte', 'documento_identidad');
        form.append('campo', 'DOCUMENTO_IDENTIDAD');
      }
      return form;
    }
    await check('Documento PDF vincula soporte y devuelve un enlace del servicio RUND', async () => {
      await request(`/banco-docentes/${docenteId}/documentos`, { method: 'POST', body: documentBody(Buffer.from('no es PDF')), status: 400 });
      const result = await request(`/banco-docentes/${docenteId}/documentos`, { method: 'POST', body: documentBody(pdf), status: 201 });
      document = result.data;
      assert(document.rundSoporteId);
      assert.match(document.contenidoUrl, /^\/rund\/api\/v1\//);
      assert.equal((await request(`/banco-docentes/${docenteId}/documentos`)).data.length, 1);
    });
    await check('Descarga del enlace devuelto conserva el PDF y exige sesión autorizada', async () => {
      // El cliente API antepone /services al enlace; el proxy local reproduce su enrutamiento.
      const route = '/services' + document.contenidoUrl;
      await request(route, { origin: publicBase, token: null, status: 401 });
      const userId = (await database.query(`SELECT u.id_user FROM auth."user" u
        JOIN rund."Docente" d ON d."personaId" = u.id_person WHERE d.id=$1`, [docenteId])).rows[0].id_user;
      const ownTeacherToken = jwt.sign({ sub: userId, roles: ['DOCENTE'] }, { expiresIn: '10m' });
      await request(route, { origin: publicBase, token: ownTeacherToken, status: 403 });
      const protectedList = await request(`/banco-docentes/${docenteId}/documentos`, { token: ownTeacherToken });
      assert.equal(protectedList.data[0].contenidoUrl, null);
      const response = await fetch(publicBase + route, { headers: { Authorization: `Bearer ${adminToken}` }, signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    });
    await check('Reemplazo PDF conserva historial y enlaza la nueva versión del soporte', async () => {
      const result = await request(`/banco-docentes/${docenteId}/documentos/${document.id}/reemplazo`,
        { method: 'POST', body: documentBody(fictitiousPdf('RUND - VERSION DOS'), false), status: 201 });
      assert.equal(result.data.version, 2);
      assert.notEqual(result.data.id, document.id);
      assert.equal(result.data.documentoLogicoId, document.documentoLogicoId);
      assert.equal((await request(`/banco-docentes/${docenteId}/documentos?historial=true`)).data.length, 2);
      assert.equal((await request(`/banco-docentes/${docenteId}/documentos`)).data[0].id, result.data.id);
      document = result.data;
    });
    await check('Carpeta Digital exige credencial interna aunque el usuario tenga JWT SUPER_ADMIN', async () => {
      const personaId = (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId;
      const route = `/internal/carpeta-digital/personas/${personaId}/documentos`;
      await request(route, { method: 'POST', body: { userToken: adminToken }, status: 401 });
      await request(route, { method: 'POST', body: {}, extraHeaders: { 'X-Rund-Carpeta-Token': 'incorrecta' }, status: 401 });
    });
    await check('Carpeta Digital devuelve la versión vigente desde RUND sin duplicar historial', async () => {
      const personaId = (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId;
      const result = await request(`/internal/carpeta-digital/personas/${personaId}/documentos`, { token: null, method: 'POST',
        body: { userToken: adminToken }, extraHeaders: { 'X-Rund-Carpeta-Token': folderToken } });
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].id, `rund-service:documento:${document.id}`);
      assert.equal(result.data[0].servicio_propietario, 'rund');
      assert.equal(result.data[0].version_actual, 2);
      assert.equal(result.data[0].total_versiones, 2);
      assert.equal(result.data[0].contenido_restringido, false);
      assert.equal(result.data[0].url_archivo, document.contenidoUrl);
      assert.equal((await database.query(`SELECT COUNT(*)::int AS n FROM rund."RundDocumentoPerfil" WHERE documento_logico_id=$1`,
        [document.documentoLogicoId])).rows[0].n, 2);
    });
    await check('La proyección de Carpeta Digital no admite roles declarados y registra enmascaramiento', async () => {
      const personaId = (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId;
      const route = `/internal/carpeta-digital/personas/${personaId}/documentos`;
      for (const body of [{ user: { roles: ['SUPER_ADMIN'] }, fullAccess: true }, { userToken: teacherToken }, { userToken: 'invalido' }]) {
        const result = await request(route, { token: null, method: 'POST', body, extraHeaders: { 'X-Rund-Carpeta-Token': folderToken } });
        assert.equal(result.data[0].url_archivo, null);
        assert.equal(result.data[0].comentarios, null);
        assert.equal(result.data[0].nombre, 'Documento del perfil');
        assert.equal(result.data[0].contenido_restringido, true);
      }
      const logs = (await database.query(`SELECT resultado FROM rund."RundAccesoDatosLog"
        WHERE endpoint='CARPETA_DIGITAL_LISTADO_SERVICIO_RUND' AND recurso_id=$1`, [personaId])).rows;
      assert(logs.some(row => row.resultado === 'COMPLETO'));
      assert.equal(logs.filter(row => row.resultado === 'ENMASCARADO').length, 3);
    });
    await check('El cliente compilado de auth consulta RUND real y conserva el contrato documental', async () => {
      const clientFile = path.join(root, 'backend/auth-service/dist/carpeta-digital/rund-carpeta.client.js');
      assert(fs.existsSync(clientFile), 'Compilar auth-service para verificar su consumidor HTTP.');
      const { RundCarpetaClient } = require(clientFile);
      const config = { RUND_CARPETA_ENABLED: 'true', RUND_SERVICE_URL: base, RUND_CARPETA_INTERNAL_TOKEN: folderToken };
      const previous = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
      Object.assign(process.env, config);
      try {
        const personaId = (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId;
        const client = new RundCarpetaClient();
        const full = await client.listDocumentos(personaId, adminToken);
        assert.equal(full[0].rund_documento_id, document.id);
        assert.equal(full[0].contenido_restringido, false);
        const masked = await client.listDocumentos(personaId);
        assert.equal(masked[0].url_archivo, null);
        assert.deepEqual(await client.listDocumentos(randomUUID(), adminToken), []);
      } finally {
        for (const [key, value] of Object.entries(previous)) {
          if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
      }
    });
    await check('Una auditoría indisponible impide entregar originales en la proyección interna', async () => {
      const personaId = (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId;
      await database.query(`ALTER TABLE rund."RundAccesoDatosLog" RENAME TO "RundAccesoDatosLogTemporal"`);
      try {
        await request(`/internal/carpeta-digital/personas/${personaId}/documentos`, { token: null, method: 'POST',
          body: { userToken: adminToken }, extraHeaders: { 'X-Rund-Carpeta-Token': folderToken }, status: 503 });
      } finally {
        await database.query(`ALTER TABLE rund."RundAccesoDatosLogTemporal" RENAME TO "RundAccesoDatosLog"`);
      }
    });
    await check('La consulta por ID vigente revalida el propietario y el enmascaramiento en PostgreSQL', async () => {
      const route = `/internal/carpeta-digital/documentos/documento/${document.id}`;
      await request(route, { method: 'POST', body: {}, status: 401 });
      const result = await request(route, { method: 'POST', body: { userToken: adminToken }, extraHeaders: { 'X-Rund-Carpeta-Token': folderToken } });
      assert.equal(result.data.id, `rund-service:documento:${document.id}`);
      assert.equal(result.data.url_archivo, document.contenidoUrl);
      const masked = await request(route, { method: 'POST', body: {}, extraHeaders: { 'X-Rund-Carpeta-Token': folderToken } });
      assert.equal(masked.data.url_archivo, null);
    });
    await check('Soporte técnico genera URL RUND y descarga el original con JWT/auditoría', async () => {
      const form = new FormData();
      form.append('tipoSoporte', 'soporte_edicion_perfil');
      form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'soporte-tecnico.pdf');
      // Este campo llega después del archivo: la URL debe usar la carpeta real de Multer.
      form.append('docenteNombre', 'OTRO NOMBRE FICTICIO');
      const result = await request(`/banco-docentes/${docenteId}/bloques/TRANSVERSAL/soportes`,
        { method: 'POST', body: form, status: 201 });
      const url = result.data.documentoCarpetaId;
      assert.match(url, /^\/rund\/api\/v1\/uploads\/carpeta-digital\//);
      assert(!url.includes('OTRO'));
      const route = '/services' + url;
      await request(route, { origin: publicBase, token: null, status: 401 });
      await request(route, { origin: publicBase, token: teacherToken, status: 403 });
      const response = await fetch(publicBase + route, { headers: { Authorization: `Bearer ${adminToken}` }, signal: AbortSignal.timeout(15000) });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
      const support = (await database.query(`SELECT documento_carpeta_id FROM rund."RundSoporteCampo" WHERE id=$1`, [result.data.id])).rows[0];
      assert.equal(support.documento_carpeta_id, url);
    });
    await check('Diagnóstico reconoce el soporte técnico y la versión PDF vigente en su ruta de disco', async () => {
      const result = await request(`/banco-docentes/admin/sync-check/${docenteId}`);
      const versioned = result.data.details.find(support => support.id === document.rundSoporteId);
      const technical = result.data.details.find(support => support.tipoSoporte === 'soporte_edicion_perfil');
      assert(versioned?.existsOnDisk);
      assert(technical?.existsOnDisk);
      assert(versioned.documentoCarpetaId.includes('/documentos/'));
    });
    await check('Reparación conserva referencias PTA y RUND y es idempotente con PostgreSQL real', async () => {
      const name = 'DOCENTE FICTICIO INTEGRACION';
      const folder = path.join(appDir, 'uploads/carpeta-digital', name, 'RUND');
      fs.mkdirSync(folder, { recursive: true });
      const oldId = randomUUID();
      const newId = randomUUID();
      const oldUrl = `/pta/api/v1/uploads/carpeta-digital/${name}/RUND/anterior.pdf`;
      const newUrl = `/rund/api/v1/uploads/carpeta-digital/${encodeURIComponent(name)}/RUND/nuevo.pdf`;
      fs.writeFileSync(path.join(folder, 'anterior.pdf'), pdf);
      fs.writeFileSync(path.join(folder, 'nuevo.pdf'), pdf);
      fs.writeFileSync(path.join(folder, 'sin-registro.pdf'), pdf);
      await database.query(`INSERT INTO rund."RundSoporteCampo"
        (id,docente_id,bloque,tipo_soporte,documento_carpeta_id,nombre_archivo,estado,cargado_por)
        VALUES ($1,$3,'TRANSVERSAL','soporte_edicion_perfil',$4,'anterior.pdf','Aprobado','PRUEBA'),
        ($2,$3,'TRANSVERSAL','soporte_edicion_perfil',$5,'nuevo.pdf','Pendiente','PRUEBA')`, [oldId,newId,docenteId,oldUrl,newUrl]);
      const originalRows = (await database.query(`SELECT * FROM rund."RundSoporteCampo" WHERE id=ANY($1::uuid[]) ORDER BY id`, [[oldId,newId]])).rows;
      const first = await request('/banco-docentes/admin/sync-all-soportes', { method: 'POST', status: 201 });
      assert.equal(first.data.totalRegistrosCreados, 1);
      assert.equal(first.data.totalRegistrosEnlazados, 0);
      const second = await request('/banco-docentes/admin/sync-all-soportes', { method: 'POST', status: 201 });
      assert.equal(second.data.totalRegistrosCreados, 0);
      assert.equal(second.data.totalRegistrosEnlazados, 0);
      assert.deepEqual((await database.query(`SELECT * FROM rund."RundSoporteCampo" WHERE id=ANY($1::uuid[]) ORDER BY id`, [[oldId,newId]])).rows, originalRows);
      const diagnostic = await request(`/banco-docentes/admin/sync-check/${docenteId}`);
      assert(diagnostic.data.details.find(item => item.id === oldId)?.existsOnDisk);
      assert(diagnostic.data.details.find(item => item.id === newId)?.existsOnDisk);
      const created = (await database.query(`SELECT documento_carpeta_id FROM rund."RundSoporteCampo" WHERE docente_id=$1 AND nombre_archivo='sin-registro.pdf'`, [docenteId])).rows;
      assert.equal(created.length, 1);
      assert.match(created[0].documento_carpeta_id, /^\/rund\/api\/v1\/uploads\//);
    });
    await check('sync-documents rechaza estados del navegador sin alterar aprobaciones nativas', async () => {
      const personaId = (await database.query('SELECT "personaId" FROM rund."Docente" WHERE id=$1', [docenteId])).rows[0].personaId;
      const before = (await database.query('SELECT * FROM rund.validacion_documental ORDER BY id')).rows;
      await request(`/rund/docente/${personaId}/sync-documents`, { method: 'POST', status: 409,
        body: { documentos: [{ id: document.id, categoria: 'personal', estado: 'validado' }] } });
      assert.deepEqual((await database.query('SELECT * FROM rund.validacion_documental ORDER BY id')).rows, before);
      await request(`/rund/docente/${docenteId}/sync-documents`, { method: 'POST', status: 409, body: {} });
    });
    await check('Macro Docente consulta el historial firme del perfil nuevo', async () => {
      const data = { asignaturas: [{ codigo: 'FICTICIA-1', nombre: 'ASIGNATURA FICTICIA', horas: 32,
        programa_nombre: 'PROGRAMA FICTICIO', territorial_nombre: 'Territorial Ficticia' }] };
      await database.query(`INSERT INTO academic_work_plan."PlanTrabajoAcademico"
        (id,"docenteId",periodo,estado,"datosEstructurados","createdAt","updatedAt")
        VALUES ($1,$2,'2026-2','APROBADO',$3,now(),now())`, [randomUUID(), docenteId, JSON.stringify(data)]);
      const result = await request(`/macro-docente?docenteId=${docenteId}&periodo=2026-2`);
      assert.equal(result.total, 1);
      assert.equal(result.items[0].asignatura_codigo, 'FICTICIA-1');
    });
    await check('Acceso externo funciona sin JWT, usa enlace RUND y respeta la revocación', async () => {
      const result = await request('/macro-docente/accesos-externos', { method: 'POST', status: 201,
        body: { enteNombre: 'ENTE FICTICIO', enteContacto: 'ente.ficticio@example.test', docenteId,
          fechaInicio: new Date(Date.now() - 60_000).toISOString(), fechaFin: new Date(Date.now() + 3600_000).toISOString() } });
      const access = result.data;
      const deadline = Date.now() + 5000;
      const expectedPath = `/services/rund/api/v1/pta/macro-docente/externo/${access.token}`;
      while (Date.now() < deadline && !JSON.stringify(notificationBodies).includes(expectedPath)) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert(JSON.stringify(notificationBodies).includes(publicBase + expectedPath), 'El correo externo debe apuntar al gateway RUND desde el frontend.');
      const external = await request(`${expectedPath}?periodo=2026-2`, { origin: publicBase, token: null });
      assert.equal(external.total, 1);
      await request(`/macro-docente/accesos-externos/${access.id}`, { method: 'DELETE' });
      await request(expectedPath, { origin: publicBase, token: null, status: 403 });
    });
    await check('Dos periodos conservan perfiles distintos y una sola persona/usuario', async () => {
      const result = await request('/banco-docentes/bulk', { method: 'POST', status: 201,
        body: workbookBody([{ ...row, PERIODO_CARGA: '2026-1', HORAS_PTA: 640 }]) });
      assert.equal(result.data.errors, 0, JSON.stringify(result.data.errorDetails));
      assert.equal(await profileCount(), 2);
      assert.equal(Number((await database.query('SELECT count(*) FROM auth.personas')).rows[0].count), 1);
      assert.equal(Number((await database.query('SELECT count(*) FROM auth."user"')).rows[0].count), 1);
      const first = await request(`/rund/interoperabilidad/perfiles/${row.DOCUMENTO_IDENTIDAD}?periodo=2026-1`);
      const second = await request(`/rund/interoperabilidad/perfiles/${row.DOCUMENTO_IDENTIDAD}?periodo=2026-2`);
      assert.notEqual(first.data.docente_id, second.data.docente_id);
      assert.equal(first.data.horas_programables, 640);
      assert.equal(second.data.horas_programables, 720);
    });
    await check('Perfil con id textual conserva consultas, documentos, bloques y auditoría', async () => {
      const legacyId = 'DOC-HISTORICO-FICTICIO-001';
      const personId = randomUUID();
      const userId = randomUUID();
      await database.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,dir_email)
        VALUES ($1,'9000000002','CC','PERFIL FICTICIO HISTORICO','PERFIL','FICTICIO','M','historico@example.test')`, [personId]);
      await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
        VALUES ($1,$2,'historico@example.test','HASH_FICTICIO',$3,true)`, [userId, randomUUID(), personId]);
      await database.query(`INSERT INTO auth.user_roles (id_user,id_rol,is_active)
        SELECT $1,id,true FROM auth.role WHERE code='DOCENTE'`, [userId]);
      await database.query(`INSERT INTO rund."Docente"
        SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d) || jsonb_build_object('id',$1::text,'personaId',$2::text,'idRund','RUND-HISTORICO-FICTICIO'))).*
        FROM rund."Docente" d WHERE id=$3`, [legacyId, personId, docenteId]);
      assert.equal((await request(`/rund/docente/${legacyId}`)).data.docenteId, legacyId);
      assert.equal((await request(`/rund/docente/${personId}`)).data.docenteId, legacyId);
      assert.equal((await request(`/rund/docente/${userId}`)).data.docenteId, legacyId);
      assert.equal((await request(`/banco-docentes/${legacyId}/bloques`)).data.length, 6);
      const uploaded = await request(`/banco-docentes/${legacyId}/documentos`, { method: 'POST', body: documentBody(pdf), status: 201 });
      assert.equal(uploaded.data.docenteId, legacyId);
      const audit = await request(`/banco-docentes/${legacyId}/auditoria`);
      assert(audit.data.length > 0);
      const joined = await database.query(`SELECT d.id FROM rund."Docente" d
        JOIN rund."RundCampoEstado" c ON c.docente_id=d.id
        JOIN rund."RundSoporteCampo" s ON s.docente_id=d.id
        JOIN rund."RundDocumentoPerfil" f ON f.docente_id=d.id
        JOIN rund."RundAprobacionLog" a ON a.docente_id=d.id WHERE d.id=$1`, [legacyId]);
      assert(joined.rows.length > 0);
      await request('/rund/docente/ID-TEXTUAL-NO-EXISTENTE', { status: 404 });
    });
    const permissionsForRole = async (code, permissions) => {
      const id = randomUUID();
      await database.query(`INSERT INTO auth.role (id,code,name,category,is_active) VALUES ($1,$2,$2,'personalizado',true)`, [id, code]);
      for (const permission of permissions) await database.query(`INSERT INTO auth.role_permissions (id_rol,id_permission,is_active)
        SELECT $1,id_permission,true FROM auth.permission WHERE code=$2`, [id, permission]);
      return jwt.sign({ sub: randomUUID(), roles: [code] }, { expiresIn: '10m' });
    };
    await check('JWT solo con roles permite CRUD base únicamente con permisos activos asignados', async () => {
      const token = await permissionsForRole('RUND_LECTOR_FICTICIO', ['rund.view']);
      assert.equal((await request('/docentes', { token })).total, 1);
      await request('/docentes', { token, method: 'POST', status: 403, body: { numeroDocumento: '9000090000', nombres: 'NO', apellidos: 'PERMITIDO' } });
      await request('/banco-docentes', { token, status: 403 });
      await request(`/macro-docente?periodo=2026-2`, { token, status: 403 });
      await database.query(`UPDATE auth.role_permissions SET is_active=false WHERE id_rol=(SELECT id FROM auth.role WHERE code='RUND_LECTOR_FICTICIO')`);
      await request('/docentes', { token, status: 403 });
    });
    await check('Consulta granular conserva enmascaramiento y rechaza edición, originales y permisos falsos', async () => {
      const token = await permissionsForRole('RUND_BANCO_LECTOR_FICTICIO', ['banco-docentes.rund.view']);
      const list = await request('/banco-docentes?periodoCarga=2026-2', { token });
      assert(list.items.length > 0);
      assert(list.items.every((item) => item.puntaje_salarial == null));
      assert(!JSON.stringify(list).includes('9000000001'));
      await request(`/banco-docentes/${docenteId}/documentos/${document.id}/contenido`, { token, status: 403 });
      await request(`/banco-docentes/${docenteId}/estado`, { token, method: 'PUT', status: 403, body: { estadoObjetivo: 'INACTIVO' } });
      await request('/docentes', { token, status: 403 });
      const forged = jwt.sign({ sub: randomUUID(), roles: ['SIN_GRANTS_FICTICIO'],
        permissions: ['rund.admin','banco-docentes.rund.manage','pta.macro_docente.gestionar_accesos_externos','*'] }, { expiresIn: '10m' });
      await request('/docentes', { token: forged, status: 403 });
      await request('/banco-docentes', { token: forged, status: 403 });
      await request('/macro-docente/accesos-externos', { token: forged, status: 403 });
      await database.query(`UPDATE auth.permission SET is_active=false WHERE code='banco-docentes.rund.view'`);
      await request('/banco-docentes', { token, status: 403 });
      await database.query(`UPDATE auth.permission SET is_active=true WHERE code='banco-docentes.rund.view'`);
    });
    await check('Permiso Macro Docente de consulta no concede administración externa ni acceso al banco', async () => {
      const token = await permissionsForRole('RUND_MACRO_LECTOR_FICTICIO', ['pta.macro_docente.consultar']);
      assert.equal((await request(`/macro-docente?docenteId=${docenteId}&periodo=2026-2`, { token })).total, 1);
      await request('/macro-docente/accesos-externos', { token, status: 403 });
      await request('/banco-docentes', { token, status: 403 });
      await database.query(`UPDATE auth.role SET is_active=false WHERE code='RUND_MACRO_LECTOR_FICTICIO'`);
      await request('/macro-docente?periodo=2026-2', { token, status: 403 });
    });
    await check('Permisos desactivados y fallo del repositorio se deniegan sin cache entre solicitudes', async () => {
      const token = await permissionsForRole('RUND_EDICION_FICTICIA', ['rund.edit']);
      await database.query(`UPDATE auth.permission SET is_active=false WHERE code='rund.edit'`);
      await request(`/docentes/${(await database.query('SELECT id_docente FROM rund.docente LIMIT 1')).rows[0].id_docente}`,
        { token, method: 'PUT', status: 403, body: { nombres: 'DENEGADO' } });
      await database.query(`UPDATE auth.permission SET is_active=true WHERE code='rund.edit'`);
      await database.query('ALTER TABLE auth.permission RENAME TO permission_ficticia_temporal');
      try { await request('/docentes', { token, status: 403 }); }
      finally { await database.query('ALTER TABLE auth.permission_ficticia_temporal RENAME TO permission'); }
    });
    await check('Auditoría y soporte fuente conservan su inmutabilidad', async () => {
      for (const sql of ['UPDATE rund."RundAprobacionLog" SET accion=accion',
        'DELETE FROM rund."RundCargaMasiva"', 'TRUNCATE rund."RundAccesoDatosLog"']) {
        await assert.rejects(database.query(sql), /inmutabl/);
      }
    });
    await check('Servicios externos aislados: correo solo al receptor ficticio local', async () => {
      assert(notificationCount > 0);
    });
    const cardYear = new Date().getFullYear();
    const cardSequence = async () => (await database.query('SELECT last_value::text,is_called FROM rund.numero_tarjeta_rund_seq')).rows[0];
    const nextCardValue = async () => { const state = await cardSequence(); return BigInt(state.last_value) + (state.is_called ? 1n : 0n); };
    const cardNumber = (value) => `RUND-${cardYear}-${value.toString().padStart(6, '0')}`;
    const cardMigration = fs.readFileSync(path.join(serviceRoot, 'db/migrations', migrationNames[4]), 'utf8');
    await check('Alta recupera una tarjeta ocupada sin sobrescribir el docente que ya la tenía', async () => {
      const occupied = await nextCardValue();
      await database.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
        VALUES ('9000000300','TARJETA','OCUPADA',$1)`, [cardNumber(occupied)]);
      const previous = (await database.query(`SELECT to_jsonb(d) AS row FROM rund.docente d WHERE numero_documento='9000000300'`)).rows;
      const result = await request('/docentes', { method: 'POST', status: 201,
        body: { numeroDocumento: '9000000301', nombres: 'ALTA', apellidos: 'RECUPERADA' } });
      assert.equal(result.numeroTarjetaRund, cardNumber(occupied + 1n));
      assert.deepEqual((await database.query(`SELECT to_jsonb(d) AS row FROM rund.docente d WHERE numero_documento='9000000300'`)).rows, previous);
    });
    await check('20 altas simultáneas y repetición concurrente de 005 mantienen tarjetas únicas', async () => {
      const bankBefore = (await database.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows;
      const creates = Array.from({ length: 20 }, (_, index) => request('/docentes', { method: 'POST', status: 201,
        body: { numeroDocumento: String(9000001000 + index), nombres: 'ALTA', apellidos: 'CONCURRENTE' } }));
      const [result] = await Promise.all([Promise.all(creates), database.query(cardMigration)]);
      assert.equal(new Set(result.map((item) => item.numeroTarjetaRund)).size, 20);
      assert(result.every((item) => /^RUND-\d{4}-\d{6,}$/.test(item.numeroTarjetaRund)));
      assert.deepEqual((await database.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows, bankBefore);
      const state = await cardSequence();
      await database.query(cardMigration);
      assert.deepEqual(await cardSequence(), state);
    });
    await check('Cinco colisiones devuelven 409 sin crear un registro parcial; el reintento conserva las tarjetas', async () => {
      const start = await nextCardValue();
      for (let index = 0; index < 5; index++) {
        await database.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
          VALUES ($1,'OCUPADA','CONSERVAR',$2)`, [String(9000002000 + index), cardNumber(start + BigInt(index))]);
      }
      const previous = (await database.query(`SELECT to_jsonb(d) AS row FROM rund.docente d
        WHERE numero_documento BETWEEN '9000002000' AND '9000002004' ORDER BY numero_documento`)).rows;
      const body = { numeroDocumento: '9000002010', nombres: 'ALTA', apellidos: 'REINTENTO' };
      await request('/docentes', { method: 'POST', status: 409, body });
      assert.equal(Number((await database.query(`SELECT count(*) FROM rund.docente WHERE numero_documento='9000002010'`)).rows[0].count), 0);
      const result = await request('/docentes', { method: 'POST', status: 201, body });
      assert.equal(result.numeroTarjetaRund, cardNumber(start + 5n));
      assert.deepEqual((await database.query(`SELECT to_jsonb(d) AS row FROM rund.docente d
        WHERE numero_documento BETWEEN '9000002000' AND '9000002004' ORDER BY numero_documento`)).rows, previous);
    });
    await check('Alta HTTP mantiene precisión por encima del entero seguro de JavaScript', async () => {
      await database.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
        VALUES ('9000003000','TARJETA','PRECISA','RUND-2099-9007199254740993')`);
      await database.query(cardMigration);
      const result = await request('/docentes', { method: 'POST', status: 201,
        body: { numeroDocumento: '9000003001', nombres: 'ALTA', apellidos: 'PRECISA' } });
      assert.equal(result.numeroTarjetaRund, `RUND-${cardYear}-9007199254740994`);
    });
    await check('Editar, emitir/verificar QR y desactivar mantienen la tarjeta anterior sin consumir secuencia', async () => {
      const original = 'RUND-2024-000123';
      const [docente] = (await database.query(`INSERT INTO rund.docente (numero_documento,nombres,apellidos,numero_tarjeta_rund)
        VALUES ('9000004000','TARJETA','ANTERIOR',$1) RETURNING id_docente`, [original])).rows;
      const before = await cardSequence();
      const updated = await request(`/docentes/${docente.id_docente}`, { method: 'PUT', body: { nombres: 'EDITADA' } });
      assert.equal(updated.numeroTarjetaRund, original);
      const issued = await request(`/tarjeta-digital/docente/${docente.id_docente}/emitir`, { method: 'POST', status: 201 });
      assert.equal(issued.docente.numeroTarjetaRund, original);
      assert.match(issued.qrCodeDataUrl, /^data:image\/png;base64,/);
      const verified = await request(`/tarjeta-digital/verificar/${issued.codigoVerificacion}`, { token: null });
      assert.equal(verified.docente.numeroTarjetaRund, original);
      const inactive = await request(`/docentes/${docente.id_docente}/estado`, { method: 'PATCH', body: { estado: 'INACTIVO' } });
      assert.equal(inactive.numeroTarjetaRund, original);
      await request(`/docentes/${docente.id_docente}`, { method: 'DELETE' });
      assert.equal((await database.query('SELECT numero_tarjeta_rund FROM rund.docente WHERE id_docente=$1', [docente.id_docente])).rows[0].numero_tarjeta_rund, original);
      assert.deepEqual(await cardSequence(), before);
    });
    const authSnapshot = async () => (await database.query(`SELECT 'personas' AS tabla,to_jsonb(p) AS fila FROM auth.personas p
      UNION ALL SELECT 'user',to_jsonb(u) FROM auth."user" u
      UNION ALL SELECT 'user_roles',to_jsonb(ur) FROM auth.user_roles ur
      UNION ALL SELECT 'role',to_jsonb(r) FROM auth.role r ORDER BY tabla,fila`)).rows;
    const rundSyncSnapshot = async () => (await database.query(`SELECT 'Docente' AS tabla,to_jsonb(d) AS fila FROM rund."Docente" d
      UNION ALL SELECT 'RundCampoEstado',to_jsonb(b) FROM rund."RundCampoEstado" b
      UNION ALL SELECT 'validacion_documental',to_jsonb(v) FROM rund.validacion_documental v
      UNION ALL SELECT 'RundAprobacionLog',to_jsonb(a) FROM rund."RundAprobacionLog" a ORDER BY tabla,fila`)).rows;
    const authIdentity = async (suffix, active = true, assigned = true) => {
      const pid = randomUUID(), uid = randomUUID();
      await database.query(`INSERT INTO auth.personas
        (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,dir_email,id_seccional,fec_creacion,fec_modificacion)
        VALUES ($1,$2,'CC',$3,'SYNC','FICTICIO','N',$4,999,CURRENT_DATE,CURRENT_DATE)`,
        [pid, '990000' + suffix, 'SYNC FICTICIO ' + suffix, 'sync-' + suffix + '@example.test']);
      await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
        VALUES ($1,$2,$3,'HASH FICTICIO NO UTILIZABLE',$4,$5)`, [uid,randomUUID(),'sync-' + suffix + '@example.test',pid,active]);
      await database.query(`INSERT INTO auth.user_roles (id_user,id_rol,is_active)
        SELECT $1,id,$2 FROM auth.role WHERE code='DOCENTE'`, [uid,assigned]);
      return { pid, uid };
    };
    const firstSyncIdentity = await authIdentity('0001');
    const secondSyncIdentity = await authIdentity('0002');
    const revokedSyncIdentity = await authIdentity('0003', true, false);
    const disabledSyncIdentity = await authIdentity('0004', false);
    authSyncPageSize = 1;
    await check('sync-from-auth consulta /users con credencial interna y UUID de rol; no altera auth ni perfiles existentes', async () => {
      const beforeAuth = await authSnapshot();
      const existingProfiles = (await database.query('SELECT * FROM rund."Docente" ORDER BY id')).rows;
      const result = await request('/banco-docentes/sync-from-auth', { method: 'POST', status: 201 });
      assert.equal(result.data.created, 2);
      assert.equal(result.data.failed, 0);
      assert(authSyncRequests.length > 1);
      assert(authSyncRequests.every(item => item.tokenMatches && !item.authorizationForwarded && !item.cookieForwarded && item.status === 'active'));
      assert(authSyncRequests.every(item => /^[0-9a-f-]{36}$/.test(item.role)));
      assert.deepEqual(await authSnapshot(), beforeAuth);
      assert.deepEqual((await database.query('SELECT * FROM rund."Docente" WHERE id=ANY($1::text[]) ORDER BY id', [existingProfiles.map(profile => profile.id)])).rows, existingProfiles);
      const rows = (await database.query('SELECT * FROM rund."Docente" WHERE "personaId"=ANY($1::uuid[]) ORDER BY id', [[firstSyncIdentity.pid,secondSyncIdentity.pid]])).rows;
      assert.equal(rows.length, 2);
      for (const row of rows) {
        assert.equal(row.estado, 'INACTIVO'); assert.equal(row.estadoAprobacion, 'PENDIENTE_APROBACION');
        assert.equal(row.tipoVinculacion, ''); assert.equal(row.dedicacion, ''); assert.equal(row.horasAsignables, 0);
        assert.equal(row.territorialId, '999'); assert.equal(row.puntajeSalarial, null);
        assert.equal(Number((await database.query('SELECT count(*) FROM rund."RundCampoEstado" WHERE docente_id=$1', [row.id])).rows[0].count), 6);
        assert.equal(Number((await database.query('SELECT count(*) FROM rund.validacion_documental WHERE docente_id=$1', [row.id])).rows[0].count), 24);
        const audit = (await database.query(`SELECT actor_id,ip,metadata FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND soporte_id='AUTH_SYNC'`, [row.id])).rows;
        assert.equal(audit.length, 1); assert.equal(audit[0].actor_id, actorId); assert.equal(audit[0].metadata.modo, 'solo_creacion');
      }
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."Docente" WHERE "personaId"=ANY($1::uuid[])', [[revokedSyncIdentity.pid,disabledSyncIdentity.pid]])).rows[0].count), 0);
    });
    await check('Repetir sync-from-auth no cambia perfiles, bloques, validaciones, auditoría ni reserva otro número', async () => {
      const before = await rundSyncSnapshot();
      const beforeAuth = await authSnapshot();
      const beforeSequence = (await database.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows;
      const result = await request('/banco-docentes/sync-from-auth', { method: 'POST', status: 201 });
      assert.equal(result.data.created, 0); assert.equal(result.data.failed, 0);
      assert.deepEqual(await rundSyncSnapshot(), before); assert.deepEqual(await authSnapshot(), beforeAuth);
      assert.deepEqual((await database.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows, beforeSequence);
    });
    await check('Falla HTTP o una página posterior impide una sincronización parcial o un éxito vacío', async () => {
      const before = await rundSyncSnapshot();
      const beforeAuth = await authSnapshot();
      for (const mode of ['unauthorized','fail-page-2']) {
        authSyncMode = mode;
        await request('/banco-docentes/sync-from-auth', { method: 'POST', status: 502 });
        assert.deepEqual(await rundSyncSnapshot(), before); assert.deepEqual(await authSnapshot(), beforeAuth);
      }
      authSyncMode = 'normal';
    });
    const concurrentIdentity = await authIdentity('0005');
    await check('Dos sync-from-auth simultáneos crean un solo perfil/bloques/auditoría de la misma persona', async () => {
      const beforeAuth = await authSnapshot();
      const results = await Promise.all([1,2].map(() => request('/banco-docentes/sync-from-auth', { method: 'POST', status: 201 })));
      assert.equal(results.reduce((sum,item) => sum + item.data.created, 0), 1);
      assert.equal(results.reduce((sum,item) => sum + item.data.failed, 0), 0);
      const rows = (await database.query('SELECT id FROM rund."Docente" WHERE "personaId"=$1', [concurrentIdentity.pid])).rows;
      assert.equal(rows.length, 1);
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."RundCampoEstado" WHERE docente_id=$1', [rows[0].id])).rows[0].count), 6);
      assert.equal(Number((await database.query(`SELECT count(*) FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND soporte_id='AUTH_SYNC'`, [rows[0].id])).rows[0].count), 1);
      assert.deepEqual(await authSnapshot(), beforeAuth);
    });
    const rollbackIdentity = await authIdentity('0006');
    const secondRollbackIdentity = await authIdentity('0007');
    await check('Falla al auditar sync-from-auth revierte el perfil y todas sus filas; repetirlo recupera la operación', async () => {
      const before = await rundSyncSnapshot(), beforeAuth = await authSnapshot();
      const previousAuditCount = Number((await database.query(`SELECT count(*) FROM rund."RundAprobacionLog" WHERE soporte_id='AUTH_SYNC'`)).rows[0].count);
      await database.query(`CREATE FUNCTION rund.reject_sync_ficticio() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.soporte_id='AUTH_SYNC' AND
          (SELECT count(*) FROM rund."RundAprobacionLog" WHERE soporte_id='AUTH_SYNC') > ${previousAuditCount}
          THEN RAISE EXCEPTION 'FALLA AUDITORIA FICTICIA'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_sync_ficticio BEFORE INSERT ON rund."RundAprobacionLog" FOR EACH ROW EXECUTE FUNCTION rund.reject_sync_ficticio()`);
      try {
        await request('/banco-docentes/sync-from-auth', { method: 'POST', status: 503 });
        assert.deepEqual(await rundSyncSnapshot(), before); assert.deepEqual(await authSnapshot(), beforeAuth);
      } finally { await database.query('DROP TRIGGER reject_sync_ficticio ON rund."RundAprobacionLog"; DROP FUNCTION rund.reject_sync_ficticio()'); }
      const result = await request('/banco-docentes/sync-from-auth', { method: 'POST', status: 201 });
      assert.equal(result.data.created, 2);
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."Docente" WHERE "personaId"=$1', [rollbackIdentity.pid])).rows[0].count), 1);
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."Docente" WHERE "personaId"=$1', [secondRollbackIdentity.pid])).rows[0].count), 1);
      assert.deepEqual(await authSnapshot(), beforeAuth);
    });
    await check('sync-from-auth conserva autorización RUND y no acepta datos de identidad del body', async () => {
      const before = await rundSyncSnapshot();
      await request('/banco-docentes/sync-from-auth', { method: 'POST', token: null, status: 401 });
      await request('/banco-docentes/sync-from-auth', { method: 'POST', token: teacherToken, status: 403 });
      await request('/banco-docentes/sync-from-auth', { method: 'POST', status: 201,
        body: { actorId: 'SUPLANTADO', usuarios: [{ id: randomUUID() }], authServiceUrl: 'http://otra.invalid' } });
      assert.deepEqual(await rundSyncSnapshot(), before);
    });
    await check('La invitación RUND usa la ruta pública propia del shell y conserva el token almacenado', async () => {
      const result = await request('/banco-docentes/invitaciones', { method: 'POST', status: 201,
        body: { correoInstitucional: 'invitacion-rund-ficticia@example.test' } });
      const token = result.data.tokenAcceso;
      assert(token);
      const expected = publicBase + '/rund/autogestion/docentes?token=' + token;
      assert(notificationBodies.some(body => JSON.stringify(body).includes(expected)));
      assert.equal((await database.query(`SELECT token_acceso FROM rund."BancoDocentesInvitaciones" WHERE correo_institucional=$1`,
        ['invitacion-rund-ficticia@example.test'])).rows[0].token_acceso, token);
    });
    await require('./verify-auth-document-versions.cjs')(pgConfig, runtime, check, { rundUrl: base, folderToken });
  } finally {
    await cleanup();
  }
  const report = { verifiedAt: new Date().toISOString(), postgresVersion, application: 'rund-service/dist/main.js',
    database: 'cluster temporal eliminado', syntheticDataOnly: true, applicationSynchronize: false,
    externalSchemas: 'auth: DDL + migración 158; academic_work_plan: fixtures ORM y periodo ficticio',
    publicRouting: 'proxy local de prueba: /services/rund/api/v1; no inicia Nginx ni api-gateway',
    authUserRouting: 'fixture HTTP local /users con UUID de rol, token interno, DTO y paginación; no inicia auth-service',
    migrations: migrationNames, passed: true, checks };
  fs.writeFileSync(path.join(root, 'docs/rund/validacion-servicio-postgres-local.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`OK: ${checks.length} comprobaciones; aplicación detenida y cluster temporal eliminado.`);
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
