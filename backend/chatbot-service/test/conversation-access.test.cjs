// HTTP real de NestJS con JWT firmados y repositorios en memoria. Sin base de datos real.
const path = require('node:path');
const fs = require('node:fs');
const { Module: NodeModule } = require('node:module');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');

const serviceRoot = path.resolve(__dirname, '..');
// Permite verificar el checkout con dependencias ya instaladas en otro servicio.
const dependencyRoot = [serviceRoot, path.resolve(serviceRoot, '../travel-expenses-service')]
  .map((root) => path.join(root, 'node_modules'))
  .find((root) => fs.existsSync(path.join(root, '@nestjs/swagger')));
if (!dependencyRoot) throw new Error('Instale las dependencias de chatbot-service para ejecutar estas pruebas.');
process.env.NODE_PATH = [dependencyRoot, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
NodeModule._initPaths();
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021,
      experimentalDecorators: true, emitDecoratorMetadata: true,
    },
  });
  module._compile(outputText, filename);
};
require('reflect-metadata');
const { Module, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { getRepositoryToken } = require('@nestjs/typeorm');
const { DataSource } = require('typeorm');
const { ChatController } = require('../src/modules/chat/chat.controller.ts');
const { ChatService } = require('../src/modules/chat/chat.service.ts');
const { PublicChatController } = require('../src/modules/chat/public-chat.controller.ts');
const { PublicChatService } = require('../src/modules/chat/public-chat.service.ts');
const { ChatbotAuthGuard, READ_ALL_CONVERSATIONS } = require('../src/auth/chatbot-auth.guard.ts');
const { Conversacion } = require('../src/modules/chat/entities/conversacion.entity.ts');
const { Mensaje } = require('../src/modules/chat/entities/mensaje.entity.ts');
const { HealthModule } = require('../src/modules/health/health.module.ts');
const { ChatbotEnabledGuard } = require('../src/auth/chatbot-enabled.guard.ts');
const { IsolucionService } = require('../src/modules/isolucion/isolucion.service.ts');
const { getChatbotCorsOptions } = require('../src/config/cors.config.ts');

process.env.JWT_SECRET = `chatbot-test-${randomUUID()}`;
const alice = randomUUID(), bob = randomUUID(), admin = randomUUID();
const ownId = randomUUID(), otherId = randomUUID(), legacyId = randomUUID();
const conversations = new Map(), messages = [], actors = new Map();
let databaseFailure = false, moduleActive = true, authSql, app, base, jwt, failAssistantSave = false;
let documentSearchEnabled = false, documentSearchFailure = false, documentSources = [], documentSearchCalls = 0;
const documentSource = {
  isSearchEnabled: () => documentSearchEnabled,
  search: async () => {
    documentSearchCalls++;
    if (documentSearchFailure) throw new Error('Synthetic SQL secret');
    return documentSources;
  },
};

const conversationRepo = {
  create: (data) => ({ id: randomUUID(), isActivo: true, createdAt: new Date(), updatedAt: new Date(), ...data }),
  save: async (data) => { conversations.set(data.id, structuredClone(data)); return structuredClone(data); },
  update: async (criteria, data) => {
    const where = typeof criteria === 'string' ? { id: criteria } : criteria;
    const found = [...conversations.values()].find((row) => Object.entries(where).every(([key, value]) => row[key] === value));
    if (!found) return { affected: 0 };
    conversations.set(found.id, { ...found, ...structuredClone(data) });
    return { affected: 1 };
  },
  findOne: async ({ where }) => {
    const found = [...conversations.values()].find((row) => Object.entries(where).every(([key, value]) => row[key] === value));
    return found ? { ...structuredClone(found), mensajes: messages.filter((m) => m.conversacionId === found.id) } : null;
  },
  createQueryBuilder: () => {
    const conditions = [];
    return {
      where(sql, params) { conditions.push([sql, params]); return this; },
      andWhere(sql, params) { conditions.push([sql, params]); return this; },
      orderBy() { return this; },
      async getMany() {
        return [...conversations.values()].filter((row) => conditions.every(([sql, params]) => {
          if (sql.includes('is_activo')) return row.isActivo === params.activo;
          if (sql.includes('propietario_usuario_id')) return row.propietarioUsuarioId === params.userId;
          if (sql.includes('usuario_email')) return row.usuarioEmail === params.email;
          throw new Error(`Filtro no cubierto por el repositorio de pruebas: ${sql}`);
        })).map((row) => structuredClone(row));
      },
    };
  },
};
const messageRepo = {
  create: (data) => ({ id: randomUUID(), createdAt: new Date(), ...data }),
  save: async (data) => {
    if (failAssistantSave && data.rol === 'assistant') throw new Error('Synthetic persistence failure');
    messages.push(structuredClone(data)); return structuredClone(data);
  },
};
conversationRepo.manager = {
  async transaction(callback) {
    const oldConversations = structuredClone([...conversations]);
    const oldMessages = structuredClone(messages);
    try { return await callback({ getRepository: (entity) => entity === Conversacion ? conversationRepo : messageRepo }); }
    catch (error) {
      conversations.clear(); for (const [id, row] of oldConversations) conversations.set(id, row);
      messages.splice(0, messages.length, ...oldMessages); throw error;
    }
  },
};
const dataSource = { query: async (sql, params) => {
  if (sql.includes('FROM auth.module')) {
    assert.deepEqual(params, ['chatbot']);
    if (databaseFailure) throw new Error('Synthetic unavailable database');
    return moduleActive === null ? [] : [{ is_active: moduleActive }];
  }
  authSql = sql;
  assert.equal(params[1], READ_ALL_CONVERSATIONS);
  if (databaseFailure) throw new Error('Synthetic unavailable database');
  const actor = actors.get(params[0]);
  return actor ? [structuredClone(actor)] : [];
} };

before(async () => {
  class TestModule {}
  Module({
    imports: [JwtModule.register({}), HealthModule],
    controllers: [ChatController, PublicChatController],
    providers: [ChatService, ChatbotAuthGuard, ChatbotEnabledGuard, PublicChatService,
      { provide: IsolucionService, useValue: documentSource },
      { provide: DataSource, useValue: dataSource },
      { provide: getRepositoryToken(Conversacion), useValue: conversationRepo },
      { provide: getRepositoryToken(Mensaje), useValue: messageRepo }],
  })(TestModule);
  app = await NestFactory.create(TestModule, { logger: false });
  app.enableCors(getChatbotCorsOptions('https://app.example.invalid'));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  jwt = app.get(JwtService);
});
after(async () => { await app?.close(); });
beforeEach(() => {
  databaseFailure = false;
  moduleActive = true;
  failAssistantSave = false;
  documentSearchEnabled = false; documentSearchFailure = false; documentSources = []; documentSearchCalls = 0;
  conversations.clear(); messages.length = 0; actors.clear();
  for (const [id, name, canReadAll] of [[alice, 'Alice', false], [bob, 'Bob', false], [admin, 'Supervisor', true]]) {
    actors.set(id, { userId: id, email: `${name.toLowerCase()}@example.invalid`, name, canReadAll });
  }
  for (const [id, propietarioUsuarioId, usuarioEmail] of [[ownId, alice, null], [otherId, bob, 'bob@example.invalid'], [legacyId, null, 'alice@example.invalid']]) {
    conversations.set(id, { id, propietarioUsuarioId, usuarioId: alice, usuarioEmail,
      titulo: 'Consulta', contexto: 'general', isActivo: true, createdAt: new Date(), updatedAt: new Date() });
  }
});
const tokenFor = (id, claims = {}, options = {}) => jwt.sign({ sub: id, ...claims }, { secret: process.env.JWT_SECRET, expiresIn: '1h', ...options });
async function request(route, { actor, token, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${base}${route}`, {
    method, headers: { 'Content-Type': 'application/json', ...(actor || token ? { Authorization: `Bearer ${token || tokenFor(actor)}` } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}

test('rechaza el acceso directo sin JWT aunque se suplanten headers del gateway', async () => {
  for (const route of ['/chat/conversaciones', '/api/v1/chat/conversaciones', '/chat/acceso']) {
    assert.equal((await request(route, { headers: { 'x-user-id': admin, 'x-user-roles': 'SUPER_ADMIN' } })).status, 401);
  }
});
test('rechaza JWT inválido, vencido, con otro algoritmo o sin cuenta válida', async () => {
  for (const token of ['invalid', tokenFor(alice, {}, { expiresIn: -1 }), tokenFor(alice, {}, { algorithm: 'HS384' }), tokenFor('not-a-uuid'), tokenFor(randomUUID())]) {
    assert.equal((await request('/chat/conversaciones', { token })).status, 401);
  }
});

test('sin JWT_SECRET no acepta una clave implícita ni ejecuta operaciones privadas', async () => {
  const token = tokenFor(alice);
  const secret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.equal((await request('/chat/conversaciones', { token })).status, 401);
    assert.equal(messages.length, 0);
  } finally { process.env.JWT_SECRET = secret; }
});

test('el historial no se almacena en caché y CORS limita cookies a orígenes explícitos', async () => {
  const response = await fetch(`${base}/chat/conversaciones`, { headers: {
    Authorization: `Bearer ${tokenFor(alice)}`, Origin: 'https://app.example.invalid',
  } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example.invalid');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  for (const origin of ['https://other.example.invalid', 'null']) {
    const res = await fetch(`${base}/chat/conversaciones`, { headers: { Authorization: `Bearer ${tokenFor(alice)}`, Origin: origin } });
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
  assert.deepEqual(getChatbotCorsOptions('*').origin, []);
  assert.deepEqual(getChatbotCorsOptions('https://user:pass@example.invalid,https://example.invalid/path,https://ok.invalid/').origin, ['https://ok.invalid']);
});

test('rechaza mensajes vacíos, demasiado largos y metadatos inválidos antes de escribir', async () => {
  for (const contenido of ['', '  ', 123, null, 'x'.repeat(2001)]) {
    assert.equal((await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido } })).status, 400);
  }
  assert.equal((await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Hola', metadatos: [] } })).status, 400);
  for (const body of [{ titulo: 'x'.repeat(256) }, { contexto: 'x'.repeat(101) }, { titulo: '  ' }, { contexto: '  ' }]) {
    assert.equal((await request('/chat/conversaciones', { actor: alice, method: 'POST', body })).status, 400);
  }
  assert.equal(conversations.size, 3); assert.equal(messages.length, 0);
});

test('creación y envío revierten completamente si falla el guardado del asistente', async () => {
  const original = structuredClone([...conversations]);
  failAssistantSave = true;
  assert.equal((await request('/chat/conversaciones', { actor: alice, method: 'POST', body: {} })).status, 500);
  assert.deepEqual([...conversations], original); assert.equal(messages.length, 0);
  assert.equal((await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Fallo' } })).status, 500);
  assert.deepEqual([...conversations], original); assert.equal(messages.length, 0);
});

test('desactivar el módulo bloquea también la API privada y no consulta documentos', async () => {
  moduleActive = false; documentSearchEnabled = true;
  for (const [route, method, body] of [
    ['/chat/acceso', 'GET'], ['/chat/conversaciones', 'GET'],
    ['/chat/conversaciones', 'POST', {}], [`/chat/conversaciones/${ownId}`, 'GET'],
    [`/chat/conversaciones/${ownId}/mensajes`, 'POST', { contenido: 'Pregunta' }],
    [`/chat/conversaciones/${ownId}`, 'DELETE'],
  ]) assert.equal((await request(route, { actor: alice, method, body })).status, 404);
  assert.equal(messages.length, 0); assert.equal(conversations.size, 3); assert.equal(documentSearchCalls, 0);
  assert.equal((await request('/health')).status, 200);
});
test('acepta la cookie HttpOnly en las dos rutas del controlador', async () => {
  for (const route of ['/chat/conversaciones', '/api/v1/chat/conversaciones']) {
    const res = await request(route, { headers: { Cookie: `other=x; esap_access_token=${tokenFor(alice)}` } });
    assert.equal(res.status, 200); assert.deepEqual(res.data.map((c) => c.id), [ownId]);
  }
});
test('el historial personal usa la cuenta, incluso sin email, e ignora email ajeno', async () => {
  const res = await request('/chat/conversaciones?email=bob@example.invalid', { actor: alice });
  assert.equal(res.status, 200); assert.deepEqual(res.data.map((c) => c.id), [ownId]);
  assert.equal(res.data[0].puedeEscribir, true);
  assert(!('propietarioUsuarioId' in res.data[0]));
});
test('no concede historial global por roles o comodines declarados en el token', async () => {
  const token = tokenFor(alice, { roles: ['SUPER_ADMIN'], permissions: ['*', READ_ALL_CONVERSATIONS] });
  assert.equal((await request('/chat/conversaciones?todos=true', { token })).status, 403);
  assert.deepEqual((await request('/chat/acceso', { token })).data, { puedeVerTodas: false });
});
test('la lectura global requiere permiso vigente y admite el filtro exacto por email', async () => {
  const all = await request('/chat/conversaciones?todos=1', { actor: admin });
  assert.equal(all.status, 200); assert.equal(all.data.length, 3);
  assert(all.data.every((row) => row.puedeEscribir === false));
  const filtered = await request('/chat/conversaciones?todos=true&email=bob@example.invalid', { actor: admin });
  assert.deepEqual(filtered.data.map((c) => c.id), [otherId]);
  const personal = await request('/chat/conversaciones', { actor: admin });
  assert.deepEqual(personal.data, []);
});
test('revalida el permiso y la cuenta sin cachear roles del JWT', async () => {
  const token = tokenFor(admin);
  assert.equal((await request('/chat/conversaciones?todos=true', { token })).status, 200);
  actors.get(admin).canReadAll = false;
  assert.equal((await request('/chat/conversaciones?todos=true', { token })).status, 403);
  actors.delete(admin);
  assert.equal((await request('/chat/conversaciones', { token })).status, 401);
  for (const condition of ['r.is_active = true', 'rp.is_active = true', 'ap.is_active = true', 'ur.is_active = true', 'u.is_active = true']) assert(authSql.includes(condition));
});
test('si no se pueden verificar los permisos, falla cerrado', async () => {
  databaseFailure = true;
  assert.equal((await request('/chat/conversaciones', { actor: alice })).status, 500);
});
test('crear ignora identidad ajena y usa el propietario verificado', async () => {
  const res = await request('/chat/conversaciones', { actor: alice, method: 'POST', body: {
    titulo: 'Nueva consulta', usuarioId: bob, usuarioEmail: 'bob@example.invalid', usuarioNombre: 'Bob', propietarioUsuarioId: bob,
  } });
  assert.equal(res.status, 201); assert.equal(res.data.usuarioId, alice);
  assert.equal(res.data.usuarioEmail, 'alice@example.invalid'); assert.equal(res.data.usuarioNombre, 'Alice');
  assert.equal(res.data.puedeEscribir, true); assert.equal(conversations.get(res.data.id).propietarioUsuarioId, alice);
  assert.equal(res.data.mensajes.length, 1);
});
test('consultas ajenas, inexistentes y legacy no acreditadas devuelven el mismo 404', async () => {
  for (const id of [otherId, legacyId, randomUUID()]) {
    const res = await request(`/chat/conversaciones/${id}`, { actor: alice });
    assert.equal(res.status, 404); assert.equal(res.data.message, 'Conversación no encontrada.');
  }
  assert.equal((await request(`/chat/conversaciones/${ownId}`, { actor: alice })).status, 200);
});
test('administración puede leer consultas ajenas y legacy sin poder escribirlas ni borrarlas', async () => {
  for (const id of [otherId, legacyId]) {
    const detail = await request(`/chat/conversaciones/${id}`, { actor: admin });
    assert.equal(detail.status, 200); assert.equal(detail.data.puedeEscribir, false);
    assert.equal((await request(`/chat/conversaciones/${id}/mensajes`, { actor: admin, method: 'POST', body: { contenido: 'Intento' } })).status, 404);
    assert.equal((await request(`/chat/conversaciones/${id}`, { actor: admin, method: 'DELETE' })).status, 404);
    assert.equal(conversations.get(id).isActivo, true);
  }
  assert.equal(messages.length, 0);
});
test('un usuario no puede enviar mensajes ni borrar conversaciones de otro', async () => {
  assert.equal((await request(`/chat/conversaciones/${otherId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Intento' } })).status, 404);
  assert.equal((await request(`/chat/conversaciones/${otherId}`, { actor: alice, method: 'DELETE' })).status, 404);
  assert.equal(messages.length, 0); assert.equal(conversations.get(otherId).isActivo, true);
});
test('el propietario puede conversar y el remitente siempre se guarda como user', async () => {
  const res = await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Hola', rol: 'system' } });
  assert.equal(res.status, 200); assert.equal(res.data.userMessage.rol, 'user'); assert.equal(res.data.botMessage.rol, 'assistant');
  assert.equal(messages.length, 2);
});

test('la orientación reconoce tildes y no confunde contactar soporte con actas de grado', async () => {
  for (const [contenido, expected, excluded] of [
    ['Viáticos', '**Viáticos**'], ['Comisión', '**Viáticos**'], ['Título', '**Verificación de Títulos**'],
    ['Qué acepta el formulario', 'mesa de ayuda', 'Plan de Trabajo Académico'],
    ['Necesito contactar soporte', 'mesa de ayuda', 'Verificación de Títulos'],
    ['Proceso de compra', 'mesa de ayuda', 'Control Disciplinario'],
  ]) {
    const res = await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido } });
    assert.equal(res.status, 200); assert(res.data.botMessage.contenido.includes(expected));
    if (excluded) assert(!res.data.botMessage.contenido.includes(excluded));
  }
});
test('el chat conserva citas verificables cuando la fuente documental está habilitada', async () => {
  documentSearchEnabled = true;
  documentSources = [{ id: 'PR-01', titulo: 'Procedimiento de prueba', extracto: 'Texto documental autorizado', version: '2', url: 'https://example.invalid/fuente' }];
  const res = await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Procedimiento de prueba' } });
  assert.equal(res.status, 200); assert.equal(documentSearchCalls, 1);
  assert(res.data.botMessage.contenido.includes('Texto documental autorizado'));
  assert(res.data.botMessage.contenido.includes('Código: PR-01 · Versión: 2'));
  assert(res.data.botMessage.contenido.includes('https://example.invalid/fuente'));
  assert.deepEqual(res.data.botMessage.metadatos.fuentes, documentSources);
  assert.equal(res.data.botMessage.metadatos.motor, 'isolucion-documentos');
  const history = await request(`/chat/conversaciones/${ownId}`, { actor: alice });
  assert.deepEqual(history.data.mensajes.at(-1).metadatos.fuentes, documentSources);
});

test('los saludos no se presentan como búsquedas documentales sin resultados', async () => {
  documentSearchEnabled = true;
  const res = await request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Hola, gracias' } });
  assert.equal(res.status, 200);
  assert.equal(documentSearchCalls, 0);
  assert.equal(res.data.botMessage.metadatos.motor, 'esap-knowledge-base');
  assert(!res.data.botMessage.contenido.includes('No encontré documentos'));
});

test('distingue documentos ausentes de fallo de conexión y no divulga errores SQL', async () => {
  documentSearchEnabled = true;
  const send = () => request(`/chat/conversaciones/${ownId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Procedimiento' } });
  const missing = await send();
  assert.equal(missing.data.botMessage.metadatos.estado_fuente, 'sin_coincidencias');
  documentSearchFailure = true;
  const unavailable = await send();
  assert.equal(unavailable.status, 200);
  assert.equal(unavailable.data.botMessage.metadatos.estado_fuente, 'no_disponible');
  assert(unavailable.data.botMessage.contenido.includes('No pude consultar'));
  assert(!JSON.stringify(unavailable.data).includes('Synthetic SQL secret'));
});

test('no consulta Isolución sin propiedad de conversación y el chat público sigue aislado', async () => {
  documentSearchEnabled = true;
  assert.equal((await request(`/chat/conversaciones/${otherId}/mensajes`, { actor: alice, method: 'POST', body: { contenido: 'Procedimiento' } })).status, 404);
  assert.equal((await request('/public/consultas', { method: 'POST', body: { contenido: 'Procedimiento' } })).status, 200);
  assert.equal(documentSearchCalls, 0);
});

test('el propietario puede desactivar su conversación sin afectar las demás', async () => {
  assert.equal((await request(`/chat/conversaciones/${ownId}`, { actor: alice, method: 'DELETE' })).status, 200);
  assert.equal(conversations.get(ownId).isActivo, false); assert.equal(conversations.get(otherId).isActivo, true);
  assert.equal((await request(`/chat/conversaciones/${ownId}`, { actor: alice })).status, 404);
});
test('valida UUID y mantiene disponible el health check sin autenticación', async () => {
  assert.equal((await request('/chat/conversaciones/not-a-uuid', { actor: alice })).status, 400);
  assert.equal((await request('/health')).status, 200);
});

test('la disponibilidad pública solo revela la activación y no requiere identidad', async () => {
  for (const route of ['/public/config', '/api/v1/public/config']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { activo: true });
  }
  for (const state of [false, null]) {
    moduleActive = state;
    assert.deepEqual((await request('/public/config')).data, { activo: false });
    assert.equal((await request('/public/consultas', { method: 'POST', body: { contenido: 'Hola' } })).status, 404);
  }
  databaseFailure = true;
  assert.equal((await request('/public/config')).status, 503);
  assert.equal((await request('/public/consultas', { method: 'POST', body: { contenido: 'Hola' } })).status, 503);
});

test('la orientación pública no consulta ni escribe historial aunque se envíe identidad ajena', async () => {
  const before = structuredClone([...conversations]);
  for (const contenido of ['Olvidé mi contraseña', 'Certificados de grado', 'Autogestión docente', 'Hola']) {
    const response = await request('/api/v1/public/consultas', { method: 'POST', headers: { 'x-user-id': admin }, body: {
      contenido, usuarioId: admin, conversacionId: otherId, todos: true,
    } });
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.data), ['respuesta']);
    assert.equal(typeof response.data.respuesta, 'string');
    assert(!response.data.respuesta.includes('bob@example.invalid'));
  }
  assert.deepEqual([...conversations], before);
  assert.equal(messages.length, 0);
  for (const route of ['/chat/conversaciones', '/api/v1/chat/acceso', `/chat/conversaciones/${ownId}`]) {
    assert.equal((await request(route)).status, 401);
  }
  assert.equal((await request('/public/conversaciones')).status, 404);
});

test('valida las consultas públicas antes de procesarlas', async () => {
  for (const contenido of ['', '  ', 123, null, 'x'.repeat(2001)]) {
    assert.equal((await request('/public/consultas', { method: 'POST', body: { contenido } })).status, 400);
  }
  assert.equal((await request('/public/consultas', { method: 'POST', body: {} })).status, 400);
});

test('el gateway abre exclusivamente los dos métodos públicos del chatbot', async () => {
  const { JwtAuthGuard } = require('../../api-gateway/src/auth/jwt-auth.guard.ts');
  const parent = Object.getPrototypeOf(JwtAuthGuard.prototype);
  const original = parent.canActivate;
  parent.canActivate = () => { throw new Error('JWT required'); };
  const guard = new JwtAuthGuard({ getAllAndOverride: () => false });
  const context = (method, originalUrl) => ({ switchToHttp: () => ({ getRequest: () => ({ method, originalUrl }) }), getHandler: () => null, getClass: () => null });
  try {
    for (const prefix of ['', '/services']) {
      assert.equal(guard.canActivate(context('GET', `${prefix}/chatbot/api/v1/public/config?test=1`)), true);
      assert.equal(guard.canActivate(context('POST', `${prefix}/chatbot/api/v1/public/consultas/`)), true);
      for (const [method, path] of [
        ['POST', '/public/config'], ['GET', '/public/consultas'], ['DELETE', '/public/config'],
        ['GET', '/chat/acceso'], ['GET', '/chat/conversaciones?todos=true'], ['POST', '/chat/conversaciones'],
        ['GET', '/public/config/conversaciones'], ['GET', '/public/conversaciones'],
      ]) assert.throws(() => guard.canActivate(context(method, `${prefix}/chatbot/api/v1${path}`)), /JWT required/);
    }
    assert.equal(guard.canActivate(context('GET', '/auth/api/v1/login-settings')), true);
    assert.throws(() => guard.canActivate(context('GET', '/chatbot/api/v2/public/config')), /JWT required/);
  } finally { parent.canActivate = original; }
});
