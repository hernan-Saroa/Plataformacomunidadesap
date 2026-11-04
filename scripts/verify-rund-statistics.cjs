// Real statistics SQL against synthetic TEMP tables; all changes are rolled back.
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { clientForLocal, serviceRoot } = require('./rund-documental/local-context.cjs');
require(path.join(serviceRoot, 'node_modules/ts-node')).register({ transpileOnly: true, project: path.join(serviceRoot, 'tsconfig.json') });
const { BancoDocentesService } = require(path.join(serviceRoot, 'src/pta/banco-docentes/banco-docentes.service.ts'));

(async () => {
  const client = clientForLocal(); await client.connect();
  try {
    await client.query('BEGIN');
    const tables = [['academic_work_plan','Docente'],['academic_work_plan','RundCargaMasiva'],['academic_work_plan','RundAprobacionLog'], ...['user','personas','role','user_roles','seccionales','sedes'].map(t=>['auth',t])];
    for (const [schema,table] of tables) await client.query(`CREATE TEMP TABLE "${table}" (LIKE ${schema}."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`);
    const fixture = async (schema, table, values) => {
      const cols = (await client.query(`SELECT column_name,data_type,character_maximum_length FROM information_schema.columns
        WHERE table_schema=$1 AND table_name=$2 AND is_nullable='NO' AND column_default IS NULL`, [schema,table])).rows;
      for (const col of cols) if (!(col.column_name in values)) values[col.column_name] = col.data_type === 'uuid' ? randomUUID()
        : /integer|numeric|bigint|double/.test(col.data_type) ? 0 : col.data_type === 'boolean' ? true
          : /date|timestamp/.test(col.data_type) ? new Date() : col.data_type === 'jsonb' ? {} : 'TEST'.slice(0,col.character_maximum_length || 4);
      await client.query(`INSERT INTO pg_temp."${table}" (${Object.keys(values).map(k=>`"${k}"`).join(',')})
        VALUES (${Object.keys(values).map((_,i)=>`$${i+1}`).join(',')})`, Object.values(values));
    };
    const role=randomUUID();
    await fixture('auth','role',{id:role,code:'DOCENTE',name:'Docente',is_active:true});
    await fixture('auth','seccionales',{id_seccional:987651,nom_seccional:'Norte De Santander',cod_seccional:'TEST-N'});
    await fixture('auth','seccionales',{id_seccional:987652,nom_seccional:'Antioquia',cod_seccional:'TEST-A'});
    await fixture('auth','sedes',{id_sede:987653,nom_sede:'Sede de prueba'});
    const people=[];
    for(let i=0;i<5;i++) {
      const person=randomUUID(), user=randomUUID(); people.push(person);
      await fixture('auth','personas',{id_person:person,nom_largo:`Persona ficticia ${i}`,num_identificacion:`TEST-STATS-${i}`,gen_tercero:i%2?'F':'M'});
      await fixture('auth','user',{id_user:user,id_person:person,username:`stats-${i}@example.invalid`,is_active:true});
      await fixture('auth','user_roles',{id_user:user,id_rol:role,is_active:true});
    }
    const records=[
      {personaId:people[0],periodoCarga:'2026-2',estado:'ACTIVO',dedicacion:'TC',horasAsignables:800,territorialId:'987651',territorialReportada:'NORTESANTANDER',sedeId:'987653',escalafon:'Titular'},
      {personaId:people[1],periodoCarga:'2026-2',estado:'RETIRADO',dedicacion:'MT',horasAsignables:400,territorialId:'987652',escalafon:'Asistente'},
      {personaId:people[2],periodoCarga:'2026-2',estado:'ACTIVO',dedicacion:'',horasAsignables:0,territorialId:'CATALOGO_HISTORICO_NO_DISPONIBLE'},
      {personaId:people[0],periodoCarga:'2025-2',estado:'ACTIVO',dedicacion:'TC',horasAsignables:700,territorialId:'987651',territorialReportada:'Norte de Santander'},
      {personaId:people[3],periodoCarga:'2025-2',estado:'INACTIVO',dedicacion:'HC',horasAsignables:200,territorialId:'987652'},
      {personaId:people[4],periodoCarga:null,estado:'ACTIVO',dedicacion:'TC',horasAsignables:100},
    ];
    const ids=[];
    for(const record of records) {
      const id=randomUUID();ids.push(id);
      await fixture('academic_work_plan','Docente',{id,tipoVinculacion:'CARRERA',vinculacionDisplay:'Carrera',nivelFormacion:'Maestría',rangoEdad:'De 36 a 45 años',nucleoTematico:'Ciencias sociales',...record});
    }
    const service=Object.create(BancoDocentesService.prototype);
    service.dataSource={query:async(sql,args)=>(await client.query(sql.replaceAll('academic_work_plan.','pg_temp.').replaceAll('auth.','pg_temp.'),args)).rows};
    const check=async(filters,total,activos,horas,promedio)=>{
      const stats=await service.getStats(filters);
      assert.equal(stats.total,total);assert.equal(stats.activos,activos);assert.equal(stats.inactivos,total-activos);
      assert.equal(stats.total_horas,horas);assert.equal(stats.promedio_horas,promedio);
      for(const [key,rows] of Object.entries(stats).filter(([key])=>key.startsWith('por_') && key !== 'por_convocatoria')) {
        assert.equal(rows.reduce((sum,row)=>sum+row.total,0),total,`${key} debe sumar el mismo universo filtrado`);
      }
      const listed=await service.list({...filters,limit:50});
      assert.equal(listed.total,total,'Cada cifra debe coincidir con el listado');
      return stats;
    };
    await check({periodoCarga:'2026-2'},3,2,1200,400);
    await check({periodoCarga:'2025-2'},2,1,900,450);
    await check({},6,4,2200,366.7);
    await check({periodoCarga:'2030-1'},0,0,0,0);
    await check({periodoCarga:'2026-2',territorial:'987651'},1,1,800,800);
    await check({territorial:'Norte De Santander'},2,2,1500,750);
    await check({periodoCarga:'2026-2',territorial:'SIN_TERRITORIAL'},1,1,0,0);
    await check({periodoCarga:'2026-2',dedicacion:'SIN_DEDICACION'},1,1,0,0);
    await check({periodoCarga:'2026-2',dedicacion:'MT',estado:'INACTIVO'},1,0,400,400);
    await check({periodoCarga:'2026-2',dedicacion:'TC',estado:'INACTIVO'},0,0,0,0);
    await check({periodoCarga:'2025-2',territorial:'987652',estado:'INACTIVO',dedicacion:'HC',vinculacion:'CARRERA'},1,0,200,200);
    // Simulated status/hour edits must be reflected by a fresh consultation.
    await client.query(`UPDATE pg_temp."Docente" SET estado='ACTIVO',"horasAsignables"=500 WHERE id=$1`,[ids[1]]);
    await check({periodoCarga:'2026-2'},3,3,1300,433.3);
    // Same name in different periods, repeated batches, unchanged rows and rejected rows.
    const batch = async (nombre,periodo,registros) => fixture('academic_work_plan','RundCargaMasiva',{
      id:randomUUID(),nombre_archivo:'convocatoria-prueba.xlsx',tipo_mime:'application/json',
      tamano_bytes:2,sha256:'a'.repeat(64),contenido:Buffer.from('[]'),actor_id:'SISTEMA',
      justificacion:'Prueba temporal',estado:'COMPLETADA',resumen:{convocatoria:nombre,
        convocatoriaClave:nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
        convocatoriaPeriodo:periodo,trazabilidad:{periodos:[periodo],registros,
          resumenPorPeriodo:{[periodo]:{total:registros.length}}}},
    });
    const member = (index,resultado='CREADO') => ({docenteId:ids[index],periodo:records[index].periodoCarga,
      nombre:'Persona ficticia',documento_identidad:'TEST-CV-'+index,fila:index+2,resultado});
    await batch('Convocatoria Pública','2026-2',[member(0),member(1,'SIN_CAMBIOS'),member(2,'NO_CARGADO'),member(3)]);
    await batch('Convocatoria Pública','2026-2',[member(0,'SIN_CAMBIOS')]);
    await batch('Convocatoria Pública','2025-2',[member(3)]);
    await batch('Otra convocatoria','2026-2',[member(1,'ACTUALIZADO')]);
    const cv = await check({periodoCarga:'2026-2',convocatoria:' CONVOCATORIA PUBLICA '},2,2,1300,650);
    assert.equal(cv.por_convocatoria.find(row=>row.convocatoria==='Convocatoria Pública').total,2,'No duplicar pertenencias al repetir una carga');
    assert.equal(cv.por_convocatoria.find(row=>row.convocatoria==='Otra convocatoria').total,1,'Conservar convocatorias previas');
    await check({periodoCarga:'2025-2',convocatoria:'Convocatoria Pública'},1,1,700,700);
    await check({periodoCarga:'2026-2',convocatoria:'Otra convocatoria'},1,1,500,500);
    await check({periodoCarga:'2026-2',convocatoria:'Inexistente'},0,0,0,0);
    const catalog = await service.getConvocatorias('2026-2');
    assert.equal(catalog.length,2);
    assert.equal((await service.getConvocatorias('2025-2')).length,1);
    assert.equal((await service.getConvocatorias('2030-1')).length,0);
    const listed = await service.list({periodoCarga:'2026-2',convocatoria:'Convocatoria Pública'});
    assert.equal(listed.total,2);
    assert(listed.data.every(row=>row.convocatorias.includes('Convocatoria Pública')));
    const history = await service.getRegistrationHistory({periodoCarga:'2026-2',convocatoria:'Convocatoria Pública'});
    assert.equal(history.total,2);
    assert(history.data.every(row=>row.convocatoria==='Convocatoria Pública' && row.periodo==='2026-2'));
    for (const search of ['Pública','publica','CONVOCATORIA   PUBLICA']) {
      const found = await service.getRegistrationHistory({periodoCarga:'2026-2',search});
      assert.equal(found.total,2,'Buscar por convocatoria con o sin tildes, mayúsculas y espacios');
    }
    const first = await service.getRegistrationHistory({periodoCarga:'2026-2',convocatoria:'CONVOCATORIA PUBLICA',tipo:'MASIVO',limit:1});
    const second = await service.getRegistrationHistory({periodoCarga:'2026-2',convocatoria:'Convocatoria Pública',tipo:'MASIVO',limit:1,page:2});
    assert.equal(first.total,2); assert.equal(first.pages,2); assert.equal(second.data.length,1);
    assert.notEqual(first.data[0].id,second.data[0].id,'La paginación debe conservar el filtro y recorrer otras cargas');
    const other = await service.getRegistrationHistory({periodoCarga:'2026-2',convocatoria:'Otra convocatoria'});
    assert.equal(other.total,1); assert.equal(other.data[0].convocatoria,'Otra convocatoria');
    const detail = await service.getRegistrationHistoryDetail('MASIVO',first.data[0].id,{periodoCarga:'2026-2'});
    assert.equal(detail.event.convocatoria,'Convocatoria Pública');
    assert(detail.registros.length>0 && detail.registros.every(row=>row.periodo==='2026-2'),'El detalle no mezcla otros períodos');
    await assert.rejects(service.getRegistrationHistoryDetail('MASIVO',first.data[0].id,{periodoCarga:'2025-2'}),/periodo seleccionado/);
    for (const filters of [
      {convocatoria:'Inexistente'}, {convocatoria:'Convocatoria Pública',search:'Otra'},
      {convocatoria:'Convocatoria Pública',tipo:'INDIVIDUAL'}, {search:'%_'},
    ]) assert.equal((await service.getRegistrationHistory({periodoCarga:'2026-2',...filters})).total,0);
    const deletion = await service.previewRegistroDeletion({todosFiltrados:true,filters:{periodoCarga:'2026-2',convocatoria:'Otra convocatoria'}});
    assert.deepEqual(deletion.ids,[ids[1]],'La selección filtrada debe conservar la convocatoria');
    console.log(JSON.stringify({success:true,temporaryTablesOnly:true,checks:['9 distribuciones y resumen contra el listado','Periodos 2025-2 y 2026-2 aislados','Todos los periodos y registros sin periodo','Periodo vacío sin NaN','Filtros combinados','Etiquetas territoriales equivalentes','Grupos sin territorial y sin dedicación','Refresco tras cambios de estado y horas','Convocatorias por período, sin cambios y sin duplicados','Trazabilidad, filtros y pertenencia histórica','Selección filtrada conserva convocatoria']},null,2));
  } finally {await client.query('ROLLBACK');await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
