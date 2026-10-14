const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
module.exports=async function({read,db,authDb,person,legacyProfile,rundUrl,folderToken,check}) {
 assert.equal(db.options.database,'rund_integration');assert.equal(authDb.options.database,'auth_document_versions');
 const checks=[],verify=(name,run)=>check('Panel RUND: '+name,async()=>{await run();checks.push(name);});
 const ownId=randomUUID();
 const business=async()=>Promise.all(['Docente','RundCampoEstado','RundSoporteCampo','RundDocumentoPerfil','RundAprobacionLog'].map(t=>db.query(`SELECT * FROM rund."${t}" ORDER BY id`)));
 try {
  await db.query(`INSERT INTO rund."Docente" (id,"personaId","territorialId","tipoVinculacion",dedicacion,"periodoCarga","updatedAt")
   VALUES ($1,$2,'TEST','TEST','TEST','2099-INLINE',now())`,[ownId,person]);
  await authDb.query('ALTER TABLE academic_work_plan."Docente" ALTER COLUMN id TYPE text USING id::text');
  await authDb.query('ALTER TABLE academic_work_plan."RundSoporteCampo" ALTER COLUMN docente_id TYPE text USING docente_id::text');
  await authDb.query('INSERT INTO academic_work_plan."Docente" (id,"personaId","periodoCarga") VALUES ($1,$2,$3)',[ownId,person,'2099-HISTORICO']);
  await verify('catalogar perfiles conserva periodos y propietarios, sin crear bloques/perfiles al consultar',async()=>{
   const before=await business(),catalog=await read(`/persona/${person}/perfiles-rund`);
   assert.equal(catalog.complete,true);assert.equal(catalog.propietario_predeterminado,'rund');
   const own=catalog.perfiles.find(p=>p.clave===`rund:${ownId}`),legacy=catalog.perfiles.find(p=>p.clave===`pta:${ownId}`);
   assert.equal(own.periodo_carga,'2099-INLINE');assert.equal(legacy.periodo_carga,'2099-HISTORICO');
   assert(catalog.perfiles.filter(p=>p.propietario==='rund').length>=2);assert.deepEqual(await business(),before);
   await read(`/persona/${person}/perfiles-rund`);assert.deepEqual(await business(),before);
  });
  await verify('el listado documental identifica el perfil real sin duplicar archivos de otras fuentes',async()=>{
   const docs=await read(`/persona/${person}/documentos`);
   const native=docs.filter(d=>d.servicio_propietario==='rund');assert(native.length>0);
   assert(native.every(d=>d.rund_perfil_propietario==='rund' && typeof d.rund_perfil_id==='string'));
   const legacy=docs.filter(d=>d.servicio_propietario==='pta');assert(legacy.every(d=>d.rund_perfil_propietario==='pta' && d.rund_perfil_id===legacyProfile));
   assert.equal(new Set(docs.map(d=>`${d.servicio_propietario}:${d.id}`)).size,docs.length);
  });
  await verify('sin perfiles devuelve catálogo vacío completo sin aprovisionar un docente',async()=>{
   const [empty]=await authDb.query('SELECT id_person FROM auth.personas WHERE id_person<>$1 LIMIT 1',[person]);assert(empty);
   const before=await business(),catalog=await read(`/persona/${empty.id_person}/perfiles-rund`);
   assert.deepEqual(catalog.perfiles,[]);assert.equal(catalog.complete,true);assert.deepEqual(await business(),before);
  });
  await verify('fallos del propietario y credenciales inválidas no habilitan sustitución por PTA',async()=>{
   const secret=process.env.RUND_CARPETA_INTERNAL_TOKEN;process.env.RUND_CARPETA_INTERNAL_TOKEN='incorrecto';
   try {await read(`/persona/${person}/perfiles-rund`,503);} finally {process.env.RUND_CARPETA_INTERNAL_TOKEN=secret;}
   const res=await fetch(`${rundUrl}/internal/carpeta-digital/personas/${person}/perfiles`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   assert.equal(res.status,401);
   const good=await fetch(`${rundUrl}/internal/carpeta-digital/personas/${person}/perfiles`,{method:'POST',headers:{'X-Rund-Carpeta-Token':folderToken,'Content-Type':'application/json'},body:JSON.stringify({roles:['SUPER_ADMIN']})});
   assert.equal(good.status,200);assert.equal((await good.json()).data.propietario,'rund');
  });
  await verify('bandera apagada conserva catálogo PTA explícito sin llamar a RUND',async()=>{
   const enabled=process.env.RUND_CARPETA_ENABLED,url=process.env.RUND_SERVICE_URL;
   process.env.RUND_CARPETA_ENABLED='false';process.env.RUND_SERVICE_URL='http://127.0.0.1:1';
   try {const catalog=await read(`/persona/${person}/perfiles-rund`);assert.equal(catalog.propietario_predeterminado,'pta');assert(catalog.perfiles.every(p=>p.propietario==='pta'));}
   finally {process.env.RUND_CARPETA_ENABLED=enabled;process.env.RUND_SERVICE_URL=url;}
  });
  fs.writeFileSync(path.join(root,'docs/rund/validacion-panel-rund-postgres-local.json'),JSON.stringify({verifiedAt:new Date().toISOString(),
   step:'12.3b.4',passed:true,syntheticDataOnly:true,existingDatabaseUsed:false,checks},null,2)+'\n');
 }finally {
  await db.query('DELETE FROM rund."Docente" WHERE id=$1',[ownId]);
  await authDb.query('DELETE FROM academic_work_plan."Docente" WHERE id=$1',[ownId]);
 }
};
