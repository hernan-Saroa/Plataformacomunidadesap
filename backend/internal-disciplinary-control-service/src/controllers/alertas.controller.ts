import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AlertasService } from '../services/alertas.service';
import { ListarAlertasDto } from '../dtos/alertas.dto';
import { AlertaEnviada } from '../entities/alerta-enviada.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DISCIPLINARY_MODULE_ACCESS } from '../auth/authorization.constants';

@ApiTags('Alertas Enviadas')
@Controller('alertas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', DISCIPLINARY_MODULE_ACCESS)
export class AlertasController {
  constructor(
    private alertasService: AlertasService,
  ) {}

  /**
   * Listar alertas con filtros y paginación
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar alertas enviadas',
    description: 'Retorna historial de alertas con filtros y paginación',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas',
  })
  async listar(@Query() query: ListarAlertasDto) {
    return await this.alertasService.listar(query);
  }

  /**
   * Obtener alerta por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener alerta por ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerta encontrada',
    type: AlertaEnviada,
  })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  async obtenerPorId(@Param('id') id: string) {
    return await this.alertasService.obtenerPorId(id);
  }
}


