/* Auth real de solo lectura y consumidor RUND separado. Solo el cluster y SMTP ficticios. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID } = require('node:crypto');
module.exports = async function verifyMailValidation(pgConfig,runtime,check,ctx) {
  assert.equal(pgConfig.database,'rund_integration'); assert.equal(pgConfig.host,'127.0.0.1');
  assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const { database,admin,ds,authFixture,snapshot,identities,queued,first,second,mailRow,deliveries } = ctx;
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {AuthIdentityMailValidationClient}=require(path.join(rund,'dist/common/auth-identity-mail-validation.client'));
  const {identityWriteFingerprint}=require(path.join(rund,'dist/common/auth-identity-command'));
  const client=new AuthIdentityMailValidationClient(),headersStart=authFixture.mailValidationRequestHeaders().length;
  const details=async item => {
    const r=(await admin.query(`SELECT o.operacion_auth_id,n.contexto,n.resultado_nativo FROM rund.identidad_operacion o
      JOIN rund.identidad_contexto_nativo n USING(intencion_id) WHERE o.intencion_id=$1`,[item.id])).rows[0];
    const op=(await database.query('SELECT resultado FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[r.operacion_auth_id])).rows[0];
    return {op:r.operacion_auth_id,command:r.contexto.comandoAuth,user:op.resultado.usuarioId,person:op.resultado.personaId};
  };
  const unchanged=async work => { const before=await snapshot(),owner=await identities(),sent=deliveries();
    await work(); assert.deepEqual(await snapshot(),before); assert.deepEqual(await identities(),owner); assert.equal(deliveries(),sent); };
  const rejected=async(item,motivo) => {
    const d=await details(item);
    await unchanged(async()=>{
      const result=await client.validar(d.op,d.command); assert.equal(result.apta,false); assert.equal(result.motivo,motivo);
      await assert.rejects(first.enviarPendiente(item.id),error=>error.getStatus()===503);
      const row=await mailRow(item.id); assert.equal(row.estado,'PENDIENTE'); assert.equal(row.intento_id,null);
    });
  };
  try {
    await check('Vigencia correo: consulta Auth real de solo lectura sin permisos RUND o escritura de cuentas',async()=>{
      assert(await authFixture.mailValidationReadOnlyOwner()); await assert.rejects(ds.query('SELECT * FROM auth."user"'),/does not exist/);
    });
    await check('Vigencia correo: token interno obligatorio, comando/huella propios y no-store sin efectos',async()=>{
      const item=await queued(),d=await details(item),url=process.env.AUTH_SERVICE_URL+'/internal/rund/v1/personas/escritura/operaciones/'+d.op+'/correo/validar';
      const body={comando:d.command,huellaComando:identityWriteFingerprint(d.command)};
      await unchanged(async()=>{
        for(const headers of [{},{authorization:'Bearer ficticio'},{'x-internal-service-token':'incorrecto'}]) {
          const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
          assert.equal(response.status,401); await response.arrayBuffer();
        }
        const send=async(input,expected,id=d.op)=>{
          const res=await fetch(url.replace(d.op,id),{method:'POST',headers:{'x-internal-service-token':process.env.AUTH_INTERNAL_SERVICE_TOKEN,
            'Content-Type':'application/json'},body:JSON.stringify(input)});
          assert.equal(res.status,expected,await res.clone().text()); return res;
        };
        await send({...body,extra:'no'},400); await send({...body,huellaComando:'0'.repeat(64)},409);
        const changed={...d.command,phoneFinal:'999'};await send({comando:changed,huellaComando:identityWriteFingerprint(changed)},409);
        await send(body,404,randomUUID());
        const response=await send(body,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
        const receipt=(await response.json()).data.validacion;assert.equal(receipt.apta,true);assert.equal(Object.keys(receipt).length,5);
        assert(!/password|username|@|document|preimagen|postimagen/i.test(JSON.stringify(receipt)));
      });
    });
    await check('Vigencia correo: alta intacta permite un intento; consulta repetida no modifica cuenta o publica correo',async()=>{
      const item=await queued(),d=await details(item);
      await unchanged(async()=>{for(let i=0;i<2;i++)assert.equal((await client.validar(d.op,d.command)).apta,true);});
      const count=deliveries();assert.equal((await first.enviarPendiente(item.id)).estado,'ENVIADO');assert.equal(deliveries(),count+1);
      await second.enviarPendiente(item.id);assert.equal(deliveries(),count+1);
    });
    await check('Vigencia correo: intención no aplicada, cancelada o cuenta existente nunca autorizan bienvenida',async()=>{
      const item=await queued(),d=await details(item);
      const {AuthIdentityOperationClient}=require(path.join(rund,'dist/common/auth-identity-operation.client'));
      const operations=new AuthIdentityOperationClient(),hash=identityWriteFingerprint(d.command);
      const id=randomUUID();await operations.registrar(id,hash);
      await unchanged(async()=>assert.equal((await client.validar(id,d.command)).motivo,'OPERACION_NO_ELEGIBLE'));
      await operations.cancelar(id,hash);
      await unchanged(async()=>assert.equal((await client.validar(id,d.command)).motivo,'OPERACION_NO_ELEGIBLE'));
      const existing=randomUUID();await operations.registrar(existing,hash);
      assert.equal((await operations.aplicar(existing,d.command)).resultado.usuarioCreado,false);
      await unchanged(async()=>assert.equal((await client.validar(existing,d.command)).motivo,'OPERACION_NO_ELEGIBLE'));
    });
    await check('Vigencia correo: bcrypt rechaza clave distinta aun con postimagen y revisiones iniciales intactas',async()=>{
      const bcrypt=require(require.resolve('bcrypt',{paths:[path.join(root,'backend/auth-service')]}));
      const different=await bcrypt.hash('CLAVE_FICTICIA_DISTINTA',10);
      await database.query(`CREATE FUNCTION auth.fixture_initial_mail_password() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN NEW.password_hash := '${different}'; RETURN NEW; END $$;
        CREATE TRIGGER fixture_initial_mail_password BEFORE INSERT ON auth."user"
        FOR EACH ROW EXECUTE FUNCTION auth.fixture_initial_mail_password()`);
      let item;
      try {item=await queued();}
      finally {await database.query('DROP TRIGGER fixture_initial_mail_password ON auth."user";DROP FUNCTION auth.fixture_initial_mail_password()');}
      const d=await details(item);
      const revisions=(await database.query(`SELECT u.xmin::text AS actual,
        e.postimagen->'usuarios'->0->>'revision' AS captured FROM auth."user" u
        JOIN auth.rund_identidad_efecto e ON e.usuario_id=u.id_user WHERE u.id_user=$1`,[d.user])).rows[0];
      assert.equal(revisions.actual,revisions.captured);
      await rejected(item,'CREDENCIALES_NO_VIGENTES');
    });
    for(const field of ['dir_email','username','num_identificacion','rol']) await check('Vigencia correo: cambio de '+field+' bloquea SMTP y conserva aviso pendiente',async()=>{
      const item=await queued(),d=await details(item);
      if(field==='dir_email')await database.query('UPDATE auth.personas SET dir_email=$2 WHERE id_person=$1',[d.person,'otro-'+randomUUID()+'@example.test']);
      if(field==='username')await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1',[d.user,'otro-'+randomUUID()+'@example.test']);
      if(field==='num_identificacion')await database.query('UPDATE auth.personas SET num_identificacion=$2 WHERE id_person=$1',[d.person,('otro-'+randomUUID()).slice(0,25)]);
      if(field==='rol')await database.query('UPDATE auth.user_roles SET is_active=false WHERE id_user=$1',[d.user]);
      await rejected(item,'IDENTIDAD_NO_VIGENTE');
    });
    for(const field of ['password_temp','is_active','password_hash','misma-fila']) await check('Vigencia correo: cambio de '+field+' impide compartir credenciales históricas',async()=>{
      const item=await queued(),d=await details(item);
      if(field==='password_temp')await database.query('UPDATE auth."user" SET password_temp=false WHERE id_user=$1',[d.user]);
      if(field==='is_active')await database.query('UPDATE auth."user" SET is_active=true WHERE id_user=$1',[d.user]);
      if(field==='password_hash')await database.query('UPDATE auth."user" SET password_hash=$2 WHERE id_user=$1',[d.user,'hash-incompatible']);
      if(field==='misma-fila')await database.query('UPDATE auth."user" SET password_temp=password_temp WHERE id_user=$1',[d.user]);
      await rejected(item,'CREDENCIALES_NO_VIGENTES');
    });
    await check('Vigencia correo: cambio de cuenta durante comparación asíncrona se observa antes de confirmar apta',async()=>{
      const item=await queued(),d=await details(item);
      authFixture.setMailValidationReadHook(async()=>{
        authFixture.setMailValidationReadHook(undefined);
        await database.query('UPDATE auth."user" SET password_temp=false WHERE id_user=$1',[d.user]);
      });
      assert.equal((await client.validar(d.op,d.command)).apta,false);
      await rejected(item,'CREDENCIALES_NO_VIGENTES');
    });
    await check('Vigencia correo: propietario caído o contrato incompleto no reservan; recuperar Auth permite intento explícito',async()=>{
      const item=await queued();
      for(const mode of ['unavailable','missing','partial']) {
        authFixture.setMailValidationMode(mode);
        try { await unchanged(async()=>{await assert.rejects(first.enviarPendiente(item.id),error=>error.getStatus()===503);}); }
        finally {authFixture.setMailValidationMode('normal');}
        assert.equal((await mailRow(item.id)).estado,'PENDIENTE');
      }
      assert.equal((await second.enviarPendiente(item.id)).estado,'ENVIADO');
    });
    await check('Vigencia correo: ENVIANDO/INCIERTO/ENVIADO se recuperan aun con Auth caído sin otro intento',async()=>{
      for(const state of ['ENVIANDO','INCIERTO','ENVIADO']) {
        const item=await queued();await admin.query("UPDATE rund.identidad_correo SET estado='ENVIANDO',intento_id=$2,iniciada_en=clock_timestamp() WHERE intencion_id=$1",[item.id,randomUUID()]);
        if(state!=='ENVIANDO')await admin.query('UPDATE rund.identidad_correo SET estado=$2,resuelta_en=clock_timestamp() WHERE intencion_id=$1',[item.id,state]);
        const calls=authFixture.mailValidationRequestHeaders().length;authFixture.setMailValidationMode('unavailable');
        try {await unchanged(async()=>assert.equal((await first.enviarPendiente(item.id)).estado,state));}
        finally {authFixture.setMailValidationMode('normal');}
        assert.equal(authFixture.mailValidationRequestHeaders().length,calls);
      }
    });
    await check('Vigencia correo: solo token interno y contrato mínimo; no hay copia de hashes ni SQL Auth en consumidor',async()=>{
      const headers=authFixture.mailValidationRequestHeaders().slice(headersStart);assert(headers.length>0);
      assert.equal(headers.filter(h=>!h.tokenMatches).length,3);
      assert(headers.filter(h=>h.tokenMatches).every(h=>!h.authorizationForwarded&&!h.cookieForwarded));
    });
  } finally {authFixture.setMailValidationMode('normal');authFixture.setMailValidationReadHook(undefined);}
};
