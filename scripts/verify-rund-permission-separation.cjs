// Real PostgreSQL with temporary tables and rollback; no user assignments or business writes.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { clientForLocal, serviceRoot, reportError } = require('./rund-documental/local-context.cjs');
require(path.join(serviceRoot, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(serviceRoot, 'tsconfig.json') });
const { BancoDocentesRolesGuard } = require(path.join(serviceRoot, 'src/pta/banco-docentes/banco-docentes-roles.guard.ts'));
const { RundExtraccionService } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-extraccion.service.ts'));
const { rundRequestActor } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-access-audit.ts'));

(async () => {
  const client = clientForLocal();
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const table of ['module', 'role', 'permission', 'role_permissions', 'personas']) {
      await client.query(`CREATE TEMP TABLE "${table}" (LIKE auth."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    }
    for (const table of ['module', 'role', 'permission']) await client.query(`CREATE UNIQUE INDEX ON pg_temp."${table}" (code)`);
    await client.query('CREATE UNIQUE INDEX ON pg_temp.role_permissions (id_rol, id_permission)');
    await client.query(`INSERT INTO pg_temp.module SELECT * FROM auth.module WHERE code='gestion-profesoral'`);
    await client.query(`INSERT INTO pg_temp.permission SELECT * FROM auth.permission WHERE code LIKE 'banco-docentes.rund.%'`);
    const rewrite = sql => sql.replaceAll('academic_work_plan.', 'pg_temp.').replaceAll('auth.', 'pg_temp.');
    const migration = name => rewrite(fs.readFileSync(path.resolve(__dirname, '../db/migrations', name), 'utf8'));
    const permissionsMigration = migration('669_rund_document_preparation_permissions.sql');
    await client.query(permissionsMigration);
    const operationalMigration = migration('671_rund_operational_profiles.sql');
    await client.query(operationalMigration);
    const operationalCounts = (await client.query('SELECT count(*)::int n FROM pg_temp.role_permissions')).rows[0].n;
    await client.query(operationalMigration);
    assert.equal((await client.query('SELECT count(*)::int n FROM pg_temp.role_permissions')).rows[0].n, operationalCounts);
    const assignedProfiles = (await client.query(`SELECT r.code,count(*)::int n FROM pg_temp.role r
      JOIN pg_temp.role_permissions rp ON rp.id_rol=r.id JOIN pg_temp.permission p ON p.id_permission=rp.id_permission
      WHERE r.code IN ('RUND_CARGADOR','RUND_APROBADOR','RUND_INCORPORADOR') AND p.code LIKE 'banco-docentes.rund.%' GROUP BY r.code`)).rows;
    assert.equal(assignedProfiles.length, 3);
    assert(assignedProfiles.every(role => role.n === 1));
    const grantsBeforeDescriptions = (await client.query('SELECT * FROM pg_temp.role_permissions ORDER BY id_rol,id_permission')).rows;
    for (let attempt = 0; attempt < 2; attempt++) await client.query(migration('672_rund_permission_descriptions.sql'));
    assert.deepEqual((await client.query('SELECT * FROM pg_temp.role_permissions ORDER BY id_rol,id_permission')).rows, grantsBeforeDescriptions);
    const countBefore = (await client.query('SELECT count(*)::int n FROM pg_temp.role_permissions')).rows[0].n;
    await client.query(operationalMigration);
    assert.equal((await client.query('SELECT count(*)::int n FROM pg_temp.role_permissions')).rows[0].n, countBefore);

    let tx = 0;
    const db = {
      query: async (sql, args) => (await client.query(rewrite(sql), args)).rows,
      transaction: async work => {
        const savepoint = `rund_permissions_${++tx}`;
        await client.query(`SAVEPOINT ${savepoint}`);
        try { const result = await work(db); await client.query(`RELEASE SAVEPOINT ${savepoint}`); return result; }
        catch (error) { await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`); throw error; }
      },
    };
    const allowed = async (role, permission) => {
      const reflector = { getAllAndOverride: key => key === 'rundPermissions' ? [permission] : ['GESTION_PROFESORAL', 'SUPER_ADMIN'] };
      const request = { user: { userId: 'FIXTURE', roles: Array.isArray(role) ? role : [role] } };
      const context = { getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => request }) };
      const guard = new BancoDocentesRolesGuard(reflector, db);
      try { await guard.canActivate(context); return rundRequestActor(request); }
      catch (error) { if (error.getStatus?.() === 403) return false; throw error; }
    };
    for (const permission of ['view', 'edit', 'documents.manage']) assert((await allowed('RUND_CARGADOR', `banco-docentes.rund.${permission}`)).fullAccess);
    assert.equal(await allowed('RUND_CARGADOR', 'banco-docentes.rund.validate'), false);
    for (const permission of ['create', 'import']) assert(await allowed('RUND_CARGADOR', `banco-docentes.rund.${permission}`));
    assert((await allowed('RUND_APROBADOR', 'banco-docentes.rund.validate')).fullAccess);
    for (const permission of ['edit', 'documents.manage', 'manage']) assert.equal(await allowed('RUND_APROBADOR', `banco-docentes.rund.${permission}`), false);
    assert((await allowed('RUND_INCORPORADOR', 'banco-docentes.rund.incorporacion')).fullAccess);
    for (const permission of ['create','import','edit','validate','documents.manage','manage']) assert.equal(await allowed('RUND_INCORPORADOR', `banco-docentes.rund.${permission}`), false);
    const combined = ['RUND_CARGADOR', 'RUND_APROBADOR', 'RUND_INCORPORADOR'];
    for (const permission of ['create','import','edit','validate','documents.manage','incorporacion']) assert(await allowed(combined, `banco-docentes.rund.${permission}`));
    for (const target of ['role', 'permission', 'role_permissions']) {
      await client.query('SAVEPOINT inactive_grant');
      const condition = target === 'role' ? "code='RUND_APROBADOR'" : target === 'permission' ? "code='banco-docentes.rund.revision'"
        : "id_rol=(SELECT id FROM pg_temp.role WHERE code='RUND_APROBADOR')";
      await client.query(`UPDATE pg_temp.${target} SET is_active=false WHERE ${condition}`);
      assert.equal(await allowed('RUND_APROBADOR', 'banco-docentes.rund.validate'), false, `Inactive ${target} must not grant review`);
      await client.query('ROLLBACK TO SAVEPOINT inactive_grant');
      await client.query('RELEASE SAVEPOINT inactive_grant');
    }

    const tables = ['Docente', 'RundDocumentoPerfil', 'RundCampoEstado', 'RundSoporteCampo', 'RundExtraccionTrabajo', 'RundExtraccionSugerencia', 'RundAccesoDatosLog', 'RundAprobacionLog'];
    for (const table of tables) await client.query(`CREATE TEMP TABLE "${table}" (LIKE academic_work_plan."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    await client.query(migration('670_rund_ocr_human_corrected_identity.sql'));
    await client.query('CREATE TRIGGER immutable_fixture_number BEFORE UPDATE OF num_identificacion ON pg_temp.personas FOR EACH ROW EXECUTE FUNCTION pg_temp.prevent_rund_document_change()');
    const fixture = async (schema, table, values) => {
      const columns = (await client.query(`SELECT column_name,data_type,character_maximum_length FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND is_nullable='NO' AND column_default IS NULL`, [schema, table])).rows;
      for (const { column_name: key, data_type: type, character_maximum_length: length } of columns) if (!(key in values)) values[key] = type === 'uuid' ? randomUUID() : /integer|numeric|double|bigint/.test(type) ? 0 : type === 'boolean' ? false : /timestamp|date/.test(type) ? new Date() : type === 'jsonb' ? {} : 'FIXTURE'.slice(0, length || 7);
      await client.query(`INSERT INTO pg_temp."${table}" (${Object.keys(values).map(key => `"${key}"`).join(',')}) VALUES (${Object.keys(values).map((_, i) => `$${i + 1}`).join(',')})`, Object.values(values));
    };
    const person = randomUUID(), docente = randomUUID(), document = randomUUID(), job = randomUUID(), suggestion = randomUUID();
    await fixture('auth', 'personas', { id_person: person, num_identificacion: '1000000000', tip_identificacion: 'CC', nom_largo: 'DOCENTE FICTICIO' });
    await fixture('academic_work_plan', 'Docente', { id: docente, personaId: person, estadoAprobacion: 'ACTIVO_RUND' });
    await fixture('academic_work_plan', 'RundDocumentoPerfil', { id: document, docente_id: docente,
      estado: 'ACTIVO', categoria_codigo: 'IDENTIDAD', bloque: 'IDENTIDAD', tipo_soporte: 'documento_identidad' });
    await fixture('academic_work_plan', 'RundExtraccionTrabajo', { id: job, docente_id: docente, documento_id: document, estado: 'COMPLETADO' });
    await fixture('academic_work_plan', 'RundExtraccionSugerencia', { id: suggestion, trabajo_id: job, campo: 'documentNumber', valor: '1000000001', valor_previo: '1000000000', estado: 'PENDIENTE' });
    for (const bloque of ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']) {
      await fixture('academic_work_plan', 'RundCampoEstado', { id: randomUUID(), docente_id: docente, bloque, estado: 'Aprobado', version: 1 });
    }
    const actor = { actorId: 'CARGADOR_FICTICIO', roles: ['RUND_CARGADOR'], fullAccess: true };
    const result = await new RundExtraccionService(db, {}).confirm(docente, suggestion, actor, { valorCorregido: '1000000002', motivo: 'El último dígito legible en el PDF es dos.' });
    assert.equal(result.valor, '1000000002');
    const [saved] = await db.query('SELECT valor,valor_confirmado,estado,revisado_por FROM academic_work_plan."RundExtraccionSugerencia" WHERE id=$1', [suggestion]);
    assert.deepEqual(saved, { valor: '1000000001', valor_confirmado: '1000000002', estado: 'CORREGIDA', revisado_por: actor.actorId });
    const [profile] = await db.query('SELECT "estadoAprobacion",completitud FROM academic_work_plan."Docente" WHERE id=$1', [docente]);
    assert.equal(profile.estadoAprobacion, 'PENDIENTE_APROBACION');
    assert.equal(profile.completitud.IDENTIDAD, 'En revisión');
    await assert.rejects(db.transaction(manager => manager.query('UPDATE auth.personas SET num_identificacion=$2 WHERE id_person=$1', [person, '1000000003'])), /REQ-RUND-F001/);
    // Reprocessing preserves confirmed values and support approvals, archiving only pending proposals.
    // Only this short-lived process is enabled; no worker or OCR engine is started.
    process.env.RUND_OCR_ENABLED='true';
    const secondDocument=randomUUID(),secondJob=randomUUID(),pendingSuggestion=randomUUID();
    await fixture('academic_work_plan','RundDocumentoPerfil',{id:secondDocument,docente_id:docente,estado:'ACTIVO',categoria_codigo:'IDENTIDAD',bloque:'IDENTIDAD',tipo_soporte:'documento_identidad'});
    await fixture('academic_work_plan','RundExtraccionTrabajo',{id:secondJob,docente_id:docente,documento_id:secondDocument,estado:'COMPLETADO'});
    await fixture('academic_work_plan','RundExtraccionSugerencia',{id:pendingSuggestion,trabajo_id:secondJob,campo:'nombreCompleto',valor:'NOMBRE ANTIGUO FICTICIO',valor_previo:'DOCENTE FICTICIO',estado:'PENDIENTE'});
    await fixture('academic_work_plan','RundSoporteCampo',{id:randomUUID(),docente_id:docente,bloque:'IDENTIDAD',tipo_soporte:'documento_identidad',documento_perfil_id:document,estado:'Aprobado'});
    const blocksBefore=await db.query('SELECT bloque,estado,version FROM academic_work_plan."RundCampoEstado" WHERE docente_id=$1 ORDER BY bloque',[docente]);
    const supportsBefore=await db.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id=$1',[docente]);
    const reviewer={actorId:'REVISOR_FICTICIO',roles:['RUND_APROBADOR'],fullAccess:true};
    const available=await new RundExtraccionService(db,{}).list(docente,reviewer);
    assert(available.documents.some(item=>item.id===secondDocument&&item.analizado_previamente));
    assert(available.documents.some(item=>item.id===document&&item.analizado_previamente));
    const reprocessed=await new RundExtraccionService(db,{}).reprocess(docente,[secondDocument,document],reviewer);
    assert.deepEqual(reprocessed,{queued:2,reprocessed:true});
    assert.equal((await new RundExtraccionService(db,{}).list(docente,reviewer)).documents.length,0);
    assert.deepEqual((await db.query('SELECT documento_id FROM academic_work_plan."RundExtraccionTrabajo" WHERE estado=\'PENDIENTE\' ORDER BY creado_en')).map(row=>row.documento_id),[secondDocument,document]);
    assert.equal((await db.query('SELECT estado FROM academic_work_plan."RundExtraccionSugerencia" WHERE id=$1',[suggestion]))[0].estado,'CORREGIDA');
    const archived=(await db.query('SELECT estado,motivo,revisado_por FROM academic_work_plan."RundExtraccionSugerencia" WHERE id=$1',[pendingSuggestion]))[0];
    assert.equal(archived.estado,'DESCARTADA');assert.equal(archived.revisado_por,reviewer.actorId);assert.match(archived.motivo,/nueva solicitud/);
    assert.deepEqual(await db.query('SELECT bloque,estado,version FROM academic_work_plan."RundCampoEstado" WHERE docente_id=$1 ORDER BY bloque',[docente]),blocksBefore);
    assert.deepEqual(await db.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id=$1',[docente]),supportsBefore);
    assert.equal((await db.query('SELECT num_identificacion FROM auth.personas WHERE id_person=$1',[person]))[0].num_identificacion,'1000000002');
    await assert.rejects(new RundExtraccionService(db,{}).reprocess(docente,[document],reviewer),/ya está en cola/);
    // An audit failure must roll back both the new job and the archived proposals.
    await db.query('UPDATE academic_work_plan."RundExtraccionTrabajo" SET estado=\'COMPLETADO\' WHERE estado=\'PENDIENTE\'');
    await db.query('UPDATE academic_work_plan."RundExtraccionSugerencia" SET estado=\'PENDIENTE\' WHERE id=$1',[pendingSuggestion]);
    const failingDb={...db,transaction:work=>db.transaction(manager=>work({...manager,query:async(sql,args)=>{
      if(sql.includes('INSERT INTO academic_work_plan."RundAprobacionLog"')&&args.includes('REPROCESAR_EXTRACCION_OCR'))throw new Error('SYNTHETIC_AUDIT_FAILURE');
      return manager.query(sql,args);
    }}))};
    await assert.rejects(new RundExtraccionService(failingDb,{}).reprocess(docente,[secondDocument],reviewer),/SYNTHETIC_AUDIT_FAILURE/);
    assert.equal((await db.query('SELECT estado FROM academic_work_plan."RundExtraccionSugerencia" WHERE id=$1',[pendingSuggestion]))[0].estado,'PENDIENTE');
    assert.equal((await db.query('SELECT count(*)::int n FROM academic_work_plan."RundExtraccionTrabajo" WHERE estado=\'PENDIENTE\''))[0].n,0);
    console.log('Reprocesado OCR: orden, historial, datos confirmados, soportes aprobados, duplicados y rollback verificados en tablas temporales.');
    console.log(JSON.stringify({ success: true, temporaryTablesOnly: true, checks: ['Migraciones idempotentes', 'Tres perfiles con un permiso cada uno', 'Cargador registra e importa sin aprobar', 'Revisor sin carga ni edición', 'Incorporador sin edición general ni aprobación', 'PDF original autorizado por perfil', 'Corrección OCR conserva el valor original y registra actor/motivo', 'Corregir reabre el bloque sin aprobarlo', 'Cédula continúa inmutable fuera del flujo OCR'] }, null, 2));
  } finally { await client.query('ROLLBACK'); await client.end(); }
})().catch(reportError);
