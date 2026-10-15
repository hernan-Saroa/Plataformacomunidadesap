import { RundExtraccionNotificationsService } from './rund-extraccion-notifications.service';
import { ServiceUnavailableException } from '@nestjs/common';
describe('Avisos persistentes de RUND',()=>{
  const old=process.env.RUND_OCR_ENABLED, original=global.fetch;
  const job={id:'job',docente_id:'doc',creado_por:'actor',notificacion_id:'event',estado:'COMPLETADO'};
  beforeEach(()=>{process.env.RUND_OCR_ENABLED='true';global.fetch=jest.fn().mockResolvedValue({ok:true});});
  afterEach(()=>{global.fetch=original;if(old===undefined)delete process.env.RUND_OCR_ENABLED;else process.env.RUND_OCR_ENABLED=old;});
  function database(record:any=job){
    return {query:jest.fn(async(sql:string)=>sql.includes('SELECT * FROM aviso')?[record]:[])};
  }
  const identities=(recipient:string|null='recipient')=>({destinatarioAviso:jest.fn().mockResolvedValue(recipient)});
  it('notifica al solicitante con clave estable, enlace al expediente y sin datos OCR',async()=>{
    const db=database(), auth=identities();await new RundExtraccionNotificationsService(db as any,auth as any).tick();
    const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({clave_idempotencia:'event',id_usuario_destinatario:'recipient',enviar_email:false});
    expect(body.url_accion).toBe('/?module=banco-docentes-pta&rundDocenteId=doc');
    expect(body).not.toHaveProperty('evidencia');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('notificado_en=now()'),['job']);
    expect(auth.destinatarioAviso).toHaveBeenCalledWith(job.creado_por);
    expect(db.query.mock.calls.every(([sql])=>!/auth\.|academic_work_plan\./.test(sql))).toBe(true);
  });
  it('un fallo conserva el aviso para reintentar con la misma clave',async()=>{
    const db=database();(global.fetch as jest.Mock).mockResolvedValue({ok:false});
    await new RundExtraccionNotificationsService(db as any,identities() as any).tick();
    expect(db.query.mock.calls.some(([sql])=>sql.includes('notificado_en=now()'))).toBe(false);
  });
  it.each(['ERROR','OBSOLETO'])('informa un resultado %s sin afirmar que hay sugerencias',async estado=>{
    await new RundExtraccionNotificationsService(database({...job,estado}) as any,identities() as any).tick();
    const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.prioridad).toBe('Alta');expect(body.titulo).toBe('Revisa tu análisis documental de RUND');
  });
  it('no difunde un aviso si no puede resolver al solicitante',async()=>{
    const db=database();
    await new RundExtraccionNotificationsService(db as any,identities(null) as any).tick();expect(global.fetch).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("notificacion_proxima=now()+interval '1 day'"),[job.id]);
  });
  it('no consulta ni envía cuando el experimento está apagado',async()=>{
    process.env.RUND_OCR_ENABLED='false';const db=database(),auth=identities();
    await new RundExtraccionNotificationsService(db as any,auth as any).tick();expect(db.query).not.toHaveBeenCalled();
    expect(auth.destinatarioAviso).not.toHaveBeenCalled();
  });

  it('un fallo Auth conserva el reintento corto y no envía ni confirma ni aplaza un día',async()=>{
    const db=database(),auth=identities();auth.destinatarioAviso.mockRejectedValue(new ServiceUnavailableException());
    await new RundExtraccionNotificationsService(db as any,auth as any).tick();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(db.query.mock.calls.some(([sql])=>sql.includes('notificado_en=now()')||sql.includes("interval '1 day'"))).toBe(false);
    expect(db.query.mock.calls[0][0]).toContain("notificacion_proxima=now()+interval '1 minute'");
  });
  it('sin trabajo elegible no consulta Auth ni hace difusión',async()=>{
    const auth=identities();await new RundExtraccionNotificationsService(database(null) as any,auth as any).tick();
    expect(auth.destinatarioAviso).not.toHaveBeenCalled();expect(global.fetch).not.toHaveBeenCalled();
  });
  it('una caída libera busy y permite reintentar con la misma clave y payload',async()=>{
    const db=database(),service=new RundExtraccionNotificationsService(db as any,identities() as any);
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('respuesta perdida')).mockResolvedValueOnce({ok:true});
    await service.tick();await service.tick();
    const bodies=(global.fetch as jest.Mock).mock.calls.map(([,options])=>JSON.parse(options.body));
    expect(bodies).toHaveLength(2);expect(bodies[1]).toEqual(bodies[0]);
    expect(db.query.mock.calls.filter(([sql])=>sql.includes('notificado_en=now()'))).toHaveLength(1);
  });
  it('dos ticks simultáneos de la misma instancia no reservan ni envían dos veces',async()=>{
    const db=database(),auth=identities();let complete!:(value:string)=>void;
    auth.destinatarioAviso.mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));
    const service=new RundExtraccionNotificationsService(db as any,auth as any);
    const first=service.tick();await Promise.resolve();await service.tick();
    expect(auth.destinatarioAviso).toHaveBeenCalledTimes(1);
    complete('recipient');await first;expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
