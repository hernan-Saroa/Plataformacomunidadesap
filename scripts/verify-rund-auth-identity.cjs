/* Controlador, guard y servicio compilados de Auth contra el PostgreSQL temporal
 * creado por verify-rund-service-integration.cjs. No carga AppModule ni .env.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const { randomUUID, randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const authRoot = path.join(root, 'backend/auth-service');
const dep = name => require(require.resolve(name, { paths: [authRoot] }));
const compiled = name => require(path.join(authRoot, 'dist', name));

module.exports = async function startIdentityFixture(pgConfig, runtime, token) {
  assert.equal(pgConfig.database, 'rund_integration');
  assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { Client, Pool } = require(path.join(root, 'backend/rund-service/node_modules/pg'));
  const db = new Client(pgConfig);
  await db.connect();
  const validationDb = new Pool({ ...pgConfig, max: 5, options: '-c default_transaction_read_only=on' });
  const operationRole = 'rund_op_' + randomUUID().replace(/-/g, '');
  const operationPassword = randomBytes(24).toString('hex');
  const { DataSource } = dep('typeorm');
  const operationDb = new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,database:pgConfig.database,
    username:operationRole,password:operationPassword,entities:[],synchronize:false,extra:{max:5}});
  let operationRoleCreated = false;
  const applyRole = 'rund_apply_' + randomUUID().replace(/-/g, '');
  const applyPassword = randomBytes(24).toString('hex');
  const mailRole = 'rund_mail_' + randomUUID().replace(/-/g, '');
  const mailPassword = randomBytes(24).toString('hex');
  let mailRoleCreated = false, mailDb, mailReadHook;
  let applyRoleCreated = false, applyDb, applyEnabled = true, applyDropAfterCommit = false;
  let compensationEnabled=false,abortProofUrl,compensationDropAfterCommit=false,lastCompensationError;
  const cleanupOperationRole = async () => {
    if (operationDb.isInitialized) await operationDb.destroy();
    if (applyDb?.isInitialized) await applyDb.destroy();
    if (mailDb) await mailDb.end();
    if (mailRoleCreated) {
      await db.query('SET default_transaction_read_only=off');
      await db.query(`DROP OWNED BY ${mailRole}; DROP ROLE ${mailRole}`);
    }
    if (applyRoleCreated) {
      await db.query('SET default_transaction_read_only=off');
      await db.query(`DROP OWNED BY ${applyRole}; DROP ROLE ${applyRole}`);
    }
    if (operationRoleCreated) {
      await db.query('SET default_transaction_read_only=off');
      await db.query(`DROP OWNED BY ${operationRole}; DROP ROLE ${operationRole}`);
    }
  };
  let app, operationDropAfterCommit = false, cancelDropAfterCommit = false;
  try {
    await db.query(`CREATE ROLE ${operationRole} LOGIN PASSWORD '${operationPassword}'; GRANT USAGE ON SCHEMA auth TO ${operationRole};
      GRANT SELECT,INSERT,UPDATE ON auth.rund_identidad_operacion TO ${operationRole}`);
    operationRoleCreated = true;
    await operationDb.initialize();
    await db.query(`CREATE ROLE ${applyRole} LOGIN PASSWORD '${applyPassword}'; GRANT USAGE ON SCHEMA auth TO ${applyRole};
      GRANT SELECT,INSERT,UPDATE ON auth.personas,auth."user",auth.user_roles,auth.rund_identidad_operacion TO ${applyRole};
      GRANT SELECT,INSERT ON auth.rund_identidad_efecto,auth.rund_identidad_compensacion TO ${applyRole};
      GRANT DELETE ON auth.user_roles TO ${applyRole};
      GRANT SELECT ON auth.role TO ${applyRole}; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA auth TO ${applyRole}`);
    applyRoleCreated = true;
    applyDb = new DataSource({ type:'postgres',host:pgConfig.host,port:pgConfig.port,database:pgConfig.database,
      username:applyRole,password:applyPassword,entities:[],synchronize:false,extra:{max:5} });
    await applyDb.initialize();
    await db.query(`CREATE ROLE ${mailRole} LOGIN PASSWORD '${mailPassword}'; GRANT USAGE ON SCHEMA auth TO ${mailRole};
      GRANT SELECT ON auth.personas,auth."user",auth.user_roles,auth.role,auth.rund_identidad_operacion,
        auth.rund_identidad_efecto,auth.rund_identidad_compensacion TO ${mailRole}`);
    mailRoleCreated = true;
    mailDb = new Pool({ ...pgConfig, user: mailRole, password: mailPassword, max: 5, options: '-c default_transaction_read_only=on' });
    await db.query('SET default_transaction_read_only=on');
    const { Module } = dep('@nestjs/common');
    const { NestFactory, Reflector } = dep('@nestjs/core');
    const { ConfigService } = dep('@nestjs/config');
    const { RundIdentityController, RundIdentityGuard, RundIdentityService } = compiled('users/rund-identity.controller');
    const { RundCatalogosController, RundCatalogosService } = compiled('users/rund-catalogos.controller');
    const { RundBancoController, RundBancoService } = compiled('users/rund-banco.controller');
    const { RundIdentityValidationController, RundIdentityValidationService } = compiled('users/rund-identity-validation.controller');
    const { RundIdentityOperationController, RundIdentityOperationService } = compiled('users/rund-identity-operation.controller');
    const { RundIdentityApplyController, RundIdentityApplyService } = compiled('users/rund-identity-apply.controller');
    const { RundIdentityCompensationController, RundIdentityCompensationService } = compiled('users/rund-identity-compensation.controller');
    const { RundIdentityAbortClient } = compiled('users/rund-identity-abort.client');
    const { RundIdentityMailValidationController, RundIdentityMailValidationService } = compiled('users/rund-identity-mail-validation.controller');
    const config = { get:key => key==='INTERNAL_SERVICE_TOKEN'?token:key==='RUND_IDENTITY_APPLY_ENABLED'?applyEnabled:
      key==='RUND_IDENTITY_COMPENSATION_ENABLED'?compensationEnabled:key==='RUND_SERVICE_URL'?abortProofUrl:undefined };
    const applyService = new RundIdentityApplyService(applyDb,config);
    const compensationService=new RundIdentityCompensationService(applyDb,config,new RundIdentityAbortClient(config));
    const compensate=compensationService.compensar.bind(compensationService);
    compensationService.compensar=async(...args)=>{try{return await compensate(...args);}catch(error){lastCompensationError={code:error.code||error.driverError?.code,message:error.message};throw error;}};
    let lastApplyError, applyResultHook;
    const apply = applyService.aplicar.bind(applyService);
    applyService.aplicar = async (...args) => { try {
      const result=await apply(...args);if(applyResultHook)await applyResultHook(result);return result;
    } catch(error) {
      lastApplyError={code:error.code||error.driverError?.code,message:error.message}; throw error;
    } };
    const { JwtAuthGuard } = compiled('auth/guards/jwt-auth.guard');
    const { ResponseInterceptor } = compiled('common/response.interceptor');
    const service = new RundIdentityService({ query: async (sql, values) => (await db.query(sql, values)).rows });
    let syncHook;
    const revalidateSync = service.revalidarSync.bind(service);
    service.revalidarSync = async raw => { if (syncHook) await syncHook(raw); return revalidateSync(raw); };
    class FixtureModule {}
    Module({ controllers: [RundIdentityController, RundCatalogosController, RundBancoController, RundIdentityValidationController, RundIdentityOperationController, RundIdentityApplyController,RundIdentityCompensationController,RundIdentityMailValidationController], providers: [RundIdentityGuard,
      { provide: RundIdentityService, useValue: service },
      { provide: RundCatalogosService, useValue: new RundCatalogosService({ query: async (sql, values) => (await db.query(sql, values)).rows }) },
      { provide: RundBancoService, useValue: new RundBancoService({ query: async (sql, values) => (await db.query(sql, values)).rows }) },
      { provide: RundIdentityValidationService, useValue: new RundIdentityValidationService({ query: async (sql, values) => (await validationDb.query(sql, values)).rows }) },
      { provide: RundIdentityOperationService, useValue: new RundIdentityOperationService(operationDb) },
      { provide: RundIdentityApplyService, useValue: applyService },
      { provide: RundIdentityCompensationService, useValue: compensationService },
      { provide: RundIdentityMailValidationService, useValue: new RundIdentityMailValidationService({ query: async (sql, values) => {
        const result = await mailDb.query(sql, values); if (mailReadHook) await mailReadHook(); return result.rows;
      } }) },
      { provide: ConfigService, useValue: config },
    ] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
    app.use((req, res, next) => {
      if(compensationDropAfterCommit&&/^\/internal\/rund\/v1\/personas\/escritura\/operaciones\/[^/]+\/compensar$/.test(req.path)&&req.method==='POST') {
        compensationDropAfterCommit=false;res.json=()=>{res.destroy();return res;};
      }
      if (cancelDropAfterCommit && /^\/internal\/rund\/v1\/personas\/escritura\/operaciones\/[^/]+\/cancelar$/.test(req.path) && req.method==='POST') {
        cancelDropAfterCommit = false;
        res.json = () => { res.destroy(); return res; };
      }
      if (applyDropAfterCommit && /^\/internal\/rund\/v1\/personas\/escritura\/operaciones\/[^/]+\/aplicar$/.test(req.path) && req.method==='POST') {
        applyDropAfterCommit = false;
        res.json = () => { res.destroy(); return res; };
      }
      if (operationDropAfterCommit && req.path === '/internal/rund/v1/personas/escritura/operaciones' && req.method === 'POST') {
        operationDropAfterCommit = false;
        // Ejecutar el controlador y confirmar el INSERT; perder únicamente el transporte de respuesta.
        res.json = () => { res.destroy(); return res; };
      }
      next();
    });
    app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    let unavailable = false;
    let catalogMode = 'normal';
    let bankCatalogRequests = 0;
    let ptaIdentityMode = 'normal';
    let bankIdentityMode = 'normal';
    let bankIdentityRequests = 0;
    let fichaMode = 'normal', aliasMode = 'normal';
    let coincidenciasMode = 'normal';
    let destinatarioMode = 'normal', destinatarioRequests = 0;
    let syncRoleMode = 'normal', syncAccountMode = 'normal';
    let permissionsMode = 'normal', permissionsRequests = 0;
    const permissionsHeaders = [];
    let prevalidationMode = 'normal', prevalidationRequests = 0;
    const prevalidationHeaders = [];
    let operationMode = 'normal';
    const operationHeaders = [];
    let mailValidationMode = 'normal';
    const mailValidationHeaders = [];
    const get = async (route, headers = { 'x-internal-service-token': token }, status = 200) => {
      const res = await fetch(url + '/internal/rund/v1/personas/' + route, { headers });
      assert.equal(res.status, status, await res.clone().text());
      return { res, body: await res.json() };
    };
    return {
      close: async () => { await app.close(); await cleanupOperationRole(); await db.end(); await validationDb.end(); },
      setCatalogMode: mode => { catalogMode = mode; },
      bankCatalogRequestCount: () => bankCatalogRequests,
      setPtaIdentityMode: mode => { ptaIdentityMode = mode; },
      setBankIdentityMode: mode => { bankIdentityMode = mode; },
      bankIdentityRequestCount: () => bankIdentityRequests,
      setFichaMode: mode => { fichaMode = mode; },
      setAliasMode: mode => { aliasMode = mode; },
      setCoincidenciasMode: mode => { coincidenciasMode = mode; },
      setDestinatarioMode: mode => { destinatarioMode = mode; },
      destinatarioRequestCount: () => destinatarioRequests,
      setSyncRoleMode: mode => { syncRoleMode = mode; },
      setSyncAccountMode: mode => { syncAccountMode = mode; },
      setSyncHook: hook => { syncHook = hook; },
      setPermissionsMode: mode => { permissionsMode = mode; },
      permissionsRequestCount: () => permissionsRequests,
      permissionsRequestHeaders: () => [...permissionsHeaders],
      setPrevalidationMode: mode => { prevalidationMode = mode; },
      prevalidationRequestCount: () => prevalidationRequests,
      prevalidationRequestHeaders: () => [...prevalidationHeaders],
      prevalidationConnectionReadOnly: async () => (await validationDb.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only === 'on',
      setOperationMode: mode => { operationMode = mode; },
      setApplyEnabled: value => { applyEnabled = value; },
      setCompensationEnabled: value=>{compensationEnabled=value;},
      setAbortProofUrl: value=>{abortProofUrl=value;},
      dropNextCompensationResponse: ()=>{compensationDropAfterCommit=true;},
      lastCompensationError: ()=>lastCompensationError,
      setApplyResultHook: hook => { applyResultHook=hook; },
      lastApplyError: () => lastApplyError,
      dropNextApplyResponse: () => { applyDropAfterCommit = true; },
      applyHasNoRundPrivileges: async () => (await applyDb.query("SELECT has_schema_privilege(current_user,'rund','USAGE') AS allowed"))[0].allowed===false,
      dropNextOperationResponse: () => { operationDropAfterCommit = true; },
      dropNextCancelResponse: () => { cancelDropAfterCommit = true; },
      operationRequestHeaders: () => [...operationHeaders],
      setMailValidationMode: mode => { mailValidationMode = mode; },
      setMailValidationReadHook: hook => { mailReadHook = hook; },
      mailValidationRequestHeaders: () => [...mailValidationHeaders],
      mailValidationReadOnlyOwner: async () => {
        const r = (await mailDb.query(`SELECT current_setting('default_transaction_read_only') AS readonly,
          has_table_privilege(current_user,'auth.user','UPDATE') AS writes,
          has_schema_privilege(current_user,'rund','USAGE') AS rund`)).rows[0];
        return r.readonly === 'on' && !r.writes && !r.rund;
      },
      operationHasNoIdentityPrivileges: async () => {
        const result = (await operationDb.query(`SELECT has_table_privilege(current_user,'auth.personas','SELECT') AS personas,
          has_table_privilege(current_user,'auth.user','INSERT') AS usuarios,
          has_table_privilege(current_user,'auth.user_roles','INSERT') AS roles`))[0];
        return !result.personas && !result.usuarios && !result.roles;
      },
      forward: (req, res) => {
        if (/^\/internal\/rund\/v1\/personas\/escritura\/operaciones\/[^/]+\/correo\/validar$/.test(req.url)) {
          mailValidationHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
            tokenMatches: req.headers['x-internal-service-token'] === token });
          if (mailValidationMode !== 'normal') {
            res.writeHead(mailValidationMode === 'missing' ? 404 : mailValidationMode === 'partial' ? 200 : 503, { 'Content-Type': 'application/json' });
            req.resume(); res.end(JSON.stringify({ success: true, data: {} })); return;
          }
        } else if (req.url.startsWith('/internal/rund/v1/personas/escritura/operaciones')) {
          operationHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
            tokenMatches: req.headers['x-internal-service-token'] === token });
          if (operationMode !== 'normal') {
            res.writeHead(operationMode === 'missing' ? 404 : operationMode === 'partial' ? 200 : 503, { 'Content-Type': 'application/json' });
            req.resume(); res.end(JSON.stringify({ success: true, data: {} })); return;
          }
        }
        if (req.url === '/internal/rund/v1/personas/escritura/validar') {
          prevalidationRequests++;
          prevalidationHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
            tokenMatches: req.headers['x-internal-service-token'] === token });
          if (prevalidationMode !== 'normal') {
            res.writeHead(prevalidationMode === 'missing' ? 404 : prevalidationMode === 'partial' ? 200 : 503, { 'Content-Type': 'application/json' });
            req.resume(); res.end(JSON.stringify({ success: true, data: {} })); return;
          }
        }
        if (req.url === '/internal/rund/v1/personas/permisos-roles') {
          permissionsRequests++;
          permissionsHeaders.push({ authorizationForwarded: Boolean(req.headers.authorization), cookieForwarded: Boolean(req.headers.cookie),
            tokenMatches: req.headers['x-internal-service-token'] === token });
          if (permissionsMode !== 'normal') {
            res.writeHead(permissionsMode === 'unavailable' ? 503 : permissionsMode === 'missing' ? 404 : 200,
              { 'Content-Type': 'application/json' });
            req.resume(); res.end(JSON.stringify({ success: true, data: { items: [], total: 0 } })); return;
          }
        }
        const syncMode = req.url === '/internal/rund/v1/personas/sincronizacion/rol-docente' ? syncRoleMode
          : req.url === '/internal/rund/v1/personas/sincronizacion/revalidar' ? syncAccountMode : 'normal';
        if (syncMode !== 'normal') {
          res.writeHead(syncMode === 'unavailable' ? 503 : syncMode === 'missing' ? 404 : 200, { 'Content-Type': 'application/json' });
          req.resume(); res.end(JSON.stringify({ success: true, data: {} })); return;
        }
        if (req.url === '/internal/rund/v1/personas/destinatario-aviso') {
          destinatarioRequests++;
          if (destinatarioMode !== 'normal') {
            res.writeHead(destinatarioMode === 'unavailable' ? 503 : destinatarioMode === 'missing' ? 404 : 200,
              { 'Content-Type': 'application/json' });
            req.resume(); res.end(JSON.stringify({ success: true, data: {} })); return;
          }
        }
        if (req.url === '/internal/rund/v1/personas/coincidencias' && coincidenciasMode !== 'normal') {
          res.writeHead(coincidenciasMode === 'unavailable' ? 503 : coincidenciasMode === 'missing' ? 404 : 200,
            { 'Content-Type': 'application/json' });
          req.resume(); res.end(JSON.stringify({ success: true, data: { items: [], total: 0 } })); return;
        }
        const pointMode = req.url.startsWith('/internal/rund/v1/personas/ficha/') ? fichaMode
          : req.url.startsWith('/internal/rund/v1/personas/por-alias/') ? aliasMode : 'normal';
        if (pointMode !== 'normal') {
          res.writeHead(pointMode === 'unavailable' ? 503 : pointMode === 'missing' ? 404 : 200,
            { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: {} })); return;
        }
        if (req.url === '/internal/rund/v1/banco/proyeccion') {
          bankIdentityRequests++;
          if (bankIdentityMode !== 'normal') {
            res.writeHead(bankIdentityMode === 'unavailable' ? 503 : bankIdentityMode === 'missing' ? 404 : 200,
              { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: bankIdentityMode === 'empty'
              ? { version: 1, items: [], total: 0, seccionales: [], seccionalesTotal: 0, sedes: [], sedesTotal: 0 }
              : { version: 1, items: [], total: 1 } })); return;
          }
        }
        if (req.url.startsWith('/internal/rund/v1/personas/perfil-pta/') && ptaIdentityMode !== 'normal') {
          res.writeHead(ptaIdentityMode === 'unavailable' ? 503 : ptaIdentityMode === 'missing' ? 404 : 200,
            { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: { encontrada: true } })); return;
        }
        if (req.url === '/internal/rund/v1/catalogos/territoriales-banco') bankCatalogRequests++;
        if (req.url.startsWith('/internal/rund/v1/catalogos/') && catalogMode !== 'normal') {
          res.writeHead(catalogMode === 'unavailable' ? 503 : 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: { items: [], total: catalogMode === 'empty' ? 0 : 1 } })); return;
        }
        if (unavailable) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{}'); return; }
        const upstream = http.request(url + req.url, { method: req.method, headers: req.headers }, response => {
          res.writeHead(response.statusCode, response.headers); response.pipe(res);
        });
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end(); });
        req.pipe(upstream);
      },
      verify: async (check, { database, internal, request, docenteId }) => {
        const person = (await database.query(`SELECT p.id_person, p.num_identificacion, p.nom_largo, u.id_user
          FROM auth.personas p JOIN auth."user" u ON u.id_person=p.id_person
          JOIN rund."Docente" d ON d."personaId"=p.id_person WHERE d.id=$1`, [docenteId])).rows[0];
        await check('Identidad Auth: token interno obligatorio aunque exista un JWT de usuario', async () => {
          for (const headers of [{}, { authorization: 'Bearer jwt-ficticio' }, { 'x-internal-service-token': 'incorrecto' }]) {
            await get('por-documento/' + person.num_identificacion, headers, 401);
            await get('resolver/' + person.id_user, headers, 401);
          }
        });
        await check('Identidad Auth: DTO mínimo y sin caché, leído por Auth en conexión de solo lectura', async () => {
          const { res, body } = await get('por-documento/' + person.num_identificacion);
          assert.equal(res.headers.get('cache-control'), 'private, no-store');
          assert.equal(body.success, true);
          assert.deepEqual(body.data, { personaId: person.id_person, documento: person.num_identificacion, nombreCompleto: person.nom_largo });
          assert.equal((await db.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on');
        });
        await check('Identidad Auth: alias de usuario y persona conservan su UUID; ausencias siguen siendo 404', async () => {
          for (const key of [person.id_user, person.id_person]) {
            assert.deepEqual((await get('resolver/' + key)).body.data, { personaId: person.id_person });
          }
          await get('por-documento/NO-EXISTE-FICTICIO', undefined, 404);
          await get('resolver/' + randomUUID(), undefined, 404);
          await internal('docentes/por-documento/NO-EXISTE-FICTICIO', { status: 404 });
        });
        await check('Identidad Auth: no exige cuenta activa ni rol para una identidad histórica', async () => {
          const personId = randomUUID(), userId = randomUUID(), document = 'IDF-' + randomUUID().replace(/-/g, '').slice(0, 20);
          try {
            await database.query(`INSERT INTO auth.personas
              (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero)
              VALUES ($1,$2,'CC','PERSONA FICTICIA','PERSONA','FICTICIA','X')`, [personId, document]);
            // La persona existe incluso antes de tener una cuenta.
            assert.equal((await get('por-documento/' + document)).body.data.personaId, personId);
            await database.query(`INSERT INTO auth."user" (id_user,public_id,username,password_hash,id_person,is_active)
              VALUES ($1,$2,$3,'HASH_FICTICIO',$4,false)`, [userId, randomUUID(), document, personId]);
            assert.deepEqual((await get('resolver/' + userId)).body.data, { personaId: personId });
          } finally {
            await database.query('DELETE FROM auth."user" WHERE id_user=$1', [userId]);
            await database.query('DELETE FROM auth.personas WHERE id_person=$1', [personId]);
          }
        });
        await check('Identidad RUND: indisponibilidad de Auth devuelve 503 y conserva los estados nativos', async () => {
          const snapshot = async () => (await database.query('SELECT * FROM rund.validacion_documental ORDER BY id')).rows;
          const before = await snapshot();
          unavailable = true;
          try {
            await internal('docentes/por-documento/' + person.num_identificacion, { status: 503 });
            await request('/rund/docente/' + person.id_user, { status: 503 });
            assert.deepEqual(await snapshot(), before);
          } finally { unavailable = false; }
        });
        await check('Identidad RUND: perfil explícito sigue disponible sin Auth y recupera búsqueda al restablecerlo', async () => {
          const before = (await internal('docentes/por-documento/' + person.num_identificacion)).data;
          unavailable = true;
          try { assert.equal((await internal('docentes/' + docenteId + '/validacion')).data.docenteId, docenteId); }
          finally { unavailable = false; }
          assert.deepEqual((await internal('docentes/por-documento/' + person.num_identificacion)).data, before);
        });
      },
    };
  } catch (error) { if (app) await app.close(); await cleanupOperationRole(); await db.end(); await validationDb.end(); throw error; }
};
