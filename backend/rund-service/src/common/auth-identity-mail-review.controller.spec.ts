import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityMailReviewController } from './auth-identity-mail-review.controller';
describe('Controlador de revisión de correo RUND',()=>{
  const id='abcdef00-1111-4111-8111-111111111111';
  const req=()=>({user:{sub:id,roles:['ADMIN'],exp:2000000000}});
  const setup=()=>{const service={registrar:jest.fn(),asumir:jest.fn(),consultar:jest.fn(),listar:jest.fn()};
    return{service,controller:new AuthIdentityMailReviewController(service as any)};};
  it('toma actor y vencimiento de sesión; pasa únicamente ID y filtros',()=>{
    const s=setup();s.controller.registrar(id,{},req());s.controller.asumir(id,undefined,req());s.controller.consultar(id,req());s.controller.listar({},req());
    expect(s.service.registrar).toHaveBeenCalledWith(id,{actorId:id,roles:['ADMIN'],expiresAt:2000000000});expect(s.service.asumir).toHaveBeenCalledWith(id,expect.objectContaining({actorId:id}));
  });
  it.each([null,[],{actorId:id},{estado:'ENVIADO'},{resultado:'ACEPTADO'},{asumidaPor:id}])('no acepta campos o cuerpo %j',body=>{
    const s=setup();expect(()=>s.controller.registrar(id,body,req())).toThrow(BadRequestException);expect(()=>s.controller.asumir(id,body,req())).toThrow(BadRequestException);expect(s.service.registrar).not.toHaveBeenCalled();
  });
  it('sesión sin cuenta no se sustituye por ID de persona',()=>{
    const s=setup();expect(()=>s.controller.consultar(id,{user:{personaId:id}})).toThrow(UnauthorizedException);expect(s.service.consultar).not.toHaveBeenCalled();
  });
});

describe('Extensión de cierre auditable de revisión de correo',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',req={user:{sub:id,roles:['ADMIN'],exp:2000000000}};
  it('cierre y consulta usan exclusivamente cuenta y exp de sesión',()=>{
    const closures={cerrar:jest.fn(),consultar:jest.fn()},controller=new AuthIdentityMailReviewController({}as any,closures as any);
    controller.cerrar(id,{},req);controller.consultarCierre(id,req);
    expect(closures.cerrar).toHaveBeenCalledWith(id,{actorId:id,roles:['ADMIN'],expiresAt:2000000000});expect(closures.consultar).toHaveBeenCalledWith(id,expect.objectContaining({actorId:id}));
  });
  it.each([null,[],{cerradaPor:id},{resultado:'ACEPTADO'},{motivo:'ACEPTACION_REGISTRADA'}])('no admite afirmaciones o cuerpo %j del navegador',body=>{
    const closures={cerrar:jest.fn()},controller=new AuthIdentityMailReviewController({}as any,closures as any);
    expect(()=>controller.cerrar(id,body,req)).toThrow(BadRequestException);expect(closures.cerrar).not.toHaveBeenCalled();
  });
  it('constructor anterior sigue válido y la capacidad ausente no confirma un cierre',()=>{
    const controller=new AuthIdentityMailReviewController({}as any);
    expect(()=>controller.cerrar(id,{},req)).toThrow('no esta disponible');expect(()=>controller.consultarCierre(id,req)).toThrow('no esta disponible');
  });
});

describe('Diagnóstico opcional de correo en controlador',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',req={user:{sub:id,roles:['ADMIN'],exp:2000000000}};
  it('pasa intención y principal de sesión al diagnóstico sin usar campos del navegador',()=>{
    const diagnostics={diagnosticar:jest.fn()},controller=new AuthIdentityMailReviewController({}as any,undefined,diagnostics as any);
    controller.diagnosticar(id,{},req);expect(diagnostics.diagnosticar).toHaveBeenCalledWith(id,{actorId:id,roles:['ADMIN'],expiresAt:2000000000});
    expect(()=>controller.diagnosticar(id,{apta:true},req)).toThrow(BadRequestException);
    expect(()=>controller.diagnosticar(id,{}, {user:{personaId:id}})).toThrow(UnauthorizedException);
    expect(diagnostics.diagnosticar).toHaveBeenCalledTimes(1);
  });
  it('proveedor ausente no altera las capacidades anteriores ni fabrica diagnóstico',()=>{
    expect(()=>new AuthIdentityMailReviewController({}as any).diagnosticar(id,{},req)).toThrow('no esta disponible');
  });
});

describe('Omisión explícita opcional de bienvenida',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',req={user:{sub:id,roles:['ADMIN'],exp:2000000000}};
  it('usa principal de sesión y no acepta motivo, cuenta o fecha del navegador',()=>{
    const omissions={consultar:jest.fn(),omitir:jest.fn()},controller=new AuthIdentityMailReviewController({}as any,undefined,undefined,omissions as any);
    controller.omitirPorVigencia(id,{},req);controller.consultarOmision(id,req);expect(omissions.omitir).toHaveBeenCalledWith(id,{actorId:id,roles:['ADMIN'],expiresAt:2000000000});
    expect(()=>controller.omitirPorVigencia(id,{motivo:'IDENTIDAD_NO_VIGENTE'},req)).toThrow(BadRequestException);
    expect(()=>controller.consultarOmision(id,{user:{personaId:id}})).toThrow(UnauthorizedException);expect(omissions.omitir).toHaveBeenCalledTimes(1);
  });
  it('proveedor ausente no fabrica recibo',()=>{
    const controller=new AuthIdentityMailReviewController({}as any);expect(()=>controller.omitirPorVigencia(id,{},req)).toThrow('no esta disponible');expect(()=>controller.consultarOmision(id,req)).toThrow('no esta disponible');
  });
});

describe('Revisión de resultado incierto registrado',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',req={user:{sub:id,roles:['ADMIN'],exp:2000000000}};
  it('usa principal de sesión y cuerpo vacío',()=>{
    const service={registrarIncierto:jest.fn()},controller=new AuthIdentityMailReviewController(service as any);
    controller.registrarIncierto(id,{},req);expect(service.registrarIncierto).toHaveBeenCalledWith(id,{actorId:id,roles:['ADMIN'],expiresAt:2000000000});
    expect(()=>controller.registrarIncierto(id,{resultado:'INCIERTO'},req)).toThrow(BadRequestException);
    expect(()=>controller.registrarIncierto(id,{}, {user:{personaId:id}})).toThrow(UnauthorizedException);expect(service.registrarIncierto).toHaveBeenCalledTimes(1);
  });
});
