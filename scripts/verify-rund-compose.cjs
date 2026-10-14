/* Valida Compose sin daemon, sin leer .env reales y sin crear contenedores/volúmenes.
 * --capture <archivo>: guarda hashes de los módulos ajenos a RUND antes de un cambio.
 * --compare <archivo>: comprueba que esos módulos sigan idénticos después del cambio.
 * --carpeta: amplía el alcance a auth + RUND y verifica su contrato interno de lectura.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '..');
const executable = process.env.COMPOSE_BIN || (process.platform === 'win32'
  ? 'C:/Program Files/Docker/Docker/resources/cli-plugins/docker-compose.exe' : 'docker');
const commandPrefix = /^docker(?:\.exe)?$/i.test(path.basename(executable)) ? ['compose'] : [];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'esap-rund-compose-'));
const envFile = path.join(temporary, 'empty.env');
fs.writeFileSync(envFile, '');
const args = process.argv.slice(2);
const carpetaMode = args.includes('--carpeta');
const capturePath = args[0] === '--capture' ? args[1] : null;
const comparePath = args[0] === '--compare' ? args[1] : null;
const environments = ['dev', 'qa', 'pre', 'prod'];
const cases = [
  { name: 'base', files: ['docker-compose.yml'], origin: 'http://localhost:5173', storage: 'bind' },
  { name: 'backend', files: ['docker-compose.backend.yml'], origin: 'http://localhost:3000', storage: 'bind' },
  { name: 'local', files: ['docker-compose.local.yml'], origin: 'http://localhost', storage: 'volume' },
  ...environments.flatMap((env) => {
    const base = `docker-compose.${env}.yml`;
    const ghcr = env === 'dev' ? 'docker-compose.ghcr.yml' : `docker-compose.${env}.ghcr.yml`;
    const origin = { dev: 'http://4.156.71.181', qa: 'http://135.237.81.133', pre: 'http://172.16.202.222', prod: 'https://comunidadesap.esap.edu.co' }[env];
    return [[], [ghcr], ['docker-compose.frontend-mfe.yml'], ['docker-compose.frontend-mfe.yml', ghcr]]
      .map((overlays) => ({ name: [env, ...overlays.map((file) => file.includes('ghcr') ? 'ghcr' : 'mfe')].join('-'),
        files: [base, ...overlays], env, origin, storage: 'volume' }));
  }),
];

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function otherModulesHash(config) {
  const other = structuredClone(config);
  delete other.services['rund-service'];
  if (carpetaMode) delete other.services['auth-service'];
  if (other.volumes) delete other.volumes['rund-uploads'];
  return createHash('sha256').update(JSON.stringify(canonical(other))).digest('hex');
}
function render(testCase, overrides = {}) {
  const env = {};
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'Path', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, { DOCKER_CONFIG: temporary, COMPOSE_DISABLE_ENV_FILE: '1',
    FRONTEND_NETWORK_KEY: testCase.env && testCase.env !== 'dev' ? `superapp-net-${testCase.env}` : 'superapp-net',
    FRONTEND_CONTAINER_SUFFIX: `-${testCase.env || 'local'}`, ...overrides });
  // Algunas bases declaran env_file obligatorios que no existen en un checkout limpio.
  // Este overlay temporal los omite; no crea ni lee archivos de configuración reales.
  const serviceNames = [...new Set(testCase.files.flatMap((file) =>
    Object.keys(yaml.load(fs.readFileSync(path.join(root, file), 'utf8')).services || {})))];
  const envOverlay = path.join(temporary, 'without-env-files.yml');
  fs.writeFileSync(envOverlay, 'services:\n' + serviceNames.map((name) => `  ${name}:\n    env_file: !reset []\n`).join(''));
  const options = ['--env-file', envFile, '--project-directory', root, '-p', 'esap-rund-config-checks',
    ...testCase.files.flatMap((file) => ['-f', path.join(root, file)]), '-f', envOverlay,
    'config', '--no-env-resolution', '--format', 'json'];
  try { return JSON.parse(execFileSync(executable, [...commandPrefix, ...options], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 })); }
  catch (error) { throw new Error(`Compose no válido: ${testCase.name}\n${error.stderr?.toString() || error.message}`); }
}

try {
  const previous = comparePath ? JSON.parse(fs.readFileSync(comparePath, 'utf8')) : null;
  const fingerprints = {};
  const checks = [];
  for (const testCase of cases) {
    const config = render(testCase);
    fingerprints[testCase.name] = otherModulesHash(config);
    if (capturePath) continue;
    if (previous) assert.equal(fingerprints[testCase.name], previous[testCase.name], `Cambió un módulo ajeno a RUND: ${testCase.name}`);
    const service = config.services['rund-service'];
    const env = service.environment;
    const mount = service.volumes.find((volume) => volume.target === '/app/uploads');
    assert(mount && !mount.read_only, `${testCase.name}: falta almacenamiento escribible`);
    assert.equal(mount.type, testCase.storage);
    if (mount.type === 'volume') {
      assert.equal(config.volumes[mount.source].name, `esap-rund-uploads-${testCase.env || 'local'}`);
      assert.notEqual(mount.volume?.nocopy, true, 'El volumen nuevo debe conservar la inicialización del directorio de la imagen.');
    } else assert.equal(mount.source.replaceAll('\\', '/'), path.join(root, 'backend/rund-service/uploads').replaceAll('\\', '/'));
    assert.equal(env.PUBLIC_APP_URL, testCase.origin);
    assert.equal(env.FRONTEND_URL, testCase.origin);
    assert.equal(env.NOTIFICATIONS_SERVICE_URL, env.NOTIFICATION_SERVICE_URL);
    assert.equal(env.RUND_OCR_ENABLED, 'false');
    assert.equal(env.RUND_ENABLE_DEV_OTP, 'false');
    assert.equal(env.RUND_DOCUMENT_ALLOW_LOCAL, '');
    assert.equal(env.RUND_DOCUMENT_MAX_SIZE_BYTES, '');
    for (const key of ['OPENKM_BASE_URL', 'OPENKM_USERNAME', 'OPENKM_PASSWORD', 'OPENKM_TIMEOUT_MS',
      'RUND_OCR_URL', 'RUND_OCR_TOKEN', 'RUND_OLLAMA_URL', 'RUND_OLLAMA_MODEL']) {
      assert(Object.hasOwn(env, key), `${testCase.name}: falta ${key}`);
    }
    assert.equal(env.OPENKM_TIMEOUT_MS, '15000');
    assert.equal(Number(env.PORT), 3016);
    assert.equal(env.AUTH_INTERNAL_SERVICE_TOKEN, '');
    assert.equal(env.RUND_AUTH_SYNC_TIMEOUT_MS, '15000');
    assert.equal(env.RUND_AUTH_SYNC_MAX_PAGES, '1000');
    for (const name of ['rund-service', 'auth-service', 'academic-work-plan-service', 'academic-schedule-service']) {
      assert.equal(config.services[name].environment.INTERNAL_SERVICE_TOKEN, '', `${testCase.name}: ${name} requiere un token explícito, separado del JWT`);
    }
    assert.equal(config.services['academic-work-plan-service'].environment.RUND_SYNC_ENABLED, 'false', `${testCase.name}: no sincroniza PTA al arrancar sin activación explícita`);
    if (carpetaMode) {
      const authEnv = config.services['auth-service'].environment;
      assert.equal(authEnv.RUND_CARPETA_ENABLED, 'false');
      assert.equal(authEnv.CARPETA_DOCUMENT_VERSIONING_ENABLED, 'false');
      assert.equal(authEnv.RUND_CARPETA_INTERNAL_TOKEN, '');
      assert.equal(env.RUND_CARPETA_INTERNAL_TOKEN, '');
      assert.equal(authEnv.RUND_CARPETA_SYNC_ENABLED, 'false');
      assert.equal(env.RUND_CARPETA_SYNC_ENABLED, 'false');
      assert.equal(authEnv.RUND_CARPETA_SYNC_TOKEN, '');
      assert.equal(env.RUND_CARPETA_SYNC_TOKEN, '');
      assert.equal(authEnv.RUND_SERVICE_URL, `http://${service.container_name}:3016`);
    }
    checks.push({ composition: testCase.name, persistentStorage: mount.type, otherModulesUnchanged: Boolean(previous),
      otherModulesHashBefore: previous?.[testCase.name] || null, otherModulesHashAfter: fingerprints[testCase.name] });
    console.log(`PASS ${testCase.name}: persistencia, variables y composición${previous ? '; otros módulos idénticos' : ''}`);
  }
  if (capturePath) {
    fs.writeFileSync(capturePath, JSON.stringify(fingerprints, null, 2));
    console.log(`Baseline: ${cases.length} composiciones; solo hashes, sin credenciales.`);
  } else {
    const custom = render(cases.find((item) => item.name === 'prod'), {
      PUBLIC_APP_URL: 'https://rund-ficticio.example.test', FRONTEND_URL: 'https://frontend-ficticio.example.test',
      OPENKM_BASE_URL: 'http://openkm-ficticio:8080', OPENKM_USERNAME: 'usuario-ficticio', OPENKM_PASSWORD: 'clave-ficticia',
      RUND_DOCUMENT_ALLOW_LOCAL: 'false', RUND_DOCUMENT_MAX_SIZE_BYTES: '2097152', RUND_OCR_ENABLED: 'true',
      RUND_OCR_URL: 'http://ocr-ficticio:8091', RUND_OCR_TOKEN: 'token-ficticio',
      RUND_OLLAMA_URL: 'http://ollama-ficticio:11434', RUND_OLLAMA_MODEL: 'qwen3.5:4b',
      AUTH_INTERNAL_SERVICE_TOKEN: 'auth-ficticio', RUND_AUTH_SYNC_TIMEOUT_MS: '5000', RUND_AUTH_SYNC_MAX_PAGES: '20',
    }).services['rund-service'].environment;
    assert.equal(custom.PUBLIC_APP_URL, 'https://rund-ficticio.example.test');
    assert.equal(custom.OPENKM_PASSWORD, 'clave-ficticia');
    assert.equal(custom.RUND_DOCUMENT_MAX_SIZE_BYTES, '2097152');
    assert.equal(custom.RUND_OCR_ENABLED, 'true');
    assert.equal(custom.RUND_OCR_TOKEN, 'token-ficticio');
    assert.equal(custom.RUND_OLLAMA_MODEL, 'qwen3.5:4b');
    assert.equal(custom.AUTH_INTERNAL_SERVICE_TOKEN, 'auth-ficticio');
    assert.equal(custom.RUND_AUTH_SYNC_TIMEOUT_MS, '5000');
    assert.equal(custom.RUND_AUTH_SYNC_MAX_PAGES, '20');
    const sharedConfig = render(cases.find(item => item.name === 'dev'), { INTERNAL_SERVICE_TOKEN: 'compartido-ficticio', RUND_SYNC_ENABLED: 'true' });
    assert.equal(sharedConfig.services['rund-service'].environment.AUTH_INTERNAL_SERVICE_TOKEN, 'compartido-ficticio');
    for (const name of ['rund-service', 'auth-service', 'academic-work-plan-service', 'academic-schedule-service']) {
      assert.equal(sharedConfig.services[name].environment.INTERNAL_SERVICE_TOKEN, 'compartido-ficticio');
    }
    assert.equal(sharedConfig.services['academic-work-plan-service'].environment.RUND_SYNC_ENABLED, 'true');
    console.log('PASS configuración explícita de enlaces, OpenKM, límites y OCR con valores ficticios.');
    const report = { verifiedAt: new Date().toISOString(), passed: true, daemonUsed: false, containersStarted: false,
      realEnvironmentFilesRead: false, serviceEnvFilesOmittedForValidation: true,
      otherModulesCompared: Boolean(previous), checks, explicitOverrides: true };
    if (carpetaMode) {
      const configured = render(cases.find(item => item.name === 'dev'), {
        RUND_CARPETA_ENABLED: 'true', RUND_CARPETA_INTERNAL_TOKEN: 'carpeta-ficticia', CARPETA_DOCUMENT_VERSIONING_ENABLED: 'true',
        RUND_CARPETA_SYNC_ENABLED: 'true', RUND_CARPETA_SYNC_TOKEN: 'sync-ficticia',
      });
      assert.equal(configured.services['auth-service'].environment.RUND_CARPETA_ENABLED, 'true');
      assert.equal(configured.services['auth-service'].environment.CARPETA_DOCUMENT_VERSIONING_ENABLED, 'true');
      assert.equal(configured.services['auth-service'].environment.RUND_CARPETA_INTERNAL_TOKEN, 'carpeta-ficticia');
      assert.equal(configured.services['rund-service'].environment.RUND_CARPETA_INTERNAL_TOKEN, 'carpeta-ficticia');
      for (const name of ['auth-service', 'rund-service']) {
        assert.equal(configured.services[name].environment.RUND_CARPETA_SYNC_ENABLED, 'true');
        assert.equal(configured.services[name].environment.RUND_CARPETA_SYNC_TOKEN, 'sync-ficticia');
      }
      const sharedFolder = render(cases.find(item => item.name === 'dev'), { INTERNAL_SERVICE_TOKEN: 'compartido-ficticio' });
      assert.equal(sharedFolder.services['auth-service'].environment.RUND_CARPETA_INTERNAL_TOKEN, 'compartido-ficticio');
      assert.equal(sharedFolder.services['rund-service'].environment.RUND_CARPETA_INTERNAL_TOKEN, 'compartido-ficticio');
      assert.equal(sharedFolder.services['auth-service'].environment.RUND_CARPETA_SYNC_TOKEN, 'compartido-ficticio');
      assert.equal(sharedFolder.services['rund-service'].environment.RUND_CARPETA_SYNC_TOKEN, 'compartido-ficticio');
    }
    report.scope = `${carpetaMode ? 'RUND y auth-service' : 'RUND'}; contratos internos PTA/Programación; ${previous ? 'demás módulos comparados' : 'sin comparación de otros módulos'}`;
    fs.writeFileSync(path.join(root, `docs/rund/${carpetaMode ? 'validacion-carpeta-compose' : 'validacion-compose'}.json`), JSON.stringify(report, null, 2) + '\n');
  }
} finally {
  const resolved = fs.realpathSync(temporary);
  assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
  assert.match(path.basename(resolved), /^esap-rund-compose-/);
  fs.rmSync(resolved, { recursive: true, force: true });
}
