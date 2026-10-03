const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const { createHash } = require('node:crypto');

function within(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function resolveLocalDocument(provider, storedPath, roots) {
  if (!['LOCAL', 'LEGACY_LOCAL'].includes(provider)) return null;
  if (typeof storedPath !== 'string' || !storedPath || /[\x00-\x1f%\\?#]/.test(storedPath)) throw new Error('UNSAFE_PATH');
  let root = roots.pta;
  let relative = storedPath;
  if (relative.startsWith('/auth/api/v1/uploads/')) {
    if (provider !== 'LEGACY_LOCAL') throw new Error('UNSAFE_PATH');
    root = roots.auth;
    relative = relative.slice('/auth/api/v1/uploads/'.length);
  } else {
    relative = relative.replace(/^\/pta\/api\/v1\/uploads\//, '').replace(/^\/uploads\//, '');
  }
  if (!/^(rund-documentos|carpeta-digital)\//.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('UNSAFE_PATH');
  const target = path.resolve(root, relative);
  if (!within(root, target)) throw new Error('UNSAFE_PATH');
  return { root, target };
}

async function inspectDocument(row, roots) {
  const result = { id: row.id, provider: row.proveedor_almacenamiento, state: row.estado,
    category: row.categoria_codigo, pathFingerprint: createHash('sha256').update(row.almacenamiento_ruta || '').digest('hex') };
  if (row.proveedor_almacenamiento === 'OPENKM') return { ...result, status: 'REMOTE_NOT_READ', readyForCopy: false };
  let file;
  try { file = resolveLocalDocument(row.proveedor_almacenamiento, row.almacenamiento_ruta, roots); }
  catch { return { ...result, status: 'UNSAFE_PATH', readyForCopy: false }; }
  if (!file) return { ...result, status: 'UNKNOWN_PROVIDER', readyForCopy: false };
  try {
    const [realRoot, realFile] = await Promise.all([fsp.realpath(file.root), fsp.realpath(file.target)]);
    if (!within(realRoot, realFile)) return { ...result, status: 'OUTSIDE_UPLOADS', readyForCopy: false };
    const before = await fsp.stat(realFile);
    if (!before.isFile()) return { ...result, status: 'NOT_A_FILE', readyForCopy: false };
    const hash = createHash('sha256');
    let bytes = 0;
    // Streaming: no carga expedientes completos en memoria ni registra su contenido.
    for await (const chunk of fs.createReadStream(realFile)) { hash.update(chunk); bytes += chunk.length; }
    const after = await fsp.stat(realFile);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || bytes !== after.size) {
      return { ...result, status: 'CHANGED_DURING_READ', readyForCopy: false };
    }
    const sha256 = hash.digest('hex');
    const hasHash = /^[a-f0-9]{64}$/i.test(row.checksum_sha256 || '');
    const hashMatches = hasHash && sha256 === row.checksum_sha256.toLowerCase();
    const sizeMatches = Number(row.tamano_bytes) === bytes;
    const status = !hasHash ? 'BASELINE_REQUIRED' : !hashMatches ? 'HASH_MISMATCH' : !sizeMatches ? 'SIZE_MISMATCH' : 'VERIFIED';
    return { ...result, status, bytes, sha256, hashMatches, sizeMatches,
      // Una retirada lógica no se convierte automáticamente en documento vigente.
      readyForCopy: status === 'VERIFIED' && ['ACTIVO', 'REEMPLAZADO'].includes(row.estado) };
  } catch (error) {
    return { ...result, status: error.code === 'ENOENT' ? 'MISSING_FILE' : 'UNREADABLE_FILE', readyForCopy: false };
  }
}

function summarize(documents) {
  const counts = key => documents.reduce((out, row) => { const value = String(row[key]); out[value] = (out[value] || 0) + 1; return out; }, {});
  return { total: documents.length, byProvider: counts('provider'), byState: counts('state'),
    byStatus: counts('status'), readyForCopy: documents.filter(row => row.readyForCopy).length,
    uniquePaths: new Set(documents.map(row => row.pathFingerprint)).size };
}

module.exports = { within, resolveLocalDocument, inspectDocument, summarize };
