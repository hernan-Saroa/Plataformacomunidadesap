const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { deploymentConfiguration, sameMount, fileManifest, copyMatches } = require('./deployment.cjs');
const local = () => ({ services: { 'academic-work-plan-service': {
  environment: { RUND_DOCUMENTAL_ENABLED: 'true', RUND_DOCUMENT_PROVIDER: 'LOCAL', RUND_DOCUMENT_ALLOW_LOCAL: 'true', OPENKM_BASE_URL: 'http://incompleto.test' },
  volumes: [{ type: 'bind', source: '/datos/rund', target: '/app/uploads' }],
} } });

test('el modo provisional explícito funciona sin credenciales aunque haya una URL incompleta', () => {
  const result = deploymentConfiguration(local());
  assert.equal(result.provider, 'LOCAL');
  assert.deepEqual(result.errors, []);
  assert(result.warnings.includes('PROVISIONAL_LOCAL_STORAGE'));
});
test('detecta escrituras bloqueadas, disco efímero y volumen de solo lectura', () => {
  const model = local();
  const service = model.services['academic-work-plan-service'];
  service.environment.RUND_DOCUMENT_ALLOW_LOCAL = 'false'; service.volumes = [];
  assert.deepEqual(deploymentConfiguration(model).errors, ['LOCAL_WRITES_DISABLED', 'PERSISTENT_UPLOADS_REQUIRED']);
  service.volumes = [{ type: 'bind', source: '/datos', target: '/app/uploads', read_only: true }];
  assert(deploymentConfiguration(model).errors.includes('UPLOADS_READ_ONLY'));
});
test('OpenKM explícito exige configuración completa y valida URL sin exponer secretos', () => {
  const model = local();
  const env = model.services['academic-work-plan-service'].environment;
  env.RUND_DOCUMENT_PROVIDER = 'OPENKM';
  assert(deploymentConfiguration(model).errors.includes('OPENKM_CONFIG_INCOMPLETE'));
  Object.assign(env, { OPENKM_USERNAME: 'fixture', OPENKM_PASSWORD: 'secreto', OPENKM_BASE_URL: 'https://example.test/OpenKM' });
  assert.deepEqual(deploymentConfiguration(model).errors, []);
  env.OPENKM_BASE_URL = 'https://fixture:secreto@example.test';
  assert(deploymentConfiguration(model).errors.includes('OPENKM_URL_INVALID'));
});
test('no confunde un volumen nuevo con el almacenamiento actual', () => {
  assert(sameMount({}, { type: 'bind', source: '/datos/rund' }, { Type: 'bind', Source: '/datos/rund' }));
  assert(!sameMount({}, { type: 'bind', source: '/datos/nuevo' }, { Type: 'bind', Source: '/datos/rund' }));
  assert(sameMount({ volumes: { files: { name: 'qa_rund' } } }, { type: 'volume', source: 'files' }, { Type: 'volume', Name: 'qa_rund' }));
  assert(!sameMount({}, { type: 'bind', source: '/datos/rund' }, undefined));
});
test('verifica una copia completa, detecta cambios y conserva todos los originales', async () => {
  const parent = path.resolve(__dirname, '../../tmp/rund-deployment-tests');
  await fs.mkdir(parent, { recursive: true });
  const fixture = await fs.mkdtemp(path.join(parent, 'copy-'));
  try {
    const original = path.join(fixture, 'original'), target = path.join(fixture, 'target');
    await fs.mkdir(original); await fs.mkdir(target);
    await fs.writeFile(path.join(original, 'nombre-privado.pdf'), '%PDF-fixture');
    await fs.copyFile(path.join(original, 'nombre-privado.pdf'), path.join(target, 'nombre-privado.pdf'));
    const manifest = await fileManifest(original);
    assert(!JSON.stringify(manifest).includes('nombre-privado'));
    assert(copyMatches(manifest, await fileManifest(target)));
    await fs.writeFile(path.join(target, 'nombre-privado.pdf'), '%PDF-otro');
    assert(!copyMatches(manifest, await fileManifest(target)));
    assert(!copyMatches(manifest, []));
    assert.equal(await fs.readFile(path.join(original, 'nombre-privado.pdf'), 'utf8'), '%PDF-fixture');
  } finally {
    assert(path.resolve(fixture).startsWith(parent + path.sep));
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
