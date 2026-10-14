/* Se ejecuta solo dentro del cluster ficticio creado por verify-rund-service-integration. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..'),rundRoot=path.join(root,'backend/rund-service');
const {DataSource}=require(path.join(rundRoot,'node_modules/typeorm'));

module.exports=async function({pgConfig,authDb,carpetaService,authUrl,session,check,rundUrl,folderToken}) {
  assert.equal(pgConfig.database,'rund_integration'); assert.equal(authDb.options.database,'auth_document_versions');
  assert.equal(new URL(rundUrl).hostname,'127.0.0.1'); assert.equal(new URL(authUrl).hostname,'127.0.0.1');
  const keys=['RUND_CARPETA_ENABLED','RUND_CARPETA_INTERNAL_TOKEN','RUND_SERVICE_URL'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]])),checks=[];
  const oldClient=carpetaService.rundCarpetaClient;
  const {RundCarpetaClient}=require(path.join(root,'backend/auth-service/dist/carpeta-digital/rund-carpeta.client'));
  carpetaService.rundCarpetaClient=new RundCarpetaClient();
  const verify=(name,work)=>check('Contadores carpeta: '+name,async()=>{await work();checks.push(name);});
  const db=new DataSource({type:'postgres',host:pgConfig.host,port:pgConfig.port,username:pgConfig.user,password:pgConfig.password,database:pgConfig.database});
  await db.initialize();
  const headers={Authorization:`Bearer ${session}`};
  const read=async(route,status=200)=>{
    const res=await fetch(authUrl+'/carpeta-digital'+route,{headers}); assert.equal(res.status,status,route+': '+await res.clone().text());
    return (await res.json()).data;
  };
  try {
    // El dump de enero precede las dos referencias opcionales de catálogo del Person actual.
    // Solo extender el fixture vacío; no sincronizar entidades ni tocar una base existente.
    await authDb.query('ALTER TABLE auth.personas ADD COLUMN id_dependencia bigint NULL, ADD COLUMN id_cargo bigint NULL');
    const [current]=await db.query(`SELECT dp.id,d."personaId" AS persona_id,dp.docente_id FROM rund."RundDocumentoPerfil" dp
      JOIN rund."Docente" d ON d.id=dp.docente_id WHERE dp.estado='ACTIVO' ORDER BY dp."createdAt" DESC LIMIT 1`);
    assert(current); const person=current.persona_id,folder=randomUUID(),mirror=randomUUID(),linked=randomUUID(),placeholder=randomUUID();
    await authDb.query(`INSERT INTO auth.personas(id_person,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero)
      VALUES ($1,'TEST-COUNTS','CC','Persona ficticia conteos','Persona','X')`,[person]);
    await authDb.query('INSERT INTO auth.carpeta_digital(id_carpeta_digital,persona_id) VALUES ($1,$2)',[folder,person]);
    await authDb.query(`CREATE SCHEMA academic_work_plan;
      CREATE TABLE academic_work_plan."Docente"(id uuid PRIMARY KEY,"personaId" uuid,"periodoCarga" text,estado text DEFAULT 'ACTIVO');
      CREATE TABLE academic_work_plan."RundSoporteCampo"(id uuid PRIMARY KEY,docente_id uuid,bloque text,tipo_soporte text,
        documento_carpeta_id text,nombre_archivo text,estado text,fecha_vencimiento timestamp,observacion text,"createdAt" timestamp DEFAULT now());
      CREATE TABLE academic_work_plan."RundAccesoDatosLog"(id uuid PRIMARY KEY,actor_id text,roles text[],endpoint text,recurso_id text,campos text[],resultado text)`);
    const legacyProfile=randomUUID(); await authDb.query('INSERT INTO academic_work_plan."Docente"(id,"personaId") VALUES ($1,$2)',[legacyProfile,person]);
    await authDb.query(`INSERT INTO academic_work_plan."RundSoporteCampo"(id,docente_id,nombre_archivo,documento_carpeta_id,estado)
      VALUES ($1,$4,'Mismo nombre.pdf','/pta/ficticio.pdf','vencido'),($2,$4,'Copia.pdf','/pta/copia.pdf','Aceptado'),($3,$4,null,null,'Aceptado')`,
      [current.id,linked,placeholder,legacyProfile]);
    await authDb.query(`INSERT INTO auth.documento_carpeta_digital(id_documento,carpeta_digital_id,nombre,url_archivo,estado,rund_soporte_id)
      VALUES ($1,$3,'Mismo nombre.pdf','/auth/ficticio.pdf','validado',null),($2,$3,'Copia.pdf','/auth/copia.pdf','pendiente',$4)`,[current.id,mirror,folder,linked]);
    process.env.RUND_CARPETA_INTERNAL_TOKEN=folderToken;process.env.RUND_SERVICE_URL=rundUrl;process.env.RUND_CARPETA_ENABLED='true';
    const compare=async()=>{
      const listed=await read(`/persona/${person}/documentos`),stats=await read(`/persona/${person}`);
      assert.equal(stats.total_documentos,listed.length); assert.equal(stats.alcance_conteo,'carpeta'); assert.equal(stats.conteo_completo,true);
      for(const [field,state] of [['documentos_completos','validado'],['documentos_pendientes','pendiente'],['documentos_rechazados','rechazado'],['documentos_vencidos','vencido']])
        assert.equal(stats[field],listed.filter(d=>d.estado===state).length,field);
      const global=await read(''),found=global.find(c=>c.persona_id===person);assert.equal(found.total_documentos,stats.total_documentos);
      assert.deepEqual(found.estadisticas_por_propietario,stats.estadisticas_por_propietario);return {listed,stats};
    };
    await require('./verify-rund-inline-profiles.cjs')({read,db,authDb,person,legacyProfile,rundUrl,folderToken,check});
    await require('./verify-rund-folder-views.cjs')({authUrl,session,person,read,check});
    await verify('global, carpeta y listado coinciden por estado, con UUID/nombres iguales en tres propietarios',async()=>{
      await carpetaService.listDocumentosByPersona(person,{roles:['SUPER_ADMIN']},session);
      await carpetaService.getCarpetaByPersona(person,{roles:['SUPER_ADMIN']},session,true);
      await carpetaService.getAllCarpetas({roles:['SUPER_ADMIN']},session);
      const {listed,stats}=await compare();assert(listed.some(d=>d.id===current.id));assert(listed.some(d=>d.id===`rund:${current.id}`));
      assert(listed.some(d=>d.id===`rund-service:documento:${current.id}`));
      assert.equal(stats.estadisticas_por_propietario.auth.total_documentos,2);assert.equal(stats.estadisticas_por_propietario.pta.total_documentos,1);
      assert(!listed.some(d=>d.id===`rund:${linked}`));assert(!listed.some(d=>d.id===`rund:${placeholder}`));
    });
    await verify('dos soportes de una misma versión no duplican el documento vigente',async()=>{
      const ids=[randomUUID(),randomUUID()];const before=await compare();
      try {
        for(const id of ids) await db.query(`INSERT INTO rund."RundSoporteCampo"(id,docente_id,documento_perfil_id,nombre_archivo,estado)
          VALUES ($1,$2,$3,'Referencia ficticia.pdf','vencido')`,[id,current.docente_id,current.id]);
        const after=await compare();assert.equal(after.stats.total_documentos,before.stats.total_documentos);
      } finally {await db.query('DELETE FROM rund."RundSoporteCampo" WHERE id=ANY($1::uuid[])',[ids]);}
    });
    await verify('estados, reclasificación y retiro Auth se reflejan sin modificar originales PTA/RUND',async()=>{
      const original=await authDb.query('SELECT * FROM academic_work_plan."RundSoporteCampo" ORDER BY id');
      const native=await db.query('SELECT * FROM rund."RundDocumentoPerfil" ORDER BY id');
      for(const state of ['rechazado','pendiente','validado']) {await authDb.query('UPDATE auth.documento_carpeta_digital SET estado=$2,categoria=$3 WHERE id_documento=$1',[mirror,state,'academico']);await compare();}
      await authDb.query('DELETE FROM auth.documento_carpeta_digital WHERE id_documento=$1',[mirror]);await compare();
      assert.deepEqual(await authDb.query('SELECT * FROM academic_work_plan."RundSoporteCampo" ORDER BY id'),original);
      assert.deepEqual(await db.query('SELECT * FROM rund."RundDocumentoPerfil" ORDER BY id'),native);
    });
    await verify('credencial interna obligatoria y lotes inválidos no producen contadores exitosos',async()=>{
      for(const [body,status,credential] of [[{personaIds:[person]},401,null],[{personaIds:[person,person]},400,folderToken],
        [{personaIds:[]},400,folderToken],[{personaIds:['incorrecto']},400,folderToken]]) {
        const res=await fetch(rundUrl+'/internal/carpeta-digital/estadisticas',{method:'POST',headers:{'Content-Type':'application/json',...(credential?{'X-Rund-Carpeta-Token':credential}:{})},body:JSON.stringify(body)});
        assert.equal(res.status,status);
      }
    });
    await verify('PTA no disponible falla explícitamente y no bloquea la subida propia de Auth',async()=>{
      await authDb.query('ALTER TABLE academic_work_plan."RundSoporteCampo" RENAME TO "SoporteFixtureTemporal"');
      try {
        await read(`/persona/${person}`,503);await read('',503);await read(`/persona/${person}/documentos`,503);
        const body=new FormData();body.append('file',new Blob([Buffer.from('ARCHIVO FICTICIO AUTH')]),'Independiente.pdf');
        const res=await fetch(authUrl+`/carpeta-digital/persona/${person}/documentos/upload`,{method:'POST',headers,body});
        assert.equal(res.status,201,await res.clone().text());assert.equal((await res.json()).data.persistido,true);
      } finally {await authDb.query('ALTER TABLE academic_work_plan."SoporteFixtureTemporal" RENAME TO "RundSoporteCampo"');}
      await compare();
    });
    await verify('auditoría RUND fallida impide anunciar un agregado parcial o un cero',async()=>{
      await db.query(`CREATE FUNCTION rund.reject_counts_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'FALLO FICTICIO'; END $$;
        CREATE TRIGGER reject_counts_fixture BEFORE INSERT ON rund."RundAccesoDatosLog" FOR EACH ROW EXECUTE FUNCTION rund.reject_counts_fixture()`);
      try {await read(`/persona/${person}`,503);await read('',503);}
      finally {await db.query('DROP TRIGGER reject_counts_fixture ON rund."RundAccesoDatosLog"; DROP FUNCTION rund.reject_counts_fixture()');}
      await compare();
    });
    await verify('bandera apagada conserva el alcance Auth explícito sin consultar al propietario remoto',async()=>{
      process.env.RUND_CARPETA_ENABLED='false';process.env.RUND_SERVICE_URL='http://127.0.0.1:1';
      const stats=await read(`/persona/${person}`);assert.equal(stats.alcance_conteo,'auth');assert.deepEqual(stats.propietarios_incluidos,['auth']);assert.equal(stats.total_documentos,2);
    });
    fs.writeFileSync(path.join(root,'docs/rund/validacion-contadores-carpeta-postgres-local.json'),JSON.stringify({verifiedAt:new Date().toISOString(),step:'12.3b.3',
      passed:true,syntheticDataOnly:true,existingDatabaseUsed:false,checks},null,2)+'\n');
  } finally {carpetaService.rundCarpetaClient=oldClient;await db.destroy();for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
};
