/* Preview opcional: HTTP/JWT y Auth reales, invariantes SQL en el clúster temporal. */
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function verifyManualPreview(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,ds,database,snapshot,identities,authFixture,actor,role,roleId,viewRole,token,send,form,known,knownForm,capture,entries,previewValidation}=ctx;
  const dto={version:1,compatibilidad:'COMPATIBLE_AL_CONSULTAR',reserva:false,solicitudCreada:false,ejecucionAutorizada:false,requierePreparacion:true};
  const preview=(body={formulario:form()},options={})=>send('previsualizar','',{method:'POST',body,...options});
  const stable=async()=>({rund:await snapshot(),auth:await identities(),operations:authFixture.operationRequestHeaders().length,
    sequence:(await admin.query('SELECT last_value,is_called FROM rund.docente_id_rund_seq')).rows});
  const unchanged=async work=>{const before=await stable();await work();assert.deepEqual(await stable(),before);};
  const grant=value=>database.query('UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1',[roleId,value]);
  const originalQuery=ds.query,originalTransaction=ds.transaction,originalValidate=previewValidation.validar;
  const {JwtService}=require(path.join(__dirname,'../backend/rund-service/node_modules/@nestjs/jwt'));
  const bareJwt=new JwtService({secret:ctx.secret});
  try{
    ds.query=async function(sql,...args){assert.match(sql,/^SELECT /,'Preview solo admite consultas SQL locales');return originalQuery.call(this,sql,...args);};
    ds.transaction=()=>{throw Error('Preview no debe abrir transacciones de escritura');};
    await check('Preview manual: JWT, actor y manage vigentes sin autoridad de body o claims falsos',async()=>unchanged(async()=>{
      for(const bearer of [null,'INVALIDO',token(null)])await preview(undefined,{bearer,status:401});
      await preview(undefined,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      for(const body of [{formulario:form(),actorId:actor},{formulario:form(),solicitudId:known},{},null])await preview(body,{status:400});
    }));
    await check('Preview manual: compatibilidad mínima repetible sin solicitudes, journal, perfil, identidad o consumo de secuencia',async()=>unchanged(async()=>{
      const input={formulario:form()};for(let i=0;i<3;i++){
        const result=await preview(input);assert.deepEqual(result.body,dto);assert.equal(result.response.headers.get('cache-control'),'private, no-store');
      }
    }));
    await check('Preview manual: campos inválidos y catálogo fallido no crean captura o reserva',async()=>unchanged(async()=>{
      for(const key of ['actorId','password','territorialId','jwt'])await preview({formulario:{...form(),[key]:'NO GUARDAR'}},{status:400});
      for(const mode of ['unavailable','partial','empty']){
        authFixture.setCatalogMode(mode);try{await preview(undefined,{status:mode==='empty'?400:503});}finally{authFixture.setCatalogMode('normal');}
      }
    }));
    await check('Preview manual: Auth caído, ausente o parcial falla sin guardar aprobación o solicitud',async()=>unchanged(async()=>{
      for(const mode of ['unavailable','missing','partial']){
        authFixture.setPrevalidationMode(mode);try{await preview(undefined,{status:503});}finally{authFixture.setPrevalidationMode('normal');}
      }
    }));
    await check('Preview manual: propuesta reutilizada conserva las huellas y contexto de la preparación anterior',async()=>unchanged(async()=>{
      const original=await capture(known),proposed=await entries.proponer({actorId:actor,roles:[role.toUpperCase()],fullAccess:false,ip:'127.0.0.1'},knownForm);
      assert.equal(proposed.commandHash,original.huella_comando,'Huella del comando Auth');assert.equal(proposed.contextHash,original.huella_contexto,'Huella del contexto nativo');
      assert.deepEqual(proposed.envelope,original.entrada_manual);
    }));
    await check('Preview manual: revocación tras Auth impide compatibilidad y consultar no reanuda capturas existentes',async()=>unchanged(async()=>{
      previewValidation.validar=async function(...args){const result=await originalValidate.apply(this,args);await grant(false);return result;};
      try{await preview({formulario:knownForm},{status:403});}finally{previewValidation.validar=originalValidate;await grant(true);}
      await preview({formulario:knownForm},{status:409}); // El escenario anterior ya confirmó este perfil; preview no reanuda ni actualiza.
    }));
    await check('Preview manual: sesión ADMIN vencida durante Auth no devuelve compatibilidad',async()=>unchanged(async()=>{
      previewValidation.validar=async function(...args){const result=await originalValidate.apply(this,args);await new Promise(resolve=>setTimeout(resolve,2300));return result;};
      try{await preview(undefined,{bearer:bareJwt.sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+2}),status:401});}
      finally{previewValidation.validar=originalValidate;}
    }));
  }finally{
    ds.query=originalQuery;ds.transaction=originalTransaction;previewValidation.validar=originalValidate;
    authFixture.setCatalogMode('normal');authFixture.setPrevalidationMode('normal');await grant(true);
  }
};
