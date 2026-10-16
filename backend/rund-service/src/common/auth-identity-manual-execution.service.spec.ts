import { ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualExecutionService } from './auth-identity-manual-execution.service';

describe('Ejecucion manual autorizada y recibo minimo recuperable',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',actorId='abcdef00-2222-4222-8222-222222222222';
  const actor=()=>({actorId,roles:['OPERADOR'],fullAccess:false,expiresAt:Date.now()/1000+60});
  const row=()=>({solicitud_id:id,intencion_id:id,capturada:true,decision:'EN_CURSO',estado_auth:'PREPARADA',estado_nativo:'PREPARADA',docente_id:null,confirmada_en:null});
  const confirmed=(current:any)=>Object.assign(current,{estado_auth:'AUTH_APLICADA',estado_nativo:'CONFIRMADA',docente_id:'DOCENTE',confirmada_en:'2026-10-15T10:00:00.123456Z'});
  const setup=()=>{
    const current=row(),query=jest.fn().mockImplementation(async()=>[current]),entries={reanudar:jest.fn().mockResolvedValue({})};
    const identities={permisosRoles:jest.fn().mockResolvedValue(['banco-docentes.rund.manage'])};
    const execution={ejecutarConControles:jest.fn().mockImplementation(async(_id,control)=>{
      for(const phase of ['REGISTRAR_AUTH','APLICAR_AUTH','CONFIRMAR_NATIVO'])await control(phase);confirmed(current);
    })};
    return {current,query,entries,identities,execution,service:new AuthIdentityManualExecutionService({query} as any,entries as any,execution as any,identities as any)};
  };
  it('prevalida y reautoriza cada fase, sin devolver identidad o resultado de negocio',async()=>{
    const s=setup(),result=await s.service.ejecutar(id,actor());expect(result.estado).toBe('CONFIRMADA');expect(result.docenteId).toBe('DOCENTE');
    expect(s.identities.permisosRoles).toHaveBeenCalledTimes(5);expect(s.entries.reanudar).toHaveBeenCalledWith(id,actorId);expect(result.correo).toBe('PENDIENTE');
    expect(JSON.stringify(result)).not.toMatch(/personaId|correo@|resultadoNativo|formulario/);
  });
  it('confirmado se recupera sin volver a prevalidar o ejecutar',async()=>{
    const s=setup();confirmed(s.current);expect((await s.service.ejecutar(id,actor())).estado).toBe('CONFIRMADA');
    expect(s.entries.reanudar).not.toHaveBeenCalled();expect(s.execution.ejecutarConControles).not.toHaveBeenCalled();
  });
  it.each([undefined,0,1,NaN])('sesion sin expiracion vigente %s no consulta ni escribe',async expiresAt=>{
    const s=setup();await expect(s.service.ejecutar(id,{...actor(),expiresAt})).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
  });
  it('permiso revocado o Auth caido falla cerrado antes de preparar',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce([]);await expect(s.service.ejecutar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    s.identities.permisosRoles.mockRejectedValueOnce(new Error('AUTH'));await expect(s.service.ejecutar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.entries.reanudar).not.toHaveBeenCalled();
  });
  it('gestion conserva autorizacion por rol y no exige un grant adicional',async()=>{
    const s=setup();await s.service.ejecutar(id,{...actor(),roles:['GESTION_PROFESORAL']});expect(s.identities.permisosRoles).not.toHaveBeenCalled();
  });
  it('perdida de permiso durante las fases conserva error sin afirmar confirmacion',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValue([]);
    await expect(s.service.ejecutar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.current.estado_nativo).toBe('PREPARADA');
  });
  it('respuesta perdida despues del commit se recupera si la sesion sigue autorizada',async()=>{
    const s=setup();s.execution.ejecutarConControles.mockImplementation(async()=>{confirmed(s.current);throw new Error('RESPUESTA PERDIDA');});
    expect((await s.service.ejecutar(id,actor())).estado).toBe('CONFIRMADA');
  });
  it('error de prevalidacion recupera un commit concurrente sin otra ejecucion',async()=>{
    const s=setup();s.entries.reanudar.mockImplementation(async()=>{confirmed(s.current);throw new ConflictException();});
    expect((await s.service.ejecutar(id,actor())).estado).toBe('CONFIRMADA');expect(s.execution.ejecutarConControles).not.toHaveBeenCalled();
  });
  it('fallo previo al commit no fabrica confirmacion ni oculta el error',async()=>{
    const s=setup(),error=new ServiceUnavailableException();s.entries.reanudar.mockRejectedValue(error);
    await expect(s.service.ejecutar(id,actor())).rejects.toBe(error);expect(s.execution.ejecutarConControles).not.toHaveBeenCalled();
  });
  it('aborto y registro antiguo sin captura no se ejecutan',async()=>{
    const s=setup();s.current.decision='ABORTADA';await expect(s.service.ejecutar(id,actor())).rejects.toBeInstanceOf(ConflictException);
    s.current.capturada=false;await expect(s.service.consultar(id,actorId)).rejects.toBeInstanceOf(ConflictException);expect(s.entries.reanudar).not.toHaveBeenCalled();
  });
  it('consulta ajena no devuelve datos y confirmed incompleto no fabrica recibo',async()=>{
    const s=setup();s.query.mockResolvedValueOnce([]);await expect(s.service.consultar(id,actorId)).rejects.toBeInstanceOf(NotFoundException);
    s.current.estado_nativo='CONFIRMADA';await expect(s.service.consultar(id,actorId)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
