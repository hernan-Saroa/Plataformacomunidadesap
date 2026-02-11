import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly defaultPublicPatterns = [
    /^\/auth\/api\/v\d+\/login/i,
    /^\/auth\/api\/v\d+\/new-person/i,
    /^\/auth\/api\/v\d+\/register/i,
    /^\/certificados\/api\/v\d+\/validate/i,
    /^\/certificates\/api\/v\d+\/validate/i,
    // Autoservicio certificados laborales (públicos)
    /^\/certificados\/api\/v\d+\/certificates\/autoservicio\/verificar-documento/i,
    /^\/certificados\/api\/v\d+\/certificates\/autoservicio\/generar-codigo/i,
    /^\/certificados\/api\/v\d+\/certificates\/autoservicio\/validar-codigo/i,
    /^\/certificados\/api\/v\d+\/certificados\/verify\/.+/i,
    // Reenvío de certificados laborales (ruta con prefijo /certificates/certificados)
    /^\/certificados\/api\/v\d+\/certificates\/certificados\/[^/]+\/reenviar/i,
    // Variante corta por si se expone sin /certificates
    /^\/certificados\/api\/v\d+\/certificados\/[^/]+\/reenviar/i,
    /^\/[\w-]+\/uploads\//i,
    /^\/[\w-]+\/files\//i,
  ];

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isPublic(context) || this.matchesPublicPath(request)) {
      return true;
    }

    return super.canActivate(context);
  }

  private isPublic(context: ExecutionContext) {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private matchesPublicPath(req: Request): boolean {
    const configured = (process.env.JWT_PUBLIC_PATHS || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => new RegExp(p, 'i'));

    const patterns = [...this.defaultPublicPatterns, ...configured];
    return patterns.some((regex) => regex.test(req.originalUrl));
  }
}
