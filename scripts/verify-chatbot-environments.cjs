// Revisión estática con variables ficticias. No lee secretos ni inicia despliegues.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'backend/chatbot-service/src/config/typeorm.config.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;
const evaluate = env => {
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env } });
  return exports.getTypeOrmConfig();
};
const variables = { JWT_SECRET: 'synthetic-shared-signing-key', DB_PASSWORD: 'synthetic-database-password' };
const expand = value => String(value).replace(/\$\{([A-Z_]+)(?::-([^}]*))?\}/g, (_match, key, fallback) => variables[key] || fallback || '');
const files = ['docker-compose.yml', 'docker-compose.backend.yml', 'docker-compose.dev.yml', 'docker-compose.qa.yml', 'docker-compose.pre.yml', 'docker-compose.prod.yml'];
for (const file of files) {
  const services = yaml.load(fs.readFileSync(path.join(root, file), 'utf8')).services;
  const actors = ['api-gateway', 'auth-service', 'chatbot-service'].map(name => services[name]);
  assert(actors.every(Boolean), `Missing service in ${file}`);
  const keys = actors.map(service => service.environment?.JWT_SECRET);
  if (file === 'docker-compose.yml') {
    assert(keys.every(key => key === undefined), `Base composition must use each service's configured env_file: ${file}`);
    assert(actors.every(service => service.env_file?.length), `Missing env_file in ${file}`);
  } else {
    assert(keys.every(key => typeof key === 'string' && key.includes('${JWT_SECRET')), `JWT variable must be shared: ${file}`);
    assert.equal(new Set(keys).size, 1, `JWT defaults must agree: ${file}`);
    assert(keys.every(key => expand(key) === variables.JWT_SECRET), `JWT override must agree: ${file}`);
  }
  const env = Object.fromEntries(Object.entries(services['chatbot-service'].environment).map(([key, value]) => [key, expand(value)]));
  const config = evaluate(env);
  assert.equal(config.host, 'db', file);
  assert.equal(config.port, 5432, file);
  assert.equal(config.username, 'postgres', file);
  assert.equal(config.database, 'esap_db', file);
  assert.equal(config.password, file === 'docker-compose.yml' ? 'password' : variables.DB_PASSWORD, file);
  assert.equal(config.synchronize, false, file);
  assert.equal(config.logging, false, file);
  console.log(`PASS: ${file}: JWT configuration and PostgreSQL variables.`);
}
for (const file of ['nginx.frontend.gateway.prebuilt.conf', 'nginx.frontend.gateway.prebuilt.tls.conf.template']) {
  const config = fs.readFileSync(path.join(root, file), 'utf8');
  assert(/location\s+\^~\s+\/services\/\s*\{[\s\S]*?proxy_pass\s+http:\/\/api-gateway:3000\//.test(config), `Missing services proxy in ${file}`);
  console.log(`PASS: ${file}: HTTP/HTTPS services proxy preserves the authentication route.`);
}
console.log('PASS: configuration checked without Docker, private env files or changes to running environments.');
