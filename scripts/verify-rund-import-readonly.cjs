// Verifica proyecciones reales de RUND sin inicializar ni modificar bloques documentales.
const path = require('node:path');
const assert = require('node:assert/strict');
const { config } = require('./audit-rund-excel.cjs');
const root = path.resolve(__dirname, '../backend/academic-work-plan-service');
require(path.join(root,'node_modules/ts-node')).register({transpileOnly:true,project:path.join(root,'tsconfig.json')});
const { BancoDocentesService } = require(path.join(root,'src/pta/banco-docentes/banco-docentes.service.ts'));
const { protectRundSensitiveData } = require(path.join(root,'src/pta/banco-docentes/banco-docentes-sensitive-data.ts'));
const { DocenteEntity } = require(path.join(root,'src/pta/entities/docente.entity.ts'));
const { DataSource } = require(path.join(root,'node_modules/typeorm'));
(async () => {
  const db = new DataSource({type:'postgres',host:config.host,port:config.port,username:config.user,password:config.password,
    database:config.database,entities:[DocenteEntity],synchronize:false});
  await db.initialize();
  const runner = db.createQueryRunner(); await runner.connect();
  try {
    await runner.startTransaction(); await runner.query('SET TRANSACTION READ ONLY');
    const svc = Object.create(BancoDocentesService.prototype);
    svc.dataSource = {query:(...args)=>runner.query(...args)};
    svc.docenteRepo = runner.manager.getRepository(DocenteEntity);
    svc.getBloques = async id => runner.query('SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id=$1',[id]);
    const list = await svc.list({periodoCarga:'2026-2',limit:200});
    const list2 = await svc.list({periodoCarga:'2026-2',page:2,limit:200});
    const rows = [...list.data,...list2.data];
    assert.equal(rows.length,list.total); assert(rows.length>250); assert(rows.every(r=>r.territorial));
    const head = await svc.getPerfilCabezote('479678','2026-2');
    assert.equal(head.territorial,'META');
    const tarjeta = await svc.getTarjetaRUND(head.docente_id);
    assert.equal(Object.keys(tarjeta.datos_carga_masiva).length,38);
    assert.equal(tarjeta.bloques.IDENTIDAD.campos.find(c=>c.campo==='FECHA_NACIMIENTO').valor,'1966-01-17');
    assert.equal(tarjeta.bloques.VINCULACION.campos.find(c=>c.campo==='TERRITORIAL').valor,'META');
    const restricted = protectRundSensitiveData(tarjeta,false);
    assert.equal(restricted.datos_carga_masiva.PUNTAJE_SALARIAL,null);
    assert.equal(restricted.bloques.VINCULACION.campos.find(c=>c.campo==='PUNTAJE_SALARIAL').valor,null);
    const cats = await runner.query('SELECT id_seccional::text AS id,nom_seccional AS nombre FROM auth.seccionales');
    for(const [name,reported] of [['Meta','META'],['Norte De Santander','NORTESANTANDER'],['Santander','SANTANDER']]) {
      const cat = cats.find(c=>c.nombre===name);
      const result = await svc.list({periodoCarga:'2026-2',territorial:cat.id});
      const expected = rows.filter(r=>r.territorial===reported).length;
      assert.equal(result.total,expected); assert(expected>0);
      console.log(JSON.stringify({filtro:name,registros:result.total}));
    }
    console.log(JSON.stringify({listadoConTerritorial:rows.length,cabezote:'META',columnasOriginales:38,fechaCorrecta:true,rbac:true}));
    await runner.rollbackTransaction();
  } finally { await runner.release(); await db.destroy(); }
})().catch(error=>{console.error(error.message);process.exitCode=1});
