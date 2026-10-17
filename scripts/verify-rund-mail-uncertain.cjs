/* Revisión de incertidumbre registrada: mismo caso, SQL/HTTP temporales, sin SMTP. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyMailUncertain(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.host,'127.0.0.1');assert.equal(pgConfig.database,'rund_integration');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,first,mailRow,snapshot,identities,deliveries,recon,send,token,actor,other,viewRole,bareJwt,fresh,open,rawCase,unchanged,grant,
    request,setWriteHook,dropNextResponse}=ctx;
  const review=(id,options={})=>send('/por-intencion/'+id+'/revisar-resultado-incierto',{method:'POST',body:{},...options});
  const uncertain=async()=>{const item=await fresh();await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'INCIERTO');await recon.conciliar(item.id);return item;};
  const outside=async()=>({tables:Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>name!=='identidad_correo_revision')),
    owner:await identities(),sent:deliveries()});
  const count=async id=>(await admin.query('SELECT count(*) FROM rund.identidad_correo_revision WHERE intencion_id=$1',[id])).rows[0].count;
  let known;
  await check('Revision incierto registrado: JWT vigente y manage efectivo, cuerpo vacio sin resultado o actor',async()=>{
    known=await uncertain();await unchanged(async()=>{
      for(const bearer of [null,'INVALIDO',bareJwt.sign({sub:actor,roles:['ADMIN']})])await review(known.id,{bearer,status:401});
      await review(known.id,{bearer:token(actor,[viewRole],{permissions:['banco-docentes.rund.manage']}),status:403});
      for(const body of [null,[],{actorId:other},{resultado:'INCIERTO'},{intentoId:randomUUID()},{reenviar:true}])await review(known.id,{body,status:400});
    });
  });
  await check('Revision incierto registrado: crea caso con doce campos y conserva correo, journal, negocio e identidad',async()=>{
    const before=await outside(),r=await review(known.id);known.caseId=r.body.casoId;
    assert.equal(Object.keys(r.body).length,12);assert.equal(r.response.headers.get('cache-control'),'private, no-store');
    assert.equal(r.body.estado,'PENDIENTE');assert.equal(r.body.estadoCorreoInicial,'INCIERTO');assert.equal(r.body.estadoCorreo,'INCIERTO');
    assert.equal(r.body.resultadoRegistrado,true);assert.equal(r.body.requiereRevision,true);assert.equal(r.body.registradaPor,actor);
    assert(!/intento|@|password|hash|document|contexto/i.test(JSON.stringify(r.body)));assert.deepEqual(await outside(),before);
    assert.deepEqual((await review(known.id,{bearer:token(other)})).body,r.body);
  });
  await check('Revision incierto registrado: entrada anterior sigue rechazando nuevos casos con journal',async()=>{
    const item=await uncertain();await unchanged(async()=>send('/por-intencion/'+item.id,{method:'POST',body:{},status:409}));assert.equal(await count(item.id),'0');
  });
  await check('Revision incierto registrado: ausencia, historico o aceptacion no inventan incertidumbre observada',async()=>{
    const unknown=await fresh();await unchanged(async()=>review(unknown.id,{status:409}));
    const historical=await fresh();await admin.query("UPDATE rund.identidad_correo SET estado='INCIERTO',resuelta_en=clock_timestamp() WHERE intencion_id=$1",[historical.id]);
    await unchanged(async()=>review(historical.id,{status:409}));
    const accepted=await fresh();await recon.registrarResultado(accepted.id,(await mailRow(accepted.id)).intento_id,'ACEPTADO');
    await unchanged(async()=>review(accepted.id,{status:409}));await recon.conciliar(accepted.id);await unchanged(async()=>review(accepted.id,{status:409}));
  });
  await check('Revision incierto registrado: journal sin proyeccion exige conciliacion explicita antes de abrir',async()=>{
    const item=await fresh();await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'INCIERTO');
    await unchanged(async()=>review(item.id,{status:409}));assert.equal((await mailRow(item.id)).estado,'ENVIANDO');
    await recon.conciliar(item.id);assert.equal((await review(item.id)).body.estadoCorreo,'INCIERTO');
  });
  await check('Revision incierto registrado: caso previo conserva creador, estado inicial y responsable sin duplicarse',async()=>{
    const item=await fresh(),opened=(await open(item)).body;await send('/'+opened.casoId+'/asumir',{method:'POST',body:{}});const saved=await rawCase(opened.casoId);
    await recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'INCIERTO');await recon.conciliar(item.id);
    await unchanged(async()=>{const r=(await review(item.id,{bearer:token(other)})).body;assert.equal(r.casoId,opened.casoId);assert.equal(r.estadoCorreoInicial,'ENVIANDO');assert.equal(r.asumidaPor,actor);});
    assert.deepEqual(await rawCase(opened.casoId),saved);assert.equal(await count(item.id),'1');
  });
  await check('Revision incierto registrado: seis altas simultaneas y respuesta perdida recuperan el mismo caso',async()=>{
    const item=await uncertain(),rs=await Promise.all(Array.from({length:6},()=>review(item.id)));rs.forEach(r=>assert.deepEqual(r.body,rs[0].body));assert.equal(await count(item.id),'1');
    const lost=await uncertain();dropNextResponse();await assert.rejects(review(lost.id));const saved=(await review(lost.id)).body;
    await unchanged(async()=>assert.deepEqual((await review(lost.id)).body,saved));
  });
  await check('Revision incierto registrado: bandeja, asignacion y diagnostico reutilizan caso sin habilitar cierre u omision',async()=>{
    const before=await outside(),rs=await Promise.all([actor,other].map(sub=>request('/'+known.caseId+'/asumir',{
      method:'POST',headers:{Authorization:'Bearer '+token(sub),'Content-Type':'application/json'},body:'{}'})));
    assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);await Promise.all(rs.map(r=>r.arrayBuffer()));assert.deepEqual(await outside(),before);
    const saved=await rawCase(known.caseId);await unchanged(async()=>{
      assert.equal((await send('/'+known.caseId)).body.asumidaPor,saved.asumida_por);
      const page=(await send('?estado=EN_REVISION&limite=100')).body;assert(page.casos.some(x=>x.casoId===known.caseId));
      const d=(await send('/por-intencion/'+known.id+'/diagnosticar',{method:'POST',body:{}})).body;
      assert.equal(d.casoId,known.caseId);assert.equal(d.siguientePaso,'CONTINUAR_REVISION');assert.equal(d.permiteReenvio,false);
      await send('/'+known.caseId+'/cerrar',{method:'POST',body:{},status:409});await send('/por-intencion/'+known.id+'/omitir-por-vigencia',{method:'POST',body:{},status:409});
    });
  });
  await check('Revision incierto registrado: revocacion tras INSERT revierte y ADMIN vencido no confirma caso',async()=>{
    const item=await uncertain();setWriteHook(async()=>{setWriteHook(undefined);await grant(false);});
    try{await review(item.id,{status:403});}finally{setWriteHook(undefined);await grant(true);}assert.equal(await count(item.id),'0');
    const bearer=bareJwt.sign({sub:actor,roles:['ADMIN'],exp:Math.floor(Date.now()/1000)+2});setWriteHook(async()=>{setWriteHook(undefined);await new Promise(resolve=>setTimeout(resolve,2300));});
    try{await review(item.id,{bearer,status:401});}finally{setWriteHook(undefined);}assert.equal(await count(item.id),'0');
  });
  await check('Revision incierto registrado: fallo SQL tras INSERT revierte sin exponer parametros',async()=>{
    const item=await uncertain(),before=await outside();
    await admin.query(`CREATE FUNCTION rund.fixture_uncertain_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_uncertain_private'; END $$;
      CREATE TRIGGER fixture_uncertain_fail AFTER INSERT ON rund.identidad_correo_revision FOR EACH ROW EXECUTE FUNCTION rund.fixture_uncertain_fail()`);
    try{const r=await review(item.id,{status:503});assert(!JSON.stringify(r.body).includes('fixture_uncertain_private'));}
    finally{await admin.query('DROP TRIGGER fixture_uncertain_fail ON rund.identidad_correo_revision; DROP FUNCTION rund.fixture_uncertain_fail()');}
    assert.equal(await count(item.id),'0');assert.deepEqual(await outside(),before);
  });
  await check('Revision incierto registrado: trigger exige mismo intento, incertidumbre proyectada y fecha compatible',async()=>{
    for(const kind of ['otro-intento','fecha-anterior','sin-proyectar','aceptado']){
      const item=await fresh(),attempt=(await mailRow(item.id)).intento_id;
      await recon.registrarResultado(item.id,attempt,kind==='aceptado'?'ACEPTADO':'INCIERTO');if(kind!=='sin-proyectar')await recon.conciliar(item.id);
      await unchanged(async()=>assert.rejects(admin.query(`INSERT INTO rund.identidad_correo_revision
        (intencion_id,intento_id,estado_correo_inicial,registrada_por,creada_en) VALUES($1,$2,$3,$4,COALESCE($5::timestamptz,clock_timestamp()))`,
      [item.id,kind==='otro-intento'?randomUUID():attempt,kind==='sin-proyectar'?'ENVIANDO':'INCIERTO',actor,kind==='fecha-anterior'?'2000-01-01':null]),/sin resultado|mismo intento/));
    }
    await unchanged(async()=>{
      await assert.rejects(admin.query('DELETE FROM rund.identidad_correo_revision WHERE caso_id=$1',[known.caseId]),/borrar/);
      await assert.rejects(admin.query('UPDATE rund.identidad_correo_revision SET intento_id=gen_random_uuid() WHERE caso_id=$1',[known.caseId]),/invalida/);
    });
  });
  await check('Revision incierto registrado: 021 repetible no crea tablas, casos o cambios de historial',async()=>{
    const sql=fs.readFileSync(path.resolve(__dirname,'../backend/rund-service/db/migrations/021_rund_identidad_correo_revision_incierto.sql'),'utf8');
    await unchanged(async()=>{await admin.query(sql);await admin.query(sql);});
    const item=await uncertain();assert.equal(await count(item.id),'0');assert.equal((await review(item.id)).body.estadoCorreoInicial,'INCIERTO');
  });
  await check('Revision incierto registrado: ausencia de journal o aviso falla seguro y conserva GET de correo',async()=>{
    await review(randomUUID(),{status:404});await review('invalido',{status:400});
    const item=await uncertain();await admin.query('ALTER TABLE rund.identidad_correo_resultado RENAME TO fixture_uncertain_hidden');
    try{const r=await review(item.id,{status:503});assert(!JSON.stringify(r.body).includes('fixture_uncertain_hidden'));assert.equal((await first.consultar(item.id)).estado,'INCIERTO');}
    finally{await admin.query('ALTER TABLE rund.fixture_uncertain_hidden RENAME TO identidad_correo_resultado');}
    assert.equal(await count(item.id),'0');
  });
};
