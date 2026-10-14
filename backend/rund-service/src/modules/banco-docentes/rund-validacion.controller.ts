import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { RundValidacionService } from './rund-validacion.service';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RequireRundPermissions, RUND_PERMISSIONS } from './rund-permissions';

/**
 * Validación documental por campo del RUND. Rutas compatibles con las que
 * exponía el servicio PTA (`rund/docente/:id`, `sync-documents`, `rund/resumen`).
 */
@Controller(['rund', 'pta/rund'])
export class RundValidacionController {
  constructor(private readonly service: RundValidacionService) {}

  @Get('docente/:docenteId')
  async getRundDocente(@Param('docenteId') docenteId: string) {
    return { success: true, data: await this.service.getRundDocente(docenteId) };
  }

  @Post('docente/:docenteId/sync-documents')
  @UseGuards(BancoDocentesRolesGuard)
  @RequireRundPermissions(RUND_PERMISSIONS.MANAGE, RUND_PERMISSIONS.DOCUMENTS_MANAGE)
  async syncRundDocuments(@Param('docenteId') docenteId: string, @Body() body: any) {
    return { success: true, data: await this.service.syncRundDocuments(docenteId, body ?? {}) };
  }

  /** Reservado: el PTA original devolvía `data: null`; se mantiene el contrato. */
  @Get('resumen')
  getRundResumen(@Query() _query: any) {
    return { success: true, data: null };
  }
}
