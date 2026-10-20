/* Confirmación OCR de datos de identidad coordinada entre RUND y Auth, con PostgreSQL real en un clúster temporal.
 * - Auth real: controlador, guard, servicio, filtro y trigger de cédula (migración 672) sobre el DDL real de auth.
 * - RUND real: servicio compilado, migraciones 001-022 y cliente HTTP contra ese Auth.
 * - RUND se conecta con un rol SIN acceso al esquema auth: prueba que el flujo nuevo no hace SQL cruzado.
 * Solo datos ficticios; no lee .env ni se conecta a una base existente. Requiere compilar auth-service y rund-service.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const authRoot = path.join(root, 'backend/auth-service');
const rundRoot = path.join(root, 'backend/rund-service');
const dep = (base, name) => require(path.join(base, 'node_modules', name));
require(path.join(authRoot, 'node_modules/reflect-metadata'));
const { Client } = dep(rundRoot, 'pg');
const { Test } = dep(authRoot, '@nestjs/testing');
const { ConfigService } = dep(authRoot, '@nestjs/config');
const AuthTypeorm = dep(authRoot, 'typeorm');
const RundTypeorm = dep(rundRoot, 'typeorm');
const authDist = file => require(path.join(authRoot, 'dist', file));
const rundDist = file => require(path.join(rundRoot, 'dist', file));
const { RundIdentityController, RundIdentityGuard, RundIdentityService } = authDist('users/rund-identity.controller');
const { RundIdentityCorrectionController, RundIdentityCorrectionService } = authDist('users/rund-identity-correction.controller');
const { AllExceptionsFilter } = authDist('common/all-exceptions.filter');
const { ResponseInterceptor } = authDist('common/response.interceptor');
const { AuthIdentityClient } = rundDist('common/auth-identity.client');
const { AuthIdentityCorrectionClient, AuthIdentityCorrectionConflict } = rundDist('common/auth-identity-correction.client');
const { RundOcrIdentityCorrection } = rundDist('modules/banco-docentes/rund-ocr-identity-correction');

const pgBin = process.env.PG_BIN_DIR || ['C:/Program Files/PostgreSQL/18/bin', 'C:/Program Files/PostgreSQL/15/bin'].find(dir => fs.existsSync(dir));
const bin = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const run = (exe, args) => { const r = spawnSync(bin(exe), args, { stdio: 'ignore', windowsHide: true }); assert.equal(r.status, 0, `${exe} falló`); };
const token = 'token-ficticio-' + randomUUID();
let count = 0;
const check = async (name, fn) => { await fn(); count++; console.log('OK  ' + name); };
const actor = { actorId: 'OCR_FICTICIO', roles: ['SUPER_ADMIN'], fullAccess: true, ip: '127.0.0.1' };

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-ident-'));
  const port = 56000 + Math.floor(Math.random() * 900);
  run('initdb', ['-D', dir, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
  run('pg_ctl', ['-D', dir, '-o', `-p ${port} -c listen_addresses=127.0.0.1 -c max_connections=60`, '-l', path.join(dir, 'log.txt'), '-w', 'start']);
  const db = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
  let authApp, authDs, rundDs;
  try {
    await db.connect();
    for (const file of ['db/init/000_uuid_ossp.sql', 'db/init/003_auth_ddl_20260129_215539.sql', 'db/migrations/158_add_id_person_to_personas_and_user.sql',
      // Igual que el Auth real: fechas de persona y cuenta mantenidas por triggers.
      'db/migrations/160_set_personas_fechas_automaticas.sql']) {
      await db.query(fs.readFileSync(path.join(root, file), 'utf8'));
    }
    await db.query('SET search_path TO public');
    for (const name of fs.readdirSync(path.join(rundRoot, 'db/migrations')).filter(n => /^\d{3}_.*\.sql$/.test(n)).sort()) {
      await db.query('BEGIN'); try { await db.query(fs.readFileSync(path.join(rundRoot, 'db/migrations', name), 'utf8')); await db.query('COMMIT'); }
      catch (error) { await db.query('ROLLBACK'); throw new Error(`Migración ${name}: ${error.message}`); }
    }
    await db.query(fs.readFileSync(path.join(root, 'db/migrations/672_auth_rund_documento_correccion.sql'), 'utf8'));
    // RUND no tiene ningún permiso sobre el esquema auth.
    await db.query(`CREATE ROLE rund_ocr LOGIN; GRANT USAGE ON SCHEMA rund TO rund_ocr;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA rund TO rund_ocr;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA rund TO rund_ocr; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rund TO rund_ocr`);

    const conn = { type: 'postgres', host: '127.0.0.1', port, database: 'postgres', synchronize: false };
    authDs = new AuthTypeorm.DataSource({ ...conn, username: 'postgres' }); await authDs.initialize();
    rundDs = new RundTypeorm.DataSource({ ...conn, username: 'rund_ocr', extra: { max: 6 } }); await rundDs.initialize();

    const moduleRef = await Test.createTestingModule({
      controllers: [RundIdentityController, RundIdentityCorrectionController],
      providers: [RundIdentityGuard, RundIdentityService, RundIdentityCorrectionService, { provide: AuthTypeorm.DataSource, useValue: authDs },
        { provide: ConfigService, useValue: { get: key => (key === 'INTERNAL_SERVICE_TOKEN' ? token : undefined) } }],
    }).compile();
    authApp = moduleRef.createNestApplication();
    authApp.useGlobalFilters(new AllExceptionsFilter()); authApp.useGlobalInterceptors(new ResponseInterceptor());
    await authApp.init(); await authApp.listen(0, '127.0.0.1');
    const base = (await authApp.getUrl()).replace('[::1]', '127.0.0.1').replace('localhost', '127.0.0.1');
    Object.assign(process.env, { INTERNAL_SERVICE_TOKEN: token, AUTH_SERVICE_URL: base, RUND_OCR_IDENTITY_VIA_AUTH_API: 'true' });

    const corr = new AuthIdentityCorrectionClient();
    const svc = new RundOcrIdentityCorrection(rundDs, new AuthIdentityClient(), corr);
    const hooks = {};
    const realApply = corr.aplicar.bind(corr);
    corr.aplicar = async (...args) => {
      if (hooks.beforeApply) { const h = hooks.beforeApply; hooks.beforeApply = undefined; await h(...args); }
      const receipt = await realApply(...args);
      if (hooks.afterApply) { const h = hooks.afterApply; hooks.afterApply = undefined; await h(receipt); }
      return receipt;
    };

    // ---- Fixtures ----
    const person = async (extra = {}) => {
      const id = randomUUID(), p = { num: String(Math.floor(1e9 + Math.random() * 8e9)), tip: 'CC', nom: 'NOMBRE ORIGINAL', gen: 'F', nac: '1980-01-17', ...extra };
      await db.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,fec_nacimiento)
        VALUES ($1,$2,$3,$4,'DOCENTE','FICTICIO',$5,$6)`, [id, p.num, p.tip, p.nom, p.gen, p.nac]);
      return { id, ...p };
    };
    const columns = { documentNumber: 'num_identificacion', documentType: 'tip_identificacion', nombreCompleto: 'nom_largo', genero: 'gen_tercero', fechaNacimiento: 'fec_nacimiento::text' };
    const authValue = async (id, campo) => (await db.query(`SELECT ${columns[campo]} AS v FROM auth.personas WHERE id_person=$1`, [id])).rows[0].v;
    const scenario = async (campo, valor, { previo, persona } = {}) => {
      const p = persona || await person();
      const docenteId = 'doc-' + randomUUID();
      await db.query(`INSERT INTO rund."Docente" (id,"personaId","territorialId","tipoVinculacion",dedicacion,"updatedAt") VALUES ($1,$2,'1','CARRERA','TIEMPO_COMPLETO',now())`, [docenteId, p.id]);
      const documentId = randomUUID();
      await db.query(`INSERT INTO rund."RundDocumentoPerfil" (id,documento_logico_id,docente_id,categoria_codigo,nombre_archivo,mime_type,tamano_bytes,checksum_sha256,proveedor_almacenamiento,almacenamiento_ruta,creado_por)
        VALUES ($1,$2,$3,'IDENTIDAD','ficticio.pdf','application/pdf',1,$4,'LOCAL','ficticio.pdf','ACTOR')`, [documentId, randomUUID(), docenteId, '0'.repeat(64)]);
      const [job] = (await db.query(`INSERT INTO rund."RundExtraccionTrabajo" (documento_id,docente_id,creado_por,estado) VALUES ($1,$2,'ACTOR','COMPLETADO') RETURNING id`, [documentId, docenteId])).rows;
      const current = previo === undefined ? (await authValue(p.id, campo)) : previo;
      const [s] = (await db.query(`INSERT INTO rund."RundExtraccionSugerencia" (trabajo_id,campo,valor,valor_previo,pagina,evidencia,confianza,baja_confianza)
        VALUES ($1,$2,$3,$4,1,'evidencia ficticia',0.95,false) RETURNING id`, [job.id, campo, valor, current])).rows;
      return { p, docenteId, job: job.id, suggestionId: s.id };
    };
    const suggestion = async id => (await db.query('SELECT estado,valor_confirmado FROM rund."RundExtraccionSugerencia" WHERE id=$1', [id])).rows[0];
    const journals = async id => (await db.query('SELECT * FROM rund.identidad_correccion_ocr WHERE sugerencia_id=$1 ORDER BY creada_en', [id])).rows;
    const corrections = async personaId => (await db.query('SELECT * FROM auth.rund_identidad_correccion WHERE persona_id=$1 ORDER BY aplicada_en', [personaId])).rows;
    const rejects = async (promise, type, pattern) => {
      let error; try { await promise; } catch (e) { error = e; }
      assert(error, 'debía fallar'); if (type) assert(error instanceof type, `tipo inesperado: ${error?.constructor?.name}: ${error?.message}`);
      if (pattern) assert.match(error.message, pattern); return error;
    };
    const { ConflictException, ServiceUnavailableException, BadRequestException } = dep(rundRoot, '@nestjs/common');

    await check('RUND no puede leer ni escribir el esquema auth (el flujo no depende de SQL cruzado)', async () => {
      await assert.rejects(rundDs.query('SELECT 1 FROM auth.personas'), /permission denied|permiso denegado/i);
      await assert.rejects(rundDs.query(`UPDATE auth.personas SET nom_largo='x' WHERE false`), /permission denied|permiso denegado/i);
    });

    await check('la bandera apagada deja el flujo anterior: no maneja ningún campo', async () => {
      process.env.RUND_OCR_IDENTITY_VIA_AUTH_API = 'false';
      try { assert.equal(svc.enabled, false); assert.equal(svc.handles('documentNumber'), false); }
      finally { process.env.RUND_OCR_IDENTITY_VIA_AUTH_API = 'true'; }
      assert.equal(svc.handles('documentNumber'), true); assert.equal(svc.handles('pregrado'), false);
    });

    const happy = [
      ['documentNumber', '1234567890', 'num', v => assert.equal(v, '1234567890')],
      ['documentType', 'CE', 'tip', v => assert.equal(v, 'CE')],
      ['nombreCompleto', 'NOMBRE CORREGIDO DEL DOCENTE', 'nom', v => assert.equal(v, 'NOMBRE CORREGIDO DEL DOCENTE')],
      ['genero', 'Masculino', 'gen', v => assert.equal(v, 'M')],
      ['fechaNacimiento', '1975-06-30', 'nac', v => assert.equal(v, '1975-06-30')],
    ];
    for (const [campo, valor, , assertValue] of happy) {
      await check(`confirmar ${campo}: Auth cambia por API, RUND confirma y el diario queda CONFIRMADA`, async () => {
        const s = await scenario(campo, valor);
        const previous = await authValue(s.p.id, campo);
        assert.deepEqual(await svc.confirm(s.docenteId, s.suggestionId, actor), { confirmed: true, changed: true, campo, valor });
        assertValue(await authValue(s.p.id, campo));
        const [log] = await journals(s.suggestionId); assert.equal(log.estado, 'CONFIRMADA'); assert.equal(log.campo, campo); assert.equal(log.valor_previo, previous);
        const [row] = await corrections(s.p.id); assert.equal(row.estado, 'APLICADA'); assert.equal(row.operacion_id, log.operacion_id); assert.equal(row.valor_previo, previous);
        assert.equal((await suggestion(s.suggestionId)).estado, 'APROBADA');
        const audit = (await db.query(`SELECT accion,dato_previo,dato_nuevo FROM rund."RundAprobacionLog" WHERE docente_id=$1 AND campo_afectado=$2`, [s.docenteId, campo])).rows;
        assert.equal(audit.length, 1); assert.equal(audit[0].accion, 'APLICAR_SUGERENCIA_OCR');
        if (campo === 'documentNumber') assert.deepEqual([audit[0].dato_previo, audit[0].dato_nuevo], ['[PROTEGIDO]', '[PROTEGIDO]']);
        if (campo === 'fechaNacimiento') {
          const age = (await db.query(`SELECT "edadReferencia","rangoEdad" FROM rund."Docente" WHERE id=$1`, [s.docenteId])).rows[0];
          assert(age.edadReferencia >= 18); assert(age.rangoEdad);
        }
      });
    }

    await check('una coincidencia verificada no escribe en Auth ni abre diario', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE ORIGINAL');
      assert.deepEqual(await svc.confirm(s.docenteId, s.suggestionId, actor), { confirmed: true, changed: false, campo: 'nombreCompleto', valor: 'NOMBRE ORIGINAL' });
      assert.equal((await journals(s.suggestionId)).length, 0); assert.equal((await corrections(s.p.id)).length, 0);
      assert.equal((await db.query(`SELECT accion FROM rund."RundAprobacionLog" WHERE docente_id=$1`, [s.docenteId])).rows[0].accion, 'CONFIRMAR_COINCIDENCIA_OCR');
    });

    await check('si el dato cambió desde la extracción se rechaza antes de reservar nada', async () => {
      const s = await scenario('nombreCompleto', 'OTRO NOMBRE', { previo: 'NOMBRE ANTIGUO QUE YA NO ES' });
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException, /cambió desde la extracción/);
      assert.equal((await journals(s.suggestionId)).length, 0); assert.equal((await suggestion(s.suggestionId)).estado, 'PENDIENTE');
    });

    await check('un cambio concurrente entre la lectura y la aplicación lo detecta Auth (compare-and-set) y no se pisa', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE OCR');
      hooks.beforeApply = async () => { await db.query(`UPDATE auth.personas SET nom_largo='CAMBIO AJENO' WHERE id_person=$1`, [s.p.id]); };
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException, /cambió desde la extracción/);
      assert.equal(await authValue(s.p.id, 'nombreCompleto'), 'CAMBIO AJENO'); assert.equal((await corrections(s.p.id)).length, 0);
      const [log] = await journals(s.suggestionId); assert.equal(log.estado, 'COMPENSADA'); assert.equal(log.error_codigo, 'VALOR_PREVIO_CAMBIO');
      assert.equal((await suggestion(s.suggestionId)).estado, 'PENDIENTE');
    });

    await check('un documento ya asignado a otra persona se rechaza, deja el diario cerrado y Auth intacto', async () => {
      const other = await person({ num: '7777777777' }), s = await scenario('documentNumber', '7777777777');
      const before = await authValue(s.p.id, 'documentNumber');
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException, /ya está asociado a otra persona/);
      assert.equal(await authValue(s.p.id, 'documentNumber'), before); assert.equal(await authValue(other.id, 'documentNumber'), '7777777777');
      assert.equal((await journals(s.suggestionId))[0].estado, 'COMPENSADA'); assert.equal((await corrections(s.p.id)).length, 0);
    });

    await check('validaciones del flujo anterior: tipo/documento incompatibles, género inválido y edad fuera de rango', async () => {
      const a = await scenario('documentNumber', 'ABC12'); await rejects(svc.confirm(a.docenteId, a.suggestionId, actor), BadRequestException, /únicamente dígitos/);
      const b = await scenario('fechaNacimiento', '2020-01-01'); await rejects(svc.confirm(b.docenteId, b.suggestionId, actor), BadRequestException, /edad válida/);
      const c = await scenario('genero', 'Otro'); await rejects(svc.confirm(c.docenteId, c.suggestionId, actor), BadRequestException, /género/);
      for (const s of [a, b, c]) { assert.equal((await journals(s.suggestionId)).length, 0); assert.equal((await corrections(s.p.id)).length, 0); }
    });

    await check('sugerencia descartada, PDF reemplazado o sin vigencia: conflicto sin diario ni cambios', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE NUEVO');
      await db.query(`UPDATE rund."RundExtraccionSugerencia" SET estado='DESCARTADA' WHERE id=$1`, [s.suggestionId]);
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException, /ya fue revisada/);
      const t = await scenario('nombreCompleto', 'NOMBRE NUEVO');
      await db.query(`UPDATE rund."RundDocumentoPerfil" SET estado='REEMPLAZADO' WHERE docente_id=$1`, [t.docenteId]);
      await rejects(svc.confirm(t.docenteId, t.suggestionId, actor), ConflictException);
      for (const x of [s, t]) { assert.equal((await journals(x.suggestionId)).length, 0); assert.equal((await corrections(x.p.id)).length, 0); }
    });

    await check('Auth no responde al aplicar: la reserva queda y reintentar reanuda la MISMA operación sin duplicar', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE TRAS FALLO');
      hooks.beforeApply = async () => { throw new ServiceUnavailableException('Auth caído'); };
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ServiceUnavailableException);
      const [first] = await journals(s.suggestionId); assert.equal(first.estado, 'RESERVADA'); assert.equal((await corrections(s.p.id)).length, 0);
      assert.equal(await authValue(s.p.id, 'nombreCompleto'), 'NOMBRE ORIGINAL');
      assert.equal((await svc.confirm(s.docenteId, s.suggestionId, actor)).changed, true);
      const all = await journals(s.suggestionId); assert.equal(all.length, 1); assert.equal(all[0].operacion_id, first.operacion_id); assert.equal(all[0].estado, 'CONFIRMADA');
      assert.equal((await corrections(s.p.id)).length, 1);
    });

    await check('respuesta perdida tras aplicar en Auth: el reintento es idempotente y converge en una sola corrección', async () => {
      const s = await scenario('documentNumber', '4444444444');
      hooks.afterApply = async () => { throw new ServiceUnavailableException('respuesta perdida'); };
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ServiceUnavailableException);
      assert.equal(await authValue(s.p.id, 'documentNumber'), '4444444444'); assert.equal((await journals(s.suggestionId))[0].estado, 'RESERVADA');
      assert.equal((await svc.confirm(s.docenteId, s.suggestionId, actor)).changed, true);
      assert.equal((await journals(s.suggestionId))[0].estado, 'CONFIRMADA'); assert.equal((await corrections(s.p.id)).length, 1);
      assert.equal(await authValue(s.p.id, 'documentNumber'), '4444444444');
    });

    await check('si RUND no puede confirmar tras aplicar (sugerencia descartada a la vez), Auth se revierte incluida la cédula protegida', async () => {
      const s = await scenario('documentNumber', '5555555555');
      const original = await authValue(s.p.id, 'documentNumber');
      hooks.afterApply = async () => { await db.query(`UPDATE rund."RundExtraccionSugerencia" SET estado='DESCARTADA' WHERE id=$1`, [s.suggestionId]); };
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException, /ya fue revisada/);
      assert.equal(await authValue(s.p.id, 'documentNumber'), original);
      assert.equal((await journals(s.suggestionId))[0].estado, 'COMPENSADA'); assert.equal((await corrections(s.p.id))[0].estado, 'COMPENSADA');
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM rund."RundAprobacionLog" WHERE docente_id=$1`, [s.docenteId])).rows[0].n, 0);
    });

    await check('si además falla la compensación, queda APLICADA_AUTH y el reconciliador la resuelve sin intervención', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE A CONCILIAR');
      hooks.afterApply = async () => { await db.query(`UPDATE rund."RundExtraccionSugerencia" SET estado='DESCARTADA' WHERE id=$1`, [s.suggestionId]); };
      const realCompensate = corr.compensar.bind(corr); corr.compensar = async () => { throw new ServiceUnavailableException('Auth caído'); };
      try { await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException); } finally { corr.compensar = realCompensate; }
      assert.equal((await journals(s.suggestionId))[0].estado, 'APLICADA_AUTH'); assert.equal(await authValue(s.p.id, 'nombreCompleto'), 'NOMBRE A CONCILIAR');
      assert.equal(await svc.reconcile(20, 3600), 0); // reciente: no se toca
      await db.query(`UPDATE rund.identidad_correccion_ocr SET actualizada_en=now()-interval '10 minutes' WHERE sugerencia_id=$1`, [s.suggestionId]);
      assert.equal(await svc.reconcile(20, 120), 1);
      assert.equal(await authValue(s.p.id, 'nombreCompleto'), 'NOMBRE ORIGINAL'); assert.equal((await journals(s.suggestionId))[0].estado, 'COMPENSADA');
      assert.equal((await corrections(s.p.id))[0].estado, 'COMPENSADA');
    });

    await check('caída entre pasos: una reserva que nunca llegó a Auth se cierra; una aplicada sin confirmar se revierte', async () => {
      const lost = await scenario('nombreCompleto', 'NUNCA LLEGO');
      hooks.beforeApply = async () => { throw new ServiceUnavailableException('cae antes de enviar'); };
      await rejects(svc.confirm(lost.docenteId, lost.suggestionId, actor), ServiceUnavailableException);
      const applied = await scenario('genero', 'Masculino');
      hooks.afterApply = async () => { throw new ServiceUnavailableException('cae tras aplicar'); };
      await rejects(svc.confirm(applied.docenteId, applied.suggestionId, actor), ServiceUnavailableException);
      assert.equal(await authValue(applied.p.id, 'genero'), 'M');
      await db.query(`UPDATE rund.identidad_correccion_ocr SET actualizada_en=now()-interval '10 minutes' WHERE sugerencia_id=ANY($1::uuid[])`, [[lost.suggestionId, applied.suggestionId]]);
      assert.equal(await svc.reconcile(20, 120), 2);
      const [a] = await journals(lost.suggestionId), [b] = await journals(applied.suggestionId);
      assert.equal(a.estado, 'COMPENSADA'); assert.equal(a.error_codigo, 'NO_APLICADA'); assert.equal(b.estado, 'COMPENSADA');
      assert.equal(await authValue(applied.p.id, 'genero'), 'F'); assert.equal(await authValue(lost.p.id, 'nombreCompleto'), 'NOMBRE ORIGINAL');
    });

    await check('si el dato cambió por otra vía tras la corrección, no se pisa: queda en REVISION para una persona', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE CORREGIDO');
      hooks.afterApply = async () => { throw new ServiceUnavailableException('cae tras aplicar'); };
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ServiceUnavailableException);
      await db.query(`UPDATE auth.personas SET nom_largo='EDICION POSTERIOR' WHERE id_person=$1`, [s.p.id]);
      await db.query(`UPDATE rund.identidad_correccion_ocr SET actualizada_en=now()-interval '10 minutes' WHERE sugerencia_id=$1`, [s.suggestionId]);
      await svc.reconcile(20, 120);
      const [log] = await journals(s.suggestionId); assert.equal(log.estado, 'REVISION'); assert.equal(log.error_codigo, 'CAMBIOS_POSTERIORES');
      assert.equal(await authValue(s.p.id, 'nombreCompleto'), 'EDICION POSTERIOR');
      await rejects(svc.confirm(s.docenteId, s.suggestionId, actor), ConflictException, /revisión de soporte/);
    });

    await check('el reconciliador nunca revierte una corrección ya CONFIRMADA, aunque sea antigua', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE FIRME');
      await svc.confirm(s.docenteId, s.suggestionId, actor);
      await db.query(`UPDATE rund.identidad_correccion_ocr SET actualizada_en=now()-interval '1 day' WHERE sugerencia_id=$1`, [s.suggestionId]);
      assert.equal(await svc.reconcile(20, 120), 0);
      assert.equal(await authValue(s.p.id, 'nombreCompleto'), 'NOMBRE FIRME'); assert.equal((await journals(s.suggestionId))[0].estado, 'CONFIRMADA');
    });

    await check('dos confirmaciones simultáneas de la misma sugerencia: una sola corrección y un solo registro de auditoría', async () => {
      const s = await scenario('documentNumber', '8888888888');
      const results = await Promise.allSettled([svc.confirm(s.docenteId, s.suggestionId, actor), svc.confirm(s.docenteId, s.suggestionId, actor)]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1, JSON.stringify(results.map(r => r.reason?.message)));
      assert(results.find(r => r.status === 'rejected').reason instanceof ConflictException);
      assert.equal(await authValue(s.p.id, 'documentNumber'), '8888888888'); assert.equal((await corrections(s.p.id)).length, 1);
      assert.equal((await journals(s.suggestionId)).length, 1);
      assert.equal((await db.query(`SELECT count(*)::int AS n FROM rund."RundAprobacionLog" WHERE docente_id=$1`, [s.docenteId])).rows[0].n, 1);
    });

    await check('Auth rechaza claves ajenas, tipos inválidos y un ID reutilizado con otro contenido (con el motivo en el error)', async () => {
      const s = await scenario('nombreCompleto', 'NOMBRE X');
      await svc.confirm(s.docenteId, s.suggestionId, actor);
      const [row] = await corrections(s.p.id);
      const cmd = { version: 1, operacionId: row.operacion_id, personaId: s.p.id, campo: 'nombreCompleto', valorPrevio: 'NOMBRE ORIGINAL', valorNuevo: 'OTRO DISTINTO', actorId: 'x', sugerenciaId: null };
      const error = await rejects(corr.aplicar(cmd), AuthIdentityCorrectionConflict); assert.equal(error.code, 'OPERACION_DISTINTA');
      const http = (method, route, body) => fetch(base + '/internal/rund/v1/personas/correcciones' + route, { method, headers: { 'x-internal-service-token': token, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
      assert.equal((await http('POST', '', { ...cmd, extra: 1 })).status, 400);
      assert.equal((await http('POST', '', { ...cmd, operacionId: randomUUID(), campo: 'dir_email' })).status, 400);
      assert.equal((await http('POST', '', { ...cmd, operacionId: randomUUID(), campo: 'genero', valorNuevo: 'X' })).status, 400);
      assert.equal((await fetch(base + '/internal/rund/v1/personas/correcciones', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
      assert.equal((await http('GET', '/' + randomUUID())).status, 200);
    });

    await check('el registro de correcciones de Auth no admite borrados ni cambios de contenido', async () => {
      await assert.rejects(db.query('DELETE FROM auth.rund_identidad_correccion'), /No se puede eliminar/);
      await assert.rejects(db.query(`UPDATE auth.rund_identidad_correccion SET valor_nuevo='x'`), /inválida/);
      await assert.rejects(rundDs.query('DELETE FROM rund.identidad_correccion_ocr'), /no admite borrados/);
      await assert.rejects(rundDs.query(`UPDATE rund.identidad_correccion_ocr SET valor_nuevo='x'`), /inmutable/);
    });
  } finally {
    if (authApp) await authApp.close().catch(() => undefined);
    for (const ds of [authDs, rundDs]) if (ds?.isInitialized) await ds.destroy().catch(() => undefined);
    await db.end().catch(() => undefined);
    spawnSync(bin('pg_ctl'), ['-D', dir, '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\n${count} comprobaciones correctas`);
})().catch(error => { console.error(error); process.exit(1); });
