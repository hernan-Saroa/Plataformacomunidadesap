const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const bash = process.env.BASH_TEST_BINARY || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const guard = fs.readFileSync(path.join(__dirname, 'deploy-guard.sh'), 'utf8').replaceAll('\r\n', '\n');

function run(script, env = {}) {
  const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], { cwd: root, input: script, encoding: 'utf8', timeout: 10000, env: { ...process.env, ...env } });
  if (result.error) throw result.error;
  return result;
}

for (const environment of ['dev', 'qa', 'pre', 'prod']) {
  const source = fs.readFileSync(path.join(root, `deploy.${environment}.sh`), 'utf8').replaceAll('\r\n', '\n');
  const name = environment === 'dev' ? 'compose_dev' : 'compose_env';
  for (const suffix of ['', '_mfe']) {
    const wrapper = source.match(new RegExp(`^${name}${suffix}\\(\\) \\{[\\s\\S]*?^\\}`, 'm'))?.[0];
    assert(wrapper);
    test(`${environment}${suffix}: avance apagado no agrega requisitos ni bloquea el despliegue habitual`, () => {
      for (const enabled of ['unset RUND_DOCUMENTAL_ENABLED', 'RUND_DOCUMENTAL_ENABLED=false']) {
        const result = run(`set -e
COMPOSE_FILE_DEV=base.yml COMPOSE_FILE_ENV=base.yml COMPOSE_FILE_MFE=frontend.yml ENV_FILE=fixture.env
${enabled}
RUND_DOCUMENTAL_PERSISTENT=true
docker() { printf '%s\\n' "$*"; }
node() { echo unexpected-preflight; return 1; }
${guard}
${wrapper}
${name}${suffix} down
${name}${suffix} up -d
`);
        assert.equal(result.status, 0, result.stderr);
        assert(!result.stdout.includes('docker-compose.rund-documental.yml'));
        assert(!result.stdout.includes('unexpected-preflight'));
        assert(result.stdout.includes('down'));
        assert(result.stdout.includes('up -d'));
      }
    });
    test(`${environment}${suffix}: sin activar el overlay conserva los argumentos anteriores`, () => {
      const result = run(`set -e
COMPOSE_FILE_DEV=base.yml COMPOSE_FILE_ENV=base.yml COMPOSE_FILE_MFE=frontend.yml ENV_FILE=fixture.env
RUND_DOCUMENTAL_ENABLED=true RUND_DOCUMENTAL_PERSISTENT=false
docker() { printf '%s\\n' "$*"; }
node() { echo unexpected-preflight; return 1; }
${guard}
${wrapper}
${name}${suffix} up -d --no-deps academic-work-plan-service
`);
      assert.equal(result.status, 0, result.stderr);
      assert(!result.stdout.includes('docker-compose.rund-documental.yml'));
      assert(!result.stdout.includes('unexpected-preflight'));
    });
    test(`${environment}${suffix}: un fallo de persistencia impide recrear el contenedor`, () => {
      const result = run(`set -e
RUND_DOCUMENTAL_ENABLED=true RUND_DOCUMENTAL_PERSISTENT=true
docker() { echo unexpected-docker; }
node() { printf 'preflight:%s\\n' "$*"; return 1; }
${guard}
${wrapper}
${name}${suffix} up -d --no-deps academic-work-plan-service
`);
      assert.notEqual(result.status, 0);
      assert(result.stdout.includes(`--environment ${environment} --persistent --verify-copy`));
      assert(!result.stdout.includes('unexpected-docker'));
    });
    test(`${environment}${suffix}: copia validada habilita exclusivamente el compose solicitado con overlay`, () => {
      const result = run(`set -e
COMPOSE_FILE_DEV=base.yml COMPOSE_FILE_ENV=base.yml COMPOSE_FILE_MFE=frontend.yml ENV_FILE=fixture.env
RUND_DOCUMENTAL_ENABLED=true RUND_DOCUMENTAL_PERSISTENT=true
docker() { printf 'docker:%s\\n' "$*"; }
node() { echo preflight-ok; }
${guard}
${wrapper}
${name}${suffix} up -d --no-deps academic-work-plan-service
`);
      assert.equal(result.status, 0, result.stderr);
      assert(result.stdout.includes('preflight-ok'));
      assert(result.stdout.includes('-f docker-compose.rund-documental.yml'));
    });
  }
}

test('la verificación no afecta consultas, compilaciones ni otro servicio aislado; protege up global', () => {
  const result = run(`set -e
node() { echo checked; }
${guard}
rund_documental_preflight qa config --services
rund_documental_preflight qa build academic-work-plan-service
rund_documental_preflight qa up -d --no-deps auth-service
rund_documental_preflight qa up -d --no-deps
`);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/checked/g) || []).length, 1);
});

test('conserva el contenedor de origen: down/rm se bloquean antes de detener servicios', () => {
  for (const command of ['down', 'rm']) {
    const result = run(`set -e
node() { echo unexpected-check; }
${guard}
rund_documental_preflight qa ${command}
echo unexpected-continuation
`);
    assert.notEqual(result.status, 0);
    assert(result.stdout.includes('contenedor actual'));
    assert(!result.stdout.includes('unexpected'));
  }
});
