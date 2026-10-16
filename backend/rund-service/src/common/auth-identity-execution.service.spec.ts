import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AuthIdentityExecutionService } from './auth-identity-execution.service';

describe('Ejecucion de identidad y decision nativa irreversible',()=>{
  const id='abcdef00-1111-4111-8111-111111111111';
  const row=(decision='EN_CURSO',estadoNativo='PREPARADA')=>({intencion_id:id,operacion_auth_id:id,huella_comando:'a'.repeat(64),huella_contexto:'b'.repeat(64),
    decision,preparada_en:new Date(),abortada_en:decision==='ABORTADA'?new Date():null,motivo_aborto:decision==='ABORTADA'?'FALLO_NEGOCIO':null,
    estado_auth:'PREPARADA',estado_nativo:estadoNativo,resultado_nativo:null});
  const setup=()=>{
    const query=jest.fn().mockResolvedValue([]),tx=jest.fn().mockResolvedValue([]),transaction=jest.fn(fn=>fn({query:tx}));
    const coord={reconciliar:jest.fn()},native={preparar:jest.fn(),confirmarNativo:jest.fn()},auth={aplicar:jest.fn()};
    return {query,tx,transaction,coord,native,auth,service:new AuthIdentityExecutionService({query,transaction} as any,coord as any,native as any,auth as any)};
  };
  it.each(['no-id','',null])('ID invalido %s no abre SQL o HTTP',async value=>{
    const s=setup();await expect(s.service.ejecutar(value as any)).rejects.toBeInstanceOf(BadRequestException);expect(s.query).not.toHaveBeenCalled();expect(s.auth.aplicar).not.toHaveBeenCalled();
  });
  it('no acepta un motivo de aborto libre y no crea una intencion inexistente',async()=>{
    const s=setup();await expect(s.service.abortar(id,'DETALLE PERSONAL' as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(s.transaction).not.toHaveBeenCalled();await expect(s.service.ejecutar(id)).rejects.toBeInstanceOf(NotFoundException);expect(s.auth.aplicar).not.toHaveBeenCalled();
  });
  it('estado confirmado se recupera sin llamar a Auth o ejecutar otra vez el escritor',async()=>{
    const s=setup();s.query.mockResolvedValue([row('EN_CURSO','CONFIRMADA')]);expect((await s.service.ejecutar(id)).estadoNativo).toBe('CONFIRMADA');
    expect(s.coord.reconciliar).not.toHaveBeenCalled();expect(s.native.confirmarNativo).not.toHaveBeenCalled();expect(s.auth.aplicar).not.toHaveBeenCalled();
  });
  it('aborto persistido impide reanudacion antes de HTTP',async()=>{
    const s=setup();s.query.mockResolvedValue([row('ABORTADA')]);await expect(s.service.ejecutar(id)).rejects.toBeInstanceOf(ConflictException);
    expect(s.coord.reconciliar).not.toHaveBeenCalled();expect(s.native.confirmarNativo).not.toHaveBeenCalled();expect(s.auth.aplicar).not.toHaveBeenCalled();
  });
  it('aborto no confirma cancelacion Auth; su resolucion sigue pendiente',async()=>{
    const s=setup();s.query.mockResolvedValue([row('ABORTADA')]);expect((await s.service.consultar(id)).resolucionAuthPendiente).toBe(true);
  });
  it('recuperar una caida Auth conserva el error, sin aplicar identidad o confirmar negocio',async()=>{
    const s=setup();s.query.mockResolvedValue([row()]);s.coord.reconciliar.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.service.recuperar(id)).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.auth.aplicar).not.toHaveBeenCalled();expect(s.native.confirmarNativo).not.toHaveBeenCalled();
  });
  it('un commit confirmado gana frente a la solicitud de aborto y no modifica la decision',async()=>{
    const s=setup();s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([{}]).mockResolvedValueOnce([{estado:'CONFIRMADA'}]).mockResolvedValueOnce([{decision:'EN_CURSO'}]);
    await expect(s.service.abortar(id,'FALLO_NEGOCIO')).rejects.toBeInstanceOf(ConflictException);expect(s.tx).toHaveBeenCalledTimes(4);
  });
  it('aborto repetido conserva motivo y fecha; otro motivo no los sobrescribe',async()=>{
    const s=setup();s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([{}]).mockResolvedValueOnce([{estado:'PREPARADA'}])
      .mockResolvedValueOnce([{decision:'ABORTADA',motivo_aborto:'FALLO_NEGOCIO'}]);s.query.mockResolvedValue([row('ABORTADA')]);
    expect((await s.service.abortar(id,'FALLO_NEGOCIO')).decisionNativa).toBe('ABORTADA');expect(s.tx).toHaveBeenCalledTimes(4);
    s.tx.mockResolvedValueOnce([]).mockResolvedValueOnce([{}]).mockResolvedValueOnce([{estado:'PREPARADA'}])
      .mockResolvedValueOnce([{decision:'ABORTADA',motivo_aborto:'FALLO_NEGOCIO'}]);
    await expect(s.service.abortar(id,'CANCELACION_SOLICITUD')).rejects.toBeInstanceOf(ConflictException);
  });
});
