import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { AssignmentsService } from './assignments.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roles?: string[];
    role?: string;
    permissions?: string[];
  };
}

/**
 * RF-REC-002 — Controlador de asignación de comisiones a analistas.
 *
 * Expone endpoints bajo el tag Swagger `assignments` para:
 *   - Consultar el tablero de carga de analistas (semáforo).
 *   - Asignar una solicitud a un analista específico.
 *   - Ver solicitudes asignadas al analista autenticado.
 */
@ApiTags('assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('workload')
  @Permissions('travel_expenses:read_inbox')
  @ApiOperation({
    summary: 'Obtener tablero de carga de analistas',
    description:
      'Devuelve la lista de analistas de viáticos registrados junto con su puntaje de carga total y el color del semáforo (Verde, Amarillo, Rojo). Si se envía ?solicitudId=..., filtra por la dependencia de esa solicitud.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tablero de carga calculado correctamente.',
  })
  @ApiBearerAuth()
  async obtenerCargaAnalistas(@Req() req: AuthenticatedRequest, @Query('solicitudId') solicitudId?: string) {
    const data = await this.assignmentsService.obtenerCargaAnalistas(solicitudId);
    return {
      data,
      total: data.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-requests')
  @Permissions('travel_expenses:view_assigned_requests')
  @ApiOperation({
    summary: 'Obtener solicitudes asignadas al analista autenticado',
    description:
      'Devuelve las solicitudes de comisión asignadas al usuario autenticado que tengan estados activos: SOLICITADO, EN_VERIFICACION, VERIFICADA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes asignadas al analista.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autenticado.',
  })
  @ApiBearerAuth()
  async obtenerMisSolicitudes(@Req() req: AuthenticatedRequest) {
    const analistaId = req.user?.userId;
    if (!analistaId) {
      throw new BadRequestException('Usuario no autenticado.');
    }

    const data = await this.assignmentsService.obtenerSolicitudesAsignadas(analistaId);

    return {
      data,
      total: data.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('assign')
  @HttpCode(HttpStatus.OK)
  @Permissions('travel_expenses:assign_analyst')
  @ApiOperation({
    summary: 'Asignar solicitud de comisión a analista',
    description:
      'Asigna una solicitud en estado SOLICITADO a un analista específico. La transacción bloquea la fila (pessimistic lock), valida el estado, actualiza el analista_asignado_id y transiciona a EN_VERIFICACION.',
  })
  @ApiResponse({
    status: 200,
    description: 'Asignación realizada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud no está en estado SOLICITADO o analista no existe.',
  })
  @ApiResponse({
    status: 404,
    description: 'Solicitud no encontrada.',
  })
  @ApiBearerAuth()
  async asignarAnalista(
    @Req() req: AuthenticatedRequest,
    @Body() body: { solicitudId: string; analistaId: string },
  ) {
    if (!body?.solicitudId || !body?.analistaId) {
      throw new BadRequestException('solicitudId y analistaId son obligatorios.');
    }

    const secretarioId = req.user?.userId;
    if (!secretarioId) {
      throw new BadRequestException('Usuario no autenticado.');
    }

    const resultado = await this.assignmentsService.asignarAnalista(
      body.solicitudId,
      body.analistaId,
      secretarioId,
    );

    return {
      success: true,
      message: 'Solicitud asignada exitosamente.',
      data: {
        solicitudId: resultado.solicitud.id,
        estadoSolicitud: resultado.solicitud.estadoSolicitud,
        analistaAsignadoId: resultado.solicitud.analistaAsignadoId,
        historialId: resultado.historial.id,
      },
    };
  }
}
