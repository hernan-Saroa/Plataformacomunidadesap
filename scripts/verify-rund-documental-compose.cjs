// Composición de prueba con valores ficticios. No usa el daemon ni inicia servicios.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { deploymentConfiguration } = require('./rund-documental/deployment.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  if (process.argv.length !== 2) throw new Error('NO_OPTIONS_SUPPORTED');
  const parent = path.join(root, 'tmp/rund-compose-tests');
  await fs.mkdir(parent, { recursive: true });
  const temporary = await fs.mkdtemp(path.join(parent, 'configuration-'));
  try {
    const fixtureEnv = path.join(temporary, 'fixture.env');
    await fs.writeFile(fixtureEnv, 'DB_PASSWORD=fixture-not-a-secret\n', { flag: 'wx' });
    await fs.mkdir(path.join(temporary, 'uploads'));
    await fs.mkdir(path.join(temporary, 'policies'));
    // No requiere los .env privados de otros microservicios para validar el modelo.
    // Compose valida su existencia incluso con --no-env-resolution en algunas versiones.
    const envServicesByFile = new Map();
    for (const file of ['docker-compose.yml', 'docker-compose.backend.yml', 'docker-compose.dev.yml', 'docker-compose.qa.yml', 'docker-compose.pre.yml', 'docker-compose.prod.yml']) {
      const envServices = new Set();
      let service, inServices = false;
      for (const line of (await fs.readFile(path.join(root, file), 'utf8')).split(/\r?\n/)) {
        if (/^services:/.test(line)) { inServices = true; continue; }
        if (/^[a-zA-Z]/.test(line)) inServices = false;
        if (!inServices) continue;
        const match = line.match(/^  ([\w-]+):/);
        if (match) service = match[1];
        if (service && /^    env_file:/.test(line)) envServices.add(service);
      }
      envServicesByFile.set(file, [...envServices]);
    }
    const fixtureOverride = path.join(temporary, 'fixture-compose.yml');
    const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(RUND_|OPENKM_)/.test(key)));
    const variants = [
      ['base', 'docker-compose.yml'], ['local', 'docker-compose.local.yml'], ['dev', 'docker-compose.dev.yml'],
      ['qa', 'docker-compose.qa.yml'], ['pre', 'docker-compose.pre.yml'], ['prod', 'docker-compose.prod.yml'],
      ['backend', 'docker-compose.backend.yml'],
      ['dev-ghcr', 'docker-compose.dev.yml', 'docker-compose.ghcr.yml'],
      ['qa-ghcr', 'docker-compose.qa.yml', 'docker-compose.qa.ghcr.yml'],
      ['pre-ghcr', 'docker-compose.pre.yml', 'docker-compose.pre.ghcr.yml'],
      ['prod-ghcr', 'docker-compose.prod.yml', 'docker-compose.prod.ghcr.yml'],
    ];
    let verified = 0;
    for (const [name, ...files] of variants) {
      const envServices = [...new Set(files.flatMap(file => envServicesByFile.get(file) || []))];
      await fs.writeFile(fixtureOverride, envServices.length
        ? 'services:\n' + envServices.map(service => `  ${service}:\n    env_file: !reset []\n`).join('') : 'services: {}\n');
      // Despliegue habitual: sin overlay, servidor OpenKM, rutas ni banderas nuevas.
      const deferred = spawnSync('docker', ['compose', ...files.flatMap(file => ['-f', file]), '-f', fixtureOverride,
        '--env-file', fixtureEnv, 'config', '--format', 'json', '--no-env-resolution'], {
        cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
        env: { ...cleanEnv, ...(name === 'local' ? { FRONTEND_NETWORK_KEY: 'superapp-net', FRONTEND_CONTAINER_SUFFIX: '-local' } : {}) },
      });
      if (deferred.status !== 0) throw new Error(`DEFERRED_COMPOSE_FAILED_${name.replaceAll('-', '_').toUpperCase()}`);
      const deferredService = JSON.parse(deferred.stdout).services['academic-work-plan-service'];
      assert.equal(deferredService.environment.RUND_DOCUMENTAL_ENABLED, 'false', name);
      assert(!deferredService.volumes?.some(item => item.target === '/etc/rund/policies'), name);
      verified++;
      for (const provider of ['LOCAL', 'OPENKM']) {
        const args = ['compose', ...files.flatMap(file => ['-f', file]), '-f', 'docker-compose.rund-documental.yml', '-f', fixtureOverride,
          '--env-file', fixtureEnv, 'config', '--format', 'json', '--no-env-resolution'];
        const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
          env: { ...cleanEnv, ...(name === 'local' ? { FRONTEND_NETWORK_KEY: 'superapp-net', FRONTEND_CONTAINER_SUFFIX: '-local' } : {}),
            RUND_DOCUMENTAL_ENABLED: 'true', RUND_DOCUMENT_PROVIDER: provider, RUND_DOCUMENT_ALLOW_LOCAL: provider === 'LOCAL' ? 'true' : 'false',
            RUND_UPLOADS_HOST_PATH: path.join(temporary, 'uploads'), RUND_POLICY_HOST_PATH: path.join(temporary, 'policies'),
            OPENKM_BASE_URL: 'https://example.invalid/OpenKM', OPENKM_USERNAME: provider === 'OPENKM' ? 'fixture' : '',
            OPENKM_PASSWORD: provider === 'OPENKM' ? 'fixture-not-a-secret' : '' } });
        if (result.status !== 0) throw new Error(`COMPOSE_FAILED_${name.replaceAll('-', '_').toUpperCase()}`);
        const config = deploymentConfiguration(JSON.parse(result.stdout));
        assert.equal(config.provider, provider, name);
        assert.deepEqual(config.errors, [], name);
        assert.equal(config.mount.type, 'bind');
        // Compose omite los booleanos false en su JSON normalizado.
        assert.notEqual(config.mount.bind?.create_host_path, true);
        verified++;
      }
    }
    console.log(JSON.stringify({ ok: true, composeConfigurationsVerified: verified, deferredConfigurations: variants.length, containersStarted: false,
      realCredentialsUsed: false, openKmContacted: false }));
  } finally {
    assert(path.resolve(temporary).startsWith(parent + path.sep));
    await fs.rm(temporary, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(JSON.stringify({ ok: false, error: /^[A-Z_]+$/.test(error?.message || '') ? error.message : 'COMPOSE_VERIFICATION_FAILED',
    check: error.code === 'ERR_ASSERTION' ? error.message : undefined }));
  process.exitCode = 1;
});
