// PostgreSQL real con tablas TEMP y rollback. Los motores se simulan con datos ficticios.
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const {config}=require('./audit-rund-excel.cjs');
const root=path.resolve(__dirname,'../backend/academic-work-plan-service');
require(path.join(root,'node_modules/ts-node')).register({transpileOnly:true,project:path.join(root,'tsconfig.json')});
const {RundExtraccionService}=require(path.join(root,'src/pta/banco-docentes/rund-extraccion.service.ts'));
const {lockExtractionSuggestions,confirmExtractionSuggestions}=require(path.join(root,'src/pta/banco-docentes/rund-extraccion-fields.ts'));
const localHttp=require(path.join(root,'src/pta/banco-docentes/rund-local-http.ts'));
const originalPost=localHttp.postLocalJson;
const realEngines=process.argv.includes('--real');
const artifacts=path.resolve(__dirname,'../.local/rund-extraction-real');
const engineResponses=[];
(async()=>{
  const {DataSource}=require(path.join(root,'node_modules/typeorm'));
  const source=new DataSource({type:'postgres',host:config.host,port:config.port,username:config.user,password:config.password,database:config.database});
  await source.initialize();const runner=source.createQueryRunner();const client=await runner.connect();
  const originalFetch=global.fetch;
  const previous={...process.env};
  try{
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE "Docente" (id uuid PRIMARY KEY,"personaId" uuid,pregrado text) ON COMMIT DROP');
    await client.query('CREATE TEMP TABLE personas (id_person uuid PRIMARY KEY,nom_largo text,fec_nacimiento date) ON COMMIT DROP');
    await client.query(`CREATE TEMP TABLE "RundDocumentoPerfil" (id uuid PRIMARY KEY, docente_id uuid, categoria_codigo text, tipo_soporte text,
      nombre_archivo text,version int,estado text,creado_por text,"createdAt" timestamptz,proveedor_almacenamiento text,almacenamiento_ruta text,checksum_sha256 text) ON COMMIT DROP`);
    await client.query(`CREATE TEMP TABLE "RundAccesoDatosLog" (id uuid,actor_id text,roles text[],endpoint text,recurso_id text,docentes text[],campos text[],resultado text,ip text) ON COMMIT DROP`);
    const migration=fs.readFileSync(path.resolve(__dirname,'../db/migrations/656_rund_extraccion_experimental.sql'),'utf8');
    const rewrite=sql=>sql.replaceAll('academic_work_plan.','pg_temp.').replaceAll('auth.personas','pg_temp.personas');
    await client.query(rewrite(migration));
    await client.query(rewrite(fs.readFileSync(path.resolve(__dirname,'../db/migrations/657_rund_extraccion_progreso.sql'),'utf8')));
    let savepoint=0;
    // Ejecuta el mismo PostgresQueryRunner real que producción, sobre una conexión TEMP aislada.
    const db={query:async(sql,args)=>runner.query(rewrite(sql),args),
      transaction:async fn=>{const name=`ocr_${++savepoint}`;await client.query(`SAVEPOINT ${name}`);try{const result=await fn(db);await client.query(`RELEASE SAVEPOINT ${name}`);return result;}catch(e){await client.query(`ROLLBACK TO SAVEPOINT ${name}`);throw e;}}};
    const docente=randomUUID(),person=randomUUID(),document=randomUUID();
    let pdf=Buffer.from('%PDF-1.7\nDocumento ficticio de prueba\n%%EOF');
    if(realEngines){
      const {jsPDF}=require('jspdf');const synthetic=new jsPDF();
      synthetic.setFontSize(18);synthetic.text('DIPLOMA DE PREGRADO - DOCUMENTO FICTICIO',15,30);
      synthetic.setFontSize(14);synthetic.text(['Titular: DOCENTE FICTICIO','Título: Administración Pública','Documento exclusivo de prueba. Sin validez académica.'],15,55);
      pdf=Buffer.from(synthetic.output('arraybuffer'));fs.mkdirSync(artifacts,{recursive:true});fs.writeFileSync(path.join(artifacts,'diploma-ficticio.pdf'),pdf);
    }
    await db.query('INSERT INTO academic_work_plan."Docente" VALUES($1,$2,$3)',[docente,person,'Título anterior']);
    await client.query('INSERT INTO pg_temp.personas VALUES($1,$2,$3)',[person,'DOCENTE FICTICIO','1980-01-01']);
    await db.query(`INSERT INTO academic_work_plan."RundDocumentoPerfil" VALUES($1,$2,'TITULOS','diploma_pregrado','prueba.pdf',1,'ACTIVO','TEST',now(),'MEMORY','test', $3)`,[document,docente,createHash('sha256').update(pdf).digest('hex')]);
    process.env.RUND_OCR_ENABLED='true';process.env.RUND_OCR_TOKEN='local-test-token-only-0000000000000000';
    process.env.RUND_OCR_URL='http://localhost:8091';process.env.RUND_OLLAMA_URL='http://localhost:11435';process.env.RUND_OLLAMA_MODEL='gemma4:e2b';
    if(realEngines){
      const env=require(path.join(root,'node_modules/dotenv')).parse(fs.readFileSync(path.resolve(__dirname,'../.env.rund-ocr.local')));
      for(const key of ['RUND_OCR_TOKEN','RUND_OCR_URL','RUND_OLLAMA_URL','RUND_OLLAMA_MODEL'])process.env[key]=env[key];
    }
    let requests=0;
    localHttp.postLocalJson=async(url,body)=>{
      requests++;const started=Date.now();
      const result=realEngines?await originalPost(url,body):{message:{content:JSON.stringify({sugerencias:[{campo:'pregrado',valor:'Administración Pública',pagina:1,evidencia:'Título: Administración Pública',confianza:0.9}]})}};
      if(realEngines)engineResponses.push({service:'Ollama',status:200,milliseconds:Date.now()-started,data:result});
      return result;
    };
    global.fetch=realEngines?async(url,options)=>{
      requests++;const started=Date.now();const response=await originalFetch(url,options);
      engineResponses.push({service:String(url).endsWith('/extract')?'PaddleOCR':'Ollama',status:response.status,milliseconds:Date.now()-started,data:await response.clone().json()});
      return response;
    }:async(url)=>{requests++;return new Response(JSON.stringify(String(url).endsWith('/extract')?
      {motor:'OCR simulado',paginas:[{pagina:1,texto:'Título: Administración Pública',confianza:0.95}]}:
      {message:{content:JSON.stringify({sugerencias:[{campo:'pregrado',valor:'Administración Pública',pagina:1,evidencia:'Título: Administración Pública',confianza:0.9}]})}}),{status:200});};
    const actor={actorId:'OPERADOR_TEST',roles:['GESTION_PROFESORAL'],fullAccess:true};
    const service=new RundExtraccionService(db,{read:async()=>pdf});
    await service.enqueue(docente,document,actor);
    await service.enqueue(docente,document,actor);
    assert.equal((await db.query('SELECT * FROM academic_work_plan."RundExtraccionTrabajo"')).length,1);
    await service.tick();
    assert.equal(requests,2);
    let response=await service.list(docente,actor);
    assert.equal(response.jobs[0].estado,'COMPLETADO');
    assert(response.jobs[0].sugerencias.length>0,'El modelo debe extraer el título del diploma ficticio. Revise el artefacto de motores.');
    if(realEngines)fs.writeFileSync(path.join(artifacts,'sugerencias-pendientes.json'),JSON.stringify(response,null,2));
    const suggestion=response.jobs[0].sugerencias[0];
    assert.equal(suggestion.estado,'PENDIENTE');
    assert.equal((await db.query('SELECT pregrado FROM academic_work_plan."Docente"'))[0].pregrado,'Título anterior');
    // Un error después de aplicar revierte el perfil y la decisión humana juntos.
    await assert.rejects(()=>db.transaction(async tx=>{
      const rows=await lockExtractionSuggestions(tx,docente,[suggestion.id],{pregrado:'Título corregido'});
      await tx.query('UPDATE academic_work_plan."Docente" SET pregrado=$1 WHERE id=$2',['Título corregido',docente]);
      await confirmExtractionSuggestions(tx,rows,{pregrado:'Título corregido'},actor.actorId,'Verificado con soporte');
      throw new Error('Fallo de prueba');
    }));
    assert.equal((await db.query('SELECT pregrado FROM academic_work_plan."Docente"'))[0].pregrado,'Título anterior');
    assert.equal((await service.list(docente,actor)).jobs[0].sugerencias[0].estado,'PENDIENTE');
    await db.transaction(async tx=>{
      const rows=await lockExtractionSuggestions(tx,docente,[suggestion.id],{pregrado:'Administración Pública'});
      await tx.query('UPDATE academic_work_plan."Docente" SET pregrado=$1 WHERE id=$2',['Administración Pública',docente]);
      await confirmExtractionSuggestions(tx,rows,{pregrado:'Administración Pública'},actor.actorId,'Revisión humana');
    });
    response=await service.list(docente,actor);
    assert.equal(response.jobs[0].sugerencias[0].estado,'APROBADA');
    if(realEngines)fs.writeFileSync(path.join(artifacts,'revision-confirmada.json'),JSON.stringify(response,null,2));
    await assert.rejects(()=>db.transaction(tx=>lockExtractionSuggestions(tx,docente,[suggestion.id],{pregrado:'Administración Pública'})));
    // Nuevo análisis explícito conserva el historial anterior.
    await service.enqueue(docente,document,actor);await service.tick();
    assert.equal((await db.query('SELECT * FROM academic_work_plan."RundExtraccionTrabajo"')).length,2);
    const [pending]=await db.query(`SELECT * FROM academic_work_plan."RundExtraccionSugerencia" WHERE estado='PENDIENTE'`);
    await db.query(`UPDATE academic_work_plan."RundDocumentoPerfil" SET estado='REEMPLAZADO' WHERE id=$1`,[document]);
    await assert.rejects(()=>db.transaction(tx=>lockExtractionSuggestions(tx,docente,[pending.id],{pregrado:'Administración Pública'})));
    await service.discard(docente,pending.id,'Documento reemplazado',actor);
    assert.equal((await db.query('SELECT estado FROM academic_work_plan."RundExtraccionSugerencia" WHERE id=$1',[pending.id]))[0].estado,'DESCARTADA');
    // La marca persistente sobrevive a reinicios: nuevas cargas sí, legado solo a petición.
    const legacy=randomUUID(),fresh=randomUUID();
    for(const [docId,age] of [[legacy,'-1 day'],[fresh,'1 second']])await db.query(`INSERT INTO academic_work_plan."RundDocumentoPerfil"
      VALUES($1,$2,'TITULOS','diploma_pregrado','nuevo.pdf',1,'ACTIVO','TEST',now()+$3::interval,'MEMORY','test',$4)`,[docId,docente,age,createHash('sha256').update(pdf).digest('hex')]);
    const restarted=new RundExtraccionService(db,{read:async()=>pdf});
    await restarted.tick();
    assert.equal((await db.query('SELECT * FROM academic_work_plan."RundExtraccionTrabajo" WHERE documento_id=$1',[legacy])).length,0);
    assert.equal((await db.query('SELECT estado FROM academic_work_plan."RundExtraccionTrabajo" WHERE documento_id=$1',[fresh]))[0].estado,'COMPLETADO');
    // Servicio no disponible: reintentos persistentes acotados; no se modifica el perfil.
    await db.query(`UPDATE academic_work_plan."RundDocumentoPerfil" SET "createdAt"=now()+interval '1 second' WHERE id=$1`,[legacy]);
    global.fetch=async()=>{throw new Error('Motor local apagado');};
    restarted.logger={warn:()=>{}};
    for(let attempt=0;attempt<3;attempt++){
      await db.query(`UPDATE academic_work_plan."RundExtraccionTrabajo" SET disponible_en=now()-interval '1 second' WHERE documento_id=$1`,[legacy]);
      await restarted.tick();
    }
    assert.deepEqual((await db.query('SELECT estado,intentos FROM academic_work_plan."RundExtraccionTrabajo" WHERE documento_id=$1',[legacy]))[0],{estado:'ERROR',intentos:3});
    assert.equal((await db.query('SELECT pregrado FROM academic_work_plan."Docente"'))[0].pregrado,'Administración Pública');
    console.log(`F014: cola, extracción ${realEngines?'REAL PaddleOCR + Gemma/Ollama':'simulada'}, revisión humana, rollback, reanálisis, obsolescencia, nuevas cargas tras reinicio y reintentos acotados verificados en PostgreSQL TEMP.`);
  }finally{
    global.fetch=originalFetch;
    localHttp.postLocalJson=originalPost;
    if(realEngines)fs.writeFileSync(path.join(artifacts,'motores.json'),JSON.stringify(engineResponses,null,2));
    for(const key of ['RUND_OCR_ENABLED','RUND_OCR_TOKEN','RUND_OCR_URL','RUND_OLLAMA_URL','RUND_OLLAMA_MODEL']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
    await client.query('ROLLBACK');await runner.release();await source.destroy();
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
