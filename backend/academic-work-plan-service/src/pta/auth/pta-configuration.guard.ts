import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PTA_MANAGE_CONFIGURATION_PERMISSION } from './pta-permissions.constants';

/** Se ejecuta después de PtaAuthGuard, con los permisos vigentes de la cuenta. */
@Injectable()
export class PtaConfigurationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { ptaAuth } = context.switchToHttp().getRequest<Request>();
    if (ptaAuth?.isSuperUser || ptaAuth?.permissions.has(PTA_MANAGE_CONFIGURATION_PERMISSION)) {
      return true;
    }
    throw new ForbiddenException('No tiene permiso para ver ni editar la configuración de PTA.');
  }
}
