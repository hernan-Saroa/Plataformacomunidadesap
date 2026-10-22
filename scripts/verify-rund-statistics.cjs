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
    const tables = [['academic_work_plan','Docente'], ...['user','personas','role','user_roles','seccionales','sedes'].map(t=>['auth',t])];
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
      for(const [key,rows] of Object.entries(stats).filter(([key])=>key.startsWith('por_'))) {
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
    console.log(JSON.stringify({success:true,temporaryTablesOnly:true,checks:['9 distribuciones y resumen contra el listado','Periodos 2025-2 y 2026-2 aislados','Todos los periodos y registros sin periodo','Periodo vacío sin NaN','Filtros combinados','Etiquetas territoriales equivalentes','Grupos sin territorial y sin dedicación','Refresco tras cambios de estado y horas']},null,2));
  } finally {await client.query('ROLLBACK');await client.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
