import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.decorators';

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
    if (isPublic || this.matchesPublicPath(context.switchToHttp().getRequest<Request>())) {
      return true;
    }
    return super.canActivate(context);
  }

  // Mismo contrato que el servicio PTA: JWT_PUBLIC_PATHS (regex separadas por coma).
  private matchesPublicPath(req: Request): boolean {
    const patterns = [
      /^\/health/i,
      /^\/docs/i,
      /^\/swagger/i,
      ...(process.env.JWT_PUBLIC_PATHS || '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => new RegExp(p, 'i')),
    ];
    return patterns.some((regex) => regex.test(req.originalUrl));
  }
}
