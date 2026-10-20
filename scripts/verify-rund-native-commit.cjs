/* Commit nativo real sobre otra base RUND sin Auth, dentro del cluster ficticio. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {randomUUID,randomBytes}=require('node:crypto');
module.exports=async function verifyNative(pgConfig,runtime,check,{database,row,authUrl,authToken,authFixture}) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service'),compiled=p=>require(path.join(rund,'dist',p));
  const {Client}=require(path.join(rund,'node_modules/pg')),{DataSource}=require(path.join(rund,'node_modules/typeorm'));
  const {AuthIdentityCoordinationService}=compiled('common/auth-identity-coordination.service'),{AuthIdentityOperationClient}=compiled('common/auth-identity-operation.client');
  const {AuthIdentityNativeCommitService}=compiled('common/auth-identity-native-commit.service');
  const {BancoDocentesService,normalizeBancoDocentePayload,normalizePhoneForAuth}=compiled('modules/banco-docentes/banco-docentes.service');
  const {BancoDocenteEntity}=compiled('entities/banco-docente.entity');
  const dbName='rund_native_commit',role='rund_native_'+randomUUID().replace(/-/g,''),password=randomBytes(24).toString('hex');
  const admin=new Client({...pgConfig,database:dbName}),client=new AuthIdentityOperationClient();
  const saved=Object.fromEntries(['AUTH_SERVICE_URL','AUTH_INTERNAL_SERVICE_TOKEN'].map(key=>[key,process.env[key]]));
  const migrations=['001_create_rund_schema.sql','003_legacy_rund_tables.sql','004_rund_docente_identificadores_text.sql',
    '005_rund_tarjeta_numero_secuencia.sql','007_rund_carpeta_auth_proyeccion.sql','008_rund_identidad_operacion.sql','009_rund_identidad_contexto_nativo.sql','010_rund_identidad_ejecucion.sql','011_rund_identidad_resolucion_auth.sql','012_rund_identidad_revision.sql','013_rund_identidad_solicitud.sql','014_rund_identidad_entrada_manual.sql','015_rund_identidad_abandono_manual.sql','016_rund_identidad_correo.sql', '017_rund_identidad_correo_resultado.sql', '018_rund_identidad_correo_revision.sql', '019_rund_identidad_correo_revision_cierre.sql', '020_rund_identidad_correo_omision.sql', '021_rund_identidad_correo_revision_incierto.sql', '023_rund_autogestion_contexto_sin_periodo.sql'];
  let ds,coord,native,banco,connected=false,roleCreated=false,stub;
  const makeDb=()=>new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,database:dbName,
    username:role,password,entities:[BancoDocenteEntity],synchronize:false,extra:{max:6}});
  const start=async()=>{ds=makeDb();await ds.initialize();coord=new AuthIdentityCoordinationService(ds,new AuthIdentityOperationClient());
    banco=new BancoDocentesService({},{},{},{},{},ds,{},{},{});
    banco.sendWelcomeEmail=async()=>{throw new Error('No se debe enviar correo dentro del commit nativo');};
    native=new AuthIdentityNativeCommitService(ds,coord,banco);};
  const data=(overrides={})=>{const marker=randomUUID().replace(/-/g,'').slice(0,13),actor=randomUUID();
    const raw={...row,DOCUMENTO_IDENTIDAD:'65'+marker,CORREO_INSTITUCIONAL:'native-'+marker+'@example.test',PERIODO_CARGA:'2095-2',...overrides};
    const payload=normalizeBancoDocentePayload(raw),emailFinal=payload.correoInstitucional.toLowerCase().trim(),phoneFinal=normalizePhoneForAuth(payload.telefono,true),finalFullName=payload.fullName;
    const command={version:1,actorId:actor,payload:{documentNumber:payload.documentNumber,documentType:payload.documentType,
      primer_nombre:payload.primer_nombre||null,primer_apellido:payload.primer_apellido||null,segundo_apellido:payload.segundo_apellido||null,genero:payload.genero,
      fechaNacimiento:payload.fechaNacimiento?payload.fechaNacimiento.toISOString().slice(0,10):null},
      options:{relaxValidation:false,preserveTerritorial:true},territorial:null,emailFinal,phoneFinal,finalFullName};
    const input={payload,rawPayload:raw,options:{bulkImport:true,preserveTerritorial:true,audit:{actorId:actor,canalOrigen:'MASIVO',metadata:{fuente:'FICTICIA'}}},emailFinal,phoneFinal,finalFullName};
    return {id:randomUUID(),command,input};};
  const prepared=async(overrides={})=>{const item=data(overrides);await native.preparar(item.id,item.command,item.input);return item;};
  const applied=async(item)=>{await coord.registrarEnAuth(item.id);const local=await coord.consultar(item.id);
    await client.aplicar(local.operacionAuthId,item.command);await coord.reconciliar(item.id);return item;};
  const snapshot=async()=>{const result={};for(const {tablename}of(await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='rund' ORDER BY tablename")).rows)
    result[tablename]=(await admin.query(`SELECT to_jsonb(t) AS row FROM rund."${tablename}" t ORDER BY to_jsonb(t)::text`)).rows;return result;};
  const identities=async()=>{const result={};for(const table of ['personas','user','user_roles','role'])result[table]=(await database.query(`SELECT (to_jsonb(t) - 'fec_modificacion' - 'updated_at') AS row FROM auth."${table}" t ORDER BY to_jsonb(t)::text`)).rows;return result;};
  const trigger=async(table,when,work)=>{await admin.query(`CREATE FUNCTION rund.reject_native_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO NATIVO'; END $$;
    CREATE TRIGGER reject_native_fixture BEFORE ${when} ON rund."${table}" FOR EACH ROW EXECUTE FUNCTION rund.reject_native_fixture()`);
    try{await work();}finally{await admin.query(`DROP TRIGGER reject_native_fixture ON rund."${table}";DROP FUNCTION rund.reject_native_fixture()`);}};
  let known,confirmed;
  try {
    await database.query('CREATE DATABASE '+dbName);await admin.connect();connected=true;
    for(const name of migrations)await admin.query(fs.readFileSync(path.join(rund,'db/migrations',name),'utf8'));
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}';GRANT USAGE ON SCHEMA rund TO ${role};
      GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA rund TO ${role};GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA rund TO ${role}`);roleCreated=true;
    Object.assign(process.env,{AUTH_SERVICE_URL:authUrl,AUTH_INTERNAL_SERVICE_TOKEN:authToken});await start();
    await check('Commit nativo: base separada con schema RUND sin Auth, ORM nativo y rol sin SQL sobre identidad',async()=>{
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      await assert.rejects(ds.query('SELECT * FROM auth.personas'),/does not exist/);
      assert.equal((await native.consultar(randomUUID()).catch(error=>error)).getStatus(),404);
    });
    await check('Commit nativo: contexto estable incluye periodo y auditoría, se confirma antes de HTTP y no admite otro contexto',async()=>{
      const count=authFixture.operationRequestHeaders().length;known=data();
      const results=await Promise.all(Array.from({length:6},()=>native.preparar(known.id,known.command,known.input)));
      results.forEach(result=>assert.deepEqual(result,results[0]));assert.equal(authFixture.operationRequestHeaders().length,count);
      const before=await snapshot();await assert.rejects(native.preparar(known.id,known.command,{...known.input,payload:{...known.input.payload,periodoCarga:'2095-1'}}),error=>error.getStatus()===409);
      assert.deepEqual(await snapshot(),before);
    });
    await check('Commit nativo: Auth no aplicado bloquea perfil y marcador; contexto tardío no se agrega tras publicar intención',async()=>{
      const before=await snapshot();await assert.rejects(native.confirmarNativo(known.id),error=>error.getStatus()===409);assert.deepEqual(await snapshot(),before);
      await coord.registrarEnAuth(known.id);const registeredBefore=await snapshot();await assert.rejects(native.confirmarNativo(known.id),error=>error.getStatus()===409);assert.deepEqual(await snapshot(),registeredBefore);
      const late=data();await coord.preparar(late.id,late.command);await coord.registrarEnAuth(late.id);
      await assert.rejects(native.preparar(late.id,late.command,late.input),error=>error.getStatus()===409);
    });
    await check('Commit nativo: recibo Auth aplicado permite perfil, bloques, validación documental, auditoría y marcador en un commit sin HTTP o correo',async()=>{
      const local=await coord.consultar(known.id);await client.aplicar(local.operacionAuthId,known.command);await coord.reconciliar(known.id);
      const count=authFixture.operationRequestHeaders().length,beforeAuth=await identities();confirmed=await native.confirmarNativo(known.id);
      assert.equal(confirmed.estado,'CONFIRMADA');assert.equal(confirmed.resultado.action,'insert');assert.equal(confirmed.resultado.welcomeEmail.sent,false);
      const profile=(await admin.query('SELECT * FROM rund."Docente" WHERE id=$1',[confirmed.docenteId])).rows[0];
      assert.equal(profile.periodoCarga,'2095-2');assert.equal(profile.personaId,confirmed.resultado.personaId);
      assert.equal(profile.fechaInicioVinculacion.getFullYear(),known.input.payload.fechaInicioVinculacion.getUTCFullYear());
      assert.equal((await admin.query('SELECT * FROM rund."RundCampoEstado" WHERE docente_id=$1',[confirmed.docenteId])).rows.length,BancoDocentesService.BLOQUES.length);
      assert((await admin.query('SELECT * FROM rund.validacion_documental WHERE docente_id=$1',[confirmed.docenteId])).rows.length>0);
      assert.equal((await admin.query('SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1',[confirmed.docenteId])).rows.length,1);
      assert.equal(authFixture.operationRequestHeaders().length,count);assert.deepEqual(await identities(),beforeAuth);
    });
    await check('Commit nativo: confirmaciones simultáneas no duplican perfil, auditoría, bloques o recibo',async()=>{
      const before=await snapshot(),results=await Promise.all(Array.from({length:6},()=>native.confirmarNativo(known.id)));
      results.forEach(result=>assert.deepEqual(result,confirmed));assert.deepEqual(await snapshot(),before);
      assert.deepEqual(await native.preparar(known.id,known.command,known.input),confirmed);
    });
    await check('Commit nativo: fallo de auditoría revierte perfil, evidencias y marcador; Auth aplicado queda pendiente de coordinación',async()=>{
      const item=await applied(await prepared()),before=await snapshot(),beforeAuth=await identities();
      await trigger('RundAprobacionLog','INSERT',async()=>{await assert.rejects(native.confirmarNativo(item.id),/FALLO FICTICIO NATIVO/);});
      assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),beforeAuth);assert.equal((await coord.consultar(item.id)).estado,'AUTH_APLICADA');
      assert.equal((await native.confirmarNativo(item.id)).estado,'CONFIRMADA');
    });
    await check('Commit nativo: fallo al guardar el recibo revierte todo el negocio y reintenta sin aplicar Auth otra vez',async()=>{
      const item=await applied(await prepared()),before=await snapshot(),beforeAuth=await identities(),count=authFixture.operationRequestHeaders().length;
      await trigger('identidad_contexto_nativo','UPDATE',async()=>{await assert.rejects(native.confirmarNativo(item.id),/FALLO FICTICIO NATIVO/);});
      assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),beforeAuth);
      assert.equal((await native.confirmarNativo(item.id)).estado,'CONFIRMADA');assert.equal(authFixture.operationRequestHeaders().length,count);
    });
    await check('Commit nativo: fallo JS tolerado por inicialización heredada no permite confirmar un alta sin bloques',async()=>{
      const item=await applied(await prepared()),before=await snapshot(),original=banco.inicializarBloques;
      banco.inicializarBloques=async()=>{throw new Error('FALLO FICTICIO JS BLOQUES');};
      try{await assert.rejects(native.confirmarNativo(item.id),error=>error.getStatus()===503);}finally{banco.inicializarBloques=original;}
      assert.deepEqual(await snapshot(),before);assert.equal((await native.confirmarNativo(item.id)).estado,'CONFIRMADA');
    });
    await check('Commit nativo: rejectExisting después de Auth no altera el perfil ni fabrica marcador confirmado',async()=>{
      const item=data({DOCUMENTO_IDENTIDAD:known.command.payload.documentNumber,CORREO_INSTITUCIONAL:known.command.emailFinal});item.input.options.rejectExisting=true;
      await native.preparar(item.id,item.command,item.input);await applied(item);const before=await snapshot();
      await assert.rejects(native.confirmarNativo(item.id),error=>error.getStatus()===400);assert.deepEqual(await snapshot(),before);
    });
    await check('Commit nativo: soporte rechazado antes del commit revierte la edición y conserva la intención pendiente',async()=>{
      const item=data({DOCUMENTO_IDENTIDAD:known.command.payload.documentNumber,CORREO_INSTITUCIONAL:known.command.emailFinal,OBSERVACIONES:'CAMBIO QUE DEBE REVERTIR'});
      item.input.options.audit.requiredSupport={id:randomUUID(),type:'soporte_edicion_perfil',docenteId:confirmed.docenteId};
      await admin.query(`INSERT INTO rund."RundSoporteCampo" (id,docente_id,bloque,tipo_soporte,documento_carpeta_id,estado)
        VALUES ($1,$2,'GENERAL','soporte_edicion_perfil',$3,'Pendiente')`,[item.input.options.audit.requiredSupport.id,confirmed.docenteId,randomUUID()]);
      await native.preparar(item.id,item.command,item.input);await applied(item);
      await admin.query('UPDATE rund."RundSoporteCampo" SET estado=\'Rechazado\' WHERE id=$1',[item.input.options.audit.requiredSupport.id]);
      const before=await snapshot();
      await assert.rejects(native.confirmarNativo(item.id),error=>error.getStatus()===400);assert.deepEqual(await snapshot(),before);
    });
    await check('Commit nativo: respuesta perdida después del commit se recupera al reabrir conexiones sin duplicar efectos',async()=>{
      const item=await applied(await prepared());
      stub=http.createServer(async(req,res)=>{try{assert.equal(req.headers['x-internal-service-token'],authToken);req.resume();await native.confirmarNativo(item.id);res.destroy();}
        catch(error){res.writeHead(500);res.end(error.message);}});
      await new Promise(resolve=>stub.listen(0,'127.0.0.1',resolve));
      await assert.rejects(fetch(`http://127.0.0.1:${stub.address().port}/commit`,{method:'POST',headers:{'x-internal-service-token':authToken}}));
      const before=await snapshot();await ds.destroy();await start();const recovered=await native.consultar(item.id);assert.equal(recovered.estado,'CONFIRMADA');
      assert.deepEqual(await native.confirmarNativo(item.id),recovered);assert.deepEqual(await snapshot(),before);
    });
    await check('Commit nativo: contexto y marcador final inmutables; 009 y 023 repetibles no cambian negocio o recibos',async()=>{
      const before=await snapshot(),sql=fs.readFileSync(path.join(rund,'db/migrations/009_rund_identidad_contexto_nativo.sql'),'utf8');
      await admin.query(sql);await admin.query(sql);
      const partialSql=fs.readFileSync(path.join(rund,'db/migrations/023_rund_autogestion_contexto_sin_periodo.sql'),'utf8');
      await admin.query(partialSql);await admin.query(partialSql);assert.deepEqual(await snapshot(),before);
      for(const query of ['DELETE FROM rund.identidad_contexto_nativo WHERE intencion_id=$1',
        "UPDATE rund.identidad_contexto_nativo SET contexto='{}'::jsonb WHERE intencion_id=$1",
        "UPDATE rund.identidad_contexto_nativo SET estado='PREPARADA',confirmada_en=NULL,docente_id=NULL,resultado_nativo=NULL WHERE intencion_id=$1"])
        await assert.rejects(admin.query(query,[known.id]),/contexto nativo RUND/);
      assert.deepEqual(await snapshot(),before);
    });
    await check('Commit nativo: preview y flujos activos no crean contexto; no hay schema Auth o compensación implícita en el escritor',async()=>{
      assert.equal((await database.query('SELECT count(*) FROM rund.identidad_contexto_nativo')).rows[0].count,'0');
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      assert.equal((await native.consultar(known.id)).resultado.welcomeEmail.sent,false);
    });
    await require('./verify-rund-identity-execution.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,banco,client,
      authFixture,authUrl,authToken,database,data,prepared,applied,snapshot,identities,trigger,known,confirmed});
    await require('./verify-rund-identity-abort-resolution.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,client,
      authFixture,authToken,database,data,prepared,applied,snapshot,identities,trigger});
    await require('./verify-rund-auth-identity-compensation.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,client,
      authFixture,authUrl,authToken,database,data,prepared,applied,snapshot,identities});
    await require('./verify-rund-identity-requests.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,client,row,
      authFixture,database,snapshot,identities,trigger});
    await require('./verify-rund-manual-entry.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,client,row,
      authFixture,database,snapshot,identities,trigger});
    await require('./verify-rund-identity-mail.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,client,row,
      authFixture,database,snapshot,identities,trigger,known});
    await require('./verify-rund-identity-write-via-auth.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,banco,client,
      authFixture,database,data,snapshot,identities,trigger});
  }finally{
    for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
    if(stub)await new Promise(resolve=>{stub.close(resolve);stub.closeAllConnections();});
    if(ds?.isInitialized)await ds.destroy();
    if(connected){if(roleCreated)await admin.query(`DROP OWNED BY ${role};DROP ROLE ${role}`);await admin.end();}
  }
};
