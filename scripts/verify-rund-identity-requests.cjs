/* Solicitudes manuales de servidor; no publica rutas de negocio ni activa el escritor remoto. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyRequests(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service'),compiled=p=>require(path.join(rund,'dist',p));
  const {AuthIdentityRequestService}=compiled('common/auth-identity-request.service'),{AuthIdentityExecutionService}=compiled('common/auth-identity-execution.service');
  const {normalizeBancoDocentePayload,normalizePhoneForAuth}=compiled('modules/banco-docentes/banco-docentes.service');
  const {nativeBusinessContext,nativeBusinessFingerprint}=compiled('modules/banco-docentes/rund-native-business-context');
  const {admin,ds,coord,native,client,row,authFixture,database,snapshot,identities,trigger}=ctx;
  const execution=new AuthIdentityExecutionService(ds,coord,native,client),service=new AuthIdentityRequestService(ds,execution);
  const business=async()=>Object.fromEntries(Object.entries(await snapshot()).filter(([table])=>!table.startsWith('identidad_')));
  const data=()=>{
    const actor=randomUUID(),request=randomUUID(),marker=BigInt('0x'+randomUUID().replace(/-/g,'').slice(0,12)).toString();
    const raw={...row,DOCUMENTO_IDENTIDAD:'8'+marker,CORREO_INSTITUCIONAL:'modal-'+marker+'@esap.edu.co',
      TERRITORIAL:'Territorial Ficticia',canal_origen:'MODAL',cargadoPor:actor};
    const payload=normalizeBancoDocentePayload(raw),emailFinal=payload.correoInstitucional,phoneFinal=normalizePhoneForAuth(payload.telefono),finalFullName=payload.fullName;
    const command={version:1,actorId:actor,payload:{documentNumber:payload.documentNumber,documentType:payload.documentType,primer_nombre:payload.primer_nombre||null,
      primer_apellido:payload.primer_apellido||null,segundo_apellido:payload.segundo_apellido||null,genero:payload.genero,fechaNacimiento:payload.fechaNacimiento.toISOString().slice(0,10)},
      options:{relaxValidation:false,preserveTerritorial:false},territorial:{id:'999'},emailFinal,phoneFinal,finalFullName};
    const input={payload,rawPayload:raw,options:{rejectExisting:true,audit:{actorId:actor,canalOrigen:'MODAL',accion:'CREAR'}},
      territorial:{id:'999',nombre:'Territorial Ficticia'},emailFinal,phoneFinal,finalFullName};
    return {actor,request,command,input};
  };
  const prepare=item=>service.preparar(item.request,item.actor,item.command,item.input);
  const rawRequest=async item=>(await admin.query('SELECT * FROM rund.identidad_solicitud WHERE actor_id=$1 AND solicitud_id=$2',[item.actor,item.request])).rows[0];
  let known,knownResult;
  await check('Solicitud identidad: datos manuales invalidos y actor ajeno no reservan IDs ni hacen HTTP',async()=>{
    const before=await snapshot(),calls=authFixture.operationRequestHeaders().length,item=data();
    await assert.rejects(service.preparar(item.request,randomUUID(),item.command,item.input),error=>error.getStatus()===400);
    for(const change of [raw=>{raw.CORREO_INSTITUCIONAL='persona@example.test';},raw=>{delete raw.TITULO_PREGRADO;},raw=>{raw.HORAS_PTA='NO';}]){
      const invalid=data();change(invalid.input.rawPayload);await assert.rejects(prepare(invalid),error=>error.getStatus()===400);
    }
    for(const field of ['genero','fechaNacimiento','primer_nombre']){
      const invalid=data();invalid.command.payload[field]=field==='fechaNacimiento'?'1990-01-01':'OTRO';
      await assert.rejects(prepare(invalid),error=>error.getStatus()===400);
    }
    assert.deepEqual(await snapshot(),before);assert.equal(authFixture.operationRequestHeaders().length,calls);
  });
  await check('Solicitud identidad: reserva estable antecede al contexto y no aplica identidad, perfil o correo',async()=>{
    known=data();const before=await business(),authBefore=await identities(),calls=authFixture.operationRequestHeaders().length;
    knownResult=await prepare(known);assert.notEqual(knownResult.intencionId,known.request);assert.equal(knownResult.preparacion,'LISTA');
    assert.equal((await execution.consultar(knownResult.intencionId)).estadoAuth,'PREPARADA');
    assert.deepEqual(await business(),before);assert.deepEqual(await identities(),authBefore);assert.equal(authFixture.operationRequestHeaders().length,calls);
    assert.equal((await rawRequest(known)).huella_contexto,nativeBusinessFingerprint(nativeBusinessContext(known.command,known.input)));
  });
  await check('Solicitud identidad: seis solicitudes simultaneas convergen en una intencion, UUID Auth y fecha',async()=>{
    const item=data(),results=await Promise.all(Array.from({length:6},()=>prepare(item)));results.forEach(result=>assert.deepEqual(result,results[0]));
    const rows=(await admin.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1',[results[0].intencionId])).rows;assert.equal(rows.length,1);
    assert.deepEqual(await prepare(item),results[0]);
  });
  await check('Solicitud identidad: mismo formulario con otra solicitud y mismo UUID con otro actor no comparten intencion',async()=>{
    const different=await prepare({...known,request:randomUUID()});assert.notEqual(different.intencionId,knownResult.intencionId);
    const other=data();other.request=known.request;const result=await prepare(other);assert.notEqual(result.intencionId,knownResult.intencionId);
    await assert.rejects(service.consultar(known.request,randomUUID()),error=>error.getStatus()===404);
  });
  await check('Solicitud identidad: reutilizar solicitud con otro contenido produce 409 sin reemplazar contexto o IDs',async()=>{
    const before=await snapshot(),changed={...known,input:{...known.input,rawPayload:{...known.input.rawPayload,HORAS_PTA:100}}};
    changed.input.payload=normalizeBancoDocentePayload(changed.input.rawPayload);
    await assert.rejects(prepare(changed),error=>error.getStatus()===409);assert.deepEqual(await snapshot(),before);
  });
  await check('Solicitud identidad: fallo al reservar no deja journal ni contexto o efectos Auth',async()=>{
    const item=data(),before=await snapshot(),authBefore=await identities();
    await trigger('identidad_solicitud','INSERT',async()=>{await assert.rejects(prepare(item),/FALLO FICTICIO NATIVO/);});
    assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),authBefore);
  });
  await check('Solicitud identidad: fallo de contexto conserva reserva y journal; otra instancia completa el mismo ID',async()=>{
    const item=data();await trigger('identidad_contexto_nativo','INSERT',async()=>{await assert.rejects(prepare(item),/FALLO FICTICIO NATIVO/);});
    const stored=await rawRequest(item),local=await service.consultar(item.request,item.actor);assert.equal(local.preparacion,'PENDIENTE');
    assert.equal((await coord.consultar(stored.intencion_id)).estado,'PREPARADA');
    const retry=await new AuthIdentityRequestService(ds,execution).preparar(item.request,item.actor,item.command,item.input);
    assert.equal(retry.intencionId,stored.intencion_id);assert.equal(retry.preparacion,'LISTA');assert.deepEqual(await rawRequest(item),stored);
  });
  await check('Solicitud identidad: respuesta HTTP perdida despues de preparar recupera IDs y fechas sin nuevos efectos',async()=>{
    const item=data();let server;
    try{server=http.createServer(async(req,res)=>{try{await prepare(item);res.destroy();}catch{res.writeHead(500);res.end();}});
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      await assert.rejects(fetch('http://127.0.0.1:'+server.address().port,{method:'POST'}));
      const stored=await rawRequest(item),before=await snapshot();await prepare(item);
      assert.deepEqual(await rawRequest(item),stored);assert.deepEqual(await snapshot(),before);
    }finally{if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
  });
  await check('Solicitud identidad: ejecucion explicitamente invocada usa el vinculo y conserva recibo al preparar de nuevo',async()=>{
    let result;try{result=await execution.ejecutar(knownResult.intencionId);}catch(error){throw new Error(error.message+' '+JSON.stringify(authFixture.lastApplyError()));}
    assert.equal(result.estadoNativo,'CONFIRMADA');
    const before=await snapshot(),authBefore=await identities(),calls=authFixture.operationRequestHeaders().length;
    assert.deepEqual(await prepare(known),knownResult);assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),authBefore);
    assert.equal(authFixture.operationRequestHeaders().length,calls);assert.equal(result.resultadoNativo.welcomeEmail.sent,false);
  });
  await check('Solicitud identidad: reintentar preparacion no reactiva un aborto ni concede permiso de ejecucion',async()=>{
    const item=data(),result=await prepare(item);await execution.abortar(result.intencionId,'CANCELACION_SOLICITUD');await prepare(item);
    assert.equal((await execution.consultar(result.intencionId)).decisionNativa,'ABORTADA');await assert.rejects(execution.ejecutar(result.intencionId),error=>error.getStatus()===409);
  });
  await check('Solicitud identidad: SQL protege reserva, comando y contexto y 013 repetida conserva registros',async()=>{
    for(const sql of ['DELETE FROM rund.identidad_solicitud WHERE actor_id=$1','UPDATE rund.identidad_solicitud SET intencion_id=gen_random_uuid() WHERE actor_id=$1'])
      await assert.rejects(admin.query(sql,[known.actor]),/inmutable/);
    await assert.rejects(admin.query(`INSERT INTO rund.identidad_solicitud(actor_id,solicitud_id,intencion_id,huella_comando,huella_contexto)
      VALUES ($1,$2,$3,$4,$5)`,[randomUUID(),randomUUID(),knownResult.intencionId,knownResult.huellaComando,knownResult.huellaContexto]),/intencion anterior/);
    const item=data();await trigger('identidad_operacion','INSERT',async()=>{await assert.rejects(prepare(item),/FALLO FICTICIO NATIVO/);});
    const reserved=await rawRequest(item),foreign={...item.command,finalFullName:'OTRO NOMBRE'};
    await assert.rejects(coord.preparar(reserved.intencion_id,foreign),/Comando ajeno/);
    await coord.preparar(reserved.intencion_id,item.command);
    await assert.rejects(native.preparar(reserved.intencion_id,item.command,{...item.input,rawPayload:{...item.input.rawPayload,HORAS_PTA:50},payload:{...item.input.payload,horasAsignables:50}}),/Contexto ajeno/);
    await prepare(item);const before=await snapshot();await admin.query(fs.readFileSync(path.join(rund,'db/migrations/013_rund_identidad_solicitud.sql'),'utf8'));
    assert.deepEqual(await snapshot(),before);
  });
  await check('Solicitud identidad: tabla solo propia sin PII o credenciales y flujos activos sin reservar solicitudes',async()=>{
    assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);assert(await authFixture.applyHasNoRundPrivileges());
    const records=(await admin.query('SELECT * FROM rund.identidad_solicitud')).rows;assert(records.length>0);
    assert(records.every(record=>Object.keys(record).length===9&&record.huella_formulario===null&&record.entrada_manual===null));assert(!/documento|correo|@|password|token|comandoAuth/i.test(JSON.stringify(records)));
    assert.equal((await database.query('SELECT count(*) FROM rund.identidad_solicitud')).rows[0].count,'0');
  });
};
