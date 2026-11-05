// Docker Compose config: solo modelos sintéticos en memoria; nunca inicia servicios.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const temporary = path.join(root, 'tmp/chatbot-render-tests');
const enabled = process.env.CHATBOT_COMPOSE_RENDER_TEST === 'true';
for (const environment of ['dev', 'qa', 'pre', 'prod', 'backend']) {
  for (const mode of ['sidecar', 'remote', 'ca', 'ocr-monitor']) test(`${environment}: Compose real ${mode}, secretos y otros servicios intactos`, { skip: !enabled }, (t) => {
    fs.mkdirSync(temporary, { recursive: true });
    const directory = fs.mkdtempSync(path.join(temporary, 'case-'));
    t.after(() => {
      assert.equal(path.dirname(path.resolve(directory)), temporary);
      fs.rmSync(directory, { recursive: true, force: true });
    });
    const global = path.join(directory, 'global.env'), profile = path.join(directory, 'knowledge.env');
    const ca = path.join(directory, 'ca.pem'); fs.writeFileSync(ca, 'SYNTHETIC PUBLIC CA');
    const sqlPassword = 'fake-$literal-dollar';
    const webPassword = 'fake-web-$literal-dollar';
    fs.writeFileSync(global, 'DB_PASSWORD=synthetic-db\nJWT_SECRET=synthetic-jwt\n');
    fs.writeFileSync(profile, [
      '  # Perfil con formato habitual de Windows y comentarios',
      '  CHATBOT_AI_ENABLED = true', 'CHATBOT_AI_FAST_MODE=true',
      ` CHATBOT_AI_USE_SIDECAR = '${mode === 'remote' ? 'false' : 'true'}'  # perfil`,
      'CHATBOT_OLLAMA_URL=' + (mode === 'remote' ? 'https://ai.fixture.invalid' : 'http://chatbot-ollama:11434'),
      'CHATBOT_AI_NETWORK=fixture-chatbot-ai_default',
      'CHATBOT_AI_OCR_NETWORK=fixture-existing-ocr-network',
      `CHATBOT_ISOLUCION_PASSWORD='${sqlPassword}'`, `CHATBOT_ISOLUCION_WEB_PASSWORD='${webPassword}'`,
      `CHATBOT_CA_CERT_FILE='${ca.replaceAll('\\', '/')}'`, '',
    ].join('\r\n'));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CHATBOT_')));
    Object.assign(env, { CHATBOT_KNOWLEDGE_ENV_FILE: profile, DB_PASSWORD: 'synthetic-db', JWT_SECRET: 'synthetic-jwt' });
    // config serializa los dólares como $$ para permitir reutilizar su salida.
    // Se comprobó también el valor literal dentro de un contenedor sin red.
    const literal = (value) => value.replace(/\$\$/g, '$');
    const baseArgs = ['compose', '--env-file', global, '-f', `docker-compose.${environment}.yml`];
    function render(args, runtimeEnv = env) {
      const result = spawnSync('docker', [...args, 'config', '--format', 'json'], { cwd: root,
        env: runtimeEnv, encoding: 'utf8', timeout: 20000, windowsHide: true });
      if (result.error) throw result.error;
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout);
    }
    const before = render(baseArgs);
    const args = [...baseArgs, '--env-file', profile, '-f', 'docker-compose.chatbot-config.yml'];
    if (mode !== 'remote') args.push('-f', 'docker-compose.chatbot-knowledge.yml');
    if (mode === 'ca') args.push('-f', 'docker-compose.chatbot-ca.yml');
    if (mode === 'ocr-monitor') args.push('-f', 'docker-compose.chatbot-ocr-guard.yml');
    const after = render(args);
    for (const [name, service] of Object.entries(before.services)) {
      if (name !== 'chatbot-service') assert.deepEqual(after.services[name], service, `Cambió otro servicio: ${name}`);
    }
    const chatbot = after.services['chatbot-service'];
    assert.equal(chatbot.environment.CHATBOT_AI_ENABLED, 'true');
    assert.equal(literal(chatbot.environment.CHATBOT_ISOLUCION_PASSWORD), sqlPassword);
    assert.equal(literal(chatbot.environment.CHATBOT_ISOLUCION_WEB_PASSWORD), webPassword);
    const fromManager = render(args, { ...env, CHATBOT_ISOLUCION_PASSWORD: 'synthetic-manager-$literal' });
    assert.equal(literal(fromManager.services['chatbot-service'].environment.CHATBOT_ISOLUCION_PASSWORD), 'synthetic-manager-$literal');
    assert.equal(Object.hasOwn(chatbot.networks || {}, 'chatbot-knowledge'), mode !== 'remote');
    assert.equal(Object.hasOwn(chatbot.networks || {}, 'chatbot-ocr-monitor'), mode === 'ocr-monitor');
    if (mode === 'ca') {
      assert.equal(chatbot.environment.NODE_EXTRA_CA_CERTS, '/run/chatbot/isolucion-ca.pem');
      assert(chatbot.volumes.some((mount) => mount.target === '/run/chatbot/isolucion-ca.pem' && mount.read_only === true));
      assert(chatbot.volumes.every((mount) => mount.target !== '/run/chatbot/isolucion-ca.pem' || mount.bind?.create_host_path !== true));
    }
  });
}
