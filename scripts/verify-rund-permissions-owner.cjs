/* Auth HTTP real y guards RUND compilados sin DataSource: permisos y revocaciones. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const previous = require('./fixtures/rund-effective-permissions-before-api.cjs');

module.exports = async function verifyPermissionsOwner(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, authUrl, authToken, authFixture, request } = context;
  const root = path.resolve(__dirname, '..'), serviceRoot = path.join(root, 'backend/rund-service');
  const dep = name => require(require.resolve(name, { paths: [serviceRoot] }));
  const compiled = file => require(path.join(serviceRoot, 'dist', file));
  const { AuthModule } = compiled('auth/auth.module'), { AuthIdentityModule, AuthIdentityClient } = compiled('common/auth-identity.client');
  const { PermissionsGuard } = compiled('auth/permissions.guard'), { JwtAuthGuard } = compiled('auth/jwt-auth.guard');
  const { BancoDocentesRolesGuard } = compiled('modules/banco-docentes/banco-docentes-roles.guard');
  const { MacroDocentePermissionGuard } = compiled('modules/macro-docente/macro-docente-permission.guard');
  const { RUND_PERMISSION_CODES } = compiled('auth/rund-permission-catalog');
  const { Public, RequirePermissions } = compiled('auth/auth.decorators'), { Roles } = compiled('auth/roles.decorator');
  const { RequireRundPermissions } = compiled('modules/banco-docentes/rund-permissions');
  const { RequierePermisoMacroDocente } = compiled('modules/macro-docente/macro-docente-permission.decorator');
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN'], saved = keys.map(key => process.env[key]);
  const tag = randomUUID().slice(0, 8).toUpperCase(), roleIds = [randomUUID(), randomUUID()],
    roleCodes = ['PERMISOS_OWNER_' + tag, 'PERMISOS_OTRO_' + tag], secret = 'JWT-FICTICIO-PERMISOS-' + randomUUID();
  const codes = ['rund.view', 'banco-docentes.rund.view', 'pta.macro_docente.consultar'];
  const permissions = (await database.query('SELECT id_permission,code,is_active FROM auth.permission WHERE code=ANY($1::text[])', [codes])).rows;
  assert.equal(permissions.length, 3);
  let app, fixtureUrl, jwt;
  const consulta = (roles = roleCodes) => ({ roles, codigos: RUND_PERMISSION_CODES });
  const source = async (raw = consulta(), status = 200, headers = { 'x-internal-service-token': authToken }) => {
    const res = await fetch(authUrl + '/internal/rund/v1/personas/permisos-roles', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(raw),
    });
    assert.equal(res.status, status, await res.clone().text()); return { res, body: await res.json() };
  };
  const snapshot = async () => {
    const result = {};
    for (const [schema, table] of [['rund', 'docente'], ['rund', 'Docente'], ['rund', 'validacion_documental'],
      ['rund', 'RundCampoEstado'], ['rund', 'RundAprobacionLog'], ['auth', 'personas'], ['auth', 'user']]) {
      result[schema + '.' + table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const token = (roles = [roleCodes[0]], extra = {}) => jwt.sign({ sub: randomUUID(), roles, ...extra }, { expiresIn: '10m' });
  const send = async (route, session = token(), status = 200, body) => {
    const res = await fetch(fixtureUrl + '/' + route, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session } : {}) },
      body: JSON.stringify(body || {}) });
    assert.equal(res.status, status, await res.clone().text()); return res;
  };
  try {
    process.env.AUTH_SERVICE_URL = authUrl; process.env.AUTH_INTERNAL_SERVICE_TOKEN = authToken; delete process.env.INTERNAL_SERVICE_TOKEN;
    for (let i = 0; i < roleIds.length; i++) await database.query(`INSERT INTO auth.role (id,code,name,category,is_active)
      VALUES ($1,$2,$2,'personalizado',true)`, [roleIds[i], roleCodes[i]]);
    for (const id of roleIds) for (const permission of permissions) await database.query(
      'INSERT INTO auth.role_permissions (id_rol,id_permission,is_active) VALUES ($1,$2,true)', [id, permission.id_permission]);
    await check('Permisos propietario: Auth exige token incluso con JWT y devuelve proyección mínima sin caché ni escrituras', async () => {
      for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) await source(consulta(), 401, headers);
      for (const raw of [null, [], {}, { roles: roleCodes }, { roles: 'ROL', codigos: [] }, { roles: [null], codigos: [] }]) await source(raw, 400);
      const before = await snapshot(), { res, body } = await source();
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert.deepEqual(body.data, { consulta: consulta(), items: (await database.query(previous.sql, [roleCodes, RUND_PERMISSION_CODES])).rows, total: 3 });
      assert.deepEqual(await snapshot(), before);
    });
    await check('Permisos propietario: unión de roles, minúsculas, espacios, códigos exactos y ausencia coinciden con SELECT anterior', async () => {
      try {
        await database.query('UPDATE auth.role SET code=lower(code) WHERE id=$1', [roleIds[0]]);
        for (const roles of [roleCodes, [roleCodes[0]], [roleCodes[0].toLowerCase()], [' ' + roleCodes[0] + ' '], [], ['SIN_GRANTS_' + tag]]) {
          const { body } = await source(consulta(roles));
          assert.deepEqual(body.data.items, (await database.query(previous.sql, [roles, RUND_PERMISSION_CODES])).rows);
          assert.equal(body.data.total, body.data.items.length);
        }
        await database.query('UPDATE auth.role SET code=$2 WHERE id=$1', [roleIds[0], ' ' + roleCodes[0] + ' ']);
        assert.equal((await source(consulta([roleCodes[0]]))).body.data.total, 0);
        const raw = { roles: [roleCodes[1]], codigos: ['RUND.VIEW', 'rund.view', '*', 'NO_EXISTE_FICTICIO'] };
        assert.deepEqual((await source(raw)).body.data.items, [{ code: 'rund.view' }]);
      } finally { await database.query('UPDATE auth.role SET code=$2 WHERE id=$1', [roleIds[0], roleCodes[0]]); }
    });
    await check('Permisos propietario: estados true/false/null de rol, permiso y grant conservan COALESCE activo', async () => {
      const permission = permissions.find(item => item.code === codes[0]);
      try {
        for (const roleActive of [true, false, null]) for (const permissionActive of [true, false, null]) for (const grantActive of [true, false, null]) {
          await database.query('UPDATE auth.role SET is_active=$2 WHERE id=$1', [roleIds[0], roleActive]);
          await database.query('UPDATE auth.permission SET is_active=$2 WHERE id_permission=$1', [permission.id_permission, permissionActive]);
          await database.query('UPDATE auth.role_permissions SET is_active=$3 WHERE id_rol=$1 AND id_permission=$2', [roleIds[0], permission.id_permission, grantActive]);
          const raw = { roles: [roleCodes[0]], codigos: [codes[0]] };
          assert.deepEqual((await source(raw)).body.data.items, (await database.query(previous.sql, [raw.roles, raw.codigos])).rows);
        }
      } finally {
        await database.query('UPDATE auth.role SET is_active=true WHERE id=$1', [roleIds[0]]);
        await database.query('UPDATE auth.permission SET is_active=$2 WHERE id_permission=$1', [permission.id_permission, permission.is_active]);
        await database.query('UPDATE auth.role_permissions SET is_active=true WHERE id_rol=$1', [roleIds[0]]);
      }
    });
    const { Module, Controller, Post, HttpCode, UseGuards } = dep('@nestjs/common'), { NestFactory, Reflector } = dep('@nestjs/core');
    const { ConfigModule } = dep('@nestjs/config');
    class FixtureController {
      base() { return { allowed: true }; } bank() { return { allowed: true }; } macro() { return { allowed: true }; }
      shared() { return { allowed: true }; } role() { return { allowed: true }; } public() { return { allowed: true }; }
    }
    Controller()(FixtureController);
    const decorate = (name, decorators) => decorators.forEach(decorator => decorator(FixtureController.prototype, name,
      Object.getOwnPropertyDescriptor(FixtureController.prototype, name)));
    for (const name of ['base', 'bank', 'macro', 'shared', 'role', 'public']) decorate(name, [Post(name), HttpCode(200)]);
    decorate('base', [RequirePermissions('rund.view')]);
    decorate('bank', [UseGuards(BancoDocentesRolesGuard), Roles('ROL_NO_ADMITIDO'), RequireRundPermissions('banco-docentes.rund.view')]);
    decorate('macro', [UseGuards(MacroDocentePermissionGuard), RequierePermisoMacroDocente('pta.macro_docente.consultar')]);
    decorate('shared', [UseGuards(BancoDocentesRolesGuard, MacroDocentePermissionGuard), RequirePermissions('rund.view'),
      Roles('ROL_NO_ADMITIDO'), RequireRundPermissions('banco-docentes.rund.view'), RequierePermisoMacroDocente('pta.macro_docente.consultar')]);
    decorate('role', [UseGuards(BancoDocentesRolesGuard), Roles('GESTION_PROFESORAL'), RequireRundPermissions('banco-docentes.rund.manage')]);
    decorate('public', [Public()]);
    class FixtureModule {}
    Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: secret })] }), AuthModule, AuthIdentityModule],
      controllers: [FixtureController], providers: [BancoDocentesRolesGuard, MacroDocentePermissionGuard] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()), app.get(PermissionsGuard));
    await app.listen(0, '127.0.0.1'); fixtureUrl = await app.getUrl(); jwt = new (dep('@nestjs/jwt').JwtService)({ secret });
    await check('Permisos propietario: los tres guards compilados funcionan por HTTP sin DataSource y exigen JWT', async () => {
      assert.throws(() => app.get(dep('typeorm').DataSource), /does not exist|could not find/i);
      for (const route of ['base', 'bank', 'macro', 'shared']) { await send(route); await send(route, null, 401); }
      await send('public', null);
    });
    await check('Permisos propietario: tres guards comparten una consulta por solicitud, sin reenviar JWT/cookies', async () => {
      const count = authFixture.permissionsRequestCount(), headers = authFixture.permissionsRequestHeaders().length;
      await send('shared'); assert.equal(authFixture.permissionsRequestCount(), count + 1);
      assert.deepEqual(authFixture.permissionsRequestHeaders().slice(headers), [{ tokenMatches: true, authorizationForwarded: false, cookieForwarded: false }]);
      await send('shared'); assert.equal(authFixture.permissionsRequestCount(), count + 2);
    });
    await check('Permisos propietario: JWT/body/query no conceden permisos ni implican administración, edición u otros ámbitos', async () => {
      const forged = token(['SIN_GRANTS_' + tag], { permissions: ['*', ...RUND_PERMISSION_CODES] });
      for (const route of ['base', 'bank', 'macro', 'shared', 'role']) await send(route + '?roles=SUPER_ADMIN', forged, 403,
        { roles: ['SUPER_ADMIN'], permissions: ['*', ...RUND_PERMISSION_CODES], rundPermissions: RUND_PERMISSION_CODES });
      await send('role', token(), 403);
      const sameSignedToken = token();
      await database.query('UPDATE auth.role_permissions SET is_active=false WHERE id_rol=$1 AND id_permission=$2',
        [roleIds[0], permissions.find(item => item.code === 'banco-docentes.rund.view').id_permission]);
      try { await send('bank', sameSignedToken, 403); await send('base', sameSignedToken); await send('macro', sameSignedToken); }
      finally { await database.query('UPDATE auth.role_permissions SET is_active=true WHERE id_rol=$1', [roleIds[0]]); }
    });
    await check('Permisos propietario: revocación de grant, permiso y rol se refleja en la siguiente solicitud y recupera con el mismo JWT', async () => {
      const session = token(), permission = permissions.find(item => item.code === 'rund.view');
      for (const target of ['grant', 'permission', 'role']) {
        const update = async value => target === 'role' ? database.query('UPDATE auth.role SET is_active=$2 WHERE id=$1', [roleIds[0], value])
          : target === 'permission' ? database.query('UPDATE auth.permission SET is_active=$2 WHERE id_permission=$1', [permission.id_permission, value])
            : database.query('UPDATE auth.role_permissions SET is_active=$3 WHERE id_rol=$1 AND id_permission=$2', [roleIds[0], permission.id_permission, value]);
        await send('base', session); await update(false);
        try { await send('base', session, 403); } finally { await update(true); }
        await send('base', session);
      }
    });
    await check('Permisos propietario: caída/404/contrato parcial deniegan permisos y conservan excepciones explícitas sin cache entre peticiones', async () => {
      const before = await snapshot(), session = token();
      for (const mode of ['unavailable', 'missing', 'partial']) {
        authFixture.setPermissionsMode(mode);
        for (const route of ['base', 'bank', 'macro']) await send(route, session, 403);
        await send('role', token(['GESTION_PROFESORAL']));
        const count = authFixture.permissionsRequestCount();
        for (const route of ['base', 'bank', 'macro', 'shared']) await send(route, token(['SUPER_ADMIN']));
        assert.equal(authFixture.permissionsRequestCount(), count);
        for (const alias of ['SUPERADMIN', 'ADMIN_SISTEMA']) { await send('base', token([alias])); await send('macro', token([alias]), 403); }
        authFixture.setPermissionsMode('normal'); await send('shared', session);
      }
      assert.deepEqual(await snapshot(), before);
    });
    await check('Permisos propietario: main RUND conserva acceso granular y enmascaramiento del banco y Macro Docente', async () => {
      const session = context.signToken({ sub: randomUUID(), roles: [roleCodes[0]], permissions: ['*'] });
      await request('/docentes', { token: session });
      const bank = await request('/banco-docentes?periodoCarga=2026-2', { token: session });
      assert(bank.items.length > 0); assert(bank.items.every(item => item.puntaje_salarial == null));
      await request('/macro-docente?periodo=2026-2', { token: session });
      await request('/macro-docente/accesos-externos', { token: session, status: 403 });
      await request('/docentes', { token: session, method: 'POST', status: 403, body: {} });
    });
    await check('Permisos propietario: main RUND deniega al caer Auth, recupera sin alterar perfiles y no bloquea SUPER_ADMIN', async () => {
      const before = await snapshot(), session = context.signToken({ sub: randomUUID(), roles: [roleCodes[0]] });
      authFixture.setPermissionsMode('unavailable');
      try {
        for (const route of ['/docentes', '/banco-docentes', '/macro-docente?periodo=2026-2']) await request(route, { token: session, status: 403 });
        await request('/docentes');
      } finally { authFixture.setPermissionsMode('normal'); }
      await request('/docentes', { token: session }); assert.deepEqual(await snapshot(), before);
    });
  } finally {
    authFixture.setPermissionsMode('normal'); if (app) await app.close();
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
    for (const permission of permissions) await database.query('UPDATE auth.permission SET is_active=$2 WHERE id_permission=$1', [permission.id_permission, permission.is_active]);
    await database.query('DELETE FROM auth.role_permissions WHERE id_rol=ANY($1::uuid[])', [roleIds]);
    await database.query('DELETE FROM auth.role WHERE id=ANY($1::uuid[])', [roleIds]);
  }
};
