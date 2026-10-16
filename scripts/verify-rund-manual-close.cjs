/* Cierre manual por HTTP/JWT real y Auth propietario dentro del clúster ficticio. */
const assert=require('node:assert/strict'),path=require('node:path'),{randomUUID}=require('node:crypto');
module.exports=async function verifyClose(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,ds,coord,native,client,authFixture,database,snapshot,identities,trigger,actor,role,roleId,viewRole,token,send,capture,form,
    execution,compensation,known,jwt,secret,dropCloseResponse}=ctx;
  const rund=path.join(__dirname,'../backend/rund-service'),dep=name=>require(path.join(rund,'node_modules',name));
  const {AuthIdentityAbortProofController,AuthIdentityExecutionService}=require(path.join(rund,'dist/common/auth-identity-execution.service'));
  const {InternalServiceGuard}=require(path.join(rund,'dist/internal/internal-service.guard'));
  const close=(id,options={})=>send(id,'cerrar',{body:{},...options}),status=(id,options={})=>send(id,'cierre',{method:'GET',...options});
  const fresh=async(overrides={})=>{const id=randomUUID(),raw={...form(),...overrides};await send(id,'preparar',{body:{formulario:raw}});return {id,raw,row:await capture(id)};};
  const applied=async item=>{await coord.registrarEnAuth(item.row.intencion_id);const local=await coord.consultar(item.row.intencion_id);
    await client.aplicar(local.operacionAuthId,item.row.entrada_manual.contexto.comandoAuth);await coord.reconciliar(item.row.intencion_id);return item;};
  const ownerResolution=async item=>(await database.query('SELECT * FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[(await coord.consultar(item.row.intencion_id)).operacionAuthId])).rows[0];
  const grant=active=>database.query('UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1',[roleId,active]);
  const originalRegister=coord.registrarEnAuth.bind(coord),originalReconcile=compensation.reconciliar.bind(compensation),originalCancel=client.cancelar.bind(client);
  const internalToken=process.env.AUTH_INTERNAL_SERVICE_TOKEN,saved=process.env.INTERNAL_SERVICE_TOKEN;
  let proof,proofCalls=0,done;
  try{
    process.env.INTERNAL_SERVICE_TOKEN=internalToken;
    const {Module}=dep('@nestjs/common'),{NestFactory}=dep('@nestjs/core');class ProofFixture{}
    Module({controllers:[AuthIdentityAbortProofController],providers:[InternalServiceGuard,{provide:AuthIdentityExecutionService,useValue:execution}]})(ProofFixture);
    proof=await NestFactory.create(ProofFixture,{logger:false,abortOnError:false});
    proof.use((req,_res,next)=>{proofCalls++;assert.equal(req.headers['x-internal-service-token'],internalToken);assert.equal(req.headers.authorization,undefined);assert.equal(req.headers.cookie,undefined);next();});
    await proof.listen(0,'127.0.0.1');authFixture.setAbortProofUrl(await proof.getUrl());authFixture.setCompensationEnabled(true);
    await check('Cierre manual: JWT vigente y rol o permiso; body y otro actor no eligen intención o autoridad',async()=>{
      const item=await fresh(),before=await snapshot(),noExpiry=dep('jsonwebtoken').sign({sub:actor,roles:[role]},secret);
      for(const bearer of [null,'INVALIDO',noExpiry])await close(item.id,{bearer,status:401});
      await close(item.id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      await close(item.id,{body:{intencionId:known},status:400});await close(item.id,{bearer:token(randomUUID()),status:404});assert.deepEqual(await snapshot(),before);
    });
    await check('Cierre manual: reserva no publicada se aborta y cancela con UUID estable; replay y GET no mutan Auth',async()=>{
      const item=await fresh(),before=await identities();const result=await close(item.id);done={...item,receipt:result.body};
      assert.equal(result.body.estado,'CERRADA');assert.equal(result.body.estadoAuth,'CANCELADA');assert(result.body.puedeIniciarOtra);
      assert.equal(result.body.decisionNativa,'ABORTADA');assert.equal(result.response.headers.get('cache-control'),'private, no-store');assert.equal(Object.keys(result.body).length,9);
      const calls=authFixture.operationRequestHeaders().length;assert.deepEqual((await close(item.id)).body,result.body);assert.deepEqual((await status(item.id)).body,result.body);
      assert.equal(authFixture.operationRequestHeaders().length,calls);assert.deepEqual(await identities(),before);
      await send(item.id,'ejecutar',{body:{},status:409});assert(!/formulario|personaId|usuarioId|@|huella|comandoAuth|password|token/i.test(JSON.stringify(result.body)));
    });
    await check('Cierre manual: journal parcial completa solo el contexto servidor y cierra sin prevalidación Auth de escritura',async()=>{
      const id=randomUUID();await trigger('identidad_contexto_nativo','INSERT',async()=>{await send(id,'preparar',{body:{formulario:form()},status:503});});
      const row=await capture(id);assert(row);assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_contexto_nativo WHERE intencion_id=$1',[row.intencion_id])).rows[0].count,'0');
      const calls=authFixture.prevalidationRequestHeaders().length;authFixture.setPrevalidationMode('unavailable');
      try{assert.equal((await close(id)).body.estado,'CERRADA');}finally{authFixture.setPrevalidationMode('normal');}
      assert.equal(authFixture.prevalidationRequestHeaders().length,calls);
    });
    await check('Cierre manual: cierres concurrentes convergen sobre la misma cancelación sin confirmar perfil',async()=>{
      const item=await fresh(),results=await Promise.all(Array.from({length:5},()=>close(item.id)));
      for(const result of results)assert.deepEqual(result.body,results[0].body);assert.equal(results[0].body.estado,'CERRADA');
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_operacion WHERE intencion_id=$1',[item.row.intencion_id])).rows[0].count,'1');
      await assert.rejects(native.confirmarNativo(item.row.intencion_id));
    });
    await check('Cierre manual: identidad existente aplicada se compensa y conserva el hecho aplicado y el perfil sin confirmar',async()=>{
      const seed=await applied(await fresh()),before=await identities();
      const item=await applied(await fresh({DOCUMENTO_IDENTIDAD:seed.raw.DOCUMENTO_IDENTIDAD,CORREO_INSTITUCIONAL:'close-existing-'+randomUUID()+'@esap.edu.co',NOMBRE_COMPLETO:'DOCENTE CAMBIO CIERRE'}));
      const result=await close(item.id);assert.equal(result.body.estado,'CERRADA');assert.equal(result.body.resolucionAuth,'COMPENSADA');assert(result.body.puedeIniciarOtra);
      assert.equal(result.body.estadoAuth,'AUTH_APLICADA');assert.deepEqual(await identities(),before);await assert.rejects(native.confirmarNativo(item.row.intencion_id));
    });
    await check('Cierre manual: alta aplicada queda en revisión durable y no se libera o compensa otra vez',async()=>{
      const item=await applied(await fresh()),before=await identities(),result=await close(item.id);
      assert.equal(result.body.estado,'REVISION_REQUERIDA');assert.equal(result.body.puedeIniciarOtra,false);assert(result.body.casoRevisionId);
      const caseRow=(await admin.query('SELECT * FROM rund.identidad_revision WHERE caso_id=$1',[result.body.casoRevisionId])).rows[0];assert.equal(caseRow.estado,'PENDIENTE');
      const calls=proofCalls;assert.deepEqual((await close(item.id)).body,result.body);assert.deepEqual((await status(item.id)).body,result.body);assert.equal(proofCalls,calls);
      assert.deepEqual(await identities(),before);await send(item.id,'abandonar',{body:{},status:409});
    });
    await check('Cierre manual: bandera de compensación apagada conserva aborto pendiente y requiere retry explícito',async()=>{
      const item=await applied(await fresh());authFixture.setCompensationEnabled(false);try{await close(item.id,{status:503});}finally{authFixture.setCompensationEnabled(true);}
      const current=(await status(item.id)).body;assert.equal(current.estado,'ABORTADA');assert.equal(current.puedeIniciarOtra,false);assert.equal(await ownerResolution(item),undefined);
      assert.equal((await close(item.id)).body.estado,'REVISION_REQUERIDA');
    });
    await check('Cierre manual: revocación tras registrar detiene cancelación y otra sesión recupera el mismo aborto',async()=>{
      const item=await fresh();let cancels=0;client.cancelar=async(...args)=>{cancels++;return originalCancel(...args);};
      coord.registrarEnAuth=async(...args)=>{const result=await originalRegister(...args);await grant(false);return result;};
      try{await close(item.id,{status:403});assert.equal(cancels,0);}finally{coord.registrarEnAuth=originalRegister;client.cancelar=originalCancel;await grant(true);}
      assert.equal((await status(item.id)).body.estado,'ABORTADA');assert.equal((await close(item.id)).body.estado,'CERRADA');
    });
    await check('Cierre manual: revocación tras consultar resolución impide POST de compensación',async()=>{
      const item=await applied(await fresh());compensation.reconciliar=async(...args)=>{const result=await originalReconcile(...args);await grant(false);return result;};
      try{await close(item.id,{status:403});assert.equal(await ownerResolution(item),undefined);}finally{compensation.reconciliar=originalReconcile;await grant(true);}
      assert.equal((await close(item.id)).body.estado,'REVISION_REQUERIDA');
    });
    await check('Cierre manual: aplicar gana la carrera de cancelación y exige revisión sin un cierre falso',async()=>{
      const item=await fresh();client.cancelar=async(op,hash)=>{await client.aplicar(op,item.row.entrada_manual.contexto.comandoAuth);return originalCancel(op,hash);};
      try{const result=await close(item.id);assert.equal(result.body.estado,'REVISION_REQUERIDA');assert.equal(result.body.puedeIniciarOtra,false);}finally{client.cancelar=originalCancel;}
      await assert.rejects(native.confirmarNativo(item.row.intencion_id));
    });
    await check('Cierre manual: cancelación Auth con respuesta perdida se concilia sin liberar por el error',async()=>{
      const item=await fresh();authFixture.dropNextCancelResponse();await close(item.id,{status:503});
      assert.equal((await status(item.id)).body.estado,'ABORTADA');assert.equal((await close(item.id)).body.estado,'CERRADA');
    });
    await check('Cierre manual: compensación con respuesta perdida se recupera por GET propietario sin repetir efectos',async()=>{
      const item=await applied(await fresh());authFixture.dropNextCompensationResponse();await close(item.id,{status:503});const owner=await ownerResolution(item);assert(owner);
      assert.equal((await status(item.id)).body.estado,'ABORTADA');const before=await identities(),result=await close(item.id);
      assert.equal(result.body.estado,'REVISION_REQUERIDA');assert.deepEqual(await identities(),before);
    });
    await check('Cierre manual: respuesta final perdida se recupera por GET y replay sin nueva operación',async()=>{
      const item=await fresh();dropCloseResponse();await assert.rejects(close(item.id));const result=await status(item.id);assert.equal(result.body.estado,'CERRADA');
      const calls=authFixture.operationRequestHeaders().length;assert.deepEqual((await close(item.id)).body,result.body);assert.equal(authFixture.operationRequestHeaders().length,calls);
    });
    await check('Cierre manual: sesión vencida durante registro conserva aborto y otra sesión puede cancelar',async()=>{
      const item=await fresh(),bearer=jwt.sign({sub:actor,roles:[role]},{expiresIn:5});
      coord.registrarEnAuth=async(...args)=>{const result=await originalRegister(...args);await new Promise(resolve=>setTimeout(resolve,6000));return result;};
      try{await close(item.id,{bearer,status:401});}finally{coord.registrarEnAuth=originalRegister;}
      assert.equal((await status(item.id)).body.estado,'ABORTADA');assert.equal((await close(item.id)).body.estado,'CERRADA');
    });
    await check('Cierre manual: commit nativo y cierre compiten; commit confirmado no se revierte',async()=>{
      const item=await applied(await fresh());const [nativeResult,closed]=await Promise.all([native.confirmarNativo(item.row.intencion_id).then(value=>({value}),error=>({error})),close(item.id,{status:[200,409]})]);
      const current=(await status(item.id)).body;
      if(nativeResult.value){assert.equal(current.estado,'CONFIRMADA');assert.equal(closed.response.status,409);assert.equal(await ownerResolution(item),undefined);}
      else{assert.equal(current.estado,'REVISION_REQUERIDA');assert.equal(closed.response.status,200);}
      assert.equal(current.puedeIniciarOtra,false);
    });
    await check('Cierre manual: GET sin escritura, otro actor 404, permiso revocado 403 y transporte interno sin JWT o cookies',async()=>{
      const before=await snapshot(),headersStart=authFixture.operationRequestHeaders().length;assert.deepEqual((await status(done.id)).body,done.receipt);assert.deepEqual(await snapshot(),before);
      await status(done.id,{bearer:token(randomUUID()),status:404});await grant(false);try{await status(done.id,{status:403});}finally{await grant(true);}
      assert.equal(authFixture.operationRequestHeaders().length,headersStart);assert(proofCalls>0);assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
    });
  }finally{
    coord.registrarEnAuth=originalRegister;compensation.reconciliar=originalReconcile;client.cancelar=originalCancel;await grant(true);
    authFixture.setCompensationEnabled(false);authFixture.setAbortProofUrl(undefined);authFixture.setPrevalidationMode('normal');
    if(proof)await proof.close();if(saved===undefined)delete process.env.INTERNAL_SERVICE_TOKEN;else process.env.INTERNAL_SERVICE_TOKEN=saved;
  }
};
