// Compose real con datos sinteticos; no crea contenedores ni lee .env privados.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseProfile } = require('./manage.cjs');
const root = path.resolve(__dirname, '../..');
const temporary = path.join(root, '.local/rund-ai-render');
const template = fs.readFileSync(path.join(root, 'backend/academic-work-plan-service/rund-ai.env.example'), 'utf8');
for (const environment of ['dev', 'qa', 'pre', 'prod']) test(`${environment}: Compose solo agrega IA a PTA, conserva almacenamiento, BD y chatbot`, { skip: process.env.RUND_AI_COMPOSE_RENDER_TEST !== 'true' }, t => {
  fs.mkdirSync(temporary, { recursive: true });
  const directory = fs.mkdtempSync(path.join(temporary, 'case-'));
  t.after(() => { assert.equal(path.dirname(path.resolve(directory)), temporary); fs.rmSync(directory, { recursive: true, force: true }); });
  const global = path.join(directory, 'global.env'); fs.writeFileSync(global, 'DB_PASSWORD=synthetic-db\nJWT_SECRET=synthetic-jwt\n');
  const chatbotProfile = path.join(directory, 'chatbot.env'); fs.writeFileSync(chatbotProfile, 'CHATBOT_AI_ENABLED=true\n');
  const values = parseProfile(template.replace('esap-rund-ai-dev', `esap-rund-ai-${environment}`));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('RUND_') && !key.startsWith('CHATBOT_')));
  Object.assign(env, values, { DB_PASSWORD: 'synthetic-db', JWT_SECRET: 'synthetic-jwt', CHATBOT_KNOWLEDGE_ENV_FILE: chatbotProfile,
    CHATBOT_AI_NETWORK: 'synthetic-chatbot-network', CHATBOT_AI_OCR_NETWORK: values.RUND_AI_NETWORK });
  function render(args) {
    const result = spawnSync('docker', ['compose', '--env-file', global, ...args, 'config', '--format', 'json'], { cwd: root, env, encoding: 'utf8', timeout: 20000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
  }
  const base = ['-f', `docker-compose.${environment}.yml`];
  const before = render(base), after = render([...base, '-f', 'docker-compose.rund-ai-config.yml']);
  for (const [name, service] of Object.entries(before.services)) if (name !== 'academic-work-plan-service') assert.deepEqual(after.services[name], service, name);
  const original = before.services['academic-work-plan-service'], pta = after.services['academic-work-plan-service'];
  const expected = structuredClone(original);
  for (const key of ['RUND_OCR_ENABLED', 'RUND_OCR_PROVIDER', 'RUND_OCR_URL', 'RUND_OLLAMA_URL', 'RUND_OLLAMA_MODEL']) expected.environment[key] = values[key];
  expected.networks['rund-ai'] = {};
  assert.deepEqual(pta, expected);
  assert.equal(after.networks['rund-ai'].external, true);
  // Coexistencia con el almacenamiento documental y ambos overlays del chatbot.
  Object.assign(env, { RUND_UPLOADS_HOST_PATH: directory, RUND_POLICY_HOST_PATH: directory,
    RUND_DOCUMENTAL_ENABLED: 'true', RUND_DOCUMENT_PROVIDER: 'LOCAL', RUND_DOCUMENT_ALLOW_LOCAL: 'true' });
  const shared = [...base, '-f', 'docker-compose.rund-documental.yml', '-f', 'docker-compose.chatbot-config.yml',
    '-f', 'docker-compose.chatbot-knowledge.yml', '-f', 'docker-compose.chatbot-ocr-guard.yml'];
  const sharedBefore = render(shared), sharedAfter = render([...shared, '-f', 'docker-compose.rund-ai-config.yml']);
  for (const [name, service] of Object.entries(sharedBefore.services)) if (name !== 'academic-work-plan-service') assert.deepEqual(sharedAfter.services[name], service, name);
  assert.deepEqual(sharedAfter.services['academic-work-plan-service'].volumes, sharedBefore.services['academic-work-plan-service'].volumes);
  for (const gpu of [false, true]) {
    const args = ['-p', `esap-rund-ai-${environment}`, '-f', 'docker-compose.rund-ai.yml'];
    if (gpu) args.push('-f', 'docker-compose.rund-ai.gpu.yml');
    const stack = render(args);
    assert.deepEqual(Object.keys(stack.services).sort(), ['rund-ocr', 'rund-ollama']);
    assert.equal(stack.networks['rund-ai'].name, `esap-rund-ai-${environment}`);
    assert.equal(stack.services['rund-ocr'].build.dockerfile, 'Dockerfile.rund');
    for (const service of Object.values(stack.services)) for (const port of service.ports) assert.equal(port.host_ip, '127.0.0.1');
    assert.equal(Boolean(stack.services['rund-ollama'].gpus), gpu);
    assert.equal(Boolean(stack.services['rund-ocr'].gpus), false);
    for (const volume of Object.values(stack.volumes)) assert(volume.name.startsWith(`esap-rund-ai-${environment}_`));
  }
});
