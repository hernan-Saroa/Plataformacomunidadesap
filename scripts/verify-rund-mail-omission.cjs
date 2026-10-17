/* Omisión explícita por rechazo: SQL/HTTP reales únicamente en el fixture temporal. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyMailOmission(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.host,'127.0.0.1');assert.equal(pgConfig.database,'rund_integration');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,database,ds,authFixture,queued,first,mailRow,snapshot,identities,deliveries,omissions,send,token,actor,other,viewRole,bareJwt,
    fresh,unchanged,grant,request,setWriteHook,setReadHook,dropNextResponse}=ctx;
  const base=id=>'/por-intencion/'+id,omit=(id,options={})=>send(base(id)+'/omitir-por-vigencia',{method:'POST',body:{},...options});
  const read=(id,options={})=>send(base(id)+'/omision',options);
  const count=async id=>(await admin.query('SELECT count(*) FROM rund.identidad_correo_omision WHERE intencion_id=$1',[id])).rows[0].count;
  const rejected=async(field='password_temp')=>{
    const item=await queued(),r=(await admin.query(`SELECT n.contexto,o.operacion_auth_id,o.huella_comando FROM rund.identidad_contexto_nativo n
      JOIN rund.identidad_operacion o USING(intencion_id) WHERE intencion_id=$1`,[item.id])).rows[0];
    const op=(await database.query('SELECT resultado FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[r.operacion_auth_id])).rows[0];
    if(field==='password_temp')await database.query('UPDATE auth."user" SET password_temp=false WHERE id_user=$1',[op.resultado.usuarioId]);
    else await database.query('UPDATE auth.personas SET dir_email=$2 WHERE id_person=$1',[op.resultado.personaId,'otro-'+randomUUID()+'@example.test']);
    return{...item,op:r.operacion_auth_id,hash:r.huella_comando,command:r.contexto.comandoAuth};
  };
  const outside=async()=>({tables:Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>name!=='identidad_correo_omision')),
    owner:await identities(),sent:deliveries()});
  const compiled=path.resolve(__dirname,'../backend/rund-service/dist/common'),{AuthIdentityMailService}=require(path.join(compiled,'auth-identity-mail.service'));
  const staleConsumer=(item,provider,before=async()=>{})=>new AuthIdentityMailService(ds,{enviar:provider},{validar:async()=>{
    await before();return{version:1,operacionId:item.op,huellaComando:item.hash,apta:true,motivo:null};}});
  let known;
  await check('Omision correo: sesion vigente, manage y cuerpo vacio sin motivo o actor del navegador',async()=>{
    known=await rejected();await unchanged(async()=>{
      for(const bearer of [null,'INVALIDO',bareJwt.sign({sub:actor,roles:['ADMIN']})]){await read(known.id,{bearer,status:401});await omit(known.id,{bearer,status:401});}
      await omit(known.id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      for(const body of [null,[],{motivo:'IDENTIDAD_NO_VIGENTE'},{actorId:other},{omitidaEn:'2000-01-01'},{apta:false}])await omit(known.id,{body,status:400});
    });
  });
  await check('Omision correo: consulta ausente no escribe ni consulta vigencia y conserva siete campos',async()=>{
    const calls=authFixture.mailValidationRequestHeaders().length;
    await unchanged(async()=>{const r=await read(known.id);assert.equal(r.response.headers.get('cache-control'),'private, no-store');
      assert.deepEqual(r.body,{version:1,intencionId:known.id,omitida:false,motivo:null,omitidaPor:null,omitidaEn:null,envioBloqueado:false});});
    assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
  });
  await check('Omision correo: rechazo propietario inserta solo decision sin cambiar cuenta, aviso, intento o perfil',async()=>{
    const before=await outside(),r=await omit(known.id);assert.equal(Object.keys(r.body).length,7);assert.equal(r.body.omitida,true);
    assert.equal(r.body.omitidaPor,actor);assert.equal(r.body.motivo,'CREDENCIALES_NO_VIGENTES');assert.equal(r.body.envioBloqueado,true);
    assert.equal(r.response.headers.get('cache-control'),'private, no-store');assert.match(r.body.omitidaEn,/\.\d{6}Z$/);
    assert(!/intento|@|password|hash|document|contexto/i.test(JSON.stringify(r.body)));assert.deepEqual(await outside(),before);
    assert.deepEqual((await read(known.id)).body,r.body);assert.equal((await mailRow(known.id)).estado,'PENDIENTE');assert.equal((await mailRow(known.id)).intento_id,null);
    const changed=await rejected('dir_email');assert.equal((await omit(changed.id)).body.motivo,'IDENTIDAD_NO_VIGENTE');
  });
  await check('Omision correo: decision bloquea consumidor antes de Auth sin alterar GET o DTO de correo',async()=>{
    const calls=authFixture.mailValidationRequestHeaders().length;await unchanged(async()=>{
      await assert.rejects(first.enviarPendiente(known.id),e=>e.getStatus()===409);
      assert.deepEqual(await first.consultar(known.id),{intencionId:known.id,estado:'PENDIENTE',requiereRevision:false});
    });assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
  });
  await check('Omision correo: respuesta perdida y seis replays conservan decision, responsable y fecha sin Auth',async()=>{
    const item=await rejected();dropNextResponse();await assert.rejects(omit(item.id));const saved=(await read(item.id)).body;
    const calls=authFixture.mailValidationRequestHeaders().length;authFixture.setMailValidationMode('unavailable');
    try{const rs=await Promise.all(Array.from({length:6},()=>omit(item.id)));rs.forEach(r=>assert.deepEqual(r.body,saved));}
    finally{authFixture.setMailValidationMode('normal');}
    assert.equal(authFixture.mailValidationRequestHeaders().length,calls);assert.equal(await count(item.id),'1');
    await unchanged(async()=>{await omit(item.id,{bearer:token(other),status:409});assert.deepEqual((await read(item.id,{bearer:token(other)})).body,saved);});
  });
  await check('Omision correo: dos operadores tienen un ganador sin sustituir autoria',async()=>{
    const item=await rejected(),rs=await Promise.all([actor,other].map(sub=>request(base(item.id)+'/omitir-por-vigencia',{
      method:'POST',headers:{Authorization:'Bearer '+token(sub),'Content-Type':'application/json'},body:'{}'})));
    assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);await Promise.all(rs.map(r=>r.arrayBuffer()));assert.equal(await count(item.id),'1');
  });
  await check('Omision correo: Auth apto, caido o contrato parcial no fabrican rechazo o decision',async()=>{
    const item=await queued();await unchanged(async()=>omit(item.id,{status:409}));
    for(const mode of ['unavailable','missing','partial']){authFixture.setMailValidationMode(mode);try{await unchanged(async()=>omit(item.id,{status:503}));}finally{authFixture.setMailValidationMode('normal');}}
    assert.equal(await count(item.id),'0');
  });
  await check('Omision correo: reserva existente o terminal no se cancela ni consulta vigencia',async()=>{
    for(const state of ['ENVIANDO','ENVIADO','INCIERTO']){
      const item=await fresh();if(state!=='ENVIANDO')await admin.query('UPDATE rund.identidad_correo SET estado=$2,resuelta_en=clock_timestamp() WHERE intencion_id=$1',[item.id,state]);
      const calls=authFixture.mailValidationRequestHeaders().length;await unchanged(async()=>omit(item.id,{status:409}));assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
    }
  });
  await check('Omision correo: omision durante validacion positiva anterior impide reserva y SMTP',async()=>{
    const item=await rejected();let calls=0;
    const consumer=staleConsumer(item,async()=>{calls++;return true;},async()=>{await omit(item.id);});
    await assert.rejects(consumer.enviarPendiente(item.id),e=>e.getStatus()===409);assert.equal(calls,0);assert.equal((await mailRow(item.id)).intento_id,null);
  });
  await check('Omision correo: consumidor esperando bloqueo relee la decision confirmada despues de su snapshot',async()=>{
    const item=await rejected();let waiting,calls=0;const lockRequested=new Promise(resolve=>{waiting=resolve;});
    const guarded={query:ds.query.bind(ds),transaction:work=>ds.transaction(manager=>work(new Proxy(manager,{get(target,key){
      if(key==='query')return async(sql,values)=>{if(sql.endsWith(' FOR UPDATE OF m'))waiting();return target.query(sql,values);};
      const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }})))};
    const consumer=new AuthIdentityMailService(guarded,{enviar:async()=>{calls++;return true;}},{validar:async()=>({version:1,operacionId:item.op,huellaComando:item.hash,apta:true,motivo:null})});
    await admin.query('BEGIN');let pending;
    try{
      await admin.query("INSERT INTO rund.identidad_correo_omision(intencion_id,motivo,omitida_por) VALUES($1,'CREDENCIALES_NO_VIGENTES',$2)",[item.id,actor]);
      pending=consumer.enviarPendiente(item.id);const outcome=pending.then(value=>({value}),error=>({error}));
      await Promise.race([lockRequested,outcome.then(()=>{throw Error('No se solicito el bloqueo del aviso');})]);
      await admin.query('COMMIT');const result=await outcome;assert.equal(result.error?.getStatus(),409);assert.equal(calls,0);
    }finally{await admin.query('ROLLBACK');if(pending)await pending.catch(()=>{});}
    assert.equal((await mailRow(item.id)).intento_id,null);
  });
  await check('Omision correo: consumidor en vuelo gana antes del bloqueo y la omision no interrumpe SMTP',async()=>{
    const item=await rejected();let finish,signal,calls=0;const started=new Promise(resolve=>{signal=resolve;});
    const consumer=staleConsumer(item,()=>{calls++;signal();return new Promise(resolve=>{finish=resolve;});});let sending;
    authFixture.setMailValidationReadHook(async()=>{authFixture.setMailValidationReadHook(undefined);sending=consumer.enviarPendiente(item.id);await Promise.race([started,sending.then(()=>{throw Error('No se observo el proveedor ficticio');})]);});
    try{await omit(item.id,{status:409});assert.equal((await mailRow(item.id)).estado,'ENVIANDO');assert.equal(await count(item.id),'0');}
    finally{authFixture.setMailValidationReadHook(undefined);if(finish)finish(true);if(sending)assert.equal((await sending).estado,'ENVIADO');}
    assert.equal(calls,1);
  });
  await check('Omision correo: revocacion despues de INSERT o lectura y ADMIN vencido revierten o deniegan',async()=>{
    const item=await rejected();setWriteHook(async()=>{setWriteHook(undefined);await grant(false);});
    try{await omit(item.id,{status:403});}finally{setWriteHook(undefined);await grant(true);}assert.equal(await count(item.id),'0');
    setReadHook(async()=>{setReadHook(undefined);await grant(false);});
    try{await read(known.id,{status:403});}finally{setReadHook(undefined);await grant(true);}
    const bearer=bareJwt.sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+2});
    setWriteHook(async()=>{setWriteHook(undefined);await new Promise(resolve=>setTimeout(resolve,2300));});
    try{await omit(item.id,{bearer,status:401});}finally{setWriteHook(undefined);}assert.equal(await count(item.id),'0');
  });
  await check('Omision correo: fallo SQL tras INSERT revierte y no expone parametros',async()=>{
    const item=await rejected(),before=await outside();
    await admin.query(`CREATE FUNCTION rund.fixture_omission_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_omission_private'; END $$;
      CREATE TRIGGER fixture_omission_fail AFTER INSERT ON rund.identidad_correo_omision FOR EACH ROW EXECUTE FUNCTION rund.fixture_omission_fail()`);
    try{const r=await omit(item.id,{status:503});assert(!JSON.stringify(r.body).includes('fixture_omission_private'));}
    finally{await admin.query('DROP TRIGGER fixture_omission_fail ON rund.identidad_correo_omision; DROP FUNCTION rund.fixture_omission_fail()');}
    assert.equal(await count(item.id),'0');assert.deepEqual(await outside(),before);
  });
  await check('Omision correo: triggers protegen decision y niegan reserva SQL o omision tardia',async()=>{
    await unchanged(async()=>{
      for(const sql of ['DELETE FROM rund.identidad_correo_omision WHERE intencion_id=$1',"UPDATE rund.identidad_correo_omision SET motivo='IDENTIDAD_NO_VIGENTE' WHERE intencion_id=$1"])
        await assert.rejects(admin.query(sql,[known.id]),/inmutable/);
      await assert.rejects(admin.query("UPDATE rund.identidad_correo SET estado='ENVIANDO',intento_id=$2,iniciada_en=clock_timestamp() WHERE intencion_id=$1",[known.id,randomUUID()]),/omitido/);
    });
    const item=await fresh();await unchanged(async()=>assert.rejects(admin.query("INSERT INTO rund.identidad_correo_omision(intencion_id,motivo,omitida_por) VALUES($1,'IDENTIDAD_NO_VIGENTE',$2)",[item.id,actor]),/sin intento/));
  });
  await check('Omision correo: 020 repetible conserva avisos y decisiones sin backfill automatico',async()=>{
    const item=await rejected(),sql=fs.readFileSync(path.resolve(__dirname,'../backend/rund-service/db/migrations/020_rund_identidad_correo_omision.sql'),'utf8');
    await unchanged(async()=>{await admin.query(sql);await admin.query(sql);});assert.equal(await count(item.id),'0');
  });
  await check('Omision correo: falta de tabla impide nuevos envios o decisiones y conserva lecturas anteriores',async()=>{
    await read(randomUUID(),{status:404});await omit(randomUUID(),{status:404});
    const item=await queued();await admin.query('ALTER TABLE rund.identidad_correo_omision RENAME TO fixture_omission_hidden');
    try{const r=await read(item.id,{status:503});assert(!JSON.stringify(r.body).includes('fixture_omission_hidden'));await omit(item.id,{status:503});
      await assert.rejects(first.enviarPendiente(item.id),e=>e.getStatus()===503);assert.equal((await first.consultar(item.id)).estado,'PENDIENTE');}
    finally{await admin.query('ALTER TABLE rund.fixture_omission_hidden RENAME TO identidad_correo_omision');}
  });
};
