// Solo lectura: valida configuración y persistencia; no inicia, copia ni elimina archivos.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { deploymentConfiguration, sameMount, fileManifest, copyMatches } = require('./rund-documental/deployment.cjs');
const root = path.resolve(__dirname, '..');

function docker(args, input) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', input, timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error('DOCKER_CHECK_FAILED');
  return result.stdout;
}

async function main() {
  let environment, envFile;
  const flags = new Set();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--environment') environment = args[++i];
    else if (args[i] === '--env-file') envFile = args[++i];
    else if (['--persistent', '--configuration-only', '--verify-copy'].includes(args[i])) flags.add(args[i]);
    else throw new Error('INVALID_OPTION');
  }
  if (!['local', 'dev', 'qa', 'pre', 'prod', 'base', 'backend'].includes(environment)) throw new Error('ENVIRONMENT_REQUIRED');
  if (environment === 'local') {
    // Mismos valores que los wrappers deploy.local.sh / deploy.local.ps1.
    process.env.FRONTEND_NETWORK_KEY = 'superapp-net';
    process.env.FRONTEND_CONTAINER_SUFFIX = '-local';
  }
  envFile = path.resolve(root, envFile || (['base', 'backend'].includes(environment) ? '.env' : `.env.${environment}`));
  if (!fs.existsSync(envFile)) throw new Error('ENV_FILE_REQUIRED');
  const text = fs.readFileSync(envFile, 'utf8');
  const persistent = flags.has('--persistent') || process.env.RUND_DOCUMENTAL_PERSISTENT === 'true'
    || (process.env.RUND_DOCUMENTAL_PERSISTENT === undefined && /^\s*RUND_DOCUMENTAL_PERSISTENT\s*=\s*["']?true["']?\s*(?:#.*)?$/m.test(text));
  const files = ['-f', environment === 'base' ? 'docker-compose.yml' : `docker-compose.${environment}.yml`];
  if (persistent) files.push('-f', 'docker-compose.rund-documental.yml');
  const compose = ['compose', ...files, '--env-file', envFile];
  const configArgs = ['config', '--format', 'json'];
  // CI puede revisar la composición sin tener los .env de servicios reales.
  if (flags.has('--configuration-only')) configArgs.push('--no-env-resolution');
  const model = JSON.parse(docker([...compose, ...configArgs]));
  const config = deploymentConfiguration(model);
  const report = { environment, provider: config.provider, readOnly: true, errors: config.errors, warnings: config.warnings,
    configurationValid: config.errors.length === 0, persistenceVerified: false, currentContainerChecked: false,
    openKmConnectionVerified: false, databaseSchemaVerified: false };
  if (report.errors.length || flags.has('--configuration-only')) {
    console.log(JSON.stringify(report, null, 2));
    if (report.errors.length) process.exitCode = 1;
    return;
  }
  if (config.mount.type === 'bind') {
    const stat = await fsp.stat(config.mount.source).catch(() => null);
    if (!stat?.isDirectory()) throw new Error('PERSISTENT_DIRECTORY_MISSING');
  }
  const name = config.service.container_name;
  if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)) throw new Error('CONTAINER_NAME_REQUIRED');
  const ids = docker(['ps', '-aq', '--filter', `name=^/${name.replaceAll('.', '\\.')}$`]).trim().split(/\s+/).filter(Boolean);
  if (ids.length > 1) throw new Error('AMBIGUOUS_CONTAINER');
  if (ids.length === 0) {
    report.warnings.push('NO_CURRENT_CONTAINER_VERIFY_HISTORICAL_BACKUP');
    console.log(JSON.stringify(report, null, 2));
    // Sin origen no puede certificar que una copia contiene documentos históricos.
    process.exitCode = 2;
    return;
  }
  const [current] = JSON.parse(docker(['inspect', ids[0]]));
  report.currentContainerChecked = true;
  const oldEnv = Object.fromEntries((current.Config?.Env || []).map(value => {
    const index = value.indexOf('='); return [value.slice(0, index), value.slice(index + 1)];
  }));
  const oldRoot = oldEnv.RUND_DOCUMENT_LOCAL_ROOT || path.posix.join(current.Config?.WorkingDir || '/app', 'uploads');
  const oldMount = current.Mounts?.find(item => item.Destination === oldRoot);
  if (sameMount(model, config.mount, oldMount) && oldRoot === config.root) {
    report.persistenceVerified = true;
  } else if (flags.has('--verify-copy') && config.mount.type === 'bind' && current.State?.Running) {
    const code = fs.readFileSync(path.join(__dirname, 'rund-documental/deployment.cjs'), 'utf8')
      + '\nmodule.exports.fileManifest(process.argv[2]).then(value => console.log(JSON.stringify(value))).catch(() => process.exit(1));';
    const source = JSON.parse(docker(['exec', '-i', ids[0], 'node', '-', oldRoot], code));
    const target = await fileManifest(config.mount.source);
    if (!copyMatches(source, target)) report.errors.push('UPLOADS_COPY_MISMATCH');
    else { report.persistenceVerified = true; report.filesVerified = source.length; }
  } else report.errors.push('STORAGE_CHANGE_REQUIRES_VERIFIED_COPY');
  report.warnings.push('READ_ONLY_SNAPSHOT_PAUSE_UPLOADS_DURING_DEPLOYMENT');
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length || !report.persistenceVerified) process.exitCode = 1;
}

main().catch(error => {
  console.error(JSON.stringify({ readOnly: true, ok: false,
    error: /^[A-Z_]+$/.test(error?.message || '') ? error.message : 'DEPLOYMENT_CHECK_FAILED' }));
  process.exitCode = 1;
});
