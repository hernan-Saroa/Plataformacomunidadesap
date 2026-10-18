/* Entrada preparatoria real con JWT/roles/permisos, captura SQL y prevalidacion Auth HTTP. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {randomUUID,randomBytes}=require('node:crypto');
module.exports=async function verifyEntry(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service'),compiled=p=>require(path.join(rund,'dist',p)),dep=p=>require(path.join(rund,'node_modules',p));
  const {AuthIdentityManualEntryController}=compiled('common/auth-identity-manual-entry.controller'),{AuthIdentityManualEntryService}=compiled('common/auth-identity-manual-entry.service');
  const {AuthIdentityManualExecutionService}=compiled('common/auth-identity-manual-execution.service');
  const {AuthIdentityManualCaptureService}=compiled('common/auth-identity-manual-capture.service');
  const {AuthIdentityManualAbandonService}=compiled('common/auth-identity-manual-abandon.service');
  const {AuthIdentityManualCloseService}=compiled('common/auth-identity-manual-close.service');
  const {AuthIdentityManualMailStatusService}=compiled('common/auth-identity-manual-mail-status.service');
  const {AuthIdentityManualPreviewService}=compiled('common/auth-identity-manual-preview.service');
  const {AuthIdentityCompensationService}=compiled('common/auth-identity-compensation.service'),{AuthIdentityCompensationClient}=compiled('common/auth-identity-compensation.client');
  const {AuthIdentityRequestService}=compiled('common/auth-identity-request.service'),{AuthIdentityExecutionService}=compiled('common/auth-identity-execution.service');
  const {AuthIdentityValidationClient}=compiled('common/auth-identity-validation.client'),{RundCatalogosClient}=compiled('common/rund-catalogos.client');
  const {JwtStrategy}=compiled('auth/jwt.strategy'),{JwtAuthGuard}=compiled('auth/jwt-auth.guard'),{BancoDocentesRolesGuard}=compiled('modules/banco-docentes/banco-docentes-roles.guard');
  const {AuthIdentityClient}=compiled('common/auth-identity.client'),{ConfigService}=dep('@nestjs/config');
  const {admin,ds,coord,native,client,row,authFixture,database,snapshot,identities,trigger}=ctx;
  const execution=new AuthIdentityExecutionService(ds,coord,native,client),requests=new AuthIdentityRequestService(ds,execution);
  const service=new AuthIdentityManualEntryService(ds,requests,coord,new AuthIdentityValidationClient(),new RundCatalogosClient());
  const manualExecution=new AuthIdentityManualExecutionService(ds,service,execution,new AuthIdentityClient());
  const manualCapture=new AuthIdentityManualCaptureService(service,new AuthIdentityClient());
  const manualAbandon=new AuthIdentityManualAbandonService(ds,new AuthIdentityClient());
  const compensation=new AuthIdentityCompensationService(ds,new AuthIdentityCompensationClient());
  const manualClose=new AuthIdentityManualCloseService(ds,service,execution,compensation,new AuthIdentityClient());
  const mailStatuses=new AuthIdentityManualMailStatusService(ds,new AuthIdentityClient());
  const previewValidation=new AuthIdentityValidationClient(),manualPreview=new AuthIdentityManualPreviewService(ds,service,previewValidation,new AuthIdentityClient());
  const prevalidationHeadersStart=authFixture.prevalidationRequestHeaders().length;
  const actor=randomUUID(),other=randomUUID(),roleId=randomUUID(),viewId=randomUUID(),tag=randomUUID().slice(0,8),role='MANUAL_WRITE_'+tag,viewRole='MANUAL_READ_'+tag;
  const route='/banco-docentes/identidad/solicitudes-manuales';let app,url,jwt,dropNext=false,dropExecution=false,dropAbandon=false,dropClose=false,known,knownForm;
  const form=()=>{const marker=BigInt('0x'+randomUUID().replace(/-/g,'').slice(0,12)).toString();return {...row,DOCUMENTO_IDENTIDAD:'7'+marker,CORREO_INSTITUCIONAL:'entry-'+marker+'@esap.edu.co'};};
  const token=(sub=actor,roles=[role],claims={})=>jwt.sign({sub,roles,...claims});
  const send=async(id,suffix='preparar',{body,bearer=token(),status=200,method=suffix?'POST':'GET',headers={}}={})=>{
    const response=await fetch(url+route+'/'+id+(suffix?'/'+suffix:''),{method,headers:{...(bearer?{authorization:'Bearer '+bearer}:{}),
      ...(body!==undefined?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    if(Array.isArray(status))assert(status.includes(response.status),await response.clone().text());else assert.equal(response.status,status,await response.clone().text());
    return {response,body:await response.json()};
  };
  const capture=async(id,operator=actor)=>(await admin.query('SELECT * FROM rund.identidad_solicitud WHERE actor_id=$1 AND solicitud_id=$2',[operator,id])).rows[0];
  const counts=async()=>(await admin.query('SELECT count(*) FROM rund.identidad_solicitud')).rows[0].count;
  const business=async()=>Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>!name.startsWith('identidad_')));
  try{
    await database.query(`INSERT INTO auth.role(id,code,name,category,is_active) VALUES ($1,$2,$2,'sistema',true),($3,$4,$4,'sistema',true)`,[roleId,role,viewId,viewRole]);
    await database.query(`INSERT INTO auth.role_permissions(id_rol,id_permission,is_active)
      SELECT $1::uuid,id_permission,true FROM auth.permission WHERE code='banco-docentes.rund.manage'
      UNION ALL SELECT $2::uuid,id_permission,true FROM auth.permission WHERE code='banco-docentes.rund.view'`,[roleId,viewId]);
    const {Module}=dep('@nestjs/common'),{NestFactory}=dep('@nestjs/core'),{PassportModule}=dep('@nestjs/passport'),{JwtService}=dep('@nestjs/jwt');
    const secret=randomBytes(32).toString('hex');jwt=new JwtService({secret,signOptions:{expiresIn:'10m'}});
    class FixtureModule{}
    Module({imports:[PassportModule.register({defaultStrategy:'jwt'})],controllers:[AuthIdentityManualEntryController],providers:[JwtStrategy,JwtAuthGuard,BancoDocentesRolesGuard,AuthIdentityClient,
      {provide:ConfigService,useValue:{get:key=>key==='JWT_SECRET'?secret:undefined}},
      {provide:AuthIdentityManualEntryService,useValue:service},{provide:AuthIdentityManualExecutionService,useValue:manualExecution},
      {provide:AuthIdentityManualCaptureService,useValue:manualCapture},{provide:AuthIdentityManualAbandonService,useValue:manualAbandon},
      {provide:AuthIdentityManualCloseService,useValue:manualClose},
      {provide:AuthIdentityManualMailStatusService,useValue:mailStatuses},
      {provide:AuthIdentityManualPreviewService,useValue:manualPreview}]})(FixtureModule);
    app=await NestFactory.create(FixtureModule,{logger:false,abortOnError:false});
    app.use((req,res,next)=>{if(dropNext&&req.path.endsWith('/preparar')){dropNext=false;res.json=()=>{res.destroy();return res;};}
      if(dropExecution&&req.path.endsWith('/ejecutar')){dropExecution=false;res.json=()=>{res.destroy();return res;};}
      if(dropAbandon&&req.path.endsWith('/abandonar')){dropAbandon=false;res.json=()=>{res.destroy();return res;};}
      if(dropClose&&req.path.endsWith('/cerrar')){dropClose=false;res.json=()=>{res.destroy();return res;};}next();});
    await app.listen(0,'127.0.0.1');url=await app.getUrl();
    await check('Entrada manual: JWT y reglas de rol o permiso del banco protegen preparacion, consulta y recuperacion',async()=>{
      const id=randomUUID(),before=await counts();
      for(const bearer of [null,'INVALIDO',token(null)])await send(id,'preparar',{body:{formulario:form()},bearer,status:401});
      await send(id,'preparar',{body:{formulario:form()},bearer:null,headers:{'x-internal-service-token':'ficticio'},status:401});
      const viewer=token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']});
      for(const suffix of ['preparar','reanudar-preparacion',''])await send(id,suffix,{body:suffix?{}:undefined,bearer:viewer,status:403});
      assert.equal(await counts(),before);
    });
    await check('Entrada manual: no acepta actor, contexto, opciones, credenciales o formulario invalido del navegador',async()=>{
      const before=await counts();
      for(const body of [{formulario:form(),actorId:other},{comandoAuth:{}},{formulario:{...form(),actorId:other}},
        {formulario:{...form(),options:{relaxValidation:true}}},{formulario:{...form(),resetToken:'NO GUARDAR'}},{formulario:{...form(),HORAS_PTA:'NO'}}])
        await send(randomUUID(),'preparar',{body,status:400});
      await send('no-id','preparar',{body:{formulario:form()},status:400});assert.equal(await counts(),before);
    });
    await check('Entrada manual: catalogo caido, parcial, vacio o territorial desconocida no reservan intencion',async()=>{
      const before=await counts();try{for(const mode of ['unavailable','partial','empty']){
        authFixture.setCatalogMode(mode);await send(randomUUID(),'preparar',{body:{formulario:form()},status:mode==='empty'?400:503});
      }}finally{authFixture.setCatalogMode('normal');}
      await send(randomUUID(),'preparar',{body:{formulario:{...form(),TERRITORIAL:'LUGAR INEXISTENTE'}},status:400});assert.equal(await counts(),before);
    });
    await check('Entrada manual: captura atomica de formulario y auditoria prepara contexto y prevalida Auth sin escribir identidad o perfil',async()=>{
      const before=await business(),authBefore=await identities(),ops=authFixture.operationRequestHeaders().length;
      known=randomUUID();knownForm=form();const result=await send(known,'preparar',{body:{formulario:knownForm}}),stored=await capture(known);
      assert.equal(result.response.headers.get('cache-control'),'private, no-store');assert.deepEqual(result.body.prevalidacion,{estado:'COMPATIBLE',reserva:false});
      assert.equal(stored.entrada_manual.contexto.comandoAuth.actorId,actor);assert.equal(stored.entrada_manual.contexto.escritura.territorial.id,'999');
      assert.equal(stored.entrada_manual.contexto.escritura.options.audit.sensitiveAccess.fullAccess,false);
      assert.equal((await coord.consultar(stored.intencion_id)).estado,'PREPARADA');assert.equal(authFixture.operationRequestHeaders().length,ops);
      assert.deepEqual(await business(),before);assert.deepEqual(await identities(),authBefore);
      assert(!/DOCUMENTO_IDENTIDAD|@|comandoAuth|formulario|entrada_manual/.test(JSON.stringify(result.body)));
    });
    await check('Entrada manual: reintentar con otra IP o rol recupera captura original y prevalida de nuevo sin consultar catalogo',async()=>{
      const before=await capture(known),catalogCalls=authFixture.bankCatalogRequestCount(),calls=authFixture.prevalidationRequestHeaders().length;
      await send(known,'preparar',{body:{formulario:knownForm},bearer:token(actor,['GESTION_PROFESORAL'])});
      await service.preparar(known,{actorId:actor,roles:['GESTION_PROFESORAL'],fullAccess:true,ip:'192.0.2.1'},knownForm);
      assert.deepEqual(await capture(known),before);assert.equal(authFixture.bankCatalogRequestCount(),catalogCalls);assert.equal(authFixture.prevalidationRequestHeaders().length,calls+2);
      await send(known,'preparar',{body:{formulario:{...knownForm,HORAS_PTA:100}},status:409});
      await send(known,'',{bearer:token(other),status:404});
    });
    await check('Entrada manual: seis preparaciones simultaneas conservan una captura, intencion y UUID Auth',async()=>{
      const id=randomUUID(),body={formulario:form()},results=await Promise.all(Array.from({length:6},()=>send(id,'preparar',{body})));
      results.forEach(result=>assert.deepEqual(result.body,results[0].body));assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_solicitud WHERE solicitud_id=$1 AND actor_id=$2',[id,actor])).rows[0].count,'1');
    });
    await check('Entrada manual: formularios distintos simultaneos tienen un ganador sin reemplazar la captura',async()=>{
      const id=randomUUID(),first=form(),second={...first,HORAS_PTA:100};
      const results=await Promise.all([first,second].map(formulario=>fetch(url+route+'/'+id+'/preparar',{method:'POST',headers:{authorization:'Bearer '+token(),'content-type':'application/json'},body:JSON.stringify({formulario})})));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);await Promise.all(results.map(r=>r.arrayBuffer()));
      const stored=await capture(id);assert([first.HORAS_PTA,second.HORAS_PTA].includes(stored.entrada_manual.formulario.HORAS_PTA));
    });
    await check('Entrada manual: revocar grant o no resolver permisos Auth impide reanudar con el mismo JWT',async()=>{
      const before=await capture(known),bearer=token();await database.query('UPDATE auth.role_permissions SET is_active=false WHERE id_rol=$1',[roleId]);
      try{await send(known,'reanudar-preparacion',{body:{},bearer,status:403});}finally{await database.query('UPDATE auth.role_permissions SET is_active=true WHERE id_rol=$1',[roleId]);}
      try{for(const mode of ['unavailable','missing','partial']){authFixture.setPermissionsMode(mode);await send(known,'',{bearer,status:403});}}
      finally{authFixture.setPermissionsMode('normal');}assert.deepEqual(await capture(known),before);
    });
    await check('Entrada manual: prevalidacion caida, ausente o parcial conserva captura y recuperacion usa el mismo UUID sin catalogo',async()=>{
      for(const mode of ['unavailable','missing','partial']){
        const id=randomUUID();authFixture.setPrevalidationMode(mode);
        try{await send(id,'preparar',{body:{formulario:form()},status:503});}finally{authFixture.setPrevalidationMode('normal');}
        const stored=await capture(id);assert(stored);authFixture.setCatalogMode('unavailable');
        try{const result=await send(id,'reanudar-preparacion',{body:{}});assert.equal(result.body.intencionId,stored.intencion_id);}
        finally{authFixture.setCatalogMode('normal');}assert.deepEqual(await capture(id),stored);
      }
    });
    await check('Entrada manual: fallo de captura no crea reserva o journal y no modifica identidad',async()=>{
      const id=randomUUID(),before=await counts(),authBefore=await identities();
      await trigger('identidad_solicitud','INSERT',async()=>{const result=await send(id,'preparar',{body:{formulario:form()},status:503});assert(!/FICTICIO|parameters|INSERT INTO/.test(JSON.stringify(result.body)));});
      assert.equal(await counts(),before);assert.equal(await capture(id),undefined);assert.deepEqual(await identities(),authBefore);
    });
    await check('Entrada manual: fallo antes del contexto conserva formulario con alias y otra instancia recupera auditoria original',async()=>{
      const id=randomUUID(),raw=form(),camel={documentNumber:raw.DOCUMENTO_IDENTIDAD,documentType:'CC',nombreCompleto:raw.NOMBRE_COMPLETO,genero:'M',fechaNacimiento:raw.FECHA_NACIMIENTO,
        correoInstitucional:raw.CORREO_INSTITUCIONAL,tipoVinculacion:raw.VINCULACION,territorialNombre:raw.TERRITORIAL,dedicacion:'TC',escalafon:raw.CATEGORIA_ESCALAFON,
        fechaInicioVinculacion:raw.INICIO_VINCULACION,actoAdministrativoVinculacion:raw.ACTO_ADMINISTRATIVO,nivelFormacion:raw.NIVEL_FORMACION,pregrado:raw.TITULO_PREGRADO,
        nucleoTematico:raw.NUCLEO_TEMATICO,perfilAcademico:raw.PERFIL_ACADEMICO,horasPta:raw.HORAS_PTA,periodoCarga:raw.PERIODO_CARGA};
      await trigger('identidad_contexto_nativo','INSERT',async()=>{await send(id,'preparar',{body:{formulario:camel},status:503});});
      const stored=await capture(id);assert.equal((await requests.consultar(id,actor)).preparacion,'PENDIENTE');
      authFixture.setCatalogMode('unavailable');try{
        const otherService=new AuthIdentityManualEntryService(ds,new AuthIdentityRequestService(ds,execution),coord,new AuthIdentityValidationClient(),new RundCatalogosClient());
        assert.equal((await otherService.reanudar(id,actor)).preparacion,'LISTA');
      }finally{authFixture.setCatalogMode('normal');}assert.deepEqual(await capture(id),stored);
    });
    await check('Entrada manual: respuesta perdida despues de prevalidar recupera la misma captura sin efectos remotos',async()=>{
      const id=randomUUID(),body={formulario:form()},authBefore=await identities();dropNext=true;await assert.rejects(send(id,'preparar',{body}));
      const stored=await capture(id);await send(id,'reanudar-preparacion',{body:{}});assert.deepEqual(await capture(id),stored);assert.deepEqual(await identities(),authBefore);
    });
    await check('Entrada manual: conflicto de correo se confirma como 409 sin aplicar identidad o aprobar el contexto',async()=>{
      const raw=form();await database.query(`INSERT INTO auth.personas(id_person,num_identificacion,dir_email,nom_largo,tip_identificacion,nom_tercero,gen_tercero)
        VALUES ($1,$2,$3,'CONFLICTO FICTICIO','CC','CONFLICTO','M')`,[randomUUID(),'6'+BigInt('0x'+randomUUID().replace(/-/g,'').slice(0,12)).toString(),raw.CORREO_INSTITUCIONAL]);
      const id=randomUUID(),before=await identities();await send(id,'preparar',{body:{formulario:raw},status:409});assert(await capture(id));assert.deepEqual(await identities(),before);
    });
    await check('Entrada manual: perfil ya confirmado se detecta sin repetir identidad y sin exponer sus datos',async()=>{
      const stored=await capture(known);await execution.ejecutar(stored.intencion_id);const before=await identities(),profile=await business();
      await send(known,'reanudar-preparacion',{body:{},status:409});assert.deepEqual(await identities(),before);assert.deepEqual(await business(),profile);
    });
    await check('Entrada manual: SQL exige captura coherente, conserva inmutabilidad y 014 repetida no inventa capturas historicas',async()=>{
      const stored=await capture(known);
      await assert.rejects(admin.query('UPDATE rund.identidad_solicitud SET entrada_manual=NULL WHERE actor_id=$1',[actor]),/inmutable/);
      for(const [formHash,envelope]of [[stored.huella_formulario,null],[null,stored.entrada_manual],[stored.huella_formulario,{...stored.entrada_manual,extra:true}],
        [stored.huella_formulario,{...stored.entrada_manual,contexto:{...stored.entrada_manual.contexto,comandoAuth:{...stored.entrada_manual.contexto.comandoAuth,actorId:other}}}]])
        await assert.rejects(admin.query(`INSERT INTO rund.identidad_solicitud(actor_id,solicitud_id,huella_comando,huella_contexto,huella_formulario,entrada_manual)
          VALUES($1,$2,$3,$4,$5,$6::jsonb)`,[actor,randomUUID(),stored.huella_comando,stored.huella_contexto,formHash,JSON.stringify(envelope)]),/entrada_check/);
      const id=randomUUID();await trigger('identidad_contexto_nativo','INSERT',async()=>{await send(id,'preparar',{body:{formulario:form()},status:503});});
      const pending=await capture(id),context=pending.entrada_manual.contexto;
      await assert.rejects(native.preparar(pending.intencion_id,context.comandoAuth,{...context.escritura,payload:{...context.escritura.payload,horasAsignables:1}}),/entrada manual RUND capturada/);
      const before=await snapshot();await admin.query(fs.readFileSync(path.join(rund,'db/migrations/014_rund_identidad_entrada_manual.sql'),'utf8'));assert.deepEqual(await snapshot(),before);
    });
    await check('Entrada manual: historicos sin captura no se reconstruyen y consultas no filtran formulario o credenciales',async()=>{
      const old=(await admin.query('SELECT * FROM rund.identidad_solicitud WHERE entrada_manual IS NULL LIMIT 1')).rows[0];assert(old);
      await send(old.solicitud_id,'reanudar-preparacion',{body:{},bearer:token(old.actor_id),status:409});
      const {body}=await send(known,'');assert(body.entradaCapturada);assert(!/@|formulario|comandoAuth|entrada_manual|password|token/i.test(JSON.stringify(body)));
      await send(known,'reanudar-preparacion',{body:{formulario:knownForm},status:400});
      assert.equal((await database.query('SELECT count(*) FROM rund.identidad_solicitud')).rows[0].count,'0');
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      const headers=authFixture.prevalidationRequestHeaders().slice(prevalidationHeadersStart);assert(headers.length>0);
      assert(headers.every(h=>h.tokenMatches&&!h.authorizationForwarded&&!h.cookieForwarded));
    });
    await require('./verify-rund-manual-preview.cjs')(pgConfig,runtime,check,{...ctx,actor,role,roleId,viewRole,token,send,capture,form,known,knownForm,
      entries:service,previewValidation,secret});
    await require('./verify-rund-manual-execution.cjs')(pgConfig,runtime,check,{...ctx,actor,role,roleId,viewRole,token,send,capture,form,
      execution,entries:service,manualExecution,known,knownForm,jwt,secret,dropExecutionResponse:()=>{dropExecution=true;}});
    await require('./verify-rund-manual-capture.cjs')(pgConfig,runtime,check,{...ctx,actor,role,roleId,viewRole,token,send,capture,form,
      entries:service,known,jwt,secret});
    await require('./verify-rund-manual-abandon.cjs')(pgConfig,runtime,check,{...ctx,actor,role,roleId,viewRole,token,send,capture,form,
      entries:service,requests,known,jwt,secret,dropAbandonResponse:()=>{dropAbandon=true;}});
    await require('./verify-rund-manual-close.cjs')(pgConfig,runtime,check,{...ctx,actor,role,roleId,viewRole,token,send,capture,form,
      execution,compensation,manualClose,known,jwt,secret,dropCloseResponse:()=>{dropClose=true;}});
    await require('./verify-rund-manual-mail-status.cjs')(pgConfig,runtime,check,{...ctx,actor,role,roleId,viewRole,token,send,capture,form,
      execution,jwt,secret});
  }finally{authFixture.setCatalogMode('normal');authFixture.setPermissionsMode('normal');authFixture.setPrevalidationMode('normal');if(app)await app.close();}
};
