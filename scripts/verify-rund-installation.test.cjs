// Pruebas en un clúster nuevo, con migraciones reales y personas ficticias.
// No lee .env ni usa instalaciones, bases o servicios existentes.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { inventory, inspectDatabase, migrationFiles, permissionCodes } = require('./lib/rund-installation-review.cjs');
const root = path.resolve(__dirname, '..');
const { Client } = require(path.join(root, 'backend/rund-service/node_modules/pg'));
const pgBin = process.env.PG_BIN_DIR || 'C:/Program Files/PostgreSQL/15/bin';
const binary = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const checks = [];
let runtime, database, config, started = false, initialSnapshot;
const person = randomUUID();
function command(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    const timer = setTimeout(() => child.kill(), 60000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => {
      clearTimeout(timer); child.stdout.destroy(); child.stderr.destroy();
      code === 0 ? resolve(output) : reject(new Error(`${path.basename(executable)} (${code}): ${output}`));
    });
  });
}
before(async () => {
  runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'esap-rund-installation-'));
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const password = randomBytes(24).toString('hex');
  const pwfile = path.join(runtime, 'password');
  fs.writeFileSync(pwfile, password, { mode: 0o600 });
  await command(binary('initdb'), ['-D', path.join(runtime, 'data'), '-U', 'postgres', '--auth=scram-sha-256', '--pwfile=' + pwfile, '--encoding=UTF8', '--locale=C']);
  await command(binary('pg_ctl'), ['-D', path.join(runtime, 'data'), '-l', path.join(runtime, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  started = true; fs.unlinkSync(pwfile);
  config = { host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres', connectionTimeoutMillis: 5000 };
  database = new Client(config); await database.connect();
  await database.query(fs.readFileSync(path.join(root, 'db/init/003_auth_ddl_20260129_215539.sql'), 'utf8'));
  await database.query('SET search_path TO public');
  for (const file of migrationFiles) await database.query(fs.readFileSync(path.join(root, file), 'utf8'));
  await database.query('CREATE TABLE IF NOT EXISTS auth.migrations_db_log(filename text PRIMARY KEY)');
  for (const file of migrationFiles) await database.query('INSERT INTO auth.migrations_db_log(filename) VALUES ($1)', [file]);
  await database.query(`INSERT INTO auth.personas(id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero)
    VALUES ($1,'FIXTURE-2099','CC','Persona ficticia','Persona ficticia','M')`, [person]);
  await database.query(`INSERT INTO rund."Docente"(id,"personaId","territorialId","tipoVinculacion",dedicacion,"updatedAt","periodoCarga")
    VALUES ('fixture-profile',$1,'fixture-territorial','fixture','fixture',now(),'2099-1')`, [person]);
  initialSnapshot = await snapshot();
});
after(async () => {
  if (database) await database.end();
  if (started || (runtime && fs.existsSync(path.join(runtime, 'data/postmaster.pid'))))
    await command(binary('pg_ctl'), ['-D', path.join(runtime, 'data'), '-m', 'fast', '-w', 'stop']);
  if (runtime) {
    const resolved = fs.realpathSync(runtime);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(resolved), /^esap-rund-installation-/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  const files = ['scripts/review-rund-installation.cjs', 'scripts/lib/rund-installation-review.cjs', 'scripts/verify-rund-installation.test.cjs', ...migrationFiles];
  const report = { verifiedAt: new Date().toISOString(), scope: 'temporary-postgresql-and-offline-cli',
    existingDatabaseUsed: false, realEnvironmentFilesRead: false, containersStarted: false,
    checks, hashes: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) };
  fs.writeFileSync(path.join(root, 'docs/rund/validacion-verificador-instalacion-local.json'), JSON.stringify(report, null, 2) + '\n');
});
async function snapshot() {
  const result = await database.query(`SELECT jsonb_build_object(
    'personas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id_person) FROM auth.personas p),
    'perfiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM rund."Docente" p),
    'revisiones',(SELECT jsonb_agg(to_jsonb(p) ORDER BY persona_id) FROM auth.carpeta_revision_rund p),
    'historial',(SELECT jsonb_agg(to_jsonb(p) ORDER BY filename) FROM auth.migrations_db_log p)) AS state`);
  return result.rows[0].state;
}
const find = (result, id) => { const check = result.checks.find(item => item.id === id); assert(check, id); return check; };
function scenario(name, work) { test(name, async () => { await work(); checks.push(name); }); }
async function temporaryChange(sql, work) {
  // Only this fixture changes its own new database. Each change is explicitly reverted.
  await database.query(sql);
  try { await work(); } finally {
    for (const file of migrationFiles) if (/667_|668_/.test(file)) await database.query(fs.readFileSync(path.join(root, file), 'utf8'));
  }
}
scenario('migraciones reales satisfacen el alcance comprobado y conservan todos los datos', async () => {
  const result = await inspectDatabase(database);
  assert.equal(result.status, 'checked_scope_passed', JSON.stringify(result.checks.filter(check => check.status !== 'pass')));
  assert.equal(result.transactionReadOnly, true);
  assert.equal(result.activationReadiness, 'not_verified');
  assert.deepEqual(await snapshot(), initialSnapshot);
  assert.equal((await database.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'off');
});
scenario('el servidor impide escrituras dentro de la revisión, incluso con usuario administrador', async () => {
  let attempted = false, code;
  const guarded = { query: async (sql, params) => {
    if (!attempted && sql.startsWith('SELECT c.relkind')) {
      attempted = true;
      try { await database.query("INSERT INTO auth.migrations_db_log VALUES ('must-not-exist')"); } catch (error) { code = error.code; }
      await database.query('ROLLBACK TO SAVEPOINT rund_review_probe');
    }
    return database.query(sql, params);
  } };
  assert.equal((await inspectDatabase(guarded)).status, 'checked_scope_passed');
  assert.equal(code, '25006');
  assert.deepEqual(await snapshot(), initialSnapshot);
});
scenario('tabla faltante y tipo alterado se detectan aunque el historial diga aplicada', async () => {
  await database.query('ALTER TABLE rund.carpeta_auth_documento RENAME TO carpeta_auth_documento_fixture; ALTER TABLE rund.carpeta_auth_sync ALTER COLUMN revision TYPE numeric');
  try {
    const result = await inspectDatabase(database);
    assert.equal(find(result, 'relation:rund.carpeta_auth_documento').status, 'fail');
    assert.equal(find(result, 'column:rund.carpeta_auth_sync.revision').status, 'fail');
    assert.equal(find(result, 'history:007_rund_carpeta_auth_proyeccion.sql').recorded, true);
    assert.equal(result.status, 'requires_review');
  } finally { await database.query('ALTER TABLE rund.carpeta_auth_documento_fixture RENAME TO carpeta_auth_documento; ALTER TABLE rund.carpeta_auth_sync ALTER COLUMN revision TYPE bigint'); }
});
scenario('trigger deshabilitado o con eventos incorrectos bloquea el alcance de revisión', async () => {
  await database.query('ALTER TABLE auth.personas DISABLE TRIGGER persona_revision_rund');
  try { assert.equal(find(await inspectDatabase(database), 'trigger:persona_revision_rund').status, 'fail'); }
  finally { await database.query('ALTER TABLE auth.personas ENABLE TRIGGER persona_revision_rund'); }
  await temporaryChange(`DROP TRIGGER documento_revision_rund ON auth.documento_carpeta_digital;
    CREATE TRIGGER documento_revision_rund AFTER UPDATE ON auth.documento_carpeta_digital FOR EACH ROW EXECUTE FUNCTION auth.documento_revision_rund()`, async () => {
    assert.equal(find(await inspectDatabase(database), 'trigger:documento_revision_rund').status, 'fail');
  });
});
scenario('restricción ausente se detecta sin recrearla', async () => {
  await database.query('ALTER TABLE auth.documento_carpeta_version DROP CONSTRAINT documento_version_numero_unique');
  try { assert.equal(find(await inspectDatabase(database), 'constraints:version-identity').status, 'fail'); }
  finally { await database.query('ALTER TABLE auth.documento_carpeta_version ADD CONSTRAINT documento_version_numero_unique UNIQUE(documento_id,numero_version)'); }
});
scenario('catálogo incompleto no se corrige ni concede roles automáticamente', async () => {
  await database.query('UPDATE auth.permission SET is_active=false WHERE code=$1', [permissionCodes[0]]);
  try { assert.deepEqual(find(await inspectDatabase(database), 'catalog:rund-permissions').missingCodes, [permissionCodes[0]]); }
  finally { await database.query('UPDATE auth.permission SET is_active=true WHERE code=$1', [permissionCodes[0]]); }
});
scenario('persona inexistente se informa con conteos, sin exponer identidad ni perfil', async () => {
  await database.query('UPDATE rund."Docente" SET "personaId"=$1 WHERE id=$2', [randomUUID(), 'fixture-profile']);
  try {
    const result = await inspectDatabase(database);
    assert.equal(find(result, 'identity:canonical-person').unlinkedProfiles, '1');
    assert.equal(find(result, 'identity:canonical-person').status, 'fail');
    assert(!JSON.stringify(result).includes(person));
    assert(!JSON.stringify(result).includes('fixture-profile'));
  } finally { await database.query('UPDATE rund."Docente" SET "personaId"=$1 WHERE id=$2', [person, 'fixture-profile']); }
});
scenario('perfiles duplicados se dejan para revisión sin fusionarlos', async () => {
  // The index distinguishes whitespace; the diagnosis groups empty/blank periods.
  await database.query('UPDATE rund."Docente" SET "periodoCarga"=$1 WHERE id=$2', ['', 'fixture-profile']);
  try {
    await database.query(`INSERT INTO rund."Docente"(id,"personaId","territorialId","tipoVinculacion",dedicacion,"updatedAt","periodoCarga")
      VALUES ('fixture-duplicate',$1,'fixture','fixture','fixture',now(),' ')`, [person]);
    const result = await inspectDatabase(database);
    assert.equal(find(result, 'identity:duplicate-periods').status, 'review_required');
    assert.equal(find(result, 'identity:canonical-person').profilesWithoutPeriod, '2');
    assert.equal(find(result, 'identity:canonical-person').status, 'review_required');
  } finally {
    await database.query("DELETE FROM rund.\"Docente\" WHERE id='fixture-duplicate'");
    await database.query('UPDATE rund."Docente" SET "periodoCarga"=$1 WHERE id=$2', ['2099-1','fixture-profile']);
  }
});
scenario('error de consulta aislado no se vuelve éxito ni oculta las otras comprobaciones', async () => {
  const failing = { query: (sql, params) => {
    if (sql.includes('SELECT p.code FROM auth.permission')) return database.query('SELECT missing_fixture_function()');
    return database.query(sql, params);
  } };
  const result = await inspectDatabase(failing);
  assert.equal(find(result, 'catalog:rund-permissions').status, 'not_verified');
  assert.equal(find(result, 'identity:canonical-person').status, 'pass');
  assert(!JSON.stringify(result).includes('missing_fixture_function'));
});
scenario('historial ausente conserva estado sin verificar y no crea tabla de control', async () => {
  await database.query('ALTER TABLE auth.migrations_db_log RENAME TO migrations_db_log_fixture');
  try {
    const result = await inspectDatabase(database);
    assert.equal(find(result, 'history:007_rund_carpeta_auth_proyeccion.sql').status, 'not_verified');
    assert.equal((await database.query("SELECT to_regclass('auth.migrations_db_log') AS value")).rows[0].value, null);
  } finally { await database.query('ALTER TABLE auth.migrations_db_log_fixture RENAME TO migrations_db_log'); }
});
scenario('rol de revisión sin SELECT no certifica la instalación ni publica el error privado', async () => {
  await database.query('CREATE ROLE rund_review_fixture; SET ROLE rund_review_fixture');
  try {
    const result = await inspectDatabase(database);
    assert.equal(result.status, 'requires_review');
    assert.equal(find(result, 'relation:rund.Docente').status, 'fail');
    assert.equal(find(result, 'identity:canonical-person').status, 'not_verified');
    assert(!JSON.stringify(result).includes('permission denied'));
  } finally { await database.query('RESET ROLE; DROP ROLE rund_review_fixture'); }
});
scenario('inventario distingue fuentes locales de imágenes e instalaciones publicadas', async () => {
  const report = inventory(root);
  assert.equal(report.migrations.length, 12);
  assert(report.migrations.every(file => file.status === 'present'));
  assert.deepEqual(report.environments.map(item => item.environment), ['local', 'dev', 'qa', 'pre', 'prod']);
  assert(report.environments.every(item => !item.installationChecked && !item.publishedArtifactsVerified && item.publishedImageDigest === null));
});
function cli(args, overrides = {}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG|^DATABASE_URL$/.test(key)));
  const result = spawnSync(process.execPath, ['scripts/review-rund-installation.cjs', ...args], { cwd: root,
    encoding: 'utf8', timeout: 15000, windowsHide: true, env: { ...env, ...overrides } });
  if (result.error) throw result.error;
  return result;
}
scenario('CLI no conecta por defecto aunque existan variables PG heredadas', async () => {
  const result = cli(['--output', 'docs/rund/revision-artefactos-fixture.json'], { PGHOST: 'unreachable.invalid', PGPASSWORD: 'PRIVATE_FIXTURE_SECRET' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const filename = path.join(root, 'docs/rund/revision-artefactos-fixture.json');
  try {
    const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.equal(report.mode, 'repository-only');
    assert.equal(report.database.status, 'not_verified');
    assert(!JSON.stringify(report).includes('PRIVATE_FIXTURE_SECRET'));
  } finally { fs.unlinkSync(filename); }
});
scenario('CLI exige ambiente y conexión explícitos; no imprime configuración privada', async () => {
  for (const args of [['--database'], ['--database', '--environment', 'local'], ['--environment', 'other'], ['--environment'], ['--unknown'],
    ['--output'], ['--output', 'backend/rund-service/.env'], ['--output', 'docs/rund/ACTIVACION-CARPETA-DIGITAL.md']]) {
    const result = cli(args, { PGPASSWORD: 'PRIVATE_FIXTURE_SECRET' });
    assert.notEqual(result.status, 0, args.join(' '));
    assert(!result.stdout.includes('PRIVATE_FIXTURE_SECRET') && !result.stderr.includes('PRIVATE_FIXTURE_SECRET'));
  }
});
scenario('CLI de base ejecuta solo lectura sobre el clúster ficticio y genera evidencia sin secretos', async () => {
  const result = cli(['--database', '--environment', 'local', '--output', 'docs/rund/revision-instalacion-fixture.json'],
    { PGHOST: config.host, PGPORT: String(config.port), PGUSER: config.user, PGDATABASE: config.database, PGPASSWORD: config.password });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const filename = path.join(root, 'docs/rund/revision-instalacion-fixture.json');
  try {
    const content = fs.readFileSync(filename, 'utf8'), report = JSON.parse(content);
    assert(!content.includes(config.password)); assert(!content.includes(person));
    assert.equal(report.database.transactionReadOnly, true);
    assert.equal(report.activationReadiness, 'not_verified');
    assert.equal(report.database.status, 'checked_scope_passed');
  } finally { fs.unlinkSync(filename); }
  assert.deepEqual(await snapshot(), initialSnapshot);
});
