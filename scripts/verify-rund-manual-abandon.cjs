/* Solo se ejecuta dentro del clúster PostgreSQL ficticio del verificador RUND. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{randomUUID}=require('node:crypto');
module.exports=async function verifyAbandon(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,ds,database,identities,authFixture,actor,role,roleId,viewRole,token,send,capture,form,requests,coord,known,secret,dropAbandonResponse}=ctx;
  const abandon=(id,options={})=>send(id,'abandonar',{body:{},...options});
  const status=(id,options={})=>send(id,'abandono',{method:'GET',...options});
  const mark=async id=>(await admin.query('SELECT * FROM rund.identidad_abandono_manual WHERE actor_id=$1 AND solicitud_id=$2',[actor,id])).rows[0];
  const journal=async row=>(await admin.query('SELECT * FROM rund.identidad_operacion WHERE intencion_id=$1',[row.intencion_id])).rows[0];
  const partial=async()=>{
    const id=randomUUID(),original=requests.preparar.bind(requests);
    requests.preparar=async()=>{throw new Error('FALLO FICTICIO ANTES DEL JOURNAL');};
    try{await send(id,'preparar',{body:{formulario:form()},status:503});}finally{requests.preparar=original;}
    const row=await capture(id);assert(row?.entrada_manual);assert.equal(await journal(row),undefined);return {id,row};
  };
  const clone=async(manager,id,source)=>manager.query(`INSERT INTO rund.identidad_solicitud
    (actor_id,solicitud_id,intencion_id,huella_comando,huella_contexto,huella_formulario,entrada_manual)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,[actor,id,randomUUID(),source.huella_comando,source.huella_contexto,source.huella_formulario,JSON.stringify(source.entrada_manual)]);
  const waitBlocked=async()=>{
    const deadline=Date.now()+3000;
    while(Date.now()<deadline){
      if((await admin.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted) AS blocked")).rows[0].blocked)return;
      await new Promise(resolve=>setTimeout(resolve,15));
    }throw new Error('No se observo la exclusion SQL esperada');
  };
  let absent,source;
  await check('Abandono manual: JWT vigente y rol o permiso; body no aporta actor, formulario, motivo o autoridad',async()=>{
    const id=randomUUID(),noExpiry=require(path.join(__dirname,'../backend/rund-service/node_modules/jsonwebtoken')).sign({sub:actor,roles:[role]},secret);
    for(const bearer of [null,'INVALIDO',noExpiry])await abandon(id,{bearer,status:401});
    await abandon(id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
    await abandon(id,{body:{actorId:actor},status:400});assert.equal(await mark(id),undefined);
  });
  await check('Abandono manual: ausencia de captura se cierra de forma durable, repetible y sin efectos Auth',async()=>{
    absent=randomUUID();const before=await identities(),calls=authFixture.operationRequestHeaders().length;
    await status(absent,{status:404});const result=await abandon(absent);
    assert.deepEqual(result.body,{solicitudId:absent,estado:'ABANDONADA',puedeIniciarOtra:true});
    assert.equal(result.response.headers.get('cache-control'),'private, no-store');
    const stored=JSON.stringify(await mark(absent));assert.deepEqual((await abandon(absent)).body,result.body);assert.deepEqual((await status(absent)).body,result.body);
    assert.equal(JSON.stringify(await mark(absent)),stored);assert.equal(await capture(absent),undefined);
    assert.deepEqual(await identities(),before);assert.equal(authFixture.operationRequestHeaders().length,calls);
    await status(absent,{bearer:token(randomUUID()),status:404});
  });
  await check('Abandono manual: captura previa sin journal se conserva pero no puede preparar, reanudar o reservar operacion',async()=>{
    source=await partial();const before=JSON.stringify(source.row);await abandon(source.id);
    await send(source.id,'preparar',{body:{formulario:form()},status:409});await send(source.id,'reanudar-preparacion',{body:{},status:409});
    await assert.rejects(coord.preparar(source.row.intencion_id,source.row.entrada_manual.contexto.comandoAuth),error=>error.driverError?.code==='P7602');
    assert.equal(JSON.stringify(await capture(source.id)),before);assert.equal(await journal(source.row),undefined);
    await assert.rejects(clone(admin,absent,source.row),error=>error.code==='P7602');
  });
  await check('Abandono manual: corregir usa otro UUID y la captura anterior permanece cerrada',async()=>{
    const id=randomUUID();await send(id,'preparar',{body:{formulario:form()}});assert(await capture(id));
    assert(await mark(source.id));assert.equal(await journal(source.row),undefined);
  });
  await check('Abandono manual: journal PREPARADA, AUTH_REGISTRADA, AUTH_APLICADA y commit nunca se liberan como abandono',async()=>{
    const id=randomUUID();await send(id,'preparar',{body:{formulario:form()}});const row=await capture(id);
    await abandon(id,{status:409});assert.equal(await mark(id),undefined);await status(id,{status:404});
    await coord.registrarEnAuth(row.intencion_id);await abandon(id,{status:409});
    const local=await coord.consultar(row.intencion_id);await ctx.client.aplicar(local.operacionAuthId,row.entrada_manual.contexto.comandoAuth);await coord.reconciliar(row.intencion_id);
    await abandon(id,{status:409});const result=await send(id,'ejecutar',{body:{}});assert.equal(result.body.estado,'CONFIRMADA');
    await abandon(id,{status:409});assert.deepEqual((await send(id,'ejecucion',{method:'GET'})).body,result.body);assert.equal(await mark(id),undefined);
    await abandon(known,{status:409});
  });
  await check('Abandono manual: captura en vuelo gana su commit; abandono posterior la cierra antes del journal',async()=>{
    const id=randomUUID(),runner=ds.createQueryRunner();await runner.connect();await runner.startTransaction();let pending;
    try{
      await clone(runner,id,source.row);pending=abandon(id);await waitBlocked();await runner.commitTransaction();
      assert.equal((await pending).body.estado,'ABANDONADA');const row=await capture(id);assert(row);
      await assert.rejects(coord.preparar(row.intencion_id,row.entrada_manual.contexto.comandoAuth),error=>error.driverError?.code==='P7602');
    }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();if(pending)await pending;}
  });
  await check('Abandono manual: reserva de journal en vuelo gana y un abandono que esperaba responde 409 sin borrar nada',async()=>{
    const item=await partial(),runner=ds.createQueryRunner();await runner.connect();await runner.startTransaction();let pending;
    try{
      await runner.query('INSERT INTO rund.identidad_operacion(intencion_id,operacion_auth_id,version,huella_comando) VALUES ($1,$2,1,$3)',
        [item.row.intencion_id,randomUUID(),item.row.huella_comando]);
      pending=abandon(item.id,{status:409});await waitBlocked();await runner.commitTransaction();await pending;
      assert.equal(await mark(item.id),undefined);assert(await journal(item.row));
      await send(item.id,'reanudar-preparacion',{body:{}});assert.equal((await send(item.id,'ejecutar',{body:{}})).body.estado,'CONFIRMADA');
    }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();if(pending)await pending;}
  });
  await check('Abandono manual: abandono en vuelo gana y una reserva tardia espera y falla sin crear journal',async()=>{
    const item=await partial(),runner=ds.createQueryRunner();await runner.connect();await runner.startTransaction();let pending;
    try{
      await runner.query('INSERT INTO rund.identidad_abandono_manual(actor_id,solicitud_id) VALUES ($1,$2)',[actor,item.id]);
      pending=coord.preparar(item.row.intencion_id,item.row.entrada_manual.contexto.comandoAuth).then(()=>null,error=>error);
      await waitBlocked();await runner.commitTransaction();const error=await pending;assert.equal(error?.driverError?.code,'P7602');
      assert.equal(await journal(item.row),undefined);assert(await mark(item.id));
    }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();if(pending)await pending;}
  });
  await check('Abandono manual: respuesta perdida tras commit se recupera por GET con el mismo ID',async()=>{
    const id=randomUUID();dropAbandonResponse();await assert.rejects(abandon(id));
    assert.equal((await status(id)).body.estado,'ABANDONADA');assert.deepEqual((await abandon(id)).body,(await status(id)).body);
  });
  await check('Abandono manual: permiso revocado o Auth de permisos caido no permite abandonar ni recuperar recibos',async()=>{
    const grant=active=>database.query('UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1',[roleId,active]);
    await grant(false);try{await abandon(randomUUID(),{status:403});await status(absent,{status:403});}finally{await grant(true);}
    authFixture.setPermissionsMode('unavailable');try{await status(absent,{status:403});}finally{authFixture.setPermissionsMode('normal');}
  });
  await check('Abandono manual: SQL no admite borrar o alterar recibos y repetir 015 conserva capturas, journals y fechas',async()=>{
    const before=JSON.stringify(await mark(absent));
    await assert.rejects(admin.query('UPDATE rund.identidad_abandono_manual SET abandonada_en=now() WHERE actor_id=$1 AND solicitud_id=$2',[actor,absent]),/inmutable/);
    await assert.rejects(admin.query('DELETE FROM rund.identidad_abandono_manual WHERE actor_id=$1 AND solicitud_id=$2',[actor,absent]),/inmutable/);
    await admin.query(fs.readFileSync(path.join(__dirname,'../backend/rund-service/db/migrations/015_rund_identidad_abandono_manual.sql'),'utf8'));
    assert.equal(JSON.stringify(await mark(absent)),before);assert.equal(await journal(source.row),undefined);assert(await capture(source.id));
  });
};
