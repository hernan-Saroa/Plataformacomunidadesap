/* Journal RUND aislado de Auth: segunda base dentro del mismo cluster ficticio. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {randomUUID,randomBytes}=require('node:crypto');

module.exports=async function verifyCoordination(pgConfig,runtime,check,{database,authUrl,authToken,authFixture}) {
  assert.equal(pgConfig.database,'rund_integration');assert.equal(pgConfig.host,'127.0.0.1');assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const root=path.resolve(__dirname,'..'),rund=path.join(root,'backend/rund-service');
  const {Client}=require(path.join(rund,'node_modules/pg')),{DataSource}=require(path.join(rund,'node_modules/typeorm'));
  const {AuthIdentityCoordinationService}=require(path.join(rund,'dist/common/auth-identity-coordination.service'));
  const {AuthIdentityOperationClient}=require(path.join(rund,'dist/common/auth-identity-operation.client'));
  const {identityWriteFingerprint}=require(path.join(rund,'dist/common/auth-identity-command'));
  const dbName='rund_identity_coordination',role='rund_coord_'+randomUUID().replace(/-/g,''),password=randomBytes(24).toString('hex');
  const sql=fs.readFileSync(path.join(rund,'db/migrations/008_rund_identidad_operacion.sql'),'utf8');
  const saved=Object.fromEntries(['AUTH_SERVICE_URL','AUTH_INTERNAL_SERVICE_TOKEN'].map(key=>[key,process.env[key]]));
  const admin=new Client({...pgConfig,database:dbName});
  let connected=false,roleCreated=false,ds,service,stub,stubBody;
  const makeDb=()=>new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,database:dbName,
    username:role,password,entities:[],synchronize:false,extra:{max:6}});
  const client=new AuthIdentityOperationClient();
  const command=()=>{const marker=randomUUID().replace(/-/g,'').slice(0,16);return {version:1,actorId:randomUUID(),
    payload:{documentNumber:'64'+marker,documentType:'CC',primer_nombre:'JOURNAL',primer_apellido:'FICTICIO',segundo_apellido:null,genero:'N',fechaNacimiento:null},
    options:{relaxValidation:false,preserveTerritorial:true},territorial:null,emailFinal:'coord-'+marker+'@example.test',phoneFinal:null,finalFullName:'JOURNAL FICTICIO'};};
  const rows=async()=>(await admin.query('SELECT * FROM rund.identidad_operacion ORDER BY intencion_id')).rows;
  const fresh=async()=>{const cmd=command(),id=randomUUID(),local=await service.preparar(id,cmd);return {cmd,id,local};};
  const register=async()=>{const prepared=await fresh();prepared.local=await service.registrarEnAuth(prepared.id);return prepared;};
  const identities=async()=>{
    const result={};for(const table of ['personas','user','user_roles','role'])result[table]=(await database.query(`SELECT to_jsonb(t) AS row FROM auth."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    return result;
  };
  const authRows=async()=>(await database.query('SELECT * FROM auth.rund_identidad_operacion ORDER BY operacion_id')).rows;
  let known;
  try {
    await database.query('CREATE DATABASE '+dbName);await admin.connect();connected=true;
    await admin.query('CREATE SCHEMA rund');await admin.query(sql);
    await admin.query("CREATE TABLE rund.negocio_ficticio (id integer PRIMARY KEY, dato text NOT NULL); INSERT INTO rund.negocio_ficticio VALUES (1,'CONSERVAR')");
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}';GRANT USAGE ON SCHEMA rund TO ${role};
      GRANT SELECT,INSERT,UPDATE ON rund.identidad_operacion TO ${role}`);roleCreated=true;
    ds=makeDb();await ds.initialize();service=new AuthIdentityCoordinationService(ds,client);
    Object.assign(process.env,{AUTH_SERVICE_URL:authUrl,AUTH_INTERNAL_SERVICE_TOKEN:authToken});
    const headersBefore=authFixture.operationRequestHeaders().length;
    await check('Coordinación identidad: base RUND separada sin schema Auth y rol limitado al journal',async()=>{
      assert.equal((await ds.query("SELECT to_regnamespace('auth') AS schema"))[0].schema,null);
      assert.equal((await ds.query("SELECT has_table_privilege(current_user,'rund.negocio_ficticio','UPDATE') AS allowed"))[0].allowed,false);
      await assert.rejects(ds.query('SELECT * FROM auth.personas'),/does not exist/);
      assert.deepEqual(await rows(),[]);
    });
    await check('Coordinación identidad: inputs inválidos e intención desconocida no escriben ni llaman a Auth',async()=>{
      const before=authFixture.operationRequestHeaders().length;
      await assert.rejects(service.preparar('no-id',command()),error=>error.getStatus()===400);
      await assert.rejects(service.preparar(randomUUID(),{}),error=>error.getStatus()===400);
      await assert.rejects(service.reconciliar(randomUUID()),error=>error.getStatus()===404);
      assert.equal(authFixture.operationRequestHeaders().length,before);assert.deepEqual(await rows(),[]);
    });
    await check('Coordinación identidad: preparar seis veces conserva ID Auth y fecha sin guardar comando o tocar al propietario',async()=>{
      const id=randomUUID(),cmd=command(),before=await authRows();
      const results=await Promise.all(Array.from({length:6},()=>service.preparar(id,cmd)));
      results.forEach(result=>assert.deepEqual(result,results[0]));known={id,cmd,local:results[0]};
      assert.equal((await rows()).length,1);assert.equal(known.local.estado,'PREPARADA');assert.equal(known.local.reciboAuth,null);
      const raw=JSON.stringify(await rows());assert(!raw.includes(cmd.emailFinal));assert(!raw.includes(cmd.payload.documentNumber));
      await assert.rejects(service.preparar(id,{...cmd,phoneFinal:'999'}),error=>error.getStatus()===409);
      assert.deepEqual(await authRows(),before);
    });
    await check('Coordinación identidad: ausencia explícita no crea registro remoto, cancela ni confirma aplicación',async()=>{
      const before=await rows(),owner=await authRows();
      const result=await service.reconciliar(known.id);assert.equal(result.consultaAuth,'NO_ENCONTRADA');assert.equal(result.coordinacion.estado,'PREPARADA');
      assert.deepEqual(await rows(),before);assert.deepEqual(await authRows(),owner);
    });
    await check('Coordinación identidad: registro propietario solo cambia metadatos y reintento recupera mismo recibo',async()=>{
      const before=await identities();known.local=await service.registrarEnAuth(known.id);
      assert.equal(known.local.estado,'AUTH_REGISTRADA');assert.deepEqual(known.local.reciboAuth,await client.consultar(known.local.operacionAuthId));
      const stored=await rows();assert.deepEqual(await service.registrarEnAuth(known.id),known.local);
      assert.deepEqual((await service.reconciliar(known.id)).coordinacion,known.local);assert.deepEqual(await rows(),stored);assert.deepEqual(await identities(),before);
    });
    await check('Coordinación identidad: respuesta de registro perdida se recupera tras cerrar conexiones sin otro ID o INSERT remoto',async()=>{
      const data=await fresh();authFixture.dropNextOperationResponse();
      await assert.rejects(service.registrarEnAuth(data.id),error=>error.getStatus()===503);assert.equal((await service.consultar(data.id)).estado,'PREPARADA');
      await ds.destroy();ds=makeDb();await ds.initialize();service=new AuthIdentityCoordinationService(ds,new AuthIdentityOperationClient());
      const before=await authRows(),result=await service.reconciliar(data.id);
      assert.equal(result.coordinacion.operacionAuthId,data.local.operacionAuthId);assert.equal(result.coordinacion.estado,'AUTH_REGISTRADA');assert.deepEqual(await authRows(),before);
    });
    await check('Coordinación identidad: fallo local después de registro Auth deja intención recuperable, sin confirmar éxito local',async()=>{
      const data=await fresh(),before=await rows();
      await admin.query(`CREATE FUNCTION rund.reject_coord_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO JOURNAL'; END $$;
        CREATE TRIGGER reject_coord_fixture BEFORE UPDATE ON rund.identidad_operacion FOR EACH ROW EXECUTE FUNCTION rund.reject_coord_fixture()`);
      try{await assert.rejects(service.registrarEnAuth(data.id),/FALLO FICTICIO JOURNAL/);}finally{
        await admin.query('DROP TRIGGER reject_coord_fixture ON rund.identidad_operacion;DROP FUNCTION rund.reject_coord_fixture()');}
      assert.deepEqual(await rows(),before);assert.equal((await client.consultar(data.local.operacionAuthId)).estado,'REGISTRADA');
      assert.equal((await service.reconciliar(data.id)).coordinacion.estado,'AUTH_REGISTRADA');
    });
    await check('Coordinación identidad: commit Auth con respuesta perdida se recupera sin comando, contraseña nueva o perfil nativo confirmado',async()=>{
      const data=await register();authFixture.dropNextApplyResponse();
      await assert.rejects(client.aplicar(data.local.operacionAuthId,data.cmd),error=>error.getStatus()===503);
      assert.equal((await service.consultar(data.id)).estado,'AUTH_REGISTRADA');
      const identityBefore=await identities();await ds.destroy();ds=makeDb();await ds.initialize();service=new AuthIdentityCoordinationService(ds,new AuthIdentityOperationClient());
      const recovered=(await service.reconciliar(data.id)).coordinacion;assert.equal(recovered.estado,'AUTH_APLICADA');
      assert.equal(recovered.reciboAuth.identidadAplicada,true);assert(recovered.reciboAuth.resultado);
      const before=await rows();assert.deepEqual((await service.reconciliar(data.id)).coordinacion,recovered);assert.deepEqual(await rows(),before);assert.deepEqual(await identities(),identityBefore);
      known=data;known.local=recovered;
    });
    await check('Coordinación identidad: respuesta REGISTRADA tardía no sobrescribe APLICADA o CANCELADA concurrente',async()=>{
      for(const final of ['APLICADA','CANCELADA']) {
        const data=await register();let release,observed;
        const gate=new Promise(resolve=>{release=resolve;}),read=new Promise(resolve=>{observed=resolve;});
        const delayedClient={consultar:async id=>{const receipt=await client.consultar(id);observed();await gate;return receipt;}};
        const delayed=new AuthIdentityCoordinationService(ds,delayedClient),inFlight=delayed.reconciliar(data.id);
        try{
          await Promise.race([read,inFlight.then(()=>{throw new Error('No se observó el recibo inicial');})]);
          if(final==='APLICADA')await client.aplicar(data.local.operacionAuthId,data.cmd);else await client.cancelar(data.local.operacionAuthId,identityWriteFingerprint(data.cmd));
          const current=await service.reconciliar(data.id),before=await rows();release();
          assert.deepEqual((await inFlight).coordinacion,current.coordinacion);assert.deepEqual(await rows(),before);
        }finally{release();await inFlight.catch(()=>{});}
      }
    });
    await check('Coordinación identidad: solicitudes simultáneas de reconciliación convergen sin reescribir estado final',async()=>{
      const before=await rows(),results=await Promise.all(Array.from({length:6},()=>service.reconciliar(known.id)));
      results.forEach(result=>assert.deepEqual(result.coordinacion,known.local));assert.deepEqual(await rows(),before);
    });
    await check('Coordinación identidad: caída, 404 y contrato parcial conservan journal e identidades y no generan otro registro',async()=>{
      const before=await rows(),owner=await authRows(),identityBefore=await identities();
      try{for(const mode of ['unavailable','missing','partial']){
        authFixture.setOperationMode(mode);
        await assert.rejects(service.reconciliar(known.id),error=>error.getStatus()===503);
        await assert.rejects(service.registrarEnAuth(known.id),error=>error.getStatus()===503);
      }}finally{authFixture.setOperationMode('normal');}
      assert.deepEqual(await rows(),before);assert.deepEqual(await authRows(),owner);assert.deepEqual(await identities(),identityBefore);
    });
    await check('Coordinación identidad: hash ajeno, ausencia tras confirmación o resultado contradictorio no sustituyen recibo local',async()=>{
      const registered=await register();
      stub=http.createServer((req,res)=>{assert.equal(req.headers['x-internal-service-token'],authToken);
        assert.equal(req.method,'GET');req.resume();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({success:true,data:stubBody}));});
      await new Promise(resolve=>stub.listen(0,'127.0.0.1',resolve));process.env.AUTH_SERVICE_URL=`http://127.0.0.1:${stub.address().port}`;
      const before=await rows(),receipt=known.local.reciboAuth,consult={consulta:{operacionId:receipt.operacionId},encontrada:true};
      try {
        stubBody={...consult,operacion:{...receipt,huellaComando:'a'.repeat(64)}};
        await assert.rejects(service.reconciliar(known.id),error=>error.getStatus()===409);
        stubBody={consulta:consult.consulta,encontrada:false,operacion:null};
        await assert.rejects(service.reconciliar(known.id),error=>error.getStatus()===503);
        stubBody={...consult,operacion:{...receipt,resultado:{...receipt.resultado,usuarioId:randomUUID()}}};
        await assert.rejects(service.reconciliar(known.id),error=>error.getStatus()===503);
        stubBody={consulta:{operacionId:registered.local.operacionAuthId},encontrada:true,operacion:{...registered.local.reciboAuth,
          estado:'APLICADA',identidadAplicada:true,aplicadaEn:receipt.aplicadaEn,resultado:receipt.resultado,
          registradaEn:new Date(Date.parse(registered.local.reciboAuth.registradaEn)+86400000).toISOString()}};
        await assert.rejects(service.reconciliar(registered.id),error=>error.getStatus()===503);
      }finally{process.env.AUTH_SERVICE_URL=authUrl;}
      assert.deepEqual(await rows(),before);
    });
    await check('Coordinación identidad: migración 008 repetible conserva recibos y restricciones impiden borrado, reescritura o retroceso',async()=>{
      const before=await rows();await admin.query(sql);await admin.query(sql);assert.deepEqual(await rows(),before);
      for(const query of ['DELETE FROM rund.identidad_operacion WHERE intencion_id=$1',
        "UPDATE rund.identidad_operacion SET huella_comando=repeat('b',64) WHERE intencion_id=$1",
        "UPDATE rund.identidad_operacion SET estado='PREPARADA',recibo_auth=NULL WHERE intencion_id=$1"])
        await assert.rejects(admin.query(query,[known.id]),/intencion de identidad RUND/);
      await assert.rejects(admin.query(`INSERT INTO rund.identidad_operacion (intencion_id,operacion_auth_id,version,huella_comando,estado,recibo_auth)
        VALUES ($1,$2,1,$3,'AUTH_APLICADA','{}'::jsonb)`,[randomUUID(),randomUUID(),'b'.repeat(64)]),/check constraint/);
      assert.deepEqual(await rows(),before);
    });
    await check('Coordinación identidad: sin activación, negocio ficticio intacto, transporte sin JWT/cookies y tabla activa vacía',async()=>{
      assert.deepEqual((await admin.query('SELECT * FROM rund.negocio_ficticio')).rows,[{id:1,dato:'CONSERVAR'}]);
      assert.equal((await database.query('SELECT count(*) FROM rund.identidad_operacion')).rows[0].count,'0');
      assert(authFixture.operationRequestHeaders().slice(headersBefore).every(row=>row.tokenMatches&&!row.authorizationForwarded&&!row.cookieForwarded));
      assert.equal((await admin.query("SELECT to_regnamespace('auth') AS schema")).rows[0].schema,null);
    });
  }finally{
    authFixture.setOperationMode('normal');
    for(const[key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
    if(stub)await new Promise(resolve=>{stub.close(resolve);stub.closeAllConnections();});
    if(ds?.isInitialized)await ds.destroy();
    if(connected){if(roleCreated)await admin.query(`DROP OWNED BY ${role};DROP ROLE ${role}`);await admin.end();}
    // La segunda base y sus recibos se retiran con el cluster temporal completo.
  }
};
