import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RundValidacionService } from './rund-validacion.service';

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
  async syncRundDocuments(@Param('docenteId') docenteId: string, @Body() body: any) {
    return { success: true, data: await this.service.syncRundDocuments(docenteId, body?.documentos || []) };
  }

  /** Reservado: el PTA original devolvía `data: null`; se mantiene el contrato. */
  @Get('resumen')
  getRundResumen(@Query() _query: any) {
    return { success: true, data: null };
  }
}
