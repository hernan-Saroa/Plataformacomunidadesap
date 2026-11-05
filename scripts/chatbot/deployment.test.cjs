// Funciones reales de despliegue, Docker simulado y archivos ficticios privados.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const temporary = path.join(root, 'tmp/chatbot-deployment-tests');
fs.mkdirSync(temporary, { recursive: true });
const bash = process.env.BASH_TEST_BINARY || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const profileCode = fs.readFileSync(path.join(__dirname, 'compose-profile.sh'), 'utf8').replaceAll('\r\n', '\n');
function fixture(t, content = 'CHATBOT_AI_USE_SIDECAR=true\n') {
  const directory = fs.mkdtempSync(path.join(temporary, 'case-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), temporary);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const file = path.join(directory, 'profile.env'); fs.writeFileSync(file, content);
  return { directory, file: file.replaceAll('\\', '/') };
}
function run(script, env = {}) {
  const clean = { ...process.env };
  for (const key of Object.keys(clean)) if (key.startsWith('CHATBOT_')) delete clean[key];
  const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], { cwd: root, encoding: 'utf8',
    input: `set -e\n${profileCode}\n${script}`, env: { ...clean, ...env }, timeout: 20000 });
  if (result.error) throw result.error;
  return result;
}
for (const environment of ['dev', 'qa', 'pre', 'prod']) {
  const source = fs.readFileSync(path.join(root, `deploy.${environment}.sh`), 'utf8').replaceAll('\r\n', '\n');
  const wrapperName = environment === 'dev' ? 'compose_dev' : 'compose_env';
  for (const suffix of ['', '_mfe']) {
    const name = wrapperName + suffix;
    const wrapper = source.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'))?.[0];
    assert(wrapper);
    test(`${environment}${suffix}: desplegar otro módulo no depende de un perfil defectuoso del chatbot`, (t) => {
      const f = fixture(t, 'DB_PASSWORD=not-a-chatbot-setting\nCHATBOT_CA_CERT_FILE=/missing/cert.pem\n');
      const result = run(`
COMPOSE_FILE_DEV=base.yml COMPOSE_FILE_ENV=base.yml COMPOSE_FILE_MFE=mfe.yml ENV_FILE=environment.env
ENV_NETWORK_KEY=original-network ENV_CONTAINER_SUFFIX=original-suffix SERVER_URL_ENV=https://fixture.invalid
RUND_DOCUMENTAL_ENABLED=false
docker() { printf '%s\\n' "$*"; }
${wrapper}
${name} up -d --no-deps auth-service
`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
      assert.equal(result.status, 0, result.stderr);
      assert(result.stdout.includes('up -d --no-deps auth-service'));
      assert(!result.stdout.includes('docker-compose.chatbot-'));
    });
    for (const sidecar of ['true', 'false']) test(`${environment}${suffix}: perfil ${sidecar === 'true' ? 'local' : 'remoto'} conserva el resto del despliegue`, (t) => {
      const f = fixture(t, `CHATBOT_AI_USE_SIDECAR=${sidecar}\nCHATBOT_ISOLUCION_PASSWORD='fake-$value'\n`);
      const result = run(`
COMPOSE_FILE_DEV=base.yml COMPOSE_FILE_ENV=base.yml COMPOSE_FILE_MFE=mfe.yml ENV_FILE=environment.env
ENV_NETWORK_KEY=original-network ENV_CONTAINER_SUFFIX=original-suffix SERVER_URL_ENV=https://fixture.invalid
RUND_DOCUMENTAL_ENABLED=true RUND_DOCUMENTAL_PERSISTENT=true
rund_documental_preflight() { echo rund-guard-preserved; }
docker() { printf '%s\\n' "$*"; }
${wrapper}
${name} up -d --no-deps chatbot-service
`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
      assert.equal(result.status, 0, result.stderr);
      assert(result.stdout.includes('rund-guard-preserved'));
      assert(result.stdout.includes('docker-compose.rund-documental.yml'));
      assert(result.stdout.includes('docker-compose.chatbot-config.yml'));
      assert.equal(result.stdout.includes('docker-compose.chatbot-knowledge.yml'), sidecar === 'true');
      assert(result.stdout.endsWith('up -d --no-deps chatbot-service\n'));
      assert(!result.stdout.includes('fake-$value'));
      if (suffix) assert(result.stdout.includes('-f mfe.yml'));
    });
  }
}
test('sin perfil no agrega opciones ni requisitos', () => {
  const result = run('chatbot_prepare_compose qa\nprintf "%s" "${#CHATBOT_COMPOSE_ARGS[@]}"');
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, '0');
});

test('la selección distingue arranque completo de operaciones dirigidas a otros módulos', () => {
  const result = run(`
chatbot_command_needs_profile up -d --wait-timeout 120
chatbot_command_needs_profile up -d --no-deps chatbot-service
if chatbot_command_needs_profile up -d --no-deps auth-service; then exit 1; fi
if chatbot_command_needs_profile config --services; then exit 1; fi
echo selection-ok
`);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, 'selection-ok\n');
});
test('un archivo explícito inexistente detiene la operación', (t) => {
  const f = fixture(t);
  const result = run('chatbot_prepare_compose qa\necho unexpected-deploy', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file + '.missing' });
  assert.notEqual(result.status, 0); assert(!result.stdout.includes('unexpected-deploy'));
});
test('un perfil del chatbot no puede cambiar claves DB, JWT o RUND de otros módulos', (t) => {
  for (const key of ['DB_PASSWORD', 'JWT_SECRET', 'RUND_OCR_URL']) {
    const f = fixture(t, `${key}=fake-secret-do-not-print\n`);
    const result = run('chatbot_prepare_compose qa\necho unexpected-deploy', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
    assert.notEqual(result.status, 0); assert(!result.stdout.includes('unexpected-deploy'));
    assert(!result.stderr.includes('fake-secret-do-not-print'));
  }
});
test('el archivo se interpreta como datos y no como órdenes del shell', (t) => {
  const f = fixture(t);
  const marker = path.join(f.directory, 'must-not-exist').replaceAll('\\', '/');
  fs.writeFileSync(f.file, `CHATBOT_AI_USE_SIDECAR=true\nCHATBOT_ISOLUCION_PASSWORD=$(printf unsafe > '${marker}')\n`);
  const result = run('chatbot_prepare_compose qa\necho profile-ok', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, 'profile-ok\n');
  assert(!fs.existsSync(marker), 'El contenido del perfil nunca debe ejecutarse como un script');
});
test('la CA se monta por un overlay exclusivo y falla si no existe', (t) => {
  const f = fixture(t); const ca = path.join(f.directory, 'ca.pem').replaceAll('\\', '/');
  fs.writeFileSync(ca, 'PUBLIC SYNTHETIC CA');
  fs.appendFileSync(f.file, `CHATBOT_CA_CERT_FILE='${ca}'\n`);
  const result = run('chatbot_prepare_compose qa\nprintf "%s\\n" "${CHATBOT_COMPOSE_ARGS[@]}"', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr); assert(result.stdout.includes('docker-compose.chatbot-ca.yml'));
  const missing = run('chatbot_prepare_compose qa', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file, CHATBOT_CA_CERT_FILE: ca + '.missing' });
  assert.notEqual(missing.status, 0);
});

test('la red de monitorización se añade solo al chatbot y no inicia RUND', (t) => {
  const f = fixture(t, 'CHATBOT_AI_USE_SIDECAR=true\nCHATBOT_AI_OCR_NETWORK=existing-ocr-network\n');
  const result = run('chatbot_prepare_compose qa\nprintf "%s\\n" "${CHATBOT_COMPOSE_ARGS[@]}"', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr);
  assert(result.stdout.includes('docker-compose.chatbot-ocr-guard.yml'));
  assert(!result.stdout.includes('docker-compose.rund-ocr.yml'));
});
for (const environment of ['dev', 'qa', 'pre', 'prod']) test(`${environment}: init no guarda secretos, asigna aislamiento y no sobrescribe archivos`, (t) => {
  const f = fixture(t); fs.unlinkSync(f.file);
  const result = run(`source scripts/chatbot/manage.sh ${environment} init`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr);
  const content = fs.readFileSync(f.file, 'utf8');
  assert(/^CHATBOT_AI_ENABLED=true$/m.test(content));
  assert(/^CHATBOT_ISOLUCION_PASSWORD=$/m.test(content)); assert(/^CHATBOT_ISOLUCION_WEB_PASSWORD=$/m.test(content));
  assert(content.includes(`CHATBOT_AI_NETWORK=esap-chatbot-ai${environment === 'dev' ? '' : '-' + environment}_default`));
  assert(content.includes(`CHATBOT_OLLAMA_BIND_PORT=${{ dev: 11436, qa: 11446, pre: 11456, prod: 11466 }[environment]}`));
  const again = run(`source scripts/chatbot/manage.sh ${environment} init`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.notEqual(again.status, 0); assert.equal(fs.readFileSync(f.file, 'utf8'), content);
});
test('deploy comprueba la fuente antes de reemplazar exclusivamente el chatbot', (t) => {
  const f = fixture(t);
  const result = run(`docker() { printf '%s\\n' "$*"; }\nsource scripts/chatbot/manage.sh qa deploy`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr);
  assert(result.stdout.indexOf('dist/diagnose-knowledge.js --require-enabled') < result.stdout.indexOf('up -d --no-deps chatbot-service'));
  assert(!/\b(?:down|prune|restart|rund-ocr|rund-ollama)\b/.test(result.stdout));
  const failure = run(`docker() { if [[ "$*" == *dist/diagnose-knowledge.js* ]]; then return 1; fi; printf '%s\\n' "$*"; }\nsource scripts/chatbot/manage.sh qa deploy`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.notEqual(failure.status, 0); assert(!failure.stdout.includes('up -d'));
});
test('install-ai usa un proyecto propio y solo descarga Qwen', (t) => {
  const f = fixture(t);
  const result = run(`docker() { printf '%s\\n' "$*"; }\nsource scripts/chatbot/manage.sh qa install-ai`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr);
  assert(result.stdout.includes('-p esap-chatbot-ai-qa')); assert(result.stdout.includes('ollama pull qwen3.5:9b'));
  assert(!result.stdout.includes('gemma')); assert(!result.stdout.includes('rund-'));
});

test('el perfil remoto no instala una IA local ni necesita su red', (t) => {
  const f = fixture(t); fs.unlinkSync(f.file);
  const created = run('source scripts/chatbot/manage.sh qa init remote', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(created.status, 0, created.stderr);
  const content = fs.readFileSync(f.file, 'utf8');
  assert(/^CHATBOT_AI_USE_SIDECAR=false$/m.test(content));
  const install = run('docker() { echo unexpected-local-install; return 1; }\nsource scripts/chatbot/manage.sh qa install-ai', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(install.status, 0, install.stderr); assert(!install.stdout.includes('unexpected-local-install'));
});

test('espacios, comentarios y comillas del perfil no convierten IA remota en instalación local', (t) => {
  const f = fixture(t, "  # Comentario de configuracion\r\n  CHATBOT_AI_USE_SIDECAR = 'false'  # servidor remoto\r\nCHATBOT_ISOLUCION_PASSWORD='fake-$literal with spaces'\r\n");
  const result = run('docker() { echo unexpected-local-install; return 1; }\nsource scripts/chatbot/manage.sh qa install-ai', { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
  assert.equal(result.status, 0, result.stderr);
  assert(!result.stdout.includes('unexpected-local-install'));
  assert(!result.stdout.includes('fake-$literal'));
  for (const value of ["'false #not-a-boolean'", 'false#not-a-comment', 'remote']) {
    const invalid = fixture(t, `CHATBOT_AI_USE_SIDECAR=${value}\n`);
    const rejected = run('chatbot_prepare_compose qa\necho unexpected-valid', { CHATBOT_KNOWLEDGE_ENV_FILE: invalid.file });
    assert.notEqual(rejected.status, 0); assert(!rejected.stdout.includes('unexpected-valid'));
  }
});

test('errores en opciones se rechazan antes de escribir o ejecutar Docker', (t) => {
  for (const args of ['qa init remot', 'qa deploy remote', 'qa install-ai --force']) {
    const f = fixture(t); const before = fs.readFileSync(f.file, 'utf8');
    const result = run(`docker() { echo unexpected-docker; return 0; }\nsource scripts/chatbot/manage.sh ${args}`, { CHATBOT_KNOWLEDGE_ENV_FILE: f.file });
    assert.notEqual(result.status, 0, args);
    assert(!result.stdout.includes('unexpected-docker'), args);
    assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  }
  const fresh = fixture(t); fs.unlinkSync(fresh.file);
  const invalidInit = run('source scripts/chatbot/manage.sh qa init remot', { CHATBOT_KNOWLEDGE_ENV_FILE: fresh.file });
  assert.notEqual(invalidInit.status, 0); assert(!fs.existsSync(fresh.file));
});
test('el lockfile y las automatizaciones incluyen el chatbot con validación antes de publicar', () => {
  const manifest = require('../../backend/chatbot-service/package.json');
  const lock = require('../../backend/chatbot-service/package-lock.json');
  assert.deepEqual(lock.packages[''].dependencies, manifest.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, manifest.devDependencies);
  for (const environment of ['dev', 'qa', 'pre', 'prod']) {
    const text = fs.readFileSync(path.join(root, `.github/workflows/build-backend-${environment}.yml`), 'utf8');
    assert.equal((text.match(/^          - chatbot-service$/gm) || []).length, 1);
    assert(text.includes("if: matrix.service == 'chatbot-service'"));
    assert(text.includes('npm run test:ci --prefix backend/chatbot-service'));
    assert(text.indexOf('npm run test:ci --prefix backend/chatbot-service') < text.indexOf('docker/build-push-action'));
  }
});

test('los perfiles privados se ignoran y el lockfile del chatbot puede versionarse', () => {
  for (const environment of ['dev', 'qa', 'pre', 'prod']) {
    const ignored = spawnSync('git', ['check-ignore', '--no-index', '--quiet', `backend/chatbot-service/.env.knowledge.${environment}`], { cwd: root, windowsHide: true });
    assert.equal(ignored.status, 0);
  }
  const lock = spawnSync('git', ['check-ignore', '--no-index', '--quiet', 'backend/chatbot-service/package-lock.json'], { cwd: root, windowsHide: true });
  assert.equal(lock.status, 1);
  const example = fs.readFileSync(path.join(root, 'backend/chatbot-service/knowledge.env.example'), 'utf8');
  assert(/^CHATBOT_ISOLUCION_PASSWORD=$/m.test(example)); assert(/^CHATBOT_ISOLUCION_WEB_PASSWORD=$/m.test(example));
});
