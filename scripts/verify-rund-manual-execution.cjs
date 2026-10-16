/* Ejecucion HTTP protegida en la base RUND ficticia separada; nunca importa AppModule. */
const assert=require('node:assert/strict'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyManualExecution(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,ds,coord,client,authFixture,database,actor,role,roleId,viewRole,token,send,capture,form,execution,entries,
    known,jwt,secret,dropExecutionResponse,trigger,identities,snapshot}=ctx;
  const headersStart=authFixture.operationRequestHeaders().length;
  const originalApply=client.aplicar.bind(client),originalRegister=coord.registrarEnAuth.bind(coord),originalResume=entries.reanudar.bind(entries);
  let applies=0;client.aplicar=async(...args)=>{applies++;return originalApply(...args);};
  const grant=async active=>database.query('UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1',[roleId,active]);
  const fresh=async()=>{const id=randomUUID();await send(id,'preparar',{body:{formulario:form()}});return {id,row:await capture(id)};};
  const execute=(id,options={})=>send(id,'ejecutar',{body:{},...options});
  const status=id=>send(id,'ejecucion',{method:'GET'});
  const profileCount=async id=>(await admin.query('SELECT count(*) FROM rund."Docente" WHERE id=$1',[id])).rows[0].count;
  let done;
  try{
    await check('Ejecucion manual: JWT vigente, permiso y actor son obligatorios; body no elige intencion o contexto',async()=>{
      const item=await fresh(),before=await snapshot();
      await execute(item.id,{bearer:null,status:401});await execute(item.id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      const dep=name=>require(path.join(__dirname,'../backend/rund-service/node_modules',name));
      const noExpiry=dep('jsonwebtoken').sign({sub:actor,roles:[role]},secret);await execute(item.id,{bearer:noExpiry,status:401});
      await execute(item.id,{body:{intencionId:known},status:400});await execute(item.id,{bearer:token(randomUUID()),status:404});
      assert.deepEqual(await snapshot(),before);
    });
    await check('Ejecucion manual: prevalidacion y autorizacion vigentes llevan a un commit con recibo minimo sin correo',async()=>{
      const item=await fresh(),result=await execute(item.id);done={...item,receipt:result.body};
      assert.equal(result.body.estado,'CONFIRMADA');assert.equal(result.body.estadoAuth,'AUTH_APLICADA');assert.equal(result.body.correo,'PENDIENTE');
      assert.equal(Object.keys(result.body).length,9);assert.equal(result.body.solicitudId,item.id);assert.equal(result.body.intencionId,item.row.intencion_id);
      assert.equal(await profileCount(result.body.docenteId),'1');assert.equal(result.response.headers.get('cache-control'),'private, no-store');
      const calls=applies,before=await identities();assert.deepEqual((await execute(item.id)).body,result.body);assert.deepEqual((await status(item.id)).body,result.body);
      assert.equal(applies,calls);assert.deepEqual(await identities(),before);assert(!/formulario|personaId|usuarioId|@|resultadoNativo|password|token/i.test(JSON.stringify(result.body)));
    });
    await check('Ejecucion manual: concurrencia conserva una identidad y perfil; respuestas transitorias se recuperan con el mismo ID',async()=>{
      const item=await fresh();const results=await Promise.all(Array.from({length:6},async()=>{
        try{return (await execute(item.id)).body;}catch(error){if(!/503 !== 200/.test(error.message))throw error;return null;}
      }));assert(results.some(Boolean));
      const final=(await execute(item.id)).body;results.filter(Boolean).forEach(receipt=>assert.deepEqual(receipt,final));assert.equal(await profileCount(final.docenteId),'1');
    });
    await check('Ejecucion manual: revocar permiso durante prevalidacion impide registrar o aplicar en Auth',async()=>{
      const item=await fresh(),calls=applies,before=await identities();entries.reanudar=async(...args)=>{const result=await originalResume(...args);await grant(false);return result;};
      try{await execute(item.id,{status:403});}finally{entries.reanudar=originalResume;await grant(true);}
      assert.equal((await coord.consultar(item.row.intencion_id)).estado,'PREPARADA');assert.equal(applies,calls);assert.deepEqual(await identities(),before);
    });
    await check('Ejecucion manual: revocacion despues de registrar detiene la aplicacion y permite recuperar la misma operacion',async()=>{
      const item=await fresh(),calls=applies;coord.registrarEnAuth=async(...args)=>{const result=await originalRegister(...args);await grant(false);return result;};
      try{await execute(item.id,{status:403});}finally{coord.registrarEnAuth=originalRegister;await grant(true);}
      assert.equal((await coord.consultar(item.row.intencion_id)).estado,'AUTH_REGISTRADA');assert.equal(applies,calls);
      assert.equal((await execute(item.id)).body.estado,'CONFIRMADA');assert.equal(applies,calls+1);
    });
    await check('Ejecucion manual: revocacion tras aplicar Auth impide commit nativo; reanudar no repite la identidad',async()=>{
      const item=await fresh();authFixture.setApplyResultHook(async()=>{await grant(false);});
      try{await execute(item.id,{status:403});}finally{authFixture.setApplyResultHook(undefined);await grant(true);}
      const current=(await status(item.id)).body,calls=applies,before=await identities();assert.equal(current.estadoAuth,'AUTH_APLICADA');assert.equal(current.estadoNativo,'PREPARADA');
      assert.equal((await execute(item.id)).body.estado,'CONFIRMADA');assert.equal(applies,calls);assert.deepEqual(await identities(),before);
    });
    await check('Ejecucion manual: sesion vencida durante HTTP no confirma perfil y otra sesion recupera el Auth aplicado',async()=>{
      const item=await fresh(),bearer=jwt.sign({sub:actor,roles:[role]},{expiresIn:5});
      authFixture.setApplyResultHook(async()=>{await new Promise(resolve=>setTimeout(resolve,6000));});
      try{await execute(item.id,{bearer,status:401});}finally{authFixture.setApplyResultHook(undefined);}
      const current=(await status(item.id)).body,calls=applies;assert.equal(current.estadoAuth,'AUTH_APLICADA');assert.equal(current.estadoNativo,'PREPARADA');
      assert.equal((await execute(item.id)).body.estado,'CONFIRMADA');assert.equal(applies,calls);
    });
    await check('Ejecucion manual: fallo nativo revierte perfil y conserva Auth aplicado sin compensacion o aborto automaticos',async()=>{
      const item=await fresh();await trigger('RundAprobacionLog','INSERT',async()=>{await execute(item.id,{status:503});});
      const current=(await status(item.id)).body,calls=applies,before=await identities();assert.equal(current.estadoAuth,'AUTH_APLICADA');assert.equal(current.estado,'PENDIENTE');assert.equal(current.decisionNativa,'EN_CURSO');
      assert.equal((await execute(item.id)).body.estado,'CONFIRMADA');assert.equal(applies,calls);assert.deepEqual(await identities(),before);
    });
    await check('Ejecucion manual: respuesta perdida tras commit se recupera por GET y replay sin prevalidar o aplicar otra vez',async()=>{
      const item=await fresh();dropExecutionResponse();await assert.rejects(execute(item.id));
      const result=(await status(item.id)).body,calls=applies,prechecks=authFixture.prevalidationRequestHeaders().length;
      assert.equal(result.estado,'CONFIRMADA');assert.deepEqual((await execute(item.id)).body,result);assert.equal(applies,calls);
      assert.equal(authFixture.prevalidationRequestHeaders().length,prechecks);assert.equal(await profileCount(result.docenteId),'1');
    });
    await check('Ejecucion manual: aborto previo o durante registro impide la identidad y nunca reactiva la solicitud',async()=>{
      const first=await fresh(),calls=applies;await execution.abortar(first.row.intencion_id,'CANCELACION_SOLICITUD');await execute(first.id,{status:409});
      const second=await fresh();coord.registrarEnAuth=async(...args)=>{const result=await originalRegister(...args);await execution.abortar(second.row.intencion_id,'CANCELACION_SOLICITUD');return result;};
      try{await execute(second.id,{status:409});}finally{coord.registrarEnAuth=originalRegister;}
      assert.equal((await status(second.id)).body.estado,'ABORTADA');assert.equal(applies,calls);
    });
    await check('Ejecucion manual: bandera Auth apagada o contrato no disponible no confirma un perfil falso',async()=>{
      const item=await fresh();authFixture.setApplyEnabled(false);try{await execute(item.id,{status:503});}finally{authFixture.setApplyEnabled(true);}
      assert.equal((await status(item.id)).body.estado,'PENDIENTE');assert.equal((await execute(item.id)).body.estado,'CONFIRMADA');
    });
    await check('Ejecucion manual: recibo confirmado se recupera sin API de identidad y sigue exigiendo permisos vigentes',async()=>{
      authFixture.setOperationMode('unavailable');authFixture.setPrevalidationMode('unavailable');
      try{assert.deepEqual((await execute(done.id)).body,done.receipt);}finally{authFixture.setOperationMode('normal');authFixture.setPrevalidationMode('normal');}
      await grant(false);try{await execute(done.id,{status:403});await send(done.id,'ejecucion',{method:'GET',status:403});}finally{await grant(true);}
    });
    await check('Ejecucion manual: recibo por actor sin datos privados, API Auth sin JWT reenviado y flujos activos sin intenciones',async()=>{
      await send(done.id,'ejecucion',{method:'GET',bearer:token(randomUUID()),status:404});
      const headers=authFixture.operationRequestHeaders().slice(headersStart);assert(headers.length>0);assert(headers.every(h=>h.tokenMatches&&!h.authorizationForwarded&&!h.cookieForwarded));
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);assert(await authFixture.applyHasNoRundPrivileges());
      for(const table of ['identidad_operacion','identidad_contexto_nativo','identidad_ejecucion','identidad_solicitud'])
        assert.equal((await database.query('SELECT count(*) FROM rund.'+table)).rows[0].count,'0');
    });
  }finally{client.aplicar=originalApply;coord.registrarEnAuth=originalRegister;entries.reanudar=originalResume;authFixture.setApplyResultHook(undefined);authFixture.setApplyEnabled(true);authFixture.setOperationMode('normal');authFixture.setPrevalidationMode('normal');await grant(true);}
};
