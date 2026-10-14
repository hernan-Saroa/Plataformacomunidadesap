/* Revisión offline: solo lee fuentes y evidencias del repositorio.
 * No carga .env, consulta redes/bases, inicia Docker ni ejecuta scripts de despliegue.
 * Exit 0 significa revisión generada; no certifica que un ambiente esté listo.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const yaml = require('js-yaml');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const hashes = {};
function read(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  hashes[file] = crypto.createHash('sha256').update(source).digest('hex');
  return source;
}
const report = {
  reviewedAt: new Date().toISOString(), step: '12.5', scope: 'repository-only',
  targetEnvironments: ['local', 'dev', 'qa', 'pre', 'prod'],
  targetEnvironmentChecked: false, activationReadiness: 'not_verified',
  runtimeModified: false, realEnvironmentFilesRead: false, existingDatabaseUsed: false,
  findings: [],
};

const workflows = ['dev', 'qa', 'pre', 'prod'].map(environment => {
  const file = `.github/workflows/build-backend-${environment}.yml`;
  const workflow = yaml.load(read(file));
  const matrices = Object.entries(workflow.jobs).filter(([, job]) => Array.isArray(job.strategy?.matrix?.service));
  const services = matrices.flatMap(([, job]) => job.strategy.matrix.service);
  const overlay = environment === 'dev' ? 'docker-compose.ghcr.yml' : `docker-compose.${environment}.ghcr.yml`;
  const expectedImage = yaml.load(read(overlay)).services?.['rund-service']?.image;
  return { file, environment, expectedImage, matrixContainsRund: services.includes('rund-service') };
});
report.workflows = workflows;
if (workflows.some(item => item.expectedImage && !item.matrixContainsRund)) report.findings.push({
  id: 'RUND_IMAGE_NOT_IN_BUILD_MATRIX',
  scope: workflows.filter(item => !item.matrixContainsRund).map(item => item.environment),
  implication: 'Los workflows revisados no construyen la imagen RUND referenciada por sus overlays GHCR. No se comprobó si existe una imagen publicada por otro mecanismo.',
});

const migrations = ['migrate.local.sh', 'migrate.service.local.sh', ...['dev', 'qa', 'pre', 'prod'].map(env => `deploy.${env}.sh`)].map(file => {
  const source = read(file);
  return { file, psqlFileInvocations: source.split(/\r?\n/).filter(line => /\bpsql\b.*\s-f\s/.test(line)).map(line => line.trim()),
    declaresOnErrorStop: /ON_ERROR_STOP/.test(source),
    migrationFailureIgnored: source.split(/\r?\n/).filter(line => /cmd_db_migrate.*\|\|\s*(?:true\b|echo\b)/.test(line)).length };
});
report.migrations = migrations;
if (migrations.some(item => item.psqlFileInvocations.length && !item.declaresOnErrorStop)) report.findings.push({
  id: 'MIGRATION_SQL_FAILURE_NOT_EXPLICITLY_FATAL',
  implication: 'Hay invocaciones psql -f sin ON_ERROR_STOP explícito. Revisar manejo de errores, transacciones e historial antes de confiar en el resultado de una migración.',
});
if (migrations.some(item => item.migrationFailureIgnored)) report.findings.push({
  id: 'DEPLOY_CONTINUES_AFTER_MIGRATION_FAILURE',
  implication: 'Existen llamadas a cmd_db_migrate cuyo fallo se reduce a una advertencia o se ignora. No se ejecutaron esas migraciones.',
});

const auditFile = 'backend/api-gateway/src/audit/rund-audit-redaction.ts';
const exported = {};
vm.runInNewContext(ts.transpileModule(read(auditFile), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exported }, { timeout: 1000 });
const routes = [
  '/rund/api/v1/pta/banco-docentes/PERFIL/documentos',
  '/rund/api/v1/docentes/PERFIL',
  '/rund/api/v1/rund/interoperabilidad/perfiles/00000000?periodo=2099-1',
  '/auth/api/v1/carpeta-digital/persona/PERSONA/documentos',
  '/auth/api/v1/portal/carpeta-digital/documentos/ARCHIVO/reclassify',
];
report.auditCoverage = routes.map(route => ({ route, usesRundAuditPolicy: exported.isRundAuditUrl(route),
  redacted: exported.redactRundAuditUrl(route) }));
if (report.auditCoverage.some(item => !item.usesRundAuditPolicy)) report.findings.push({
  id: 'NEW_ROUTES_OUTSIDE_RUND_AUDIT_POLICY',
  implication: 'Rutas propias RUND y de Carpeta Digital no activan la política especial que omite cuerpos RUND. Revisar clasificación y redacción; esta comprobación no demuestra una filtración en un ambiente.',
});

const evidence = JSON.parse(read('docs/rund/validacion-vistas-carpeta-local.json'));
report.previousEvidenceFiles = Object.entries(evidence.hashes || {}).map(([file, expected]) => ({ file,
  unchanged: fs.existsSync(path.join(root, file)) && crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') === expected }));
report.limits = ['Destinos local, DEV, QA, PRE y PROD confirmados; sus instalaciones reales no se verifican con este script.',
  'Sin consultar imágenes GHCR, gateway, cookies, JWT, OpenKM, esquema ni identidades reales.',
  'Las pruebas previas no certifican rutas o fallos fuera de su cobertura.',
  'Una coincidencia de hashes se limita a los archivos registrados en la evidencia previa.'];
report.hashes = hashes;
const output = path.join(root, 'docs/rund/revision-preactivacion-repositorio.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Revisión offline generada: ${report.findings.length} hallazgos; instalaciones de los ambientes sin verificar.`);
console.log(path.relative(root, output));
