const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkOpenKm } = require('./openkm-check.cjs');
const env = { OPENKM_BASE_URL: 'http://127.0.0.1/OpenKM', OPENKM_USERNAME: 'synthetic', OPENKM_PASSWORD: 'synthetic-password' };

test('sin configuración no envía solicitudes', async () => {
  const result = await checkOpenKm({}, () => { throw new Error('Unexpected request'); });
  assert.equal(result.status, 'NOT_CONFIGURED');
  assert.equal(result.missing.length, 3);
});

test('solo consulta metadatos raíz y no declara validada la escritura', async () => {
  const result = await checkOpenKm(env, async (url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(url.endsWith('folder/getProperties?fldId=%2Fokm%3Aroot'), true);
    assert.equal(options.body, undefined);
    return Response.json({ path: '/okm:root', uuid: 'synthetic' });
  });
  assert.equal(result.ok, true);
  assert.equal(result.writeAccessVerified, false);
  assert.equal(result.serverVersionVerified, false);
  assert.equal(JSON.stringify(result).includes(env.OPENKM_PASSWORD), false);
});

test('no confunde una pantalla de login con acceso REST exitoso', async () => {
  const result = await checkOpenKm(env, async () => new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }));
  assert.equal(result.status, 'UNEXPECTED_CONTENT_TYPE');
});

test('no expone respuestas internas de errores ni credenciales', async () => {
  const result = await checkOpenKm(env, async () => new Response('secret internal path', { status: 403 }));
  assert.deepEqual(result, { ok: false, status: 'HTTP_ERROR', httpStatus: 403, readOnly: true });
});

test('rechaza configuración insegura o timeout inválido antes de contactar el servidor', async () => {
  for (const changes of [{ OPENKM_BASE_URL: 'file:///secret' }, { OPENKM_BASE_URL: 'https://user:password@host/OpenKM' },
    { OPENKM_TIMEOUT_MS: '-1' }, { OPENKM_TIMEOUT_MS: 'NaN' }]) {
    assert.equal((await checkOpenKm({ ...env, ...changes }, () => { assert.fail('Unexpected request'); })).ok, false);
  }
});
