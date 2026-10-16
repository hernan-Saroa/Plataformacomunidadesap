import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualCaptureService, MANUAL_CAPTURE_FIELDS } from './auth-identity-manual-capture.service';

describe('Revision autorizada de captura manual sin mutaciones',()=>{
  const request='abcdef00-1111-4111-8111-111111111111',actorId='abcdef00-2222-4222-8222-222222222222';
  const actor=()=>({actorId,roles:['OPERADOR'],fullAccess:true,expiresAt:Date.now()/1000+600});
  const setup=()=>{
    const context={escritura:{payload:{documentNumber:'1020304050',puntajeSalarial:123.5,fullName:'NOMBRE ORIGINAL',
      primer_nombre:'MARIA',periodoCarga:'2026-2',horasAsignables:800,fechaInicioVinculacion:new Date('2026-01-01T00:00:00Z'),
      desconocido:'NO EXPONER',actorId:'INTERNO',password:'PRIVADO'},rawPayload:{privado:'NO EXPONER'},
      options:{audit:{ip:'192.0.2.1'}},finalFullName:'MARIA LOPEZ',emailFinal:'maria@esap.edu.co',phoneFinal:null,
      territorial:{id:'INTERNO',nombre:'Sede Central'}}};
    const entries={restaurarCaptura:jest.fn().mockResolvedValue({intencionId:request,context})};
    const identities={permisosRoles:jest.fn().mockResolvedValue(['banco-docentes.rund.manage'])};
    return {context,entries,identities,service:new AuthIdentityManualCaptureService(entries as any,identities as any)};
  };
  it('proyecta solo campos permitidos, valores efectivos y fechas sin devolver contexto privado',async()=>{
    const s=setup(),result=await s.service.consultar(request,{...actor(),roles:['GESTION_PROFESORAL']});
    expect(result.campos).toMatchObject({documentNumber:'1020304050',puntajeSalarial:123.5,fullName:'MARIA LOPEZ',correoInstitucional:'maria@esap.edu.co',
      territorialNombre:'Sede Central',fechaInicioVinculacion:'2026-01-01T00:00:00.000Z',pregrado:null});
    expect(Object.keys(result.campos)).toEqual([...MANUAL_CAPTURE_FIELDS]);expect(Object.keys(result)).toHaveLength(5);
    expect(JSON.stringify(result)).not.toMatch(/INTERNO|PRIVADO|NO EXPONER|192\.0\.2|rawPayload|comandoAuth|options|actorId/);
    expect(s.identities.permisosRoles).not.toHaveBeenCalled();
  });
  it('manage no concede acceso sensible aunque fullAccess venga afirmado en el objeto',async()=>{
    const s=setup(),before=JSON.stringify(s.context),result=await s.service.consultar(request,actor());
    expect(result.campos.documentNumber).toBe('******4050');expect(result.campos.puntajeSalarial).toBeNull();
    expect(result.proteccionDatos).toEqual({accesoCompleto:false,camposEnmascarados:['documentNumber','puntajeSalarial']});
    expect(JSON.stringify(result)).not.toContain('1020304050');expect(JSON.stringify(s.context)).toBe(before);
    expect(s.identities.permisosRoles).toHaveBeenCalledTimes(2);
  });
  it.each(['ADMIN','SUPER_ADMIN'])('rol %s conserva su regla actual de permiso y protección sensible',async role=>{
    const s=setup(),result=await s.service.consultar(request,{...actor(),roles:[role]});
    expect(result.proteccionDatos.accesoCompleto).toBe(role==='SUPER_ADMIN');expect(s.identities.permisosRoles).not.toHaveBeenCalled();
  });
  it.each([undefined,0,NaN,1])('expiración %s no obtiene la captura',async expiresAt=>{
    const s=setup();await expect(s.service.consultar(request,{...actor(),expiresAt})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(s.entries.restaurarCaptura).not.toHaveBeenCalled();
  });
  it('UUID inválido no consulta la captura ni permisos',async()=>{
    const s=setup();await expect(s.service.consultar('no-id',actor())).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.service.consultar(request,{...actor(),actorId:'no-id'})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(s.entries.restaurarCaptura).not.toHaveBeenCalled();expect(s.identities.permisosRoles).not.toHaveBeenCalled();
  });
  it('permiso ausente o Auth no disponible falla cerrado antes de leer',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('PRIVADO'));
    await expect(s.service.consultar(request,actor())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(s.service.consultar(request,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.entries.restaurarCaptura).not.toHaveBeenCalled();
  });
  it('revocación durante lectura impide entregar datos ya obtenidos',async()=>{
    const s=setup();s.identities.permisosRoles.mockResolvedValueOnce(['banco-docentes.rund.manage']).mockResolvedValueOnce([]);
    await expect(s.service.consultar(request,actor())).rejects.toBeInstanceOf(ForbiddenException);expect(s.entries.restaurarCaptura).toHaveBeenCalledTimes(1);
  });
  it('sesión vencida durante lectura no devuelve captura',async()=>{
    const s=setup(),now=Date.now(),clock=jest.spyOn(Date,'now').mockReturnValue(now);
    s.entries.restaurarCaptura.mockImplementation(async()=>{clock.mockReturnValue(now+700000);return {intencionId:request,context:s.context};});
    try{await expect(s.service.consultar(request,actor())).rejects.toBeInstanceOf(UnauthorizedException);}finally{clock.mockRestore();}
  });
  it('actor/solicitud son los de la sesión y otra persona recibe el 404 del propietario',async()=>{
    const s=setup();s.entries.restaurarCaptura.mockRejectedValue(new NotFoundException());
    await expect(s.service.consultar(request.toUpperCase(),actor())).rejects.toBeInstanceOf(NotFoundException);
    expect(s.entries.restaurarCaptura).toHaveBeenCalledWith(request.toUpperCase(),actorId);
  });
  it.each([{},['NO'],Number.NaN,'texto\0privado'])('dato no escalar o incompatible %j no se expone',async value=>{
    const s=setup();(s.context.escritura.payload as any).pregrado=value;
    await expect(s.service.consultar(request,actor())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
