// Contrato offline entre los workflows de imagen RUND y las composiciones por ambiente.
// No ejecuta Docker, GitHub Actions, redes, migraciones ni carga archivos .env.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '..');
const read = file => yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));
const owner = 'owner-ficticio';

for (const environment of ['dev', 'qa', 'pre', 'prod']) {
  const workflow = read(`.github/workflows/build-backend-${environment}.yml`);
  const jobs = Object.values(workflow.jobs).filter(job => job.strategy?.matrix?.service?.includes('rund-service'));

  test(`${environment}: su rama construye RUND una sola vez y conserva los trabajos independientes`, () => {
    assert.deepEqual(workflow.on.push.branches, [environment]);
    assert.equal(jobs.length, 1, 'Debe existir un único job que construya RUND.');
    const job = jobs[0];
    assert.equal(job.strategy.matrix.service.filter(service => service === 'rund-service').length, 1);
    assert.equal(new Set(job.strategy.matrix.service).size, job.strategy.matrix.service.length);
    assert.equal(job.strategy['fail-fast'], false);
    assert.equal(job.permissions.contents, 'read');
    assert.equal(job.permissions.packages, 'write');
  });

  test(`${environment}: nombre y tag de la imagen RUND coinciden con el overlay GHCR`, () => {
    assert.equal(jobs.length, 1);
    const metadata = jobs[0].steps.find(step => /^docker\/metadata-action@/.test(step.uses || ''));
    assert(metadata, 'Falta la generación de metadata de la imagen.');
    const values = { 'env.REGISTRY': workflow.env.REGISTRY, 'github.repository_owner': owner, 'matrix.service': 'rund-service' };
    const image = metadata.with.images.replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_, expression) => {
      assert(Object.hasOwn(values, expression), `Expresión de imagen sin validar: ${expression}`);
      return values[expression];
    });
    assert.equal(metadata.with.tags, `type=raw,value=${environment}-latest`);
    const overlay = environment === 'dev' ? 'docker-compose.ghcr.yml' : `docker-compose.${environment}.ghcr.yml`;
    const configured = read(overlay).services['rund-service'].image
      .replace(/\$\{GITHUB_REPOSITORY_OWNER:-[^}]+\}/g, owner);
    assert.equal(`${image}:${environment}-latest`, configured);
  });

  test(`${environment}: el job usa el contexto y Dockerfile propios de RUND y publica el tag generado`, () => {
    assert.equal(jobs.length, 1);
    const job = jobs[0];
    const build = job.steps.find(step => /^docker\/build-push-action@/.test(step.uses || ''));
    const metadata = job.steps.find(step => /^docker\/metadata-action@/.test(step.uses || ''));
    assert(build); assert(metadata?.id);
    const substitute = value => value.replace(/\$\{\{\s*matrix\.service\s*\}\}/g, 'rund-service');
    assert.equal(path.resolve(root, substitute(build.with.context)), path.join(root, 'backend/rund-service'));
    const dockerfile = path.resolve(root, substitute(build.with.file));
    assert.equal(dockerfile, path.join(root, 'backend/rund-service/Dockerfile'));
    assert(fs.existsSync(dockerfile));
    assert(fs.existsSync(path.join(root, 'backend/rund-service/package.json')));
    assert.equal(build.with.push, true);
    assert.equal(build.with.tags, '${{ steps.' + metadata.id + '.outputs.tags }}');
  });
}

test('local y compilación desde fuente conservan el mismo contexto RUND que CI', () => {
  const local = read('docker-compose.local.yml').services['rund-service'];
  assert.equal(local.extends.file, './docker-compose.dev.yml');
  assert.equal(local.extends.service, 'rund-service');
  for (const file of ['docker-compose.yml', 'docker-compose.backend.yml', ...['dev', 'qa', 'pre', 'prod'].map(env => `docker-compose.${env}.yml`)]) {
    const build = read(file).services['rund-service'].build;
    assert.equal(path.resolve(root, build.context), path.join(root, 'backend/rund-service'), file);
    assert.equal(build.dockerfile, 'Dockerfile', file);
  }
});
