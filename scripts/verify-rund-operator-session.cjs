/* HTTP de solo lectura con AuthController/JWT reales y cuentas ficticias en loopback.
 * No carga main, dotenv, módulos de base de datos ni archivos de credenciales.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..'), authRoot = path.join(root, 'backend/auth-service');
const dependency = name => require(require.resolve(name, { paths: [authRoot, root] }));
const checks = [], actor = 'abcdef00-1111-4111-8111-111111111111', person = 'abcdef00-2222-4222-8222-222222222222';
const reportFile = path.join(root, 'docs/rund/validacion-operador-sesion-http-local.json');
async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name); }

(async () => {
  let app;
  try {
    process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = randomBytes(32).toString('hex');
    process.env.INTERNAL_SERVICE_TOKEN = randomBytes(32).toString('hex');
    dependency('reflect-metadata');
    const { Module } = dependency('@nestjs/common'), { NestFactory } = dependency('@nestjs/core');
    const { JwtService } = dependency('@nestjs/jwt');
    const compiled = file => require(path.join(authRoot, 'dist', file));
    const { AuthController } = compiled('auth/auth.controller'), { AuthService } = compiled('auth/auth.service');
    const { UsersService } = compiled('users/users.service'), { LoginProtectionService } = compiled('auth/login-protection.service');
    const { JwtStrategy } = compiled('auth/strategies/jwt.strategy'), { JwtAuthGuard } = compiled('auth/guards/jwt-auth.guard');
    class FixtureModule {}
    Module({ controllers: [AuthController], providers: [JwtStrategy, JwtAuthGuard,
      { provide: AuthService, useValue: {} }, { provide: UsersService, useValue: {} },
      { provide: LoginProtectionService, useValue: {} }] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false });
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    assert(new URL(base).hostname === '127.0.0.1');
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const token = jwt.sign({ sub: actor, personId: person, id: person, email: 'ficticio@example.test', roles: ['GESTION_PROFESORAL'] }, { expiresIn: '5m' });
    const send = (headers = {}, suffix = '') => fetch(base + '/me' + suffix, { headers, cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const bearer = value => ({ authorization: `Bearer ${value}` });
    await check('Auth /me rechaza peticiones sin JWT aunque aporten actor y persona por query o cabeceras', async () => {
      const res = await send({ 'x-user-id': actor, 'x-person-id': person }, `?userId=${actor}&actorId=${actor}`);
      assert.equal(res.status, 401); await res.arrayBuffer();
    });
    await check('Token interno no sustituye la sesión del operador en /me', async () => {
      const res = await send({ 'x-internal-service-token': process.env.INTERNAL_SERVICE_TOKEN }); assert.equal(res.status, 401); await res.arrayBuffer();
    });
    await check('Bearer firmado conserva userId=sub de cuenta, omite persona y envía private,no-store', async () => {
      const res = await send(bearer(token), `?userId=${person}&actorId=${person}`); assert.equal(res.status, 200);
      assert.equal(res.headers.get('cache-control'), 'private, no-store'); const data = await res.json();
      assert.equal(data.userId, actor); assert.equal(data.personId, undefined); assert.equal(data.id, undefined);
      assert.deepEqual(data.roles, ['GESTION_PROFESORAL']);
    });
    await check('Cookie de sesión existente resuelve la misma cuenta sin leer credenciales en el shell', async () => {
      const res = await send({ cookie: `otra=1; esap_access_token=${encodeURIComponent(token)}` });
      assert.equal(res.status, 200); assert.equal((await res.json()).userId, actor);
    });
    await check('JWT vencido o firmado por otra clave no confirma principal', async () => {
      const expired = jwt.sign({ sub: actor }, { expiresIn: -10 });
      const forged = new JwtService({ secret: randomBytes(32).toString('hex') }).sign({ sub: actor });
      for (const value of [expired, forged, 'NO-JWT']) { const res = await send(bearer(value)); assert.equal(res.status, 401); await res.arrayBuffer(); }
    });

    // Ejecutar el lector productivo del shell: solo se sustituye su configuración
    // de destinos y la incorporación de la cookie que realiza un navegador.
    const ts = dependency('typescript');
    const sourceFile = path.join(root, 'apps/shell/src/components/rund/rundOperatorSession.ts');
    const output = ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: sourceFile,
    }).outputText;
    const environment = { API_MODE: 'direct', CORS_CONFIG: { credentials: 'include', mode: 'cors' },
      MICROSERVICE_URLS: { auth: base }, config: { API_TIMEOUT: 5000 }, getApiGatewayBaseUrl: () => { throw new Error('Solo loopback directo'); } };
    let cookie = token, calls = 0;
    const sandbox = { exports: {}, AbortController, setTimeout, clearTimeout,
      require: name => { assert.equal(name, '../../config/environment'); return environment; },
      fetch: (url, options) => {
        assert.equal(new URL(url).origin, base); assert.equal(new URL(url).pathname, '/me');
        assert.equal(options.credentials, 'include'); assert.equal(options.cache, 'no-store');
        assert.equal(options.headers.Authorization, undefined); calls++;
        return fetch(url, { ...options, headers: { ...options.headers, cookie: `esap_access_token=${cookie}` } });
      } };
    vm.runInNewContext(output, sandbox, { filename: sourceFile });
    const { readRundOperator, RundOperatorSession } = sandbox.exports;
    await check('Lector shell real usa HTTP Auth y entrega únicamente principal v1 de cuenta', async () => {
      const principal = await readRundOperator(); assert.equal(JSON.stringify(principal), JSON.stringify({ version: 1, actorId: actor }));
    });
    await check('Otro login cambia cuenta del lector y una cookie vencida falla sin refresh ni fallback', async () => {
      cookie = jwt.sign({ sub: person, personId: actor }, { expiresIn: '5m' });
      assert.equal((await readRundOperator()).actorId, person);
      cookie = jwt.sign({ sub: actor }, { expiresIn: -10 }); const before = calls;
      await assert.rejects(readRundOperator(), /No fue posible confirmar/); assert.equal(calls, before + 1);
    });
    await check('JWT firmado sin sub de cuenta UUID no se sustituye por persona o id', async () => {
      for (const payload of [{ personId: actor, id: actor }, { sub: 'PERSONA', personId: actor }]) {
        cookie = jwt.sign(payload, { expiresIn: '5m' }); await assert.rejects(readRundOperator(), /No fue posible confirmar/);
      }
    });
    await check('Conexión shell desactivada no consulta y la activa conserva el principal firmado', async () => {
      cookie = token; const connection = new RundOperatorSession(), before = calls;
      await assert.rejects(connection.connection.resolve()); assert.equal(calls, before);
      connection.activate(); assert.equal((await connection.connection.resolve()).actorId, actor); connection.deactivate();
      await assert.rejects(connection.connection.resolve());
    });
    await app.close(); app = null;
    fs.writeFileSync(reportFile, JSON.stringify({ verifiedAt: new Date().toISOString(), checkpoint: 78, passed: true,
      syntheticDataOnly: true, loopbackOnly: true, realAuthControllerGuardAndStrategy: true, realShellReader: true,
      databaseModulesLoaded: false, dotenvLoaded: false, applicationStopped: true, checks }, null, 2) + '\n');
    console.log(`${checks.length} comprobaciones; aplicación ficticia detenida; sin bases de datos.`);
  } finally { if (app) await app.close(); }
})().catch(() => { console.error('Falló la verificación ficticia de sesión del operador; no se publica evidencia de éxito.'); process.exitCode = 1; });
