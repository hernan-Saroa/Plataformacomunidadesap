import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';
import { InternalServiceGuard } from './internal-service.guard';
import { InternalRundService, RegistrarAccesoDocumentoDto } from './internal-rund.service';

/**
 * API servicio→servicio del RUND. `@Public()` solo omite el JWT de usuario; la
 * autenticación real es el token de servicio. El gateway no debe exponer esta ruta.
 */
@Public()
@UseGuards(InternalServiceGuard)
@Controller('internal/rund/v1')
export class InternalRundController {
  constructor(private readonly internal: InternalRundService) {}

  @Get('docentes/sincronizacion')
  async sincronizacion(@Query('cursor') cursor?: string, @Query('limite') limite?: string) {
    return { success: true, data: await this.internal.docentesParaSincronizar(cursor ?? null, Number(limite)) };
  }

  @Get('docentes/resolver/:clave')
  async resolver(@Param('clave') clave: string, @Query('periodo') periodo?: string) {
    return { success: true, data: await this.internal.docentePorClave(clave, periodo) };
  }

  @Get('docentes/:docenteId/validacion')
  async validacion(@Param('docenteId') docenteId: string) {
    return { success: true, data: await this.internal.validacionDocumental(docenteId) };
  }

  @Get('docentes/por-documento/:documento')
  async docentePorDocumento(@Param('documento') documento: string) {
    return { success: true, data: await this.internal.docentePorDocumento(documento) };
  }

  @Get('soportes/por-persona/:personaId')
  async soportesPorPersona(@Param('personaId') personaId: string) {
    return { success: true, data: await this.internal.soportesPorPersona(personaId) };
  }

  @Post('accesos-documentos')
  async registrarAcceso(@Body() body: RegistrarAccesoDocumentoDto) {
    return { success: true, data: await this.internal.registrarAccesoDocumento(body) };
  }

  @Post('originales/verificar')
  async verificarOriginal(@Body() body: { url: string; recursoId: string; endpoints?: string[] }) {
    return { success: true, data: await this.internal.esOriginalRund(body?.url ?? '', body?.recursoId ?? '', body?.endpoints ?? []) };
  }

  @Get('estadisticas/backoffice')
  async estadisticasBackoffice() {
    return { success: true, data: await this.internal.estadisticasBackoffice() };
  }
}
