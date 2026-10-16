/* Recibos persistidos, concurrencia y respuesta perdida; solo clúster ficticio temporal. */
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { randomUUID } = require('node:crypto');

module.exports = async function verifyOperations(pgConfig, runtime, check, ctx) {
  assert.equal(pgConfig.database, 'rund_integration'); assert.equal(pgConfig.host, '127.0.0.1');
  assert.match(path.basename(runtime), /^esap-rund-integration-/);
  const { database, authUrl, authToken, authFixture } = ctx;
  const { AuthIdentityOperationClient } = require(path.resolve(__dirname, '../backend/rund-service/dist/common/auth-identity-operation.client'));
  const client = new AuthIdentityOperationClient(), hash = 'a'.repeat(64), otherHash = 'b'.repeat(64);
  const keys = ['AUTH_SERVICE_URL','AUTH_INTERNAL_SERVICE_TOKEN'], saved = keys.map(key => process.env[key]);
  const route = '/internal/rund/v1/personas/escritura/operaciones';
  const migration = fs.readFileSync(path.resolve(__dirname, '../db/migrations/669_auth_rund_identidad_operacion.sql'), 'utf8');
  const rows = async () => (await database.query('SELECT * FROM auth.rund_identidad_operacion ORDER BY operacion_id')).rows;
  const snapshot = async () => {
    const result = {};
    for (const [schema,table] of [['auth','personas'],['auth','user'],['auth','user_roles'],['auth','role'],
      ['rund','Docente'],['rund','RundCampoEstado'],['rund','RundSoporteCampo'],['rund','validacion_documental'],['rund','RundAprobacionLog']]) {
      result[schema+'.'+table] = (await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    result.sequences = (await database.query("SELECT schemaname,sequencename,last_value FROM pg_sequences WHERE schemaname IN ('auth','rund') ORDER BY schemaname,sequencename")).rows;
    return result;
  };
  const send = async (suffix, { method='GET',body, status=200, headers={ 'x-internal-service-token':authToken } }={}) => {
    const res = await fetch(authUrl+route+suffix, { method, headers: { 'Content-Type':'application/json',...headers }, ...(body !== undefined ? {body:JSON.stringify(body)}:{}) });
    assert.equal(res.status,status,await res.clone().text()); return {res,body:await res.json()};
  };
  const baseline = await snapshot();
  try {
    process.env.AUTH_SERVICE_URL=authUrl; process.env.AUTH_INTERNAL_SERVICE_TOKEN=authToken;
    await check('Operaciones Auth: token obligatorio para registrar, consultar y cancelar; rol de fixture solo accede al registro',async()=>{
      const id=randomUUID();
      for(const headers of [{},{authorization:'Bearer jwt-ficticio'},{'x-internal-service-token':'incorrecto'}]) {
        await send('',{method:'POST',body:{version:1,operacionId:id,huellaComando:hash},headers,status:401});
        await send('/'+id,{headers,status:401}); await send('/'+id+'/cancelar',{method:'POST',body:{huellaComando:hash},headers,status:401});
      }
      assert(await authFixture.operationHasNoIdentityPrivileges()); assert.equal((await rows()).length,0);
    });
    await check('Operaciones Auth: inputs inválidos no crean recibos y ausencia solo se confirma con echo explícito',async()=>{
      const id=randomUUID();
      for(const body of [null,[],{}, {version:2,operacionId:id,huellaComando:hash}, {version:1,operacionId:id,huellaComando:'A'.repeat(64)},
        {version:1,operacionId:id,huellaComando:hash,documento:'NO PERSISTIR'}]) await send('',{method:'POST',body,status:400});
      await send('/no-id',{status:400}); await send('/'+id+'/cancelar',{method:'POST',body:{},status:400});
      const {res,body}=await send('/'+id); assert.equal(res.headers.get('cache-control'),'private, no-store');
      assert.deepEqual(body.data,{consulta:{operacionId:id},encontrada:false,operacion:null}); assert.equal(await client.consultar(id),null);
      await send('/'+id+'/cancelar',{method:'POST',body:{huellaComando:hash},status:404}); assert.equal((await rows()).length,0);
    });
    await check('Operaciones Auth: registros simultáneos iguales conservan un recibo y fechas, recuperable por otro cliente',async()=>{
      const id=randomUUID(), results=await Promise.all(Array.from({length:6},()=>client.registrar(id,hash)));
      assert(results.every(op=>JSON.stringify(op)===JSON.stringify(results[0])));
      assert.equal(results[0].estado,'REGISTRADA'); assert.equal(results[0].identidadAplicada,false);
      assert.deepEqual(await new AuthIdentityOperationClient().consultar(id.toUpperCase()),results[0]);
      assert.equal(Number((await database.query('SELECT count(*) FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[id])).rows[0].count),1);
      const {res}=await send('/'+id); assert.equal(res.headers.get('cache-control'),'private, no-store');
    });
    await check('Operaciones Auth: comandos con huellas diferentes compiten por ID sin sobrescribir el ganador',async()=>{
      const id=randomUUID(), results=await Promise.allSettled(Array.from({length:8},(_,i)=>client.registrar(id,i%2?hash:otherHash)));
      const stored=await client.consultar(id); assert(stored);
      assert.equal(results.filter(row=>row.status==='fulfilled').length,4);
      for(const row of results) if(row.status==='rejected') assert.equal(row.reason.getStatus(),409); else assert.equal(row.value.huellaComando,stored.huellaComando);
      assert.equal((await rows()).filter(row=>row.operacion_id===id).length,1);
    });
    await check('Operaciones Auth: respuesta perdida después del commit se recupera por ID y reintento sin duplicar efectos',async()=>{
      const id=randomUUID(); authFixture.dropNextOperationResponse();
      await assert.rejects(client.registrar(id,hash),error=>error.getStatus()===503);
      assert.equal((await rows()).filter(row=>row.operacion_id===id).length,1);
      const recovered=await new AuthIdentityOperationClient().consultar(id); assert(recovered); assert.equal(recovered.estado,'REGISTRADA');
      assert.deepEqual(await client.registrar(id,hash),recovered); assert.equal(recovered.identidadAplicada,false);
    });
    await check('Operaciones Auth: cancelar exige hash, es repetible y registrar otra vez no reactiva la intención',async()=>{
      const id=randomUUID(), original=await client.registrar(id,hash);
      await assert.rejects(client.cancelar(id,otherHash),error=>error.getStatus()===409); assert.deepEqual(await client.consultar(id),original);
      const cancelled=await client.cancelar(id,hash); assert.equal(cancelled.estado,'CANCELADA'); assert(cancelled.canceladaEn);
      assert.deepEqual(await client.cancelar(id,hash),cancelled); assert.deepEqual(await client.registrar(id,hash),cancelled);
      await assert.rejects(client.registrar(id,otherHash),error=>error.getStatus()===409);
      const raceId=randomUUID(); await client.registrar(raceId,hash);
      await Promise.all([client.registrar(raceId,hash),client.cancelar(raceId,hash),client.cancelar(raceId,hash)]);
      assert.equal((await client.consultar(raceId)).estado,'CANCELADA');
    });
    await check('Operaciones Auth: migración 669 repetible conserva recibos y restricciones impiden borrar, reescribir o resucitar',async()=>{
      const id=randomUUID(); await client.registrar(id,hash); await client.cancelar(id,hash);
      const extension=fs.readFileSync(path.resolve(__dirname,'../db/migrations/670_auth_rund_identidad_aplicacion.sql'),'utf8');
      const before=await rows(); await database.query(migration); await database.query(extension); await database.query(migration); await database.query(extension); assert.deepEqual(await rows(),before);
      for(const sql of ["UPDATE auth.rund_identidad_operacion SET huella_comando='"+otherHash+"' WHERE operacion_id=$1",
        "UPDATE auth.rund_identidad_operacion SET estado='REGISTRADA',cancelada_en=NULL WHERE operacion_id=$1",
        'DELETE FROM auth.rund_identidad_operacion WHERE operacion_id=$1']) await assert.rejects(database.query(sql,[id]),/intención RUND|Transición/);
      await assert.rejects(database.query("INSERT INTO auth.rund_identidad_operacion (operacion_id,version,huella_comando) VALUES ($1,2,$2)",[randomUUID(),hash]),/check constraint/);
      assert.deepEqual(await rows(),before);
    });
    await check('Operaciones Auth: fallo SQL no registra recibo y tabla ausente no se convierte en operación inexistente',async()=>{
      const id=randomUUID();
      await database.query(`CREATE FUNCTION auth.reject_intent_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO RECIBO'; END $$;
        CREATE TRIGGER reject_intent_fixture BEFORE INSERT ON auth.rund_identidad_operacion FOR EACH ROW EXECUTE FUNCTION auth.reject_intent_fixture()`);
      try { await assert.rejects(client.registrar(id,hash),error=>error.getStatus()===503); }
      finally { await database.query('DROP TRIGGER reject_intent_fixture ON auth.rund_identidad_operacion; DROP FUNCTION auth.reject_intent_fixture()'); }
      assert.equal(await client.consultar(id),null);
      await database.query('ALTER TABLE auth.rund_identidad_operacion RENAME TO rund_identidad_operacion_fixture_missing');
      try { await assert.rejects(client.consultar(id),error=>error.getStatus()===503); }
      finally { await database.query('ALTER TABLE auth.rund_identidad_operacion_fixture_missing RENAME TO rund_identidad_operacion'); }
    });
    await check('Operaciones Auth: caída, 404 y respuesta parcial no autorizan ni repiten registro/cancelación',async()=>{
      const id=randomUUID(); await client.registrar(id,hash); const before=await rows();
      try { for(const mode of ['unavailable','missing','partial']) {
        authFixture.setOperationMode(mode);
        for(const request of [()=>client.consultar(id),()=>client.registrar(id,hash),()=>client.cancelar(id,hash)]) await assert.rejects(request(),error=>error.getStatus()===503);
      }} finally { authFixture.setOperationMode('normal'); }
      assert.deepEqual(await rows(),before);
    });
    await check('Operaciones Auth: el transporte interno no reenvía JWT/cookies ni registra el contenido del comando',async()=>{
      const headers=authFixture.operationRequestHeaders().length;
      const id=randomUUID(); const op=await client.registrar(id,hash); await client.consultar(id); await client.cancelar(id,hash);
      assert(authFixture.operationRequestHeaders().slice(headers).every(row=>row.tokenMatches&&!row.authorizationForwarded&&!row.cookieForwarded));
      assert.deepEqual(Object.keys(op).sort(),['canceladaEn','estado','huellaComando','identidadAplicada','operacionId','registradaEn','version']);
      const columns=(await database.query("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='rund_identidad_operacion' ORDER BY ordinal_position")).rows.map(row=>row.column_name);
      assert.deepEqual(columns,['operacion_id','version','huella_comando','estado','registrada_en','cancelada_en','resultado','aplicada_en']);
    });
    await check('Operaciones Auth: registrar/recuperar/cancelar no cambia personas, cuentas, roles, perfiles, evidencias o secuencias',async()=>{
      assert.deepEqual(await snapshot(),baseline);
    });
  } finally {
    authFixture.setOperationMode('normal');
    keys.forEach((key,i)=>{if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];});
    // Los recibos no se borran: se elimina todo el clúster ficticio al terminar.
  }
};
