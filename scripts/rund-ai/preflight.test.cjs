const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { check } = require('../../backend/academic-work-plan-service/scripts/check-rund-ai.cjs');
const columns = {
  RundDocumentoPerfil: ['id', 'docente_id', 'estado'],
  RundExtraccionTrabajo: ['id', 'etapa', 'etapa_desde', 'iniciado_en', 'notificacion_id', 'notificado_en', 'notificacion_proxima', 'lease_id', 'lease_hasta'],
  RundExtraccionSugerencia: ['id', 'trabajo_id', 'campo', 'valor', 'estado'],
};
async function fixture(t, options = {}) {
  const requests = [], queries = [];
  const server = http.createServer((req, res) => {
    requests.push(req.method + ' ' + req.url);
    res.setHeader('Content-Type', 'application/json');
    if (options.redirect) { res.writeHead(302, { Location: 'http://must-not-be-contacted.invalid' }); res.end(); return; }
    res.end(JSON.stringify(req.url === '/health' ? { status: 'healthy', service: options.service || 'rund-ocr' }
      : { models: [{ name: options.model || 'gemma4:e4b' }] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  class Client {
    async connect() { queries.push('connect'); }
    async end() { queries.push('end'); }
    async query(sql) { queries.push(sql); return { rows: options.missing ? [] : Object.entries(columns).flatMap(([table_name, values]) => values.map(column_name => ({ table_name, column_name }))) }; }
  }
  return { env: { DB_HOST: 'synthetic-db', DB_USER: 'synthetic-user', DB_NAME: 'synthetic-db', RUND_OCR_ENABLED: 'true', RUND_OCR_PROVIDER: 'RUND', RUND_OLLAMA_MODEL: 'gemma4:e4b', RUND_OCR_URL: url, RUND_OLLAMA_URL: url }, Client, requests, queries };
}
test('sin BD explicita no usa por accidente valores PG_* heredados', async t => {
  const f = await fixture(t); delete f.env.DB_HOST;
  await assert.rejects(check(f.env, { Client: f.Client }), /Falta configuracion/);
  assert.equal(f.requests.length, 0); assert.equal(f.queries.length, 0);
});
test('diagnostico consulta salud/modelos y metadatos en transaccion de solo lectura; no inicia extraccion', async t => {
  const f = await fixture(t); await check(f.env, { Client: f.Client });
  assert.deepEqual(f.requests.sort(), ['GET /api/tags', 'GET /health']);
  assert.equal(f.queries[1], 'BEGIN READ ONLY');
  assert(f.queries[2].startsWith('SELECT table_name, column_name FROM information_schema.columns'));
  assert.equal(f.queries[3], 'ROLLBACK'); assert.equal(f.queries[4], 'end');
});
for (const [options, message] of [[{ model: 'qwen3.5:9b' }, /Gemma no/], [{ service: 'other' }, /El motor/], [{ missing: true }, /Faltan tablas/], [{ redirect: true }, /fetch failed/]]) {
  test(`diagnostico falla antes del despliegue: ${JSON.stringify(options)}`, async t => {
    const f = await fixture(t, options); await assert.rejects(check(f.env, { Client: f.Client }), message);
    assert(!f.requests.some(request => /extract|chat|generate/.test(request)));
    if (options.missing) assert.equal(f.queries.at(-1), 'end');
    else assert.equal(f.queries.length, 0);
  });
}
