import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  ConsolidacionService,
  ResumenConsolidacion,
  ResultadoConsolidacion,
} from './consolidacion.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';

/** Usuario autenticado inyectado por `JwtAuthGuard` en `req.user`. */
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roles?: string[];
    role?: string;
    permissions?: string[];
  };
}

/**
 * API REST de consolidación y cierre de expediente (RF-LIQ-004).
 *
 * Conjunto de operaciones que permiten al Enlace de Dependencia previsualizar
 * la integridad del expediente y, una vez completo, enviarlo a revisión del
 * Grupo de Viáticos. El envío es transaccional, congela el expediente
 * (solo lectura) y registra la trazabilidad de auditoría.
 *
 * Tag Swagger: `consolidacion`.
 */
@ApiTags('consolidacion')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ConsolidacionController {
  constructor(private readonly consolidacionService: ConsolidacionService) {}

  /**
   * Previsualiza la integridad del expediente SIN mutar la base de datos.
   * Devuelve el checklist estructurado (Formato 023, autoliquidación,
   * tiquetes/presupuesto y documentos por rol) que alimenta el "Paso 4:
   * Resumen de Expediente y Envío" del frontend.
   */
  @Get('requests/:id/consolidacion/preview')
  @Permissions('travel_expenses:read')
  @ApiOperation({
    summary: 'Previsualiza la integridad del expediente para consolidación',
    description:
      'RF-LIQ-004. Ejecuta el validador de consolidación en modo lectura y ' +
      'devuelve el checklist estructurado (Formato 023, autoliquidación, ' +
      'tiquetes/presupuesto y documentos por rol) con su estado OK/FALTA. ' +
      'No realiza ninguna transición de estado.',
  })
  @ApiParam({ name: 'id', description: 'UUID del expediente (solicitud).' })
  @ApiResponse({
    status: 200,
    description:
      'Resumen de integridad con el flag `esConsolidable` y la lista de errores pendientes.',
  })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado.' })
  async previsualizar(
    @Param('id') id: string,
  ): Promise<ResumenConsolidacion> {
    return this.consolidacionService.obtenerResumenConsolidacion(id);
  }

  /**
   * Consolida el expediente y lo envía a revisión del Grupo de Viáticos.
   *
   * - Transacción ACID + bloqueo pesimista (`SELECT ... FOR UPDATE`).
   * - Valida que el estado sea RADICADA / EXTEMPORANEA / DEVUELTA.
   * - Si el expediente está incompleto responde HTTP 422 con el detalle de los
   *   elementos faltantes `{ success: false, errors: [...] }`.
   * - En éxito (HTTP 201) el estado pasa a SOLICITADO (solo lectura) y se
   *   registra la transición en `solicitudes_historial_estados`.
   */
  @Post('requests/:id/submit')
  @HttpCode(201)
  @Permissions('travel_expenses:create_request')
  @ApiOperation({
    summary: 'Consolida el expediente y lo envía a revisión (RF-LIQ-004)',
    description:
      'Ejecuta la consolidación transaccional del expediente: valida el ' +
      'estado de entrada, verifica la integridad (Formato 023, autoliquidación, ' +
      'tiquetes/presupuesto y soportes por rol) y, si es correcto, congela el ' +
      'expediente cambiando el estado a SOLICITADO y registrando la trazabilidad.',
  })
  @ApiParam({ name: 'id', description: 'UUID del expediente (solicitud).' })
  @ApiResponse({
    status: 201,
    description:
      'Expediente consolidado. Estado transicionado a SOLICITADO y transición registrada en el historial.',
  })
  @ApiResponse({
    status: 400,
    description:
      'El expediente ya está consolidado/solo lectura o aún no está radicado.',
  })
  @ApiResponse({
    status: 422,
    description:
      'Expediente incompleto: retorna `{ success:false, errors:[detalle de lo faltante] }`.',
  })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado.' })
  async enviarARevision(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResultadoConsolidacion> {
    return this.consolidacionService.consolidarExpediente(
      id,
      req.user?.userId,
    );
  }
}
