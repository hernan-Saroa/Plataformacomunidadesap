/* GET públicos, sin cookies, tokens, redirects ni escrituras. La URL debe ser explícita.
 * Un endpoint saludable no certifica esquema, roles, persistencia o imagen desplegada.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const environments = ['local', 'dev', 'qa', 'pre', 'prod'];
const targets = [
  { id: 'rund-readiness-through-gateway', path: '/services/rund/api/v1/health/ready', kind: 'health' },
  { id: 'rund-remote-entry', path: '/remotes/mfe-rund/assets/remoteEntry.js', kind: 'javascript', local: 'build/remotes/mfe-rund/assets/remoteEntry.js' },
  { id: 'personas-remote-entry', path: '/remotes/mfe-gestion-personas/assets/remoteEntry.js', kind: 'javascript', local: 'build/remotes/mfe-gestion-personas/assets/remoteEntry.js' },
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const networkCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH',
  'ECONNRESET', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID']);
function validateOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('explicit_origin_required');
  return url.origin;
}
function get(url) {
  return new Promise(resolve => {
    let settled = false;
    const finish = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
    const request = (url.startsWith('https:') ? https : http).get(url, {
      agent: false, headers: { Accept: 'application/json, application/javascript', 'User-Agent': 'rund-read-only-review/1.0' },
    }, response => {
      const chunks = []; let length = 0;
      if (response.statusCode >= 300 && response.statusCode < 400) {
        finish({ statusCode: response.statusCode, reason: 'redirect_not_followed' }); response.destroy(); return;
      }
      response.on('data', chunk => {
        length += chunk.length;
        if (length > 2 * 1024 * 1024) { finish({ statusCode: response.statusCode, reason: 'response_too_large' }); response.destroy(); }
        else chunks.push(chunk);
      });
      response.on('end', () => finish({ statusCode: response.statusCode, contentType: String(response.headers['content-type'] || ''), body: Buffer.concat(chunks) }));
      response.on('error', () => finish({ reason: 'response_failed' }));
      response.on('aborted', () => finish({ reason: 'response_failed' }));
    });
    const timer = setTimeout(() => { finish({ reason: 'timeout' }); request.destroy(); }, 5000);
    request.on('error', error => finish({ reason: 'connection_failed', networkCode: networkCodes.has(error.code) ? error.code : null }));
  });
}
async function inspectEndpoints(origin, fetch = get) {
  origin = validateOrigin(origin);
  return Promise.all(targets.map(async target => {
    const response = await fetch(origin + target.path);
    const result = { id: target.id, path: target.path, status: 'not_verified', httpStatus: response.statusCode || null };
    if (response.reason) return { ...result, reason: response.reason,
      ...(networkCodes.has(response.networkCode) ? { networkCode: response.networkCode } : {}) };
    if (response.statusCode !== 200) return { ...result, reason: response.statusCode === 401 || response.statusCode === 403 ? 'requires_authentication' : 'unexpected_http_status' };
    const body = response.body;
    if (!body?.length) return { ...result, reason: 'empty_response' };
    if (target.kind === 'health') {
      let data; try { data = JSON.parse(body.toString('utf8')); } catch { return { ...result, reason: 'invalid_health_response' }; }
      const valid = data?.service === 'rund-service' && data?.status === 'ok' && data?.database === 'up';
      return { ...result, status: valid ? 'observed' : 'not_verified', reason: valid ? 'service_and_connection_reported_healthy' : 'invalid_health_response', schemaVerified: false };
    }
    if (!/^(?:application|text)\/(?:javascript|ecmascript)(?:;|$)/i.test(response.contentType || '') || /^\s*</.test(body.toString('utf8')))
      return { ...result, reason: 'not_javascript' };
    const remoteHash = hash(body);
    let localHash = null;
    if (fs.existsSync(path.join(root, target.local))) localHash = hash(fs.readFileSync(path.join(root, target.local)));
    return { ...result, status: 'observed', bytes: body.length, sha256: remoteHash,
      matchesLocalEntry: localHash ? localHash === remoteHash : null, completeChunksVerified: false, exportsVerified: false };
  }));
}
async function run(args = process.argv.slice(2)) {
  let environment, origin;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--environment') environment = args[++i];
    else if (args[i] === '--origin') origin = args[++i];
    else throw new Error('invalid_arguments');
  }
  if (!environments.includes(environment) || !origin) throw new Error('explicit_target_required');
  origin = validateOrigin(origin);
  const checks = await inspectEndpoints(origin);
  const report = { checkedAt: new Date().toISOString(), step: '12.5d.2', environment,
    origin, originOwnershipVerified: false, mode: 'public-get-only', credentialsSent: false,
    redirectsFollowed: false, runtimeModified: false, deploymentExecuted: false,
    verifierSha256: hash(fs.readFileSync(__filename)),
    checks, activationReadiness: 'not_verified', imageDigestVerified: false,
    limits: ['La etiqueta y URL son explícitas; no se descubre ni certifica el propietario de la instalación.',
      'Una respuesta saludable solo comprueba servicio/conexión; no el esquema ni los permisos.',
      'El hash identifica únicamente remoteEntry; no prueba todos sus exports, chunks o una revisión Git.',
      'Sin JWT/cookies, APIs de negocio, cargas, OpenKM, Docker o consultas a bases.'] };
  fs.writeFileSync(path.join(root, `docs/rund/revision-endpoints-${environment}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(`RUND ${environment}: ${checks.filter(check => check.status === 'observed').length}/${checks.length} endpoints observados; activación sin verificar.`);
  return checks.every(check => check.status === 'observed') ? 0 : 1;
}
if (require.main === module) run().then(code => { process.exitCode = code; }).catch(() => {
  console.error('No se completó la revisión de endpoints; verifique ambiente y origen explícitos. No se muestran datos privados.'); process.exitCode = 1;
});
module.exports = { validateOrigin, inspectEndpoints, get, run };
