const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');

function deploymentConfiguration(model) {
  const service = model.services?.['academic-work-plan-service'];
  if (!service) throw new Error('ACADEMIC_SERVICE_MISSING');
  const env = service.environment || {};
  const requested = String(env.RUND_DOCUMENT_PROVIDER || 'AUTO').trim().toUpperCase();
  const provider = requested === 'AUTO' ? (env.OPENKM_BASE_URL?.trim() ? 'OPENKM' : 'LOCAL') : requested;
  const errors = [];
  if (env.RUND_DOCUMENTAL_ENABLED !== 'true') errors.push('DOCUMENTAL_FEATURE_DISABLED');
  if (!['LOCAL', 'OPENKM'].includes(provider)) errors.push('INVALID_PROVIDER');
  if (provider === 'LOCAL' && String(env.RUND_DOCUMENT_ALLOW_LOCAL).toLowerCase() !== 'true') errors.push('LOCAL_WRITES_DISABLED');
  if (provider === 'OPENKM') {
    if (['OPENKM_BASE_URL', 'OPENKM_USERNAME', 'OPENKM_PASSWORD'].some(key => !env[key]?.trim())) errors.push('OPENKM_CONFIG_INCOMPLETE');
    try {
      const url = new URL(env.OPENKM_BASE_URL);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
    } catch { errors.push('OPENKM_URL_INVALID'); }
    const timeout = Number(env.OPENKM_TIMEOUT_MS || 15000);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 60000) errors.push('OPENKM_TIMEOUT_INVALID');
  }
  const root = env.RUND_DOCUMENT_LOCAL_ROOT || '/app/uploads';
  // El overlay conserva también las rutas históricas que usan /app/uploads.
  if (root !== '/app/uploads') errors.push('CUSTOM_ROOT_REQUIRES_MANUAL_LEGACY_REVIEW');
  const mount = service.volumes?.find(item => item.target === root);
  if (!mount || !['bind', 'volume'].includes(mount.type) || !mount.source) errors.push('PERSISTENT_UPLOADS_REQUIRED');
  if (provider === 'LOCAL' && mount?.read_only) errors.push('UPLOADS_READ_ONLY');
  const warnings = [];
  if (provider === 'LOCAL') warnings.push('PROVISIONAL_LOCAL_STORAGE');
  if (!env.RUND_TRD_POLICY_FILE) warnings.push('TRD_PENDING');
  if (!env.RUND_PRIVACY_POLICY_FILE) warnings.push('PRIVACY_POLICY_PENDING');
  return { service, mount, root, provider, errors, warnings };
}

function sameMount(model, planned, current) {
  if (!planned || !current || planned.type !== current.Type) return false;
  if (planned.type === 'volume') return (model.volumes?.[planned.source]?.name || planned.source) === current.Name;
  const normalize = value => String(value).replaceAll('\\', '/').replace(/\/$/, '');
  const a = normalize(planned.source), b = normalize(current.Source);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** Huellas de TODOS los uploads, sin contenido ni nombres personales en el manifiesto. */
async function fileManifest(root) {
  const result = [];
  async function visit(relative) {
    const directory = path.join(root, relative);
    const before = await fs.stat(directory);
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const next = path.join(relative, entry.name);
      const full = path.join(root, next);
      if (entry.isSymbolicLink()) throw new Error('SYMLINK_REQUIRES_MANUAL_REVIEW');
      if (entry.isDirectory()) await visit(next);
      else if (entry.isFile()) {
        const start = await fs.stat(full);
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(full)) hash.update(chunk);
        const end = await fs.stat(full);
        if (start.size !== end.size || start.mtimeMs !== end.mtimeMs || start.ino !== end.ino) throw new Error('UPLOADS_CHANGED_DURING_CHECK');
        result.push({ id: createHash('sha256').update(next.split(path.sep).join('/')).digest('hex'), size: end.size, sha256: hash.digest('hex') });
      } else throw new Error('NON_REGULAR_UPLOAD');
    }
    const after = await fs.stat(directory);
    if (before.mtimeMs !== after.mtimeMs) throw new Error('UPLOADS_CHANGED_DURING_CHECK');
  }
  try { await visit(''); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error('UPLOADS_DIRECTORY_MISSING');
    throw error;
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}

function copyMatches(original, target) {
  const byId = new Map(target.map(file => [file.id, file]));
  return original.every(file => {
    const copy = byId.get(file.id);
    return copy && file.size === copy.size && file.sha256 === copy.sha256;
  });
}

module.exports = { deploymentConfiguration, sameMount, fileManifest, copyMatches };
