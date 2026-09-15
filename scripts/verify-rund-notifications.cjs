// Repositorio TypeORM real sobre tabla TEMP: ningún aviso se envía a usuarios reales.
const path=require('node:path');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {config}=require('./audit-rund-excel.cjs');
const service=path.resolve(__dirname,'../backend/notifications-service');
const backend=path.resolve(service,'../academic-work-plan-service');
require(path.join(backend,'node_modules/ts-node')).register({transpileOnly:true,project:path.join(service,'tsconfig.json')});
const {DataSource}=require(path.join(service,'node_modules/typeorm'));
const {Notification}=require(path.join(service,'src/notifications/entities/notification.entity.ts'));
const {NotificationsService}=require(path.join(service,'src/notifications/notifications.service.ts'));
(async()=>{
  const source=new DataSource({type:'postgres',host:config.host,port:config.port,username:config.user,password:config.password,database:config.database,entities:[Notification]});
  await source.initialize();const runner=source.createQueryRunner();await runner.connect();
  try{
    await runner.startTransaction();
    await runner.query('CREATE TEMP TABLE notificacion (LIKE notifications.notificacion INCLUDING ALL) ON COMMIT DROP');
    const metadata=source.getMetadata(Notification);metadata.schema='pg_temp';metadata.tablePath='pg_temp.notificacion';
    const repo=runner.manager.getRepository(Notification),notifications=new NotificationsService(repo);
    const dto={clave_idempotencia:randomUUID(),id_usuario_destinatario:randomUUID(),tipo_notificacion:'rund_extraccion_finalizada',titulo:'PRUEBA FICTICIA',mensaje:'Finalizó el análisis ficticio'};
    const first=await notifications.create(dto);await repo.update(first.id_notificacion,{leida:true});
    const second=await notifications.create(dto);
    assert.equal(first.id_notificacion,second.id_notificacion);assert.equal(second.leida,true);assert.equal(await repo.count(),1);
    await assert.rejects(()=>notifications.create({...dto,id_usuario_destinatario:randomUUID()}));
    console.log('Campana: TypeORM real verifica aviso único, reintento idempotente, lectura conservada y destinatario protegido (tabla TEMP, rollback).');
  }finally{await runner.rollbackTransaction();await runner.release();await source.destroy();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
