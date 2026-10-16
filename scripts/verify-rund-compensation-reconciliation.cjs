/* Conciliacion RUND real mientras el fixture 68 publica la prueba de aborto para Auth. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyReconciliation(pgConfig,runtime,check,ctx) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {AuthIdentityCompensationClient}=require(path.join(rund,'dist/common/auth-identity-compensation.client'));
  const {AuthIdentityCompensationService}=require(path.join(rund,'dist/common/auth-identity-compensation.service'));
  const {admin,ds,coord,authFixture,database,data,identities,existing,abort,execution}=ctx;
  const owner=new AuthIdentityCompensationClient(),get=owner.consultar.bind(owner),post=owner.compensar.bind(owner);let posts=0,gets=0;
  owner.consultar=async(...args)=>{gets++;return get(...args);};owner.compensar=async(...args)=>{posts++;return post(...args);};
  const instance=()=>new AuthIdentityCompensationService(ds,owner),service=instance();
  const fresh=async options=>abort(await existing(options));
  const stable=async()=>{const result={};for(const {tablename}of(await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='rund' AND tablename<>'identidad_resolucion_auth' ORDER BY tablename")).rows)
    result[tablename]=(await admin.query(`SELECT to_jsonb(t) AS row FROM rund."${tablename}" t ORDER BY to_jsonb(t)::text`)).rows;return result;};
  const authResolution=async item=>(await database.query('SELECT * FROM auth.rund_identidad_compensacion WHERE operacion_id=$1',[item.local.operacionAuthId])).rows[0];
  const receipt=item=>({version:1,operacionId:item.local.operacionAuthId,intencionId:item.id,huellaComando:item.local.huellaComando,
    estado:'COMPENSADA',motivo:null,resueltaEn:'2026-10-15T10:00:00.000Z',identidadRevertida:true});
  const insert=async(item,raw=receipt(item),contextHash)=>admin.query(`INSERT INTO rund.identidad_resolucion_auth
    (intencion_id,operacion_auth_id,huella_comando,huella_contexto,estado,motivo,recibo_auth) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [item.id,item.local.operacionAuthId,item.local.huellaComando,contextHash||(await execution.consultar(item.id)).huellaContexto,raw.estado,raw.motivo,JSON.stringify(raw)]);
  const trigger=async run=>{
    await admin.query(`CREATE FUNCTION rund.reject_resolution_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO RECIBO RUND'; END $$;
      CREATE TRIGGER reject_resolution_fixture BEFORE INSERT ON rund.identidad_resolucion_auth FOR EACH ROW EXECUTE FUNCTION rund.reject_resolution_fixture()`);
    try{await run();}finally{await admin.query('DROP TRIGGER reject_resolution_fixture ON rund.identidad_resolucion_auth;DROP FUNCTION rund.reject_resolution_fixture()');}
  };
  let done;
  await check('Conciliacion compensacion: intencion invalida, inexistente, abierta o confirmada impide HTTP de resolucion',async()=>{
    const calls=gets;
    await assert.rejects(service.resolver('cedula'),error=>error.getStatus()===400);await assert.rejects(service.resolver(randomUUID()),error=>error.getStatus()===404);
    const item=await existing();await assert.rejects(service.resolver(item.id),error=>error.getStatus()===409);
    await execution.ejecutar(item.id);await assert.rejects(service.resolver(item.id),error=>error.getStatus()===409);assert.equal(gets,calls);
  });
  await check('Conciliacion compensacion: ausencia explicita solo consulta; no solicita compensacion ni inventa cierre',async()=>{
    const item=await fresh(),before=await identities(),nativeBefore=await stable(),count=posts;
    const result=await service.reconciliar(item.id);assert.equal(result.consultaAuth,'NO_ENCONTRADA');assert.equal(result.coordinacion.reciboResolucion,null);
    assert.equal(posts,count);assert.deepEqual(await identities(),before);assert.deepEqual(await stable(),nativeBefore);
    assert.equal((await execution.consultar(item.id)).resolucionAuthPendiente,true);
  });
  await check('Conciliacion compensacion: guarda recibo propietario y cierra pendiente sin alterar el aplicado historico o perfil nativo',async()=>{
    const item=await fresh(),nativeBefore=await stable(),history=await coord.consultar(item.id),result=await service.resolver(item.id);done=item;
    assert.equal(result.reciboResolucion.estado,'COMPENSADA');assert.equal(result.reciboResolucion.identidadRevertida,true);
    assert.equal(Object.keys(result.reciboResolucion).length,8);assert(result.registradaEn);
    const status=await execution.consultar(item.id);assert.equal(status.estadoAuth,'AUTH_APLICADA');assert.equal(status.estadoNativo,'PREPARADA');
    assert.equal(status.resolucionAuthPendiente,false);assert.equal(status.revisionAuthRequerida,false);assert.deepEqual(status.resolucionAuth,result.reciboResolucion);
    assert.deepEqual(await coord.consultar(item.id),history);assert.deepEqual(await stable(),nativeBefore);assert.deepEqual(await identities(),item.beforeIdentities);
    assert(!/personaId|usuarioId|preimagen|postimagen|password|comandoAuth/.test(JSON.stringify(result.reciboResolucion)));
  });
  await check('Conciliacion compensacion: resolucion final se recupera por otra instancia sin HTTP, POST o nuevas escrituras',async()=>{
    const first=await service.consultar(done.id),authBefore=await identities(),nativeBefore=await stable(),calls=gets,count=posts;
    assert.deepEqual(await instance().resolver(done.id),first);assert.deepEqual((await instance().reconciliar(done.id)).coordinacion,first);
    assert.equal(gets,calls);assert.equal(posts,count);assert.deepEqual(await identities(),authBefore);assert.deepEqual(await stable(),nativeBefore);
    await assert.rejects(execution.ejecutar(done.id),error=>error.getStatus()===409);
  });
  await check('Conciliacion compensacion: seis solicitudes simultaneas convergen en un recibo sin doble restauracion',async()=>{
    const item=await fresh(),results=await Promise.all(Array.from({length:6},()=>instance().resolver(item.id)));
    results.forEach(result=>assert.deepEqual(result,results[0]));assert.deepEqual(await identities(),item.beforeIdentities);
    assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_resolucion_auth WHERE intencion_id=$1',[item.id])).rows[0].count,'1');
  });
  await check('Conciliacion compensacion: commit Auth previo se concilia por GET exclusivamente sin repetir la compensacion',async()=>{
    const item=await fresh();await ctx.send(item);const before=await identities(),nativeBefore=await stable(),count=posts;
    assert.equal((await execution.consultar(item.id)).resolucionAuthPendiente,true);
    assert.equal((await service.reconciliar(item.id)).coordinacion.reciboResolucion.estado,'COMPENSADA');
    assert.equal(posts,count);assert.equal((await execution.consultar(item.id)).resolucionAuthPendiente,false);
    assert.deepEqual(await identities(),before);assert.deepEqual(await stable(),nativeBefore);
  });
  await check('Conciliacion compensacion: respuesta Auth perdida tras commit conserva pendiente y se recupera por GET sin segundo POST',async()=>{
    const item=await fresh();authFixture.dropNextCompensationResponse();await assert.rejects(service.resolver(item.id),error=>error.getStatus()===503);
    const before=await identities(),count=posts;assert.equal((await authResolution(item)).estado,'COMPENSADA');
    assert.equal((await execution.consultar(item.id)).resolucionAuthPendiente,true);assert.equal((await service.consultar(item.id)).reciboResolucion,null);
    const result=await instance().resolver(item.id);assert.equal(result.reciboResolucion.estado,'COMPENSADA');assert.equal(posts,count);assert.deepEqual(await identities(),before);
  });
  await check('Conciliacion compensacion: fallo local posterior al commit remoto revierte solo el registro local y se recupera sin restaurar otra vez',async()=>{
    const item=await fresh(),nativeBefore=await stable();await trigger(async()=>{await assert.rejects(service.resolver(item.id),/FALLO FICTICIO RECIBO RUND/);});
    const before=await identities(),count=posts;assert.equal((await authResolution(item)).estado,'COMPENSADA');
    assert.equal((await service.consultar(item.id)).reciboResolucion,null);assert.deepEqual(await stable(),nativeBefore);
    assert.equal((await instance().reconciliar(item.id)).coordinacion.reciboResolucion.estado,'COMPENSADA');assert.equal(posts,count);assert.deepEqual(await identities(),before);
  });
  await check('Conciliacion compensacion: ausencia GET retenida no borra una resolucion confirmada por otra solicitud',async()=>{
    const item=await fresh(),slow=new AuthIdentityCompensationClient(),read=slow.consultar.bind(slow);let release,observed;
    const gate=new Promise(resolve=>{release=resolve;}),seen=new Promise(resolve=>{observed=resolve;});
    slow.consultar=async(...args)=>{const result=await read(...args);assert.equal(result,null);observed();await gate;return result;};
    const running=new AuthIdentityCompensationService(ds,slow).reconciliar(item.id).then(value=>({value}),error=>({error}));
    try{await Promise.race([seen,running.then(result=>{throw result.error||new Error('No hubo GET retenido');})]);
      const confirmed=await service.resolver(item.id);release();const result=await running;if(result.error)throw result.error;
      assert.equal(result.value.consultaAuth,'CONFIRMADA');assert.deepEqual(result.value.coordinacion,confirmed);
    }finally{release();await running;}
  });
  await check('Conciliacion compensacion: altas y cambios posteriores quedan en revision explicita sin cerrar el pendiente',async()=>{
    const changed=await fresh();await database.query("UPDATE auth.personas SET nom_largo='EDICION POSTERIOR FICTICIA' WHERE id_person=$1",[changed.personId]);
    const before=await identities(),review=await service.resolver(changed.id);assert.equal(review.reciboResolucion.motivo,'CAMBIOS_POSTERIORES');
    const status=await execution.consultar(changed.id);assert.equal(status.resolucionAuthPendiente,true);assert.equal(status.revisionAuthRequerida,true);
    assert.equal(status.resolucionAuth.identidadRevertida,false);assert.deepEqual(await identities(),before);
    const created=await fresh({removeUser:true}),createdBefore=await identities(),newAccount=await service.resolver(created.id);
    assert.equal(newAccount.reciboResolucion.motivo,'ALTA_IDENTIDAD');assert.equal((await execution.consultar(created.id)).resolucionAuthPendiente,true);assert.deepEqual(await identities(),createdBefore);
    const count=posts,calls=gets;assert.deepEqual(await instance().resolver(changed.id),review);assert.equal(posts,count);assert.equal(gets,calls);
  });
  await check('Conciliacion compensacion: cancelacion no aplicada conserva su camino y no solicita una compensacion',async()=>{
    const item=data();await execution.preparar(item.id,item.command,item.input);await execution.abortar(item.id,'FALLO_NEGOCIO');await execution.resolverAborto(item.id);
    const calls=gets,count=posts;await assert.rejects(service.resolver(item.id),error=>error.getStatus()===409);
    const current=await execution.consultar(item.id);assert.equal(current.estadoAuth,'CANCELADA');assert.equal(current.resolucionAuth,null);
    assert.equal(current.resolucionAuthPendiente,false);assert.equal(current.revisionAuthRequerida,false);assert.equal(gets,calls);assert.equal(posts,count);
  });
  await check('Conciliacion compensacion: caida, 404 y DTO parcial no equivalen a ausencia ni crean un recibo local',async()=>{
    const item=await fresh(),nativeBefore=await stable(),before=await identities(),count=posts;
    try{for(const mode of ['missing','partial','unavailable']) {authFixture.setOperationMode(mode);
      await assert.rejects(service.resolver(item.id),error=>error.getStatus()===503);}}
    finally{authFixture.setOperationMode('normal');}
    assert.equal(posts,count);assert.equal((await service.consultar(item.id)).reciboResolucion,null);assert.deepEqual(await identities(),before);assert.deepEqual(await stable(),nativeBefore);
    authFixture.setCompensationEnabled(false);try{await assert.rejects(service.resolver(item.id),error=>error.getStatus()===503);}finally{authFixture.setCompensationEnabled(true);}
  });
  await check('Conciliacion compensacion: recibo ajeno y contradiccion terminal no reemplazan una resolucion confirmada',async()=>{
    const original=await service.consultar(done.id),nativeBefore=await stable();
    await assert.rejects(service.guardarRecibo(done.id,{...original.reciboResolucion,intencionId:randomUUID()}),error=>error.getStatus()===409);
    await assert.rejects(service.guardarRecibo(done.id,{...original.reciboResolucion,resueltaEn:'2026-10-15T11:00:00.000Z'}),error=>error.getStatus()===503);
    assert.deepEqual(await service.consultar(done.id),original);assert.deepEqual(await stable(),nativeBefore);
  });
  await check('Conciliacion compensacion: SQL exige aborto sin commit y aplicado coincidente antes de aceptar resolucion',async()=>{
    const open=await existing();await assert.rejects(insert(open),/requiere aborto/);
    await execution.ejecutar(open.id);await assert.rejects(insert(open),/requiere aborto/);
    const notApplied=data();await execution.preparar(notApplied.id,notApplied.command,notApplied.input);await execution.abortar(notApplied.id,'FALLO_NEGOCIO');
    notApplied.local=await coord.consultar(notApplied.id);await assert.rejects(insert(notApplied),/requiere aborto/);
    const item=await fresh();await assert.rejects(insert(item,receipt(item),'f'.repeat(64)),/requiere aborto/);
    for(const invalid of [{...receipt(item),version:null},{...receipt(item),preimagen:{}},{...receipt(item),huellaComando:'f'.repeat(64)},
      {...receipt(item),estado:'REVISION_REQUERIDA',motivo:'ALTA_IDENTIDAD',identidadRevertida:true}])
      await assert.rejects(insert(item,invalid),/recibo_check/);
    assert.equal((await service.consultar(item.id)).reciboResolucion,null);
  });
  await check('Conciliacion compensacion: 011 repetible y recibo local inmutable conservan fechas, estado y contenido',async()=>{
    const snapshot=async()=>(await admin.query('SELECT to_jsonb(t) AS row FROM rund.identidad_resolucion_auth t ORDER BY intencion_id')).rows;
    const before=await snapshot(),sql=fs.readFileSync(path.join(rund,'db/migrations/011_rund_identidad_resolucion_auth.sql'),'utf8');await admin.query(sql);await admin.query(sql);
    assert.deepEqual(await snapshot(),before);
    for(const query of ['DELETE FROM rund.identidad_resolucion_auth WHERE intencion_id=$1',"UPDATE rund.identidad_resolucion_auth SET estado='REVISION_REQUERIDA' WHERE intencion_id=$1",
      "UPDATE rund.identidad_resolucion_auth SET registrada_en=now() WHERE intencion_id=$1"])
      await assert.rejects(admin.query(query,[done.id]),/inmutable/);
    assert.deepEqual(await snapshot(),before);
  });
  await check('Conciliacion compensacion: perdida de respuesta local despues de persistir se recupera sin HTTP o segundo efecto',async()=>{
    const item=await fresh(),server=http.createServer(async(req,res)=>{try{req.resume();await service.resolver(item.id);res.destroy();}catch(error){res.writeHead(500);res.end(error.message);}});
    try {
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      await assert.rejects(fetch('http://127.0.0.1:'+server.address().port+'/resolver',{method:'POST'}));
      const before=await identities(),count=posts,calls=gets;
      const recovered=await instance().resolver(item.id);assert.equal(recovered.reciboResolucion.estado,'COMPENSADA');
      assert.equal(gets,calls);assert.equal(posts,count);assert.deepEqual(await identities(),before);
    }finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
  });
  await check('Conciliacion compensacion: base RUND sin Auth, recibo sin datos personales y flujos activos sin usar 011',async()=>{
    assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);assert(await authFixture.applyHasNoRundPrivileges());
    for(const table of ['identidad_operacion','identidad_contexto_nativo','identidad_ejecucion','identidad_resolucion_auth'])
      assert.equal((await database.query('SELECT count(*) FROM rund.'+table)).rows[0].count,'0');
    const rows=(await admin.query('SELECT recibo_auth FROM rund.identidad_resolucion_auth')).rows;assert(rows.length>0);
    rows.forEach(row=>assert.equal(Object.keys(row.recibo_auth).length,8));
  });
  await require('./verify-rund-identity-review.cjs')(pgConfig,runtime,check,{...ctx,compensation:service,fresh,done});
};
