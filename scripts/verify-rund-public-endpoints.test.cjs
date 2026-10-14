// Respuestas ficticias y HTTP de loopback. No consulta los ambientes del proyecto.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { validateOrigin, inspectEndpoints, get } = require('./review-rund-public-endpoints.cjs');
const privateMarker = 'PRIVATE_FIXTURE_TOKEN_AND_PERSON';
test('origen explícito sin credenciales, ruta, consulta ni fragmentos', () => {
  assert.equal(validateOrigin('https://example.test'), 'https://example.test');
  assert.equal(validateOrigin('http://127.0.0.1:3016/'), 'http://127.0.0.1:3016');
  for (const value of ['file:///private', 'ftp://example.test', 'https://user:password@example.test',
    'https://example.test/path', 'https://example.test/?token=secret', 'https://example.test/#secret', 'invalid'])
    assert.throws(() => validateOrigin(value));
});
test('salud y JavaScript observados conservan las limitaciones de esquema y publicación', async () => {
  const checks = await inspectEndpoints('https://example.test', async url => ({ statusCode: 200,
    contentType: url.includes('/health/') ? 'application/json' : 'application/javascript; charset=utf-8',
    body: Buffer.from(url.includes('/health/') ? JSON.stringify({ service: 'rund-service', status: 'ok', database: 'up', privateMarker }) : 'export const fixture = true;') }));
  assert(checks.every(check => check.status === 'observed'));
  assert.equal(checks[0].schemaVerified, false);
  assert.equal(checks[1].completeChunksVerified, false);
  assert.equal(checks[1].exportsVerified, false);
  assert(!JSON.stringify(checks).includes(privateMarker));
});
for (const [name, response, reason] of [
  ['HTML del SPA con código 200', { statusCode: 200, contentType: 'text/html', body: '<html>private</html>' }, 'not_javascript'],
  ['HTML etiquetado como JavaScript', { statusCode: 200, contentType: 'application/javascript', body: ' <!DOCTYPE html>' }, 'not_javascript'],
  ['respuesta vacía', { statusCode: 200, contentType: 'application/javascript', body: '' }, 'empty_response'],
  ['acceso con sesión requerida', { statusCode: 401, body: privateMarker }, 'requires_authentication'],
  ['recurso ausente', { statusCode: 404, body: privateMarker }, 'unexpected_http_status'],
  ['redirección', { statusCode: 302, reason: 'redirect_not_followed' }, 'redirect_not_followed'],
]) test(`${name} no se declara como artefacto disponible`, async () => {
  const checks = await inspectEndpoints('https://example.test', async () => ({ ...response, body: Buffer.from(response.body || '') }));
  assert.equal(checks[1].status, 'not_verified');
  assert.equal(checks[1].reason, reason);
  assert(!JSON.stringify(checks).includes(privateMarker));
});
test('salud de otro servicio o solo liveness no confirma readiness RUND', async () => {
  for (const body of ['<html>ok</html>', '{}', JSON.stringify({ service: 'auth-service', status: 'ok', database: 'up' }),
    JSON.stringify({ service: 'rund-service', status: 'ok' }), JSON.stringify({ service: 'rund-service', status: 'error', database: 'down' })]) {
    const checks = await inspectEndpoints('https://example.test', async () => ({ statusCode: 200, body: Buffer.from(body) }));
    assert.equal(checks[0].status, 'not_verified');
  }
});
test('fallo de red conserva solo códigos conocidos y no publica mensajes privados', async () => {
  const checks = await inspectEndpoints('https://example.test', async () => ({ reason: 'connection_failed', networkCode: 'ENOTFOUND', message: privateMarker }));
  assert(checks.every(check => check.networkCode === 'ENOTFOUND' && check.status === 'not_verified'));
  assert(!JSON.stringify(checks).includes(privateMarker));
  const unknown = await inspectEndpoints('https://example.test', async () => ({ reason: 'connection_failed', networkCode: privateMarker }));
  assert(!JSON.stringify(unknown).includes(privateMarker));
});
async function serverFixture(handler, work) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await work(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('HTTP real solo envía GET sin cookies ni autorización y omite cuerpos privados del resultado', async () => {
  const requests = [];
  await serverFixture((request, response) => {
    requests.push({ method: request.method, cookie: request.headers.cookie, authorization: request.headers.authorization });
    response.setHeader('Content-Type', request.url.includes('/health/') ? 'application/json' : 'application/javascript');
    response.end(request.url.includes('/health/') ? JSON.stringify({ service: 'rund-service', status: 'ok', database: 'up', secret: privateMarker }) : `export const fixture = '${privateMarker}';`);
  }, async origin => {
    const checks = await inspectEndpoints(origin);
    assert(checks.every(check => check.status === 'observed'));
    assert(!JSON.stringify(checks).includes(privateMarker));
  });
  assert.equal(requests.length, 3);
  assert(requests.every(request => request.method === 'GET' && !request.cookie && !request.authorization));
});
test('HTTP real no sigue un Location y no publica su contenido privado', async () => {
  let visits = 0;
  await serverFixture((request, response) => { visits++; response.writeHead(302, { Location: '/private?token=' + privateMarker }); response.end(); }, async origin => {
    const result = await get(origin + '/redirect');
    assert.equal(result.reason, 'redirect_not_followed');
    assert(!JSON.stringify(result).includes(privateMarker));
  });
  assert.equal(visits, 1);
});
test('HTTP real limita el tamaño y descarta el cuerpo incompleto', async () => {
  await serverFixture((request, response) => response.end(Buffer.alloc(2 * 1024 * 1024 + 1, 65)), async origin => {
    const result = await get(origin + '/large');
    assert.equal(result.reason, 'response_too_large');
    assert.equal(result.body, undefined);
  });
});
test('HTTP real termina una respuesta que no finaliza', async () => {
  await serverFixture((request, response) => { response.writeHead(200); response.write('pending'); }, async origin => {
    const result = await get(origin + '/timeout');
    assert.equal(result.reason, 'timeout');
    assert.equal(result.body, undefined);
  });
});
