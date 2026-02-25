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
    /^\/certificados\/api\/v\d+\/certificates\/certificados\/verify\/.+/i,
    /^\/certificados\/api\/v\d+\/certificados\/verify\/.+/i,
    // Reenvío de certificados laborales (ruta con prefijo /certificates/certificados)
    /^\/certificados\/api\/v\d+\/certificates\/certificados\/[^/]+\/reenviar/i,
    // Variante corta por si se expone sin /certificates
    /^\/certificados\/api\/v\d+\/certificados\/[^/]+\/reenviar/i,
    // Autoservicio y validacion publica de certificados de grado (registro academico)
    /^\/registro-academico\/api\/v\d+\/certificates\/autoservicio\/verificar-graduado/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/autoservicio\/solicitar-certificado/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/autoservicio\/generar-codigo/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/autoservicio\/validar-codigo/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/autoservicio\/empresa/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/validacion\/qr/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/validacion\/numero/i,
    /^\/registro-academico\/api\/v\d+\/certificates\/validacion\/estadisticas/i,
    /^\/[\w-]+\/uploads\//i,
    /^\/[\w-]+\/files\//i,
    // Documentos de control institucional (preview/download requieren acceso sin JWT para iframes)
    /^\/control-institucional\/api\/v\d+\/documentos\/[^/]+\/preview/i,
    /^\/control-institucional\/api\/v\d+\/documentos\/[^/]+\/download/i,
    // Evidencias de control institucional
    /^\/control-institucional\/api\/v\d+\/evidencias\/[^/]+\/preview/i,
    /^\/control-institucional\/api\/v\d+\/evidencias\/[^/]+\/download/i,
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
