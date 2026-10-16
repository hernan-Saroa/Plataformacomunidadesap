import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualCloseService } from './auth-identity-manual-close.service';
describe('Cierre autenticado de solicitudes reservadas',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',actorId='abcdef00-2222-4222-8222-222222222222';
  const actor=()=>({actorId,roles:['OPERADOR'],fullAccess:false,expiresAt:Date.now()/1000+600});
  const setup=()=>{
    const row={intencion_id:id,capturada:true,estado_auth:'PREPARADA',estado_nativo:'PREPARADA',decision:'EN_CURSO',resolucion_auth:null as string|null,caso_id:null as string|null};
    const query=jest.fn(async()=>[row]),entries={restaurarCaptura:jest.fn().mockResolvedValue({intencionId:id,context:{comandoAuth:{},escritura:{}}})};
    const identities={permisosRoles:jest.fn().mockResolvedValue(['banco-docentes.rund.manage'])};
    const local=()=>({estadoNativo:row.estado_nativo,decisionNativa:row.decision,estadoAuth:row.estado_auth});
    const execution={preparar:jest.fn(async()=>{row.estado_nativo='PREPARADA';row.decision='EN_CURSO';}),consultar:jest.fn(async()=>local()),
      abortar:jest.fn(async()=>{row.decision='ABORTADA';return local();}),
      resolverAbortoConControles:jest.fn(async(_id:string,control:any)=>{await control('REGISTRAR_AUTH');await control('CANCELAR_AUTH');row.estado_auth='CANCELADA';return local();})};
    const compensation={resolverConControles:jest.fn(async(_id:string,control:any)=>{await control();row.resolucion_auth='COMPENSADA';})};
    return {row,query,entries,identities,execution,compensation,service:new AuthIdentityManualCloseService({query} as any,entries as any,execution as any,compensation as any,identities as any)};
  };
  it('aborta y cancela con el mismo ID y controles vigentes, sin devolver datos privados',async()=>{
    const s=setup(),result=await s.service.cerrar(id,actor());expect(result.estado).toBe('CERRADA');expect(result.puedeIniciarOtra).toBe(true);
    expect(s.execution.abortar).toHaveBeenCalledWith(id,'CANCELACION_SOLICITUD');expect(s.compensation.resolverConControles).not.toHaveBeenCalled();
    expect(Object.keys(result)).toHaveLength(9);expect(s.identities.permisosRoles.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(s.query).toHaveBeenCalledWith(expect.stringContaining('WHERE s.actor_id=$1 AND s.solicitud_id=$2'),[actorId,id]);
  });
  it('journal parcial restaura contexto desde captura sin prevalidar el formulario otra vez',async()=>{
    const s=setup();s.row.estado_nativo=null;s.row.decision=null;
    expect((await s.service.cerrar(id,actor())).estado).toBe('CERRADA');expect(s.execution.preparar).toHaveBeenCalledWith(id,{},{});
  });
  it.each(['COMPENSADA','REVISION_REQUERIDA'])('identidad aplicada resuelve %s y solo compensación permite otra solicitud',async state=>{
    const s=setup();s.row.estado_auth='AUTH_APLICADA';s.execution.resolverAbortoConControles.mockImplementation(async()=>({estadoNativo:'PREPARADA',decisionNativa:'ABORTADA',estadoAuth:'AUTH_APLICADA'}));
    s.compensation.resolverConControles.mockImplementation(async(_id,control)=>{await control();s.row.resolucion_auth=state;if(state==='REVISION_REQUERIDA')s.row.caso_id=actorId;});
    const result=await s.service.cerrar(id,actor());expect(result.estado).toBe(state==='COMPENSADA'?'CERRADA':'REVISION_REQUERIDA');
    expect(result.puedeIniciarOtra).toBe(state==='COMPENSADA');expect(result.casoRevisionId).toBe(state==='COMPENSADA'?null:actorId);
  });
  it('aborto anterior conserva su motivo y no se reactiva',async()=>{
    const s=setup();s.row.decision='ABORTADA';await s.service.cerrar(id,actor());expect(s.execution.abortar).not.toHaveBeenCalled();
  });
  it.each(['CERRADA','REVISION_REQUERIDA'])('estado terminal %s devuelve recibo sin HTTP de escritura o preparación',async state=>{
    const s=setup();s.row.decision='ABORTADA';s.row.estado_auth=state==='CERRADA'?'CANCELADA':'AUTH_APLICADA';
    if(state==='REVISION_REQUERIDA'){s.row.resolucion_auth=state;s.row.caso_id=actorId;}
    expect((await s.service.cerrar(id,actor())).estado).toBe(state);expect(s.entries.restaurarCaptura).not.toHaveBeenCalled();
    expect(s.execution.resolverAbortoConControles).not.toHaveBeenCalled();expect(s.compensation.resolverConControles).not.toHaveBeenCalled();
  });
  it('GET solo consulta estado local y no cierra ni publica identidad',async()=>{
    const s=setup();expect((await s.service.consultar(id,actor())).estado).toBe('PENDIENTE');
    expect(s.execution.abortar).not.toHaveBeenCalled();expect(s.entries.restaurarCaptura).not.toHaveBeenCalled();
  });
  it('commit conocido o que gana antes del aborto nunca se compensa',async()=>{
    const s=setup();s.row.estado_nativo='CONFIRMADA';s.row.estado_auth='AUTH_APLICADA';
    await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.execution.abortar).not.toHaveBeenCalled();
    s.row.estado_nativo='PREPARADA';s.execution.consultar.mockImplementation(async()=>({estadoNativo:'CONFIRMADA',decisionNativa:'EN_CURSO',estadoAuth:'AUTH_APLICADA'}));
    await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.compensation.resolverConControles).not.toHaveBeenCalled();
  });
  it.each([undefined,1,NaN])('exp %s no consulta ni escribe',async expiresAt=>{
    const s=setup();await expect(s.service.cerrar(id,{...actor(),expiresAt})).rejects.toBeInstanceOf(UnauthorizedException);expect(s.query).not.toHaveBeenCalled();
  });
  it('otro actor, solicitud inválida o falta de journal no inventan una operación',async()=>{
    const s=setup();await expect(s.service.cerrar('NO',actor())).rejects.toBeInstanceOf(BadRequestException);
    s.query.mockResolvedValueOnce([]);await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(NotFoundException);
    s.row.estado_auth=null;await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ConflictException);expect(s.execution.abortar).not.toHaveBeenCalled();
  });
  it('revocación durante la captura impide el aborto',async()=>{
    const s=setup();s.entries.restaurarCaptura.mockImplementation(async()=>{s.identities.permisosRoles.mockResolvedValue([]);return {intencionId:id,context:{comandoAuth:{},escritura:{}}};});
    await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.execution.abortar).not.toHaveBeenCalled();
  });
  it('revocación en control remoto conserva aborto y no declara cierre',async()=>{
    const s=setup();s.execution.resolverAbortoConControles.mockImplementation(async(_id,control)=>{s.identities.permisosRoles.mockResolvedValue([]);await control('CANCELAR_AUTH');return {} as any;});
    await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.row.decision).toBe('ABORTADA');expect(s.row.estado_auth).toBe('PREPARADA');
  });
  it('fallo remoto tras aborto no compensa automáticamente y conserva el error',async()=>{
    const s=setup();s.execution.resolverAbortoConControles.mockRejectedValue(new ServiceUnavailableException());
    await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);expect(s.row.decision).toBe('ABORTADA');
    expect(s.compensation.resolverConControles).not.toHaveBeenCalled();
  });
  it('revisión sin caso durable no fabrica un cierre',async()=>{
    const s=setup();s.row.decision='ABORTADA';s.row.estado_auth='AUTH_APLICADA';s.row.resolucion_auth='REVISION_REQUERIDA';
    await expect(s.service.consultar(id,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('permiso ausente o no disponible falla cerrado antes de leer',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('AUTH'));
    await expect(s.service.cerrar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(s.service.consultar(id,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.query).not.toHaveBeenCalled();
  });
});
