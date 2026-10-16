/* Ejecuta/reconcilia con Auth real; usa la base RUND ficticia preparada por verify-rund-native-commit. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyExecution(pgConfig,runtime,check,ctx) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {AuthIdentityExecutionService}=require(path.join(rund,'dist/common/auth-identity-execution.service'));
  const {AuthIdentityOperationClient}=require(path.join(rund,'dist/common/auth-identity-operation.client'));
  const {admin,ds,coord,native,authFixture,data,prepared,applied,snapshot,identities,trigger,known,confirmed,database}=ctx;
  const client=new AuthIdentityOperationClient(),apply=client.aplicar.bind(client);let applyCalls=0;
  client.aplicar=async(...args)=>{applyCalls++;return apply(...args);};
  const execution=()=>new AuthIdentityExecutionService(ds,coord,native,client);
  const service=execution();
  const fresh=async()=>{const item=data();await service.preparar(item.id,item.command,item.input);return item;};
  const business=async()=>Object.fromEntries(Object.entries(await snapshot()).filter(([table])=>!table.startsWith('identidad_')));
  const profileCount=async id=>{const local=await coord.consultar(id);return Number((await admin.query('SELECT count(*) FROM rund."Docente" WHERE "personaId"=$1',[local.reciboAuth.resultado.personaId])).rows[0].count);};
  let completed;
  await check('Ejecución identidad: preparar conserva contexto y decisión antes de HTTP; inputs inválidos no crean ejecución',async()=>{
    const item=data(),count=authFixture.operationRequestHeaders().length;
    const results=await Promise.all(Array.from({length:6},()=>service.preparar(item.id,item.command,item.input)));results.forEach(result=>assert.deepEqual(result,results[0]));
    assert.equal(results[0].decisionNativa,'EN_CURSO');assert.equal(authFixture.operationRequestHeaders().length,count);
    await assert.rejects(service.abortar(item.id,'DETALLE NO ADMITIDO'),error=>error.getStatus()===400);
    await assert.rejects(service.ejecutar(randomUUID()),error=>error.getStatus()===404);
  });
  await check('Ejecución identidad: orquesta consulta, registro, aplicación Auth y commit nativo desde contexto congelado',async()=>{
    const item=await fresh();completed=await service.ejecutar(item.id);assert.equal(completed.estadoNativo,'CONFIRMADA');assert.equal(completed.estadoAuth,'AUTH_APLICADA');
    assert.equal(completed.decisionNativa,'EN_CURSO');assert.equal(completed.resultadoNativo.action,'insert');assert.equal(await profileCount(item.id),1);
    const count=authFixture.operationRequestHeaders().length,calls=applyCalls,before=await snapshot();
    assert.deepEqual(await execution().ejecutar(item.id),completed);assert.equal(applyCalls,calls);assert.equal(authFixture.operationRequestHeaders().length,count);assert.deepEqual(await snapshot(),before);
  });
  await check('Ejecución identidad: solicitudes concurrentes convergen por el mismo ID sin duplicar perfil o auditoría',async()=>{
    const item=await fresh(),results=await Promise.allSettled(Array.from({length:6},()=>service.ejecutar(item.id)));
    assert(results.some(result=>result.status==='fulfilled'));
    for(const result of results)if(result.status==='rejected')assert([409,503].includes(result.reason.getStatus()));
    const current=await service.consultar(item.id);assert.equal(current.estadoNativo,'CONFIRMADA');assert.equal(await profileCount(item.id),1);
    const before=await snapshot();assert.deepEqual(await execution().ejecutar(item.id),current);assert.deepEqual(await snapshot(),before);
    assert.equal((await admin.query('SELECT * FROM rund."RundAprobacionLog" WHERE docente_id=$1',[current.resultadoNativo.docenteId])).rows.length,1);
  });
  await check('Ejecución identidad: fallo nativo conserva Auth aplicado; recuperar solo consulta y reintentar no aplica identidad otra vez',async()=>{
    const item=await fresh();
    await trigger('RundAprobacionLog','INSERT',async()=>{await assert.rejects(service.ejecutar(item.id),/FALLO FICTICIO NATIVO/);});
    const current=await service.consultar(item.id);assert.equal(current.estadoAuth,'AUTH_APLICADA');assert.equal(current.estadoNativo,'PREPARADA');assert.equal(current.decisionNativa,'EN_CURSO');
    const before=await business(),authBefore=await identities(),calls=applyCalls;
    assert.equal((await service.recuperar(item.id)).estadoNativo,'PREPARADA');assert.deepEqual(await business(),before);
    assert.equal((await execution().ejecutar(item.id)).estadoNativo,'CONFIRMADA');assert.equal(applyCalls,calls);assert.deepEqual(await identities(),authBefore);
  });
  await check('Ejecución identidad: aborto previo impide cualquier aplicación o commit y repetir preparación no lo reactiva',async()=>{
    const item=await fresh(),count=authFixture.operationRequestHeaders().length,first=await service.abortar(item.id,'CANCELACION_SOLICITUD');
    assert.equal(first.decisionNativa,'ABORTADA');assert.equal(first.resolucionAuthPendiente,true);
    assert.deepEqual(await service.abortar(item.id,'CANCELACION_SOLICITUD'),first);
    await assert.rejects(service.abortar(item.id,'FALLO_NEGOCIO'),error=>error.getStatus()===409);
    await assert.rejects(service.ejecutar(item.id),error=>error.getStatus()===409);
    assert.equal((await service.preparar(item.id,item.command,item.input)).decisionNativa,'ABORTADA');
    assert.equal(authFixture.operationRequestHeaders().length,count);assert.equal((await service.recuperar(item.id)).estadoAuth,'PREPARADA');
    assert.equal((await service.consultar(item.id)).resolucionAuthPendiente,true);
  });
  await check('Ejecución identidad: carrera aborto/commit nativo produce un único ganador y jamás ambos estados finales',async()=>{
    for(let index=0;index<4;index++) {
      const item=await applied(await prepared()),results=await Promise.allSettled([native.confirmarNativo(item.id),service.abortar(item.id,'FALLO_NEGOCIO')]);
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
      for(const result of results)if(result.status==='rejected')assert.equal(result.reason.getStatus(),409);
      const current=await service.consultar(item.id);
      assert.equal(current.estadoNativo==='CONFIRMADA',current.decisionNativa==='EN_CURSO');assert.equal(await profileCount(item.id),current.estadoNativo==='CONFIRMADA'?1:0);
    }
  });
  await check('Ejecución identidad: aborto durante respuesta Auth en vuelo bloquea el perfil y deja explícita la resolución Auth pendiente',async()=>{
    const item=await fresh();let release,observed;
    const gate=new Promise(resolve=>{release=resolve;}),read=new Promise(resolve=>{observed=resolve;});
    authFixture.setApplyResultHook(async()=>{observed();await gate;});
    const running=service.ejecutar(item.id).then(value=>({value}),error=>({error}));
    try{
      await Promise.race([read,running.then(result=>{throw result.error||new Error('No hubo aplicación en vuelo');})]);
      await service.abortar(item.id,'CANCELACION_SOLICITUD');release();
      const result=await running;assert(result.error);assert.equal(result.error.getStatus(),409);
      const current=await service.recuperar(item.id);assert.equal(current.decisionNativa,'ABORTADA');assert.equal(current.estadoAuth,'AUTH_APLICADA');assert.equal(current.estadoNativo,'PREPARADA');
      assert.equal(current.resolucionAuthPendiente,true);assert.equal(await profileCount(item.id),0);
      const before=await identities();await assert.rejects(service.ejecutar(item.id),error=>error.getStatus()===409);assert.deepEqual(await identities(),before);
    }finally{release();authFixture.setApplyResultHook(undefined);await running;}
  });
  await check('Ejecución identidad: respuesta de aplicación perdida se recupera con GET y luego confirma RUND sin otro POST aplicar',async()=>{
    const item=await fresh();authFixture.dropNextApplyResponse();
    await assert.rejects(service.ejecutar(item.id),error=>error.getStatus()===503);assert.equal((await service.consultar(item.id)).estadoNativo,'PREPARADA');
    const calls=applyCalls,authBefore=await identities();assert.equal((await execution().recuperar(item.id)).estadoAuth,'AUTH_APLICADA');
    assert.equal((await execution().ejecutar(item.id)).estadoNativo,'CONFIRMADA');assert.equal(applyCalls,calls);assert.deepEqual(await identities(),authBefore);
  });
  await check('Ejecución identidad: commit nativo confirmado con respuesta perdida no dispara Auth o un segundo commit al reanudar',async()=>{
    const item=await fresh(),original=native.confirmarNativo.bind(native);
    native.confirmarNativo=async id=>{await original(id);throw new Error('FALLO FICTICIO RESPUESTA NATIVA');};
    try{await assert.rejects(service.ejecutar(item.id),/FALLO FICTICIO RESPUESTA NATIVA/);}finally{native.confirmarNativo=original;}
    const count=authFixture.operationRequestHeaders().length,before=await snapshot(),current=await service.consultar(item.id);
    assert.equal(current.estadoNativo,'CONFIRMADA');assert.deepEqual(await execution().ejecutar(item.id),current);
    assert.equal(authFixture.operationRequestHeaders().length,count);assert.deepEqual(await snapshot(),before);
    await assert.rejects(service.abortar(item.id,'FALLO_NEGOCIO'),error=>error.getStatus()===409);
  });
  await check('Ejecución identidad: barrera SQL impide un marcador posterior al aborto aunque exista perfil y recibo Auth válido',async()=>{
    const item=data({DOCUMENTO_IDENTIDAD:known.command.payload.documentNumber,CORREO_INSTITUCIONAL:known.command.emailFinal});
    await service.preparar(item.id,item.command,item.input);await applied(item);await service.abortar(item.id,'FALLO_NEGOCIO');
    const local=await coord.consultar(item.id),fakeResult={...confirmed.resultado,personaId:local.reciboAuth.resultado.personaId,usuarioId:local.reciboAuth.resultado.usuarioId};
    await assert.rejects(admin.query(`UPDATE rund.identidad_contexto_nativo SET estado='CONFIRMADA',confirmada_en=now(),docente_id=$2,resultado_nativo=$3::jsonb
      WHERE intencion_id=$1`,[item.id,confirmed.docenteId,JSON.stringify(fakeResult)]),/no permite confirmar/);
    assert.equal((await service.consultar(item.id)).estadoNativo,'PREPARADA');
    await assert.rejects(native.confirmarNativo(item.id),error=>error.getStatus()===409);
  });
  await check('Ejecución identidad: decisión irreversible y migración 010 repetible conservan abortos, confirmaciones y contexto',async()=>{
    const item=await fresh();await service.abortar(item.id,'FALLO_NEGOCIO');const before=await snapshot();
    const migration=fs.readFileSync(path.join(rund,'db/migrations/010_rund_identidad_ejecucion.sql'),'utf8');await admin.query(migration);await admin.query(migration);assert.deepEqual(await snapshot(),before);
    for(const query of ['DELETE FROM rund.identidad_ejecucion WHERE intencion_id=$1',
      "UPDATE rund.identidad_ejecucion SET decision='EN_CURSO',abortada_en=NULL,motivo_aborto=NULL WHERE intencion_id=$1",
      "UPDATE rund.identidad_ejecucion SET huella_contexto=repeat('b',64) WHERE intencion_id=$1"])
      await assert.rejects(admin.query(query,[item.id]),/decision de identidad RUND/);
    await assert.rejects(admin.query("UPDATE rund.identidad_ejecucion SET decision='ABORTADA',abortada_en=now(),motivo_aborto='FALLO_NEGOCIO' WHERE intencion_id=$1",[completed.intencionId]),/no admite aborto/);
    assert.deepEqual(await snapshot(),before);
  });
  await check('Ejecución identidad: caída, 404 o DTO parcial no aplican identidad, abortan ni confirman un resultado vacío',async()=>{
    const item=await fresh(),before=await snapshot(),authBefore=await identities();
    try{for(const mode of ['unavailable','missing','partial']){authFixture.setOperationMode(mode);
      await assert.rejects(service.ejecutar(item.id),error=>error.getStatus()===503);await assert.rejects(service.recuperar(item.id),error=>error.getStatus()===503);}}
    finally{authFixture.setOperationMode('normal');}
    assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),authBefore);
    assert.equal((await database.query('SELECT count(*) FROM rund.identidad_ejecucion')).rows[0].count,'0');
    assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
  });
};
