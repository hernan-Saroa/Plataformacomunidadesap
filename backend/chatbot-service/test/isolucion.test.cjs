const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021,
      experimentalDecorators: true, emitDecoratorMetadata: true },
  });
  module._compile(outputText, filename);
};
require('reflect-metadata');
const sql = require('mssql');
const { identifier } = require('../src/modules/isolucion/isolucion.config.ts');
const { IsolucionService, searchTerms, safeDocumentUrl } = require('../src/modules/isolucion/isolucion.service.ts');

function fixture(overrides = {}, options = {}) {
  const env = {
    ENABLED: 'true', SEARCH_ENABLED: 'true', SERVER: 'sql.example.invalid', DATABASE: 'test',
    USER: 'reader', PASSWORD: ' synthetic $ credential ', ID_COLUMN: 'Codigo', TITLE_COLUMN: 'Titulo',
    TEXT_COLUMN: 'Contenido', URL_COLUMN: 'Enlace', VERSION_COLUMN: 'Version',
    ALLOWED_COLUMN: 'Publicacion', ALLOWED_VALUE: 'Vigente-publico', ...overrides,
  };
  const calls = [], pools = [];
  class Pool {
    constructor(config) { this.config = config; pools.push(this); }
    on() { return this; }
    async connect() {
      if (options.error) throw options.error;
      this.connected = true; return this;
    }
    async close() { this.connected = false; this.closed = true; }
  }
  class Request {
    constructor(pool, timeout) { this.params = {}; this.pool = pool; this.overrides = timeout; }
    input(name, type, value) { this.params[name] = value; return this; }
    async query(query) {
      calls.push({ query, params: this.params, overrides: this.overrides });
      if (options.queryError) throw options.queryError;
      if (query.includes('HAS_PERMS_BY_NAME')) return { recordset: options.views ?? [
        { esquema: 'Documentacion', vista: 'VW_LISTADOMAESTRODOCUMENTOS', puede_consultar: 1 },
      ] };
      if (query.includes('sys.columns')) return { recordset: (options.columns ?? [
        'Codigo', 'Titulo', 'Contenido', 'Enlace', 'Version', 'Publicacion',
      ]).map((columna) => ({ columna, tipo: 'nvarchar', admite_nulos: true })) };
      if (query.includes('TOP (0)')) return { recordset: [] };
      return { recordset: options.rows ?? [
        { id: 'PROC-01', titulo: 'Procedimiento de prueba', extracto: 'Contenido autorizado', version: '2', url: 'https://example.invalid/documento' },
      ] };
    }
  }
  const service = new IsolucionService({ get: (key) => env[key.replace('CHATBOT_ISOLUCION_', '')] },
    { ...sql, ConnectionPool: Pool, Request });
  return { service, calls, pools };
}

test('integración desactivada no conecta ni modifica el chatbot', async () => {
  const { service, pools } = fixture({ ENABLED: 'false' });
  assert.deepEqual(await service.search('procedimiento de prueba'), []);
  assert.deepEqual(await service.diagnostic(), { connected: false, code: 'DISABLED' });
  assert.equal(pools.length, 0);
});

test('conexión y recuperación se activan por separado, con diagnóstico sin filas documentales', async () => {
  const { service, calls, pools } = fixture({ SEARCH_ENABLED: 'false' });
  assert.deepEqual(await service.search('procedimiento'), []);
  const status = await service.diagnostic();
  assert.equal(status.connected, true); assert.equal(status.esquema, 'Documentacion');
  assert.equal(status.mappingStatus, 'ready'); assert.equal(status.searchEnabled, false);
  assert.equal(calls.length, 3); assert(calls.every(({ query }) => !query.includes('TOP (3)')));
  assert(!JSON.stringify(status).includes('reader')); assert(!JSON.stringify(status).includes('credential'));
  assert.equal(pools[0].config.password, ' synthetic $ credential ');
  assert.equal(pools[0].config.options.encrypt, true);
  assert.equal(pools[0].config.options.trustServerCertificate, false);
  assert.equal(pools[0].config.options.readOnlyIntent, true);
  assert.equal(pools[0].config.pool.max, 2);
  await service.onModuleDestroy(); assert.equal(pools[0].closed, true);
});

test('no asume dbo y rechaza vista invisible, esquemas ambiguos o falta de SELECT', async () => {
  for (const [views, code] of [
    [[], 'VIEW_NOT_VISIBLE'],
    [[{ esquema: 'uno' }, { esquema: 'dos' }], 'AMBIGUOUS_SCHEMA'],
    [[{ esquema: 'uno', puede_consultar: 0 }], 'SELECT_NOT_ALLOWED'],
  ]) {
    const { service, calls } = fixture({}, { views });
    assert.deepEqual(await service.diagnostic(), { connected: false, code });
    assert.equal(calls.length, 1); await service.onModuleDestroy();
  }
});

test('no lee documentos sin mapeo explícito y filtro de publicación autorizada', async () => {
  for (const overrides of [{ TEXT_COLUMN: '' }, { ALLOWED_COLUMN: '' }, { ALLOWED_VALUE: '' }]) {
    const { service, calls, pools } = fixture(overrides);
    await assert.rejects(service.search('procedimiento de prueba'), { code: 'MAPPING_REQUIRED' });
    assert.equal(calls.length, 0); assert.equal(pools.length, 0);
  }
  const { service, calls } = fixture({}, { columns: ['Codigo', 'Titulo', 'Contenido'] });
  await assert.rejects(service.search('procedimiento'), { code: 'INVALID_MAPPING' });
  assert(!calls.some(({ query }) => query.includes('TOP (3)')));
  await service.onModuleDestroy();
});

test('la búsqueda parametriza valores, limita columnas/filas y devuelve fuentes identificadas', async () => {
  const { service, calls } = fixture();
  const sources = await service.search("procedimiento ' DROP TABLE otra");
  assert.equal(sources[0].id, 'PROC-01'); assert.equal(sources[0].version, '2');
  assert.equal(sources[0].url, 'https://example.invalid/documento');
  const last = calls.at(-1);
  assert(last.query.includes('TOP (3)')); assert(last.query.includes('[Documentacion].[VW_LISTADOMAESTRODOCUMENTOS]'));
  assert(!last.query.includes('DROP')); assert(!last.query.includes('SELECT *'));
  assert.equal(last.params.allowed, 'Vigente-publico'); assert.equal(last.params.term0, '%procedimiento%');
  assert(last.query.includes('[Publicacion]) = @allowed AND'));
  assert(last.query.includes('CONVERT(nvarchar(max), [Publicacion]) = @allowed'));
  assert(calls.every(({ query }) => /^SELECT\s/i.test(query)));
  assert(calls.every(({ overrides }) => overrides.requestTimeout > 0 && overrides.requestTimeout <= 2500));
  await service.onModuleDestroy();
});

test('no consulta por saludos genéricos, elimina protocolos peligrosos y acota extractos', async () => {
  const { service, calls } = fixture({}, { rows: [
    { id: '1', titulo: 'Título', extracto: 'x'.repeat(6000), url: 'javascript:alert(1)' },
    { id: '', titulo: 'Sin identificador', extracto: 'texto' },
  ] });
  assert.deepEqual(searchTerms('Hola, gracias, por favor'), []);
  assert.deepEqual(await service.search('Hola gracias'), []); assert.equal(calls.length, 0);
  const rows = await service.search('certificados');
  assert.equal(rows.length, 1); assert.equal(rows[0].extracto.length, 2000); assert(!('url' in rows[0]));
  for (const value of ['file://servidor/archivo', '//example.invalid', 'https://user:pass@example.invalid', 'data:text/html,hi']) {
    assert.equal(safeDocumentUrl(value), undefined);
  }
  await service.onModuleDestroy();
});

test('falla sin configuración, oculta errores SQL y evita reconexiones continuas', async () => {
  const missing = fixture({ PASSWORD: '' });
  assert.deepEqual(await missing.service.diagnostic(), { connected: false, code: 'MISSING_CONFIG' });
  assert.equal(missing.pools.length, 0);
  const { service, pools } = fixture({}, { error: Object.assign(new Error('credential + infrastructure'), { code: 'ETIMEOUT' }) });
  assert.deepEqual(await service.diagnostic(), { connected: false, code: 'TIMEOUT' });
  assert.deepEqual(await service.diagnostic(), { connected: false, code: 'CONNECTION_UNAVAILABLE' });
  assert.equal(pools.length, 1); assert.equal(pools[0].closed, true);
});

test('comparte un pool de tamaño acotado y cierra sus conexiones al terminar', async () => {
  const { service, pools } = fixture();
  await Promise.all([service.diagnostic(), service.diagnostic()]);
  assert.equal(pools.length, 1); await service.onModuleDestroy(); assert.equal(pools[0].closed, true);
});

test('escapa identificadores SQL y el driver instalado respeta timeout por petición', () => {
  assert.equal(identifier('Columna] extra'), '[Columna]] extra]');
  assert.throws(() => identifier(''), { code: 'INVALID_IDENTIFIER' });
  assert.throws(() => identifier('vista\nSELECT'), { code: 'INVALID_IDENTIFIER' });
  const request = new sql.Request(new sql.ConnectionPool({ server: 'unused.invalid' }), { requestTimeout: 1234 });
  assert.equal(request.overrides.requestTimeout, 1234);
});
