/* Runners reales contra un cluster PostgreSQL temporal con SQL ficticio.
 * Docker es una función simulada: no se ejecuta ningún comando Docker ni despliegue.
 * Los únicos .env leídos se generan dentro del fixture. No usa bases existentes.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { randomBytes, createHash } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const { Client } = require(path.join(root, 'backend/rund-service/node_modules/pg'));
const bash = process.env.BASH_TEST_BINARY || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const pgBin = process.env.PG_BIN_DIR || 'C:/Program Files/PostgreSQL/15/bin';
const binary = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const files = ['migrate.local.sh', 'migrate.service.local.sh', ...['dev', 'qa', 'pre', 'prod'].map(e => `deploy.${e}.sh`)];
const sources = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')]));
const checks = [];
let runtime, database, port, started = false;
const password = randomBytes(24).toString('hex');
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const unix = value => value.replace(/\\/g, '/');
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
  runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'esap-migration-runners-'));
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const pwfile = path.join(runtime, 'password');
  fs.writeFileSync(pwfile, password, { mode: 0o600 });
  await command(binary('initdb'), ['-D', path.join(runtime, 'data'), '-U', 'postgres', '--auth=scram-sha-256', '--pwfile=' + pwfile, '--encoding=UTF8', '--locale=C']);
  await command(binary('pg_ctl'), ['-D', path.join(runtime, 'data'), '-l', path.join(runtime, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  started = true;
  fs.unlinkSync(pwfile);
  const config = { host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres', connectionTimeoutMillis: 5000 };
  const admin = new Client(config);
  await admin.connect();
  try { await admin.query('CREATE DATABASE esap_db'); } finally { await admin.end(); }
  database = new Client({ ...config, database: 'esap_db' });
  await database.connect();
});
after(async () => {
  if (database) await database.end();
  if (started || (runtime && fs.existsSync(path.join(runtime, 'data/postmaster.pid')))) {
    await command(binary('pg_ctl'), ['-D', path.join(runtime, 'data'), '-m', 'fast', '-w', 'stop']);
  }
  if (runtime) {
    const resolved = fs.realpathSync(runtime);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(resolved), /^esap-migration-runners-/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  const report = { executedAt: new Date().toISOString(), scope: 'temporary-postgresql-and-mocked-docker',
    existingDatabaseUsed: false, realEnvironmentFilesRead: false, deploymentExecuted: false,
    checks, hashes: Object.fromEntries([...files, 'scripts/verify-migration-runners.test.cjs'].map(file => [file,
      createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) };
  fs.writeFileSync(path.join(root, 'docs/rund/validacion-migraciones-local.json'), JSON.stringify(report, null, 2) + '\n');
});
async function fixture(sql = ['INSERT INTO auth.probe VALUES (1);', 'INSERT INTO auth.probe VALUES (2);']) {
  await database.query('DROP SCHEMA IF EXISTS auth CASCADE; CREATE SCHEMA auth; CREATE TABLE auth.probe (id int PRIMARY KEY);');
  const cwd = fs.mkdtempSync(path.join(runtime, 'case-'));
  const dir = path.join(cwd, 'backend/fixture-service/db/migrations');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(cwd, 'backend/auth-service'), { recursive: true });
  const env = `DB_HOST=127.0.0.1\nDB_PORT=${port}\nDB_USER=postgres\nDB_NAME=esap_db\nDB_SCHEMA=auth\nDB_PASS=${password}\n`;
  fs.writeFileSync(path.join(cwd, 'backend/auth-service/.env'), env);
  fs.writeFileSync(path.join(cwd, 'backend/fixture-service/.env'), env);
  sql.forEach((source, i) => fs.writeFileSync(path.join(dir, `00${i + 1}_fixture.sql`), source));
  fs.writeFileSync(path.join(cwd, 'untrusted.psqlrc'), '\\echo PSQLRC_LOADED\n\\set ON_ERROR_STOP off\n');
  return { cwd, dir, names: sql.map((_, i) => `00${i + 1}_fixture.sql`) };
}
function run(file, data, failure = '', conditional = true) {
  const deploy = file.startsWith('deploy.');
  fs.writeFileSync(path.join(data.cwd, 'runner.sh'), sources[file]);
  const prelude = `set -e
RED= GREEN= YELLOW= CYAN= NC=
psql() {
  if [[ " $* " != *" -X "* || " $* " != *" ON_ERROR_STOP=1 "* ]]; then echo missing-psql-flags; return 91; fi
  if [[ "$RUNNER_TEST_FAILURE" = setup && " $* " = *"CREATE TABLE"* ]]; then return 81; fi
  if [[ "$RUNNER_TEST_FAILURE" = history && " $* " = *"SELECT filename"* ]]; then return 82; fi
  ${quote(unix(binary('psql')))} "$@"
}
docker() {
  if [ "$1" = ps ]; then printf '%s\\n' superapp-db superapp-db-dev superapp-db-qa superapp-db-pre superapp-db-prod; return 0; fi
  if [ "$1" = cp ]; then [ "$RUNNER_TEST_FAILURE" != copy ]; return; fi
  if [ "$1" != exec ]; then echo unexpected-docker >&2; return 90; fi
  shift 2
  case "$1" in
    rm|mkdir) [ "$RUNNER_TEST_FAILURE" != prepare ]; return;;
    sh) if [ "$RUNNER_TEST_FAILURE" = list ]; then return 83; fi; printf '%s\\n' "$RUNNER_TEST_FILES"; return 0;;
    psql)
      shift
      local args=() arg
      for arg in "$@"; do
        case "$arg" in /tmp/migrations/backend-fixture-service/*) arg="backend/fixture-service/db/migrations/\${arg##*/}";; esac
        args+=("$arg")
      done
      psql -h 127.0.0.1 -p "$PGPORT" "\${args[@]}";;
    *) echo unexpected-docker-exec >&2; return 90;;
  esac
}
`;
  const functionSource = deploy && sources[file].match(/^cmd_db_migrate\(\) \{[\s\S]*?^\}/m)[0];
  // Exercise functions in an OR-list too: set -e is disabled in their bodies there.
  const script = prelude + (deploy ? functionSource + '\n' + (conditional
    ? 'cmd_db_migrate fixture-service || exit $?\n' : 'cmd_db_migrate fixture-service\n') : 'source ./runner.sh fixture-service\n');
  const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], { cwd: data.cwd, input: script,
    encoding: 'utf8', windowsHide: true, timeout: 20000,
    env: { ...process.env, PGPASSWORD: password, PGPORT: String(port), PGCONNECT_TIMEOUT: '5',
      PSQLRC: unix(path.join(data.cwd, 'untrusted.psqlrc')), RUNNER_TEST_FAILURE: failure,
      RUNNER_TEST_FILES: data.names.map(name => '/tmp/migrations/backend-fixture-service/' + name).reverse().join('\n') } });
  if (result.error) throw result.error;
  assert(!result.stdout.includes('missing-psql-flags'), result.stdout);
  assert(!result.stdout.includes('PSQLRC_LOADED'), result.stdout);
  return result;
}
async function ids() { return (await database.query('SELECT id FROM auth.probe ORDER BY id')).rows.map(row => row.id); }
async function history() { return (await database.query('SELECT filename FROM auth.migrations_db_log ORDER BY filename')).rows.map(row => row.filename); }
function scenario(file, name, body) {
  test(`${file}: ${name}`, async () => { await body(); checks.push(`${file}: ${name}`); });
}
for (const file of files) {
  scenario(file, 'éxito, BEGIN/COMMIT y CREATE INDEX CONCURRENTLY; segunda ejecución omite aplicadas', async () => {
    const data = await fixture(['BEGIN; INSERT INTO auth.probe VALUES (1); COMMIT;',
      'CREATE INDEX CONCURRENTLY probe_fixture_idx ON auth.probe(id); INSERT INTO auth.probe VALUES (2);']);
    const result = run(file, data);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(await ids(), [1, 2]);
    assert.equal((await history()).length, file === 'migrate.service.local.sh' ? 2 : 4);
    const again = run(file, data);
    assert.equal(again.status, 0, again.stdout + again.stderr);
    assert(!again.stdout.includes('OK:'));
    assert.deepEqual(await ids(), [1, 2]);
  });
  scenario(file, 'error SQL intermedio detiene archivo y siguientes; no registra éxito', async () => {
    const data = await fixture(['INSERT INTO auth.probe VALUES (1); SELECT migration_missing_fixture(); INSERT INTO auth.probe VALUES (3);',
      'INSERT INTO auth.probe VALUES (2);']);
    const result = run(file, data);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(await ids(), [1]);
    assert.deepEqual(await history(), []);
    assert(!result.stdout.includes('OK:'));
    assert(!result.stdout.includes('Migraciones completadas'));
    assert(result.stdout.includes('cambios parciales'));
  });
  scenario(file, 'error dentro de BEGIN revierte esa transacción y detiene la secuencia', async () => {
    const data = await fixture(['BEGIN; INSERT INTO auth.probe VALUES (1); SELECT migration_missing_fixture(); COMMIT;']);
    assert.notEqual(run(file, data).status, 0);
    assert.deepEqual(await ids(), []);
    assert.deepEqual(await history(), []);
  });
  scenario(file, 'fallo al registrar no deja alias parcial ni ejecuta otro archivo', async () => {
    const data = await fixture();
    await database.query(`CREATE TABLE auth.migrations_db_log(filename text PRIMARY KEY, executed_at timestamp DEFAULT now());
      CREATE FUNCTION auth.reject_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.filename = '001_fixture.sql' OR NEW.filename = 'fixture-service/001_fixture.sql' THEN RAISE EXCEPTION 'fixture log failure'; END IF;
        RETURN NEW; END $$;
      CREATE TRIGGER reject_fixture BEFORE INSERT ON auth.migrations_db_log FOR EACH ROW EXECUTE FUNCTION auth.reject_fixture();`);
    const result = run(file, data);
    assert.notEqual(result.status, 0);
    assert.deepEqual(await ids(), [1]);
    assert.deepEqual(await history(), []);
    assert(result.stdout.includes('no se pudo registrar'));
    assert(!result.stdout.includes('OK:'));
    assert(!result.stdout.includes('Migraciones completadas'));
  });
  for (const failure of ['setup', 'history']) scenario(file, `${failure}: fallo de prerrequisito detiene antes del SQL`, async () => {
    const data = await fixture();
    const result = run(file, data, failure);
    assert.notEqual(result.status, 0);
    assert.deepEqual(await ids(), []);
    assert(!result.stdout.includes('OK:'));
  });
  scenario(file, 'registro histórico por basename mantiene compatibilidad', async () => {
    const data = await fixture();
    await database.query("CREATE TABLE auth.migrations_db_log(filename text PRIMARY KEY, executed_at timestamp DEFAULT now()); INSERT INTO auth.migrations_db_log(filename) VALUES ('001_fixture.sql'), ('002_fixture.sql');");
    const result = run(file, data);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(await ids(), []);
    assert.equal((await history()).length, 2);
  });
  if (file.startsWith('deploy.')) {
    for (const failure of ['prepare', 'copy', 'list']) scenario(file, `${failure}: error Docker se propaga incluso en OR-list`, async () => {
      const data = await fixture();
      assert.notEqual(run(file, data, failure).status, 0);
      assert.deepEqual(await ids(), []);
    });
    scenario(file, 'invocación directa conserva el código de fallo SQL', async () => {
      const data = await fixture(['SELECT migration_missing_fixture();']);
      assert.notEqual(run(file, data, '', false).status, 0);
      assert.deepEqual(await history(), []);
    });
  }
}
