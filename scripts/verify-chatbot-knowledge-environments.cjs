// Valida contratos de despliegue con datos sintéticos y sin leer archivos privados.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '..');
const files = ['docker-compose.yml', 'docker-compose.backend.yml', 'docker-compose.dev.yml',
  'docker-compose.qa.yml', 'docker-compose.pre.yml', 'docker-compose.prod.yml'];
for (const file of files) {
  const before = yaml.load(execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8', windowsHide: true }));
  const after = yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));
  const envFiles = after.services['chatbot-service'].env_file;
  const entry = envFiles.find((item) => item.path?.includes('CHATBOT_KNOWLEDGE_ENV_FILE'));
  assert(entry && entry.required === false, `${file}: falta archivo opcional de configuración por ambiente`);
  for (const [name, service] of Object.entries(before.services)) {
    if (name !== 'chatbot-service') assert.deepEqual(after.services[name], service, `${file}: cambió otro servicio ${name}`);
  }
  console.log(`PASS: ${file}: configuración del chatbot y otros servicios intactos.`);
}
const local = yaml.load(fs.readFileSync(path.join(root, 'docker-compose.local.yml'), 'utf8'));
assert.equal(local.services['chatbot-service'].extends.file, './docker-compose.dev.yml');
console.log('PASS: local hereda la configuración del chatbot de desarrollo.');
const overlay = yaml.load(fs.readFileSync(path.join(root, 'docker-compose.chatbot-knowledge.yml'), 'utf8'));
assert.deepEqual(Object.keys(overlay.services), ['chatbot-service']);
assert.equal(overlay.networks['chatbot-knowledge'].external, true);
assert(overlay.services['chatbot-service'].environment.CHATBOT_OLLAMA_URL.includes('http://chatbot-ollama:11434'));
const example = fs.readFileSync(path.join(root, 'backend/chatbot-service/knowledge.env.example'), 'utf8');
assert(/^CHATBOT_ISOLUCION_PASSWORD=$/m.test(example));
assert(/^CHATBOT_ISOLUCION_PUBLIC_ENABLED=true$/m.test(example));
assert(/^CHATBOT_ISOLUCION_PUBLIC_ALLOWED_VALUE=Aprobado$/m.test(example));
assert(/^CHATBOT_ISOLUCION_WEB_PASSWORD=$/m.test(example));
assert(/^CHATBOT_ISOLUCION_TRUST_SERVER_CERTIFICATE=false$/m.test(example));
assert(!/^RUND_[A-Z_]+=/m.test(example));
console.log('PASS: overlay exclusivo, sin secretos versionados ni cambios de configuración de RUND.');
