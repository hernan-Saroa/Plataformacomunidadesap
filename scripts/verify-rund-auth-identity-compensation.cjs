/* Compensacion Auth compilada, prueba RUND por HTTP real y bases ficticias separadas. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyCompensation(pgConfig,runtime,check,ctx) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service'),auth=path.join(root,'backend/auth-service');
  const dep=name=>require(path.join(rund,'node_modules',name)),compiled=name=>require(path.join(rund,'dist',name));
  const {AuthIdentityExecutionService,AuthIdentityAbortProofController}=compiled('common/auth-identity-execution.service');
  const {InternalServiceGuard}=compiled('internal/internal-service.guard');
  const {identityWriteFingerprint}=compiled('common/auth-identity-command');
  // Auth mantiene con triggers (160) fec_modificacion y updated_at: la restauración se compara sin ellos.
  const {identityImage,restoredValues:imageValues}=require(path.join(auth,'dist/users/rund-identity-effects'));
  const {admin,ds,coord,native,client,authFixture,authUrl,authToken,database,data,identities}=ctx;
  const execution=new AuthIdentityExecutionService(ds,coord,native,client),route='/internal/rund/v1/personas/escritura/operaciones/';
  const image=id=>identityImage({query:async(sql,params)=>(await database.query(sql,params)).rows},id);
  const effect=async id=>(await database.query('SELECT * FROM auth.rund_identidad_efecto WHERE operacion_id=$1',[id])).rows[0];
  const resolution=async id=>(await database.query('SELECT * FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[id])).rows[0];
  const body=item=>({intencionId:item.id,huellaComando:item.local.huellaComando});
  const send=async(item,status=200,headers={'x-internal-service-token':authToken},raw=body(item))=>{
    const response=await fetch(authUrl+route+item.local.operacionAuthId+'/compensar',{method:'POST',
      headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(raw)});
    assert.equal(response.status,status,JSON.stringify({body:await response.clone().text(),fixtureError:authFixture.lastCompensationError()}));
    return {response,body:await response.json()};
  };
  const get=async item=>{const res=await fetch(authUrl+route+item.local.operacionAuthId+'/compensacion',{headers:{'x-internal-service-token':authToken}});
    assert.equal(res.status,200);return (await res.json()).data;};
  const seed=async()=>{const item=data(),id=randomUUID();await client.registrar(id,identityWriteFingerprint(item.command));
    const receipt=await client.aplicar(id,item.command);return {...item,receipt};};
  const existing=async({removeRole=false,removeUser=false,precision=false,otherRole=false}={})=>{
    const original=await seed(),personId=original.receipt.resultado.personaId,userId=original.receipt.resultado.usuarioId;
    await database.query('UPDATE auth."user" SET is_active=true,password_temp=false WHERE id_user=$1',[userId]);
    if(removeRole||removeUser)await database.query('DELETE FROM auth.user_roles WHERE id_user=$1',[userId]);
    else await database.query("UPDATE auth.user_roles SET is_active=false,updated_at='2000-01-01T00:00:00Z' WHERE id_user=$1",[userId]);
    if(removeUser)await database.query('DELETE FROM auth."user" WHERE id_user=$1',[userId]);
    if(precision) {
      await database.query("UPDATE auth.personas SET id_seccional='9007199254740993' WHERE id_person=$1",[personId]);
      await database.query("UPDATE auth.\"user\" SET updated_at='2001-02-03T04:05:06.123456Z' WHERE id_user=$1",[userId]);
    }
    if(otherRole)await database.query("INSERT INTO auth.user_roles(id_user,id_rol,is_active) SELECT $1,id,true FROM auth.role WHERE code='SUPER_ADMIN'",[userId]);
    const before=await image(personId),beforeIdentities=await identities();
    const item=data({DOCUMENTO_IDENTIDAD:original.command.payload.documentNumber,CORREO_INSTITUCIONAL:'comp-'+randomUUID()+'@example.test',NOMBRE_COMPLETO:'DOCENTE EDITADO COMPENSACION'});
    await execution.preparar(item.id,item.command,item.input);await coord.registrarEnAuth(item.id);
    const local=await coord.consultar(item.id);await client.aplicar(local.operacionAuthId,item.command);await coord.reconciliar(item.id);
    return {...item,local:await coord.consultar(item.id),original,before,beforeIdentities,personId,userId};
  };
  const abort=async item=>{await execution.abortar(item.id,'FALLO_NEGOCIO');return item;};
  const trigger=async(table,event,run)=>{
    assert(['rund_identidad_efecto','rund_identidad_compensacion','user_roles'].includes(table));
    await database.query(`CREATE FUNCTION auth.reject_comp_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO COMPENSACION'; END $$;
      CREATE TRIGGER reject_comp_fixture BEFORE ${event} ON auth."${table}" FOR EACH ROW EXECUTE FUNCTION auth.reject_comp_fixture()`);
    try{await run();}finally{await database.query(`DROP TRIGGER reject_comp_fixture ON auth."${table}";DROP FUNCTION auth.reject_comp_fixture()`);}
  };
  let app,stub,proofUrl,settled,proofCalls=0,mode='partial';
  const saved=process.env.INTERNAL_SERVICE_TOKEN;
  try {
    process.env.INTERNAL_SERVICE_TOKEN=authToken;
    const {Module}=dep('@nestjs/common'),{NestFactory}=dep('@nestjs/core');
    class ProofFixtureModule {}
    Module({controllers:[AuthIdentityAbortProofController],providers:[InternalServiceGuard,{provide:AuthIdentityExecutionService,useValue:execution}]})(ProofFixtureModule);
    app=await NestFactory.create(ProofFixtureModule,{logger:false,abortOnError:false});
    app.use((req,res,next)=>{proofCalls++;assert.equal(req.headers['x-internal-service-token'],authToken);
      assert.equal(req.headers.authorization,undefined);assert.equal(req.headers.cookie,undefined);next();});
    await app.listen(0,'127.0.0.1');proofUrl=await app.getUrl();authFixture.setAbortProofUrl(proofUrl);
    await check('Compensacion Auth: token obligatorio y bandera apagada impiden HTTP y cambios aunque exista JWT',async()=>{
      const item=await abort(await existing()),before=await identities(),calls=proofCalls;
      for(const headers of [{},{authorization:'Bearer JWT_FICTICIO'},{'x-internal-service-token':'incorrecto'}])await send(item,401,headers);
      await send(item,503);assert.equal(proofCalls,calls);assert.equal(await resolution(item.local.operacionAuthId),undefined);assert.deepEqual(await identities(),before);
    });
    authFixture.setCompensationEnabled(true);
    await check('Compensacion Auth: body ajeno, huella incorrecta e ID inexistente no autorizan restauracion',async()=>{
      const item=await abort(await existing()),calls=proofCalls,before=await identities();
      await send(item,400,undefined,{...body(item),pruebaAborto:{decisionNativa:'ABORTADA'}});
      await send(item,409,undefined,{...body(item),huellaComando:'f'.repeat(64)});
      await send({...item,local:{...item.local,operacionAuthId:randomUUID()}},404);
      assert.equal(proofCalls,calls);assert.deepEqual(await identities(),before);
    });
    await check('Compensacion Auth: captura atomica privada, sin credenciales y con bigint textual antes de aplicar',async()=>{
      const item=await abort(await existing()),record=await effect(item.local.operacionAuthId);settled=item;
      assert.deepEqual(record.preimagen,item.before);assert.deepEqual(record.postimagen,await image(item.personId));
      assert.equal(record.persona_id,item.personId);assert.equal(record.usuario_id,item.userId);assert.equal(record.huella_comando,item.local.huellaComando);
      assert(!/password|token|secret/i.test(JSON.stringify(record)));
      assert.equal((await get(item)).resolucion,null);
      // La representacion de id_seccional siempre es texto o null; nunca se convierte mediante Number().
      const current=await image(item.personId);assert(current.persona.datos.id_seccional===null||typeof current.persona.datos.id_seccional==='string');
    });
    await check('Compensacion Auth: restaura persona, username y rol previo sin alterar contrasena o activacion',async()=>{
      const item=settled,receipt=(await client.consultar(item.local.operacionAuthId));
      const {body:result,response}=await send(item);assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.equal(result.data.resolucion.estado,'COMPENSADA');assert.equal(result.data.resolucion.identidadRevertida,true);
      // Compara todas las columnas de personas/cuentas/roles, incluida la contrasena, sin exponerlas.
      const current=await image(item.personId);assert.deepEqual(imageValues(current),imageValues(item.before));
      assert.deepEqual(await identities(),item.beforeIdentities);
      assert.deepEqual(await client.consultar(item.local.operacionAuthId),receipt); // Recibo aplicado historico inmutable.
      await assert.rejects(client.aplicar(item.local.operacionAuthId,item.command),error=>error.getStatus()===409);
      assert.equal((await execution.consultar(item.id)).resolucionAuthPendiente,true); // La conciliacion RUND de compensaciones es el siguiente contrato.
      assert(!/preimagen|postimagen|password|username/.test(JSON.stringify(result.data)));
    });
    await check('Compensacion Auth: imagen independiente de zona horaria conserva microsegundos y bigint superior al entero seguro',async()=>{
      const item=await abort(await existing({precision:true})),record=await effect(item.local.operacionAuthId);
      assert.equal(record.preimagen.persona.datos.id_seccional,'9007199254740993');
      // updated_at de la cuenta lo fija el trigger 160 en cada UPDATE: no se puede sembrar un valor, pero la imagen conserva microsegundos UTC.
      assert.match(record.preimagen.usuarios[0].datos.updated_at,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/);
      await database.query("SET TIME ZONE 'America/Bogota'");
      try{assert.deepEqual(await image(item.personId),record.postimagen);}finally{await database.query('SET TIME ZONE DEFAULT');}
      assert.equal((await send(item)).body.data.resolucion.estado,'COMPENSADA');assert.deepEqual(await identities(),item.beforeIdentities);
      assert.deepEqual(imageValues(await image(item.personId)),imageValues(item.before));
    });
    await check('Compensacion Auth: asignacion DOCENTE creada por la edicion se retira conservando otros roles',async()=>{
      const original=await existing({removeRole:true}),other=(await database.query("SELECT id FROM auth.role WHERE code='SUPER_ADMIN'")).rows[0].id;
      // Otra asignacion posterior a aplicar debe bloquear la compensacion, incluso si el rol no es DOCENTE.
      await database.query('INSERT INTO auth.user_roles(id_user,id_rol,is_active) VALUES ($1,$2,true)',[original.userId,other]);
      await abort(original);assert.equal((await send(original)).body.data.resolucion.motivo,'CAMBIOS_POSTERIORES');
      const item=await abort(await existing({removeRole:true,otherRole:true}));assert.equal((await send(item)).body.data.resolucion.estado,'COMPENSADA');
      assert.deepEqual(await identities(),item.beforeIdentities);
    });
    await check('Compensacion Auth: recibo final y GET se recuperan sin HTTP o segunda restauracion',async()=>{
      const item=settled,first=(await get(item)).resolucion,before=await identities(),calls=proofCalls;
      authFixture.setAbortProofUrl('http://127.0.0.1:1');
      try{assert.deepEqual((await send(item)).body.data.resolucion,first);}finally{authFixture.setAbortProofUrl(proofUrl);}
      assert.equal(proofCalls,calls);assert.deepEqual(await identities(),before);
      await send(item,409,undefined,{...body(item),intencionId:randomUUID()});
    });
    await check('Compensacion Auth: seis solicitudes simultaneas conservan un recibo y una restauracion',async()=>{
      const item=await abort(await existing()),results=await Promise.all(Array.from({length:6},()=>send(item)));
      results.forEach(result=>assert.deepEqual(result.body.data,results[0].body.data));assert.deepEqual(await identities(),item.beforeIdentities);
      assert.equal((await database.query('SELECT count(*) FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[item.local.operacionAuthId])).rows[0].count,'1');
    });
    await check('Compensacion Auth: respuesta perdida tras commit se recupera por GET y replay sin nuevos efectos',async()=>{
      const item=await abort(await existing());authFixture.dropNextCompensationResponse();await assert.rejects(send(item));
      const first=(await get(item)).resolucion,before=await identities(),calls=proofCalls;assert.equal(first.estado,'COMPENSADA');
      assert.deepEqual((await send(item)).body.data.resolucion,first);assert.deepEqual(await identities(),before);assert.equal(proofCalls,calls);
    });
    await check('Compensacion Auth: fallo al guardar recibo revierte la restauracion completa y permite reintentar',async()=>{
      const item=await abort(await existing()),before=await identities();
      await trigger('rund_identidad_compensacion','INSERT',async()=>{await send(item,500);});
      assert.deepEqual(await identities(),before);assert.equal(await resolution(item.local.operacionAuthId),undefined);
      assert.equal((await send(item)).body.data.resolucion.estado,'COMPENSADA');assert.deepEqual(await identities(),item.beforeIdentities);
    });
    await check('Compensacion Auth: fallo de retiro de rol revierte tambien persona y cuenta sin recibo falso',async()=>{
      const item=await abort(await existing({removeRole:true})),before=await identities();
      await trigger('user_roles','DELETE',async()=>{await send(item,500);});assert.deepEqual(await identities(),before);
      assert.equal(await resolution(item.local.operacionAuthId),undefined);assert.equal((await send(item)).body.data.resolucion.estado,'COMPENSADA');
    });
    await check('Compensacion Auth: alta nueva y cuenta creada para persona existente requieren revision sin borrados',async()=>{
      const item=data();await execution.preparar(item.id,item.command,item.input);await coord.registrarEnAuth(item.id);
      item.local=await coord.consultar(item.id);await client.aplicar(item.local.operacionAuthId,item.command);await coord.reconciliar(item.id);await abort(item);
      const before=await identities();const result=(await send(item)).body.data.resolucion;
      assert.equal(result.estado,'REVISION_REQUERIDA');assert.equal(result.motivo,'ALTA_IDENTIDAD');assert.equal(result.identidadRevertida,false);assert.deepEqual(await identities(),before);
      const existingPerson=await abort(await existing({removeUser:true})),after=await identities();
      assert.equal((await send(existingPerson)).body.data.resolucion.motivo,'ALTA_IDENTIDAD');assert.deepEqual(await identities(),after);
    });
    await check('Compensacion Auth: aplicado historico sin preimagen no se reconstruye desde diferencias incompletas',async()=>{
      const original=await seed(),item=data({DOCUMENTO_IDENTIDAD:original.command.payload.documentNumber,CORREO_INSTITUCIONAL:original.command.emailFinal});
      await execution.preparar(item.id,item.command,item.input);await coord.registrarEnAuth(item.id);item.local=await coord.consultar(item.id);
      await database.query("UPDATE auth.rund_identidad_operacion SET estado='APLICADA',aplicada_en=now(),resultado=$2::jsonb WHERE operacion_id=$1",
        [item.local.operacionAuthId,JSON.stringify({...original.receipt.resultado,usuarioCreado:false})]);
      await coord.reconciliar(item.id);await abort(item);const before=await identities();
      assert.equal((await send(item)).body.data.resolucion.motivo,'SIN_PREIMAGEN');assert.deepEqual(await identities(),before);
    });
    await check('Compensacion Auth: cambios posteriores y ABA se detectan por revision aunque coincidan los valores',async()=>{
      const item=await abort(await existing()),after=await image(item.personId);
      await database.query("UPDATE auth.personas SET nom_largo='CAMBIO POSTERIOR' WHERE id_person=$1",[item.personId]);
      await database.query('UPDATE auth.personas SET nom_largo=$2 WHERE id_person=$1',[item.personId,after.persona.datos.nom_largo]);
      assert.deepEqual(imageValues(await image(item.personId)),imageValues(after));const before=await identities();
      assert.equal((await send(item)).body.data.resolucion.motivo,'CAMBIOS_POSTERIORES');assert.deepEqual(await identities(),before);
    });
    await check('Compensacion Auth: cambio de contrasena o rol posterior bloquea toda restauracion',async()=>{
      for(const table of ['user','user_roles']) {
        const item=await abort(await existing());
        await database.query(table==='user'?"UPDATE auth.\"user\" SET password_hash='HASH_FICTICIO_POSTERIOR' WHERE id_user=$1":'UPDATE auth.user_roles SET is_active=false WHERE id_user=$1',[item.userId]);
        const before=await identities();assert.equal((await send(item)).body.data.resolucion.motivo,'CAMBIOS_POSTERIORES');assert.deepEqual(await identities(),before);
      }
    });
    await check('Compensacion Auth: otra operacion posterior sin cambios fisicos protege la reutilizacion conocida',async()=>{
      const item=await abort(await existing()),nextId=randomUUID(),before=await image(item.personId);
      await client.registrar(nextId,identityWriteFingerprint(item.command));await client.aplicar(nextId,item.command);
      assert.deepEqual(await image(item.personId),before);const identitiesBefore=await identities();
      assert.equal((await send(item)).body.data.resolucion.motivo,'OTRA_OPERACION_POSTERIOR');assert.deepEqual(await identities(),identitiesBefore);
    });
    await check('Compensacion Auth: correo anterior reclamado por otra identidad no se restaura ni duplica',async()=>{
      const item=await abort(await existing()),other=data({CORREO_INSTITUCIONAL:item.before.persona.datos.dir_email}),otherId=randomUUID();
      await client.registrar(otherId,identityWriteFingerprint(other.command));await client.aplicar(otherId,other.command);const before=await identities();
      assert.equal((await send(item)).body.data.resolucion.motivo,'CORREO_REUTILIZADO');assert.deepEqual(await identities(),before);
    });
    await check('Compensacion Auth: ejecucion abierta, commit confirmado e intencion ajena no acreditan aborto',async()=>{
      const item=await existing(),before=await identities();await send(item,409);assert.equal(await resolution(item.local.operacionAuthId),undefined);
      await execution.ejecutar(item.id);await send(item,409);assert.deepEqual(await identities(),before);
      const aborted=await abort(await existing()),other=await abort(await existing());
      await send(aborted,503,undefined,{...body(aborted),intencionId:other.id});assert.equal(await resolution(aborted.local.operacionAuthId),undefined);
    });
    await check('Compensacion Auth: caida, 404, redirect y prueba parcial no abren una restauracion o revision falsa',async()=>{
      const item=await abort(await existing()),before=await identities();
      const malformedProof={...await execution.pruebaAborto(item.id),motivoAborto:['FALLO_NEGOCIO']};
      stub=http.createServer((req,res)=>{
        req.resume();res.writeHead(mode==='missing'?404:mode==='down'?503:mode==='redirect'?302:200,
          {'Content-Type':'application/json',...(mode==='redirect'?{Location:proofUrl+req.url}:{})});res.end(JSON.stringify({pruebaAborto:mode==='array'?malformedProof:{decisionNativa:'ABORTADA'}}));
      });
      await new Promise(resolve=>stub.listen(0,'127.0.0.1',resolve));const stubUrl='http://127.0.0.1:'+stub.address().port;
      authFixture.setAbortProofUrl(stubUrl);
      try{for(mode of ['missing','down','redirect','partial','array'])await send(item,503);}finally{authFixture.setAbortProofUrl(proofUrl);}
      assert.equal(await resolution(item.local.operacionAuthId),undefined);assert.deepEqual(await identities(),before);
    });
    await check('Compensacion Auth: fallo de captura revierte identidad, recibo aplicado y efecto en una transaccion',async()=>{
      const item=data(),id=randomUUID();await client.registrar(id,identityWriteFingerprint(item.command));const before=await identities();
      await trigger('rund_identidad_efecto','INSERT',async()=>{await assert.rejects(client.aplicar(id,item.command),error=>error.getStatus()===503);});
      assert.equal((await client.consultar(id)).estado,'REGISTRADA');assert.equal(await effect(id),undefined);assert.deepEqual(await identities(),before);
      await client.aplicar(id,item.command);assert(await effect(id));
    });
    await check('Compensacion Auth: 671 repetible y registros privados inmutables conservan recibos y rechazan prueba nula',async()=>{
      const snapshot=async()=>({effects:(await database.query('SELECT to_jsonb(t) AS row FROM auth.rund_identidad_efecto t ORDER BY operacion_id')).rows,
        resolutions:(await database.query('SELECT to_jsonb(t) AS row FROM auth.rund_identidad_compensacion t ORDER BY operacion_id')).rows});
      const before=await snapshot(),sql=fs.readFileSync(path.join(root,'db/migrations/671_auth_rund_identidad_compensacion.sql'),'utf8');
      await database.query(sql);await database.query(sql);assert.deepEqual(await snapshot(),before);
      for(const table of ['rund_identidad_efecto','rund_identidad_compensacion'])for(const query of [
        `DELETE FROM auth.${table} WHERE operacion_id=$1`,`UPDATE auth.${table} SET huella_comando=repeat('f',64) WHERE operacion_id=$1`])
        await assert.rejects(database.query(query,[settled.local.operacionAuthId]),/inmutable/);
      const item=await abort(await existing());await assert.rejects(database.query(`INSERT INTO auth.rund_identidad_compensacion
        (operacion_id,intencion_id,huella_comando,estado,motivo,prueba_aborto) VALUES ($1,$2,$3,'REVISION_REQUERIDA','SIN_PREIMAGEN',$4::jsonb)`,
        [item.local.operacionAuthId,item.id,item.local.huellaComando,JSON.stringify({...await execution.pruebaAborto(item.id),version:null})]),/aborto_check/);
    });
    await check('Compensacion Auth: bandera apagada no necesita 671; migracion ausente con aplicador habilitado falla sin efectos',async()=>{
      const item=data(),id=randomUUID();await client.registrar(id,identityWriteFingerprint(item.command));const before=await identities();
      await database.query('ALTER TABLE auth.rund_identidad_efecto RENAME TO rund_identidad_efecto_ficticio');
      try {
        authFixture.setCompensationEnabled(false);await send({...settled,local:{...settled.local,operacionAuthId:id}},503);
        authFixture.setApplyEnabled(false);await assert.rejects(client.aplicar(id,item.command),error=>error.getStatus()===503);
        authFixture.setApplyEnabled(true);await assert.rejects(client.aplicar(id,item.command),error=>error.getStatus()===503);
      }finally{await database.query('ALTER TABLE auth.rund_identidad_efecto_ficticio RENAME TO rund_identidad_efecto');authFixture.setApplyEnabled(true);authFixture.setCompensationEnabled(true);}
      assert.equal((await client.consultar(id)).estado,'REGISTRADA');assert.deepEqual(await identities(),before);
    });
    await check('Compensacion Auth: propietario sin privilegios RUND, bases separadas y tablas preparatorias activas vacias',async()=>{
      assert(await authFixture.applyHasNoRundPrivileges());assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      for(const table of ['identidad_operacion','identidad_contexto_nativo','identidad_ejecucion'])assert.equal((await database.query('SELECT count(*) FROM rund.'+table)).rows[0].count,'0');
      assert((await database.query('SELECT count(*) FROM auth.rund_identidad_compensacion')).rows[0].count>0);
    });
    await require('./verify-rund-compensation-reconciliation.cjs')(pgConfig,runtime,check,{admin,ds,coord,native,client,
      authFixture,authUrl,authToken,database,data,identities,image,existing,abort,execution,send,get});
  }finally{
    authFixture.setCompensationEnabled(false);authFixture.setAbortProofUrl(undefined);
    if(app)await app.close();if(stub)await new Promise(resolve=>{stub.close(resolve);stub.closeAllConnections();});
    if(saved===undefined)delete process.env.INTERNAL_SERVICE_TOKEN;else process.env.INTERNAL_SERVICE_TOKEN=saved;
  }
};
