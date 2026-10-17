/* Conciliación local con PostgreSQL real temporal. No usa SMTP/Auth para conciliar. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyMailReconciliation(pgConfig,runtime,check,ctx){
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {admin,ds,queued,first,second,mailRow,deliveries,snapshot,identities,authFixture}=ctx;
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {AuthIdentityMailReconciliationService}=require(path.join(rund,'dist/common/auth-identity-mail-reconciliation.service'));
  const {AuthIdentityMailService}=require(path.join(rund,'dist/common/auth-identity-mail.service'));
  const recon=new AuthIdentityMailReconciliationService(ds);
  const event=async id=>(await admin.query('SELECT * FROM rund.identidad_correo_resultado WHERE intencion_id=$1',[id])).rows[0];
  const reserve=async item=>{await admin.query("UPDATE rund.identidad_correo SET estado='ENVIANDO',intento_id=$2,iniciada_en=clock_timestamp() WHERE intencion_id=$1",[item.id,randomUUID()]);return item;};
  const business=async()=>Object.fromEntries(Object.entries(await snapshot()).filter(([name])=>!name.startsWith('identidad_')));
  const unchanged=async work=>{const before=await snapshot(),owner=await identities(),sent=deliveries();
    await work();assert.deepEqual(await snapshot(),before);assert.deepEqual(await identities(),owner);assert.equal(deliveries(),sent);};
  const rejectProjection=async(state,work)=>{
    assert(['ENVIADO','INCIERTO'].includes(state));
    await admin.query(`CREATE FUNCTION rund.fixture_reject_mail_projection() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'FALLO FICTICIO PROYECCION'; END $$;
      CREATE TRIGGER fixture_reject_mail_projection BEFORE UPDATE ON rund.identidad_correo
      FOR EACH ROW WHEN(NEW.estado='${state}') EXECUTE FUNCTION rund.fixture_reject_mail_projection()`);
    try{await work();}finally{await admin.query('DROP TRIGGER fixture_reject_mail_projection ON rund.identidad_correo;DROP FUNCTION rund.fixture_reject_mail_projection()');}
  };
  let accepted;
  await check('Conciliación correo: resultado mínimo vinculado al intento sin destinatario, mensaje o credenciales',async()=>{
    accepted=await queued();await first.enviarPendiente(accepted.id);
    const stored=await event(accepted.id),row=await mailRow(accepted.id);
    assert.deepEqual(Object.keys(stored).sort(),['intencion_id','intento_id','registrada_en','resultado']);
    assert.equal(stored.intento_id,row.intento_id);assert.equal(stored.resultado,'ACEPTADO');
    assert(!JSON.stringify(stored).includes(accepted.form.CORREO_INSTITUCIONAL));
    assert(!JSON.stringify(stored).includes(accepted.form.DOCUMENTO_IDENTIDAD));
  });
  await check('Conciliación correo: aceptación registrada sobrevive fallo de proyección y recupera ENVIADO sin SMTP',async()=>{
    const item=await queued(),count=deliveries();
    await rejectProjection('ENVIADO',async()=>assert.rejects(first.enviarPendiente(item.id),error=>error.getStatus()===503));
    assert.equal(deliveries(),count+1);assert.equal((await mailRow(item.id)).estado,'ENVIANDO');assert.equal((await event(item.id)).resultado,'ACEPTADO');
    await second.enviarPendiente(item.id);assert.equal(deliveries(),count+1);
    const owner=await identities(),before=await business(),stored=await event(item.id);
    const result=await recon.conciliar(item.id);assert.deepEqual(result,{version:1,intencionId:item.id,estado:'ENVIADO',resultadoRegistrado:true,requiereRevision:false});
    assert.equal(deliveries(),count+1);assert.deepEqual(await identities(),owner);assert.deepEqual(await business(),before);assert.deepEqual(await event(item.id),stored);
  });
  await check('Conciliación correo: resultado incierto registrado se recupera como INCIERTO sin promover aceptación o reenviar',async()=>{
    const item=await queued();let sends=0;
    const consumer=new AuthIdentityMailService(ds,{enviar:async()=>{sends++;return false;}});
    await rejectProjection('INCIERTO',async()=>assert.rejects(consumer.enviarPendiente(item.id),error=>error.getStatus()===503));
    assert.equal((await event(item.id)).resultado,'INCIERTO');
    assert.deepEqual(await recon.conciliar(item.id),{version:1,intencionId:item.id,estado:'INCIERTO',resultadoRegistrado:true,requiereRevision:true});
    await consumer.enviarPendiente(item.id);assert.equal(sends,1);
    await assert.rejects(recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'ACEPTADO'),error=>error.getStatus()===409);
  });
  await check('Conciliación correo: fallo del registro tras HTTP deja ENVIANDO sin evidencia y nunca autoriza reenvío',async()=>{
    const item=await queued(),count=deliveries();
    await admin.query(`CREATE FUNCTION rund.fixture_reject_mail_result() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'FALLO FICTICIO RESULTADO'; END $$;
      CREATE TRIGGER fixture_reject_mail_result AFTER INSERT ON rund.identidad_correo_resultado FOR EACH ROW EXECUTE FUNCTION rund.fixture_reject_mail_result()`);
    try{await assert.rejects(first.enviarPendiente(item.id),error=>error.getStatus()===503);}
    finally{await admin.query('DROP TRIGGER fixture_reject_mail_result ON rund.identidad_correo_resultado;DROP FUNCTION rund.fixture_reject_mail_result()');}
    assert.equal(deliveries(),count+1);assert.equal(await event(item.id),undefined);
    await unchanged(async()=>{
      assert.deepEqual(await recon.conciliar(item.id),{version:1,intencionId:item.id,estado:'ENVIANDO',resultadoRegistrado:false,requiereRevision:true});
      await second.enviarPendiente(item.id);
    });
  });
  await check('Conciliación correo: petición SMTP en vuelo conserva ENVIANDO y luego confirma sin bloqueo o cancelación',async()=>{
    const item=await queued();let finish,started,sends=0;
    const seen=new Promise(resolve=>{started=resolve;});
    const consumer=new AuthIdentityMailService(ds,{enviar:()=>{sends++;started();return new Promise(resolve=>{finish=resolve;});}});
    const sending=consumer.enviarPendiente(item.id);
    try{
      await Promise.race([seen,sending.then(()=>{throw Error('SMTP ficticio no observado');})]);
      await unchanged(async()=>assert.equal((await recon.conciliar(item.id)).estado,'ENVIANDO'));
      finish(true);assert.equal((await sending).estado,'ENVIADO');assert.equal(sends,1);
    }finally{if(finish)finish(true);await sending.catch(()=>{});}
  });
  await check('Conciliación correo: proyección concurrente al consumidor recupera terminal sin error ni otro SMTP',async()=>{
    const item=await queued();let sends=0;
    const handoff={verificarDisponible:()=>recon.verificarDisponible(),conciliar:id=>recon.conciliar(id),
      registrarResultado:async(...args)=>{await recon.registrarResultado(...args);await recon.conciliar(args[0]);}};
    const consumer=new AuthIdentityMailService(ds,{enviar:async()=>{sends++;return true;}},undefined,handoff);
    assert.equal((await consumer.enviarPendiente(item.id)).estado,'ENVIADO');assert.equal(sends,1);
    const before=await snapshot();await recon.conciliar(item.id);assert.deepEqual(await snapshot(),before);
  });
  await check('Conciliación correo: consumidores de conciliación concurrentes conservan un resultado y fechas terminales',async()=>{
    const item=await reserve(await queued()),attempt=(await mailRow(item.id)).intento_id;
    await Promise.all(Array.from({length:6},()=>recon.registrarResultado(item.id,attempt,'ACEPTADO')));
    const results=await Promise.all(Array.from({length:6},()=>recon.conciliar(item.id)));results.forEach(x=>assert.deepEqual(x,results[0]));
    const before=await snapshot();await recon.conciliar(item.id);await recon.registrarResultado(item.id,attempt,'ACEPTADO');assert.deepEqual(await snapshot(),before);
  });
  await check('Conciliación correo: IDs, resultado o intento ajenos no insertan evidencia ni cambian estados',async()=>{
    const pending=await queued(),item=await reserve(await queued()),attempt=(await mailRow(item.id)).intento_id;
    await unchanged(async()=>{
      await assert.rejects(recon.conciliar('no'),error=>error.getStatus()===400);
      await assert.rejects(recon.conciliar(randomUUID()),error=>error.getStatus()===404);
      await assert.rejects(recon.registrarResultado(item.id,attempt,'ENVIADO'),error=>error.getStatus()===400);
      await assert.rejects(recon.registrarResultado(item.id,randomUUID(),'ACEPTADO'),error=>error.getStatus()===409);
      await assert.rejects(recon.registrarResultado(pending.id,attempt,'ACEPTADO'),error=>error.getStatus()===409);
    });
  });
  await check('Conciliación correo: estados históricos sin resultado se conservan sin fabricar evidencia retroactiva',async()=>{
    for(const state of ['ENVIADO','INCIERTO']){
      const item=await reserve(await queued());
      await admin.query('UPDATE rund.identidad_correo SET estado=$2,resuelta_en=clock_timestamp() WHERE intencion_id=$1',[item.id,state]);
      await unchanged(async()=>{
        const result=await recon.conciliar(item.id);assert.equal(result.estado,state);assert.equal(result.resultadoRegistrado,false);
        await assert.rejects(recon.registrarResultado(item.id,(await mailRow(item.id)).intento_id,'ACEPTADO'),error=>error.getStatus()===409);
      });
    }
    const item=await queued();await unchanged(async()=>assert.equal((await recon.conciliar(item.id)).estado,'PENDIENTE'));
  });
  await check('Conciliación correo: ausencia de 017 bloquea antes de consultar Auth, reservar o enviar',async()=>{
    const item=await queued(),before=await mailRow(item.id),calls=authFixture.mailValidationRequestHeaders().length,count=deliveries();
    await admin.query('ALTER TABLE rund.identidad_correo_resultado RENAME TO fixture_mail_result_hidden');
    try{await assert.rejects(first.enviarPendiente(item.id),error=>error.getStatus()===503);await assert.rejects(recon.conciliar(accepted.id),error=>error.getStatus()===503);}
    finally{await admin.query('ALTER TABLE rund.fixture_mail_result_hidden RENAME TO identidad_correo_resultado');}
    assert.deepEqual(await mailRow(item.id),before);assert.equal(deliveries(),count);assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
    assert.equal((await second.enviarPendiente(item.id)).estado,'ENVIADO');
  });
  await check('Conciliación correo: falta de INSERT en resultado bloquea antes de SMTP y es recuperable',async()=>{
    const item=await queued(),role=ds.options.username;assert(/^[a-z0-9_]+$/.test(role));
    const count=deliveries(),calls=authFixture.mailValidationRequestHeaders().length;
    await admin.query(`REVOKE INSERT ON rund.identidad_correo_resultado FROM ${role}`);
    try{await assert.rejects(first.enviarPendiente(item.id),error=>error.getStatus()===503);}
    finally{await admin.query(`GRANT INSERT ON rund.identidad_correo_resultado TO ${role}`);}
    assert.equal((await mailRow(item.id)).estado,'PENDIENTE');assert.equal(deliveries(),count);assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
  });
  await check('Conciliación correo: resultados inmutables y triggers rechazan borrado, sustitución o intento sin reserva',async()=>{
    const stored=await event(accepted.id),pending=await queued(),id=accepted.id;
    const before=await snapshot();
    for(const sql of ['DELETE FROM rund.identidad_correo_resultado WHERE intencion_id=$1',
      "UPDATE rund.identidad_correo_resultado SET resultado='INCIERTO' WHERE intencion_id=$1",
      'UPDATE rund.identidad_correo_resultado SET intento_id=gen_random_uuid() WHERE intencion_id=$1',
      'UPDATE rund.identidad_correo_resultado SET registrada_en=clock_timestamp() WHERE intencion_id=$1'])
      await assert.rejects(admin.query(sql,[id]),/inmutable/);
    await assert.rejects(admin.query("INSERT INTO rund.identidad_correo_resultado(intencion_id,intento_id,resultado) VALUES($1,$2,'ACEPTADO')",[pending.id,randomUUID()]),/mismo intento/);
    assert.deepEqual(await snapshot(),before);assert.deepEqual(await event(id),stored);
  });
  await check('Conciliación correo: 017 repetible no modifica recibos, reconstruye evidencia o dispara correo',async()=>{
    const sql=fs.readFileSync(path.join(rund,'db/migrations/017_rund_identidad_correo_resultado.sql'),'utf8');
    await unchanged(async()=>{await admin.query(sql);await admin.query(sql);});
  });
  await check('Conciliación correo: Auth caído no impide conciliar y la base RUND no tiene schema Auth',async()=>{
    const headers=authFixture.mailValidationRequestHeaders().length;
    authFixture.setMailValidationMode('unavailable');
    try{await unchanged(async()=>assert.equal((await recon.conciliar(accepted.id)).estado,'ENVIADO'));}
    finally{authFixture.setMailValidationMode('normal');}
    assert.equal(authFixture.mailValidationRequestHeaders().length,headers);await assert.rejects(ds.query('SELECT * FROM auth.personas'),/does not exist/);
  });
  await require('./verify-rund-mail-review.cjs')(pgConfig,runtime,check,ctx);
};
