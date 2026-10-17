/* Diagnóstico real de solo lectura dentro del cluster y servicios ficticios. */
const assert=require('node:assert/strict'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyMailDiagnostic(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.host,'127.0.0.1');assert.equal(pgConfig.database,'rund_integration');
  assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,database,ds,authFixture,queued,first,mailRow,deliveries,diagnostics,recon,closures,send,token,actor,viewRole,bareJwt,
    fresh,open,unchanged,grant,setReadHook}=ctx;
  const diagnose=(id,options={})=>send('/por-intencion/'+id+'/diagnosticar',{method:'POST',body:{},...options});
  const details=async item=>{
    const r=(await admin.query(`SELECT o.operacion_auth_id FROM rund.identidad_operacion o WHERE intencion_id=$1`,[item.id])).rows[0];
    const op=(await database.query('SELECT resultado FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[r.operacion_auth_id])).rows[0];
    return{user:op.resultado.usuarioId,person:op.resultado.personaId};
  };
  let known;
  await check('Diagnostico correo: JWT vigente y manage efectivo, sin autoridad en body o token interno',async()=>{
    known=await queued();await unchanged(async()=>{
      for(const bearer of [null,'INVALIDO',bareJwt.sign({sub:actor,roles:['ADMIN']})])await diagnose(known.id,{bearer,status:401});
      await diagnose(known.id,{bearer:null,headers:{'x-internal-service-token':'ficticio'},status:401});
      await diagnose(known.id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      for(const body of [null,[],{apta:true},{resultado:'ACEPTADO'},{reenviar:true},{actorId:actor}])await diagnose(known.id,{body,status:400});
    });
  });
  await check('Diagnostico correo: pendiente apto conserva diez campos, no-store y snapshots sin reservar o enviar',async()=>{
    await unchanged(async()=>{
      const r=await diagnose(known.id);assert.equal(r.response.headers.get('cache-control'),'private, no-store');
      assert.deepEqual(r.body,{version:1,intencionId:known.id,estadoCorreo:'PENDIENTE',diagnostico:'VIGENCIA_CONFIRMADA_AL_CONSULTAR',
        motivoVigencia:null,casoId:null,cierreRegistrado:false,requiereIntervencion:false,siguientePaso:'VALIDAR_AL_ENVIAR',permiteReenvio:false});
      assert(!/intento|@|password|hash|document|contexto|comando/i.test(JSON.stringify(r.body)));
      assert.equal((await diagnose(known.id)).body.diagnostico,r.body.diagnostico);
    });
    assert.equal((await mailRow(known.id)).intento_id,null);
  });
  for(const [field,reason] of [['dir_email','IDENTIDAD_NO_VIGENTE'],['password_temp','CREDENCIALES_NO_VIGENTES']])
    await check('Diagnostico correo: rechazo '+reason+' conserva pendiente y no altera identidad',async()=>{
      const item=await queued(),d=await details(item);
      if(field==='dir_email')await database.query('UPDATE auth.personas SET dir_email=$2 WHERE id_person=$1',[d.person,'cambio-'+randomUUID()+'@example.test']);
      if(field==='password_temp')await database.query('UPDATE auth."user" SET password_temp=false WHERE id_user=$1',[d.user]);
      await unchanged(async()=>{
        const r=(await diagnose(item.id)).body;assert.equal(r.diagnostico,'VIGENCIA_RECHAZADA');assert.equal(r.motivoVigencia,reason);
        assert.equal(r.siguientePaso,'REVISAR_VIGENCIA');assert.equal(r.permiteReenvio,false);
      });
    });
  await check('Diagnostico correo: Auth caido o contrato parcial no se interpretan como rechazo',async()=>{
    for(const mode of ['unavailable','missing','partial']){
      authFixture.setMailValidationMode(mode);
      try{await unchanged(async()=>{const r=(await diagnose(known.id)).body;assert.equal(r.diagnostico,'VIGENCIA_NO_CONFIRMADA');assert.equal(r.motivoVigencia,null);});}
      finally{authFixture.setMailValidationMode('normal');}
    }
    assert.equal((await diagnose(known.id)).body.diagnostico,'VIGENCIA_CONFIRMADA_AL_CONSULTAR');
  });
  await check('Diagnostico correo: envio sin evidencia y caso abierto requieren revision sin declarar fallo SMTP',async()=>{
    const item=await fresh(),calls=authFixture.mailValidationRequestHeaders().length;
    await unchanged(async()=>{const r=(await diagnose(item.id)).body;assert.equal(r.diagnostico,'SIN_RESULTADO_OBSERVADO');assert.equal(r.siguientePaso,'REGISTRAR_REVISION');});
    const review=(await open(item)).body;
    await unchanged(async()=>{const r=(await diagnose(item.id)).body;assert.equal(r.casoId,review.casoId);assert.equal(r.siguientePaso,'CONTINUAR_REVISION');});
    assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
  });
  await check('Diagnostico correo: journal pendiente distingue aceptacion de incertidumbre sin conciliar',async()=>{
    for(const result of ['ACEPTADO','INCIERTO']){
      const item=await fresh();await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,result);
      await unchanged(async()=>{
        const r=(await diagnose(item.id)).body;assert.equal(r.estadoCorreo,'ENVIANDO');assert.equal(r.siguientePaso,'CONCILIAR_RESULTADO');
        assert.equal(r.diagnostico,result==='ACEPTADO'?'ACEPTACION_PENDIENTE_CONCILIAR':'INCERTIDUMBRE_PENDIENTE_CONCILIAR');
      });
      await recon.conciliar(item.id);await unchanged(async()=>{
        const r=(await diagnose(item.id)).body;assert.equal(r.diagnostico,result==='ACEPTADO'?'ACEPTACION_REGISTRADA':'RESULTADO_INCIERTO');
        assert.equal(r.siguientePaso,result==='ACEPTADO'?'NINGUNO':'REVISION_OPERATIVA');
      });
    }
  });
  await check('Diagnostico correo: aceptacion con caso recomienda cierre y recibo existente conserva historia',async()=>{
    const item=await fresh(),review=(await open(item)).body;
    await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'ACEPTADO');await recon.conciliar(item.id);
    await unchanged(async()=>assert.equal((await diagnose(item.id)).body.siguientePaso,'CERRAR_REVISION'));
    await closures.cerrar(review.casoId,{actorId:actor,roles:['ADMIN'],expiresAt:Date.now()/1000+300});
    await unchanged(async()=>{const r=(await diagnose(item.id)).body;assert.equal(r.cierreRegistrado,true);assert.equal(r.siguientePaso,'NINGUNO');});
  });
  await check('Diagnostico correo: historico enviado sin journal requiere revision sin fabricar resultados',async()=>{
    const item=await fresh();await admin.query("UPDATE rund.identidad_correo SET estado='ENVIADO',resuelta_en=clock_timestamp() WHERE intencion_id=$1",[item.id]);
    await unchanged(async()=>{const r=(await diagnose(item.id)).body;assert.equal(r.diagnostico,'ENVIADO_SIN_RESULTADO_REGISTRADO');assert.equal(r.siguientePaso,'REVISAR_HISTORICO');});
  });
  await check('Diagnostico correo: reserva concurrente durante Auth invalida el diagnostico previo',async()=>{
    const item=await queued(),sent=deliveries();
    authFixture.setMailValidationReadHook(async()=>{authFixture.setMailValidationReadHook(undefined);assert.equal((await first.enviarPendiente(item.id)).estado,'ENVIADO');});
    try{await diagnose(item.id,{status:409});}finally{authFixture.setMailValidationReadHook(undefined);}
    assert.equal(deliveries(),sent+1);await unchanged(async()=>assert.equal((await diagnose(item.id)).body.diagnostico,'ACEPTACION_REGISTRADA'));
  });
  await check('Diagnostico correo: revocacion durante Auth o lectura y sesion ADMIN vencida impiden respuesta',async()=>{
    const item=await queued();authFixture.setMailValidationReadHook(async()=>{authFixture.setMailValidationReadHook(undefined);await grant(false);});
    try{await diagnose(item.id,{status:403});}finally{authFixture.setMailValidationReadHook(undefined);await grant(true);}
    const reserved=await fresh();setReadHook(async()=>{setReadHook(undefined);await grant(false);});
    try{await diagnose(reserved.id,{status:403});}finally{setReadHook(undefined);await grant(true);}
    const bearer=bareJwt.sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+2});
    authFixture.setMailValidationReadHook(async()=>{authFixture.setMailValidationReadHook(undefined);await new Promise(resolve=>setTimeout(resolve,2300));});
    try{await unchanged(async()=>diagnose(item.id,{bearer,status:401}));}finally{authFixture.setMailValidationReadHook(undefined);}
  });
  await check('Diagnostico correo: consulta funciona con transaccion SQL readonly sin escrituras ocultas',async()=>{
    const root=path.resolve(__dirname,'../backend/rund-service/dist/common'),{AuthIdentityMailDiagnosticService}=require(path.join(root,'auth-identity-mail-diagnostic.service'));
    const {AuthIdentityClient}=require(path.join(root,'auth-identity.client')),{AuthIdentityMailValidationClient}=require(path.join(root,'auth-identity-mail-validation.client'));
    await unchanged(async()=>ds.transaction(async manager=>{
      await manager.query('SET TRANSACTION READ ONLY');const readonly={query:(...args)=>manager.query(...args)};
      const service=new AuthIdentityMailDiagnosticService(readonly,new AuthIdentityClient(),new AuthIdentityMailValidationClient());
      assert.equal((await service.diagnosticar(known.id,{actorId:actor,roles:['ADMIN'],expiresAt:Date.now()/1000+300})).diagnostico,'VIGENCIA_CONFIRMADA_AL_CONSULTAR');
    }));
  });
  await check('Diagnostico correo: falta de tabla o aviso mantiene error seguro y no altera consultas anteriores',async()=>{
    await diagnose(randomUUID(),{status:404});await diagnose('invalido',{status:400});
    await admin.query('ALTER TABLE rund.identidad_correo_revision_cierre RENAME TO fixture_diagnostic_hidden');
    try{const r=await diagnose(known.id,{status:503});assert(!JSON.stringify(r.body).includes('fixture_diagnostic_hidden'));assert.equal((await first.consultar(known.id)).estado,'PENDIENTE');}
    finally{await admin.query('ALTER TABLE rund.fixture_diagnostic_hidden RENAME TO identidad_correo_revision_cierre');}
    await assert.rejects(ds.query('SELECT * FROM auth.personas'),/does not exist/);
  });
};
