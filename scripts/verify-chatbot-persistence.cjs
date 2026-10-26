// TypeORM real y datos ficticios en tablas TEMP de una única conexión local.
// No crea esquemas ni altera tablas de la aplicación.
const fs = require('node:fs');
const path = require('node:path');
const { Module: NodeModule } = require('node:module');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { localConfig, reportError } = require('./rund-documental/local-context.cjs');
const serviceRoot = path.resolve(__dirname, '../backend/chatbot-service');
process.env.NODE_PATH = [path.join(serviceRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
NodeModule._initPaths();
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021,
      experimentalDecorators: true, emitDecoratorMetadata: true },
  });
  module._compile(outputText, filename);
};
require('reflect-metadata');
const { DataSource, getMetadataArgsStorage } = require('typeorm');
const { Conversacion } = require('../backend/chatbot-service/src/modules/chat/entities/conversacion.entity.ts');
const { Mensaje } = require('../backend/chatbot-service/src/modules/chat/entities/mensaje.entity.ts');
const { ChatService } = require('../backend/chatbot-service/src/modules/chat/chat.service.ts');

(async () => {
  const config = localConfig().database;
  // Solo se altera metadata dentro de este proceso de verificación.
  for (const table of getMetadataArgsStorage().tables) {
    if ([Conversacion, Mensaje].includes(table.target)) table.schema = 'pg_temp';
  }
  const source = new DataSource({
    type: 'postgres', host: config.host, port: config.port, username: config.user,
    password: config.password, database: config.database, entities: [Conversacion, Mensaje],
    synchronize: false, logging: false, extra: { max: 1, connectionTimeoutMillis: 5000, statement_timeout: 5000 },
  });
  await source.initialize();
  try {
    for (const entity of [Conversacion, Mensaje]) assert.equal(source.getMetadata(entity).schema, 'pg_temp');
    await source.query(`CREATE TEMP TABLE conversacion (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id uuid, propietario_usuario_id uuid,
      usuario_email varchar(255), usuario_nombre varchar(255), titulo varchar(255) NOT NULL DEFAULT 'Nueva conversación',
      contexto varchar(100) NOT NULL DEFAULT 'general', metadatos jsonb NOT NULL DEFAULT '{}',
      is_activo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await source.query(`CREATE TEMP TABLE mensaje (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversacion_id uuid NOT NULL REFERENCES pg_temp.conversacion(id) ON DELETE CASCADE,
      rol varchar(30) NOT NULL, contenido text NOT NULL, tokens integer NOT NULL DEFAULT 0,
      metadatos jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
    )`);
    const service = new ChatService(source.getRepository(Conversacion), source.getRepository(Mensaje), { isSearchEnabled: () => false });
    const actor = { userId: randomUUID(), email: 'synthetic@example.invalid', name: 'Persona ficticia', canReadAll: false };
    const other = { ...actor, userId: randomUUID() };
    const created = await service.crearConversacion({}, actor);
    assert.equal(created.mensajes.length, 1);
    for (const contenido of ['Primera pregunta', 'Segunda pregunta']) {
      const response = await service.enviarMensaje(created.id, { contenido }, actor);
      assert.equal(response.userMessage.rol, 'user'); assert.equal(response.botMessage.rol, 'assistant');
    }
    const detail = await service.obtenerConversacion(created.id, actor);
    assert.equal(detail.mensajes.length, 5);
    assert(detail.mensajes.every((message) => message.conversacionId === created.id));
    assert.equal(detail.titulo, 'Primera pregunta');
    await Promise.all(['Pregunta A', 'Pregunta B'].map((contenido) => service.enviarMensaje(created.id, { contenido }, actor)));
    const concurrent = await service.obtenerConversacion(created.id, actor);
    assert.equal(concurrent.mensajes.length, 9);
    assert.deepEqual(concurrent.mensajes.map((m) => m.rol), ['assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant']);
    assert(concurrent.mensajes.every((message, index, all) => !index || message.createdAt > all[index - 1].createdAt));

    await source.query("ALTER TABLE pg_temp.mensaje ADD CHECK (contenido <> '__SYNTHETIC_FAILURE__')");
    const failingService = new ChatService(source.getRepository(Conversacion), source.getRepository(Mensaje), { isSearchEnabled: () => false });
    failingService.generarRespuesta = async () => ({ contenido: '__SYNTHETIC_FAILURE__', metadatos: {} });
    await assert.rejects(failingService.enviarMensaje(created.id, { contenido: 'No guardar parcialmente' }, actor), (error) => error.code === '23514');
    const afterFailure = await service.obtenerConversacion(created.id, actor);
    assert.equal(afterFailure.mensajes.length, 9);
    assert.equal(afterFailure.updatedAt.getTime(), concurrent.updatedAt.getTime());
    await assert.rejects(service.enviarMensaje(created.id, { contenido: 'Ajena' }, other), (error) => error.getStatus() === 404);
    const delayedService = new ChatService(source.getRepository(Conversacion), source.getRepository(Mensaje), {
      isSearchEnabled: () => true,
      search: async () => { await service.eliminarConversacion(created.id, actor); return []; },
    });
    await assert.rejects(delayedService.enviarMensaje(created.id, { contenido: 'Eliminada durante la consulta' }, actor), (error) => error.getStatus() === 404);
    assert.equal((await source.query('SELECT count(*)::int AS n FROM pg_temp.mensaje'))[0].n, 9);
    await assert.rejects(service.obtenerConversacion(created.id, actor), (error) => error.getStatus() === 404);
    console.log('PASS: creación, historial íntegro y ordenado, envíos simultáneos, rollback por fallo SQL, propiedad y borrado durante la consulta con TypeORM/PostgreSQL reales en tablas TEMP.');
  } finally { await source.destroy(); }
})().catch(reportError);
