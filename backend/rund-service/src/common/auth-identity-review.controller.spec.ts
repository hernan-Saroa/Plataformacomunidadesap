import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthIdentityReviewController } from './auth-identity-review.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';

describe('Revision RUND exige sesion y gestion efectiva',()=>{
  const id='abcdef00-1111-4111-8111-111111111111',actor='abcdef00-2222-4222-8222-222222222222';
  it('clase exige JWT/PermissionsGuard y permiso manage, sin @Public',()=>{
    expect(Reflect.getMetadata('__guards__',AuthIdentityReviewController)).toEqual([JwtAuthGuard,PermissionsGuard]);
    expect(Reflect.getMetadata('permissions',AuthIdentityReviewController)).toEqual(['banco-docentes.rund.manage']);
    expect(Reflect.getMetadata('isPublic',AuthIdentityReviewController)).toBeUndefined();
  });
  it.each(['listar','consultar','asumir'])('%s evita cache de casos',method=>{
    expect(Reflect.getMetadata('__headers__',AuthIdentityReviewController.prototype[method])).toContainEqual({name:'Cache-Control',value:'private, no-store'});
  });
  it('responsable procede del sub autenticado y no de campos alternativos',()=>{
    const service={asumir:jest.fn()},controller=new AuthIdentityReviewController(service as any);
    controller.asumir(id,{}, {user:{sub:actor,userId:id,id}});expect(service.asumir).toHaveBeenCalledWith(id,actor);
  });
  it.each([{actorId:actor},{asumidaPor:actor},{estado:'CERRADA'},null,[]])('body %j no elige responsable, fecha o cierre',body=>{
    const service={asumir:jest.fn()},controller=new AuthIdentityReviewController(service as any);
    expect(()=>controller.asumir(id,body,{user:{sub:actor}})).toThrow(BadRequestException);expect(service.asumir).not.toHaveBeenCalled();
  });
  it('sesion sin identidad de usuario no asigna a SISTEMA o a un correo',()=>{
    const service={asumir:jest.fn()},controller=new AuthIdentityReviewController(service as any);
    expect(()=>controller.asumir(id,{}, {user:{email:'ficticio@example.test'}})).toThrow(UnauthorizedException);expect(service.asumir).not.toHaveBeenCalled();
  });
});
