/* Revisión estática: solo YAML versionado, sin resolver .env ni contactar Docker/servicios. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const yaml = require(path.join(root, 'backend/rund-service/node_modules/js-yaml'));
const expectedToken = '${PTA_INTERNAL_SERVICE_TOKEN:-${INTERNAL_SERVICE_TOKEN:-}}';
const read = file => yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));
function environment(file, service) {
  const definition = read(file).services[service];
  assert(definition, file + ': missing ' + service);
  const parent = definition.extends;
  return { ...(parent ? environment(parent.file.replace(/^\.\//, ''), parent.service) : {}), ...definition.environment };
}
const cases = [
  ['docker-compose.yml', 'http://academic-work-plan-service:3003'],
  ['docker-compose.backend.yml', 'http://academic-work-plan-service:3003'],
  ['docker-compose.dev.yml', 'http://academic-work-plan-service:3003'],
  ['docker-compose.qa.yml', 'http://academic-work-plan-service-qa:3003'],
  ['docker-compose.pre.yml', 'http://academic-work-plan-service-pre:3003'],
  ['docker-compose.prod.yml', 'http://academic-work-plan-service-prod:3003'],
  ['docker-compose.local.yml', 'http://academic-work-plan-service:3003'],
];
const checks = cases.map(([file, url]) => {
  const env = environment(file, 'rund-service');
  assert.equal(env.ACADEMIC_WORK_PLAN_SERVICE_URL, url, file);
  assert.equal(env.PTA_INTERNAL_SERVICE_TOKEN, expectedToken, file);
  assert.equal(env.INTERNAL_SERVICE_TOKEN, '${INTERNAL_SERVICE_TOKEN:-}', file);
  assert.equal(environment(file, 'academic-work-plan-service').INTERNAL_SERVICE_TOKEN, '${INTERNAL_SERVICE_TOKEN:-}', file);
  return { file, ptaInternalUrl: url, ptaTokenExplicitOrShared: true };
});
for (const [base, overlay] of [
  ['docker-compose.dev.yml', 'docker-compose.ghcr.yml'],
  ['docker-compose.qa.yml', 'docker-compose.qa.ghcr.yml'],
  ['docker-compose.pre.yml', 'docker-compose.pre.ghcr.yml'],
  ['docker-compose.prod.yml', 'docker-compose.prod.ghcr.yml'],
]) {
  const env = { ...environment(base, 'rund-service'), ...read(overlay).services['rund-service']?.environment };
  assert.equal(env.PTA_INTERNAL_SERVICE_TOKEN, expectedToken, overlay);
  assert.equal(env.ACADEMIC_WORK_PLAN_SERVICE_URL, environment(base, 'rund-service').ACADEMIC_WORK_PLAN_SERVICE_URL);
  checks.push({ file: base + ' + ' + overlay, ptaInternalUrl: env.ACADEMIC_WORK_PLAN_SERVICE_URL, ptaTokenExplicitOrShared: true });
}
const report = { verifiedAt: new Date().toISOString(), passed: true, checks,
  mode: 'static YAML values and inheritance for catalog URL/token only; does not resolve full Docker Compose runtime',
  realEnvironmentFilesRead: false, servicesContacted: false, runtimeEnvironmentCertified: false };
fs.writeFileSync(path.join(root, 'docs/rund/validacion-configuracion-catalogos-rund.json'), JSON.stringify(report, null, 2) + '\n');
console.log('OK: ' + checks.length + ' configuraciones estáticas de catálogos, sin leer .env ni iniciar servicios.');
