import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { requireInProduction } from '../common/require-env';

export const INTERNAL_TOKEN_HEADER = 'x-internal-service-token';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Autentica llamadas servicio→servicio (auth-service, academic-work-plan-service,
 * academic-schedule-service). No usa el JWT del usuario: estas rutas no son de
 * negocio de cara al usuario y no deben salir por el gateway.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = requireInProduction('INTERNAL_SERVICE_TOKEN', process.env.INTERNAL_SERVICE_TOKEN, 'esap-internal-service-dev-token');
    const req = context.switchToHttp().getRequest();
    const received = String(req?.headers?.[INTERNAL_TOKEN_HEADER] ?? '');
    // Se comparan los hashes: longitud fija y tiempo constante.
    if (!received || !timingSafeEqual(digest(received), digest(expected))) {
      throw new UnauthorizedException('Credencial de servicio inválida.');
    }
    return true;
  }
}
