/* Solo el cluster temporal ficticio del verificador. No acepta instalaciones existentes. */
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function verifyBulkPreview(pgConfig,runtime,check,context){
  assert.equal(pgConfig.host,'127.0.0.1');assert.equal(pgConfig.database,'rund_integration');
  assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const {database,request,row,docenteId,workbookBody,getNotificationCount,authUrl,authToken,authFixture}=context;
  const rund=path.resolve(__dirname,'../backend/rund-service');
  const {DataSource}=require(path.join(rund,'node_modules/typeorm'));
  const {BancoDocenteEntity}=require(path.join(rund,'dist/entities/banco-docente.entity'));
  const {BancoDocentesService}=require(path.join(rund,'dist/modules/banco-docentes/banco-docentes.service'));
  const {AuthIdentityClient}=require(path.join(rund,'dist/common/auth-identity.client'));
  const makeDb=readonly=>new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,username:pgConfig.user,password:pgConfig.password,
    database:pgConfig.database,entities:[BancoDocenteEntity],synchronize:false,extra:{max:1,...(readonly?{options:'-c default_transaction_read_only=on'}:{})}});
  const ds=makeDb(true),writable=makeDb(false);await ds.initialize();
  const [registered]=(await database.query('SELECT "territorialId" FROM rund."Docente" WHERE id=$1',[docenteId])).rows;
  const territoriales=[{id:registered.territorialId,nombre:row.TERRITORIAL,codigo:null}];
  const service=Object.create(BancoDocentesService.prototype);
  const envKeys=['AUTH_SERVICE_URL','AUTH_INTERNAL_SERVICE_TOKEN'],savedEnv=envKeys.map(k=>process.env[k]);
  process.env.AUTH_SERVICE_URL=authUrl;process.env.AUTH_INTERNAL_SERVICE_TOKEN=authToken;
  service.identities=new AuthIdentityClient();
  const statements=[];
  service.dataSource={manager:{query:async(sql,params)=>{
    statements.push(sql);assert.fail('RUND no consulta identidad por SQL');
  },findOne:(entity,options)=>ds.manager.findOne(entity,options)},
  query:()=>assert.fail('El preview no guarda soporte'),transaction:()=>assert.fail('El preview no abre transacciones')};
  service.catalogos={territorialesBanco:async()=>territoriales,periodoActivo:async()=>null};
  service.persistirPerfilNativoConManager=()=>assert.fail('El preview no llama al escritor nativo');
  service.sendWelcomeEmail=()=>assert.fail('El preview no envia correo');
  const snapshot=async(includeAccess=false)=>{
    const result={};
    const tables=(await database.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname='rund' OR (schemaname='auth' AND tablename IN ('personas','user','user_roles')) ORDER BY 1,2")).rows;
    const quote=v=>'"'+v.replaceAll('"','""')+'"';
    for(const t of tables)if(includeAccess||t.tablename!=='RundAccesoDatosLog')result[t.schemaname+'.'+t.tablename]=
      (await database.query(`SELECT to_jsonb(t) AS row FROM ${quote(t.schemaname)}.${quote(t.tablename)} t ORDER BY to_jsonb(t)::text`)).rows;
    const sequences=(await database.query("SELECT schemaname,sequencename FROM pg_sequences WHERE schemaname IN ('rund','auth') ORDER BY 1,2")).rows;
    for(const seq of sequences)result[seq.schemaname+'.'+seq.sequencename]=(await database.query(`SELECT last_value,is_called FROM ${quote(seq.schemaname)}.${quote(seq.sequencename)}`)).rows;
    result.notifications=getNotificationCount();return result;
  };
  const preview=(rows,options={})=>service.bulkUpsert(rows,{...options,dryRun:true});
  const http=rows=>request('/banco-docentes/bulk?dry_run=true',{method:'POST',body:workbookBody(rows),status:201});
  try{
    await check('Preview masivo: PostgreSQL solo lectura evalua alta sin identidad, perfil o secuencia nuevos',async()=>{
      assert.equal((await ds.query('SHOW default_transaction_read_only'))[0].default_transaction_read_only,'on');
      const before=await snapshot(true);
      const result=await preview([{...row,DOCUMENTO_IDENTIDAD:'9444444401',CORREO_INSTITUCIONAL:'preview-nuevo@example.test'}]);
      assert.equal(result.created,1,JSON.stringify(result.errorDetails));assert.equal(result.errors,0);
      assert.equal(result.soporteCargaMasivaId,null);
      for(const key of ['personaId','docenteId','usuarioId'])assert.equal(result.results[0][key],null);
      assert.equal(statements.length,0);assert(authFixture.bulkPreviewRequestCount()>0);assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview masivo: HTTP conserva auditoria de acceso sin alterar negocio, identidades o secuencias',async()=>{
      const before=await snapshot(),access=Number((await database.query('SELECT count(*) FROM rund."RundAccesoDatosLog"')).rows[0].count);
      const result=(await http([{...row,HORAS_PTA:800},{...row,DOCUMENTO_IDENTIDAD:'9444444402',CORREO_INSTITUCIONAL:'preview-otro@example.test'}])).data;
      assert.equal(result.updated,1,JSON.stringify(result.errorDetails));assert.equal(result.created,1);assert.equal(result.errors,0);
      assert.equal(result.results[0].docenteId,docenteId);assert.equal(result.results[1].docenteId,null);
      assert.deepEqual(await snapshot(),before);
      assert(Number((await database.query('SELECT count(*) FROM rund."RundAccesoDatosLog"')).rows[0].count)>access);
    });
    await check('Preview masivo: duplicados y filas invalidas conservan detalle y no afectan filas validas',async()=>{
      const before=await snapshot();
      const duplicated=(await http([row,{...row}])).data;assert.equal(duplicated.errors,2);assert.equal(duplicated.results.length,0);
      assert.equal(duplicated.errorDetails[0].tipo,'DUPLICADO_DOCUMENTO');
      const mixed=(await http([{...row,DOCUMENTO_IDENTIDAD:'9444444403',NOMBRE_COMPLETO:''},row])).data;
      assert.equal(mixed.errors,1);assert.equal(mixed.results.length,1);assert.equal(mixed.errorDetails[0].row,2);
      assert.equal(mixed.errorDetails[0].columna,'NOMBRE_COMPLETO');assert.deepEqual(await snapshot(),before);
    });
    await check('Preview masivo: otro periodo y rejectExisting se evaluan sin duplicar o reservar el perfil',async()=>{
      const before=await snapshot(true);
      const other=await preview([{...row,PERIODO_CARGA:'2025-1'}]);assert.equal(other.created,1);assert.equal(other.results[0].docenteId,null);
      const rejected=await preview([row],{rejectExisting:true});assert.equal(rejected.errors,1);assert.equal(rejected.errorDetails[0].columna,'DOCUMENTO_IDENTIDAD');
      assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview masivo: propuesta sin cambios y actualizacion coinciden con el escritor definitivo previo',async()=>{
      await writable.initialize();
      const before=await snapshot(true);
      const writer=Object.create(BancoDocentesService.prototype);writer.dataSource=writable;
      for(const sample of [row,{...row,HORAS_PTA:800}]){
        const projected=await preview([sample]);assert.equal(projected.errors,0,JSON.stringify(projected.errorDetails));
        let written;
        await assert.rejects(writable.transaction(async manager=>{
          written=await writer.upsertDocente({...sample,__sourceRowNumber:2},{bulkImport:true,territoriales,outerManager:manager});
          throw new Error('SOLO_FIXTURE_ROLLBACK');
        }),/SOLO_FIXTURE_ROLLBACK/);
        assert.equal(projected.results[0].action,written.action);assert.equal(projected.results[0].docenteId,written.docenteId);
      }
      assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview masivo: conflicto de correo y rol ausente no se interpretan como compatibilidad',async()=>{
      const before=await snapshot(true);
      const conflict=await preview([{...row,DOCUMENTO_IDENTIDAD:'9444444404'}]);assert.equal(conflict.errors,1);
      assert.equal(conflict.errorDetails[0].columna,'CORREO_INSTITUCIONAL');
      const identities=service.identities;
      service.identities={previsualizacionMasiva:async(...args)=>({...await identities.previsualizacionMasiva(...args),rolDocenteDisponible:false})};
      try{const result=await preview([row]);assert.equal(result.errors,1);assert.equal(result.results.length,0);}finally{service.identities=identities;}
      assert.deepEqual(await snapshot(true),before);
    });
    await check('Preview masivo: error SQL privado devuelve fallo generico y conserva tablas y secuencias',async()=>{
      const before=await snapshot(true);authFixture.setBulkPreviewMode('sql-error');
      try{const result=await preview([row]);assert.equal(result.errors,1);assert(!JSON.stringify(result).includes('SQL PRIVADO'));}
      finally{authFixture.setBulkPreviewMode('normal');}
      assert.deepEqual(await snapshot(true),before);
    });
    await require('./verify-rund-bulk-preview-owner.cjs')(pgConfig,runtime,check,
      {...context,service,snapshot,territoriales});
  }finally{if(writable.isInitialized)await writable.destroy();await ds.destroy();
    envKeys.forEach((k,i)=>{if(savedEnv[i]===undefined)delete process.env[k];else process.env[k]=savedEnv[i];});}
};
