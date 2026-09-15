// Ejecuta las funciones reales de selección con Docker, Git y operaciones de despliegue simulados.
// Nunca carga .env ni ejecuta el script completo: no limpia archivos ni inicia contenedores.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const bash=process.env.BASH_TEST_BINARY||(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash');

for(const environment of ['qa','pre','prod','dev']) {
  const source=fs.readFileSync(path.join(root,`deploy.${environment}.sh`),'utf8').replace(/\r\n/g,'\n');
  function extract(name) {
    const match=source.match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?^\\}`,'m'));
    assert(match,`La función ${name} debe existir`);return match[0];
  }
  function run(files,failConfig=false) {
    const script=`set -e
RED= GREEN= YELLOW= NC=
FRONTEND_MFE_SERVICES=(frontend frontend-shell frontend-mfe-pta)
git() { printf '%s\\n' "$DEPLOY_TEST_FILES"; }
ensure_docker_disk_space() { echo test:disk; }
cleanup_build_artifacts() { echo test:cleanup; }
restart_frontend_nginx() { echo test:nginx; }
restart_ssl_proxy() { echo test:ssl-proxy; }
cmd_db_migrate() { printf 'test:migration:%s\\n' "$1"; }
compose_env() {
  if [ "$1" = config ]; then
    if [ "$DEPLOY_TEST_CONFIG_FAIL" = true ]; then return 1; fi
    printf '%s\\n' auth-service academic-work-plan-service notifications-service
  elif [ "$1" = build ]; then
    shift
    for service in "$@"; do
      case "$service" in auth-service|academic-work-plan-service|notifications-service) ;; *) echo "no such service: $service"; return 1;; esac
      printf 'test:backend-build:%s\\n' "$service"
    done
  else printf 'test:backend:%s\\n' "$*"; fi
}
compose_dev() { compose_env "$@"; }
compose_env_mfe() { printf 'test:frontend:%s\\n' "$*"; }
compose_dev_mfe() { compose_env_mfe "$@"; }
${extract('append_unique')}
${extract('cmd_rebuild_changed')}
cmd_rebuild_changed rebuild-changed fixture-range
`;
    const result=spawnSync(bash,['--noprofile','--norc','-s'],{cwd:root,input:script,encoding:'utf8',timeout:15000,
      env:{...process.env,DEPLOY_TEST_FILES:files.join('\n'),DEPLOY_TEST_CONFIG_FAIL:String(failConfig)}});
    if(result.error)throw result.error;return result;
  }
  test(`${environment}: sintaxis Bash`,()=>{
    const result=spawnSync(bash,['-n'],{input:source,encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,result.stderr);
  });
  test(`${environment}: OCR junto con PTA, interfaz y SQL conserva el despliegue`,()=>{
    const result=run(['backend/rund-ocr-service/app.py','backend/rund-ocr-service/requirements.txt',
      'backend/academic-work-plan-service/src/main.ts','backend/academic-work-plan-service/src/app.module.ts',
      'apps/mfe-pta/src/components/PTAModule.tsx','db/migrations/657_rund_extraccion_progreso.sql']);
    assert.equal(result.status,0,result.stderr+result.stdout);
    assert(!result.stdout.includes('no such service'));
    assert.equal((result.stdout.match(/test:backend-build:academic-work-plan-service/g)||[]).length,1);
    assert(!result.stdout.includes('test:backend-build:rund'));
    assert(result.stdout.includes('test:frontend:build frontend-mfe-pta frontend-shell'));
    assert(result.stdout.includes('test:migration:global'));
    assert.equal((result.stdout.match(/OCR RUND: cambios detectados/g)||[]).length,1);
  });
  test(`${environment}: solo OCR informa su despliegue independiente sin invocar un backend inexistente`,()=>{
    const result=run(['backend/rund-ocr-service/Dockerfile']);
    assert.equal(result.status,0,result.stderr+result.stdout);
    assert(!result.stdout.includes('test:backend-build:'));
    assert(result.stdout.includes('docker-compose.rund-ocr.yml'));
  });
  test(`${environment}: backend desconocido falla antes de cualquier limpieza o reconstrucción`,()=>{
    const result=run(['backend/no-registrado/src/main.ts']);
    assert.notEqual(result.status,0);assert(result.stdout.includes('no está declarado'));
    assert(!result.stdout.includes('test:cleanup'));assert(!result.stdout.includes('test:backend-build:'));
  });
  test(`${environment}: configuración inválida detiene el despliegue antes de tocar artefactos`,()=>{
    const result=run(['backend/auth-service/src/main.ts'],true);
    assert.notEqual(result.status,0);assert(result.stdout.includes('No se pudo validar el Compose'));
    assert(!result.stdout.includes('test:cleanup'));assert(!result.stdout.includes('test:backend-build:'));
  });
}
