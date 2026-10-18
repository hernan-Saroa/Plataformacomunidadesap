/* Contrato Auth real y consumidor RUND sin privilegios Auth, solo en el cluster temporal. */
const assert=require('node:assert/strict'),path=require('node:path'),{randomUUID,randomBytes}=require('node:crypto');
module.exports=async function verifyBulkOwner(pgConfig,runtime,check,context){
  assert.equal(pgConfig.host,'127.0.0.1');assert.equal(pgConfig.database,'rund_integration');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {database,request,row,workbookBody,authUrl,authToken,authFixture,service,snapshot,territoriales,docenteId}=context;
  const rund=path.resolve(__dirname,'../backend/rund-service'),{DataSource}=require(path.join(rund,'node_modules/typeorm'));
  const {BancoDocenteEntity}=require(path.join(rund,'dist/entities/banco-docente.entity'));
  const role='rund_preview_'+randomUUID().replaceAll('-',''),password=randomBytes(24).toString('hex');
  const readonly=new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,database:pgConfig.database,
    username:role,password,entities:[BancoDocenteEntity],synchronize:false,extra:{max:1,options:'-c default_transaction_read_only=on'}});
  const query=(documento=row.DOCUMENTO_IDENTIDAD,correo=row.CORREO_INSTITUCIONAL.toLowerCase())=>({version:1,documento,correo});
  const call=async(body,headers={'x-internal-service-token':authToken},status=200)=>{
    const response=await fetch(authUrl+'/internal/rund/v1/personas/previsualizacion-masiva',{
      method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal(response.status,status,await response.clone().text());return{response,body:await response.json()};
  };
  let createdRole=false;
  const publicPreview=rows=>request('/banco-docentes/bulk?dry_run=true',{method:'POST',body:workbookBody(rows),status:201});
  try{
    await check('Preview propietario: token interno obligatorio y consulta exacta sin actor o IDs elegidos',async()=>{
      const before=await snapshot(true);
      for(const headers of [{},{authorization:'Bearer JWT-FICTICIO'},{'x-internal-service-token':'INCORRECTO'}])await call(query(),headers,401);
      for(const input of [{...query(),actorId:randomUUID()},{...query(),personaId:randomUUID()},{...query(),reserva:true},
        {...query(),resolverPorCorreo:true},{...query(),version:2},{...query(),correo:'MAYUSCULA@example.test'}])await call(input,undefined,400);
      assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview propietario: DTO minimo, bigint textual y snapshot coherente de lectura Auth sin privilegios RUND',async()=>{
      assert(await authFixture.bulkPreviewOwnerReadOnly());const before=await snapshot(true),{response,body}=await call(query());
      assert.equal(response.headers.get('cache-control'),'private, no-store');const data=body.data;
      assert.deepEqual(Object.keys(data).sort(),['conflictoCorreo','consulta','persona','reserva','rolDocenteDisponible','usuario']);
      assert.deepEqual(data.consulta,query());assert.equal(data.reserva,false);
      const [person]=(await database.query(`SELECT id_person,tip_identificacion,nom_largo,nom_tercero,pri_apellido,seg_apellido,gen_tercero,
        fec_nacimiento::text,dir_email,tel_celular,id_seccional::text FROM auth.personas
        WHERE UPPER(regexp_replace(BTRIM(num_identificacion::text),'\\.','','g'))=UPPER(regexp_replace(BTRIM($1::text),'\\.','','g')) LIMIT 1`,[row.DOCUMENTO_IDENTIDAD])).rows;
      const [user]=(await database.query('SELECT id_user,username FROM auth."user" WHERE id_person=$1 LIMIT 1',[person.id_person])).rows;
      assert.deepEqual(data.persona,person);assert.deepEqual(data.usuario,user);assert.equal(data.conflictoCorreo,false);assert.equal(data.rolDocenteDisponible,true);
      assert(!/password_hash|password_temp|resetToken|created_at|public_id/.test(JSON.stringify(data)));
      assert.deepEqual(await snapshot(true),before);
    });
    await database.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'; GRANT USAGE ON SCHEMA rund TO ${role}; GRANT SELECT ON rund."Docente" TO ${role}`);
    createdRole=true;await readonly.initialize();
    await check('Preview propietario: RUND sin USAGE Auth evalua altas y perfiles existentes con manager solo RUND',async()=>{
      const [privileges]=await readonly.query("SELECT has_schema_privilege(current_user,'auth','USAGE') AS auth,current_setting('default_transaction_read_only') AS ro");
      assert.equal(privileges.auth,false);assert.equal(privileges.ro,'on');
      await assert.rejects(readonly.query('SELECT id_person FROM auth.personas LIMIT 1'),error=>error.driverError?.code==='42501');
      const before=await snapshot(true),headersAt=authFixture.bulkPreviewRequestHeaders().length;
      const consumer=Object.create(Object.getPrototypeOf(service));Object.assign(consumer,service,{dataSource:{
        manager:{findOne:(entity,options)=>readonly.manager.findOne(entity,options)},
        query:()=>assert.fail('Sin escrituras o SQL de respaldo'),transaction:()=>assert.fail('Sin transacciones de preview'),
      }});
      const result=await consumer.bulkUpsert([row,{...row,DOCUMENTO_IDENTIDAD:'9555555501',CORREO_INSTITUCIONAL:'owner-preview-nuevo@example.test'}],{dryRun:true});
      assert.equal(result.errors,0,JSON.stringify(result.errorDetails));assert.equal(result.created,1);
      assert.equal(result.results[0].docenteId,docenteId);assert.equal(result.results[1].docenteId,null);
      const headers=authFixture.bulkPreviewRequestHeaders().slice(headersAt);assert.equal(headers.length,2);
      assert(headers.every(h=>h.tokenMatches&&!h.authorizationForwarded&&!h.cookieForwarded));assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview propietario: ausencia de persona o cuenta es explicita, sin resolver por correo',async()=>{
      const before=await snapshot(true);
      const noPerson=(await call(query('9555555502','owner-ausente@example.test'))).body.data;
      assert.equal(noPerson.persona,null);assert.equal(noPerson.usuario,null);assert.equal(noPerson.conflictoCorreo,false);
      const conflict=(await call(query('9555555502'))).body.data;
      assert.equal(conflict.persona,null);assert.equal(conflict.usuario,null);assert.equal(conflict.conflictoCorreo,true);
      assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview propietario: caida, 404 o contrato parcial generan errores de fila sin SQL alternativo y recuperan por consulta nueva',async()=>{
      const before=await snapshot();
      try{
        for(const mode of ['unavailable','missing','partial','sql-error']){
          authFixture.setBulkPreviewMode(mode);const count=authFixture.bulkPreviewRequestCount();
          const response=(await publicPreview([row,{...row,DOCUMENTO_IDENTIDAD:'9555555503',CORREO_INSTITUCIONAL:'owner-error@example.test'}])).data;
          assert.equal(response.errors,2);assert.equal(response.results.length,0);assert.equal(response.created,0);
          assert(!JSON.stringify(response).includes('SQL PRIVADO'));assert.equal(authFixture.bulkPreviewRequestCount()-count,2);
        }
      }finally{authFixture.setBulkPreviewMode('normal');}
      const restored=(await publicPreview([row])).data;assert.equal(restored.errors,0);assert.equal(restored.results[0].docenteId,docenteId);
      assert.deepEqual(await snapshot(),before);
    });
    await check('Preview propietario: cambios de identidad entre consultas se observan sin cache o escritura',async()=>{
      const original=(await call(query())).body.data.usuario,person=(await call(query())).body.data.persona;
      const changed='owner-cambio@example.test';
      try{
        await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1',[original.id_user,changed]);
        const before=await snapshot(true),observed=(await call(query())).body.data;
        assert.equal(observed.usuario.username,changed);assert.equal(observed.persona.id_person,person.id_person);
        const result=await service.bulkUpsert([row],{dryRun:true});assert.equal(result.updated,1);assert.equal(result.errors,0);
        assert.deepEqual(await snapshot(true),before);
      }finally{await database.query('UPDATE auth."user" SET username=$2 WHERE id_user=$1',[original.id_user,original.username]);}
    });
    await check('Preview propietario: documento con ceros y puntos, persona sin cuenta y bigint conservan la clasificacion',async()=>{
      const personId=randomUUID(),seccional='9007199254741993',email='owner-sin-cuenta@example.test';
      await database.query('INSERT INTO auth.seccionales(id_seccional,nom_seccional,cod_seccional) VALUES ($1,$2,$3)',
        [seccional,'TERRITORIAL PREVIEW PROPIETARIO','PVIEW']);
      try{
        await database.query(`INSERT INTO auth.personas(id_person,num_identificacion,tip_identificacion,nom_largo,
          nom_tercero,pri_apellido,gen_tercero,fec_nacimiento,dir_email,id_seccional)
          VALUES ($1,' 000.955.555.55 ','CC','DOCENTE SIN CUENTA','DOCENTE','CUENTA','M','1980-01-01',$2,$3)`,[personId,email,seccional]);
        const before=await snapshot(true),data=(await call(query('00095555555',email))).body.data;
        assert.equal(data.persona.id_person,personId);assert.equal(data.persona.id_seccional,seccional);assert.equal(data.usuario,null);
        assert.equal(data.conflictoCorreo,false);
        const result=await service.bulkUpsert([{...row,DOCUMENTO_IDENTIDAD:'00095555555',CORREO_INSTITUCIONAL:email}],{dryRun:true});
        assert.equal(result.created,1);assert.equal(result.errors,0);
        assert.equal(result.results[0].personaId,personId);assert.equal(result.results[0].usuarioId,null);assert.equal(result.results[0].docenteId,null);
        assert.deepEqual(await snapshot(true),before);
      }finally{
        await database.query('DELETE FROM auth.personas WHERE id_person=$1',[personId]);
        await database.query('DELETE FROM auth.seccionales WHERE id_seccional=$1',[seccional]);
      }
    });
  }finally{
    authFixture.setBulkPreviewMode('normal');if(readonly.isInitialized)await readonly.destroy();
    if(createdRole)await database.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`);
  }
};
