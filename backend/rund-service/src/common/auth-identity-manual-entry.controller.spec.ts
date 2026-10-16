import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityManualEntryController } from './auth-identity-manual-entry.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BancoDocentesRolesGuard } from '../modules/banco-docentes/banco-docentes-roles.guard';

describe('Frontera HTTP preparatoria manual',()=>{
  const actor='abcdef00-1111-4111-8111-111111111111';
  it('exige JWT y las mismas reglas de rol/permiso del modal',()=>{
    expect(Reflect.getMetadata('__guards__',AuthIdentityManualEntryController)).toEqual([JwtAuthGuard,BancoDocentesRolesGuard]);
    expect(Reflect.getMetadata('rundPermissions',AuthIdentityManualEntryController)).toEqual(['banco-docentes.rund.manage']);
    expect(Reflect.getMetadata('roles',AuthIdentityManualEntryController)).toContain('GESTION_PROFESORAL');
    expect(Reflect.getMetadata('isPublic',AuthIdentityManualEntryController)).toBeUndefined();
  });
  it.each(['preparar','reanudar','consultar','ejecutar','consultarEjecucion','revisarCaptura','abandonar','consultarAbandono','cerrar','consultarCierre','consultarCorreo'])('%s usa no-store',method=>{
    expect(Reflect.getMetadata('__headers__',AuthIdentityManualEntryController.prototype[method])).toContainEqual({name:'Cache-Control',value:'private, no-store'});
  });
  it('actor/fullAccess proceden de sesion y la IP del request',()=>{
    const entries={preparar:jest.fn()},controller=new AuthIdentityManualEntryController(entries as any);
    controller.preparar(actor,{formulario:{}},{user:{sub:actor,userId:'OTRO',roles:['DOCENTE'],fullAccess:true},ip:'127.0.0.1'});
    expect(entries.preparar).toHaveBeenCalledWith(actor,{actorId:actor,roles:['DOCENTE'],fullAccess:false,ip:'127.0.0.1'},{});
  });
  it.each([{actorId:actor,formulario:{}},{comandoAuth:{}},[],null])('body %j no aporta contexto de servidor',body=>{
    const controller=new AuthIdentityManualEntryController({} as any);expect(()=>controller.preparar(actor,body,{user:{sub:actor}})).toThrow(BadRequestException);
  });
  it('sesion sin UUID no actua como SISTEMA',()=>{
    const controller=new AuthIdentityManualEntryController({} as any);expect(()=>controller.consultar(actor,{user:{email:'privado@example.test'}})).toThrow(UnauthorizedException);
  });
  it('reanudar no acepta reemplazo del formulario',()=>{
    const controller=new AuthIdentityManualEntryController({} as any);expect(()=>controller.reanudar(actor,{formulario:{}},{user:{sub:actor}})).toThrow(BadRequestException);
  });
  it('error de infraestructura no expone query o parametros privados a la frontera HTTP',async()=>{
    const error=Object.assign(new Error('FALLO SQL PRIVADO'),{parameters:['DOCUMENTO PRIVADO','correo@example.test']});
    const controller=new AuthIdentityManualEntryController({reanudar:jest.fn().mockRejectedValue(error)} as any);
    await expect(controller.reanudar(actor,{}, {user:{sub:actor}})).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller.reanudar(actor,{}, {user:{sub:actor}})).rejects.not.toHaveProperty('parameters');
  });
  it('un conflicto de negocio conserva su codigo HTTP',async()=>{
    const conflict=new ConflictException('Conflicto confirmado.'),controller=new AuthIdentityManualEntryController({reanudar:jest.fn().mockRejectedValue(conflict)} as any);
    await expect(controller.reanudar(actor,{}, {user:{sub:actor}})).rejects.toBe(conflict);
  });
  it('ejecutar toma expiracion y actor de los claims firmados sin admitir body',async()=>{
    const executions={ejecutar:jest.fn().mockResolvedValue({estado:'CONFIRMADA'})},controller=new AuthIdentityManualEntryController({} as any,executions as any);
    await controller.ejecutar(actor,{}, {user:{sub:actor,exp:123,roles:['ADMIN']},ip:'127.0.0.1'});
    expect(executions.ejecutar).toHaveBeenCalledWith(actor,{actorId:actor,expiresAt:123,roles:['ADMIN'],fullAccess:false,ip:'127.0.0.1'});
    expect(()=>controller.ejecutar(actor,{intencionId:actor},{user:{sub:actor}})).toThrow(BadRequestException);
  });
  it('consulta de ejecucion queda acotada al actor de sesion',async()=>{
    const executions={consultar:jest.fn().mockResolvedValue({})},controller=new AuthIdentityManualEntryController({} as any,executions as any);
    await controller.consultarEjecucion(actor,{user:{sub:actor}});expect(executions.consultar).toHaveBeenCalledWith(actor,actor);
  });
  it('revisión toma solo actor, roles y expiración firmados y no campos de query o body',async()=>{
    const captures={consultar:jest.fn().mockResolvedValue({})},controller=new AuthIdentityManualEntryController({} as any,undefined,captures as any);
    await controller.revisarCaptura(actor,{user:{sub:actor,roles:['DOCENTE'],exp:123},query:{actorId:'OTRO',fullAccess:true},body:{actorId:'OTRO'}});
    expect(captures.consultar).toHaveBeenCalledWith(actor,{actorId:actor,roles:['DOCENTE'],expiresAt:123,fullAccess:false,ip:undefined});
  });
  it('revisión sin proveedor o con error SQL no filtra parámetros privados',async()=>{
    const controller=new AuthIdentityManualEntryController({} as any);
    await expect(controller.revisarCaptura(actor,{user:{sub:actor}})).rejects.toBeInstanceOf(ServiceUnavailableException);
    const captures={consultar:jest.fn().mockRejectedValue(Object.assign(new Error('PRIVADO'),{parameters:['PRIVADO']}))};
    const connected=new AuthIdentityManualEntryController({} as any,undefined,captures as any);
    await expect(connected.revisarCaptura(actor,{user:{sub:actor}})).rejects.not.toHaveProperty('parameters');
  });
  it('abandono y consulta usan actor/exp firmados sin admitir formulario o autoridad del body',async()=>{
    const abandonments={abandonar:jest.fn().mockResolvedValue({}),consultar:jest.fn().mockResolvedValue({})};
    const controller=new AuthIdentityManualEntryController({} as any,undefined,undefined,abandonments as any);
    await controller.abandonar(actor,{}, {user:{sub:actor,roles:['ADMIN'],exp:123}});
    await controller.consultarAbandono(actor,{user:{sub:actor,roles:['ADMIN'],exp:123}});
    expect(abandonments.abandonar).toHaveBeenCalledWith(actor,{actorId:actor,roles:['ADMIN'],fullAccess:false,ip:undefined,expiresAt:123});
    expect(abandonments.consultar).toHaveBeenCalledWith(actor,expect.objectContaining({actorId:actor,expiresAt:123}));
    expect(()=>controller.abandonar(actor,{actorId:actor},{user:{sub:actor}})).toThrow(BadRequestException);
  });
  it('abandono sin proveedor o con SQL privado falla con 503 genérico',async()=>{
    const unconnected=new AuthIdentityManualEntryController({} as any);
    await expect(unconnected.consultarAbandono(actor,{user:{sub:actor}})).rejects.toBeInstanceOf(ServiceUnavailableException);
    const abandonments={abandonar:jest.fn().mockRejectedValue(Object.assign(new Error('PRIVADO'),{parameters:['PRIVADO']}))};
    const controller=new AuthIdentityManualEntryController({} as any,undefined,undefined,abandonments as any);
    await expect(controller.abandonar(actor,{}, {user:{sub:actor}})).rejects.not.toHaveProperty('parameters');
  });
  it('cierre usa sesión firmada sin admitir intención, motivo o permiso del body',async()=>{
    const closures={cerrar:jest.fn().mockResolvedValue({}),consultar:jest.fn().mockResolvedValue({})};
    const controller=new AuthIdentityManualEntryController({} as any,undefined,undefined,undefined,closures as any);
    await controller.cerrar(actor,{}, {user:{sub:actor,roles:['ADMIN'],exp:123}});await controller.consultarCierre(actor,{user:{sub:actor,exp:123}});
    expect(closures.cerrar).toHaveBeenCalledWith(actor,expect.objectContaining({actorId:actor,expiresAt:123,roles:['ADMIN']}));
    expect(closures.consultar).toHaveBeenCalledWith(actor,expect.objectContaining({actorId:actor,expiresAt:123}));
    expect(()=>controller.cerrar(actor,{intencionId:actor},{user:{sub:actor}})).toThrow(BadRequestException);
  });
  it('cierre ausente o error SQL no expone parámetros privados',async()=>{
    const empty=new AuthIdentityManualEntryController({} as any);await expect(empty.consultarCierre(actor,{user:{sub:actor}})).rejects.toBeInstanceOf(ServiceUnavailableException);
    const closures={cerrar:jest.fn().mockRejectedValue(Object.assign(new Error('PRIVADO'),{parameters:['PRIVADO']}))};
    const controller=new AuthIdentityManualEntryController({} as any,undefined,undefined,undefined,closures as any);
    await expect(controller.cerrar(actor,{}, {user:{sub:actor}})).rejects.not.toHaveProperty('parameters');
  });
  it('correo consulta por actor y expiración firmados sin confiar en query o body',async()=>{
    const mail={consultar:jest.fn().mockResolvedValue({})};
    const controller=new AuthIdentityManualEntryController({} as any,undefined,undefined,undefined,undefined,mail as any);
    await controller.consultarCorreo(actor,{user:{sub:actor,exp:123,roles:['ADMIN']},query:{actorId:'OTRO',intencionId:'OTRA'},body:{enviar:true}});
    expect(mail.consultar).toHaveBeenCalledWith(actor,expect.objectContaining({actorId:actor,expiresAt:123,roles:['ADMIN']}));
    expect(Reflect.getMetadata('path',AuthIdentityManualEntryController.prototype.consultarCorreo)).toBe(':solicitudId/correo');
  });
  it('correo sin proveedor o con SQL privado conserva 503 genérico',async()=>{
    const empty=new AuthIdentityManualEntryController({} as any);
    await expect(empty.consultarCorreo(actor,{user:{sub:actor}})).rejects.toBeInstanceOf(ServiceUnavailableException);
    const mail={consultar:jest.fn().mockRejectedValue(Object.assign(new Error('PRIVADO'),{parameters:['PRIVADO']}))};
    const controller=new AuthIdentityManualEntryController({} as any,undefined,undefined,undefined,undefined,mail as any);
    await expect(controller.consultarCorreo(actor,{user:{sub:actor}})).rejects.not.toHaveProperty('parameters');
  });
});
