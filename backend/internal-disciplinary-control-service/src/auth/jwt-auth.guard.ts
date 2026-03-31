import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly defaultPublicPatterns = [
    /^\/login/i,
    /^\/new-person/i,
    /^\/health/i,
    /^\/docs/i,
    /^\/swagger/i,
  ];

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || this.matchesPublicPath(request)) {
      return true;
    }

    return super.canActivate(context);
  }

  private matchesPublicPath(req: Request): boolean {
    const patterns = [
      ...this.defaultPublicPatterns,
      ...(process.env.JWT_PUBLIC_PATHS || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => new RegExp(p, 'i')),
    ];

    return patterns.some((regex) => regex.test(req.originalUrl));
  }
}
