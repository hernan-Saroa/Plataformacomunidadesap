import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from './rund-permissions';
import { rundRequestActor } from './rund-access-audit';
import { RUND_HISTORIAL_PERMISSION } from './rund-historial-academico';
import { RundHistorialAcademicoService } from './rund-historial-academico.service';
import { RundPtaJwtGuard } from './rund-pta-consulta.controller';

/**
 * REQ-RUND-F016 (Flujo C.2) — historial académico que escribe el PTA. El gateway publica esta ruta
 * bajo /pta/api/v1. La escritura exige JWT y el permiso exclusivo `banco-docentes.rund.historial.write`
 * (ni GGP ni el perfil «Consulta RUND» lo tienen); no hay ninguna otra ruta que escriba este historial.
 */
@Controller('rund/interoperabilidad/historial')
@UseGuards(RundPtaJwtGuard, BancoDocentesRolesGuard)
export class RundHistorialAcademicoController {
  constructor(private readonly service: RundHistorialAcademicoService) {}

  @Post(':cedula')
  @HttpCode(200)
  @RequireRundPermissions(RUND_HISTORIAL_PERMISSION)
  @Header('Cache-Control', 'private, no-store')
  async escribir(@Param('cedula') cedula: string, @Body() body: unknown, @Req() req: any) {
    return { success: true, data: await this.service.escribir(cedula, body, rundRequestActor(req)) };
  }

  @Get(':cedula')
  @Roles('GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN')
  @RequireRundPermissions(RUND_PERMISSIONS.VIEW, RUND_PERMISSIONS.MANAGE)
  @Header('Cache-Control', 'private, no-store')
  async consultar(@Param('cedula') cedula: string, @Query('periodo') periodo: unknown, @Req() req: any) {
    return { success: true, data: await this.service.consultar(cedula, periodo, rundRequestActor(req)) };
  }
}
