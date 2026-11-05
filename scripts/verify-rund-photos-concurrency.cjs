// Real concurrent transactions in a disposable schema on the local development DB.
// Never reads or writes business identities/photos. Always removes the test schema.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Client}=require('pg');
const {serviceRoot,localConfig,reportError}=require('./rund-documental/local-context.cjs');
require(path.join(serviceRoot,'node_modules/ts-node')).register({transpileOnly:true,project:path.join(serviceRoot,'tsconfig.json')});
const {RundPhotosService}=require(path.join(serviceRoot,'src/pta/banco-docentes/rund-photos.service.ts'));

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
(async()=>{
  const config=localConfig().database;
  const schema='photo_review_'+randomUUID().replaceAll('-','');
  assert(/^photo_review_[a-f0-9]{32}$/.test(schema));
  const admin=new Client(config);
  let created=false;
  let barrier,onLockRequested;
  const operations=[];
  const connect=async()=>{const client=new Client(config);await client.connect();return client;};
  const run=async(client,sql,params)=>{
    const isolated=sql.replaceAll('academic_work_plan.rund_foto_perfil',`${schema}.rund_foto_perfil`).replaceAll('auth.personas',`${schema}.personas`);
    assert(!/\b(auth|academic_work_plan)\./.test(isolated));
    if(sql.includes('FOR UPDATE') && onLockRequested) {onLockRequested();onLockRequested=undefined;}
    const result=await client.query(isolated,params);
    if(sql.includes('FOR UPDATE') && barrier) {const hold=barrier;barrier=undefined;hold.entered.resolve();await hold.release.promise;}
    return result.rows;
  };
  const db={
    query:async(sql,params)=>{const client=await connect();try{return await run(client,sql,params);}finally{await client.end();}},
    transaction:async callback=>{const client=await connect();try{await client.query('BEGIN');const result=await callback({query:(sql,params)=>run(client,sql,params)});await client.query('COMMIT');return result;}
      catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}},
  };
  let hold;
  try{
    await admin.connect();await admin.query(`CREATE SCHEMA ${schema}`);created=true;
    await admin.query(`CREATE TABLE ${schema}.personas(id_person uuid PRIMARY KEY)`);
    await admin.query(`CREATE TABLE ${schema}.rund_foto_perfil(LIKE academic_work_plan.rund_foto_perfil INCLUDING ALL)`);
    const person=randomUUID();await admin.query(`INSERT INTO ${schema}.personas VALUES($1)`,[person]);
    const photos=new RundPhotosService(db);
    const file={buffer:fs.readFileSync(path.join(serviceRoot,'src/pta/banco-docentes/__fixtures__/profile-photo.png')),originalname:'synthetic.png',mimetype:'image/png'};
    let state=await photos.upload(person,file,'SYNTHETIC_UPLOADER','RUND');
    await photos.decide(person,state.solicitud.id,'APROBADA',null,'SYNTHETIC_REVIEWER');
    const approved=(await photos.published(person)).id;

    await Promise.all([photos.upload(person,file,'SYNTHETIC_1','PTA'),photos.upload(person,file,'SYNTHETIC_2','MASIVA')]);
    state=await photos.status(person);
    assert.equal(state.historial.filter(row=>row.estado==='PENDIENTE').length,1);
    assert.equal(state.publicada.id,approved);

    const pending=state.solicitud.id;
    const decisions=await Promise.allSettled([
      photos.decide(person,pending,'APROBADA',null,'SYNTHETIC_REVIEWER_1'),
      photos.decide(person,pending,'RECHAZADA','Requiere otra imagen','SYNTHETIC_REVIEWER_2'),
    ]);
    assert.equal(decisions.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(decisions.find(result=>result.status==='rejected').reason.getStatus(),409);
    state=await photos.status(person);
    assert.equal(state.historial.filter(row=>row.estado==='APROBADA').length,1);
    assert.equal(state.historial.filter(row=>row.estado==='PENDIENTE').length,0);

    state=await photos.upload(person,file,'SYNTHETIC_UPLOADER','PTA');
    const stale=state.solicitud.id,stillApproved=state.publicada.id;
    hold={entered:deferred(),release:deferred()};barrier=hold;
    const upload=photos.upload(person,file,'SYNTHETIC_UPLOADER','RUND');operations.push(upload);
    await hold.entered.promise;
    const requested=deferred();onLockRequested=requested.resolve;
    const review=photos.decide(person,stale,'APROBADA',null,'SYNTHETIC_REVIEWER');operations.push(review);
    const outcome=Promise.allSettled([upload,review]);
    await requested.promise;
    hold.release.resolve();
    const results=await outcome;
    assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
    assert.equal(results[1].reason.getStatus(),409);
    state=await photos.status(person);
    assert.equal(state.publicada.id,stillApproved);assert.notEqual(state.solicitud.id,stale);
    assert.equal(state.solicitud.estado,'PENDIENTE');
    console.log('PASS: concurrent uploads keep one pending photo; concurrent approval/rejection records one decision; an approval blocked by a replacement returns 409 and preserves the published photo. Isolated synthetic schema removed.');
  }finally{
    hold?.release.resolve();await Promise.allSettled(operations);
    try { if(created) await admin.query(`DROP SCHEMA ${schema} CASCADE`); } finally { await admin.end(); }
  }
})().catch(reportError);
