const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { parseProfile, keys } = require('./manage.cjs');
const root = path.resolve(__dirname, '../..');
const temporary = path.join(root, '.local/rund-ai-tests');
fs.mkdirSync(temporary, { recursive: true });
const template = fs.readFileSync(path.join(root, 'backend/academic-work-plan-service/rund-ai.env.example'), 'utf8');
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(temporary, 'case-'));
  t.after(() => { assert.equal(path.dirname(path.resolve(directory)), temporary); fs.rmSync(directory, { recursive: true, force: true }); });
  const file = path.join(directory, 'profile.env');
  fs.writeFileSync(file, template);
  return { directory, file };
}
function manager(file) {
  const calls = [], output = [], sandbox = { module: { exports: {} }, __dirname, URL, process: { env: { RUND_AI_ENV_FILE: file } },
    console: { log: value => output.push(value) }, require: name => name === 'node:child_process'
      ? { spawnSync: (...args) => { calls.push(args); return { status: 0 }; } } : require(name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'manage.cjs'), 'utf8'), sandbox);
  return { main: sandbox.module.exports.main, calls, output };
}
test('perfil acepta CRLF y comentarios; solo claves de IA sin secretos', () => {
  const profile = parseProfile(template.replaceAll('\n', '\r\n'));
  assert.equal(profile.RUND_OLLAMA_MODEL, 'gemma4:e4b');
  assert.equal(Object.keys(profile).length, keys.length);
  assert.equal(parseProfile(template.replace('RUND_AI_MODE=managed', " RUND_AI_MODE = 'managed' # comentario")).RUND_AI_MODE, 'managed');
});
for (const forbidden of ['DB_PASSWORD=secret', 'JWT_SECRET=secret', 'CHATBOT_MODEL=other', 'RUND_DOCUMENTAL_ENABLED=true',
  'RUND_OCR_ENABLED=false', 'RUND_AI_MODE=$(touch /tmp/unsafe)']) {
  test(`rechaza clave ajena, repetida o ejecutable: ${forbidden.split('=')[0]}`, () => assert.throws(() => parseProfile(`${template}\n${forbidden}`)));
}
for (const [from, to] of [['gemma4:e4b', 'qwen3.5:9b'], ['RUND_OCR_PROVIDER=RUND', 'RUND_OCR_PROVIDER=LOCAL'],
  ['http://rund-ocr:8000', 'http://localhost:8000'], ['http://rund-ocr:8000', 'https://public.example.com'],
  ['RUND_AI_OCR_PORT=8091', 'RUND_AI_OCR_PORT=80'], ['RUND_AI_OCR_PORT=8091', 'RUND_AI_OCR_PORT=11435'],
  ['RUND_AI_MODE=managed', 'RUND_AI_MODE=anything']]) {
  test(`rechaza perfil incompatible: ${to}`, () => assert.throws(() => parseProfile(template.replace(from, to))));
}
for (const [index, environment] of ['dev', 'qa', 'pre', 'prod'].entries()) {
  test(`${environment}: init exclusivo e instalacion aislada, sin reiniciar PTA ni otros motores`, t => {
    const f = fixture(t); fs.unlinkSync(f.file);
    const { main, calls } = manager(f.file);
    main([environment, 'init']);
    const before = fs.readFileSync(f.file, 'utf8');
    const profile = parseProfile(before);
    assert.equal(profile.RUND_AI_NETWORK, `esap-rund-ai-${environment}`);
    assert.equal(+profile.RUND_AI_OCR_PORT, 8091 + index * 100);
    assert.equal(+profile.RUND_AI_OLLAMA_PORT, 11435 + index * 100);
    assert.throws(() => main([environment, 'init']));
    main([environment, 'install', '--gpu']);
    assert.equal(calls.length, 3);
    for (const [binary, args] of calls) {
      assert.equal(binary, 'docker');
      assert.equal(args[args.indexOf('-p') + 1], `esap-rund-ai-${environment}`);
      assert(args.includes('docker-compose.rund-ai.gpu.yml'));
      assert(!args.includes('academic-work-plan-service'));
      assert(!args.some(arg => ['rm', 'down', 'prune', 'rund_rund-network'].includes(arg)));
    }
    assert(calls.at(-1)[1].includes('gemma4:e4b'));
    assert.equal(fs.readFileSync(f.file, 'utf8'), before);
  });
}
test('external conserva red existente, no instala motores y prepare no reinicia PTA', t => {
  const f = fixture(t);
  fs.writeFileSync(f.file, template.replace('RUND_AI_MODE=managed', 'RUND_AI_MODE=external').replace('esap-rund-ai-dev', 'rund_rund-network'));
  const { main, calls } = manager(f.file);
  assert.throws(() => main(['dev', 'install']));
  assert.equal(calls.length, 0);
  main(['dev', 'prepare']); main(['dev', 'check']);
  assert(!calls.some(([, args]) => args.includes('up') || args.includes('restart')));
  const diagnostic = calls.at(-1)[1];
  assert(diagnostic.includes('--no-deps'));
  assert(diagnostic.includes('scripts/check-rund-ai.cjs'));
});
test('el instalador experimental conserva Gemma y nunca elimina modelos', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/setup-rund-ocr.ps1'), 'utf8');
  assert(!source.includes('ollama rm'));
  assert(source.includes('RUND_OCR_PROVIDER=RUND'));
  assert(!source.includes('$rundValues | Set-Content'));
});

const bash = process.env.BASH_FOR_TESTS || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const helper = fs.readFileSync(path.join(__dirname, 'compose-profile.sh'), 'utf8').replaceAll('\r\n', '\n');
for (const environment of ['dev', 'qa', 'pre', 'prod']) for (const suffix of ['', '_mfe']) {
  test(`${environment}${suffix}: despliegue dirigido preserva otros servicios y la proteccion documental`, t => {
    const f = fixture(t);
    fs.writeFileSync(f.file, template.replace('esap-rund-ai-dev', `esap-rund-ai-${environment}`));
    const source = fs.readFileSync(path.join(root, `deploy.${environment}.sh`), 'utf8').replaceAll('\r\n', '\n');
    const name = (environment === 'dev' ? 'compose_dev' : 'compose_env') + suffix;
    const wrapper = source.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'))?.[0];
    assert(wrapper);
    const input = `set -e\n${helper}\nchatbot_command_needs_profile() { return 1; }\n${wrapper}\n` +
      `COMPOSE_FILE_DEV=base.yml COMPOSE_FILE_ENV=base.yml COMPOSE_FILE_MFE=mfe.yml ENV_FILE=global.env\n` +
      `ENV_NETWORK_KEY=original ENV_CONTAINER_SUFFIX=original SERVER_URL_ENV=https://fixture.invalid\n` +
      `RUND_DOCUMENTAL_ENABLED=true RUND_DOCUMENTAL_PERSISTENT=true\n` +
      `rund_documental_preflight() { echo documentary-guard-preserved; }\n` +
      `docker() { printf '%s\\n' "$*"; }\n` +
      `${name} up -d --no-deps auth-service\n${name} up -d --no-deps academic-work-plan-service\n`;
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RUND_AI_')));
    const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], { cwd: root, input, env: { ...env, RUND_AI_ENV_FILE: f.file.replaceAll('\\', '/') }, encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, 0, result.stderr);
    const dockerLines = result.stdout.split('\n').filter(line => line.includes('compose -f'));
    assert.equal(dockerLines.length, 2);
    assert(!dockerLines[0].includes('docker-compose.rund-ai-config.yml'));
    assert(dockerLines[1].includes('docker-compose.rund-ai-config.yml'));
    assert.equal((result.stdout.match(/documentary-guard-preserved/g) || []).length, 2);
  });
}
