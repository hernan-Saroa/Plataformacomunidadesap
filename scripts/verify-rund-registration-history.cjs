// PostgreSQL integration: synthetic fixtures in TEMP tables, always rolled back.
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { clientForLocal, serviceRoot } = require('./rund-documental/local-context.cjs');
require(path.join(serviceRoot, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(serviceRoot, 'tsconfig.json') });
const { RundRegistrationHistory, bulkRegistrationTrace } = require(path.join(serviceRoot, 'src/pta/banco-docentes/rund-registration-history.ts'));

(async () => {
  const client = clientForLocal(); await client.connect();
  try {
    await client.query('BEGIN');
    for (const [schema, table] of [['academic_work_plan','Docente'],['academic_work_plan','RundCargaMasiva'],
      ['academic_work_plan','RundAprobacionLog'],['academic_work_plan','BancoDocentesInvitaciones'],['auth','personas'],['auth','user']]) {
      await client.query(`CREATE TEMP TABLE "${table}" (LIKE ${schema}."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    }
    const db = { query: async (sql, args) => (await client.query(sql.replaceAll('academic_work_plan.', 'pg_temp.').replaceAll('auth.', 'pg_temp.'), args)).rows };
    const fixture = async (schema, table, values) => {
      const cols = (await client.query(`SELECT column_name,data_type,character_maximum_length FROM information_schema.columns
        WHERE table_schema=$1 AND table_name=$2 AND is_nullable='NO' AND column_default IS NULL`, [schema,table])).rows;
      for (const col of cols) if (!(col.column_name in values)) values[col.column_name] = col.data_type === 'uuid' ? randomUUID()
        : /integer|numeric|bigint|double/.test(col.data_type) ? 0 : col.data_type === 'boolean' ? true
          : /date|timestamp/.test(col.data_type) ? new Date() : col.data_type === 'jsonb' ? {} : 'TEST'.slice(0,col.character_maximum_length || 4);
      await client.query(`INSERT INTO pg_temp."${table}" (${Object.keys(values).map(k=>`"${k}"`).join(',')})
        VALUES (${Object.keys(values).map((_,i)=>`$${i+1}`).join(',')})`, Object.values(values));
    };
    const actor = randomUUID(), person = randomUUID(), docente = randomUUID();
    await fixture('auth','personas',{id_person:person,nom_largo:'Responsable de Prueba',num_identificacion:'TEST-HISTORY'});
    await fixture('auth','user',{id_user:actor,id_person:person,username:'history@example.invalid'});
    await fixture('academic_work_plan','Docente',{id:docente,personaId:person,periodoCarga:'2026-2',correoInstitucional:'history@example.invalid'});
    const batch = randomUUID(), legacy = randomUUID(), manual = randomUUID();
    const rows = Array.from({length:100},(_,i)=>({__sourceRowNumber:i+2,NOMBRE_COMPLETO:`Persona de Prueba ${i+1}`,
      DOCUMENTO_IDENTIDAD:`TEST-${i+1}`,PERIODO_CARGA:i<95?'2026-2':i<99?'2025-2':null}));
    const results = rows.slice(0,98).map((row,i)=>({sourceRowNumber:row.__sourceRowNumber,action:i===0?'unchanged':i===1?'update':'insert',
      fullName:row.NOMBRE_COMPLETO,documentNumber:row.DOCUMENTO_IDENTIDAD,periodoCarga:row.PERIODO_CARGA,processedAt:'2026-10-22T14:00:00Z',docenteId:docente}));
    const trace = bulkRegistrationTrace(rows,results,[{fila:100,message:'Synthetic error'}]);
    assert.equal(trace.registros.length,100);
    assert.equal(trace.registros[98].resultado,'NO_CARGADO');
    assert.equal(trace.registros[99].resultado,'NO_PROCESADO');
    await fixture('academic_work_plan','RundCargaMasiva',{id:batch,nombre_archivo:'100-personas.xlsx',tipo_mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      tamano_bytes:0,contenido:Buffer.from('synthetic'),sha256:'0'.repeat(64),actor_id:actor,justificacion:'Prueba de trazabilidad',estado:'COMPLETADA_CON_ERRORES',
      resumen:{total:100,created:96,updated:1,unchanged:1,errors:1,trazabilidad:trace}});
    await fixture('academic_work_plan','RundCargaMasiva',{id:legacy,nombre_archivo:'historica.xlsx',tipo_mime:'application/json',tamano_bytes:0,
      contenido:Buffer.from('synthetic'),sha256:'1'.repeat(64),actor_id:actor,justificacion:'Prueba histórica',estado:'COMPLETADA',resumen:{total:5,created:5,updated:0,unchanged:0,errors:0}});
    await fixture('academic_work_plan','RundAprobacionLog',{id:randomUUID(),docente_id:docente,accion:'CREAR',canal_origen:'MASIVO',actor_id:actor,
      soporte_id:legacy,metadata:{periodoCarga:'2026-2',filaOrigen:2}});
    await fixture('academic_work_plan','RundAprobacionLog',{id:manual,docente_id:docente,accion:'CREAR',canal_origen:'MODAL',actor_id:actor,
      metadata:{periodoCarga:'2025-2',registro:{nombre:'Registro Individual Histórico',documento_identidad:'TEST-MANUAL',correo:'manual@example.invalid'}}});
    // Edits and self-service submissions must not appear as new manual registrations.
    for (const [accion,canal] of [['EDITAR','MODAL'],['CREAR','AUTOGESTION']]) await fixture('academic_work_plan','RundAprobacionLog',{
      id:randomUUID(),docente_id:docente,accion,canal_origen:canal,actor_id:actor,metadata:{periodoCarga:'2026-2'}});
    const history = new RundRegistrationHistory(db);
    const all = await history.list({}); assert.equal(all.total,5);
    assert(all.data.every(event=>event.responsable==='Responsable de Prueba'));
    const current = await history.list({periodoCarga:'2026-2'}); assert.equal(current.total,2);
    assert.equal(current.data.find(event=>event.id===batch).resumen.total,95);
    const old = await history.list({periodoCarga:'2025-2'}); assert.equal(old.total,2);
    assert.equal(old.data.find(event=>event.id===batch).resumen.total,4);
    const individual = await history.list({tipo:'INDIVIDUAL'}); assert.equal(individual.total,1);
    assert.equal(individual.data[0].titulo,'Registro Individual Histórico');
    const detail = await history.detail('MASIVO',batch,{periodoCarga:'2026-2',limit:25});
    assert.equal(detail.total,95); assert.equal(detail.pages,4); assert.equal(detail.registros.length,25);
    assert(detail.registros.every(row=>row.periodo==='2026-2'));
    const last = await history.detail('MASIVO',batch,{periodoCarga:'2026-2',limit:25,page:4}); assert.equal(last.registros.length,20);
    const none = await history.detail('MASIVO',batch,{sinPeriodo:true}); assert.equal(none.total,1); assert.equal(none.registros[0].periodo,null);
    const search = await history.detail('MASIVO',batch,{periodoCarga:'2026-2',search:'TEST-95'}); assert.equal(search.total,1);
    const partial = await history.detail('MASIVO',legacy,{periodoCarga:'2026-2'}); assert.equal(partial.detalleCompleto,false); assert.equal(partial.total,1);
    const manualDetail = await history.detail('INDIVIDUAL',manual,{periodoCarga:'2025-2'});
    assert.equal(manualDetail.registros[0].nombre,'Registro Individual Histórico');
    assert.equal(manualDetail.registros[0].documento_identidad,'TEST-MANUAL');
    await assert.rejects(history.detail('MASIVO',batch,{periodoCarga:'2030-1'}),/periodo seleccionado/);
    const filtered = await history.list({search:'100-personas',limit:1}); assert.equal(filtered.total,3); assert.equal(filtered.data.length,1);
    assert.equal((await history.list({periodoCarga:'2026-2',tipo:'INDIVIDUAL'})).total,0);
    const archived = randomUUID();
    const xlsx = require(path.join(serviceRoot,'node_modules/xlsx'));
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book,xlsx.utils.json_to_sheet([
      {DOCUMENTO_IDENTIDAD:'TEST-ARCHIVE-1',NOMBRE_COMPLETO:'Persona del Archivo Uno'},
      {DOCUMENTO_IDENTIDAD:'TEST-ARCHIVE-2',NOMBRE_COMPLETO:'Persona del Archivo Dos'},
    ]),'CARGA_DOCENTES');
    const content = xlsx.write(book,{type:'buffer',bookType:'xlsx'});
    await fixture('academic_work_plan','RundCargaMasiva',{id:archived,nombre_archivo:'archivo-historico.xlsx',tipo_mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      tamano_bytes:content.length,contenido:content,sha256:'2'.repeat(64),actor_id:actor,justificacion:'Archivo histórico',estado:'COMPLETADA',resumen:{periodo:'2026-2',registros:2}});
    const archiveDetail = await history.detail('MASIVO',archived,{periodoCarga:'2026-2'});
    assert.equal(archiveDetail.total,2);assert.equal(archiveDetail.detalleCompleto,false);
    assert(archiveDetail.registros.every(row=>row.resultado==='HISTORICO'&&row.periodo==='2026-2'));
    // A technical recovery is not evidence of the original upload or its author.
    const recovery = randomUUID();
    await fixture('academic_work_plan','RundCargaMasiva',{id:recovery,nombre_archivo:'recuperacion-historica.xlsx',tipo_mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      tamano_bytes:content.length,contenido:content,sha256:'3'.repeat(64),actor_id:'SISTEMA',justificacion:'Recuperacion tecnica',estado:'COMPLETADA',
      resumen:{tipo:'RECUPERACION_INFORMATIVA',periodo:'2026-2',registros:2}});
    for(let i=1;i<=2;i++) {
      const recoveredDocente=randomUUID();
      await fixture('academic_work_plan','Docente',{id:recoveredDocente,personaId:person,periodoCarga:'2026-2',
        datosCargaMasiva:{DOCUMENTO_IDENTIDAD:`TEST-ARCHIVE-${i}`,NOMBRE_COMPLETO:`Nombre editado ${i}`}});
      await fixture('academic_work_plan','RundAprobacionLog',{id:randomUUID(),docente_id:recoveredDocente,accion:'RECUPERAR_DATOS_CARGA',
        canal_origen:'MASIVO',actor_id:'SISTEMA',soporte_id:recovery,metadata:{periodo:'2026-2'}});
    }
    const recoveryEvent=(await history.list({search:'recuperacion-historica'})).data[0];
    assert.equal(recoveryEvent.origen,'RECUPERACION_INFORMATIVA');
    assert.equal(recoveryEvent.responsable,'No registrado');
    assert.equal(recoveryEvent.responsableRecuperacion,'Sistema');
    assert.equal(Number(recoveryEvent.resumen.recuperados),2);
    assert.equal(Number(recoveryEvent.resumen.creados),0);
    const recoveryDetail=await history.detail('MASIVO',recovery,{periodoCarga:'2026-2'});
    assert.equal(recoveryDetail.total,2);assert.equal(recoveryDetail.detalleCompleto,true);
    assert(recoveryDetail.registros.every(row=>row.resultado==='RECUPERADO'&&row.fecha&&row.nombre.startsWith('Persona del Archivo')));
    console.log(JSON.stringify({success:true,temporaryTablesOnly:true,checks:['100 personas con resultados por fila','Paginación completa y búsqueda','Periodos separados, incluido sin periodo',
      'Responsables con nombres','Creaciones individuales con snapshot histórico','Histórico parcial sin inventar filas','Ediciones y autogestión no duplican creaciones','No cruza periodos']},null,2));
  } finally {await client.query('ROLLBACK');await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
