/* Aborto/cancelacion reales sobre las bases ficticias ya aisladas por el fixture nativo. */
const assert=require('node:assert/strict'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyAbortResolution(pgConfig,runtime,check,ctx) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const dep=name=>require(path.join(rund,'node_modules',name)),compiled=name=>require(path.join(rund,'dist',name));
  const {AuthIdentityExecutionService,AuthIdentityAbortProofController}=compiled('common/auth-identity-execution.service');
  const {AuthIdentityOperationClient}=compiled('common/auth-identity-operation.client');
  const {AuthIdentityCoordinationService}=compiled('common/auth-identity-coordination.service');
  const {InternalServiceGuard}=compiled('internal/internal-service.guard'),{JwtAuthGuard}=compiled('auth/jwt-auth.guard');
  const {ds,coord,native,authFixture,authToken,database,data,prepared,applied,snapshot,identities,trigger}=ctx;
  const operationHeadersStart=authFixture.operationRequestHeaders().length;
  const client=new AuthIdentityOperationClient();let cancellations=0,app;
  const cancel=client.cancelar.bind(client);client.cancelar=async(...args)=>{cancellations++;return cancel(...args);};
  const execution=()=>new AuthIdentityExecutionService(ds,coord,native,client),service=execution();
  const fresh=async()=>{const item=data();await service.preparar(item.id,item.command,item.input);return item;};
  const aborted=async()=>{const item=await fresh();await service.abortar(item.id,'FALLO_NEGOCIO');return item;};
  const business=async()=>Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>!name.startsWith('identidad_')));
  const savedToken=process.env.INTERNAL_SERVICE_TOKEN;
  let url,settled;
  const request=async(id,headers={'x-internal-service-token':authToken},status=200)=>{
    const response=await fetch(`${url}/internal/rund/v1/identidad/intenciones/${id}/aborto`,{headers});
    assert.equal(response.status,status,await response.clone().text());return {response,body:await response.json()};
  };
  try {
    process.env.INTERNAL_SERVICE_TOKEN=authToken;
    const {Module}=dep('@nestjs/common'),{NestFactory,Reflector}=dep('@nestjs/core');
    class ProofFixtureModule {}
    Module({controllers:[AuthIdentityAbortProofController],providers:[InternalServiceGuard,
      {provide:AuthIdentityExecutionService,useValue:service}]})(ProofFixtureModule);
    app=await NestFactory.create(ProofFixtureModule,{logger:false,abortOnError:false});
    app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));await app.listen(0,'127.0.0.1');url=await app.getUrl();
    await check('Resolucion aborto: prueba interna exige token aunque incluya JWT y no expone comando o identidad',async()=>{
      const item=await aborted(),before=await snapshot(),calls=authFixture.operationRequestHeaders().length;
      await request(item.id,{},401);await request(item.id,{authorization:'Bearer JWT_FICTICIO'},401);
      await request(item.id,{'x-internal-service-token':'incorrecto',authorization:'Bearer JWT_FICTICIO'},401);
      const {body,response}=await request(item.id.toUpperCase());assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.deepEqual(body,{pruebaAborto:await service.pruebaAborto(item.id)});assert.equal(Object.keys(body.pruebaAborto).length,9);
      assert.equal(body.pruebaAborto.decisionNativa,'ABORTADA');assert.equal(body.pruebaAborto.estadoNativo,'PREPARADA');
      assert.equal(authFixture.operationRequestHeaders().length,calls);assert.deepEqual(await snapshot(),before);
      assert(!/personaId|usuarioId|document|email|password|resultado|recibo|comandoAuth/i.test(JSON.stringify(body)));
    });
    await check('Resolucion aborto: prueba rechaza ID invalido, ausencia, ejecucion abierta y commit confirmado',async()=>{
      await request('no-id',undefined,400);await request(randomUUID(),undefined,404);
      const open=await fresh();await request(open.id,undefined,409);
      const done=await fresh();await service.ejecutar(done.id);await request(done.id,undefined,409);
      const before=await snapshot(),calls=authFixture.operationRequestHeaders().length;
      await assert.rejects(service.resolverAborto(open.id),error=>error.getStatus()===409);
      await assert.rejects(service.resolverAborto(done.id),error=>error.getStatus()===409);
      assert.deepEqual(await snapshot(),before);assert.equal(authFixture.operationRequestHeaders().length,calls);
    });
    await check('Resolucion aborto: ausencia explicita deja cancelacion durable con UUID original sin crear identidad o perfil',async()=>{
      const item=await aborted(),initial=await coord.consultar(item.id),before=await identities(),nativeBefore=await business();
      assert.equal(await client.consultar(initial.operacionAuthId),null);
      const result=await service.resolverAborto(item.id);settled=item;
      assert.equal(result.estadoAuth,'CANCELADA');assert.equal(result.resolucionAuthPendiente,false);assert.equal(result.estadoNativo,'PREPARADA');
      assert.equal(result.operacionAuthId,initial.operacionAuthId);assert.equal(result.huellaComando,initial.huellaComando);
      const receipt=await client.consultar(initial.operacionAuthId);assert.equal(receipt.estado,'CANCELADA');assert.equal(receipt.identidadAplicada,false);
      assert.deepEqual(await identities(),before);assert.deepEqual(await business(),nativeBefore);
      await assert.rejects(client.aplicar(initial.operacionAuthId,item.command),error=>error.getStatus()===409);
      assert.equal((await client.registrar(initial.operacionAuthId,initial.huellaComando)).estado,'CANCELADA');
    });
    await check('Resolucion aborto: registro existente se cancela; recibo y prueba permanecen estables al reanudar sin HTTP',async()=>{
      const item=await fresh();await coord.registrarEnAuth(item.id);await service.abortar(item.id,'CANCELACION_SOLICITUD');
      const proof=await service.pruebaAborto(item.id),prior=await coord.consultar(item.id),before=await identities();
      const resolved=await service.resolverAborto(item.id),after=await coord.consultar(item.id);
      assert.equal(resolved.estadoAuth,'CANCELADA');assert.equal(after.reciboAuth.registradaEn,prior.reciboAuth.registradaEn);
      assert.equal(after.reciboAuth.huellaComando,prior.huellaComando);assert.deepEqual(await service.pruebaAborto(item.id),proof);
      const calls=authFixture.operationRequestHeaders().length;assert.deepEqual(await execution().resolverAborto(item.id),resolved);
      assert.equal(authFixture.operationRequestHeaders().length,calls);assert.deepEqual(await identities(),before);
    });
    await check('Resolucion aborto: solicitudes concurrentes convergen sin reactivar ni duplicar la intencion',async()=>{
      const item=await aborted(),before=await identities(),results=await Promise.allSettled(Array.from({length:6},()=>execution().resolverAborto(item.id)));
      assert(results.some(result=>result.status==='fulfilled'));
      for(const result of results)if(result.status==='rejected')assert.equal(result.reason.getStatus(),503);
      const result=await execution().resolverAborto(item.id);assert.equal(result.estadoAuth,'CANCELADA');assert.equal(result.resolucionAuthPendiente,false);
      assert.equal((await ds.query('SELECT count(*) FROM rund.identidad_operacion WHERE intencion_id=$1',[item.id]))[0].count,'1');
      assert.deepEqual(await identities(),before);
    });
    await check('Resolucion aborto: registro confirmado con respuesta perdida se recupera por GET y conserva el mismo ID',async()=>{
      const item=await aborted(),before=await identities(),local=await coord.consultar(item.id);authFixture.dropNextOperationResponse();
      await assert.rejects(service.resolverAborto(item.id),error=>error.getStatus()===503);
      assert.equal((await coord.consultar(item.id)).estado,'PREPARADA');assert.equal((await client.consultar(local.operacionAuthId)).estado,'REGISTRADA');
      assert.equal((await execution().resolverAborto(item.id)).estadoAuth,'CANCELADA');assert.deepEqual(await identities(),before);
    });
    await check('Resolucion aborto: cancelacion confirmada con respuesta perdida se recupera sin un segundo POST cancelar',async()=>{
      const item=await fresh();await coord.registrarEnAuth(item.id);await service.abortar(item.id,'FALLO_NEGOCIO');
      const before=await identities(),local=await coord.consultar(item.id);authFixture.dropNextCancelResponse();
      await assert.rejects(service.resolverAborto(item.id),error=>error.getStatus()===503);const calls=cancellations;
      assert.equal((await coord.consultar(item.id)).estado,'AUTH_REGISTRADA');assert.equal((await client.consultar(local.operacionAuthId)).estado,'CANCELADA');
      assert.equal((await execution().resolverAborto(item.id)).estadoAuth,'CANCELADA');assert.equal(cancellations,calls);assert.deepEqual(await identities(),before);
    });
    await check('Resolucion aborto: fallo local despues de cancelar conserva recibo Auth y se recupera sin repetir escritura',async()=>{
      const item=await fresh();await coord.registrarEnAuth(item.id);await service.abortar(item.id,'FALLO_NEGOCIO');const before=await identities();
      await trigger('identidad_operacion','UPDATE',async()=>{await assert.rejects(service.resolverAborto(item.id),/FALLO FICTICIO NATIVO/);});
      const calls=cancellations;assert.equal((await coord.consultar(item.id)).estado,'AUTH_REGISTRADA');
      assert.equal((await execution().resolverAborto(item.id)).estadoAuth,'CANCELADA');assert.equal(cancellations,calls);assert.deepEqual(await identities(),before);
    });
    await check('Resolucion aborto: registro tardio en vuelo no reactiva una cancelacion ya confirmada',async()=>{
      const item=await fresh(),lateClient=new AuthIdentityOperationClient(),register=lateClient.registrar.bind(lateClient);let release,observed;
      const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{observed=resolve;});
      lateClient.registrar=async(...args)=>{const receipt=await register(...args);observed();await gate;return receipt;};
      const lateCoord=new AuthIdentityCoordinationService(ds,lateClient),running=lateCoord.registrarEnAuth(item.id).then(value=>({value}),error=>({error}));
      try {
        await Promise.race([seen,running.then(result=>{throw result.error||new Error('No hubo registro en vuelo');})]);
        await service.abortar(item.id,'FALLO_NEGOCIO');assert.equal((await service.resolverAborto(item.id)).estadoAuth,'CANCELADA');
        release();const result=await running;if(result.error)throw result.error;assert.equal(result.value.estado,'CANCELADA');
        assert.equal((await coord.consultar(item.id)).estado,'CANCELADA');
      }finally{release();await running;}
    });
    await check('Resolucion aborto: Auth ya aplicado queda pendiente sin borrar o modificar persona, cuenta o roles',async()=>{
      const item=await applied(await prepared());await service.abortar(item.id,'FALLO_NEGOCIO');
      const before=await identities(),nativeBefore=await business(),calls=cancellations,result=await service.resolverAborto(item.id);
      assert.equal(result.estadoAuth,'AUTH_APLICADA');assert.equal(result.resolucionAuthPendiente,true);assert.equal(result.estadoNativo,'PREPARADA');
      assert.equal(cancellations,calls);assert.deepEqual(await identities(),before);assert.deepEqual(await business(),nativeBefore);
      const proof=(await request(item.id)).body.pruebaAborto;assert.equal(proof.operacionAuthId,result.operacionAuthId);
    });
    await check('Resolucion aborto: aplicacion Auth en vuelo puede ganar pero no produce cancelacion falsa o perfil nativo',async()=>{
      const item=await fresh();let release,observed;
      const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{observed=resolve;});
      authFixture.setApplyResultHook(async()=>{observed();await gate;});
      const running=service.ejecutar(item.id).then(value=>({value}),error=>({error}));
      try {
        await Promise.race([seen,running.then(result=>{throw result.error||new Error('No hubo aplicacion en vuelo');})]);
        await service.abortar(item.id,'FALLO_NEGOCIO');const before=await identities(),result=await service.resolverAborto(item.id);
        assert.equal(result.estadoAuth,'AUTH_APLICADA');assert.equal(result.resolucionAuthPendiente,true);release();
        assert.equal((await running).error.getStatus(),409);assert.deepEqual(await identities(),before);
        assert.equal((await ds.query('SELECT count(*) FROM rund."Docente" WHERE "personaId"=$1',[(await coord.consultar(item.id)).reciboAuth.resultado.personaId]))[0].count,'0');
      }finally{release();authFixture.setApplyResultHook(undefined);await running;}
    });
    await check('Resolucion aborto: aplicar y cancelar compiten con un solo estado terminal y sin confirmacion nativa',async()=>{
      for(let index=0;index<4;index++) {
        const item=await fresh();await coord.registrarEnAuth(item.id);await service.abortar(item.id,'FALLO_NEGOCIO');
        const local=await coord.consultar(item.id),before=await identities();
        const [application,resolution]=await Promise.allSettled([client.aplicar(local.operacionAuthId,item.command),service.resolverAborto(item.id)]);
        assert.equal(resolution.status,'fulfilled');const result=resolution.value;
        const receipt=await client.consultar(local.operacionAuthId);assert.equal(result.estadoNativo,'PREPARADA');
        if(receipt.estado==='CANCELADA') {
          assert.equal(application.status,'rejected');assert.equal(application.reason.getStatus(),409);
          assert.equal(result.estadoAuth,'CANCELADA');assert.equal(result.resolucionAuthPendiente,false);assert.deepEqual(await identities(),before);
        }else {
          assert.equal(receipt.estado,'APLICADA');assert.equal(application.status,'fulfilled');
          assert.equal(result.estadoAuth,'AUTH_APLICADA');assert.equal(result.resolucionAuthPendiente,true);
        }
      }
    });
    await check('Resolucion aborto: 409 real al cancelar tras aplicacion entre GET y POST exige reconciliar el recibo aplicado',async()=>{
      const item=await fresh();await coord.registrarEnAuth(item.id);await service.abortar(item.id,'FALLO_NEGOCIO');
      const original=client.cancelar;
      client.cancelar=async(...args)=>{await client.aplicar(args[0],item.command);return original(...args);};
      try {
        const result=await service.resolverAborto(item.id);assert.equal(result.estadoAuth,'AUTH_APLICADA');assert.equal(result.resolucionAuthPendiente,true);
        assert.equal(result.estadoNativo,'PREPARADA');assert.equal((await coord.consultar(item.id)).reciboAuth.estado,'APLICADA');
      }finally{client.cancelar=original;}
    });
    await check('Resolucion aborto: caida, 404 y DTO parcial no crean una cancelacion o cambian la decision',async()=>{
      const item=await aborted(),before=await snapshot(),authBefore=await identities(),local=await coord.consultar(item.id);
      try{for(const mode of ['unavailable','missing','partial']) {authFixture.setOperationMode(mode);
        await assert.rejects(service.resolverAborto(item.id),error=>error.getStatus()===503);await request(item.id);}}
      finally{authFixture.setOperationMode('normal');}
      assert.equal(await client.consultar(local.operacionAuthId),null);assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),authBefore);
    });
    await check('Resolucion aborto: huella remota ajena se rechaza sin cancelar ni aplicar identidad',async()=>{
      const item=await aborted(),local=await coord.consultar(item.id);await client.registrar(local.operacionAuthId,'f'.repeat(64));
      const before=await snapshot(),authBefore=await identities(),calls=cancellations;
      await assert.rejects(service.resolverAborto(item.id),error=>error.getStatus()===409);assert.equal(cancellations,calls);
      assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),authBefore);
    });
    await check('Resolucion aborto: esquema Auth ausente, sin privilegios de identidad y flujos activos conservan tablas preparatorias vacias',async()=>{
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      assert(await authFixture.operationHasNoIdentityPrivileges());
      for(const table of ['identidad_operacion','identidad_contexto_nativo','identidad_ejecucion'])
        assert.equal((await database.query('SELECT count(*) FROM rund.'+table)).rows[0].count,'0');
      const proof=await service.pruebaAborto(settled.id);assert.equal(proof.decisionNativa,'ABORTADA');
      assert.equal((await service.consultar(settled.id)).resolucionAuthPendiente,false);
      assert(authFixture.operationRequestHeaders().slice(operationHeadersStart).every(headers=>headers.tokenMatches&&!headers.authorizationForwarded&&!headers.cookieForwarded));
    });
  }finally{
    if(app)await app.close();if(savedToken===undefined)delete process.env.INTERNAL_SERVICE_TOKEN;else process.env.INTERNAL_SERVICE_TOKEN=savedToken;
  }
};
