import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('🛡️ [RolesGuard] Required roles:', requiredRoles);

    if (!requiredRoles) {
      console.log('✅ [RolesGuard] No roles required, access granted');
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    console.log('🛡️ [RolesGuard] User from request:', JSON.stringify(user, null, 2));
    
    if (!user) {
      console.log('❌ [RolesGuard] No user in request');
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasRole = requiredRoles.some((role) => {
      // Verificar en array de roles
      if (Array.isArray(user.roles)) {
        // Los roles pueden ser strings o objetos con propiedad 'code'
        return user.roles.some((userRole: any) => {
          if (typeof userRole === 'string') {
            return userRole === role;
          }
          // Si es un objeto, buscar en la propiedad 'code'
          return userRole?.code === role;
        });
      }
      // Verificar en rol único
      if (user.role) {
        // El rol único también puede ser string u objeto
        if (typeof user.role === 'string') {
          return user.role === role;
        }
        return user.role?.code === role;
      }
      return false;
    });

    console.log(hasRole ? '✅ [RolesGuard] Access GRANTED' : '❌ [RolesGuard] Access DENIED');

    if (!hasRole) {
      throw new ForbiddenException(
        `No tienes permisos. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
