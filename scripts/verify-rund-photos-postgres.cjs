// Real PostgreSQL, synthetic identities and TEMP tables only. No business writes.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { deflateSync } = require('node:zlib');
const { root,serviceRoot,clientForLocal,reportError } = require('./rund-documental/local-context.cjs');
require(path.join(serviceRoot,'node_modules/ts-node')).register({ transpileOnly: true,project: path.join(serviceRoot,'tsconfig.json') });
const { RundPhotosService } = require(path.join(serviceRoot,'src/pta/banco-docentes/rund-photos.service.ts'));

function png() {
  const chunk=(name,data)=>{ const b=Buffer.alloc(data.length+12); b.writeUInt32BE(data.length); b.write(name,4); data.copy(b,8); return b; };
  const header=Buffer.alloc(13); header.writeUInt32BE(200); header.writeUInt32BE(200,4); header[8]=8; header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc(120200))),chunk('IEND',Buffer.alloc(0))]);
}
(async()=>{
  const client=clientForLocal();
  try {
    await client.connect(); await client.query('BEGIN');
    // Verify the full migration, including permission catalog/grants, transactionally.
    const sql=fs.readFileSync(path.join(root,'db/migrations/674_rund_foto_perfil_validation.sql'),'utf8').replace(/^BEGIN;|COMMIT;$/gm,'');
    await client.query(sql);
    const catalog=await client.query("SELECT code FROM auth.permission WHERE code IN ('banco-docentes.rund.photos.manage','banco-docentes.rund.photos.validate')");
    assert.equal(catalog.rows.length,2);
    await client.query('CREATE TEMP TABLE personas(id_person uuid PRIMARY KEY,num_identificacion text) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE rund_foto_perfil (LIKE academic_work_plan.rund_foto_perfil INCLUDING ALL) ON COMMIT DROP');
    const person=randomUUID(),other=randomUUID();
    await client.query('INSERT INTO pg_temp.personas VALUES($1,$2),($3,$4)',[person,'SYNTHETIC-1',other,'SYNTHETIC-2']);
    const query=async(sql,values)=>{
      const isolated=sql.replaceAll('academic_work_plan.rund_foto_perfil','pg_temp.rund_foto_perfil').replaceAll('auth.personas','pg_temp.personas');
      assert(!/\b(auth|academic_work_plan)\./.test(isolated));
      return (await client.query(isolated,values)).rows;
    };
    const db={ query,transaction: async callback=>{
      await client.query('SAVEPOINT photo_operation');
      try { const result=await callback({ query }); await client.query('RELEASE SAVEPOINT photo_operation'); return result; }
      catch(error) { await client.query('ROLLBACK TO SAVEPOINT photo_operation'); await client.query('RELEASE SAVEPOINT photo_operation'); throw error; }
    } };
    const photos=new RundPhotosService(db);
    const file={ buffer: png(),originalname: 'synthetic.png',mimetype: 'image/png' };
    assert.equal((await photos.published(person)).url,null);
    let state=await photos.upload(person,file,'SYNTHETIC_TEACHER','PTA');
    const first=state.solicitud.id;
    assert.equal(state.solicitud.estado,'PENDIENTE'); assert.equal((await photos.published(person)).url,null);
    await assert.rejects(photos.preview(other,first));
    state=await photos.decide(person,first,'APROBADA',null,'SYNTHETIC_REVIEWER');
    assert.equal(state.publicada.id,first); assert.equal((await photos.published(person)).id,first);
    state=await photos.upload(person,file,'SYNTHETIC_TEACHER','PTA');
    const second=state.solicitud.id;
    assert.equal(state.publicada.id,first); assert.equal((await photos.published(person)).id,first);
    await assert.rejects(photos.decide(person,second,'RECHAZADA','','SYNTHETIC_REVIEWER'));
    await photos.decide(person,second,'RECHAZADA','Rostro fuera del centro','SYNTHETIC_REVIEWER');
    assert.equal((await photos.published(person)).id,first);
    state=await photos.upload(person,file,'SYNTHETIC_UPLOADER','RUND');
    const stale=state.solicitud.id;
    state=await photos.upload(person,file,'SYNTHETIC_UPLOADER','MASIVA');
    const latest=state.solicitud.id;
    await assert.rejects(photos.decide(person,stale,'APROBADA',null,'SYNTHETIC_REVIEWER'));
    assert.equal((await photos.published(person)).id,first);
    state=await photos.decide(person,latest,'APROBADA','Foto correcta','SYNTHETIC_REVIEWER');
    assert.equal(state.publicada.id,latest); assert.equal((await photos.published(person)).id,latest);
    await assert.rejects(photos.decide(person,latest,'APROBADA',null,'SYNTHETIC_REVIEWER'));
    // An approved image survives even after >50 subsequent rejected requests.
    for(let n=0;n<51;n++) {
      state=await photos.upload(person,file,'SYNTHETIC_TEACHER','PTA');
      await photos.decide(person,state.solicitud.id,'RECHAZADA','Imagen incorrecta','SYNTHETIC_REVIEWER');
    }
    assert.equal((await photos.status(person)).publicada.id,latest);
    const counts=await query("SELECT estado,count(*)::int total FROM academic_work_plan.rund_foto_perfil GROUP BY estado");
    assert.equal(counts.find(row=>row.estado==='APROBADA').total,1);
    await client.query('ROLLBACK');
    console.log('PASS: migration, permission catalog, pending publication, rejection, approval, ownership, stale decisions and history retention. Synthetic TEMP tables; all changes rolled back.');
  } finally { await client.query('ROLLBACK').catch(()=>{}); await client.end(); }
})().catch(reportError);
