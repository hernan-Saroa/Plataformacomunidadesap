import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityAbortProofController, AuthIdentityExecutionService } from './auth-identity-execution.service';
import { InternalServiceGuard } from '../internal/internal-service.guard';
import { IS_PUBLIC_KEY } from '../auth/auth.decorators';

describe('Resolucion propietaria de abortos no aplicados',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',opId='abcdef00-2222-4222-8222-222222222222';
  const setup=()=>{
    const current={intencion_id:id,operacion_auth_id:opId,huella_comando:'a'.repeat(64),huella_contexto:'b'.repeat(64),
      decision:'ABORTADA',preparada_en:'2026-10-15T10:00:00.000Z',abortada_en:'2026-10-15T10:01:00.000Z',motivo_aborto:'FALLO_NEGOCIO',
      estado_auth:'PREPARADA',estado_nativo:'PREPARADA',resultado_nativo:null};
    let remote='PREPARADA';
    const receipt=()=>({coordinacion:{intencionId:id,operacionAuthId:opId,huellaComando:current.huella_comando,estado:remote}});
    const query=jest.fn(async()=>[current]),transaction=jest.fn();
    const coord={reconciliar:jest.fn(async()=>{current.estado_auth=remote;return receipt();}),
      registrarEnAuth:jest.fn(async()=>{current.estado_auth=remote='AUTH_REGISTRADA';return receipt().coordinacion;})};
    const auth={aplicar:jest.fn(),cancelar:jest.fn(async()=>{remote='CANCELADA';})},native={confirmarNativo:jest.fn()};
    return {current,query,transaction,coord,auth,native,setRemote:(value:string)=>{remote=value;},
      service:new AuthIdentityExecutionService({query,transaction} as any,coord as any,native as any,auth as any)};
  };
  it('controles se ejecutan antes de registrar y cancelar; denegación impide la siguiente mutación',async()=>{
    const s=setup(),control=jest.fn(async phase=>{if(phase==='CANCELAR_AUTH')throw new Error('DENEGADO');});
    await expect(s.service.resolverAbortoConControles(id,control)).rejects.toThrow('DENEGADO');
    expect(control.mock.calls.map(call=>call[0])).toEqual(['REGISTRAR_AUTH','CANCELAR_AUTH']);expect(s.auth.cancelar).not.toHaveBeenCalled();
  });

  it.each(['',null,'documento-123'])('rechaza ID %s antes de SQL o HTTP',async value=>{
    const s=setup();await expect(s.service.resolverAborto(value as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.pruebaAborto(value as any)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();
  });
  it('no inventa una intencion ausente',async()=>{
    const s=setup();s.query.mockResolvedValue([]);await expect(s.service.resolverAborto(id)).rejects.toBeInstanceOf(NotFoundException);
    expect(s.coord.reconciliar).not.toHaveBeenCalled();
  });
  it.each([
    {decision:'EN_CURSO'}, {estado_nativo:'CONFIRMADA'}, {abortada_en:null}, {motivo_aborto:'TEXTO LIBRE'},
  ])('exige aborto durable y ausencia de commit: %j',async change=>{
    const s=setup();Object.assign(s.current,change);
    await expect(s.service.resolverAborto(id)).rejects.toBeInstanceOf(ConflictException);
    await expect(s.service.pruebaAborto(id)).rejects.toBeInstanceOf(ConflictException);
    expect(s.coord.reconciliar).not.toHaveBeenCalled();expect(s.auth.cancelar).not.toHaveBeenCalled();
  });
  it('la prueba no expone identidad, comando o recibos y solo consulta SQL local',async()=>{
    const s=setup();expect(await s.service.pruebaAborto(id.toUpperCase())).toEqual({version:1,intencionId:id,operacionAuthId:opId,
      huellaComando:'a'.repeat(64),huellaContexto:'b'.repeat(64),decisionNativa:'ABORTADA',estadoNativo:'PREPARADA',
      abortadaEn:s.current.abortada_en,motivoAborto:'FALLO_NEGOCIO'});
    expect(s.transaction).not.toHaveBeenCalled();expect(s.coord.reconciliar).not.toHaveBeenCalled();
  });
  it('GET preparatorio requiere guard de servicio aunque omita JWT',()=>{
    expect(Reflect.getMetadata(IS_PUBLIC_KEY,AuthIdentityAbortProofController)).toBe(true);
    expect(Reflect.getMetadata('__guards__',AuthIdentityAbortProofController)).toEqual([InternalServiceGuard]);
    expect(Reflect.getMetadata('path',AuthIdentityAbortProofController)).toBe('internal/rund/v1/identidad/intenciones');
    expect(Reflect.getMetadata('__headers__',AuthIdentityAbortProofController.prototype.consultar)).toContainEqual({name:'Cache-Control',value:'private, no-store'});
  });
  it('ausencia explicita crea y cancela el mismo UUID sin aplicar identidad o abrir transaccion durante HTTP',async()=>{
    const s=setup(),result=await s.service.resolverAborto(id);
    expect(result.estadoAuth).toBe('CANCELADA');expect(result.resolucionAuthPendiente).toBe(false);
    expect(s.coord.registrarEnAuth).toHaveBeenCalledWith(id);expect(s.auth.cancelar).toHaveBeenCalledWith(opId,'a'.repeat(64));
    expect(s.coord.reconciliar).toHaveBeenCalledTimes(2);expect(s.auth.aplicar).not.toHaveBeenCalled();
    expect(s.native.confirmarNativo).not.toHaveBeenCalled();expect(s.transaction).not.toHaveBeenCalled();
  });
  it('un registro existente se cancela sin volver a registrar',async()=>{
    const s=setup();s.setRemote('AUTH_REGISTRADA');expect((await s.service.resolverAborto(id)).estadoAuth).toBe('CANCELADA');
    expect(s.coord.registrarEnAuth).not.toHaveBeenCalled();expect(s.auth.cancelar).toHaveBeenCalledTimes(1);
  });
  it('cancelacion local confirmada se recupera sin HTTP',async()=>{
    const s=setup();s.current.estado_auth='CANCELADA';expect((await s.service.resolverAborto(id)).resolucionAuthPendiente).toBe(false);
    expect(s.coord.reconciliar).not.toHaveBeenCalled();expect(s.auth.cancelar).not.toHaveBeenCalled();
  });
  it('Auth ya aplicado conserva identidad y resolucion pendiente',async()=>{
    const s=setup();s.setRemote('AUTH_APLICADA');const result=await s.service.resolverAborto(id);
    expect(result.estadoAuth).toBe('AUTH_APLICADA');expect(result.resolucionAuthPendiente).toBe(true);
    expect(s.auth.cancelar).not.toHaveBeenCalled();expect(s.auth.aplicar).not.toHaveBeenCalled();
  });
  it('registro en vuelo ya aplicado no se cancela ni se toma por una compensacion',async()=>{
    const s=setup();s.coord.registrarEnAuth.mockImplementation(async()=>{s.current.estado_auth='AUTH_APLICADA';return {intencionId:id,operacionAuthId:opId,huellaComando:'a'.repeat(64),estado:'AUTH_APLICADA'};});
    expect((await s.service.resolverAborto(id)).resolucionAuthPendiente).toBe(true);expect(s.auth.cancelar).not.toHaveBeenCalled();
  });
  it('409 al cancelar solo se resuelve tras GET terminal del propietario',async()=>{
    const s=setup();s.setRemote('AUTH_REGISTRADA');s.auth.cancelar.mockImplementation(async()=>{s.setRemote('AUTH_APLICADA');throw new ConflictException();});
    const result=await s.service.resolverAborto(id);expect(result.estadoAuth).toBe('AUTH_APLICADA');expect(result.resolucionAuthPendiente).toBe(true);
    expect(s.coord.reconciliar).toHaveBeenCalledTimes(2);expect(s.auth.aplicar).not.toHaveBeenCalled();
  });
  it('409 sin recibo terminal confirmado conserva el conflicto',async()=>{
    const s=setup();s.setRemote('AUTH_REGISTRADA');s.auth.cancelar.mockRejectedValue(new ConflictException());
    await expect(s.service.resolverAborto(id)).rejects.toBeInstanceOf(ConflictException);expect(s.current.estado_auth).toBe('AUTH_REGISTRADA');
  });
  it('caida al cancelar no repite POST ni fabrica un recibo',async()=>{
    const s=setup();s.setRemote('AUTH_REGISTRADA');s.auth.cancelar.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.service.resolverAborto(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.auth.cancelar).toHaveBeenCalledTimes(1);expect(s.coord.reconciliar).toHaveBeenCalledTimes(1);expect(s.current.estado_auth).toBe('AUTH_REGISTRADA');
  });
  it('GET invalido antes de publicar no se interpreta como ausencia',async()=>{
    const s=setup();s.coord.reconciliar.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.service.resolverAborto(id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(s.coord.registrarEnAuth).not.toHaveBeenCalled();expect(s.auth.cancelar).not.toHaveBeenCalled();
  });
  it('cancelacion remota con GET perdido se recupera sin repetir la escritura',async()=>{
    const s=setup();s.setRemote('AUTH_REGISTRADA');s.coord.reconciliar.mockImplementationOnce(async()=>({coordinacion:{intencionId:id,operacionAuthId:opId,huellaComando:'a'.repeat(64),estado:'AUTH_REGISTRADA'}}))
      .mockRejectedValueOnce(new ServiceUnavailableException());
    await expect(s.service.resolverAborto(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.current.estado_auth).toBe('PREPARADA');
    expect((await s.service.resolverAborto(id)).resolucionAuthPendiente).toBe(false);expect(s.auth.cancelar).toHaveBeenCalledTimes(1);
  });
});
