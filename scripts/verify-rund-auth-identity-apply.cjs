/* Aplicador Auth real, HTTP y transacciones en el cluster ficticio; no abre .env. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {randomUUID}=require('node:crypto');
module.exports=async function verifyApply(pgConfig,runtime,check,{database,authUrl,authToken,authFixture}) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {AuthIdentityOperationClient}=require(path.join(rund,'dist/common/auth-identity-operation.client'));
  const {identityWriteFingerprint}=require(path.join(rund,'dist/common/auth-identity-command'));
  const bcrypt=require(path.join(rund,'node_modules/bcryptjs'));
  const client=new AuthIdentityOperationClient(),route='/internal/rund/v1/personas/escritura/operaciones/';
  const keys=['AUTH_SERVICE_URL','AUTH_INTERNAL_SERVICE_TOKEN'],saved=keys.map(key=>process.env[key]);
  let serial=0;
  const command=(overrides={})=>{const marker=randomUUID().replace(/-/g,'').slice(0,14);return {
    version:1,actorId:randomUUID(),payload:{documentNumber:'63'+marker,documentType:'CC',primer_nombre:'ANA',primer_apellido:'FICTICIA',segundo_apellido:null,genero:'F',fechaNacimiento:'2000-02-29'},
    options:{relaxValidation:false,preserveTerritorial:true},territorial:null,emailFinal:`apply-${++serial}-${marker}@example.test`,phoneFinal:'3001234567',finalFullName:'ANA FICTICIA',...overrides};};
  const register=async cmd=>{const id=randomUUID();await client.registrar(id,identityWriteFingerprint(cmd));return id;};
  const send=async(id,body,status=200,headers={'x-internal-service-token':authToken})=>{
    const res=await fetch(authUrl+route+id+'/aplicar',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal(res.status,status,JSON.stringify({response:await res.clone().text(),fixtureError:authFixture.lastApplyError()}));return {res,body:await res.json()};};
  const body=cmd=>({comando:cmd,huellaComando:identityWriteFingerprint(cmd)});
  const snapshot=async schema=>{const result={};for(const {tablename} of (await database.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',[schema])).rows){
    if(tablename==='rund_identidad_operacion')continue;
    result[tablename]=(await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${tablename}" t ORDER BY to_jsonb(t)::text`)).rows;
  }return result;};
  const person=async cmd=>(await database.query('SELECT * FROM auth.personas WHERE num_identificacion=$1',[cmd.payload.documentNumber])).rows[0];
  const user=async personaId=>(await database.query('SELECT * FROM auth."user" WHERE id_person=$1',[personaId])).rows[0];
  const nativeBefore=await snapshot('rund');
  let firstCommand,firstId,firstReceipt;
  try {
    process.env.AUTH_SERVICE_URL=authUrl;process.env.AUTH_INTERNAL_SERVICE_TOKEN=authToken;
    await check('Aplicación Auth: token obligatorio y bandera apagada no escriben; ejecutor sin permisos RUND',async()=>{
      const cmd=command(),id=await register(cmd),before=await snapshot('auth');
      for(const headers of [{},{authorization:'Bearer ficticio'},{'x-internal-service-token':'incorrecto'}])await send(id,body(cmd),401,headers);
      authFixture.setApplyEnabled(false);try{await send(id,body(cmd),503);}finally{authFixture.setApplyEnabled(true);}
      assert.equal((await client.consultar(id)).estado,'REGISTRADA');assert.deepEqual(await snapshot('auth'),before);assert(await authFixture.applyHasNoRundPrivileges());
    });
    await check('Aplicación Auth: comando modificado, huella ajena, ausencia y cancelación nunca aplican identidad',async()=>{
      const cmd=command(),id=await register(cmd),before=await snapshot('auth');
      await send(id,{...body(cmd),comando:{...cmd,phoneFinal:'999'}},409);
      const changed={...cmd,phoneFinal:'999'};await send(id,body(changed),409);
      await send(id,{...body(cmd),comando:{...cmd,password:'extra'}},400);
      await send(randomUUID(),body(cmd),404);await client.cancelar(id,identityWriteFingerprint(cmd));await send(id,body(cmd),409);
      assert.deepEqual(await snapshot('auth'),before);
    });
    await check('Aplicación Auth: crea persona, cuenta inactiva temporal bcrypt compatible y rol en un commit sin perfil RUND',async()=>{
      firstCommand=command();firstId=await register(firstCommand);
      const responses=await Promise.all(Array.from({length:6},()=>send(firstId,body(firstCommand))));
      const {res,body:response}=responses[0];responses.forEach(value=>assert.deepEqual(value.body.data,response.data));assert.equal(res.headers.get('cache-control'),'private, no-store');
      firstReceipt=response.data.operacion;assert.equal(firstReceipt.estado,'APLICADA');assert(firstReceipt.identidadAplicada);
      const p=await person(firstCommand),u=await user(p.id_person);assert.equal(firstReceipt.resultado.personaId,p.id_person);assert.equal(firstReceipt.resultado.usuarioId,u.id_user);
      assert.equal(firstReceipt.resultado.usuarioCreado,true);assert.equal(u.is_active,false);assert.equal(u.password_temp,true);
      assert(await bcrypt.compare(firstCommand.payload.documentNumber,u.password_hash));assert.equal(bcrypt.getRounds(u.password_hash),10);
      assert.equal(p.fec_nacimiento.toISOString().slice(0,10),'2000-02-29');
      assert.equal((await database.query('SELECT * FROM auth.user_roles WHERE id_user=$1 AND is_active=true',[u.id_user])).rows.length,1);
      assert.deepEqual(await snapshot('rund'),nativeBefore);assert(!JSON.stringify(firstReceipt).includes('password'));
    });
    await check('Aplicación Auth: seis reintentos simultáneos y consulta devuelven el mismo resultado sin mutar cuenta o recibo',async()=>{
      const before=await snapshot('auth'),receipt=(await database.query('SELECT * FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[firstId])).rows;
      const repeated=await Promise.all(Array.from({length:6},()=>client.aplicar(firstId,firstCommand)));
      repeated.forEach(value=>assert.deepEqual(value,firstReceipt));assert.deepEqual(await client.consultar(firstId),firstReceipt);
      assert.deepEqual(await client.registrar(firstId,identityWriteFingerprint(firstCommand)),firstReceipt);
      await assert.rejects(client.cancelar(firstId,identityWriteFingerprint(firstCommand)),error=>error.getStatus()===409);
      assert.deepEqual(await snapshot('auth'),before);assert.deepEqual((await database.query('SELECT * FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[firstId])).rows,receipt);
    });
    await check('Aplicación Auth: actualiza una identidad existente igual que el adaptador local y conserva contraseña/activación',async()=>{
      const {upsertRundAuthIdentityWithManager}=require(path.join(rund,'dist/modules/banco-docentes/rund-auth-identity-write'));
      const {identityWriteNormalization}=require(path.join(root,'backend/auth-service/dist/users/rund-identity-write.normalization'));
      const cmd={...firstCommand,finalFullName:'ANA FICTICIA ACTUALIZADA',emailFinal:'changed-'+randomUUID()+'@example.test',phoneFinal:'3007654321',
        payload:{...firstCommand.payload,documentType:'CE',primer_nombre:'ANITA',segundo_apellido:'NUEVO',fechaNacimiento:'2001-03-04'}};
      const previous=await user(firstReceipt.resultado.personaId);let expected,expectedPerson;
      await database.query('BEGIN');try{
        expected=await upsertRundAuthIdentityWithManager({query:async(sql,values)=>(await database.query(sql,values)).rows},
          {...cmd,payload:{...cmd.payload,fechaNacimiento:new Date(cmd.payload.fechaNacimiento+'T00:00:00Z')},territorial:undefined},identityWriteNormalization);
        expectedPerson=await person(cmd);
      }finally{await database.query('ROLLBACK');}
      const id=await register(cmd),applied=await client.aplicar(id,cmd),result=applied.resultado;
      assert.deepEqual(result,JSON.parse(JSON.stringify({personaId:expected.authPersonId,usuarioId:expected.authUser.id_user,usuarioCreado:expected.authUserCreated,camposModificados:expected.personaChangedFields,cambios:expected.profileChanges})));
      assert.deepEqual(await person(cmd),expectedPerson);const current=await user(result.personaId);
      assert.equal(current.password_hash,previous.password_hash);assert.equal(current.is_active,previous.is_active);assert.equal(current.password_temp,previous.password_temp);
      assert.equal(current.username,cmd.emailFinal);assert.equal(result.usuarioCreado,false);
    });
    await check('Aplicación Auth: respuesta perdida tras commit se recupera por GET y reintento conserva resultado y contraseña',async()=>{
      const cmd=command(),id=await register(cmd);authFixture.dropNextApplyResponse();
      await assert.rejects(client.aplicar(id,cmd),error=>error.getStatus()===503);
      const receipt=await new AuthIdentityOperationClient().consultar(id),before=await snapshot('auth');assert.equal(receipt.estado,'APLICADA');
      assert.deepEqual(await client.aplicar(id,cmd),receipt);assert.deepEqual(await snapshot('auth'),before);
    });
    await check('Aplicación Auth: bigint territorial exacto, fallback confiable por correo y reactivación de rol conservan cuenta existente',async()=>{
      const cmd=command({options:{relaxValidation:false,preserveTerritorial:false},territorial:{id:'9007199254740993'}}),id=await register(cmd);
      const created=await client.aplicar(id,cmd),uid=created.resultado.usuarioId,pid=created.resultado.personaId;
      assert.equal((await person(cmd)).id_seccional,'9007199254740993');const original=await user(pid);
      await database.query('UPDATE auth."user" SET is_active=true,password_temp=false WHERE id_user=$1',[uid]);
      await database.query('UPDATE auth.user_roles SET is_active=false WHERE id_user=$1',[uid]);
      const changed={...cmd,payload:{...cmd.payload,documentNumber:'OTRO-'+randomUUID().slice(0,12),fechaNacimiento:null},phoneFinal:null,
        options:{relaxValidation:true,preserveTerritorial:true},territorial:{id:'1'}};
      const updated=await client.aplicar(await register(changed),changed);
      assert.equal(updated.resultado.personaId,pid);assert.equal(updated.resultado.usuarioId,uid);assert.equal(updated.resultado.usuarioCreado,false);
      const p=await person(cmd),u=await user(pid);assert.equal(p.id_seccional,'9007199254740993');assert.equal(p.tel_celular,cmd.phoneFinal);
      assert.equal(p.fec_nacimiento.toISOString().slice(0,10),cmd.payload.fechaNacimiento);assert.equal(await person(changed),undefined);
      assert.equal(u.password_hash,original.password_hash);assert.equal(u.is_active,true);assert.equal(u.password_temp,false);
      assert.equal((await database.query('SELECT * FROM auth.user_roles WHERE id_user=$1 AND is_active=true',[uid])).rows.length,1);
    });
    await check('Aplicación Auth: operaciones distintas simultáneas para el mismo documento no duplican persona, cuenta ni rol',async()=>{
      const cmd=command(),ids=await Promise.all([register(cmd),register(cmd)]),results=await Promise.all(ids.map(id=>client.aplicar(id,cmd)));
      assert.equal(results[0].resultado.personaId,results[1].resultado.personaId);assert.equal(results[0].resultado.usuarioId,results[1].resultado.usuarioId);
      assert.equal(results.filter(value=>value.resultado.usuarioCreado).length,1);
      const p=await person(cmd);assert.equal((await database.query('SELECT * FROM auth.personas WHERE num_identificacion=$1',[cmd.payload.documentNumber])).rows.length,1);
      assert.equal((await database.query('SELECT * FROM auth."user" WHERE id_person=$1',[p.id_person])).rows.length,1);
      assert.equal((await database.query('SELECT * FROM auth.user_roles WHERE id_user=$1',[results[0].resultado.usuarioId])).rows.length,1);
    });
    await check('Aplicación Auth: fallo al persistir resultado revierte persona/cuenta/rol y permite reintentar el registro intacto',async()=>{
      const cmd=command(),id=await register(cmd),before=await snapshot('auth'),receipt=await client.consultar(id);
      await database.query(`CREATE FUNCTION auth.reject_apply_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.estado='APLICADA' THEN RAISE EXCEPTION 'FALLO FICTICIO APLICACION'; END IF; RETURN NEW; END $$;
        CREATE TRIGGER reject_apply_fixture BEFORE UPDATE ON auth.rund_identidad_operacion FOR EACH ROW EXECUTE FUNCTION auth.reject_apply_fixture()`);
      try{await assert.rejects(client.aplicar(id,cmd),error=>error.getStatus()===503);}finally{
        await database.query('DROP TRIGGER reject_apply_fixture ON auth.rund_identidad_operacion; DROP FUNCTION auth.reject_apply_fixture()');}
      assert.deepEqual(await snapshot('auth'),before);assert.deepEqual(await client.consultar(id),receipt);
      assert.equal((await client.aplicar(id,cmd)).estado,'APLICADA');
    });
    await check('Aplicación Auth: conflicto de correo conserva datos y no confirma el recibo aplicado',async()=>{
      const owner=await user(firstReceipt.resultado.personaId),cmd=command({emailFinal:owner.username}),id=await register(cmd),before=await snapshot('auth');
      await send(id,body(cmd),400);assert.deepEqual(await snapshot('auth'),before);assert.equal((await client.consultar(id)).estado,'REGISTRADA');
    });
    await check('Aplicación Auth: carrera aplicar/cancelar termina aplicada o cancelada, nunca ambas ni con identidad huérfana',async()=>{
      const cmd=command(),id=await register(cmd),results=await Promise.allSettled([client.aplicar(id,cmd),client.cancelar(id,identityWriteFingerprint(cmd))]);
      assert.equal(results.filter(value=>value.status==='fulfilled').length,1);
      for(const result of results)if(result.status==='rejected')assert.equal(result.reason.getStatus(),409);
      const receipt=await client.consultar(id),p=await person(cmd);
      assert.equal(Boolean(p),receipt.estado==='APLICADA');assert(['APLICADA','CANCELADA'].includes(receipt.estado));
    });
    await check('Aplicación Auth: migración 670 repetible conserva recibos; resultado aplicado es inmutable y no acepta recibo vacío',async()=>{
      const sql=fs.readFileSync(path.join(root,'db/migrations/670_auth_rund_identidad_aplicacion.sql'),'utf8');
      const rows=async()=>(await database.query('SELECT * FROM auth.rund_identidad_operacion ORDER BY operacion_id')).rows;
      const before=await rows();await database.query(sql);await database.query(sql);assert.deepEqual(await rows(),before);
      for(const statement of ["UPDATE auth.rund_identidad_operacion SET resultado='{}'::jsonb WHERE operacion_id=$1",
        "UPDATE auth.rund_identidad_operacion SET estado='CANCELADA',cancelada_en=now() WHERE operacion_id=$1",
        'DELETE FROM auth.rund_identidad_operacion WHERE operacion_id=$1'])await assert.rejects(database.query(statement,[firstId]),/intención RUND|Transición/);
      const id=await register(command());await assert.rejects(database.query("UPDATE auth.rund_identidad_operacion SET estado='APLICADA',aplicada_en=now(),resultado='{}'::jsonb WHERE operacion_id=$1",[id]),/check constraint/);
    });
    await check('Aplicación Auth: indisponibilidad/404/DTO parcial no activan alternativa SQL; tablas nativas RUND permanecen intactas',async()=>{
      const cmd=command(),id=await register(cmd),before=await snapshot('auth');
      try{for(const mode of ['unavailable','missing','partial']){authFixture.setOperationMode(mode);await assert.rejects(client.aplicar(id,cmd),error=>error.getStatus()===503);}}
      finally{authFixture.setOperationMode('normal');}
      assert.deepEqual(await snapshot('auth'),before);assert.deepEqual(await snapshot('rund'),nativeBefore);assert.equal((await client.consultar(id)).estado,'REGISTRADA');
    });
  }finally{
    authFixture.setApplyEnabled(true);authFixture.setOperationMode('normal');
    keys.forEach((key,i)=>{if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];});
  }
};
