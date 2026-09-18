import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const req = context.switchToHttp().getRequest();
    const headerUserId = req.headers['x-user-id'];
    if (headerUserId) {
      req.user = {
        userId: String(headerUserId),
        username: req.headers['x-user-username']
          ? String(req.headers['x-user-username'])
          : undefined,
        email: req.headers['x-user-email']
          ? String(req.headers['x-user-email'])
          : undefined,
        name: req.headers['x-user-name']
          ? String(req.headers['x-user-name'])
          : undefined,
        roles: (req.headers['x-user-roles'] || req.headers['x-user-role'])
          ? String(req.headers['x-user-roles'] || req.headers['x-user-role']).split(/[,\s]+/).filter(Boolean)
          : [],
      };
      return true;
    }
    return super.canActivate(context);
  }
}
