/* Correo RUND compilado sin base de datos y comparación con el envío previo. */
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const { randomUUID } = require('node:crypto');
const PriorMacroEmail = require('./fixtures/rund-macro-email-before-decoupling.cjs');

module.exports = async function verifyMacroNotifications(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, request, docenteId, publicBase, notificationBodies, setMailFailure } = context;
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const dep = name => require(require.resolve(name, { paths: [serviceRoot] }));
  const { MacroDocenteNotificationsService } = require(path.join(serviceRoot, 'dist/notifications/macro-docente-notifications.service'));
  const keys = ['NOTIFICATIONS_SERVICE_URL', 'NOTIFICATION_SERVICE_URL', 'PUBLIC_APP_URL', 'FRONTEND_URL',
    'AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN'];
  const saved = keys.map(key => process.env[key]), received = [], prior = new PriorMacroEmail();
  let app, sink, mode = 'normal';
  const options = { enteNombre: 'ENTE FICTICIO ' + randomUUID().slice(0, 8), enteContacto: ' externo-ficticio@example.test ',
    path: '/services/rund/api/v1/pta/macro-docente/externo/' + randomUUID(), fechaFin: new Date('2030-06-20T12:00:00Z') };
  const snapshot = async () => {
    const result = {};
    for (const [schema, table] of [['auth', 'personas'], ['auth', 'user'], ['auth', 'user_roles'], ['auth', 'role'], ['auth', 'permission'],
      ['auth', 'role_permissions'], ['academic_work_plan', 'PlanTrabajoAcademico'], ['academic_work_plan', 'Persona'],
      ['rund', 'Docente'], ['rund', 'validacion_documental']]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const waitForMail = async token => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const body = notificationBodies.find(item => JSON.stringify(item).includes(token)); if (body) return body;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('No se recibió el correo ficticio del acceso');
  };
  const create = enteContacto => request('/macro-docente/accesos-externos', { method: 'POST', status: 201,
    body: { enteNombre: options.enteNombre, enteContacto, docenteId,
      fechaInicio: new Date(Date.now() - 60000).toISOString(), fechaFin: new Date(Date.now() + 3600000).toISOString() } });
  try {
    sink = http.createServer(async (req, res) => {
      try {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        received.push({ route: req.url, body: JSON.parse(Buffer.concat(chunks).toString('utf8')), method: req.method,
          authorization: req.headers.authorization ?? null, internalToken: req.headers['x-internal-service-token'] ?? null,
          cookie: req.headers.cookie ?? null });
        if (mode === 'disconnect') { req.socket.destroy(); return; }
        res.writeHead(mode === 'unavailable' ? 503 : 201, { 'Content-Type': 'application/json' }); res.end('{}');
      } catch { res.writeHead(500); res.end('{}'); }
    });
    await new Promise(resolve => sink.listen(0, '127.0.0.1', resolve));
    const sinkUrl = 'http://127.0.0.1:' + sink.address().port;
    process.env.NOTIFICATIONS_SERVICE_URL = sinkUrl; delete process.env.NOTIFICATION_SERVICE_URL;
    process.env.PUBLIC_APP_URL = 'https://portal-ficticio.example.test'; delete process.env.FRONTEND_URL;
    process.env.AUTH_SERVICE_URL = 'dirección inválida sin servidor'; delete process.env.AUTH_INTERNAL_SERVICE_TOKEN; delete process.env.INTERNAL_SERVICE_TOKEN;
    const { Module } = dep('@nestjs/common'), { NestFactory } = dep('@nestjs/core');
    class FixtureModule {}
    Module({ providers: [MacroDocenteNotificationsService] })(FixtureModule);
    app = await NestFactory.createApplicationContext(FixtureModule, { logger: false, abortOnError: false });
    const service = app.get(MacroDocenteNotificationsService);
    await check('Correo Macro propio: provider compilado funciona sin DataSource, Auth ni credenciales internas', async () => {
      assert.throws(() => app.get(dep('typeorm').DataSource), /does not exist|could not find/i);
      const before = await snapshot(); assert.equal(await service.notifyAccesoExternoOtorgado(options), true);
      assert.equal(received.at(-1).route, '/api/v1/emails/send'); assert.deepEqual(await snapshot(), before);
    });
    await check('Correo Macro propio: payload completo, destinatario, textos, enlace y HTML coinciden con el envío anterior', async () => {
      for (const opts of [options, { ...options, enteContacto: '@' }, { ...options, path: options.path + '?x=<ficticio>&y="comillas"' }]) {
        const before = received.length; await prior.notifyAccesoExternoOtorgado(opts); await service.notifyAccesoExternoOtorgado(opts);
        assert.equal(received.length, before + 2); assert.deepEqual(received[before], received[before + 1]);
        assert.equal(received[before].authorization, null); assert.equal(received[before].internalToken, null); assert.equal(received[before].cookie, null);
      }
    });
    await check('Correo Macro propio: alternativas de URL y barras finales conservan el mismo contrato HTTP', async () => {
      const before = received.length;
      delete process.env.NOTIFICATIONS_SERVICE_URL; delete process.env.PUBLIC_APP_URL;
      process.env.NOTIFICATION_SERVICE_URL = sinkUrl + '/'; process.env.FRONTEND_URL = 'https://frontend-ficticio.example.test/';
      await prior.notifyAccesoExternoOtorgado(options); await service.notifyAccesoExternoOtorgado(options);
      assert.deepEqual(received[before], received[before + 1]);
      assert(received[before].body.text.includes('https://frontend-ficticio.example.test' + options.path));
      process.env.NOTIFICATIONS_SERVICE_URL = sinkUrl; process.env.PUBLIC_APP_URL = 'https://portal-ficticio.example.test';
    });
    await check('Correo Macro propio: contactos ausentes o sin @ omiten el envío sin consultas ni mutaciones', async () => {
      const before = await snapshot(), calls = received.length;
      for (const enteContacto of [null, '', ' ', 'contacto sin email']) {
        assert.equal(await service.notifyAccesoExternoOtorgado({ ...options, enteContacto }), false);
        assert.equal(await prior.notifyAccesoExternoOtorgado({ ...options, enteContacto }), false);
      }
      assert.equal(received.length, calls); assert.deepEqual(await snapshot(), before);
    });
    await check('Correo Macro propio: HTTP 503 y conexión perdida mantienen best-effort, sin reintento automático y con recuperación', async () => {
      const before = await snapshot();
      for (const fail of ['unavailable', 'disconnect']) {
        mode = fail; const calls = received.length;
        assert.equal(await prior.notifyAccesoExternoOtorgado(options), true); assert.equal(await service.notifyAccesoExternoOtorgado(options), true);
        assert.equal(received.length, calls + 2); assert.deepEqual(received[calls], received[calls + 1]);
      }
      mode = 'normal'; assert.equal(await service.notifyAccesoExternoOtorgado(options), true); assert.deepEqual(await snapshot(), before);
    });
    await check('Correo Macro propio: main crea el mismo enlace y envía el payload anterior al contacto guardado', async () => {
      const before = await snapshot(), result = await create(' contacto-main-ficticio@example.test '), access = result.data;
      const actual = await waitForMail(access.token), calls = received.length;
      process.env.PUBLIC_APP_URL = publicBase;
      await prior.notifyAccesoExternoOtorgado({ enteNombre: access.enteNombre, enteContacto: access.enteContacto,
        path: '/services/rund/api/v1/pta/macro-docente/externo/' + access.token, fechaFin: new Date(access.fechaFin) });
      assert.deepEqual(actual, received[calls].body); assert.equal(actual.to, access.enteContacto);
      assert.deepEqual(await snapshot(), before);
      await request(`/macro-docente/accesos-externos/${access.id}`, { method: 'DELETE' });
    });
    await check('Correo Macro propio: correo rechazado no impide acceso externo, consulta ni revocación del main', async () => {
      const before = await snapshot(); setMailFailure(true);
      try {
        const result = await create(' rechazo-main-ficticio@example.test '), access = result.data;
        await waitForMail(access.token); assert(access.token);
        const route = '/services/rund/api/v1/pta/macro-docente/externo/' + access.token;
        const external = await request(route + '?periodo=2026-2', { origin: publicBase, token: null }); assert(external.total > 0);
        await request(`/macro-docente/accesos-externos/${access.id}`, { method: 'DELETE' });
        await request(route, { origin: publicBase, token: null, status: 403 }); assert.deepEqual(await snapshot(), before);
      } finally { setMailFailure(false); }
    });
    await check('Correo Macro propio: sin email main guarda el acceso y su token sin intentar envío ni modificar propietarios', async () => {
      const before = await snapshot(), calls = notificationBodies.length, result = await create('contacto sin email');
      assert(result.data.token); await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(notificationBodies.length, calls); assert.deepEqual(await snapshot(), before);
      await request(`/macro-docente/accesos-externos/${result.data.id}`, { method: 'DELETE' });
    });
  } finally {
    setMailFailure(false); if (app) await app.close();
    if (sink) await new Promise(resolve => sink.close(resolve));
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
  }
};
