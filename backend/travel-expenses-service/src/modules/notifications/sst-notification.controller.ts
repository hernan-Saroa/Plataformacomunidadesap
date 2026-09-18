import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { SstNotificationService, ResultadoNotificacionSst } from './sst-notification.service';

interface AuthenticatedRequest {
  user?: {
    userId: string;
    sub?: string;
    roles?: string[];
    role?: string;
  };
}

@Controller()
@ApiTags('notificaciones-sst')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SstNotificationController {
  constructor(private readonly sstNotificationService: SstNotificationService) {}

  /**
   * Consulta el estado y trazabilidad de notificaciones enviadas al área de SST
   * para una comisión de servicio específica.
   */
  @Get([
    'notifications/sst/:solicitudId/log',
    'api/v1/notifications/sst/:solicitudId/log',
    'notifications/sst/:solicitudId/status',
    'api/v1/notifications/sst/:solicitudId/status',
  ])
  @Permissions(
    'travel_expenses:read_sst_logs',
    'travel_expenses:read_authorized',
    'travel_expenses:read_obligations',
    'travel_expenses:read_all',
  )
  @ApiOperation({
    summary: 'Consultar estado de notificación a SST (RF-PAG-002)',
    description:
      'Retorna el estado del despacho formal hacia Seguridad y Salud en el Trabajo (in-app y correos de usuarios del rol) y la trazabilidad del expediente.',
  })
  @ApiParam({
    name: 'solicitudId',
    description: 'UUID de la solicitud de comisión',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de notificación a SST obtenido exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros inválidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permisos insuficientes.',
  })
  async obtenerLogsSst(
    @Param('solicitudId') solicitudId: string,
  ): Promise<{
    success: boolean;
    data: any;
    timestamp: string;
  }> {
    if (!solicitudId) {
      throw new BadRequestException('El ID de la solicitud es obligatorio.');
    }

    const resultado = await this.sstNotificationService.consultarHistorialSst(solicitudId);

    return {
      success: true,
      data: resultado,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fuerza el reenvío manual de la notificación a SST (bandeja in-app y correo a usuarios del rol).
   */
  @Post([
    'notifications/sst/:solicitudId/resend',
    'api/v1/notifications/sst/:solicitudId/resend',
  ])
  @Permissions('travel_expenses:resend_sst_notification')
  @ApiOperation({
    summary: 'Reenviar notificación a SST manualmente (RF-PAG-002)',
    description:
      'Ejecuta un nuevo reintento formal de despacho hacia los usuarios del rol SST (in-app y correo) y actualiza la traza de auditoría en el expediente.',
  })
  @ApiParam({
    name: 'solicitudId',
    description: 'UUID de la solicitud de comisión',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificación reenviada exitosamente a SST.',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud de comisión no encontrada.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permiso travel_expenses:resend_sst_notification requerido.',
  })
  async reenviarNotificacionSst(
    @Param('solicitudId') solicitudId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    message: string;
    data: ResultadoNotificacionSst;
    timestamp: string;
  }> {
    const usuarioId = req.user?.userId || req.user?.sub;

    const resultado = await this.sstNotificationService.notificarComisionSst(solicitudId, {
      forzar: true,
      usuarioId,
    });

    return {
      success: resultado.success,
      message: resultado.mensaje,
      data: resultado,
      timestamp: new Date().toISOString(),
    };
  }
}
