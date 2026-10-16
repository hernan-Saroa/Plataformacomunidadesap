/* HTTP/JWT/guards y PostgreSQL del clúster ficticio del verificador principal. */
const assert=require('node:assert/strict'),path=require('node:path'),{randomUUID}=require('node:crypto');
module.exports=async function verifyCapture(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,database,snapshot,identities,authFixture,actor,role,roleId,viewRole,token,send,capture,form,entries,known,secret}=ctx;
  const get=(id,options={})=>send(id,'captura',{method:'GET',...options});
  const grant=enabled=>database.query(`UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1 AND id_permission IN
    (SELECT id_permission FROM auth.permission WHERE code='banco-docentes.rund.manage')`,[roleId,enabled]);
  const original=entries.restaurarCaptura.bind(entries);let id,raw,beforeCommit;
  try{
    await check('Revision captura: JWT vigente y rol o permiso del banco; no acepta token interno, claims de permiso o actor ajeno',async()=>{
      const noExpiry=require(path.join(__dirname,'../backend/rund-service/node_modules/jsonwebtoken')).sign({sub:actor,roles:[role]},secret);
      for(const bearer of [null,'INVALIDO',noExpiry])await get(known,{bearer,status:401});
      await get(known,{bearer:null,headers:{'x-internal-service-token':'ficticio'},status:401});
      await get(known,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      await get(known,{bearer:token(randomUUID()),status:404});
    });
    await check('Revision captura: lista blanca normalizada, proteccion actual de documento/salario y sin envelope o auditoria',async()=>{
      id=randomUUID();raw={...form(),PUNTAJE_SALARIAL:123.5};await send(id,'preparar',{body:{formulario:raw}});
      const stored=await capture(id),document=stored.entrada_manual.contexto.escritura.payload.documentNumber;
      const restricted=await get(id,{bearer:token(actor,[role],{fullAccess:true})});
      assert.equal(restricted.response.headers.get('cache-control'),'private, no-store');
      assert.equal(restricted.body.campos.documentNumber,'*'.repeat(document.length-4)+document.slice(-4));assert.equal(restricted.body.campos.puntajeSalarial,null);
      assert.deepEqual(restricted.body.proteccionDatos,{accesoCompleto:false,camposEnmascarados:['documentNumber','puntajeSalarial']});
      const full=(await get(id,{bearer:token(actor,['GESTION_PROFESORAL'])})).body;
      assert.equal(full.campos.documentNumber,document);assert.equal(full.campos.puntajeSalarial,123.5);assert(full.proteccionDatos.accesoCompleto);
      assert.equal(Object.keys(full).length,5);assert.equal(Object.keys(full.campos).length,47);
      assert.equal(full.campos.correoInstitucional,stored.entrada_manual.contexto.escritura.emailFinal);
      assert(!/rawPayload|comandoAuth|actorId|roles|ip\"|options|huella_|password|token/i.test(JSON.stringify(full)));
      assert.equal((await get(id,{bearer:token(actor,['ADMIN'])})).body.proteccionDatos.accesoCompleto,false);beforeCommit=restricted.body;
    });
    await check('Revision captura: repetir GET no prepara, aplica, confirma, envia correo ni cambia captura o journals',async()=>{
      const before=await snapshot(),owner=await identities(),stored=JSON.stringify(await capture(id));
      const ops=authFixture.operationRequestHeaders().length,pre=authFixture.prevalidationRequestHeaders().length;
      assert.deepEqual((await get(id)).body,beforeCommit);assert.deepEqual((await get(id)).body,beforeCommit);
      assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),owner);assert.equal(JSON.stringify(await capture(id)),stored);
      assert.equal(authFixture.operationRequestHeaders().length,ops);assert.equal(authFixture.prevalidationRequestHeaders().length,pre);
    });
    await check('Revision captura: revocar durante lectura impide entregar datos; nuevo permiso recupera el mismo ID',async()=>{
      entries.restaurarCaptura=async(...args)=>{const result=await original(...args);await grant(false);return result;};
      try{await get(id,{status:403});}finally{entries.restaurarCaptura=original;await grant(true);}
      assert.deepEqual((await get(id)).body,beforeCommit);
    });
    await check('Revision captura: consulta de permisos caida falla cerrada sin usar claims; no depende de catalogo o prevalidacion de escritura',async()=>{
      authFixture.setPermissionsMode('unavailable');try{await get(id,{status:403});}finally{authFixture.setPermissionsMode('normal');}
      authFixture.setPrevalidationMode('unavailable');authFixture.setOperationMode('unavailable');authFixture.setCatalogMode('unavailable');
      try{assert.deepEqual((await get(id)).body,beforeCommit);}finally{authFixture.setPrevalidationMode('normal');authFixture.setOperationMode('normal');authFixture.setCatalogMode('normal');}
    });
    await check('Revision captura: error SQL queda en 503 generico sin query, parametros o formulario en respuesta',async()=>{
      entries.restaurarCaptura=async()=>{throw Object.assign(new Error('QUERY PRIVADA'),{parameters:[raw],query:'SQL PRIVADO'});};
      try{const result=await get(id,{status:503});assert(!/PRIVAD|parameters|query|formulario|@/i.test(JSON.stringify(result.body)));}finally{entries.restaurarCaptura=original;}
    });
    await check('Revision captura: solicitud historica sin captura no se reconstruye y otro actor no la consulta',async()=>{
      const old=(await admin.query('SELECT actor_id,solicitud_id FROM rund.identidad_solicitud WHERE entrada_manual IS NULL LIMIT 1')).rows[0];assert(old);
      await get(old.solicitud_id,{bearer:token(old.actor_id),status:409});await get(old.solicitud_id,{bearer:token(randomUUID()),status:404});
    });
    await check('Revision captura: tras commit permite revisar el mismo contexto sin repetir prevalidacion o escritura',async()=>{
      const result=await send(id,'ejecutar',{body:{}});assert.equal(result.body.estado,'CONFIRMADA');
      const before=await identities(),ops=authFixture.operationRequestHeaders().length,pre=authFixture.prevalidationRequestHeaders().length;
      authFixture.setPrevalidationMode('unavailable');try{assert.deepEqual((await get(id)).body,beforeCommit);}finally{authFixture.setPrevalidationMode('normal');}
      assert.deepEqual(await identities(),before);assert.equal(authFixture.operationRequestHeaders().length,ops);assert.equal(authFixture.prevalidationRequestHeaders().length,pre);
    });
  }finally{entries.restaurarCaptura=original;authFixture.setPermissionsMode('normal');authFixture.setPrevalidationMode('normal');authFixture.setOperationMode('normal');authFixture.setCatalogMode('normal');await grant(true);}
};
