/* Outbox/consumidor reales sobre la base nativa temporal; correo exclusivamente a fixture loopback. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { randomUUID } = require('node:crypto');
module.exports = async function verifyMail(pgConfig, runtime, check, ctx) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const root = path.resolve(__dirname, '..'), rund = path.join(root, 'backend/rund-service');
  const compiled = file => require(path.join(rund, 'dist', file));
  const { DataSource } = require(path.join(rund, 'node_modules/typeorm'));
  const { AuthIdentityMailService } = compiled('common/auth-identity-mail.service');
  const { AuthIdentityMailClient } = compiled('common/auth-identity-mail.client');
  const { AuthIdentityManualEntryService } = compiled('common/auth-identity-manual-entry.service');
  const { AuthIdentityRequestService } = compiled('common/auth-identity-request.service');
  const { AuthIdentityExecutionService } = compiled('common/auth-identity-execution.service');
  const { AuthIdentityValidationClient } = compiled('common/auth-identity-validation.client');
  const { RundCatalogosClient } = compiled('common/rund-catalogos.client');
  const { admin, ds, coord, native, client, row, snapshot, identities, trigger, authFixture, known } = ctx;
  const execution = new AuthIdentityExecutionService(ds, coord, native, client);
  const entries = new AuthIdentityManualEntryService(ds, new AuthIdentityRequestService(ds, execution), coord,
    new AuthIdentityValidationClient(), new RundCatalogosClient());
  let mode = 'ok', deliveries = 0, peer, first, second, observedIntent;
  const received = [], savedUrl = process.env.NOTIFICATIONS_SERVICE_URL;
  const stub = http.createServer(async (req, res) => {
    try {
      assert.equal(req.url, '/api/v1/emails/send'); assert.equal(req.method, 'POST');
      assert.equal(req.headers.authorization, undefined); assert.equal(req.headers.cookie, undefined);
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks)); received.push(body); deliveries++;
      assert.deepEqual(Object.keys(body).sort(), ['html', 'subject', 'text', 'to']);
      assert(body.to.endsWith('@esap.edu.co'));
      if (observedIntent) {
        const visible = (await admin.query('SELECT estado,intento_id FROM rund.identidad_correo WHERE intencion_id=$1', [observedIntent])).rows[0];
        assert.equal(visible.estado, 'ENVIANDO'); assert(visible.intento_id);
      }
      if (mode === 'drop') { res.destroy(); return; }
      res.writeHead(mode === 'http-error' ? 503 : 201, { 'content-type': 'application/json' });
      res.end(mode === 'invalid' ? '{' : JSON.stringify({ message: 'Correo enviado' }));
    } catch { res.writeHead(500); res.end('{}'); }
  });
  const prepare = async (overrides = {}) => {
    const marker = BigInt('0x' + randomUUID().replace(/-/g, '').slice(0, 12)).toString();
    const form = { ...row, DOCUMENTO_IDENTIDAD: '8' + marker, CORREO_INSTITUCIONAL: 'mail-' + marker + '@esap.edu.co', ...overrides };
    const actor = { actorId: randomUUID(), roles: ['GESTION_PROFESORAL'], fullAccess: false };
    const request = randomUUID(), prepared = await entries.preparar(request, actor, form);
    return { id: prepared.intencionId, request, actor, form };
  };
  const apply = async item => { await coord.registrarEnAuth(item.id); const local = await coord.consultar(item.id);
    const context = (await admin.query('SELECT contexto FROM rund.identidad_contexto_nativo WHERE intencion_id=$1', [item.id])).rows[0].contexto;
    await client.aplicar(local.operacionAuthId, context.comandoAuth); await coord.reconciliar(item.id); return item;
  };
  const confirm = async item => { await apply(item); await native.confirmarNativo(item.id); return item; };
  const queued = async () => confirm(await prepare());
  const mailRow = async id => (await admin.query('SELECT * FROM rund.identidad_correo WHERE intencion_id=$1', [id])).rows[0];
  const business = async () => Object.fromEntries(Object.entries(await snapshot()).filter(([name]) => !name.startsWith('identidad_')));
  const reserved = async item => { await entries.reanudar(item.request, item.actor.actorId); return item; };
  try {
    await new Promise(resolve => stub.listen(0, '127.0.0.1', resolve));
    process.env.NOTIFICATIONS_SERVICE_URL = `http://127.0.0.1:${stub.address().port}`;
    assert.equal(new URL(process.env.NOTIFICATIONS_SERVICE_URL).hostname, '127.0.0.1');
    peer = new DataSource({ ...ds.options, extra: { max: 2 } }); await peer.initialize();
    first = new AuthIdentityMailService(ds, new AuthIdentityMailClient()); second = new AuthIdentityMailService(peer, new AuthIdentityMailClient());
    let item, confirmed;
    await check('Correo durable: sin commit no hay aviso; alta manual confirmada encola exactamente uno sin HTTP', async () => {
      item = await reserved(await prepare()); assert.equal(await mailRow(item.id), undefined); await apply(item);
      assert.equal(await mailRow(item.id), undefined); const count = deliveries; confirmed = await native.confirmarNativo(item.id);
      const message = await mailRow(item.id); assert.equal(message.estado, 'PENDIENTE'); assert.equal(message.intento_id, null); assert.equal(deliveries, count);
      assert.deepEqual(Object.keys(message).sort(), ['creada_en','estado','iniciada_en','intencion_id','intento_id','resuelta_en','tipo']);
      assert.equal(JSON.stringify(message).includes(item.form.CORREO_INSTITUCIONAL), false);
    });
    await check('Correo durable: confirmaciones concurrentes y respuesta nativa recuperada conservan un aviso y un perfil', async () => {
      const before = await snapshot(); const results = await Promise.all(Array.from({length:6}, () => native.confirmarNativo(item.id)));
      results.forEach(result => assert.deepEqual(result, confirmed)); assert.deepEqual(await snapshot(), before);
      assert.equal((await second.consultar(item.id)).estado, 'PENDIENTE');
    });
    await check('Correo durable: cuenta Auth existente y confirmaciones de lotes no generan bienvenida o aviso artificial', async () => {
      const existing = await queuedExisting(); assert.equal(await mailRow(existing.id), undefined); assert.equal(await mailRow(known.id), undefined);
      for (const id of [existing.id, known.id]) await assert.rejects(admin.query('INSERT INTO rund.identidad_correo(intencion_id) VALUES($1)', [id]), /exige alta manual/);
      async function queuedExisting() { return confirm(await reserved(await prepare({DOCUMENTO_IDENTIDAD:item.form.DOCUMENTO_IDENTIDAD,
        CORREO_INSTITUCIONAL:item.form.CORREO_INSTITUCIONAL,PERIODO_CARGA:'2096-1'}))); }
    });
    await check('Correo durable: fallo de outbox revierte perfil, bloques, auditoria y marcador; Auth aplicado permanece recuperable', async () => {
      const pending = await apply(await reserved(await prepare())), before = await snapshot(), authBefore = await identities();
      await trigger('identidad_correo','INSERT', async () => { await assert.rejects(native.confirmarNativo(pending.id), /FALLO FICTICIO NATIVO/); });
      assert.deepEqual(await snapshot(), before); assert.deepEqual(await identities(), authBefore);
      assert.equal((await native.consultar(pending.id)).estado, 'PREPARADA'); await native.confirmarNativo(pending.id);
      assert.equal((await mailRow(pending.id)).estado, 'PENDIENTE');
    });
    await check('Correo durable: abortos y cancelaciones no encolan; no se puede insertar aviso antes de confirmar', async () => {
      const pending = await reserved(await prepare());
      await assert.rejects(admin.query('INSERT INTO rund.identidad_correo(intencion_id) VALUES($1)', [pending.id]), /exige alta manual/);
      await execution.abortar(pending.id, 'CANCELACION_SOLICITUD'); assert.equal(await mailRow(pending.id), undefined);
    });
    await check('Correo durable: dos consumidores concurrentes reservan un intento persistido y hacen un solo HTTP sin transaccion abierta', async () => {
      const before = await business(), authBefore = await identities(), count = deliveries, ops = authFixture.operationRequestHeaders().length;
      observedIntent = item.id;
      let results;
      try { results = await Promise.all([first.enviarPendiente(item.id), second.enviarPendiente(item.id), first.enviarPendiente(item.id)]); }
      finally { observedIntent = undefined; }
      assert.equal(deliveries, count+1); assert(results.every(result => ['ENVIANDO','ENVIADO'].includes(result.estado)));
      assert.equal((await mailRow(item.id)).estado, 'ENVIADO'); assert.equal((await second.consultar(item.id)).estado, 'ENVIADO');
      const sent = received.at(-1); assert.equal(sent.to, item.form.CORREO_INSTITUCIONAL.toLowerCase());
      assert(sent.text.includes(item.form.DOCUMENTO_IDENTIDAD));
      assert.deepEqual(await business(), before); assert.deepEqual(await identities(), authBefore); assert.equal(authFixture.operationRequestHeaders().length, ops);
    });
    await check('Correo durable: recibo minimo no expone destinatario, documento, clave, contexto o resultado nativo', async () => {
      assert.deepEqual(await first.consultar(item.id), {intencionId:item.id,estado:'ENVIADO',requiereRevision:false});
      const count = deliveries; await first.enviarPendiente(item.id); await second.enviarPendiente(item.id); assert.equal(deliveries,count);
    });
    for (const failure of ['http-error', 'drop', 'invalid']) await check('Correo durable: '+failure+' conserva INCIERTO y no reenvia al recuperar otra instancia', async () => {
      const pending = await queued(), count = deliveries; mode = failure;
      try { assert.equal((await first.enviarPendiente(pending.id)).estado,'INCIERTO'); } finally { mode='ok'; }
      const receipt = await second.enviarPendiente(pending.id); assert.equal(receipt.estado,'INCIERTO'); assert.equal(receipt.requiereRevision,true); assert.equal(deliveries,count+1);
      const before=await snapshot(); await native.confirmarNativo(pending.id); assert.deepEqual(await snapshot(),before);
    });
    await check('Correo durable: fallo al reservar no hace HTTP; la reserva pendiente admite intento explicito posterior', async () => {
      const pending=await queued(), count=deliveries;
      await trigger('identidad_correo','UPDATE', async()=>{ await assert.rejects(first.enviarPendiente(pending.id), error=>error.getStatus()===503); });
      assert.equal(deliveries,count); assert.equal((await mailRow(pending.id)).estado,'PENDIENTE');
      assert.equal((await second.enviarPendiente(pending.id)).estado,'ENVIADO'); assert.equal(deliveries,count+1);
    });
    await check('Correo durable: respuesta SMTP aceptada y fallo al persistir recibo conservan ENVIANDO sin repetir HTTP', async () => {
      const pending=await queued(), count=deliveries;
      await admin.query(`CREATE FUNCTION rund.reject_mail_ack() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO ACK'; END $$;
        CREATE TRIGGER reject_mail_ack BEFORE UPDATE ON rund.identidad_correo FOR EACH ROW WHEN(NEW.estado='ENVIADO') EXECUTE FUNCTION rund.reject_mail_ack()`);
      try { await assert.rejects(first.enviarPendiente(pending.id), error=>error.getStatus()===503); }
      finally { await admin.query('DROP TRIGGER reject_mail_ack ON rund.identidad_correo;DROP FUNCTION rund.reject_mail_ack()'); }
      assert.equal((await mailRow(pending.id)).estado,'ENVIANDO'); assert.equal((await second.enviarPendiente(pending.id)).estado,'ENVIANDO'); assert.equal(deliveries,count+1);
    });
    await check('Correo durable: reserva sobreviviente a reinicio no se reclama por lease o timeout', async () => {
      const pending=await queued(), count=deliveries;
      await admin.query("UPDATE rund.identidad_correo SET estado='ENVIANDO',intento_id=$2,iniciada_en=clock_timestamp() WHERE intencion_id=$1",[pending.id,randomUUID()]);
      await peer.destroy(); peer=new DataSource({...ds.options,extra:{max:2}}); await peer.initialize();
      second=new AuthIdentityMailService(peer,new AuthIdentityMailClient());
      assert.equal((await second.enviarPendiente(pending.id)).estado,'ENVIANDO'); assert.equal(deliveries,count);
    });
    await check('Correo durable: identidades y estados terminales no se borran, resetean o cambian de intento', async () => {
      const before=await snapshot();
      for(const sql of ['DELETE FROM rund.identidad_correo WHERE intencion_id=$1',
        "UPDATE rund.identidad_correo SET estado='PENDIENTE',intento_id=NULL,iniciada_en=NULL,resuelta_en=NULL WHERE intencion_id=$1",
        "UPDATE rund.identidad_correo SET intento_id=gen_random_uuid() WHERE intencion_id=$1",
        "UPDATE rund.identidad_correo SET creada_en=clock_timestamp() WHERE intencion_id=$1"])
        await assert.rejects(admin.query(sql,[item.id]),/correo|Correo/);
      assert.deepEqual(await snapshot(),before);
    });
    await check('Correo durable: 016 recupera confirmacion previa sin aviso y es repetible sin reenviar o modificar recibos', async () => {
      const pending=await apply(await reserved(await prepare())), count=deliveries;
      await admin.query('ALTER TABLE rund.identidad_contexto_nativo DISABLE TRIGGER encolar_correo_identidad_confirmada');
      try { await native.confirmarNativo(pending.id); } finally { await admin.query('ALTER TABLE rund.identidad_contexto_nativo ENABLE TRIGGER encolar_correo_identidad_confirmada'); }
      assert.equal(await mailRow(pending.id),undefined);
      const sql=fs.readFileSync(path.join(rund,'db/migrations/016_rund_identidad_correo.sql'),'utf8');
      await admin.query(sql); assert.equal((await mailRow(pending.id)).estado,'PENDIENTE'); const before=await snapshot();
      await admin.query(sql); await admin.query(sql); assert.deepEqual(await snapshot(),before); assert.equal(deliveries,count);
      await assert.rejects(ds.query('SELECT * FROM auth.personas'),/does not exist/);
    });
    await check('Correo durable: escritor activo y recibos manuales anteriores conservan contrato; servicio de correo no se activa al importar', async () => {
      const count=deliveries;
      await assert.rejects(first.consultar(randomUUID()),error=>error.getStatus()===404);
      assert.equal(confirmed.resultado.welcomeEmail.sent,false); assert.equal(deliveries,count);
      assert.equal((await ds.query("SELECT count(*) FROM rund.identidad_correo WHERE estado NOT IN ('PENDIENTE','ENVIANDO','ENVIADO','INCIERTO')"))[0].count,'0');
    });
    await require('./verify-rund-mail-validation.cjs')(pgConfig,runtime,check,{...ctx,queued,first,second,
      mailRow,deliveries:()=>deliveries});
    await require('./verify-rund-mail-reconciliation.cjs')(pgConfig,runtime,check,{...ctx,queued,first,second,
      mailRow,deliveries:()=>deliveries});
  } finally {
    if(savedUrl===undefined)delete process.env.NOTIFICATIONS_SERVICE_URL;else process.env.NOTIFICATIONS_SERVICE_URL=savedUrl;
    if(peer?.isInitialized)await peer.destroy();
    await new Promise(resolve=>{stub.close(resolve);stub.closeAllConnections();});
  }
};
