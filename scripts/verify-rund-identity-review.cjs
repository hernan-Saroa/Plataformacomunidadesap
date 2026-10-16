/* Casos reales, JWT/guards reales y permisos Auth por HTTP, siempre en el cluster ficticio. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {randomUUID,randomBytes}=require('node:crypto');
module.exports=async function verifyReview(pgConfig,runtime,check,ctx) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const dep=name=>require(path.join(rund,'node_modules',name)),compiled=name=>require(path.join(rund,'dist',name));
  const {AuthIdentityReviewService}=compiled('common/auth-identity-review.service'),{AuthIdentityReviewController}=compiled('common/auth-identity-review.controller');
  const {JwtStrategy}=compiled('auth/jwt.strategy'),{JwtAuthGuard}=compiled('auth/jwt-auth.guard'),{PermissionsGuard}=compiled('auth/permissions.guard');
  const {AuthIdentityClient}=compiled('common/auth-identity.client'),{ConfigService}=dep('@nestjs/config');
  const {admin,ds,authFixture,database,identities,execution,compensation,fresh,done}=ctx;
  const reviews=new AuthIdentityReviewService(ds),baseRoute='/banco-docentes/identidad/revisiones';
  const actor=randomUUID(),otherActor=randomUUID(),roleId=randomUUID(),viewRoleId=randomUUID(),tag=randomUUID().slice(0,8);
  const role='REVISION_OWNER_'+tag,viewRole='REVISION_VIEW_'+tag,secret=randomBytes(32).toString('hex');
  let app,url,jwt,dropNextAssignment=false,selected;
  const headersStart=authFixture.permissionsRequestHeaders().length;
  const token=(sub=actor,roles=[role],extra={})=>jwt.sign({sub,roles,...extra});
  const request=async(route='',{method='GET',body,bearer=token(),status=200,headers={}}={})=>{
    const response=await fetch(url+baseRoute+route,{method,headers:{...(bearer?{Authorization:'Bearer '+bearer}:{}),
      ...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    assert.equal(response.status,status,await response.clone().text());return {response,body:await response.json()};
  };
  const rawCase=async id=>(await admin.query('SELECT * FROM rund.identidad_revision WHERE caso_id=$1',[id])).rows[0];
  const newCase=async()=>{const item=await fresh({removeUser:true});await compensation.resolver(item.id);
    const status=await execution.consultar(item.id);assert(status.casoRevision);return {...item,caseId:status.casoRevision.casoId};};
  const trigger=async(event,run)=>{
    await admin.query(`CREATE FUNCTION rund.reject_review_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO CASO'; END $$;
      CREATE TRIGGER reject_review_fixture BEFORE ${event} ON rund.identidad_revision FOR EACH ROW EXECUTE FUNCTION rund.reject_review_fixture()`);
    try{await run();}finally{await admin.query('DROP TRIGGER reject_review_fixture ON rund.identidad_revision;DROP FUNCTION rund.reject_review_fixture()');}
  };
  try {
    await database.query(`INSERT INTO auth.role(id,code,name,category,is_active) VALUES ($1,$2,$2,'sistema',true),($3,$4,$4,'sistema',true)`,[roleId,role,viewRoleId,viewRole]);
    await database.query(`INSERT INTO auth.role_permissions(id_rol,id_permission,is_active)
      SELECT $1::uuid,id_permission,true FROM auth.permission WHERE code='banco-docentes.rund.manage'
      UNION ALL SELECT $2::uuid,id_permission,true FROM auth.permission WHERE code='banco-docentes.rund.view'`,[roleId,viewRoleId]);
    const {Module}=dep('@nestjs/common'),{NestFactory}=dep('@nestjs/core'),{PassportModule}=dep('@nestjs/passport'),{JwtService}=dep('@nestjs/jwt');
    jwt=new JwtService({secret,signOptions:{expiresIn:'5m'}});
    class ReviewFixtureModule {}
    Module({imports:[PassportModule.register({defaultStrategy:'jwt'})],controllers:[AuthIdentityReviewController],providers:[JwtStrategy,JwtAuthGuard,PermissionsGuard,AuthIdentityClient,
      {provide:ConfigService,useValue:{get:key=>key==='JWT_SECRET'?secret:undefined}},
      {provide:AuthIdentityReviewService,useValue:reviews}]})(ReviewFixtureModule);
    app=await NestFactory.create(ReviewFixtureModule,{logger:false,abortOnError:false});
    app.use((req,res,next)=>{if(dropNextAssignment&&req.method==='POST'&&req.path.endsWith('/asumir')){dropNextAssignment=false;res.json=()=>{res.destroy();return res;};}next();});
    await app.listen(0,'127.0.0.1');url=await app.getUrl();
    await check('Revision identidad: cada recibo REVISION_REQUERIDA tiene un caso atomico y las compensadas no lo generan',async()=>{
      const rows=(await admin.query(`SELECT r.intencion_id,c.caso_id,r.motivo,c.estado FROM rund.identidad_resolucion_auth r
        LEFT JOIN rund.identidad_revision c USING(intencion_id) WHERE r.estado='REVISION_REQUERIDA'`)).rows;
      assert(rows.length>0);rows.forEach(row=>assert(row.caso_id));selected=rows.find(row=>row.estado==='PENDIENTE');assert(selected);
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_revision WHERE intencion_id=$1',[done.id])).rows[0].count,'0');
      assert.equal((await execution.consultar(done.id)).casoRevision,null);
    });
    await check('Revision identidad: fallo de alta del caso revierte recibo RUND; GET propietario recupera ambos sin tocar identidad',async()=>{
      const item=await fresh({removeUser:true}),before=await identities();
      await trigger('INSERT',async()=>{await assert.rejects(compensation.resolver(item.id),/FALLO FICTICIO CASO/);});
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_resolucion_auth WHERE intencion_id=$1',[item.id])).rows[0].count,'0');
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_revision WHERE intencion_id=$1',[item.id])).rows[0].count,'0');
      assert.equal((await execution.consultar(item.id)).casoRevision,null);await compensation.reconciliar(item.id);
      const status=await execution.consultar(item.id);assert(status.casoRevision);assert(status.resolucionAuthPendiente);assert(status.revisionAuthRequerida);assert.deepEqual(await identities(),before);
    });
    await check('Revision identidad: API exige JWT y permiso efectivo; token de servicio o permisos declarados por el solicitante no bastan',async()=>{
      await request('',{bearer:null,status:401});await request('',{bearer:null,headers:{'x-internal-service-token':'ficticio'},status:401});
      await request('',{bearer:'JWT_INVALIDO',status:401});await request('',{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      const allowed=await request();assert(Array.isArray(allowed.body.casos));assert.equal(allowed.response.headers.get('cache-control'),'private, no-store');
      await request('/'+selected.caso_id,{bearer:token(actor,[viewRole]),status:403});
    });
    await check('Revision identidad: revocacion del grant y caida de Auth deniegan acceso con el mismo JWT sin cache',async()=>{
      const bearer=token();await request('',{bearer});
      await database.query('UPDATE auth.role_permissions SET is_active=false WHERE id_rol=$1',[roleId]);
      try{await request('',{bearer,status:403});}finally{await database.query('UPDATE auth.role_permissions SET is_active=true WHERE id_rol=$1',[roleId]);}
      try{for(const mode of ['unavailable','missing','partial']){authFixture.setPermissionsMode(mode);await request('',{bearer,status:403});}}
      finally{authFixture.setPermissionsMode('normal');}
      await request('',{bearer});
    });
    await check('Revision identidad: body no elige responsable, fecha o cierre y una sesion sin actor no asigna',async()=>{
      const before=await rawCase(selected.caso_id);
      for(const body of [{actorId:otherActor},{asumidaPor:otherActor},{estado:'CERRADA'},{asumidaEn:'2000-01-01'}])
        await request('/'+selected.caso_id+'/asumir',{method:'POST',body,status:400});
      await request('/'+selected.caso_id+'/asumir',{method:'POST',body:{},bearer:token(null),status:401});
      assert.deepEqual(await rawCase(selected.caso_id),before);
    });
    await check('Revision identidad: asignacion guarda actor de sesion y fecha una sola vez, manteniendo pendiente y datos intactos',async()=>{
      const before=await identities(),first=await request('/'+selected.caso_id+'/asumir',{method:'POST',body:{}});
      assert.equal(first.body.estado,'EN_REVISION');assert.equal(first.body.asumidaPor,actor);assert.match(first.body.asumidaEn,/\.\d{6}Z$/);
      const original=await rawCase(selected.caso_id);assert.deepEqual((await request('/'+selected.caso_id+'/asumir',{method:'POST',body:{}})).body,first.body);
      assert.deepEqual(await rawCase(selected.caso_id),original);assert.deepEqual(await identities(),before);
      const status=await execution.consultar(selected.intencion_id);assert.equal(status.casoRevision.estado,'EN_REVISION');assert(status.resolucionAuthPendiente);assert(status.revisionAuthRequerida);
    });
    await check('Revision identidad: seis asignaciones del mismo responsable convergen sin cambiar fecha',async()=>{
      const item=await newCase(),results=await Promise.all(Array.from({length:6},()=>request('/'+item.caseId+'/asumir',{method:'POST',body:{}})));
      results.forEach(result=>assert.deepEqual(result.body,results[0].body));assert.equal(results[0].body.asumidaPor,actor);
    });
    await check('Revision identidad: dos responsables simultaneos tienen un ganador y otro recibe conflicto sin reasignacion',async()=>{
      const item=await newCase();
      const send=async sub=>fetch(url+baseRoute+'/'+item.caseId+'/asumir',{method:'POST',headers:{Authorization:'Bearer '+token(sub),'Content-Type':'application/json'},body:'{}'});
      const results=await Promise.all([send(actor),send(otherActor)]);assert.deepEqual(results.map(res=>res.status).sort(),[200,409]);await Promise.all(results.map(res=>res.arrayBuffer()));
      const current=await reviews.consultar(item.caseId);assert([actor,otherActor].includes(current.asumidaPor));
      await request('/'+item.caseId+'/asumir',{method:'POST',body:{},bearer:token(current.asumidaPor)});
      await request('/'+item.caseId+'/asumir',{method:'POST',body:{},bearer:token(current.asumidaPor===actor?otherActor:actor),status:409});
    });
    await check('Revision identidad: cursor estable conserva microsegundos y empates de fecha sin duplicar o omitir casos',async()=>{
      for(const date of ['2099-01-01T10:00:00.123456Z','2099-01-01T10:00:00.123456Z','2099-01-01T10:00:00.123457Z','2099-01-01T10:00:00.123999Z']) {
        const item=await fresh({removeUser:true}),receipt=(await ctx.send(item)).body.data.resolucion,local=await execution.consultar(item.id);
        await admin.query(`INSERT INTO rund.identidad_resolucion_auth
          (intencion_id,operacion_auth_id,huella_comando,huella_contexto,estado,motivo,recibo_auth,registrada_en) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::timestamptz)`,
          [item.id,item.local.operacionAuthId,item.local.huellaComando,local.huellaContexto,receipt.estado,receipt.motivo,JSON.stringify(receipt),date]);
      }
      let cursor,seen=[],pages=0;
      do {const {body}=await request('?limite=2&estado=PENDIENTE'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
        seen.push(...body.casos.map(c=>c.casoId));cursor=body.siguienteCursor;assert(++pages<100);
      }while(cursor);
      const expected=(await admin.query("SELECT caso_id FROM rund.identidad_revision WHERE estado='PENDIENTE' ORDER BY creada_en,caso_id")).rows.map(row=>row.caso_id);
      assert.deepEqual(seen,expected);assert.equal(new Set(seen).size,seen.length);
      const first=(await request('?limite=1&estado=PENDIENTE')).body;assert(first.siguienteCursor);
      await request('?estado=EN_REVISION&cursor='+encodeURIComponent(first.siguienteCursor),{status:400});
    });
    await check('Revision identidad: limites, filtros y cursores invalidos no devuelven listados parciales exitosos',async()=>{
      for(const query of ['?limite=0','?limite=101','?estado=CERRADA','?actorId='+actor,'?cursor=no-json'])await request(query,{status:400});
      await request('/'+randomUUID(),{status:404});await request('/no-id',{status:400});
      await request('/'+selected.caso_id+'/cerrar',{method:'POST',body:{},status:404});
    });
    await check('Revision identidad: respuesta perdida tras asignar se recupera sin segunda actualizacion o cierre',async()=>{
      const item=await newCase();dropNextAssignment=true;await assert.rejects(request('/'+item.caseId+'/asumir',{method:'POST',body:{}}));
      const stored=await rawCase(item.caseId),recovered=(await request('/'+item.caseId)).body;assert.equal(stored.asumida_por,actor);assert.equal(recovered.estado,'EN_REVISION');
      assert.deepEqual((await request('/'+item.caseId+'/asumir',{method:'POST',body:{}})).body,recovered);assert.deepEqual(await rawCase(item.caseId),stored);
    });
    await check('Revision identidad: fallo al asignar revierte responsable y fecha; retry conserva la misma identidad',async()=>{
      const item=await newCase(),before=await rawCase(item.caseId),authBefore=await identities();
      await trigger('UPDATE',async()=>{await request('/'+item.caseId+'/asumir',{method:'POST',body:{},status:500});});
      assert.deepEqual(await rawCase(item.caseId),before);assert.deepEqual(await identities(),authBefore);
      assert.equal((await request('/'+item.caseId+'/asumir',{method:'POST',body:{}})).body.asumidaPor,actor);
    });
    await check('Revision identidad: 012 incorpora pendientes anteriores y repetir no duplica casos o desasigna responsables',async()=>{
      const item=await fresh({removeUser:true});await admin.query('ALTER TABLE rund.identidad_resolucion_auth DISABLE TRIGGER registrar_revision_identidad');
      try{await compensation.resolver(item.id);}finally{await admin.query('ALTER TABLE rund.identidad_resolucion_auth ENABLE TRIGGER registrar_revision_identidad');}
      assert.equal((await admin.query('SELECT count(*) FROM rund.identidad_revision WHERE intencion_id=$1',[item.id])).rows[0].count,'0');
      const assigned=await rawCase(selected.caso_id),sql=fs.readFileSync(path.join(rund,'db/migrations/012_rund_identidad_revision.sql'),'utf8');await admin.query(sql);
      const backfilled=(await admin.query('SELECT * FROM rund.identidad_revision WHERE intencion_id=$1',[item.id])).rows[0];assert(backfilled);assert.equal(backfilled.estado,'PENDIENTE');
      await admin.query(sql);assert.deepEqual((await admin.query('SELECT * FROM rund.identidad_revision WHERE intencion_id=$1',[item.id])).rows[0],backfilled);
      assert.deepEqual(await rawCase(selected.caso_id),assigned);
    });
    await check('Revision identidad: SQL rechaza borrar, cambiar metadatos, reasignar, cerrar o fingir revision de una compensada',async()=>{
      for(const query of ['DELETE FROM rund.identidad_revision WHERE caso_id=$1',"UPDATE rund.identidad_revision SET caso_id=gen_random_uuid() WHERE caso_id=$1",
        "UPDATE rund.identidad_revision SET asumida_por=gen_random_uuid() WHERE caso_id=$1","UPDATE rund.identidad_revision SET estado='CERRADA' WHERE caso_id=$1"])
        await assert.rejects(admin.query(query,[selected.caso_id]),/revision RUND|revision de identidad RUND/);
      await assert.rejects(admin.query(`INSERT INTO rund.identidad_revision(intencion_id,creada_en)
        SELECT intencion_id,registrada_en FROM rund.identidad_resolucion_auth WHERE intencion_id=$1`,[done.id]),/requiere resolucion pendiente/);
      const item=await newCase();await assert.rejects(admin.query("UPDATE rund.identidad_revision SET estado='EN_REVISION',asumida_por=$2,asumida_en='2000-01-01' WHERE caso_id=$1",[item.caseId,actor]),/Transicion/);
    });
    await check('Revision identidad: asumir un caso no compensa, reanuda, confirma perfil ni cambia el recibo propietario',async()=>{
      const current=await execution.consultar(selected.intencion_id),before=await identities(),receipt=current.resolucionAuth;
      await assert.rejects(execution.ejecutar(selected.intencion_id),error=>error.getStatus()===409);
      assert.deepEqual((await compensation.resolver(selected.intencion_id)).reciboResolucion,receipt);assert.deepEqual(await identities(),before);
      assert.equal((await execution.consultar(selected.intencion_id)).resolucionAuthPendiente,true);
    });
    await check('Revision identidad: respuesta minima sin documentos o credenciales, permiso HTTP sin JWT reenviado y flujos activos sin casos',async()=>{
      const {body}=await request('?limite=100');assert(body.casos.length>0);
      assert(!/documento|correo|password|preimagen|postimagen|comandoAuth|otp|token/i.test(JSON.stringify(body)));
      assert(authFixture.permissionsRequestHeaders().slice(headersStart).every(h=>h.tokenMatches&&!h.authorizationForwarded&&!h.cookieForwarded));
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      assert.equal((await database.query('SELECT count(*) FROM rund.identidad_revision')).rows[0].count,'0');
    });
  }finally{authFixture.setPermissionsMode('normal');if(app)await app.close();}
};
