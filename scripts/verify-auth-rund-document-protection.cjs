/* Auth separado: DDL, trigger y HTTP propietarios reales; datos ficticios y clúster temporal.
 * No lee .env ni admite conexiones externas. Requiere compilar auth-service.
 * La prueba de aborto simula exclusivamente la respuesta del propietario RUND.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..'), authRoot = path.join(root, 'backend/auth-service');
const dep = name => require(require.resolve(name, { paths: [authRoot, path.join(root, 'backend/rund-service')] }));
const compiled = name => require(path.join(authRoot, 'dist', name));
require(require.resolve('reflect-metadata', { paths: [authRoot] }));
const { Client } = dep('pg');
const { DataSource } = dep('typeorm');
const pgBin = process.env.PG_BIN_DIR || ['C:/Program Files/PostgreSQL/18/bin', 'C:/Program Files/PostgreSQL/15/bin'].find(fs.existsSync);
const bin = name => path.join(pgBin, name + (process.platform === 'win32' ? '.exe' : ''));
const run = (name, args) => {
  const result = spawnSync(bin(name), args, { stdio: 'ignore', windowsHide: true });
  assert.equal(result.status, 0, `${name} falló`);
};
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const migration = 'db/migrations/673_auth_rund_documento_proteccion_local.sql';
const checks = [], token = 'ficticio-' + randomUUID();
const check = async (name, fn) => { await fn(); checks.push(name); console.log('OK  ' + name); };
const freePort = async () => {
  const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
};

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-rund-protection-'));
  const port = await freePort();
  let started = false, db, serviceDb, app, proofServer;
  let postgresVersion;
  try {
    run('initdb', ['-D', dir, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
    run('pg_ctl', ['-D', dir, '-o', `-p ${port} -c listen_addresses=127.0.0.1`, '-l', path.join(dir, 'log.txt'), '-w', 'start']);
    started = true;
    const conn = { host: '127.0.0.1', port, user: 'postgres', database: 'postgres' };
    db = new Client(conn); await db.connect();
    postgresVersion = (await db.query('SHOW server_version')).rows[0].server_version;
    for (const file of ['db/init/000_uuid_ossp.sql', 'db/init/003_auth_ddl_20260129_215539.sql',
      'db/migrations/158_add_id_person_to_personas_and_user.sql', 'db/migrations/160_set_personas_fechas_automaticas.sql',
      'db/migrations/669_auth_rund_identidad_operacion.sql', 'db/migrations/670_auth_rund_identidad_aplicacion.sql',
      'db/migrations/671_auth_rund_identidad_compensacion.sql', 'db/migrations/672_auth_rund_documento_correccion.sql']) {
      await db.query(read(file)); await db.query('SET search_path TO public');
    }
    await db.query(`INSERT INTO auth.role(id,code,name,category,is_active) VALUES ($1,'DOCENTE','DOCENTE','sistema',true)`, [randomUUID()]);
    const person = async num => {
      const id = randomUUID();
      await db.query(`INSERT INTO auth.personas(id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero)
        VALUES ($1,$2,'CC','ANA FICTICIA','ANA','FICTICIA','F')`, [id, num]); return id;
    };
    const seed = await person('1000000001'), ordinary = await person('2000000002');
    const snapshot = async () => (await db.query('SELECT to_jsonb(p) AS row FROM auth.personas p ORDER BY id_person')).rows;
    await check('673 es idempotente y no modifica identidades ni activa LOCAL', async () => {
      const before = await snapshot();
      await db.query(read(migration)); await db.query(read(migration));
      assert.deepEqual(await snapshot(), before);
      assert.equal((await db.query('SELECT modo FROM auth.rund_documento_politica')).rows[0].modo, 'HEREDADO');
    });
    const activate = (ids, total) => db.query('SELECT auth.activar_proteccion_documento_rund_local($1::uuid[],$2)', [ids, total]);
    await check('activación rechaza inventario nulo, truncado, duplicado o con personas ausentes sin cambiar política', async () => {
      for (const [ids, total] of [[null,0], [[seed],null], [[seed],2], [[seed,seed],2], [[null],1], [[randomUUID()],1], [[], -1]])
        await assert.rejects(activate(ids,total), /Inventario|inventario/);
      assert.equal((await db.query('SELECT modo FROM auth.rund_documento_politica')).rows[0].modo, 'HEREDADO');
      assert.equal((await db.query('SELECT count(*) FROM auth.rund_documento_protegido')).rows[0].count, '0');
    });
    await check('activación rehúsa bases con Docente de RUND o PTA aunque sus tablas estén vacías', async () => {
      for (const schema of ['rund','academic_work_plan']) {
        await db.query(`CREATE SCHEMA ${schema}; CREATE TABLE ${schema}."Docente"(id text)`);
        await assert.rejects(activate([seed],1), /Auth separado/);
        await db.query(`DROP SCHEMA ${schema} CASCADE`);
      }
    });
    await check('inventario conciliado activa LOCAL sin tablas RUND/PTA ni cambios en personas', async () => {
      const before = await snapshot(); await activate([seed],1);
      assert.deepEqual(await snapshot(),before);
      assert.equal((await db.query('SELECT modo,total_inventario FROM auth.rund_documento_politica')).rows[0].modo,'LOCAL');
    });
    await check('reaplicar 673 y repetir/ampliar inventario conserva modo y protecciones previas', async () => {
      const before = (await db.query('SELECT * FROM auth.rund_documento_politica')).rows;
      await db.query(read(migration)); assert.deepEqual((await db.query('SELECT * FROM auth.rund_documento_politica')).rows,before);
      await activate([],0); assert.equal((await db.query('SELECT count(*) FROM auth.rund_documento_protegido')).rows[0].count,'1');
      await activate([seed],1);
    });
    // El servicio tiene permisos exclusivamente Auth; no puede alterar la política/inventario.
    await db.query(`CREATE ROLE auth_local LOGIN; GRANT USAGE ON SCHEMA auth TO auth_local;
      GRANT SELECT,INSERT,UPDATE ON auth.personas,auth."user",auth.user_roles,auth.rund_identidad_operacion,auth.rund_identidad_correccion TO auth_local;
      GRANT DELETE ON auth.user_roles TO auth_local;
      GRANT SELECT,INSERT ON auth.rund_identidad_efecto,auth.rund_identidad_compensacion TO auth_local;
      GRANT SELECT ON auth.role,auth.rund_documento_politica,auth.rund_documento_protegido TO auth_local;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA auth TO auth_local`);
    serviceDb = new DataSource({ type:'postgres', host:conn.host, port, database:conn.database, username:'auth_local', synchronize:false });
    await serviceDb.initialize();
    const attempt = async (id, value, setup) => serviceDb.transaction(async manager => {
      if (setup) await setup(manager);
      await manager.query('UPDATE auth.personas SET num_identificacion=$2 WHERE id_person=$1',[id,value]);
      // Mantiene cada escenario independiente incluso si la operación está permitida.
      throw Object.assign(new Error('PERMITIDO'), { permitted:true });
    }).then(() => assert.fail('sin resultado'), error => { if (!error.permitted) throw error; });
    const blocked = (id, value, setup) => assert.rejects(attempt(id,value,setup), /REQ-RUND-F001/);
    await check('perfil importado protegido; persona sin perfil conserva sus cambios y no se infiere por rol', async () => {
      await blocked(seed,'1000000099'); await attempt(ordinary,'2000000099');
      const uid = randomUUID();
      await db.query(`INSERT INTO auth."user"(id_user,public_id,username,password_hash,id_person) VALUES ($1,$2,'rol-ficticio','FICTICIO',$3)`,[uid,randomUUID(),ordinary]);
      await db.query(`INSERT INTO auth.user_roles(id_user,id_rol,is_active) SELECT $1,id,true FROM auth.role WHERE code='DOCENTE'`,[uid]);
      await attempt(ordinary,'2000000099');
    });
    await check('puntos, documento inicial vacío y cambios en otros campos conservan la compatibilidad', async () => {
      await attempt(seed,'1.000.000.001');
      const empty = await person(''); await activate([empty],1); await attempt(empty,'3000000003');
      await serviceDb.query(`UPDATE auth.personas SET nom_largo='ANA FICTICIA' WHERE id_person=$1`,[seed]);
    });
    await check('GUC heredado o inventado no autoriza cambios en LOCAL', async () => {
      await blocked(seed,'1000000099',m=>m.query(`SELECT set_config('app.rund_ocr_suggestion_id',$1,true)`,[randomUUID()]));
      await blocked(seed,'1000000099',m=>m.query(`SELECT set_config('app.rund_documento_modo','HEREDADO',true)`));
    });
    await check('rol de servicio no puede activar, modificar o vaciar la política/inventario', async () => {
      for (const query of ["SELECT auth.activar_proteccion_documento_rund_local('{}'::uuid[],0)",
        "UPDATE auth.rund_documento_politica SET modo='HEREDADO'", 'DELETE FROM auth.rund_documento_protegido',
        'DELETE FROM auth.rund_documento_politica']) await assert.rejects(serviceDb.query(query),/permission denied|permiso denegado/i);
    });

    const { Test } = dep('@nestjs/testing'), { ConfigService } = dep('@nestjs/config');
    const { RundIdentityGuard } = compiled('users/rund-identity.controller');
    const { RundIdentityOperationController, RundIdentityOperationService } = compiled('users/rund-identity-operation.controller');
    const { RundIdentityApplyController, RundIdentityApplyService } = compiled('users/rund-identity-apply.controller');
    const { RundIdentityCompensationController, RundIdentityCompensationService } = compiled('users/rund-identity-compensation.controller');
    const { RundIdentityCorrectionController, RundIdentityCorrectionService, huellaCorreccion } = compiled('users/rund-identity-correction.controller');
    const { RundIdentityAbortClient } = compiled('users/rund-identity-abort.client');
    const { identityWriteFingerprint } = compiled('users/rund-identity-command');
    const proofs = new Map();
    proofServer = http.createServer((req,res) => {
      if (req.headers['x-internal-service-token'] !== token) { res.writeHead(401).end(); return; }
      const proof = proofs.get(req.url);
      res.writeHead(proof?200:404,{'Content-Type':'application/json'});
      res.end(JSON.stringify({ success:!!proof, data:{ pruebaAborto:proof } }));
    });
    await new Promise(resolve=>proofServer.listen(0,'127.0.0.1',resolve));
    const config = { get:key=>key==='INTERNAL_SERVICE_TOKEN'?token:
      ['RUND_IDENTITY_APPLY_ENABLED','RUND_IDENTITY_COMPENSATION_ENABLED'].includes(key)?'true':
      key==='RUND_SERVICE_URL'?`http://127.0.0.1:${proofServer.address().port}`:undefined };
    const moduleRef = await Test.createTestingModule({
      controllers:[RundIdentityOperationController,RundIdentityApplyController,RundIdentityCompensationController,RundIdentityCorrectionController],
      providers:[RundIdentityGuard,RundIdentityOperationService,RundIdentityApplyService,RundIdentityCompensationService,
        RundIdentityCorrectionService,RundIdentityAbortClient,{ provide:DataSource,useValue:serviceDb },{ provide:ConfigService,useValue:config }],
    }).compile();
    app = moduleRef.createNestApplication({ logger:false });
    app.useGlobalFilters(new (compiled('common/all-exceptions.filter').AllExceptionsFilter)());
    app.useGlobalInterceptors(new (compiled('common/response.interceptor').ResponseInterceptor)());
    await app.listen(0,'127.0.0.1'); const url = await app.getUrl();
    const post = async (route,body,status=200,headers={'x-internal-service-token':token}) => {
      const res=await fetch(url+'/internal/rund/v1/personas/'+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
      const text=await res.text(); assert.equal(res.status,status,text); return JSON.parse(text).data;
    };
    const correction = (personaId,valorPrevio,valorNuevo) => ({version:1,operacionId:randomUUID(),personaId,campo:'documentNumber',valorPrevio,valorNuevo,actorId:'FICTICIO',sugerenciaId:randomUUID()});
    await check('HTTP OCR real aplica, reintenta y compensa una cédula protegida sin acceder a RUND/PTA', async () => {
      const cmd=correction(seed,'1000000001','1000000088');
      await post('correcciones',cmd,401,{});
      const first=await post('correcciones',cmd);
      assert.equal(first.correccion.estado,'APLICADA'); assert.deepEqual(await post('correcciones',cmd),first);
      await blocked(seed,'1000000099');
      const reverted=await post('correcciones/'+cmd.operacionId+'/compensar',{huella:huellaCorreccion(cmd)});
      assert.equal(reverted.correccion.estado,'COMPENSADA'); await blocked(seed,'1000000099');
    });
    await check('HTTP OCR rechaza valor previo obsoleto, cédula duplicada y correcciones de otra persona', async () => {
      await post('correcciones',correction(seed,'ANTERIOR','1000000088'),409);
      await post('correcciones',correction(seed,'1000000001','2000000002'),409);
      await blocked(seed,'1000000088',m=>m.query(`SELECT set_config('app.rund_identity_correction_id',$1,true)`,[randomUUID()]));
    });
    let serial=7000000000;
    const command = documentNumber => ({version:1,actorId:'FICTICIO',payload:{documentNumber:documentNumber||String(++serial),documentType:'CC',primer_nombre:'ANA',primer_apellido:'FICTICIA',segundo_apellido:null,genero:'F',fechaNacimiento:null},
      options:{relaxValidation:false,preserveTerritorial:true},territorial:null,emailFinal:'ficticio-'+randomUUID()+'@example.test',phoneFinal:null,finalFullName:'ANA FICTICIA'});
    const apply = async cmd => {
      const id=randomUUID(),huellaComando=identityWriteFingerprint(cmd);
      await post('escritura/operaciones',{version:1,operacionId:id,huellaComando});
      const result=await post('escritura/operaciones/'+id+'/aplicar',{comando:cmd,huellaComando});
      return {id,hash:huellaComando,cmd,persona:result.operacion.resultado.personaId,result};
    };
    const compensate = async op => {
      const intencionId=randomUUID();
      const proof={version:1,intencionId,operacionAuthId:op.id,huellaComando:op.hash,huellaContexto:'a'.repeat(64),
        decisionNativa:'ABORTADA',estadoNativo:'PREPARADA',abortadaEn:new Date().toISOString(),motivoAborto:'FALLO_NEGOCIO'};
      proofs.set('/internal/rund/v1/identidad/intenciones/'+intencionId+'/aborto',proof);
      return post('escritura/operaciones/'+op.id+'/compensar',{intencionId,huellaComando:op.hash});
    };
    await check('alta por HTTP protege la identidad desde el recibo Auth, sin esperar al perfil remoto', async () => {
      const op=await apply(command()); await blocked(op.persona,'7999999999');
      assert.equal((await db.query('SELECT count(*) FROM auth.rund_documento_protegido WHERE persona_id=$1',[op.persona])).rows[0].count,'0');
      assert.deepEqual(await post('escritura/operaciones/'+op.id+'/aplicar',{comando:op.cmd,huellaComando:op.hash}),op.result);
    });
    await check('rechazo de alta nueva conserva protección cuando Auth exige revisión humana', async () => {
      const op=await apply(command()),result=await compensate(op);
      assert.equal(result.resolucion.estado,'REVISION_REQUERIDA'); assert.equal(result.resolucion.motivo,'ALTA_IDENTIDAD');
      await blocked(op.persona,'7999999999');
    });
    // Identidad previa completa: permite compensar sin crear/eliminar cuentas.
    const existing = async (num,inventory=false) => {
      const pid=await person(num),uid=randomUUID();
      await db.query(`INSERT INTO auth."user"(id_user,public_id,username,password_hash,id_person,is_active)
        VALUES ($1,$2,$3,'HASH_FICTICIO',$4,true)`,[uid,randomUUID(),'previo-'+randomUUID()+'@example.test',pid]);
      if(inventory) await activate([pid],1);
      return pid;
    };
    await check('registrar/cancelar una intención sin aplicar no protege a una persona sin perfil', async () => {
      const num=String(++serial),pid=await existing(num),cmd=command(num),id=randomUUID(),huellaComando=identityWriteFingerprint(cmd);
      await post('escritura/operaciones',{version:1,operacionId:id,huellaComando});
      await post('escritura/operaciones/'+id+'/cancelar',{huellaComando});
      await attempt(pid,'7999999999');
    });
    await check('compensación probada libera su reserva para una persona previa que no tenía perfil', async () => {
      const num=String(++serial),pid=await existing(num),op=await apply(command(num));
      assert.equal(op.persona,pid); await blocked(pid,'7999999999');
      const result=await compensate(op); assert.equal(result.resolucion.estado,'COMPENSADA');
      await attempt(pid,'7999999999');
    });
    await check('compensar una edición conserva la protección del perfil importado', async () => {
      const num=String(++serial),pid=await existing(num,true),op=await apply(command(num));
      assert.equal((await compensate(op)).resolucion.estado,'COMPENSADA'); await blocked(pid,'7999999999');
    });
    await check('compensar una operación conserva la reserva de otra operación de la misma persona', async () => {
      const num=String(++serial),pid=await existing(num);
      await apply(command(num)); const second=await apply(command(num));
      assert.equal((await compensate(second)).resolucion.estado,'COMPENSADA'); await blocked(pid,'7999999999');
    });
    await check('rollback de aplicación no deja una reserva o efecto huérfano', async () => {
      const num=String(++serial),pid=await existing(num),cmd=command(num),id=randomUUID(),hash=identityWriteFingerprint(cmd);
      await post('escritura/operaciones',{version:1,operacionId:id,huellaComando:hash});
      await db.query(`CREATE FUNCTION auth.fallo_prueba_efecto() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO'; END $$;
        CREATE TRIGGER fallo_prueba_efecto BEFORE INSERT ON auth.rund_identidad_efecto FOR EACH ROW EXECUTE FUNCTION auth.fallo_prueba_efecto()`);
      try { await post('escritura/operaciones/'+id+'/aplicar',{comando:cmd,huellaComando:hash},500); }
      finally { await db.query('DROP TRIGGER fallo_prueba_efecto ON auth.rund_identidad_efecto; DROP FUNCTION auth.fallo_prueba_efecto()'); }
      assert.equal((await db.query('SELECT estado FROM auth.rund_identidad_operacion WHERE operacion_id=$1',[id])).rows[0].estado,'REGISTRADA');
      assert.equal((await db.query('SELECT count(*) FROM auth.rund_identidad_efecto WHERE operacion_id=$1',[id])).rows[0].count,'0');
      await attempt(pid,'7999999999');
    });
    await check('un cambio concurrente que espera al commit Auth observa la reserva recién confirmada', async () => {
      const num=String(++serial),pid=await existing(num);
      const realTransaction=serviceDb.transaction.bind(serviceDb);
      let release, reached, timer;
      const gate=new Promise(resolve=>{release=resolve;});
      const effectReached=new Promise(resolve=>{reached=resolve;});
      let captured=false;
      serviceDb.transaction=fn=>realTransaction(manager=>fn(new Proxy(manager,{get(target,key){
        if(key!=='query')return Reflect.get(target,key);
        return async (...args)=>{
          const result=await manager.query(...args);
          if(!captured && String(args[0]).includes('INSERT INTO auth.rund_identidad_efecto')){
            captured=true; reached(); await gate;
          }
          return result;
        };
      }})));
      const applying=apply(command(num));
      let changing;
      try {
        await Promise.race([effectReached,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('No se alcanzó el efecto Auth')),10000);})]);
        clearTimeout(timer);
        let finished=false;
        changing=blocked(pid,'7999999999').finally(()=>{finished=true;});
        await new Promise(resolve=>setTimeout(resolve,100)); assert.equal(finished,false,'debía esperar el bloqueo de la persona');
        release(); await applying; await changing;
      } finally {
        clearTimeout(timer); release(); serviceDb.transaction=realTransaction;
        await Promise.allSettled([applying,changing]);
      }
    });
    await check('LOCAL ignora tablas ajenas inaccesibles y no cambia al modo heredado por su presencia', async () => {
      await db.query(`CREATE SCHEMA rund; CREATE SCHEMA academic_work_plan;
        CREATE TABLE rund."Docente"(id text); CREATE TABLE academic_work_plan."Docente"(id text);
        REVOKE ALL ON SCHEMA rund,academic_work_plan FROM PUBLIC`);
      await assert.rejects(serviceDb.query('SELECT * FROM rund."Docente"'),/permission denied|permiso denegado/i);
      await blocked(seed,'1000000099'); await attempt(ordinary,'2000000099');
      const cmd=correction(seed,'1000000001','1000000077'); await post('correcciones',cmd);
      await post('correcciones/'+cmd.operacionId+'/compensar',{huella:huellaCorreccion(cmd)});
      await db.query('DROP SCHEMA rund CASCADE; DROP SCHEMA academic_work_plan CASCADE');
    });
    await check('política ausente falla explícitamente y no abre la escritura', async () => {
      await db.query('BEGIN');
      try {
        await db.query('DELETE FROM auth.rund_documento_politica');
        await assert.rejects(db.query('UPDATE auth.personas SET num_identificacion=$2 WHERE id_person=$1',[seed,'1000000099']),error=>error.code==='P0002');
      } finally { await db.query('ROLLBACK'); }
      await blocked(seed,'1000000099');
    });
  } finally {
    if(app) await app.close();
    if(proofServer) await new Promise(resolve=>proofServer.close(resolve));
    if(serviceDb?.isInitialized) await serviceDb.destroy();
    if(db) await db.end().catch(()=>undefined);
    if(started) run('pg_ctl',['-D',dir,'-m','immediate','-w','stop']);
    fs.rmSync(dir,{recursive:true,force:true});
  }
  const sourceFiles=[migration,'scripts/verify-auth-rund-document-protection.cjs','scripts/verify-auth-documento-correccion.cjs',
    'backend/auth-service/src/users/rund-identity-apply.controller.ts',
    'backend/auth-service/src/users/rund-identity-compensation.controller.ts',
    'backend/auth-service/src/users/rund-identity-correction.controller.ts',
    'backend/auth-service/src/users/rund-identity-effects.ts'];
  const report={generatedAt:new Date().toISOString(),checkpoint:104,passed:true,postgresVersion,checks,
    isolation:{temporaryClusterRemoved:true,readsDotEnv:false,existingDatabasesTouched:false,authRuntimeHasForeignSchemaAccess:false,
      actualAuthHttpControllers:true,rundAbortProof:'simulated owner response; no RUND business commit in this verifier'},
    activation:'Prepared only. Reconcile complete RUND/PTA inventory and pause writes before activation per installation.',
    sourceHashes:Object.fromEntries(sourceFiles.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]))};
  fs.writeFileSync(path.join(root,'docs/rund/validacion-proteccion-documento-auth-local.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`\n${checks.length} comprobaciones correctas; Auth detenido y clúster temporal eliminado.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
