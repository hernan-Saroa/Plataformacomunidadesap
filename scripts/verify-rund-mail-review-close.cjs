/* Cierre administrativo: HTTP y SQL reales, solo dentro del fixture temporal. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyMailReviewClose(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.host,'127.0.0.1');assert.equal(pgConfig.database,'rund_integration');
  assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,mailRow,snapshot,identities,deliveries,recon,send,token,actor,other,viewRole,bareJwt,
    fresh,open,rawCase,unchanged,grant,request,setWriteHook,setReadHook,dropNextResponse}=ctx;
  const close=(id,options={})=>send('/'+id+'/cerrar',{method:'POST',body:{},...options});
  const read=(id,options={})=>send('/'+id+'/cierre',options);
  const count=async id=>(await admin.query('SELECT count(*) FROM rund.identidad_correo_revision_cierre WHERE caso_id=$1',[id])).rows[0].count;
  const accepted=async({assign=false,project=true}={})=>{
    const item=await fresh(),review=(await open(item)).body;
    if(assign)await send('/'+review.casoId+'/asumir',{method:'POST',body:{}});
    await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'ACEPTADO');
    if(project)await recon.conciliar(item.id);
    return{...item,caseId:review.casoId};
  };
  const outsideClosure=async()=>({tables:Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>name!=='identidad_correo_revision_cierre')),
    owner:await identities(),sent:deliveries()});
  let known;
  await check('Cierre revision correo: JWT vigente, cuenta y manage efectivo sin autoridad en el cuerpo',async()=>{
    known=await accepted();
    await unchanged(async()=>{
      for(const bearer of [null,'INVALIDO',bareJwt.sign({sub:actor,roles:['ADMIN']})]){
        await read(known.caseId,{bearer,status:401});await close(known.caseId,{bearer,status:401});
      }
      const bearer=token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']});
      await read(known.caseId,{bearer,status:403});await close(known.caseId,{bearer,status:403});
      for(const body of [{actorId:other},{cerradaPor:other},{motivo:'ACEPTACION_REGISTRADA'},{resultado:'ACEPTADO'},{cerradaEn:'2099-01-01'},[]])
        await close(known.caseId,{body,status:400});
    });
  });
  await check('Cierre revision correo: consulta ausente de siete campos no modifica el caso ni el correo',async()=>{
    await unchanged(async()=>{
      const r=await read(known.caseId);assert.deepEqual(r.body,{version:1,casoId:known.caseId,intencionId:known.id,cerrada:false,cerradaPor:null,cerradaEn:null,motivo:null});
      assert.equal(r.response.headers.get('cache-control'),'private, no-store');
    });
  });
  await check('Cierre revision correo: aceptacion del mismo intento inserta solo recibo y conserva DTO de caso',async()=>{
    const before=await outsideClosure(),saved=await rawCase(known.caseId),r=await close(known.caseId);
    assert.equal(r.response.headers.get('cache-control'),'private, no-store');assert.equal(Object.keys(r.body).length,7);
    assert.equal(r.body.cerrada,true);assert.equal(r.body.cerradaPor,actor);assert.equal(r.body.motivo,'ACEPTACION_REGISTRADA');
    assert.match(r.body.cerradaEn,/\.\d{6}Z$/);assert(!/intento|password|document|@/i.test(JSON.stringify(r.body)));
    assert.deepEqual((await read(known.caseId)).body,r.body);assert.deepEqual(await rawCase(known.caseId),saved);
    assert.equal(Object.keys((await send('/'+known.caseId)).body).length,12);assert.deepEqual(await outsideClosure(),before);
  });
  await check('Cierre revision correo: seis reintentos conservan recibo y respuesta perdida se recupera',async()=>{
    const item=await accepted();dropNextResponse();await assert.rejects(close(item.caseId));
    const first=(await read(item.caseId)).body;assert.equal(first.cerrada,true);
    const results=await Promise.all(Array.from({length:6},()=>close(item.caseId)));
    results.forEach(r=>assert.deepEqual(r.body,first));assert.equal(await count(item.caseId),'1');
    await unchanged(async()=>close(item.caseId));
  });
  await check('Cierre revision correo: dos actores tienen un ganador y el lector no suplanta al cerrador',async()=>{
    const item=await accepted();const results=await Promise.all([actor,other].map(sub=>request('/'+item.caseId+'/cerrar',{
      method:'POST',headers:{Authorization:'Bearer '+token(sub),'Content-Type':'application/json'},body:'{}'})));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);await Promise.all(results.map(r=>r.arrayBuffer()));
    const saved=(await read(item.caseId)).body;assert.equal(saved.cerrada,true);assert([actor,other].includes(saved.cerradaPor));
    const loser=saved.cerradaPor===actor?other:actor;
    await unchanged(async()=>{await close(item.caseId,{bearer:token(loser),status:409});assert.deepEqual((await read(item.caseId,{bearer:token(loser)})).body,saved);});
    assert.equal(await count(item.caseId),'1');
  });
  await check('Cierre revision correo: responsable asignado exclusivo incluso frente a otro ADMIN',async()=>{
    const item=await accepted({assign:true});
    await unchanged(async()=>close(item.caseId,{bearer:token(other,['ADMIN']),status:409}));
    assert.equal((await close(item.caseId)).body.cerradaPor,actor);
  });
  await check('Cierre revision correo: ausencia, incertidumbre e historico sin journal no fabrican aceptacion',async()=>{
    for(const mode of ['ENVIANDO','INCIERTO','HISTORICO']){
      const item=await fresh(),review=(await open(item)).body;
      if(mode==='INCIERTO'){await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'INCIERTO');await recon.conciliar(item.id);}
      if(mode==='HISTORICO')await admin.query("UPDATE rund.identidad_correo SET estado='ENVIADO',resuelta_en=clock_timestamp() WHERE intencion_id=$1",[item.id]);
      await unchanged(async()=>close(review.casoId,{status:409}));assert.equal(await count(review.casoId),'0');
    }
  });
  await check('Cierre revision correo: resultado positivo sin proyeccion exige conciliacion explicita',async()=>{
    const item=await accepted({project:false});await unchanged(async()=>close(item.caseId,{status:409}));
    assert.equal((await mailRow(item.id)).estado,'ENVIANDO');await recon.conciliar(item.id);
    assert.equal((await close(item.caseId)).body.cerrada,true);
  });
  await check('Cierre revision correo: revocacion despues de lectura o INSERT impide respuesta y revierte cierre',async()=>{
    const item=await accepted();setWriteHook(async()=>{setWriteHook(undefined);await grant(false);});
    try{await close(item.caseId,{status:403});}finally{setWriteHook(undefined);await grant(true);}
    assert.equal(await count(item.caseId),'0');
    setReadHook(async()=>{setReadHook(undefined);await grant(false);});
    try{await read(known.caseId,{status:403});}finally{setReadHook(undefined);await grant(true);}
    assert.equal((await close(item.caseId)).body.cerrada,true);
  });
  await check('Cierre revision correo: ADMIN vencido durante INSERT revierte el recibo',async()=>{
    const item=await accepted(),bearer=bareJwt.sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+2});
    setWriteHook(async()=>{setWriteHook(undefined);await new Promise(resolve=>setTimeout(resolve,2300));});
    try{await close(item.caseId,{bearer,status:401});}finally{setWriteHook(undefined);}
    assert.equal(await count(item.caseId),'0');
  });
  await check('Cierre revision correo: fallo SQL posterior a INSERT revierte sin filtrar parametros',async()=>{
    const item=await accepted(),before=await outsideClosure();
    await admin.query(`CREATE FUNCTION rund.fixture_close_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_close_private'; END $$;
      CREATE TRIGGER fixture_close_fail AFTER INSERT ON rund.identidad_correo_revision_cierre FOR EACH ROW EXECUTE FUNCTION rund.fixture_close_fail()`);
    try{const r=await close(item.caseId,{status:503});assert(!JSON.stringify(r.body).includes('fixture_close_private'));}
    finally{await admin.query('DROP TRIGGER fixture_close_fail ON rund.identidad_correo_revision_cierre; DROP FUNCTION rund.fixture_close_fail()');}
    assert.equal(await count(item.caseId),'0');assert.deepEqual(await outsideClosure(),before);
  });
  await check('Cierre revision correo: triggers impiden editar, borrar o insertar evidencia incompatible',async()=>{
    await unchanged(async()=>{
      for(const sql of ['DELETE FROM rund.identidad_correo_revision_cierre WHERE caso_id=$1',
        'UPDATE rund.identidad_correo_revision_cierre SET cerrada_por=gen_random_uuid() WHERE caso_id=$1'])
        await assert.rejects(admin.query(sql,[known.caseId]),/inmutable/);
    });
    const item=await accepted({assign:true}),attempt=(await mailRow(item.id)).intento_id;
    await unchanged(async()=>{
      for(const [iid,aid,closer,date] of [[item.id,randomUUID(),actor,null],[randomUUID(),attempt,actor,null],
        [item.id,attempt,other,null],[item.id,attempt,actor,'2000-01-01']])
        await assert.rejects(admin.query(`INSERT INTO rund.identidad_correo_revision_cierre(caso_id,intencion_id,intento_id,cerrada_por,cerrada_en)
          VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,clock_timestamp()))`,[item.caseId,iid,aid,closer,date]),/compatible/);
    });
    const unknown=await fresh(),review=(await open(unknown)).body;
    await unchanged(async()=>assert.rejects(admin.query(`INSERT INTO rund.identidad_correo_revision_cierre(caso_id,intencion_id,intento_id,cerrada_por)
      VALUES($1,$2,$3,$4)`,[review.casoId,unknown.id,(await mailRow(unknown.id)).intento_id,actor]),/compatible/));
  });
  await check('Cierre revision correo: migracion 019 repetible conserva recibos sin cerrar casos automaticamente',async()=>{
    const item=await accepted(),sql=fs.readFileSync(path.resolve(__dirname,'../backend/rund-service/db/migrations/019_rund_identidad_correo_revision_cierre.sql'),'utf8');
    await unchanged(async()=>{await admin.query(sql);await admin.query(sql);});assert.equal(await count(item.caseId),'0');
  });
  await check('Cierre revision correo: ausencia de tabla falla de forma segura y mantiene API anterior',async()=>{
    await read(randomUUID(),{status:404});await close(randomUUID(),{status:404});
    await admin.query('ALTER TABLE rund.identidad_correo_revision_cierre RENAME TO fixture_review_close_hidden');
    try{
      const r=await read(known.caseId,{status:503});assert(!JSON.stringify(r.body).includes('fixture_review_close_hidden'));
      await close(known.caseId,{status:503});assert.equal(Object.keys((await send('/'+known.caseId)).body).length,12);
    }finally{await admin.query('ALTER TABLE rund.fixture_review_close_hidden RENAME TO identidad_correo_revision_cierre');}
  });
};
