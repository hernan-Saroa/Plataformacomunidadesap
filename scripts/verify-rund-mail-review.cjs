/* JWT, permisos y SQL reales en el cluster temporal; revisión sin envíos. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {randomUUID,randomBytes}=require('node:crypto');
module.exports=async function verifyMailReview(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const dep=n=>require(path.join(rund,'node_modules',n)),compiled=n=>require(path.join(rund,'dist',n));
  const {admin,ds,database,queued,mailRow,snapshot,identities,deliveries,authFixture}=ctx;
  const {AuthIdentityMailReviewService}=compiled('common/auth-identity-mail-review.service');
  const {AuthIdentityMailReviewController}=compiled('common/auth-identity-mail-review.controller');
  const {AuthIdentityMailReviewCloseService}=compiled('common/auth-identity-mail-review-close.service');
  const {AuthIdentityMailDiagnosticService}=compiled('common/auth-identity-mail-diagnostic.service');
  const {AuthIdentityMailOmissionService}=compiled('common/auth-identity-mail-omission.service');
  const {AuthIdentityMailValidationClient}=compiled('common/auth-identity-mail-validation.client');
  const {AuthIdentityMailReconciliationService}=compiled('common/auth-identity-mail-reconciliation.service');
  const {AuthIdentityMailService}=compiled('common/auth-identity-mail.service');
  const {AuthIdentityClient}=compiled('common/auth-identity.client');
  const {JwtStrategy}=compiled('auth/jwt.strategy'),{JwtAuthGuard}=compiled('auth/jwt-auth.guard');
  const {BancoDocentesRolesGuard}=compiled('modules/banco-docentes/banco-docentes-roles.guard');
  const {ConfigService}=dep('@nestjs/config');
  const service=new AuthIdentityMailReviewService(ds,new AuthIdentityClient()),recon=new AuthIdentityMailReconciliationService(ds);
  const closures=new AuthIdentityMailReviewCloseService(ds,new AuthIdentityClient());
  const diagnostics=new AuthIdentityMailDiagnosticService(ds,new AuthIdentityClient(),new AuthIdentityMailValidationClient());
  const omissions=new AuthIdentityMailOmissionService(ds,new AuthIdentityClient(),new AuthIdentityMailValidationClient());
  const actor=randomUUID(),other=randomUUID(),roleId=randomUUID(),viewId=randomUUID(),tag=randomUUID().slice(0,8);
  const role='MAIL_REVIEW_'+tag,viewRole='MAIL_VIEW_'+tag,secret=randomBytes(32).toString('hex');
  const {Module}=dep('@nestjs/common'),{NestFactory}=dep('@nestjs/core'),{PassportModule}=dep('@nestjs/passport'),{JwtService}=dep('@nestjs/jwt');
  const jwt=new JwtService({secret,signOptions:{expiresIn:'5m'}}),bareJwt=new JwtService({secret});
  const route='/banco-docentes/identidad/correos/revisiones';let app,url,dropNext=false,known,writeHook,readHook;
  const originalTransaction=ds.transaction,originalQuery=ds.query;
  const token=(sub=actor,roles=[role],claims={})=>jwt.sign({sub,roles,...claims});
  const grant=enabled=>database.query('UPDATE auth.role_permissions SET is_active=$2 WHERE id_rol=$1',[roleId,enabled]);
  const send=async(suffix='',{method='GET',body,bearer=token(),status=200,headers={}}={})=>{
    const response=await fetch(url+route+suffix,{method,headers:{...(bearer?{Authorization:'Bearer '+bearer}:{}),
      ...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    assert.equal(response.status,status,await response.clone().text());return{response,body:await response.json()};
  };
  const reserve=async item=>{await admin.query("UPDATE rund.identidad_correo SET estado='ENVIANDO',intento_id=$2,iniciada_en=clock_timestamp() WHERE intencion_id=$1",[item.id,randomUUID()]);return item;};
  const fresh=async()=>reserve(await queued());
  const open=item=>send('/por-intencion/'+item.id,{method:'POST',body:{}});
  const rawCase=async id=>(await admin.query('SELECT * FROM rund.identidad_correo_revision WHERE caso_id=$1',[id])).rows[0];
  const safeState=async()=>({mail:(await admin.query('SELECT * FROM rund.identidad_correo ORDER BY intencion_id')).rows,
    results:(await admin.query('SELECT * FROM rund.identidad_correo_resultado ORDER BY intencion_id')).rows,
    business:Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>!name.startsWith('identidad_'))),owner:await identities(),sent:deliveries()});
  const unchanged=async work=>{const before=await snapshot(),owner=await identities(),sent=deliveries();await work();
    assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),owner);assert.equal(deliveries(),sent);};
  try{
    await database.query(`INSERT INTO auth.role(id,code,name,category,is_active) VALUES($1,$2,$2,'sistema',true),($3,$4,$4,'sistema',true)`,[roleId,role,viewId,viewRole]);
    await database.query(`INSERT INTO auth.role_permissions(id_rol,id_permission,is_active)
      SELECT $1::uuid,id_permission,true FROM auth.permission WHERE code='banco-docentes.rund.manage'
      UNION ALL SELECT $2::uuid,id_permission,true FROM auth.permission WHERE code='banco-docentes.rund.view'`,[roleId,viewId]);
    class FixtureModule{}
    Module({imports:[PassportModule.register({defaultStrategy:'jwt'})],controllers:[AuthIdentityMailReviewController],providers:[JwtStrategy,JwtAuthGuard,BancoDocentesRolesGuard,AuthIdentityClient,
      {provide:ConfigService,useValue:{get:key=>key==='JWT_SECRET'?secret:undefined}},
      {provide:AuthIdentityMailReviewService,useValue:service},
      {provide:AuthIdentityMailReviewCloseService,useValue:closures},
      {provide:AuthIdentityMailDiagnosticService,useValue:diagnostics},
      {provide:AuthIdentityMailOmissionService,useValue:omissions}]})(FixtureModule);
    app=await NestFactory.create(FixtureModule,{logger:false,abortOnError:false});
    app.use((req,res,next)=>{if(dropNext&&req.method==='POST'){dropNext=false;res.json=()=>{res.destroy();return res;};}next();});
    await app.listen(0,'127.0.0.1');url=await app.getUrl();
    ds.query=async function(sql,...args){const rows=await originalQuery.call(this,sql,...args);if(readHook&&(sql.startsWith('SELECT c.*')||sql.startsWith('SELECT c.caso_id')||sql.startsWith('SELECT m.intencion_id')))await readHook();return rows;};
    ds.transaction=async function(...args){const work=args.pop();return originalTransaction.call(this,...args,async manager=>work(new Proxy(manager,{get(target,key){
      if(key==='query')return async(sql,values)=>{const rows=await target.query(sql,values);
        if(writeHook&&/INSERT INTO rund.identidad_correo_revision|UPDATE rund.identidad_correo_revision SET|INSERT INTO rund.identidad_correo_omision/.test(sql))await writeHook();return rows;};
      const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }})));};
    await check('Revision correo: JWT, actor UUID, exp vigente y manage efectivo son obligatorios',async()=>{
      await unchanged(async()=>{
        for(const bearer of [null,'INVALIDO',bareJwt.sign({sub:actor,roles:[role]})])await send('',{bearer,status:401});
        await send('',{bearer:null,headers:{'x-internal-service-token':'ficticio'},status:401});
        await send('',{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
        await send('',{bearer:token(null),status:401});
      });
    });
    await check('Revision correo: registrar intento sin resultado es explícito, idempotente y conserva correo e identidad',async()=>{
      const item=await fresh(),before=await safeState();const result=await open(item);known={...item,caseId:result.body.casoId};
      assert.equal(result.response.headers.get('cache-control'),'private, no-store');assert.equal(Object.keys(result.body).length,12);
      assert.equal(result.body.registradaPor,actor);assert.equal(result.body.estado,'PENDIENTE');assert.equal(result.body.estadoCorreo,'ENVIANDO');assert.equal(result.body.resultadoRegistrado,false);
      assert(!/intento|document|username|password|contexto|@/i.test(JSON.stringify(result.body)));
      const saved=await rawCase(known.caseId);assert.deepEqual((await open(item)).body,result.body);assert.deepEqual(await rawCase(known.caseId),saved);assert.deepEqual(await safeState(),before);
    });
    await check('Revision correo: pendientes, aceptados o resultado registrado no fabrican casos sin evidencia',async()=>{
      for(const mode of ['PENDIENTE','ACEPTADO','INCIERTO']){
        const item=await queued();if(mode!=='PENDIENTE'){
          await reserve(item);await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,mode);await recon.conciliar(item.id);
        }
        await unchanged(async()=>send('/por-intencion/'+item.id,{method:'POST',body:{},status:409}));
      }
      const historical=await fresh();await admin.query("UPDATE rund.identidad_correo SET estado='INCIERTO',resuelta_en=clock_timestamp() WHERE intencion_id=$1",[historical.id]);
      assert.equal((await open(historical)).body.estadoCorreoInicial,'INCIERTO');
    });
    await check('Revision correo: cuerpo no elige responsable, fechas, resultado, envío o cierre',async()=>{
      await unchanged(async()=>{
        for(const body of [{actorId:other},{asumidaPor:other},{estado:'CERRADA'},{resultado:'ACEPTADO'},{reenviar:true},{creadaEn:'2000-01-01'}]){
          await send('/por-intencion/'+known.id,{method:'POST',body,status:400});await send('/'+known.caseId+'/asumir',{method:'POST',body,status:400});
        }
        for(const action of ['reenviar','aceptar','conciliar'])await send('/'+known.caseId+'/'+action,{method:'POST',body:{},status:404});
        await send('/'+known.caseId+'/cerrar',{method:'POST',body:{},status:409});
      });
    });
    await check('Revision correo: seis registros simultáneos conservan caso, creador y fechas sin duplicar intentos',async()=>{
      const item=await fresh(),before=await safeState(),results=await Promise.all(Array.from({length:6},()=>open(item)));
      results.forEach(x=>assert.deepEqual(x.body,results[0].body));assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_correo_revision WHERE intencion_id=$1',[item.id])).rows[0].count,'1');assert.deepEqual(await safeState(),before);
    });
    await check('Revision correo: asignación idempotente toma actor de sesión y dos responsables tienen un ganador',async()=>{
      const item=await fresh(),opened=(await open(item)).body,before=await safeState();
      const requests=await Promise.all([actor,other].map(sub=>fetch(url+route+'/'+opened.casoId+'/asumir',{method:'POST',headers:{Authorization:'Bearer '+token(sub),'Content-Type':'application/json'},body:'{}'})));
      assert.deepEqual(requests.map(r=>r.status).sort(),[200,409]);await Promise.all(requests.map(r=>r.arrayBuffer()));
      const saved=await rawCase(opened.casoId);assert([actor,other].includes(saved.asumida_por));
      await send('/'+opened.casoId+'/asumir',{method:'POST',body:{},bearer:token(saved.asumida_por)});assert.deepEqual(await rawCase(opened.casoId),saved);assert.deepEqual(await safeState(),before);
    });
    await check('Revision correo: respuesta perdida tras registro o asignación se recupera con el mismo caso',async()=>{
      const item=await fresh();dropNext=true;await assert.rejects(open(item));
      const opened=(await open(item)).body;dropNext=true;await assert.rejects(send('/'+opened.casoId+'/asumir',{method:'POST',body:{}}));
      const saved=await rawCase(opened.casoId);await send('/'+opened.casoId+'/asumir',{method:'POST',body:{}});assert.deepEqual(await rawCase(opened.casoId),saved);
    });
    await check('Revision correo: revocación o caída de Auth impiden lectura con el mismo JWT sin caché',async()=>{
      await send();await grant(false);try{await send('',{status:403});}finally{await grant(true);}
      for(const mode of ['unavailable','missing','partial']){authFixture.setPermissionsMode(mode);try{await send('',{status:403});}finally{authFixture.setPermissionsMode('normal');}}
      readHook=async()=>{readHook=undefined;await grant(false);};
      try{await send('/'+known.caseId,{status:403});}finally{readHook=undefined;await grant(true);}
    });
    await check('Revision correo: revocación durante INSERT/UPDATE revierte caso o asignación y permite recuperación',async()=>{
      const item=await fresh();writeHook=async()=>{writeHook=undefined;await grant(false);};
      try{await send('/por-intencion/'+item.id,{method:'POST',body:{},status:403});}finally{writeHook=undefined;await grant(true);}
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_correo_revision WHERE intencion_id=$1',[item.id])).rows[0].count,'0');
      const opened=(await open(item)).body;writeHook=async()=>{writeHook=undefined;await grant(false);};
      try{await send('/'+opened.casoId+'/asumir',{method:'POST',body:{},status:403});}finally{writeHook=undefined;await grant(true);}
      assert.equal((await rawCase(opened.casoId)).estado,'PENDIENTE');
    });
    await check('Revision correo: sesión ADMIN vencida durante SQL revierte el alta del caso',async()=>{
      const item=await fresh(),bearer=bareJwt.sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+2});
      writeHook=async()=>{writeHook=undefined;await new Promise(resolve=>setTimeout(resolve,2300));};
      try{await send('/por-intencion/'+item.id,{method:'POST',body:{},bearer,status:401});}finally{writeHook=undefined;}
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_correo_revision WHERE intencion_id=$1',[item.id])).rows[0].count,'0');
    });
    await check('Revision correo: resultado tardío conserva historia del caso y no cancela un SMTP en vuelo',async()=>{
      const item=await queued();let finish,seen;const started=new Promise(resolve=>{seen=resolve;});let count=0;
      const consumer=new AuthIdentityMailService(ds,{enviar:()=>{count++;seen();return new Promise(resolve=>{finish=resolve;});}}),sending=consumer.enviarPendiente(item.id);
      try{
        await Promise.race([started,sending.then(()=>{throw Error('No se observó SMTP ficticio');})]);
        const opened=(await open(item)).body;await send('/'+opened.casoId+'/asumir',{method:'POST',body:{}});const saved=await rawCase(opened.casoId);
        finish(true);assert.equal((await sending).estado,'ENVIADO');const current=(await send('/'+opened.casoId)).body;
        assert.equal(current.estado,'EN_REVISION');assert.equal(current.estadoCorreoInicial,'ENVIANDO');assert.equal(current.estadoCorreo,'ENVIADO');assert.equal(current.resultadoRegistrado,true);assert.equal(current.requiereRevision,false);
        assert.deepEqual(await rawCase(opened.casoId),saved);await send('/'+opened.casoId+'/asumir',{method:'POST',body:{}});assert.equal(count,1);
      }finally{if(finish)finish(true);await sending.catch(()=>{});}
    });
    await check('Revision correo: aceptación posterior antes de asignar no permite nueva asignación ni borra caso',async()=>{
      const item=await fresh(),opened=(await open(item)).body,saved=await rawCase(opened.casoId);
      await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'ACEPTADO');await recon.conciliar(item.id);
      await unchanged(async()=>send('/'+opened.casoId+'/asumir',{method:'POST',body:{},status:409}));assert.deepEqual(await rawCase(opened.casoId),saved);
      assert.equal((await open(item)).body.requiereRevision,false);
    });
    await check('Revision correo: cursor conserva microsegundos, empates y filtro sin duplicar casos',async()=>{
      for(let i=0;i<4;i++){
        const item=await fresh(),mail=await mailRow(item.id);
        await admin.query(`INSERT INTO rund.identidad_correo_revision(intencion_id,intento_id,estado_correo_inicial,registrada_por,creada_en)
          VALUES($1,$2,'ENVIANDO',$3,$4::timestamptz)`,[item.id,mail.intento_id,actor,'2099-01-01T00:00:00.12345'+(i===3?'7':'6')+'Z']);
      }
      let cursor,seen=[],pages=0;
      do{const result=await send('?limite=2&estado=PENDIENTE'+(cursor?'&cursor='+encodeURIComponent(cursor):''));seen.push(...result.body.casos.map(x=>x.casoId));cursor=result.body.siguienteCursor;assert(++pages<100);}while(cursor);
      const expected=(await admin.query("SELECT caso_id FROM rund.identidad_correo_revision WHERE estado='PENDIENTE' ORDER BY creada_en,caso_id")).rows.map(x=>x.caso_id);
      assert.deepEqual(seen,expected);assert.equal(new Set(seen).size,seen.length);
      const first=(await send('?limite=1&estado=PENDIENTE')).body;await send('?estado=EN_REVISION&cursor='+first.siguienteCursor,{status:400});
      for(const filter of ['limite=0','limite=101','estado=CERRADA','cursor=xxx','actorId='+actor])await send('?'+filter,{status:400});
    });
    await check('Revision correo: triggers impiden borrado, cierre, reasignación o identidad del caso alterada',async()=>{
      const before=await snapshot();for(const sql of ['DELETE FROM rund.identidad_correo_revision WHERE caso_id=$1',
        "UPDATE rund.identidad_correo_revision SET estado='CERRADA' WHERE caso_id=$1",
        'UPDATE rund.identidad_correo_revision SET intento_id=gen_random_uuid() WHERE caso_id=$1',
        'UPDATE rund.identidad_correo_revision SET registrada_por=gen_random_uuid() WHERE caso_id=$1',
        'UPDATE rund.identidad_correo_revision SET creada_en=clock_timestamp() WHERE caso_id=$1'])await assert.rejects(admin.query(sql,[known.caseId]),/revision|Revision/);
      const pending=await queued();await assert.rejects(admin.query(`INSERT INTO rund.identidad_correo_revision(intencion_id,intento_id,estado_correo_inicial,registrada_por)
        VALUES($1,$2,'ENVIANDO',$3)`,[pending.id,randomUUID(),actor]),/sin resultado/);
      const after=await snapshot();delete before.identidad_operacion;delete after.identidad_operacion;
      // El alta ficticia anterior agrega negocio; los casos protegidos siguen iguales.
      assert.deepEqual(after.identidad_correo_revision,before.identidad_correo_revision);
    });
    await check('Revision correo: migración 018 repetible conserva casos, responsables y correo sin backfill automático',async()=>{
      const sql=fs.readFileSync(path.join(rund,'db/migrations/018_rund_identidad_correo_revision.sql'),'utf8');await unchanged(async()=>{await admin.query(sql);await admin.query(sql);
        // 018 es histórico: restablecer la extensión posterior en orden, sin tocar datos.
        await admin.query(fs.readFileSync(path.join(rund,'db/migrations/021_rund_identidad_correo_revision_incierto.sql'),'utf8'));});
    });
    await check('Revision correo: errores SQL no entregan parámetros y falta de caso conserva 404',async()=>{
      await send('/'+randomUUID(),{status:404});await send('/por-intencion/'+randomUUID(),{method:'POST',body:{},status:404});
      await admin.query('ALTER TABLE rund.identidad_correo_revision RENAME TO fixture_mail_review_hidden');
      try{const response=await send('',{status:503});assert(!JSON.stringify(response.body).includes('fixture_mail_review_hidden'));}
      finally{await admin.query('ALTER TABLE rund.fixture_mail_review_hidden RENAME TO identidad_correo_revision');}
      await assert.rejects(ds.query('SELECT * FROM auth.personas'),/does not exist/);
    });
    await require('./verify-rund-mail-review-close.cjs')(pgConfig,runtime,check,{...ctx,closures,recon,send,token,actor,other,viewRole,bareJwt,
      fresh,open,rawCase,unchanged,grant,request:(suffix,options)=>fetch(url+route+suffix,options),
      setWriteHook:fn=>{writeHook=fn;},setReadHook:fn=>{readHook=fn;},dropNextResponse:()=>{dropNext=true;}});
    await require('./verify-rund-mail-diagnostic.cjs')(pgConfig,runtime,check,{...ctx,diagnostics,recon,closures,send,token,actor,other,viewRole,bareJwt,
      fresh,open,rawCase,unchanged,grant,setReadHook:fn=>{readHook=fn;}});
    await require('./verify-rund-mail-omission.cjs')(pgConfig,runtime,check,{...ctx,omissions,send,token,actor,other,viewRole,bareJwt,fresh,unchanged,grant,
      request:(suffix,options)=>fetch(url+route+suffix,options),setWriteHook:fn=>{writeHook=fn;},setReadHook:fn=>{readHook=fn;},dropNextResponse:()=>{dropNext=true;}});
    await require('./verify-rund-mail-uncertain.cjs')(pgConfig,runtime,check,{...ctx,recon,send,token,actor,other,viewRole,bareJwt,fresh,open,rawCase,unchanged,grant,
      request:(suffix,options)=>fetch(url+route+suffix,options),setWriteHook:fn=>{writeHook=fn;},dropNextResponse:()=>{dropNext=true;}});
    await require('./verify-rund-mail-workspace-http.cjs')(pgConfig,runtime,check,{...ctx,recon,send,token,actor,other,viewRole,secret,fresh,rawCase,grant,rundUrl:url,
      setReadHook:fn=>{readHook=fn;},dropNextResponse:()=>{dropNext=true;}});
  }finally{ds.query=originalQuery;ds.transaction=originalTransaction;readHook=undefined;writeHook=undefined;
    authFixture.setPermissionsMode('normal');await grant(true);if(app)await app.close();}
};
