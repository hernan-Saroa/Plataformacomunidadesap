import { RundExtraccionNotificationsService } from './rund-extraccion-notifications.service';
describe('Avisos persistentes de RUND',()=>{
  const old=process.env.RUND_OCR_ENABLED, original=global.fetch;
  const job={id:'job',docente_id:'doc',creado_por:'actor',notificacion_id:'event',estado:'COMPLETADO'};
  beforeEach(()=>{process.env.RUND_OCR_ENABLED='true';global.fetch=jest.fn().mockResolvedValue({ok:true});});
  afterEach(()=>{global.fetch=original;if(old===undefined)delete process.env.RUND_OCR_ENABLED;else process.env.RUND_OCR_ENABLED=old;});
  function database(record:any=job,user:any={id_user:'recipient'}){
    return {query:jest.fn(async(sql:string)=>sql.includes('SELECT * FROM aviso')?[record]:sql.includes('FROM auth.')?(user?[user]:[]):[])};
  }
  it('notifica al solicitante con clave estable, enlace al expediente y sin datos OCR',async()=>{
    const db=database();await new RundExtraccionNotificationsService(db as any).tick();
    const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({clave_idempotencia:'event',id_usuario_destinatario:'recipient',enviar_email:false});
    expect(body.url_accion).toBe('/?module=banco-docentes-pta&rundDocenteId=doc');
    expect(body).not.toHaveProperty('evidencia');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('notificado_en=now()'),['job']);
  });
  it('un fallo conserva el aviso para reintentar con la misma clave',async()=>{
    const db=database();(global.fetch as jest.Mock).mockResolvedValue({ok:false});
    await new RundExtraccionNotificationsService(db as any).tick();
    expect(db.query.mock.calls.some(([sql])=>sql.includes('notificado_en=now()'))).toBe(false);
  });
  it.each(['ERROR','OBSOLETO'])('informa un resultado %s sin afirmar que hay sugerencias',async estado=>{
    await new RundExtraccionNotificationsService(database({...job,estado}) as any).tick();
    const body=JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.prioridad).toBe('Alta');expect(body.titulo).toBe('Revisa tu análisis documental de RUND');
  });
  it('no difunde un aviso si no puede resolver al solicitante',async()=>{
    await new RundExtraccionNotificationsService(database(job,null) as any).tick();expect(global.fetch).not.toHaveBeenCalled();
  });
  it('no consulta ni envía cuando el experimento está apagado',async()=>{
    process.env.RUND_OCR_ENABLED='false';const db=database();
    await new RundExtraccionNotificationsService(db as any).tick();expect(db.query).not.toHaveBeenCalled();
  });
});
