/* GET real por actor: PostgreSQL/TypeORM/JWT sobre el clúster ficticio, sin SMTP. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyMailStatus(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,ds,database,snapshot,identities,authFixture,actor,role,roleId,viewRole,token,send,capture,form,execution,jwt,secret}=ctx;
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {AuthIdentityMailService}=require(path.join(rund,'dist/common/auth-identity-mail.service'));
  const {JwtService}=require(path.join(rund,'node_modules/@nestjs/jwt'));
  const originalQuery=ds.query;let smtpCalls=0,created;
  const consumer=new AuthIdentityMailService(ds,{enviar:async()=>{smtpCalls++;return true;}});
  const get=(id,options={})=>send(id,'correo',{method:'GET',...options});
  const grant=enabled=>database.query(`UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1
    AND id_permission=(SELECT id_permission FROM auth.permission WHERE code='banco-docentes.rund.manage')`,[roleId,enabled]);
  const prepare=async(overrides={})=>{
    const id=randomUUID(),raw={...form(),...overrides};await send(id,'preparar',{body:{formulario:raw}});return{id,raw,stored:await capture(id)};
  };
  const confirm=async item=>{await send(item.id,'ejecutar',{body:{}});return item;};
  const assertReadOnly=async work=>{
    const before=await snapshot(),owner=await identities(),ops=authFixture.operationRequestHeaders().length,
      pre=authFixture.prevalidationRequestHeaders().length,sent=smtpCalls;
    await work();assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),owner);
    assert.equal(authFixture.operationRequestHeaders().length,ops);assert.equal(authFixture.prevalidationRequestHeaders().length,pre);assert.equal(smtpCalls,sent);
  };
  try{
    await check('Consulta correo: JWT vigente, actor y permiso manage son obligatorios; token interno o claims de permiso no los sustituyen',async()=>{
      const id=randomUUID(),noExpiry=new JwtService({secret}).sign({sub:actor,roles:[role]});
      for(const bearer of [null,'INVALIDO',noExpiry])await get(id,{bearer,status:401});
      await get(id,{bearer:null,headers:{'x-internal-service-token':'ficticio'},status:401});
      await get(id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
    });
    await check('Consulta correo: captura propia sin commit devuelve SIN_CONFIRMAR sin publicar identidad o encolar',async()=>{
      created=await prepare();await assertReadOnly(async()=>{
        const result=await get(created.id);assert.equal(result.response.headers.get('cache-control'),'private, no-store');
        assert.deepEqual(result.body,{version:1,solicitudId:created.id,intencionId:created.stored.intencion_id,
          estado:'SIN_CONFIRMAR',registroConfirmado:false,requiereRevision:false});
      });
    });
    await check('Consulta correo: solicitud desconocida u otro actor devuelve 404; historico sin captura devuelve 409',async()=>{
      await assertReadOnly(async()=>{
        await get(randomUUID(),{status:404});await get(created.id,{bearer:token(randomUUID()),status:404});
        const old=(await admin.query('SELECT actor_id,solicitud_id FROM rund.identidad_solicitud WHERE entrada_manual IS NULL LIMIT 1')).rows[0];assert(old);
        await get(old.solicitud_id,{bearer:token(old.actor_id),status:409});
      });
    });
    await check('Consulta correo: alta confirmada acredita PENDIENTE durable en seis campos sin datos de identidad',async()=>{
      await confirm(created);await assertReadOnly(async()=>{
        const result=await get(created.id);assert.deepEqual(result.body,{version:1,solicitudId:created.id,intencionId:created.stored.intencion_id,
          estado:'PENDIENTE',registroConfirmado:true,requiereRevision:false});
        assert(!/destinatario|password|document|username|contexto|huella|intento|@/i.test(JSON.stringify(result.body)));
      });
    });
    await check('Consulta correo: cuenta existente confirmada produce NO_APLICA y no fabrica un aviso o envio',async()=>{
      const existing=await confirm(await prepare({DOCUMENTO_IDENTIDAD:created.raw.DOCUMENTO_IDENTIDAD,
        CORREO_INSTITUCIONAL:created.raw.CORREO_INSTITUCIONAL,PERIODO_CARGA:'2097-1'}));
      await assertReadOnly(async()=>{const result=(await get(existing.id)).body;
        assert.equal(result.estado,'NO_APLICA');assert.equal(result.registroConfirmado,true);assert.equal(result.requiereRevision,false);});
    });
    await check('Consulta correo: ENVIANDO en vuelo y ENVIADO confirmado se distinguen sin reclamar otro intento',async()=>{
      let finish;const slow=new AuthIdentityMailService(ds,{enviar:()=>{smtpCalls++;return new Promise(resolve=>{finish=resolve;});}});
      const sending=slow.enviarPendiente(created.stored.intencion_id);
      try{
        const deadline=Date.now()+3000;while(!finish&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));assert(finish);
        await assertReadOnly(async()=>{assert.equal((await get(created.id)).body.estado,'ENVIANDO');});
      }finally{if(finish)finish(true);await sending;}
      await assertReadOnly(async()=>{assert.equal((await get(created.id)).body.estado,'ENVIADO');});
    });
    await check('Consulta correo: INCIERTO requiere revision y GET concurrentes no reenvian o cambian el registro',async()=>{
      const item=await confirm(await prepare()),uncertain=new AuthIdentityMailService(ds,{enviar:async()=>{smtpCalls++;return false;}});
      await uncertain.enviarPendiente(item.stored.intencion_id);
      await assertReadOnly(async()=>{const results=await Promise.all(Array.from({length:4},()=>get(item.id)));
        results.forEach(({body})=>{assert.equal(body.estado,'INCIERTO');assert.equal(body.requiereRevision,true);});});
    });
    await check('Consulta correo: query no elige actor, intencion, permisos o envio y POST no es ruta de reenvio',async()=>{
      await assertReadOnly(async()=>{
        const result=await send(created.id,'correo?actorId='+randomUUID()+'&intencionId='+randomUUID()+'&enviar=true',{method:'GET'});
        assert.equal(result.body.intencionId,created.stored.intencion_id);assert.equal(result.body.estado,'ENVIADO');
        await send(created.id,'correo',{method:'POST',body:{enviar:true},status:404});
      });
    });
    await check('Consulta correo: revocacion durante SQL impide entregar el recibo y la misma solicitud se recupera tras restaurar permiso',async()=>{
      ds.query=async function(...args){const result=await originalQuery.apply(this,args);if(String(args[0]).includes('AS estado_correo'))await grant(false);return result;};
      try{await get(created.id,{status:403});}finally{ds.query=originalQuery;await grant(true);}
      assert.equal((await get(created.id)).body.estado,'ENVIADO');
    });
    await check('Consulta correo: vencimiento durante SQL bloquea tambien al rol de gestion sin cambiar hechos',async()=>{
      const exp=Math.floor(Date.now()/1000)+3,bearer=new JwtService({secret}).sign({sub:actor,roles:['ADMIN'],exp});let waited=false;
      ds.query=async function(...args){const result=await originalQuery.apply(this,args);
        if(String(args[0]).includes('AS estado_correo')){waited=true;await new Promise(resolve=>setTimeout(resolve,Math.max(0,exp*1000+50-Date.now())));}return result;};
      try{await assertReadOnly(async()=>{await get(created.id,{bearer,status:401});});assert(waited);}finally{ds.query=originalQuery;}
    });
    await check('Consulta correo: permisos Auth caidos deniegan; catalogo o APIs de escritura caidos no impiden consultar hechos autorizados',async()=>{
      authFixture.setPermissionsMode('unavailable');try{await get(created.id,{status:403});}finally{authFixture.setPermissionsMode('normal');}
      authFixture.setCatalogMode('unavailable');authFixture.setPrevalidationMode('unavailable');authFixture.setOperationMode('unavailable');
      try{await assertReadOnly(async()=>{assert.equal((await get(created.id)).body.estado,'ENVIADO');});}
      finally{authFixture.setCatalogMode('normal');authFixture.setPrevalidationMode('normal');authFixture.setOperationMode('normal');}
    });
    await check('Consulta correo: falta de aviso elegible es 503, nunca NO_APLICA ni reparacion durante GET',async()=>{
      const item=await prepare();await admin.query('ALTER TABLE rund.identidad_contexto_nativo DISABLE TRIGGER encolar_correo_identidad_confirmada');
      try{await confirm(item);}finally{await admin.query('ALTER TABLE rund.identidad_contexto_nativo ENABLE TRIGGER encolar_correo_identidad_confirmada');}
      await assertReadOnly(async()=>{await get(item.id,{status:503});});
      await admin.query(fs.readFileSync(path.join(rund,'db/migrations/016_rund_identidad_correo.sql'),'utf8'));
      assert.equal((await get(item.id)).body.estado,'PENDIENTE');
    });
    await check('Consulta correo: ausencia de tabla o fallo SQL conserva 503 generico sin parametros privados',async()=>{
      await admin.query('ALTER TABLE rund.identidad_correo RENAME TO identidad_correo_fixture_guard');
      try{const result=await get(created.id,{status:503});assert(!/parameters|query|SELECT|@|contexto/i.test(JSON.stringify(result.body)));}
      finally{await admin.query('ALTER TABLE rund.identidad_correo_fixture_guard RENAME TO identidad_correo');}
      assert.equal((await get(created.id)).body.estado,'ENVIADO');
    });
    await check('Consulta correo: operacion abortada permanece sin confirmar, sin aviso o efectos remotos por leer',async()=>{
      const item=await prepare();await execution.abortar(item.stored.intencion_id,'CANCELACION_SOLICITUD');
      await assertReadOnly(async()=>{assert.equal((await get(item.id)).body.estado,'SIN_CONFIRMAR');});
      assert.equal((await consumer.consultar(created.stored.intencion_id)).estado,'ENVIADO');
    });
  }finally{
    ds.query=originalQuery;await grant(true);authFixture.setPermissionsMode('normal');authFixture.setCatalogMode('normal');
    authFixture.setPrevalidationMode('normal');authFixture.setOperationMode('normal');
  }
};
