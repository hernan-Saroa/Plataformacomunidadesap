/** Diagnóstico de solo lectura. Nunca crea carpetas ni carga documentos. */
async function checkOpenKm(env, request = fetch) {
  const missing = ['OPENKM_BASE_URL', 'OPENKM_USERNAME', 'OPENKM_PASSWORD'].filter(key => !env[key]?.trim());
  if (missing.length) return { ok: false, status: 'NOT_CONFIGURED', missing, readOnly: true };
  let base;
  try {
    base = new URL(env.OPENKM_BASE_URL.trim());
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
  } catch { return { ok: false, status: 'INVALID_BASE_URL', readOnly: true }; }
  const timeout = Number(env.OPENKM_TIMEOUT_MS || 15000);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60000) return { ok: false, status: 'INVALID_TIMEOUT', readOnly: true };
  const endpoint = `${base.toString().replace(/\/$/, '')}/services/rest/folder/getProperties?fldId=%2Fokm%3Aroot`;
  try {
    const response = await request(endpoint, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(timeout),
      headers: { Accept: 'application/json', Authorization: `Basic ${Buffer.from(`${env.OPENKM_USERNAME.trim()}:${env.OPENKM_PASSWORD}`).toString('base64')}` },
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, status: 'HTTP_ERROR', httpStatus: response.status, readOnly: true };
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      await response.body?.cancel();
      return { ok: false, status: 'UNEXPECTED_CONTENT_TYPE', readOnly: true };
    }
    const folder = await response.json();
    if (folder?.path !== '/okm:root') return { ok: false, status: 'UNEXPECTED_ROOT_RESPONSE', readOnly: true };
    return { ok: true, status: 'AUTHENTICATED_ROOT_READ_OK', readOnly: true,
      writeAccessVerified: false, serverVersionVerified: false, networkIsolationVerified: false };
  } catch { return { ok: false, status: 'CONNECTION_OR_RESPONSE_ERROR', readOnly: true }; }
}
module.exports = { checkOpenKm };
