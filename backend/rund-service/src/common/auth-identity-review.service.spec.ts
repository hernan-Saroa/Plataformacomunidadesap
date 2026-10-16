import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityReviewService } from './auth-identity-review.service';

describe('Bandeja y asignacion de revisiones RUND',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',actor='abcdef00-2222-4222-8222-222222222222';
  const row=()=>({caso_id:id,intencion_id:id,operacion_auth_id:id,huella_comando:'a'.repeat(64),huella_contexto:'b'.repeat(64),
    motivo:'ALTA_IDENTIDAD',estado:'PENDIENTE',creada_en:'2026-10-15T10:00:00.123456Z',asumida_por:null,asumida_en:null});
  const setup=()=>{
    const current=row(),query=jest.fn().mockResolvedValue([current]),tx=jest.fn().mockResolvedValue([]),transaction=jest.fn(fn=>fn({query:tx}));
    return {current,query,tx,transaction,service:new AuthIdentityReviewService({query,transaction} as any)};
  };
  it.each(['',null,'documento'])('ID invalido %s no hace SQL',async value=>{
    const s=setup();await expect(s.service.consultar(value as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.asumir(value as any,actor)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('una sesion sin UUID no produce asignacion',async()=>{
    const s=setup();await expect(s.service.asumir(id,'correo@example.test')).rejects.toBeInstanceOf(BadRequestException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it('consulta minima mantiene microsegundos y no devuelve recibo o identidad',async()=>{
    const s=setup(),result=await s.service.consultar(id.toUpperCase());expect(result.creadaEn).toBe('2026-10-15T10:00:00.123456Z');
    expect(result).toMatchObject({casoId:id,estado:'PENDIENTE',asumidaPor:null});expect(JSON.stringify(result)).not.toMatch(/preimagen|password|documento|recibo/);
  });
  it('caso ausente devuelve 404 sin crearlo',async()=>{
    const s=setup();s.query.mockResolvedValue([]);await expect(s.service.consultar(id)).rejects.toBeInstanceOf(NotFoundException);expect(s.transaction).not.toHaveBeenCalled();
  });
  it.each([{limite:'0'},{limite:'101'},{limite:10},{limite:'10;DELETE'},{estado:'CERRADA'},{estado:['PENDIENTE']},{actorId:actor},{cursor:''},{cursor:'no-json'}])('rechaza consulta %j antes de SQL',async input=>{
    const s=setup();await expect(s.service.listar(input)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('paginacion usa el ultimo caso visible y conserva los seis decimales en cursor, sin OFFSET',async()=>{
    const s=setup(),next={...row(),caso_id:actor};s.query.mockResolvedValueOnce([s.current,next]);
    const first=await s.service.listar({limite:'1',estado:'PENDIENTE'});expect(first.casos).toHaveLength(1);
    const cursor=JSON.parse(Buffer.from(first.siguienteCursor,'base64url').toString());expect(cursor.creadaEn).toBe(s.current.creada_en);
    await s.service.listar({limite:'1',estado:'PENDIENTE',cursor:first.siguienteCursor});
    expect(s.query.mock.calls[1][1]).toEqual(['PENDIENTE','2026-10-15T10:00:00.123456Z',id,2]);expect(s.query.mock.calls[1][0]).not.toContain('OFFSET');
    await expect(s.service.listar({estado:'EN_REVISION',cursor:first.siguienteCursor})).rejects.toBeInstanceOf(BadRequestException);
  });
  it('pagina vacia o final devuelve cursor null sin escribir',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]);expect(await s.service.listar()).toEqual({casos:[],siguienteCursor:null});
    expect((await s.service.listar()).siguienteCursor).toBeNull();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('asignacion bloquea caso y persiste solo responsable/fecha, sin SQL Auth o cierre',async()=>{
    const s=setup();s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([s.current]).mockResolvedValueOnce([{caso_id:id}]);
    await s.service.asumir(id,actor.toUpperCase());expect(s.tx.mock.calls[1][0]).toContain('FOR UPDATE');expect(s.tx.mock.calls[2][1]).toEqual([id,actor]);
    expect(s.tx.mock.calls[2][0]).toContain("estado='EN_REVISION'");expect(s.tx.mock.calls.every(call=>!/(?:auth\.|COMPENSADA|DELETE)/i.test(call[0]))).toBe(true);
  });
  it('mismo responsable conserva asignacion sin UPDATE y otro responsable recibe 409',async()=>{
    const s=setup();s.current.estado='EN_REVISION';s.current.asumida_por=actor;
    s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([s.current]);await s.service.asumir(id,actor);expect(s.tx).toHaveBeenCalledTimes(2);
    s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([s.current]);await expect(s.service.asumir(id,id)).rejects.toBeInstanceOf(ConflictException);
  });
  it('caso ausente o UPDATE no confirmado no fabrica asignacion',async()=>{
    const s=setup();await expect(s.service.asumir(id,actor)).rejects.toBeInstanceOf(NotFoundException);
    s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([s.current]).mockResolvedValueOnce([]);
    await expect(s.service.asumir(id,actor)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
