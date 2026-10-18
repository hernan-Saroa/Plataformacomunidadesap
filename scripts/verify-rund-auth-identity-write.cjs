/* Prueba la frontera local Auth/RUND y su rollback; solo clúster y cuentas ficticias. */
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyAuthIdentityWrite(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, row, request, workbookBody, authUrl } = context;
  const root = path.resolve(__dirname, '../backend/rund-service');
  const compiled = file => require(path.join(root, 'dist', file));
  const { DataSource } = require(path.join(root, 'node_modules/typeorm'));
  const bcrypt = require(path.join(root, 'node_modules/bcryptjs'));
  const { BancoDocentesService } = compiled('modules/banco-docentes/banco-docentes.service');
  const { RundCatalogosClient } = compiled('common/rund-catalogos.client');
  const entities = fs.readdirSync(path.join(root, 'dist/entities')).filter(file => file.endsWith('.entity.js'))
    .flatMap(file => Object.values(compiled('entities/' + file)));
  const ds = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
    password: pgConfig.password, database: pgConfig.database, entities, synchronize: false, extra: { max: 2 } });
  const keys = ['AUTH_SERVICE_URL', 'AUTH_INTERNAL_SERVICE_TOKEN'], saved = keys.map(key => process.env[key]);
  const mail = [], actorId = randomUUID(), marker = randomUUID().slice(0, 8);
  const service = new BancoDocentesService({}, {}, {}, {}, {}, ds, new RundCatalogosClient(), {}, {});
  service.sendWelcomeEmail = async (...args) => {
    // Otra conexión solo puede observar persona/cuenta/perfil si el commit ya ocurrió.
    const persisted = (await database.query(`SELECT u.id_user,d.id FROM auth."user" u JOIN rund."Docente" d ON d."personaId"=u.id_person WHERE u.username=$1`, [args[0]])).rows;
    assert.equal(persisted.length, 1); mail.push(args); return { sent: true };
  };
  let counter = 0;
  const payload = (overrides = {}) => ({ ...row, DOCUMENTO_IDENTIDAD: '888' + Date.now().toString().slice(-8) + (++counter),
    CORREO_INSTITUCIONAL: `auth-write-${marker}-${counter}@example.test`, PERIODO_CARGA: '2095-2', ...overrides });
  const options = { bulkImport: true, audit: { actorId, canalOrigen: 'MASIVO' } };
  const snapshot = async () => {
    const tables = [['auth', 'personas'], ['auth', 'user'], ['auth', 'user_roles'], ['auth', 'role'],
      ...(await database.query("SELECT tablename FROM pg_tables WHERE schemaname='rund' ORDER BY tablename")).rows.map(row => ['rund', row.tablename])];
    const result = {};
    for (const [schema, table] of tables) result[schema + '.' + table] =
      (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    return result;
  };
  const rollbackMarker = new Error('ROLLBACK FICTICIO DE PRUEBA');
  const withRollback = async fn => {
    await assert.rejects(ds.transaction(async manager => { await fn(manager); throw rollbackMarker; }), error => error === rollbackMarker);
  };
  const trigger = async (schema, table, name, work) => {
    await database.query(`CREATE FUNCTION ${schema}.${name}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'FALLO FICTICIO AUTH WRITE'; END $$;
      CREATE TRIGGER ${name} BEFORE INSERT ON ${schema}."${table}" FOR EACH ROW EXECUTE FUNCTION ${schema}.${name}()`);
    try { await work(); }
    finally { await database.query(`DROP TRIGGER ${name} ON ${schema}."${table}"; DROP FUNCTION ${schema}.${name}()`); }
  };
  try {
    process.env.AUTH_SERVICE_URL = authUrl; process.env.AUTH_INTERNAL_SERVICE_TOKEN = context.authToken;
    await ds.initialize();
    await check('Escritura Auth: creación con manager externo conserva cuenta inactiva, hash temporal, rol y perfil; rollback revierte filas y no envía correo', async () => {
      const before = await snapshot(), data = payload(), count = mail.length;
      await withRollback(async manager => {
        const result = await service.upsertDocente(data, { ...options, outerManager: manager });
        assert.equal(result.action, 'insert'); assert.equal(result.authUserCreated, true);
        const [user] = await manager.query('SELECT * FROM auth."user" WHERE id_user=$1', [result.usuarioId]);
        assert.equal(user.is_active, false); assert.equal(user.password_temp, true);
        assert(await bcrypt.compare(data.DOCUMENTO_IDENTIDAD, user.password_hash));
        assert.equal((await manager.query('SELECT * FROM auth.user_roles WHERE id_user=$1 AND is_active=true', [result.usuarioId])).length, 1);
        assert.equal((await manager.query('SELECT * FROM rund."Docente" WHERE id=$1', [result.docenteId])).length, 1);
        assert.equal(mail.length, count);
      });
      assert.deepEqual(await snapshot(), before); assert.equal(mail.length, count);
    });
    await check('Escritura Auth: conflicto de correo rechaza antes de guardar persona, cuenta, perfil o auditoría', async () => {
      const before = await snapshot(), count = mail.length;
      await assert.rejects(service.upsertDocente(payload({ CORREO_INSTITUCIONAL: row.CORREO_INSTITUCIONAL }), options), error => error.getStatus() === 400);
      assert.deepEqual(await snapshot(), before); assert.equal(mail.length, count);
    });
    await check('Escritura Auth: fallo al guardar el perfil nativo revierte persona, usuario y rol previamente insertados', async () => {
      const before = await snapshot(), count = mail.length;
      await trigger('rund', 'Docente', 'reject_auth_write_profile', async () => {
        await assert.rejects(service.upsertDocente(payload(), options), /FALLO FICTICIO AUTH WRITE/);
      });
      assert.deepEqual(await snapshot(), before); assert.equal(mail.length, count);
    });
    await check('Escritura Auth: fallo al asignar rol revierte la identidad y cuenta, sin crear perfil huérfano', async () => {
      const before = await snapshot(), count = mail.length;
      await trigger('auth', 'user_roles', 'reject_auth_write_role', async () => {
        await assert.rejects(service.upsertDocente(payload(), options), /FALLO FICTICIO AUTH WRITE/);
      });
      assert.deepEqual(await snapshot(), before); assert.equal(mail.length, count);
    });
    await check('Escritura Auth: fallo de auditoría nativa revierte perfil, validaciones y las escrituras previas en Auth', async () => {
      const before = await snapshot(), count = mail.length;
      await trigger('rund', 'RundAprobacionLog', 'reject_auth_write_audit', async () => {
        await assert.rejects(service.upsertDocente(payload(), options), /FALLO FICTICIO AUTH WRITE/);
      });
      assert.deepEqual(await snapshot(), before); assert.equal(mail.length, count);
    });
    await check('Escritura Auth: rechazar existente o soporte ausente después de escribir Auth revierte también los cambios de identidad y username', async () => {
      const before = await snapshot();
      const user = (await database.query(`SELECT u.* FROM auth."user" u JOIN auth.personas p ON p.id_person=u.id_person WHERE p.num_identificacion=$1`, [row.DOCUMENTO_IDENTIDAD])).rows[0];
      const data = { ...row, NOMBRE_COMPLETO: 'CAMBIO FICTICIO QUE DEBE REVERTIR', CORREO_INSTITUCIONAL: `rollback-${marker}@example.test`, TELEFONO: '3001234567' };
      for (const extra of [{ rejectExisting: true }, { audit: { ...options.audit, requiredSupport: { id: randomUUID(), docenteId: context.docenteId, type: 'soporte_edicion_perfil' } } }]) {
        await assert.rejects(service.upsertDocente(data, { ...options, ...extra }), error => error.getStatus() === 400);
        assert.deepEqual(await snapshot(), before);
      }
      assert.deepEqual((await database.query('SELECT * FROM auth."user" WHERE id_user=$1', [user.id_user])).rows[0], user);
    });
    await check('Escritura Auth: previsualización XLSX revierte fila fallida y procesa la siguiente con savepoint sin persistir cambios', async () => {
      const before = await snapshot(), rows = [payload(), payload()];
      await database.query(`CREATE FUNCTION rund.reject_auth_write_preview() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW."correoInstitucional"=$tag$${rows[0].CORREO_INSTITUCIONAL}$tag$ THEN RAISE EXCEPTION 'FALLO FICTICIO SAVEPOINT'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_auth_write_preview BEFORE INSERT ON rund."Docente" FOR EACH ROW EXECUTE FUNCTION rund.reject_auth_write_preview()`);
      try {
        const result = await request('/banco-docentes/bulk?dry_run=true', { method: 'POST', body: workbookBody(rows), status: 201 });
        // El preview no ejecuta el trigger de INSERT; conserva ambas propuestas sin efectos.
        assert.equal(result.data.errors, 0); assert.equal(result.data.created, 2);
        // Se conserva la recuperación por savepoint del escritor real como referencia de prueba.
        let failed = 0, created = 0;
        await withRollback(async manager => {
          for (const sample of rows) {
            await manager.query('SAVEPOINT fixture_auth_write_row');
            try {
              const written = await service.upsertDocente(sample, { ...options, outerManager: manager });
              assert.equal(written.action, 'insert'); created++;
            } catch (error) {
              assert.equal(error.driverError?.code || error.code, 'P0001'); failed++;
              await manager.query('ROLLBACK TO SAVEPOINT fixture_auth_write_row');
            }
            await manager.query('RELEASE SAVEPOINT fixture_auth_write_row');
          }
        });
        assert.equal(failed, 1); assert.equal(created, 1);
      } finally { await database.query('DROP TRIGGER reject_auth_write_preview ON rund."Docente"; DROP FUNCTION rund.reject_auth_write_preview()'); }
      const after = await snapshot(); delete before['rund.RundAccesoDatosLog']; delete after['rund.RundAccesoDatosLog'];
      assert.deepEqual(after, before);
    });
    await check('Escritura Auth: commit propio precede al correo; reimportar no duplica cuenta, rol o perfil ni cambia la contraseña', async () => {
      const data = payload(), count = mail.length, created = await service.upsertDocente(data, options);
      assert.equal(created.action, 'insert'); assert.equal(created.welcomeEmail.sent, true); assert.equal(mail.length, count + 1);
      const user = (await database.query('SELECT * FROM auth."user" WHERE id_user=$1', [created.usuarioId])).rows[0];
      const again = await service.upsertDocente(data, options);
      // El JSONB puede reordenar claves: el algoritmo anterior también podía informar update.
      assert(['update', 'unchanged'].includes(again.action));
      assert.equal(again.personaId, created.personaId); assert.equal(again.usuarioId, created.usuarioId); assert.equal(again.docenteId, created.docenteId);
      assert.equal(mail.length, count + 1); assert.deepEqual((await database.query('SELECT * FROM auth."user" WHERE id_user=$1', [created.usuarioId])).rows[0], user);
      assert.equal(Number((await database.query('SELECT count(*) FROM auth.user_roles WHERE id_user=$1', [created.usuarioId])).rows[0].count), 1);
      assert.equal(Number((await database.query('SELECT count(*) FROM rund."Docente" WHERE "personaId"=$1', [created.personaId])).rows[0].count), 1);
      // Filas ficticias confirmadas y auditoría inmutable se eliminan al retirar el clúster.
    });
  } finally {
    if (ds.isInitialized) await ds.destroy();
    keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
  }
};
