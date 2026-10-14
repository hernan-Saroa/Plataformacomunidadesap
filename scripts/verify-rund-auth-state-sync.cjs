/* HTTP Auth real + consumidor/controller RUND compilados, PostgreSQL temporal del verificador padre.
 * No usa .env, endpoints ni bases existentes. No crea servidores con escucha pública.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..'), rundRoot = path.join(root, 'backend/rund-service');
const dep = name => require(require.resolve(name, { paths: [rundRoot] }));
const compiled = name => require(path.join(rundRoot, 'dist', name));

module.exports = async function verifySync({ pgConfig, authDb, authUrl, person, folder, document, check }) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.equal(authDb.options.database, 'auth_document_versions');
  const saved = Object.fromEntries(['AUTH_SERVICE_URL', 'RUND_CARPETA_SYNC_ENABLED', 'RUND_CARPETA_SYNC_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'CARPETA_DOCUMENT_VERSIONING_ENABLED'].map(k => [k, process.env[k]]));
  const checks = [], verify = (name, work) => check(`Auth -> RUND: ${name}`, async () => { await work(); checks.push(name); });
  const { DataSource } = dep('typeorm');
  const { BancoDocenteEntity } = compiled('entities/banco-docente.entity');
  const { RundAuthStateSyncService } = compiled('modules/banco-docentes/rund-auth-state-sync.service');
  const { RundAuthStateSyncWorker } = compiled('modules/banco-docentes/rund-auth-state-sync.worker');
  const { RundValidacionService } = compiled('modules/banco-docentes/rund-validacion.service');
  const { RundValidacionController } = compiled('modules/banco-docentes/rund-validacion.controller');
  const { BancoDocentesRolesGuard } = compiled('modules/banco-docentes/banco-docentes-roles.guard');
  let db, app, fake;
  try {
    process.env.RUND_CARPETA_SYNC_ENABLED = 'false';
    process.env.RUND_CARPETA_SYNC_TOKEN = randomBytes(32).toString('hex'); delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.AUTH_SERVICE_URL = authUrl;
    db = new DataSource({ type: 'postgres', host: pgConfig.host, port: pgConfig.port, username: pgConfig.user,
      password: pgConfig.password, database: pgConfig.database, schema: 'rund', entities: [BancoDocenteEntity], synchronize: false });
    await db.initialize();
    const sync = new RundAuthStateSyncService(db), worker = new RundAuthStateSyncWorker(db, sync);
    worker.logger.warn = () => {}; // Fallos ficticios esperados; no imprimir datos de sus respuestas.
    const sourceRequest = async (id = person, { token = process.env.RUND_CARPETA_SYNC_TOKEN, status = 200, bearer } = {}) => {
      const response = await fetch(`${authUrl}/internal/carpeta-digital/personas/${id}/estado-rund`,
        { headers: { ...(token ? { 'x-rund-carpeta-sync-token': token } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) } });
      assert.equal(response.status, status, await response.clone().text()); return response.json();
    };
    await verify('apagado no consulta la migración Auth ausente ni escribe proyecciones', async () => {
      await sourceRequest(person, { status: 409 }); await assert.rejects(sync.syncPersona(person), e => e.getStatus() === 409);
      worker.onApplicationBootstrap(); await worker.tick();
      assert.equal((await authDb.query("SELECT to_regclass('auth.carpeta_revision_rund') AS name"))[0].name, null);
      assert.equal((await db.query('SELECT count(*) FROM rund.carpeta_auth_sync'))[0].count, '0');
    });
    await verify('668 y 007 repetibles sin copiar documentos ni cambiar decisiones', async () => {
      const before = await authDb.query('SELECT * FROM auth.documento_carpeta_digital ORDER BY id_documento');
      for (const [database, file] of [[authDb, 'db/migrations/668_auth_carpeta_revision_rund.sql'],
        [db, 'backend/rund-service/db/migrations/007_rund_carpeta_auth_proyeccion.sql']]) {
        const sql = fs.readFileSync(path.join(root, file), 'utf8'); await database.query(sql); await database.query(sql);
      }
      assert.deepEqual(await authDb.query('SELECT * FROM auth.documento_carpeta_digital ORDER BY id_documento'), before);
      assert.equal((await authDb.query('SELECT count(*) FROM auth.carpeta_revision_rund'))[0].count, '0');
    });
    process.env.RUND_CARPETA_SYNC_ENABLED = 'true';
    const { JwtService } = dep('@nestjs/jwt'), jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const actor = randomUUID(), adminToken = jwt.sign({ sub: actor, roles: ['SUPER_ADMIN'] });
    const teacherToken = jwt.sign({ sub: randomUUID(), roles: ['DOCENTE'], permissions: ['banco-docentes.rund.manage'] });
    await verify('API interna exige su credencial, incluso con una sesión de administrador', async () => {
      await sourceRequest(person, { token: null, status: 401, bearer: adminToken });
      await sourceRequest(person, { token: 'incorrecta', status: 401 });
      const secret = process.env.RUND_CARPETA_SYNC_TOKEN; delete process.env.RUND_CARPETA_SYNC_TOKEN;
      try { await sourceRequest(person, { token: secret, status: 503 }); }
      finally { process.env.RUND_CARPETA_SYNC_TOKEN = secret; }
      await sourceRequest('no-es-uuid', { status: 400 }); await sourceRequest(randomUUID(), { status: 404 });
    });
    const ownIds = [randomUUID(), randomUUID()];
    for (let i = 0; i < 2; i++) await db.query(`INSERT INTO rund."Docente"
      (id,"personaId","territorialId","tipoVinculacion",dedicacion,"periodoCarga","updatedAt") VALUES ($1,$2,'TEST','TEST','TEST',$3,now())`, [ownIds[i], person, `TEST-${i}`]);
    await db.query(`INSERT INTO rund.validacion_documental (docente_id,campo_rund,tipo_documento_soporte,estado_documento,id_documento_carpeta)
      VALUES ($1,'DOCUMENTO_IDENTIDAD','IDENTIDAD','Aceptado',$2)`, [ownIds[0], document]);
    await db.query(`INSERT INTO rund."RundSoporteCampo" (id,docente_id,bloque,estado,nombre_archivo)
      VALUES ($1,$2,'IDENTIDAD','Aprobado','original-nativo-ficticio.pdf')`, [document, ownIds[0]]);
    // El fixture padre no carga el módulo documental PTA. Añadir un original ficticio
    // en su namespace, con el mismo UUID, para comprobar el aislamiento del dueño.
    await db.query('CREATE TABLE academic_work_plan."RundSoporteCampo" (LIKE rund."RundSoporteCampo" INCLUDING ALL)');
    await db.query(`INSERT INTO academic_work_plan."RundSoporteCampo" (id,docente_id,bloque,estado,nombre_archivo)
      VALUES ($1,$2,'IDENTIDAD','Aprobado','original-pta-ficticio.pdf')`, [document, ownIds[0]]);
    const nativeTables = ['rund.validacion_documental', 'rund."RundCampoEstado"', 'rund."RundSoporteCampo"', 'rund."RundDocumentoPerfil"', 'academic_work_plan."RundSoporteCampo"'];
    const native = async () => Promise.all(nativeTables.map(table => db.query(`SELECT * FROM ${table} ORDER BY id`)));
    const nativeBefore = await native();
    const projection = async () => ({ docs: await db.query('SELECT * FROM rund.carpeta_auth_documento WHERE persona_id=$1 ORDER BY documento_id', [person]),
      events: await db.query('SELECT * FROM rund.carpeta_auth_sync_evento WHERE persona_id=$1 ORDER BY revision', [person]),
      state: await sync.getPersona(person) });
    let originalState;
    await verify('primer snapshot completo sin URLs, nombres, comentarios o actores privados', async () => {
      const { RundStateSnapshotService } = require(path.join(root, 'backend/auth-service/dist/carpeta-digital/rund-state-snapshot.service'));
      const direct = await new RundStateSnapshotService(authDb).snapshot(person);
      originalState = await sourceRequest(); assert.equal(originalState.revision, '0');
      assert.deepEqual(originalState,direct);
      assert.equal(originalState.complete, true); assert(originalState.total > 0);
      const allowed = ['id','revision_documento','categoria','tipo_documento_id','estado','fecha_subida','fecha_validacion','fecha_vencimiento'].sort();
      for (const doc of originalState.documentos) assert.deepEqual(Object.keys(doc).sort(), allowed);
      const result = await sync.syncPersona(person); assert.equal(result.propietario, 'auth'); assert.equal(result.revision, '0');
      assert.deepEqual(result.documentos, originalState.documentos); assert.deepEqual(await native(), nativeBefore);
    });
    await verify('reintentos y pulls simultáneos no duplican documentos ni eventos', async () => {
      const before = await projection(); await Promise.all([sync.syncPersona(person), sync.syncPersona(person), sync.syncPersona(person)]);
      const after = await projection(); assert.deepEqual(after.docs, before.docs); assert.deepEqual(after.events, before.events);
    });
    const { Module } = dep('@nestjs/common'), { NestFactory, Reflector } = dep('@nestjs/core'), { ConfigService } = dep('@nestjs/config');
    const { JwtStrategy } = compiled('auth/jwt.strategy'), { JwtAuthGuard } = compiled('auth/jwt-auth.guard');
    const validation = new RundValidacionService(db.getRepository(BancoDocenteEntity), db, sync);
    class FixtureModule {}
    Module({ controllers: [RundValidacionController], providers: [
      { provide: DataSource, useValue: db },
      { provide: RundValidacionService, useValue: validation },
      { provide: BancoDocentesRolesGuard, useValue: new BancoDocentesRolesGuard(new Reflector(), db) },
      { provide: JwtStrategy, useValue: new JwtStrategy(new ConfigService({ JWT_SECRET: process.env.JWT_SECRET })) },
    ] })(FixtureModule);
    app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false }); app.useGlobalGuards(new JwtAuthGuard(new Reflector()));
    await app.listen(0, '127.0.0.1'); const rundUrl = await app.getUrl();
    const manual = async ({ session = adminToken, key = ownIds[0], body = {}, status = 201 } = {}) => {
      const res = await fetch(`${rundUrl}/rund/docente/${key}/sync-documents`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) }, body: JSON.stringify(body) });
      assert.equal(res.status, status, await res.clone().text()); return res.json();
    };
    await verify('POST exige JWT y permisos efectivos, ignora permisos del JWT/body y exige perfil exacto', async () => {
      await manual({ session: null, status: 401 }); await manual({ session: teacherToken, body: { roles: ['SUPER_ADMIN'] }, status: 403 });
      await manual({ body: { documentos: originalState.documentos }, status: 409 }); await manual({ key: person, status: 404 });
      await manual(); const second = await manual({ key: ownIds[1] }); assert.equal(second.data.revision, originalState.revision);
      const res = await fetch(`${rundUrl}/rund/docente/${ownIds[0]}`, { headers: { Authorization: `Bearer ${adminToken}` } });
      assert.equal(res.status, 200); const data = (await res.json()).data;
      assert.equal(data.completitud, 100); assert.equal(data.validaciones[0].estado_documento, 'Aceptado');
      assert.equal(data.carpetaAuth.revision, '0'); assert.deepEqual(await native(), nativeBefore);
    });
    await verify('decisiones y clasificación persistidas en Auth actualizan solo su proyección', async () => {
      let previous = BigInt((await sourceRequest()).revision);
      for (const [state, category] of [['validado','personal'],['pendiente','personal'],['rechazado','academico']]) {
        await authDb.query('UPDATE auth.documento_carpeta_digital SET estado=$2,categoria=$3 WHERE id_documento=$1', [document,state,category]);
        const current = await sourceRequest(); assert(BigInt(current.revision) > previous); previous = BigInt(current.revision);
        const result = await sync.syncPersona(person); const doc = result.documentos.find(d => d.id === document);
        assert.equal(doc.estado, state); assert.equal(doc.categoria, category); assert.deepEqual(await native(), nativeBefore);
      }
      const before = await sourceRequest();
      await authDb.query('UPDATE auth.documento_carpeta_digital SET estado=estado WHERE id_documento=$1', [document]);
      const touched = await sourceRequest(); assert(BigInt(touched.revision) > BigInt(before.revision));
      assert.notEqual(touched.documentos.find(d => d.id === document).revision_documento, before.documentos.find(d => d.id === document).revision_documento);
      await sync.syncPersona(person);
    });
    await verify('reemplazo HTTP real en Auth cambia revisión y deja pendiente su proyección sin alterar RUND/PTA', async () => {
      process.env.CARPETA_DOCUMENT_VERSIONING_ENABLED='true';
      const url=`${authUrl}/carpeta-digital/documentos/${document}/versiones`;
      const headers={Authorization:`Bearer ${adminToken}`};
      const historyResponse=await fetch(url,{headers}); assert.equal(historyResponse.status,200);
      const history=(await historyResponse.json()).data, before=await sourceRequest();
      const body=new FormData(); body.append('file',new Blob([Buffer.from('REEMPLAZO FICTICIO PARA SYNC')]),'Reemplazo-sync.pdf');
      body.append('version_actual',String(history.version_actual));
      const response=await fetch(url,{method:'POST',headers,body}); assert.equal(response.status,201,await response.clone().text());
      const after=await sync.syncPersona(person); assert(BigInt(after.revision)>BigInt(before.revision));
      assert.equal(after.documentos.find(d=>d.id===document).estado,'pendiente'); assert.deepEqual(await native(),nativeBefore);
    });
    await verify('retirar o pasar a otro dueño elimina exclusivamente documentos de la proyección Auth', async () => {
      await authDb.query("UPDATE auth.documento_carpeta_digital SET categoria=' RUND ' WHERE id_documento=$1", [document]);
      assert(!(await sync.syncPersona(person)).documentos.some(d => d.id === document));
      await authDb.query("UPDATE auth.documento_carpeta_digital SET categoria='personal' WHERE id_documento=$1", [document]);
      assert((await sync.syncPersona(person)).documentos.some(d => d.id === document));
      const excluded = [randomUUID(), randomUUID(), randomUUID()];
      for (let i = 0; i < 3; i++) await authDb.query(`INSERT INTO auth.documento_carpeta_digital
        (id_documento,carpeta_digital_id,nombre,url_archivo,rund_soporte_id) VALUES ($1,$2,'Privado.pdf',$3,$4)`,
        [excluded[i],folder,i === 1 ? '/pta/api/v1/uploads/privado.pdf' : i === 2 ? '/rund/api/v1/uploads/privado.pdf' : '/auth/api/v1/uploads/privado.pdf',i === 0 ? document : null]);
      const own = randomUUID(); await authDb.query(`INSERT INTO auth.documento_carpeta_digital
        (id_documento,carpeta_digital_id,nombre,url_archivo) VALUES ($1,$2,'General.pdf','/auth/api/v1/uploads/general.pdf')`, [own,folder]);
      const state = await sync.syncPersona(person); assert(state.documentos.some(d => d.id === own)); assert(!state.documentos.some(d => excluded.includes(d.id)));
      await authDb.query('DELETE FROM auth.documento_carpeta_digital WHERE id_documento=$1', [own]);
      assert(!(await sync.syncPersona(person)).documentos.some(d => d.id === own)); assert.deepEqual(await native(), nativeBefore);
    });
    await verify('mover la carpeta entre personas avanza ambas revisiones sin borrar evidencia nativa', async () => {
      const other=randomUUID(); await authDb.query(`INSERT INTO auth.personas
        (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero)
        VALUES ($1,'TEST-MOVE','CC','Persona ficticia','Persona','X')`,[other]);
      const before=await sourceRequest(), otherBefore=await sourceRequest(other);
      await authDb.query('UPDATE auth.carpeta_digital SET persona_id=$2 WHERE id_carpeta_digital=$1',[folder,other]);
      assert.deepEqual((await sync.syncPersona(person)).documentos,[]);
      assert.equal((await sync.syncPersona(other)).documentos.length,before.total);
      assert(BigInt((await sourceRequest()).revision)>BigInt(before.revision));
      assert(BigInt((await sourceRequest(other)).revision)>BigInt(otherBefore.revision));
      await authDb.query('UPDATE auth.carpeta_digital SET persona_id=$2 WHERE id_carpeta_digital=$1',[folder,person]);
      assert.deepEqual((await sync.syncPersona(other)).documentos,[]);
      assert.equal((await sync.syncPersona(person)).documentos.length,before.total); assert.deepEqual(await native(),nativeBefore);
      const current=await sourceRequest(); await authDb.query(fs.readFileSync(path.join(root,'db/migrations/668_auth_carpeta_revision_rund.sql'),'utf8'));
      assert.deepEqual(await sourceRequest(),current);
    });
    let mode = 'partial', fakeState = await sourceRequest();
    const recordedHeaders = [];
    fake = http.createServer((req,res) => {
      recordedHeaders.push(req.headers); res.setHeader('Content-Type','application/json');
      if (mode === 'unauthorized') { res.writeHead(401); res.end('{}'); return; }
      if (mode === 'timeout') return;
      if (mode === 'partial') res.end(JSON.stringify({ ...fakeState, complete: false }));
      else res.end(JSON.stringify(fakeState));
    });
    await new Promise(resolve => fake.listen(0,'127.0.0.1',resolve)); const fakeUrl = `http://127.0.0.1:${fake.address().port}`;
    await verify('fallo, snapshot parcial, revisión vieja y fingerprint inconsistente conservan último estado', async () => {
      const before = await projection(); process.env.AUTH_SERVICE_URL = fakeUrl;
      await assert.rejects(sync.syncPersona(person)); mode = 'unauthorized'; await assert.rejects(sync.syncPersona(person));
      mode = 'state'; fakeState = originalState; await assert.rejects(sync.syncPersona(person), e => e.getStatus() === 409);
      fakeState = await sourceRequest(); fakeState.documentos[0].estado = fakeState.documentos[0].estado === 'validado' ? 'rechazado' : 'validado';
      fakeState.fingerprint = createHash('sha256').update(JSON.stringify({ deleted: fakeState.deleted, documentos: fakeState.documentos })).digest('hex');
      await assert.rejects(sync.syncPersona(person), e => e.getStatus() === 409);
      const after = await projection(); assert.deepEqual(after.docs, before.docs); assert.deepEqual(after.events, before.events);
      assert.equal(after.state.revision, before.state.revision); assert.equal(after.state.ultima_sincronizacion.getTime(), before.state.ultima_sincronizacion.getTime());
      assert.equal(after.state.error, 'AUTH_STATE_UNAVAILABLE');
      for (const headers of recordedHeaders) { assert.equal(headers['x-rund-carpeta-sync-token'],process.env.RUND_CARPETA_SYNC_TOKEN); assert.equal(headers.authorization,undefined); assert.equal(headers.cookie,undefined); }
      process.env.AUTH_SERVICE_URL = authUrl;
    });
    await verify('timeout HTTP real revierte el intento sin vaciar la carpeta', async () => {
      const before = await projection(); mode = 'timeout'; process.env.AUTH_SERVICE_URL = fakeUrl;
      try { await assert.rejects(sync.syncPersona(person), e => e.getStatus() === 503); }
      finally { process.env.AUTH_SERVICE_URL = authUrl; fake.closeAllConnections(); }
      const after = await projection(); assert.deepEqual(after.docs,before.docs); assert.deepEqual(after.events,before.events);
    });
    await verify('un fallo anterior registrado tarde no marca como fallida una sincronización posterior exitosa', async () => {
      const originalQuery=db.query; let release, announce;
      const blocked=new Promise(resolve=>{announce=resolve;});
      db.query=async function(sql,...args) {
        if(sql.startsWith('INSERT INTO rund.carpeta_auth_sync (persona_id,error_code')) {
          await new Promise(resolve=>{release=resolve; announce();});
        }
        return originalQuery.call(this,sql,...args);
      };
      let failure;
      try {
        mode='unauthorized'; process.env.AUTH_SERVICE_URL=fakeUrl;
        failure=sync.syncPersona(person).then(()=>{throw new Error('Se esperaba un fallo');},error=>error);
        let timer; const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('No se alcanzó el registro de error')),5000); timer.unref();});
        try {await Promise.race([blocked,timeout]);} finally {clearTimeout(timer);}
        process.env.AUTH_SERVICE_URL=authUrl; await sync.syncPersona(person); release();
        assert.equal((await failure).getStatus(),503); assert.equal((await sync.getPersona(person)).error,null);
        assert.deepEqual(await native(),nativeBefore);
      } finally {db.query=originalQuery; if(release) release(); if(failure) await failure; process.env.AUTH_SERVICE_URL=authUrl;}
    });
    await verify('fallo de auditoría revierte upserts, bajas y checkpoint; worker recupera sin duplicar', async () => {
      const before = await projection(); await authDb.query("UPDATE auth.documento_carpeta_digital SET estado='vencido' WHERE id_documento=$1", [document]);
      await db.query(`CREATE FUNCTION rund.reject_sync_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO'; END $$;
        CREATE TRIGGER reject_sync_fixture BEFORE INSERT ON rund.carpeta_auth_sync_evento FOR EACH ROW EXECUTE FUNCTION rund.reject_sync_fixture()`);
      try { await assert.rejects(sync.syncPersona(person)); }
      finally { await db.query('DROP TRIGGER reject_sync_fixture ON rund.carpeta_auth_sync_evento; DROP FUNCTION rund.reject_sync_fixture()'); }
      const failed = await projection(); assert.deepEqual(failed.docs,before.docs); assert.deepEqual(failed.events,before.events); assert.equal(failed.state.revision,before.state.revision);
      // Respetar lotes/fairness aunque el fixture padre contenga muchas otras personas.
      const population=Number((await db.query('SELECT count(DISTINCT "personaId") AS total FROM rund."Docente"'))[0].total);
      for(let i=0;i<Math.ceil(population/25)+2;i++) { await worker.tick(); if((await sync.getPersona(person)).error===null) break; }
      const after = await sync.getPersona(person); assert.equal(after.error,null);
      assert.equal(after.documentos.find(d => d.id === document).estado,'vencido');
      const events = (await projection()).events; await worker.tick(); assert.deepEqual((await projection()).events,events);
      assert.deepEqual(await native(),nativeBefore);
    });
    await verify('carpeta de más de 5000 documentos falla completa, sin guardar una página parcial', async () => {
      const crowded=randomUUID(), crowdedFolder=randomUUID();
      await authDb.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero)
        VALUES ($1,'TEST-LIMIT','CC','Persona ficticia','Persona','X')`,[crowded]);
      await authDb.query('INSERT INTO auth.carpeta_digital(id_carpeta_digital,persona_id) VALUES ($1,$2)',[crowdedFolder,crowded]);
      await authDb.query(`INSERT INTO auth.documento_carpeta_digital(carpeta_digital_id,nombre,url_archivo)
        SELECT $1,'Archivo ficticio','/auth/api/v1/uploads/ficticio.pdf' FROM generate_series(1,5001)`,[crowdedFolder]);
      await sourceRequest(crowded,{status:503}); await assert.rejects(sync.syncPersona(crowded),e=>e.getStatus()===503);
      assert.deepEqual((await sync.getPersona(crowded)).documentos,[]);
      assert.equal((await db.query('SELECT count(*) FROM rund.carpeta_auth_sync_evento WHERE persona_id=$1',[crowded]))[0].count,'0');
      await authDb.query('DELETE FROM auth.personas WHERE id_person=$1',[crowded]); assert.deepEqual(await native(),nativeBefore);
    });
    await verify('baja de carpeta y persona producen vacío explícito con revisión creciente; desconocida sigue 404', async () => {
      const before = await sync.getPersona(person); await authDb.query('DELETE FROM auth.carpeta_digital WHERE id_carpeta_digital=$1', [folder]);
      const empty = await sourceRequest(); assert(BigInt(empty.revision)>BigInt(before.revision)); assert.equal(empty.deleted,false); assert.equal(empty.total,0);
      assert.deepEqual((await sync.syncPersona(person)).documentos,[]);
      await authDb.query('DELETE FROM auth.personas WHERE id_person=$1',[person]);
      const removed = await sourceRequest(); assert.equal(removed.deleted,true); assert(BigInt(removed.revision)>BigInt(empty.revision));
      assert.equal((await sync.syncPersona(person)).deleted,true); await sourceRequest(randomUUID(),{status:404}); assert.deepEqual(await native(),nativeBefore);
      await authDb.query(`INSERT INTO auth.personas (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero)
        VALUES ($1,'TEST-RECREATE','CC','Persona ficticia recreada','Persona','X')`, [person]);
      const recreated = await sourceRequest(); assert.equal(recreated.deleted,false); assert(BigInt(recreated.revision)>BigInt(removed.revision));
      assert.equal((await sync.syncPersona(person)).deleted,false);
    });
    worker.onModuleDestroy();
    fs.writeFileSync(path.join(root,'docs/rund/validacion-sincronizacion-auth-postgres-local.json'), JSON.stringify({ verifiedAt:new Date().toISOString(),
      step:'12.3b.2',passed:true,syntheticDataOnly:true,existingDatabaseUsed:false,synchronize:false,
      application:'Auth HTTP real y RUND controller/guards/consumer compilados; Nest de prueba, PostgreSQL temporal',
      nativeDecisionsAndPtaUnchanged:true,checks },null,2)+'\n');
  } finally {
    if (fake) { fake.closeAllConnections(); await new Promise(resolve => fake.close(resolve)); }
    if (app) await app.close(); if (db?.isInitialized) await db.destroy();
    for (const [key,value] of Object.entries(saved)) { if (value===undefined) delete process.env[key]; else process.env[key]=value; }
  }
};
