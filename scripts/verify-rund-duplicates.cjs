/* Diagnósticos con datos ficticios; no acepta bases de instalaciones existentes. */
const assert = require('node:assert/strict'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const previous = require('./fixtures/rund-duplicados-before-api.cjs');

module.exports = async function verifyDuplicates(pgConfig, runtime, check, context) {
  assert.equal(pgConfig.database,'rund_integration'); assert.equal(pgConfig.host,'127.0.0.1');
  assert.match(path.basename(runtime),/^esap-rund-integration-/);
  const { database,request,docenteId,authUrl,authFixture,authToken,jwt }=context;
  const root=path.resolve(__dirname,'..'),rundRoot=path.join(root,'backend/rund-service');
  const {BancoDocentesService}=require(path.join(rundRoot,'dist/modules/banco-docentes/banco-docentes.service'));
  const {protectRundSensitiveData}=require(path.join(rundRoot,'dist/modules/banco-docentes/banco-docentes-sensitive-data'));
  const {DataSource}=require(path.join(rundRoot,'node_modules/typeorm'));
  const ds=new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,username:pgConfig.user,password:pgConfig.password,
    database:pgConfig.database,synchronize:false,extra:{max:1}});
  await ds.initialize();
  const people=Array.from({length:4},()=>randomUUID()),orphan=randomUUID();
  const ids=Array.from({length:7},()=> 'DUP-'+randomUUID());
  const marker=randomUUID().slice(0,8),email='duplicado-'+marker+'@esap.edu.co',otherEmail='otro-'+marker+'@esap.edu.co';
  const document='00012345678',rawDocument=' 000.123.456.78 ',name='DUPLICADO FICTICIO ÁLVAREZ',birthday='1985-06-15';
  const post=(route,body,options={})=>request('/banco-docentes/'+route,{method:'POST',body,status:201,...options});
  const serial=data=>JSON.parse(JSON.stringify(data));
  const sort=rows=>serial(rows).sort((a,b)=>a.id.localeCompare(b.id));
  const publicRows=(rows,full=true)=>rows.map(row=>serial(protectRundSensitiveData(row,full)));
  const source=async(consulta,status=200,headers={'x-internal-service-token':authToken})=>{
    const res=await fetch(authUrl+'/internal/rund/v1/personas/coincidencias',
      {method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(consulta)});
    assert.equal(res.status,status,await res.clone().text());return {res,body:await res.json()};
  };
  const snapshot=async()=>{
    const result={};
    for(const[schema,table]of [['auth','personas'],['auth','user'],['auth','user_roles'],
      ...['Docente','RundCampoEstado','RundSoporteCampo','validacion_documental','RundAprobacionLog'].map(t=>['rund',t])]){
      result[schema+'.'+table]=(await database.query(`SELECT to_jsonb(t) AS row FROM ${schema}."${table}" t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  };
  const makeService=()=>{
    const s=Object.create(BancoDocentesService.prototype);
    const query=(runner,sql,params)=>{assert(!/auth\.|academic_work_plan\./.test(sql));return runner.query(sql,params);};
    s.dataSource={query:(sql,params)=>query(ds,sql,params),
      transaction:(isolation,run)=>ds.transaction(isolation,manager=>run({query:(sql,params)=>query(manager,sql,params)}))};
    s.identities={
      coincidenciasUnicidad:async(documento,personaIds)=>(await source({tipo:'unicidad',documento,personaIds})).body.data.items,
      coincidenciasNombreFecha:async(nombre,fechaNacimiento)=>(await source({tipo:'nombre-fecha',nombre,fechaNacimiento})).body.data.items,
    };
    return s;
  };
  try {
    for(let i=0;i<people.length;i++) await database.query(`INSERT INTO auth.personas
      (id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,pri_apellido,gen_tercero,fec_nacimiento)
      VALUES ($1,$2,'CC',$3,'DUPLICADO','FICTICIO','X',$4)`,
    [people[i],i===0?rawDocument:i===1?document:'AUTH-FICTICIO-'+marker+i,i===0?'  '+name+'  ':name,i===2?'1986-06-15':birthday]);
    for(let i=0;i<ids.length;i++) await database.query(`INSERT INTO rund."Docente"
      SELECT (jsonb_populate_record(NULL::rund."Docente",to_jsonb(d)||jsonb_build_object(
        'id',$1::text,'personaId',$2::text,'periodoCarga',$3::text,'estado',$4::text,'correoInstitucional',$5::text))).*
      FROM rund."Docente" d WHERE id=$6`,
    [ids[i],i<2||i===6?people[0]:i<4?people[1]:i===4?people[2]:orphan,
      i===0?'2025-1':i===3?'2024-2':i===6?'2023-1':'2026-2',i===3?'INACTIVO':i===6?'activo':'ACTIVO',
      i===1?otherEmail:i===4?email.toUpperCase():email,docenteId]);
    await check('Duplicados: API Auth exige token interno, no escribe y devuelve todas las personas con documento repetido',async()=>{
      const q={tipo:'unicidad',documento:' 000.123.456.78 ',personaIds:[people[2],orphan]};
      for(const headers of [{},{authorization:'Bearer jwt-ficticio'},{'x-internal-service-token':'incorrecto'}]) await source(q,401,headers);
      const before=await snapshot(),{res,body}=await source(q);
      assert.equal(res.headers.get('cache-control'),'private, no-store');assert.deepEqual(body.data.consulta,q);
      assert.equal(body.data.total,3);assert.deepEqual(body.data.items.map(item=>item.personaId).sort(),people.slice(0,3).sort());
      assert(body.data.items.every(item=>Object.keys(item).sort().join(',')==='documento,nombre,personaId'));
      assert.deepEqual(await snapshot(),before);
    });
    await check('Duplicados: unicidad coincide con SQL anterior para documento/correo, OR, exclusión, períodos y estados exactos',async()=>{
      for(const [doc,mail,exclude]of [[document,null,null],[rawDocument,null,null],
        [null,email,null],[null,email.toUpperCase(),null],[document,email,null],[document,email,ids[0]],
        [null,email,ids[2]],[document,'no-coincide@example.test',null],[null,null,null],
        ['AUTH-FICTICIO-'+marker+3,null,null],['AUSENTE',null,null]]){
        const response=await post('validar-unicidad',{documentNumber:doc,correoInstitucional:mail,excludeDocenteId:exclude});
        assert.deepEqual(sort(response.data.duplicados),sort(publicRows(await previous.unicidad(database,doc,mail,exclude))));
      }
      const rows=(await post('validar-unicidad',{documentNumber:document})).data.duplicados;
      assert.deepEqual(rows.map(row=>row.id).sort(),ids.slice(0,3).sort());
      const emailRows=(await post('validar-unicidad',{correoInstitucional:email})).data.duplicados;
      assert.deepEqual(emailRows.map(row=>row.id).sort(),[ids[0],ids[2]].sort());
    });
    await check('Duplicados: nombre/fecha conserva igualdad exacta, fecha UTC y DTO anterior sin usuarios o roles',async()=>{
      for(const [nombreCompleto,fechaNacimiento]of [[' '+name.toLowerCase()+' ',birthday],
        [name,'1985-06-14T20:00:00-05:00'],[name,'1986-06-15'],['DUPLICADO',birthday],[name,'1980-01-01'],['',birthday],[name,null]]){
        const response=await post('detectar-duplicado',{nombreCompleto,fechaNacimiento});
        assert.deepEqual(sort(response.data.posiblesDuplicados),sort(publicRows(await previous.nombreFecha(database,nombreCompleto,fechaNacimiento))));
      }
      const rows=(await post('detectar-duplicado',{nombreCompleto:name,fechaNacimiento:birthday})).data.posiblesDuplicados;
      assert.deepEqual(rows.map(row=>row.id).sort(),ids.slice(0,3).sort());
      assert(rows.every(row=>String(row.fecha_nacimiento).startsWith(birthday)));
    });
    await check('Duplicados: fecha inválida devuelve 400 y consulta interna inválida no confirma un diagnóstico vacío',async()=>{
      await post('detectar-duplicado',{nombreCompleto:name,fechaNacimiento:'invalida'},{status:400});
      for(const q of [{},{tipo:'nombre-fecha',nombre:name,fechaNacimiento:'1985-02-30'},
        {tipo:'unicidad',documento:document,personaIds:['no-uuid']}]) await source(q,400);
      const q={tipo:'nombre-fecha',nombre:'SIN COINCIDENCIAS',fechaNacimiento:birthday};
      assert.deepEqual((await source(q)).body.data,{consulta:q,items:[],total:0});
    });
    await check('Duplicados: Auth caído, ruta ausente o respuesta parcial devuelven 503 sin anunciar ausencia ni escribir',async()=>{
      const before=await snapshot();
      try{for(const mode of ['unavailable','missing','partial']){
        authFixture.setCoincidenciasMode(mode);
        await post('validar-unicidad',{documentNumber:document,correoInstitucional:email},{status:503});
        await post('detectar-duplicado',{nombreCompleto:name,fechaNacimiento:birthday},{status:503});
      }}finally{authFixture.setCoincidenciasMode('normal');}
      assert.deepEqual(await snapshot(),before);
      assert((await post('validar-unicidad',{documentNumber:document})).data.duplicados.length===3);
    });
    await check('Duplicados: ambas consultas funcionan sin SELECT sobre Auth y conservan resultados previos',async()=>{
      const role='rund_dup_'+randomUUID().replace(/-/g,'');assert.match(role,/^[a-z0-9_]+$/);
      await database.query(`CREATE ROLE "${role}" NOLOGIN`);
      try{
        await database.query(`GRANT USAGE ON SCHEMA rund TO "${role}"; GRANT SELECT ON rund."Docente" TO "${role}"`);
        await ds.query(`SET ROLE "${role}"`);
        await assert.rejects(ds.query('SELECT id_person FROM auth.personas LIMIT 1'),error=>error.code==='42501');
        const s=makeService();
        assert.deepEqual(sort((await s.validarUnicidad(document,email,ids[0])).duplicados),sort(await previous.unicidad(database,document,email,ids[0])));
        assert.deepEqual(sort((await s.detectarPosibleDuplicado(name,new Date(birthday))).posiblesDuplicados),sort(await previous.nombreFecha(database,name,birthday)));
      }finally{
        await ds.query('RESET ROLE');await database.query(`REVOKE SELECT ON rund."Docente" FROM "${role}"; REVOKE USAGE ON SCHEMA rund FROM "${role}"; DROP ROLE "${role}"`);
      }
    });
    await check('Duplicados: unicidad mantiene snapshot nativo de solo lectura durante un cambio concurrente de correo',async()=>{
      const expected=await previous.unicidad(database,null,email,null),s=makeService();
      s.identities.coincidenciasUnicidad=async(documento,personaIds)=>{
        await database.query('UPDATE rund."Docente" SET "correoInstitucional"=$2 WHERE id=$1',[ids[0],'concurrente@example.test']);
        return (await source({tipo:'unicidad',documento,personaIds})).body.data.items;
      };
      try{assert.deepEqual(sort((await s.validarUnicidad(null,email)).duplicados),sort(expected));}
      finally{await database.query('UPDATE rund."Docente" SET "correoInstitucional"=$2 WHERE id=$1',[ids[0],email]);}
    });
    await check('Duplicados: JWT, permisos y enmascaramiento del administrador se conservan en ambos diagnósticos',async()=>{
      const admin=jwt.sign({sub:randomUUID(),roles:['ADMIN']},{expiresIn:'2m'});
      const teacher=jwt.sign({sub:randomUUID(),roles:['DOCENTE']},{expiresIn:'2m'});
      for(const[route,body,key]of [['validar-unicidad',{documentNumber:document},'duplicados'],
        ['detectar-duplicado',{nombreCompleto:name,fechaNacimiento:birthday},'posiblesDuplicados']]){
        await post(route,body,{token:null,status:401});await post(route,body,{token:teacher,status:403});
        const result=await post(route,body,{token:admin});assert(result.data[key].length>0);
        assert(result.data[key].every(row=>row.proteccion_datos.acceso_completo===false));
        assert(!JSON.stringify(result).includes(document));assert(!JSON.stringify(result).includes(rawDocument));
      }
    });
    await check('Duplicados: auditoría fallida bloquea ambos diagnósticos sin entregar filas',async()=>{
      await database.query(`CREATE FUNCTION rund.reject_duplicates_audit() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF (NEW.metadata->>'endpoint') IN ('VALIDAR_UNICIDAD_RUND','DETECTAR_DUPLICADO_RUND')
          THEN RAISE EXCEPTION 'FALLO FICTICIO AUDITORIA'; END IF;RETURN NEW;END $$;
        CREATE TRIGGER reject_duplicates_audit BEFORE INSERT ON rund."RundAprobacionLog"
          FOR EACH ROW EXECUTE FUNCTION rund.reject_duplicates_audit()`);
      try{
        const a=await post('validar-unicidad',{documentNumber:document},{status:500});assert.equal(a.data,undefined);
        const b=await post('detectar-duplicado',{nombreCompleto:name,fechaNacimiento:birthday},{status:500});assert.equal(b.data,undefined);
      }finally{await database.query('DROP TRIGGER reject_duplicates_audit ON rund."RundAprobacionLog";DROP FUNCTION rund.reject_duplicates_audit()');}
    });
  }finally{
    authFixture.setCoincidenciasMode('normal');await ds.destroy();
    await database.query('DELETE FROM rund."Docente" WHERE id=ANY($1::text[])',[ids]);
    await database.query('DELETE FROM auth.personas WHERE id_person=ANY($1::uuid[])',[people]);
  }
};
