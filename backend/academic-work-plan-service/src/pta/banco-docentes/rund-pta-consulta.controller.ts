import { Controller, Get, Header, Injectable, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from './rund-permissions';
import { rundRequestActor } from './rund-access-audit';
import { RundPtaConsultaService } from './rund-pta-consulta.service';

/** Exige JWT incluso si se configura una excepción global de rutas públicas. */
@Injectable()
export class RundPtaJwtGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    const authenticated = super.handleRequest<any>(err, user, info, context, status);
    if (typeof authenticated?.userId !== 'string' || !authenticated.userId.trim()) {
      throw new UnauthorizedException();
    }
    return authenticated;
  }
}

// El gateway publica esta ruta bajo /pta/api/v1 (contrato v1).
@Controller('rund/interoperabilidad/perfiles')
@UseGuards(RundPtaJwtGuard, BancoDocentesRolesGuard)
export class RundPtaConsultaController {
  constructor(private readonly service: RundPtaConsultaService) {}

  @Get(':cedula')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN')
  @RequireRundPermissions(RUND_PERMISSIONS.VIEW, RUND_PERMISSIONS.MANAGE)
  @Header('Cache-Control', 'private, no-store')
  async consultar(@Param('cedula') cedula: string, @Query('periodo') periodo: unknown, @Req() req: any) {
    return { success: true, data: await this.service.consultar(cedula, periodo, rundRequestActor(req)) };
  }
}
